"""BACK2U Analytics — local-only Python stdlib backend."""
import csv, io, json, os, sqlite3
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlencode, urlparse
from urllib.request import Request, urlopen

ROOT=Path(__file__).resolve().parent
for line in (ROOT/'.env').read_text(encoding='utf-8').splitlines() if (ROOT/'.env').exists() else []:
    if line.strip() and not line.lstrip().startswith('#') and '=' in line:
        k,v=line.split('=',1); os.environ.setdefault(k.strip(),v.strip())
DB=ROOT/'back2u.db'
def now(): return datetime.now(timezone.utc).isoformat(timespec='seconds')
def connect():
    c=sqlite3.connect(DB); c.row_factory=sqlite3.Row
    c.execute('CREATE TABLE IF NOT EXISTS videos (platform TEXT, id TEXT, title TEXT, url TEXT, published TEXT, views INTEGER, likes INTEGER, comments INTEGER, updated TEXT, PRIMARY KEY(platform,id))')
    c.execute('CREATE TABLE IF NOT EXISTS history (day TEXT, platform TEXT, id TEXT, views INTEGER, PRIMARY KEY(day,platform,id))')
    c.commit(); return c
def request(url,headers=None,body=None):
    req=Request(url,data=json.dumps(body).encode() if body is not None else None,headers={'Accept':'application/json',**({'Content-Type':'application/json'} if body is not None else {}),**(headers or {})})
    with urlopen(req,timeout=20) as r:return json.load(r)
def youtube():
    key=os.environ.get('YOUTUBE_API_KEY'); channel=os.environ.get('YOUTUBE_CHANNEL_ID')
    if not(key and channel):raise ValueError('YouTube API-Key/Kanal-ID fehlen')
    base='https://www.googleapis.com/youtube/v3/'
    def get(path,**p):return request(base+path+'?'+urlencode({**p,'key':key}))
    ch=get('channels',part='contentDetails',id=channel).get('items',[])
    if not ch:raise ValueError('YouTube-Kanal nicht gefunden')
    playlist=ch[0]['contentDetails']['relatedPlaylists']['uploads']; ids=[]; token=None
    for _ in range(4):
        p={'part':'contentDetails','playlistId':playlist,'maxResults':50}
        if token:p['pageToken']=token
        batch=get('playlistItems',**p)
        ids.extend(x['contentDetails']['videoId'] for x in batch.get('items',[]) if 'videoId' in x.get('contentDetails',{}))
        token=batch.get('nextPageToken')
        if not token:break
    result=[]
    for i in range(0,len(ids),50):
        for x in get('videos',part='snippet,statistics',id=','.join(ids[i:i+50])).get('items',[]):
            s=x.get('statistics',{}); meta=x.get('snippet',{})
            result.append(dict(platform='YouTube',id=x['id'],title=meta.get('title','Video'),url='https://www.youtube.com/watch?v='+x['id'],published=meta.get('publishedAt',''),views=int(s.get('viewCount',0)),likes=int(s.get('likeCount',0)),comments=int(s.get('commentCount',0))))
    return result
def tiktok():
    token=os.environ.get('TIKTOK_ACCESS_TOKEN')
    if not token:raise ValueError('TikTok OAuth-Token (video.list) fehlt')
    url='https://open.tiktokapis.com/v2/video/list/?fields=id,title,video_description,create_time,share_url,view_count,like_count,comment_count'
    result=[];cursor=None
    for _ in range(10):
        data=request(url,{'Authorization':'Bearer '+token},{'max_count':20,**({'cursor':cursor} if cursor else {})})
        if data.get('error',{}).get('code') not in ('ok',None,0):raise ValueError(str(data['error'].get('message','TikTok Fehler')))
        obj=data.get('data',{})
        for x in obj.get('videos',[]):
            result.append(dict(platform='TikTok',id=str(x['id']),title=x.get('title') or x.get('video_description') or 'TikTok',url=x.get('share_url',''),published=datetime.fromtimestamp(x['create_time'],timezone.utc).isoformat() if x.get('create_time') else '',views=int(x.get('view_count',0)),likes=int(x.get('like_count',0)),comments=int(x.get('comment_count',0))))
        cursor=obj.get('cursor')
        if not (cursor and obj.get('has_more')):break
    return result
