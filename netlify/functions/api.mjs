import {createHash,createHmac,timingSafeEqual} from 'node:crypto';
const ACC={yt:'83736',ig:'17841476673616735',tt:'_000Gn_3riaTBVXEHqk1YfrwMWPK3cJcFkGv'};
const TASKS=[
 ['yt-d','yt','youtube','date,views,engaged_views,likes,comments'],
 ['yt-f','yt','youtube','date,subscribers_gained_channel,subscribers_lost_channel'],
 ['yt-v','yt','youtube','video,views,likes,comments,subscribers_gained'],
 ['yt-t','yt','youtube','video_title,published_at,videourl,videoimage'],
 ['yt-p','yt','youtube','channel_title,subscriber_count,video_count'],
 ['ig-d','ig','instagram','date,views,follower_count_1d,reach,likes,comments'],
 ['ig-v','ig','instagram','date,media_id,media_caption,media_views,media_like_count,media_total_comments_count,media_permalink,media_thumbnail_url'],
 ['ig-p','ig','instagram','account_name,followers_count'],
 ['tt-d','tt','tiktok_organic','date,video_views,likes,comments,followers_count,profile_views'],
 ['tt-v','tt','tiktok_organic','date,video_id,video_caption,video_views_count,video_likes,video_comments,video_shares,video_create_datetime,video_thumbnail_url']
];
const n=v=>typeof v==='number'&&Number.isFinite(v)?v:typeof v==='string'&&v.trim()!==''&&Number.isFinite(Number(v))?Number(v):null;
const day=v=>String(v||'').slice(0,10);
const txt=v=>String(v??'').slice(0,500);
const url=v=>{try{const u=new URL(String(v||'').slice(0,2500));return u.protocol==='https:'?u.href:null}catch{return null}};
const resp=(j,s=200,h={})=>new Response(JSON.stringify(j),{status:s,headers:{'content-type':'application/json; charset=utf-8','cache-control':'private, no-store','x-content-type-options':'nosniff',...h}});
const equal=(a,b)=>timingSafeEqual(createHash('sha256').update(String(a)).digest(),createHash('sha256').update(String(b)).digest());
function signingKey(){return process.env.SESSION_SECRET||''}
function signature(x){return createHmac('sha256',signingKey()).update(x).digest('base64url')}
function sessionCookie(){const raw=Buffer.from(JSON.stringify({v:1,e:Math.floor(Date.now()/1000)+2592000})).toString('base64url');return 'back2u_session='+raw+'.'+signature(raw)+'; Path=/api; HttpOnly; Secure; SameSite=Lax; Max-Age=2592000'}
function authorized(req){if(!signingKey())return false;const val=(req.headers.get('cookie')||'').split(';').map(s=>s.trim()).find(s=>s.startsWith('back2u_session='))?.slice(15);if(!val)return false;const [raw,sig]=val.split('.');if(!raw||!sig||!equal(sig,signature(raw)))return false;try{const x=JSON.parse(Buffer.from(raw,'base64url').toString('utf8'));return x.v===1&&x.e>Math.floor(Date.now()/1000)}catch{return false}}
const rows=b=>Array.isArray(b)?b:Array.isArray(b?.data)?b.data:Array.isArray(b?.result)?b.result:[];
async function pull(task,key){
 const [,p,c,fields]=task;const qs=new URLSearchParams({api_key:key,fields,select_accounts:ACC[p],date_preset:'last_28d',_max_rows:'1500',refresh_interval:'6h',_renderer:'json'});
 const res=await fetch('https://connectors.windsor.ai/'+c+'?'+qs.toString(),{headers:{accept:'application/json'},signal:AbortSignal.timeout(24000)});
 if(!res.ok)throw Error('Windsor HTTP '+res.status);
 const json=await res.json();
 if(json?.error){const raw=typeof json.error==='object'?String(json.error.code||''):String(json.error);const code=/^[a-zA-Z0-9_-]{2,64}$/.test(raw)?' ('+raw+')':'';throw Error('Windsor meldet einen Fehler'+code)}
 if(json?.status==='pending')throw Error('Windsor bereitet Daten auf');
 return rows(json);
}
function snapshot(sets,errors){
 const platforms={yt:{daily:[],videos:[],profile:{}},ig:{daily:[],videos:[],profile:{}},tt:{daily:[],videos:[],profile:{}}};
 const d=new Map();
 for(const x of sets['yt-d']||[]){const k=day(x.date);if(k)d.set(k,{d:k,views:n(x.views),engaged:n(x.engaged_views),likes:n(x.likes),comments:n(x.comments)})}
 for(const x of sets['yt-f']||[]){const k=day(x.date);if(!k)continue;const y=d.get(k)||{d:k},a=n(x.subscribers_gained_channel),b=n(x.subscribers_lost_channel);y.follows=a===null||b===null?null:a-b;d.set(k,y)}
 platforms.yt.daily=[...d.values()].sort((a,b)=>a.d.localeCompare(b.d));
 const lookup=new Map();
 for(const x of sets['yt-t']||[]){const id=/[?&]v=([\w-]{11})/.exec(String(x.videourl||''))?.[1];if(id)lookup.set(id,{title:txt(x.video_title),date:day(x.published_at),url:'https://www.youtube.com/shorts/'+id,thumb:url(x.videoimage)})}
 for(const x of sets['yt-v']||[]){const id=String(x.video||'');if(!/^[\w-]{11}$/.test(id))continue;const t=lookup.get(id)||{};platforms.yt.videos.push({id,platform:'yt',title:t.title||'YouTube Short',date:t.date||'',url:t.url||'https://www.youtube.com/shorts/'+id,thumb:t.thumb||'https://i.ytimg.com/vi/'+id+'/hqdefault.jpg',views:n(x.views),likes:n(x.likes),comments:n(x.comments),follows:n(x.subscribers_gained),reportType:'period',source:'Windsor.ai: Views im 28-Tage-Zeitraum'})}
 const yt=(sets['yt-p']||[])[0]||{};platforms.yt.profile={name:txt(yt.channel_title),followers:n(yt.subscriber_count),videos:n(yt.video_count)};
 platforms.ig.daily=(sets['ig-d']||[]).filter(x=>day(x.date)).map(x=>({d:day(x.date),views:n(x.views),follows:n(x.follower_count_1d),reach:n(x.reach),likes:n(x.likes),comments:n(x.comments)})).sort((a,b)=>a.d.localeCompare(b.d));
 for(const x of sets['ig-v']||[]){const u=String(x.media_permalink||'');if(!u.startsWith('https://www.instagram.com/'))continue;platforms.ig.videos.push({id:txt(x.media_id),platform:'ig',title:txt(x.media_caption).split('#')[0].trim()||'Instagram Reel',date:day(x.date),thumb:url(x.media_thumbnail_url),views:n(x.media_views),likes:n(x.media_like_count),comments:n(x.media_total_comments_count),url:u,reportType:'lifetime',source:'Windsor.ai: Lifetime-Views'})}
 const ig=(sets['ig-p']||[])[0]||{};platforms.ig.profile={name:txt(ig.account_name),followers:n(ig.followers_count)};
 platforms.tt.daily=(sets['tt-d']||[]).filter(x=>day(x.date)).map(x=>({d:day(x.date),views:n(x.video_views),likes:n(x.likes),comments:n(x.comments),follows:n(x.followers_count),profileViews:n(x.profile_views)})).sort((a,b)=>a.d.localeCompare(b.d));
 for(const x of sets['tt-v']||[]){const id=String(x.video_id||'');if(!/^\d{12,25}$/.test(id))continue;platforms.tt.videos.push({id,platform:'tt',title:txt(x.video_caption).split('#')[0].trim()||'TikTok Video',date:day(x.date||x.video_create_datetime),time:String(x.video_create_datetime||'').slice(11,16),thumb:url(x.video_thumbnail_url),views:n(x.video_views_count),likes:n(x.video_likes),comments:n(x.video_comments),shares:n(x.video_shares),url:'https://www.tiktok.com/@back2u.mp3/video/'+id,reportType:'lifetime',source:'Windsor.ai: Lifetime-Views'})}
 return {schema:1,generatedAt:new Date().toISOString(),status:errors.length?'partial':'ok',platforms,errors,source:'Windsor.ai Connectors API',refreshInterval:'6h',historyLimitDays:28};
}
let cache=null;let inflight=null;
async function getSnapshot(force){
 if(!force&&cache&&Date.now()<cache.until)return {...cache.data,fromCache:true};
 if(!inflight)inflight=(async()=>{
  const out=await Promise.allSettled(TASKS.map(t=>pull(t,process.env.WINDSOR_API_KEY)));
  const sets={},errors=[];out.forEach((r,i)=>{if(r.status==='fulfilled')sets[TASKS[i][0]]=r.value;else errors.push({platform:TASKS[i][1],task:TASKS[i][0],message:txt(r.reason?.message||'Abruf fehlgeschlagen')})});
  const data=snapshot(sets,errors);if(!Object.values(data.platforms).some(p=>p.daily.length)){const summary=errors.filter(e=>['yt-d','ig-d','tt-d'].includes(e.task)).map(e=>e.task+': '+e.message).join(' | ');throw Error('Keine Tagesdaten von Windsor.ai verfügbar'+(summary?' – '+summary.slice(0,480):''));}
  cache={data,until:Date.now()+20*60*1000};return data;
 })().finally(()=>{inflight=null});
 return inflight;
}
export default async function handler(request){
 const u=new URL(request.url);const op=u.searchParams.get('op')||u.pathname.split('/').at(-1);
 if(op==='health')return resp({service:'BACK2U LIVE',configured:!!(process.env.WINDSOR_API_KEY&&process.env.DASHBOARD_PASSWORD&&process.env.SESSION_SECRET),loginReady:!!process.env.DASHBOARD_PASSWORD,sourceReady:!!process.env.WINDSOR_API_KEY});
 if(op==='login'){
  if(request.method!=='POST')return resp({error:'Nur POST erlaubt'},405);
  if(!process.env.SESSION_SECRET||!process.env.WINDSOR_API_KEY||!process.env.DASHBOARD_PASSWORD)return resp({error:'Netlify-Variablen unvollständig'},503);
  let x;try{x=await request.json()}catch{return resp({error:'Ungültige Anmeldung'},400)}
  if(typeof x?.password!=='string'||x.password.length>512||process.env.DASHBOARD_PASSWORD.length<12||!equal(x.password,process.env.DASHBOARD_PASSWORD))return resp({error:'Passwort falsch'},401);
  return resp({ok:true},200,{'set-cookie':sessionCookie()});
 }
 if(op==='logout')return resp({ok:true},200,{'set-cookie':'back2u_session=; Path=/api; Max-Age=0; Secure; HttpOnly; SameSite=Lax'});
 if(op==='diagnostics'){
  if(request.method!=='GET')return resp({error:'Nur GET erlaubt'},405);
  if(!authorized(request))return resp({error:'Bitte anmelden'},401);
  if(!process.env.WINDSOR_API_KEY)return resp({error:'API-Zugang nicht eingerichtet'},503);
  const checks=await Promise.allSettled([TASKS[0],TASKS[5],TASKS[8]].map(t=>pull(t,process.env.WINDSOR_API_KEY)));
  const names=['YouTube','Instagram','TikTok'];
  return resp({service:'BACK2U LIVE · Diagnose',checkedAt:new Date().toISOString(),platforms:checks.map((x,i)=>x.status==='fulfilled'?{platform:names[i],status:x.value.length?'ok':'empty',rows:x.value.length}:{platform:names[i],status:'error',reason:txt(x.reason?.message||'Datenabfrage fehlgeschlagen')})});
 }
 if(op!=='snapshot')return resp({error:'Nicht gefunden'},404);
 if(request.method!=='GET')return resp({error:'Nur GET erlaubt'},405);
 if(!authorized(request))return resp({error:'Bitte anmelden'},401);
 if(!process.env.WINDSOR_API_KEY)return resp({error:'WINDSOR_API_KEY fehlt'},503);
 try{return resp(await getSnapshot(u.searchParams.get('refresh')==='1'))}
 catch(e){return resp({error:'Abruf fehlgeschlagen',hint:txt(e.message)},502)}
}
