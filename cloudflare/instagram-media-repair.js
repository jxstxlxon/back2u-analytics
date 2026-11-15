/**
 * BACK2U V7.7 – restore recently posted Instagram media statistics directly
 * through the existing Windsor.ai Cloudflare secret and scheduled cron.
 *
 * Independent append/merge-only D1 store, scoped to user's known IG account.
 * Does not change original snapshot, YouTube, TikTok or Meta direct data.
 * Older videos are retained; only verified account media in the last 28 days
 * are fetched. Lifetime views never become per-day views.
 */
const IG_ACCOUNT='27282542318110290';
const IG_CONNECTED_SOURCE='17841476673616735';
const STORE='ig_windsor_media_v1';
const STATUS='ig_windsor_media_sync_v1';
const FIELDS=['date','media_id','media_caption','media_views','media_like_count',
 'media_total_comments_count','media_reach','media_permalink','media_thumbnail_url',
 'media_type','account_id'];
const DAY=86400000;
const day=ts=>new Date(ts).toISOString().slice(0,10);
function validDay(s){
 return typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&
  Number.isFinite(Date.parse(s+'T00:00:00Z'))&&day(Date.parse(s+'T00:00:00Z'))===s;
}
function numberOrNull(value){
 if(value===undefined||value===null||value==='')return null;
 const n=Number(value);return Number.isSafeInteger(n)&&n>=0?n:null;
}
function instagramLink(x){
 try{
  const u=new URL(String(x||''));
  return u.protocol==='https:'&&/^(www\.)?instagram\.com$/i.test(u.hostname)&&
   /^\/(?:reel|p|tv)\//i.test(u.pathname)?u.href:null;
 }catch{return null}
}
function imageLink(x){
 try{
  const u=new URL(String(x||''));
  return u.protocol==='https:'&&
   /(?:^|\.)((?:fbcdn\.net)|(?:cdninstagram\.com)|(?:instagram\.com))$/i.test(u.hostname)
   ?u.href:null;
 }catch{return null}
}
export function validateInstagramWindsorMedia(rows,now=Date.now()){
 if(!Array.isArray(rows)||rows.length<10||rows.length>1500)
  throw Error('Instagram-Medienbericht unvollständig');
 const today=day(now),cutoff=day(now-45*DAY);
 const used=new Set(),videos=[];
 for(const raw of rows){
  if(String(raw?.account_id)!==IG_ACCOUNT)
   throw Error('Falsches Instagram-Konto');
  const id=String(raw?.media_id||''),published=String(raw?.date||'');
  const url=instagramLink(raw?.media_permalink);
  if(!/^\d{12,25}$/.test(id)||!validDay(published)||
     published<cutoff||published>today||!url||used.has(id))
   throw Error('Ungültiges oder doppeltes Instagram-Medium');
  used.add(id);
  const values={};
  for(const [source,key] of [
   ['media_views','views'],['media_like_count','likes'],
   ['media_total_comments_count','comments'],['media_reach','reach']]){
    const value=numberOrNull(raw[source]);
    if(value!==null)values[key]=value;
    else if(raw[source]!==undefined&&raw[source]!==null&&raw[source]!=='')
     throw Error('Ungültige Instagram-Metrik '+source);
  }
  if(values.views===undefined)continue; // unavailable is not a genuine zero.
  const title=String(raw.media_caption||'').trim().slice(0,500);
  const type=String(raw.media_type||'').slice(0,40);
  videos.push({id,platform:'ig',date:published,url,title,
   thumb:imageLink(raw.media_thumbnail_url),mediaType:type,
   ...values,reportType:'lifetime',source:'Instagram Insights via Windsor.ai'});
 }
 if(videos.length<10)throw Error('Zu wenige Medien mit bestätigten Ansichten');
 return videos;
}
export function mergeInstagramWindsorMedia(previous,videos,now=Date.now()){
 const former=previous?.schema===1&&Array.isArray(previous.videos)?previous.videos:[];
 const byId=new Map(former.filter(x=>/^\d{12,25}$/.test(x.id)).map(x=>[x.id,x]));
 for(const video of videos)byId.set(video.id,video);
 return {schema:1,source:'Instagram Insights via Windsor.ai',accountId:IG_ACCOUNT,
  updatedAt:new Date(now).toISOString(),videoCount:byId.size,
  newestPublishedDay:[...byId.values()].map(x=>x.date).sort().at(-1)||null,
  videos:[...byId.values()].sort((a,b)=>a.date.localeCompare(b.date)).slice(-1200)};
}
export function overlayInstagramWindsorMedia(snapshot,record,directCatalog){
 if(!snapshot?.platforms?.ig||record?.schema!==1||
  record.accountId!==IG_ACCOUNT||!Array.isArray(record.videos))return snapshot;
 const directDay=directCatalog?.platforms?.ig?.snapshotDate||'';
 const sourceDay=String(record.updatedAt||'').slice(0,10);
 // A same-day or fresher official direct Meta catalog has higher priority.
 if(directDay&&validDay(directDay)&&directDay>=sourceDay)return snapshot;
 const stored=snapshot.platforms.ig.videos||[];
 const current=new Map(stored.map(v=>[String(v.id),v]));
 for(const v of record.videos){
  if(!/^\d{12,25}$/.test(v.id)||!instagramLink(v.url))continue;
  const old=current.get(v.id)||{};
  const merged={...old,...v};
  for(const key of ['views','reach','likes','comments']){
   if(numberOrNull(v[key])===null&&numberOrNull(old[key])!==null)
    merged[key]=old[key];
  }
  if(!v.thumb&&old.thumb)merged.thumb=old.thumb;
  if(!v.title&&old.title)merged.title=old.title;
  current.set(v.id,merged);
 }
 snapshot.platforms.ig.videos=[...current.values()];
 snapshot.platforms.ig.videosSource='Instagram Insights via Windsor.ai + retained history';
 snapshot.platforms.ig.windsorMediaAsOf=record.updatedAt;
 return snapshot;
}
export async function runInstagramWindsorMediaSync(env,{
 get,put,fetcher=fetch,now=Date.now(),force=false
}={}){
 const key=String(env?.WINDSOR_API_KEY||'').trim();
 if(key.length<16)return{status:'not_configured'};
 const old=await get(env,STATUS)||{};
 const recent=Date.parse(old.lastAttemptAt||'');
 const minimum=old.status==='ok'?6*3600000:old.status==='running'?45*60000:60*60000;
 if(!force&&Number.isFinite(recent)&&now-recent>=0&&now-recent<minimum)
  return{status:'skipped',lastSuccessAt:old.lastSuccessAt||null};
 const stamp=new Date(now).toISOString();
 await put(env,STATUS,{...old,status:'running',lastAttemptAt:stamp});
 try{
  const uri=new URL('https://connectors.windsor.ai/instagram');
  uri.searchParams.set('api_key',key);
  uri.searchParams.set('fields',FIELDS.join(','));
  uri.searchParams.set('date_preset','last_28d');
  uri.searchParams.set('select_accounts',IG_CONNECTED_SOURCE);
  uri.searchParams.set('_renderer','json');
  const response=await fetcher(uri.href,{method:'GET',
   headers:{accept:'application/json'},signal:AbortSignal.timeout(25000)});
  if(!response.ok)throw Error('Windsor HTTP '+response.status);
  const data=await response.json();
  const rows=Array.isArray(data)?data:Array.isArray(data?.data)?data.data:
    Array.isArray(data?.results)?data.results:null;
  const videos=validateInstagramWindsorMedia(rows,now);
  const former=await get(env,STORE);
  const merged=mergeInstagramWindsorMedia(former,videos,now);
  await put(env,STORE,merged);
  const status={status:'ok',lastAttemptAt:stamp,lastSuccessAt:stamp,error:null,
   videos:merged.videos.length,batchVideos:videos.length,
   newestPublishedDay:merged.newestPublishedDay};
  await put(env,STATUS,status);
  return status;
 }catch(e){
  const err=String(e?.message||e).replace(/https?:\/\/\S+/gi,'[URL]').slice(0,150);
  const status={...old,status:'error',lastAttemptAt:stamp,error:err,
    lastSuccessAt:old.lastSuccessAt||null};
  await put(env,STATUS,status);return status;
 }
}
export async function instagramWindsorMediaStatus(env,{get}){
 const [record,status]=await Promise.all([get(env,STORE),get(env,STATUS)]);
 return{configured:!!(env.WINDSOR_API_KEY&&String(env.WINDSOR_API_KEY).length>=16),
  status:status?.status||'never_run',error:status?.error||null,
  lastAttemptAt:status?.lastAttemptAt||null,lastSuccessAt:status?.lastSuccessAt||null,
  videoCount:record?.videos?.length||0,newestPublishedDay:record?.newestPublishedDay||null};
}