def instagram():
    token=os.environ.get('INSTAGRAM_ACCESS_TOKEN'); uid=os.environ.get('INSTAGRAM_USER_ID')
    if not(token and uid):raise ValueError('Instagram Token/User-ID fehlen')
    base='https://graph.facebook.com/'+os.environ.get('META_API_VERSION','v24.0')+'/'
    url=base+uid+'/media?'+urlencode({'fields':'id,caption,timestamp,permalink,media_type,like_count,comments_count','limit':50,'access_token':token})
    result=[]
    for _ in range(4):
        batch=request(url)
        for x in batch.get('data',[]):
            if x.get('media_type')!='VIDEO':continue
            views=0
            try:
                insight=request(base+str(x['id'])+'/insights?'+urlencode({'metric':'views','access_token':token}))
                for y in insight.get('data',[]):
                    if y.get('name')=='views':
                        tv=y.get('total_value') or {}; vals=y.get('values') or []
                        views=int(tv.get('value',vals[0].get('value',0) if vals else 0))
            except Exception: pass
            result.append(dict(platform='Instagram',id=str(x['id']),title=(x.get('caption') or 'Instagram Reel')[:130],url=x.get('permalink',''),published=x.get('timestamp',''),views=views,likes=int(x.get('like_count',0)),comments=int(x.get('comments_count',0))))
        url=batch.get('paging',{}).get('next')
        if not url:break
    return result
SOURCES={'YouTube':youtube,'TikTok':tiktok,'Instagram':instagram}
def demo():
    return [dict(platform=p,id=str(i),title=t,url='',published='2026-11-01',views=v,likes=l,comments=c) for i,(p,t,v,l,c) in enumerate([('YouTube','Romanceplanet Edit',21000,1450,80),('TikTok','Hakken Day 13',8400,650,35),('Instagram','Jumpstyle Outdoor',5200,310,14)])]
class Handler(BaseHTTPRequestHandler):
    def respond(self,obj,status=200,typ='application/json'):
        data=json.dumps(obj,ensure_ascii=False).encode()
        self.send_response(status);self.send_header('Content-Type',typ+'; charset=utf-8');self.send_header('Content-Length',str(len(data)));self.end_headers();self.wfile.write(data)
    def do_GET(self):
        path=urlparse(self.path).path
        if path=='/':
            data=(ROOT/'index.html').read_bytes();self.send_response(200);self.send_header('Content-Type','text/html; charset=utf-8');self.send_header('Content-Length',str(len(data)));self.end_headers();self.wfile.write(data);return
        if path=='/api/data':
            with connect() as c:
                videos=[dict(r) for r in c.execute('SELECT platform,id,title,url,published,views,likes,comments FROM videos ORDER BY views DESC')]
                history=[dict(r) for r in c.execute('SELECT day,platform,SUM(views) views FROM history GROUP BY day,platform ORDER BY day')]
            if 'demo=1' in self.path:videos=demo();history=[]
            cfg={'YouTube':bool(os.environ.get('YOUTUBE_API_KEY') and os.environ.get('YOUTUBE_CHANNEL_ID')),'TikTok':bool(os.environ.get('TIKTOK_ACCESS_TOKEN')),'Instagram':bool(os.environ.get('INSTAGRAM_ACCESS_TOKEN') and os.environ.get('INSTAGRAM_USER_ID'))}
            self.respond(dict(videos=videos,history=history,configured=cfg));return
        if path=='/api/export.csv':
            with connect() as c:rows=[dict(r) for r in c.execute('SELECT * FROM videos')]
            buf=io.StringIO();cols=['platform','id','title','url','published','views','likes','comments','updated'];writer=csv.DictWriter(buf,fieldnames=cols);writer.writeheader();writer.writerows(rows)
            body=buf.getvalue().encode('utf-8-sig');self.send_response(200);self.send_header('Content-Type','text/csv; charset=utf-8');self.send_header('Content-Disposition','attachment; filename="back2u.csv"');self.send_header('Content-Length',str(len(body)));self.end_headers();self.wfile.write(body);return
        self.respond({'error':'Not found'},404)
    def do_POST(self):
        if urlparse(self.path).path!='/api/sync':return self.respond({'error':'Not found'},404)
        results={}
        for name,fn in SOURCES.items():
            try:
                videos=fn();stamp=now();day=stamp[:10]
                with connect() as c:
                    for v in videos:
                        c.execute('INSERT OR REPLACE INTO videos VALUES (?,?,?,?,?,?,?,?,?)',(v['platform'],v['id'],v['title'],v['url'],v['published'],v['views'],v['likes'],v['comments'],stamp))
                        c.execute('INSERT OR REPLACE INTO history VALUES (?,?,?,?)',(day,name,v['id'],v['views']))
                    c.commit()
                results[name]={'ok':True,'count':len(videos)}
            except Exception as e:results[name]={'ok':False,'error':str(e)[:220]}
        self.respond({'results':results})
if __name__=='__main__':
    port=int(os.environ.get('PORT','8765'));print(f'BACK2U Analytics: http://127.0.0.1:{port}')
    ThreadingHTTPServer(('127.0.0.1',port),Handler).serve_forever()
