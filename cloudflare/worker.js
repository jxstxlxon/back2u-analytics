/* BACK2U Cloudflare Worker - private creator dashboard.
   Independent of Netlify. Do not publish API keys or creator analytics in static assets.
   The Cloudflare D1 binding DB must contain the back2u_store(key,value,updated_at) table.
*/
const enc=new TextEncoder();
const dec=new TextDecoder();
const NO_STORE={'cache-control':'private, no-store','x-content-type-options':'nosniff','referrer-policy':'no-referrer'};
const json=(data,status=200,extra={})=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json; charset=utf-8',...NO_STORE,...extra}});
const clamp=x=>String(x??'').slice(0,500);
const num=x=>x==null||String(x).trim()===''?null:Number.isFinite(Number(x))?Number(x):null;
const day=x=>String(x||'').slice(0,10);
const url=x=>{try{const u=new URL(String(x));return u.protocol==='https:'?u.href:null}catch{return null}};
const b64=bytes=>btoa(String.fromCharCode(...bytes)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/g,'');
const ub64=s=>Uint8Array.from(atob(s.replace(/-/g,'+').replace(/_/g,'/')+'='.repeat((4-s.length%4)%4)),c=>c.charCodeAt(0));
function cookie(req,name){return (req.headers.get('cookie')||'').split(';').map(x=>x.trim()).find(x=>x.startsWith(name+'='))?.slice(name.length+1)||''}
async function hmac(secret,input){
 const key=await crypto.subtle.importKey('raw',enc.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);
 return b64(new Uint8Array(await crypto.subtle.sign('HMAC',key,enc.encode(input))));
}
async function equal(a,b){
 const [x,y]=await Promise.all([crypto.subtle.digest('SHA-256',enc.encode(String(a))),crypto.subtle.digest('SHA-256',enc.encode(String(b)))]);
 const aa=new Uint8Array(x),bb=new Uint8Array(y);let diff=0;
 for(let i=0;i<aa.length;i++)diff|=aa[i]^bb[i];
 return diff===0;
}
async function authorized(req,env){
 if(!env.SESSION_SECRET)return false;
 const val=cookie(req,'back2u_session_cf');const [raw,signature]=val.split('.');
 if(!raw||!signature||!(await equal(signature,await hmac(env.SESSION_SECRET,raw))))return false;
 try{const s=JSON.parse(dec.decode(ub64(raw)));return s.v===1&&s.e>Math.floor(Date.now()/1000)}catch{return false}
}
function sessionCookie(raw,signature){return 'back2u_session_cf='+raw+'.'+signature+'; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=2592000'}
const clearSession='back2u_session_cf=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax';
const clearState='back2u_tt_state=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax';
async function get(env,key){
 const row=await env.DB.prepare('SELECT value FROM back2u_store WHERE key=?').bind(key).first();
 return row?JSON.parse(row.value):null;
}
async function put(env,key,value){
 const payload=JSON.stringify(value);
 if(enc.encode(payload).length>1850000)throw new Error('D1 row limit: data too large');
 await env.DB.prepare('INSERT INTO back2u_store (key,value,updated_at) VALUES (?,?,CURRENT_TIMESTAMP) ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_at=CURRENT_TIMESTAMP').bind(key,payload).run();
}

/* Historical YouTube Analytics daily totals are stored separately so regular
   Sheets pushes and TikTok cron runs cannot overwrite verified day reports. */
async function hydratedSnapshot(env){
 const s=await get(env,'snapshot');
 if(!s?.platforms?.yt)return s;
 const instagramProfile=await get(env,'ig_profile');
 if(instagramProfile?.username==='lxon_jxmpstyle'&&Number.isSafeInteger(instagramProfile.followers)&&instagramProfile.followers>=0){
  s.platforms.ig.profile={...s.platforms.ig.profile,followers:instagramProfile.followers,username:instagramProfile.username,
   asOf:instagramProfile.updatedAt,source:'Instagram Graph API',history:instagramProfile.history||[]};
 }
 const verified=await get(env,'yt_analytics_daily');
 if(!verified?.daily?.length)return s;
 const byDate=new Map((s.platforms.yt.daily||[]).map(r=>[r.d,r]));
 for(const item of verified.daily)byDate.set(item.d,item);
 s.platforms.yt.daily=[...byDate.values()].sort((a,b)=>a.d.localeCompare(b.d));
 if(typeof verified.subscriberCount==='number')s.platforms.yt.profile={...s.platforms.yt.profile,subscribers:verified.subscriberCount,asOf:verified.updatedAt,source:'YouTube Data API'};
 s.platforms.yt.dailySource='YouTube Analytics API (day-level) plus retained Sheets history';
 s.verifiedYouTubeDaily={updatedAt:verified.updatedAt,dataThrough:verified.daily.at(-1)?.d||null,count:verified.daily.length};
 s.dataThrough=s.platforms.yt.daily.at(-1)?.d||s.dataThrough;
 return s;
}

async function ingestInstagramProfile(req,env){
 if(req.method!=='POST')return json({error:'POST only'},405);
 const configured=env.BACK2U_GOOGLE_FEED_SECRET;
 if(!configured||configured.length<24)return json({error:'Feed secret missing'},503);
 const token=(req.headers.get('authorization')||'').replace(/^Bearer\s+/i,'');
 if(!token||!(await equal(token,configured)))return json({error:'Forbidden'},403);
 const raw=await req.text();
 if(raw.length>16000)return json({error:'Payload too large'},413);
 let data;try{data=JSON.parse(raw)}catch{return json({error:'Bad JSON'},400)}
 if(data?.schema!==1||String(data.username||'').trim().toLowerCase()!=='lxon_jxmpstyle')return json({error:'Instagram account mismatch'},422);
 const followers=Number(data.followers_count);
 if(data.followers_count===null||data.followers_count===undefined||!Number.isSafeInteger(followers)||followers<0)return json({error:'Invalid followers_count'},422);
 const old=await get(env,'ig_profile');
 const now=new Date().toISOString();
 const today=now.slice(0,10);
 const history=new Map((old?.history||[]).filter(x=>/^\d{4}-\d\d-\d\d$/.test(x.date)&&Number.isSafeInteger(x.followers)).map(x=>[x.date,x]));
 history.set(today,{date:today,followers});
 const profile={username:'lxon_jxmpstyle',followers,updatedAt:now,history:[...history.values()].sort((a,b)=>a.date.localeCompare(b.date)).slice(-120)};
 await put(env,'ig_profile',profile);
 return json({ok:true,platform:'Instagram',followers,asOf:now,historyDays:profile.history.length});
}

async function ingestYoutubeDaily(req,env){
 if(req.method!=='POST')return json({error:'POST only'},405);
 if(!env.BACK2U_GOOGLE_FEED_SECRET||env.BACK2U_GOOGLE_FEED_SECRET.length<24)return json({error:'Feed secret missing'},503);
 const token=(req.headers.get('authorization')||'').replace(/^Bearer\s+/i,'');
 if(!token||!(await equal(token,env.BACK2U_GOOGLE_FEED_SECRET)))return json({error:'Forbidden'},403);
 const raw=await req.text();if(raw.length>95000)return json({error:'Payload too large'},413);
 let data;try{data=JSON.parse(raw)}catch{return json({error:'Bad JSON'},400)}
 if(data?.schema!==1||!Array.isArray(data.daily)||!data.daily.length||data.daily.length>125)return json({error:'Invalid YouTube daily rows'},422);
 const byDate=new Map();
 const today=new Date().toISOString().slice(0,10);
 for(const row of data.daily){
  const d=String(row.date||row.d||'');
  if(!/^\d{4}-\d{2}-\d{2}$/.test(d)||Number.isNaN(Date.parse(d+'T00:00:00Z'))||d>today)return json({error:'Invalid report date'},422);
  const numeric={};for(const field of ['views','likes','comments','subscribersGained','subscribersLost']){
   const value=num(row[field]);
   if(value===null||value<0||!Number.isSafeInteger(value))return json({error:'Invalid '+field},422);
   numeric[field]=value;
  }
  byDate.set(d,{d,views:numeric.views,likes:numeric.likes,comments:numeric.comments,
   follows:numeric.subscribersGained-numeric.subscribersLost,
   subscribersGained:numeric.subscribersGained,subscribersLost:numeric.subscribersLost,
   source:'YouTube Analytics API'});
 }
 const old=await get(env,'yt_analytics_daily');
 const merged=new Map((old?.daily||[]).map(row=>[row.d,row]));
 for(const [k,v] of byDate)merged.set(k,v);
 const daily=[...merged.values()].sort((a,b)=>a.d.localeCompare(b.d)).slice(-125);
 const subscriberCount=num(data.subscriberCount);
 const snapshot={daily,updatedAt:new Date().toISOString(),
  subscriberCount:subscriberCount!==null&&subscriberCount>=0?subscriberCount:old?.subscriberCount??null};
 await put(env,'yt_analytics_daily',snapshot);
 return json({ok:true,rows:daily.length,dataThrough:daily.at(-1)?.d,subscriberCountKnown:snapshot.subscriberCount!==null});
}

function parsePush(body){
 if(body?.schema!==1||!Array.isArray(body.daily)||!Array.isArray(body.videos)||
    body.daily.length>1000||body.videos.length>1500||
    (body.igDaily!==undefined&&(!Array.isArray(body.igDaily)||body.igDaily.length>1000))||
    (body.igVideos!==undefined&&(!Array.isArray(body.igVideos)||body.igVideos.length>1500)))throw Error('Invalid Sheets payload');
 const ytDays=new Map(),ytVideos=new Map();
 for(const d of body.daily){
  const date=day(d.date);if(!/^\d{4}-\d{2}-\d{2}$/.test(date))continue;
  ytDays.set(date,{d:date,views:num(d.views),likes:num(d.likes),comments:num(d.comments)});
 }
 for(const v of body.videos){
  const id=String(v.video||'');
  if(!/^[\w-]{11}$/.test(id))continue;
  ytVideos.set(id,{id,platform:'yt',title:clamp(v.video_title)||'YouTube Short',
   date:day(v.published_at),url:'https://www.youtube.com/shorts/'+id,
   thumb:url(v.videoimage)||'https://i.ytimg.com/vi/'+id+'/hqdefault.jpg',
   views:num(v.views),likes:num(v.likes),comments:num(v.comments),
   follows:num(v.subscribers_gained),
   reportType:'lifetime',
   source:'YouTube Data API: lifetime counts'});
 }
 const igDays=new Map(),igVideos=new Map();
 for(const d of body.igDaily||[]){
  const date=day(d.date);if(!/^\d{4}-\d{2}-\d{2}$/.test(date))continue;
  igDays.set(date,{d:date,views:num(d.views),reach:num(d.reach),likes:num(d.likes),
   comments:num(d.comments),follows:num(d.follower_count_1d)});
 }
 for(const v of body.igVideos||[]){
  const id=String(v.media_id||'').trim();if(!/^\d{12,25}$/.test(id))continue;
  const link=url(v.media_permalink);if(!link||!/^https:\/\/(?:www\.)?instagram\.com\/(?:reel|p|tv)\//i.test(link))continue;
  const caption=clamp(v.media_caption);
  igVideos.set(id,{id,platform:'ig',title:caption.split('#')[0].trim()||caption||'Instagram-Beitrag',
   date:day(v.date),url:link,thumb:url(v.media_thumbnail_url),views:num(v.media_views),
   likes:num(v.media_like_count),comments:num(v.media_total_comments_count??v.media_comments_count),
   reach:num(v.media_reach),mediaType:clamp(v.media_type),reportType:'lifetime',
   source:'Instagram API: lifetime metrics'});
 }
 const daily=[...ytDays.values()].sort((a,b)=>a.d.localeCompare(b.d));
 if(!daily.length)throw Error('No valid YouTube daily statistics');
 return {schema:1,generatedAt:new Date().toISOString(),status:'partial',
  platforms:{yt:{daily,videos:[...ytVideos.values()],profile:{},videoMetricDays:null},
   ig:{daily:[...igDays.values()].sort((a,b)=>a.d.localeCompare(b.d)),videos:[...igVideos.values()],profile:{},videoMetricDays:null},
   tt:{daily:[],videos:[],profile:{}}},
  errors:[{platform:'tt',task:'tt-feed',message:'TikTok synchronization not yet enabled'}],
  source:'BACK2U Cloudflare / private Apps Script push',refreshInterval:'30m',
  dataThrough:daily.at(-1).d,historyLimitDays:28,sheetFetchedAt:typeof body.fetchedAt==='string'?clamp(body.fetchedAt):null};
}
function loginPage(){
 const html='<!doctype html><html lang="de"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>BACK2U Login</title><style>body{margin:0;background:#070d1a;color:#f0f6ff;font:16px system-ui;min-height:100dvh;display:grid;place-items:center}form{width:min(90vw,390px);padding:30px;background:#172540;border:1px solid #42618d;border-radius:24px;box-shadow:0 25px 90px #0009}h1{margin:0 0 12px}p{color:#a6bad5;line-height:1.5}input,button{width:100%;box-sizing:border-box;padding:14px;margin-top:15px;border-radius:12px;font:inherit}input{background:#071426;border:1px solid #7194bd;color:white}button{background:#4caaff;border:0;color:#071426;font-weight:700}#error{color:#ffafb2;font-size:13px}</style><form id="f"><h1>BACK2U Cloud</h1><p>Privates Creator Dashboard</p><input id="p" type="password" placeholder="Dashboard-Passwort" autocomplete="current-password" required><button>Anmelden</button><p id="error" role="status"></p><p><a style="color:#91c5ff" href="/privacy.html">Privacy</a> · <a style="color:#91c5ff" href="/terms.html">Terms</a></p></form><script>document.getElementById("f").onsubmit=async e=>{e.preventDefault();const p=document.getElementById("p");const r=await fetch("/api/login",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({password:p.value})});if(r.ok)location.href="/";else document.getElementById("error").textContent="Passwort falsch oder Dienst nicht eingerichtet";p.value=""};</script>';
 return new Response(html,{headers:{'content-type':'text/html; charset=utf-8','cache-control':'no-store','content-security-policy':"default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; connect-src 'self'",'x-content-type-options':'nosniff'}});
}
async function issueToken(req,env){
 if(!env.DASHBOARD_PASSWORD||env.DASHBOARD_PASSWORD.length<12||!env.SESSION_SECRET)return json({error:'Cloudflare Secrets fehlen'},503);
 let data;try{data=await req.json()}catch{return json({error:'Bad JSON'},400)}
 if(typeof data?.password!=='string'||data.password.length>512||!(await equal(data.password,env.DASHBOARD_PASSWORD)))return json({error:'Passwort falsch'},401);
 const raw=b64(enc.encode(JSON.stringify({v:1,e:Math.floor(Date.now()/1000)+2592000})));
 return json({ok:true},200,{'set-cookie':sessionCookie(raw,await hmac(env.SESSION_SECRET,raw))});
}
const toHTML=(title,message,status=200,headers={})=>new Response('<!doctype html><html lang="de"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>BACK2U TikTok</title><body style="background:#07101e;color:white;font:16px system-ui;padding:26px"><h1>BACK2U TikTok</h1><h2>'+title+'</h2><p>'+message+'</p><a style="color:#9bc9ff" href="/">Dashboard öffnen</a></body></html>',{status,headers:{'content-type':'text/html; charset=utf-8',...NO_STORE,'content-security-policy':"default-src 'none'; style-src 'unsafe-inline'",...headers}});
const TT_SCOPES='user.info.basic,video.list';
const ttRedirect=(req,env)=>String(env.TIKTOK_REDIRECT_URI||new URL('/api/tiktok/callback',req.url).href);
async function ttStart(req,env){
 if(!env.TIKTOK_CLIENT_KEY||!env.TIKTOK_CLIENT_SECRET)return toHTML('Nicht eingerichtet','TikTok-Schlüssel fehlen in den Cloudflare Secrets.',503);
 const state=b64(crypto.getRandomValues(new Uint8Array(32)));
 const u=new URL('https://www.tiktok.com/v2/auth/authorize/');
 u.searchParams.set('client_key',env.TIKTOK_CLIENT_KEY);
 u.searchParams.set('response_type','code');
 u.searchParams.set('scope',TT_SCOPES);
 u.searchParams.set('redirect_uri',ttRedirect(req,env));
 u.searchParams.set('state',state);
 return new Response(null,{status:302,headers:{location:u.href,'set-cookie':'back2u_tt_state='+state+'; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=600',...NO_STORE}});
}
async function ttCallback(req,env){
 const p=new URL(req.url).searchParams;
 const state=cookie(req,'back2u_tt_state');
 if(!state||!p.get('state')||!(await equal(state,p.get('state'))))return toHTML('Abgebrochen','Sicherheitsprüfung fehlgeschlagen.',400,{'set-cookie':clearState});
 if(p.has('error'))return toHTML('Abgebrochen','TikTok-Berechtigung wurde nicht erteilt.',400,{'set-cookie':clearState});
 const code=p.get('code')||'';
 if(!code||code.length>2048)return toHTML('Fehler','Ungültiger TikTok-Login-Code.',400,{'set-cookie':clearState});
 if(!env.TIKTOK_CLIENT_KEY||!env.TIKTOK_CLIENT_SECRET)return toHTML('Fehler','TikTok-Schlüssel fehlen.',503,{'set-cookie':clearState});
 try{
  const form=new URLSearchParams({client_key:env.TIKTOK_CLIENT_KEY,client_secret:env.TIKTOK_CLIENT_SECRET,code,grant_type:'authorization_code',redirect_uri:ttRedirect(req,env)});
  const response=await fetch('https://open.tiktokapis.com/v2/oauth/token/',{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},body:form,signal:AbortSignal.timeout(12000)});
  const t=await response.json();
  if(!response.ok||!t.access_token||!t.refresh_token||!String(t.scope||'').split(',').includes('video.list'))
   return toHTML('Nicht autorisiert','TikTok hat video.list oder die Anmeldung nicht akzeptiert.',403,{'set-cookie':clearState});
  const now=Date.now();
  await put(env,'tt_oauth',{accessToken:t.access_token,refreshToken:t.refresh_token,scope:t.scope,
   openId:t.open_id,expiresAt:now+Number(t.expires_in||0)*1000,refreshExpiresAt:now+Number(t.refresh_expires_in||0)*1000});
  return toHTML('Erfolgreich verbunden','Das TikTok-Konto wurde autorisiert. Der Token bleibt geschützt in Cloudflare D1.',200,{'set-cookie':clearState});
 }catch{return toHTML('Verbindung fehlgeschlagen','Bitte TikTok-Anmeldung erneut versuchen.',502,{'set-cookie':clearState})}
}
async function ttAccess(env){
 let t=await get(env,'tt_oauth');if(!t?.accessToken||!t.refreshToken)return null;
 if(Date.now()+120000<Number(t.expiresAt||0))return t;
 if(!env.TIKTOK_CLIENT_KEY||!env.TIKTOK_CLIENT_SECRET)throw Error('TikTok credentials absent');
 const form=new URLSearchParams({client_key:env.TIKTOK_CLIENT_KEY,client_secret:env.TIKTOK_CLIENT_SECRET,
  grant_type:'refresh_token',refresh_token:t.refreshToken});
 const response=await fetch('https://open.tiktokapis.com/v2/oauth/token/',{method:'POST',
  headers:{'content-type':'application/x-www-form-urlencoded'},body:form,signal:AbortSignal.timeout(12000)});
 const token=await response.json();
 if(!response.ok||!token.access_token||!token.refresh_token)throw Error('TikTok token refresh failed');
 const now=Date.now();
 t={accessToken:token.access_token,refreshToken:token.refresh_token,openId:token.open_id||t.openId,
 scope:token.scope||t.scope,expiresAt:now+Number(token.expires_in||0)*1000,refreshExpiresAt:now+Number(token.refresh_expires_in||0)*1000};
 await put(env,'tt_oauth',t);return t;
}
async function ttFetch(env,maxPages=25,startCursor){
 const t=await ttAccess(env);if(!t)return {connected:false,videos:[],hasMore:false};
 let cursor=startCursor,hasMore=true,pages=0;
 const records=new Map();
 while(hasMore&&pages<maxPages){
  const args={max_count:20};if(cursor!==undefined)args.cursor=cursor;
  const response=await fetch('https://open.tiktokapis.com/v2/video/list/?fields=id,title,video_description,create_time,share_url,cover_image_url,view_count,like_count,comment_count,share_count,duration',
   {method:'POST',headers:{authorization:'Bearer '+t.accessToken,'content-type':'application/json'},body:JSON.stringify(args),signal:AbortSignal.timeout(12000)});
  const data=await response.json();
  if(!response.ok||data?.error?.code!=='ok')throw Error('TikTok video.list error: '+clamp(data?.error?.code||response.status));
  for(const v of data.data?.videos||[]){
   const id=String(v.id||'');if(!/^\d{12,25}$/.test(id))continue;
   const heading=clamp(v.title||v.video_description)||'TikTok Video';
   records.set(id,{id,platform:'tt',title:heading,date:Number(v.create_time)>0?new Date(Number(v.create_time)*1000).toISOString().slice(0,10):'',
    url:url(v.share_url),thumb:url(v.cover_image_url),views:num(v.view_count),
    likes:num(v.like_count),comments:num(v.comment_count),shares:num(v.share_count),duration:num(v.duration),
    reportType:'lifetime',source:'Official TikTok Display API'});
  }
  pages++;hasMore=!!data.data?.has_more;cursor=data.data?.cursor;
  if(hasMore&&(cursor===undefined||cursor===null))throw Error('TikTok pagination cursor missing');
 }
 return {connected:true,videos:[...records.values()],hasMore,pages,nextCursor:hasMore?cursor:null};
}
async function ttSync(env){
 const checkpoint=await get(env,'tt_page_cursor');
 const validCheckpoint=checkpoint?.hasMore&&checkpoint?.cursor!=null&&Number.isSafeInteger(Number(checkpoint.cursor))&&Date.now()-Date.parse(checkpoint.updatedAt||'')<86400000;
 const t=await ttFetch(env,25,validCheckpoint?Number(checkpoint.cursor):undefined);if(!t.connected)return {connected:false,added:0};
 const snapshot=await get(env,'snapshot');
 if(!snapshot?.platforms?.yt)return {connected:true,added:t.videos.length,pending:'Google Sheets snapshot not yet migrated'};
 const prior=snapshot.platforms.tt?.videos||[];
 const byId=new Map(prior.map(v=>[String(v.id),v]));
 for(const v of t.videos)byId.set(v.id,v);
 const videos=[...byId.values()];
 snapshot.platforms.tt={...snapshot.platforms.tt,daily:snapshot.platforms.tt?.daily||[],videos,profile:{}};
 snapshot.generatedAt=new Date().toISOString();
 snapshot.errors=(snapshot.errors||[]).filter(x=>x.platform!=='tt');
 if(t.hasMore)snapshot.errors.push({platform:'tt',task:'video-list',message:'TikTok has more videos than the current page limit'});
 snapshot.status=snapshot.errors.length?'partial':'ok';
 await put(env,'snapshot',snapshot);
 await put(env,'tt_page_cursor',{cursor:t.hasMore?t.nextCursor:null,hasMore:t.hasMore,pagesLastBatch:t.pages,updatedAt:new Date().toISOString(),complete:!t.hasMore});
 return {connected:true,added:t.videos.length,total:videos.length,hasMore:t.hasMore,pages:t.pages,complete:!t.hasMore,continued:!!validCheckpoint};
}
async function route(req,env){
 const path=new URL(req.url).pathname;
 if(path==='/api/health')return json({service:'BACK2U Cloud',configured:!!(env.DB&&env.DASHBOARD_PASSWORD&&env.SESSION_SECRET),dbReady:!!env.DB,
  loginReady:!!env.DASHBOARD_PASSWORD,sourceReady:!!env.BACK2U_GOOGLE_FEED_SECRET});
 if(path==='/api/login')return req.method==='POST'?issueToken(req,env):json({error:'POST only'},405);
 if(path==='/api/youtube-daily/ingest')return ingestYoutubeDaily(req,env);
 if(path==='/api/instagram-profile/ingest')return ingestInstagramProfile(req,env);
 if(path==='/api/ingest'){
  if(req.method!=='POST')return json({error:'POST only'},405);
  if(!env.BACK2U_GOOGLE_FEED_SECRET||env.BACK2U_GOOGLE_FEED_SECRET.length<24)return json({error:'Ingest secret missing'},503);
  const token=(req.headers.get('authorization')||'').replace(/^Bearer\s+/i,'');
  if(!token||!(await equal(token,env.BACK2U_GOOGLE_FEED_SECRET)))return json({error:'Forbidden'},403);
  const raw=await req.text();if(raw.length>1800000)return json({error:'Payload too large'},413);
  let data;try{data=JSON.parse(raw)}catch{return json({error:'Bad JSON'},400)}
  let snapshot;try{snapshot=parsePush(data);const prior=await get(env,'snapshot');
   if(prior?.platforms?.tt)snapshot.platforms.tt=prior.platforms.tt;
   snapshot.errors=prior?.platforms?.tt?.videos?.length?[]:snapshot.errors;
   snapshot.status=snapshot.errors.length?'partial':'ok';
   await put(env,'snapshot',snapshot);
  }catch(e){return json({error:clamp(e?.message)},422)}
  return json({ok:true,source:'BACK2U Cloudflare D1',
   days:snapshot.platforms.yt.daily.length,videos:snapshot.platforms.yt.videos.length,
   instagramDays:snapshot.platforms.ig.daily.length,instagramVideos:snapshot.platforms.ig.videos.length,
   tiktokVideos:snapshot.platforms.tt.videos.length,dataThrough:snapshot.dataThrough});
 }
 if(!(await authorized(req,env)))return json({error:'Bitte anmelden'},401);
 if(path==='/api/logout')return json({ok:true},200,{'set-cookie':clearSession});
 if(path==='/api/snapshot'){
  const s=await hydratedSnapshot(env);
  return s?json(s):json({error:'Noch kein Google Sheets Export eingegangen'},503);
 }
 if(path==='/api/diagnostics'){
  const s=await hydratedSnapshot(env);
  const scan=await get(env,'tt_page_cursor');
  const tt=s?.platforms?.tt?.videos||[];
  const dates=tt.map(v=>String(v?.date||'')).filter(d=>/^\d{4}-\d{2}-\d{2}$/.test(d)).sort();
  const cutoff=new Date(Date.now()-365*86400000).toISOString().slice(0,10);
  const ttDates={oldest:dates[0]||null,newest:dates.at(-1)||null,
   datedVideos:dates.length,unknownDate:tt.length-dates.length,
   olderThan365Days:dates.filter(d=>d<cutoff).length,cutoff365Days:cutoff,
   olderThanOneYearConfirmed:dates.some(d=>d<cutoff)};
  return json({service:'BACK2U Cloud',source:s?.source||'none',generatedAt:s?.generatedAt||null,
   tiktokScan:{updatedAt:scan?.updatedAt||null,hasMore:scan?.hasMore??null,complete:scan?.complete??null,pagesLastBatch:scan?.pagesLastBatch||null},
   tiktokVideoDateRange:ttDates,
   youtubeDailyVerified:s?.verifiedYouTubeDaily||null,instagramFollowers:{known:Number.isSafeInteger(s?.platforms?.ig?.profile?.followers),asOf:s?.platforms?.ig?.profile?.asOf||null},dailyThrough:{youtube:s?.platforms?.yt?.daily?.at(-1)?.d||null,instagram:s?.platforms?.ig?.daily?.at(-1)?.d||null},
   platforms:[{platform:'YouTube',videos:s?.platforms?.yt?.videos?.length||0},{platform:'Instagram',videos:s?.platforms?.ig?.videos?.length||0},
    {platform:'TikTok',videos:s?.platforms?.tt?.videos?.length||0}]});
 }
 if(path==='/api/tiktok/start')return ttStart(req,env);
 if(path==='/api/tiktok/callback')return ttCallback(req,env);
 if(path==='/api/tiktok/preview'){
  try{const t=await ttFetch(env,1);
   return json({connected:t.connected,videosFound:t.videos.length,pages:t.pages,hasMore:t.hasMore,
    sample:t.videos.length?{title:t.videos[0].title,views:t.videos[0].views}:null});
  }catch(e){return json({error:clamp(e?.message)},502)}
 }
 if(path==='/api/tiktok/sync'){
  if(req.method!=='POST')return json({error:'POST only'},405);
  try{return json({ok:true,...await ttSync(env)})}catch(e){return json({error:clamp(e?.message)},502)}
 }
 return json({error:'Route not found'},404);
}
export default {
 async fetch(req,env,ctx){
  const path=new URL(req.url).pathname;
  try{
   if(path.startsWith('/api/'))return await route(req,env);
   if(req.method!=='GET'&&req.method!=='HEAD')return json({error:'Method not allowed'},405);
   if(path==='/terms.html'||path==='/privacy.html'||/^\/tiktok[\w-]*\.txt$/i.test(path))return env.ASSETS.fetch(req);
   if(!(await authorized(req,env)))return loginPage();
   const response=await env.ASSETS.fetch(req);
   if(path==='/'||path.endsWith('.html')){
    const headers=new Headers(response.headers);headers.set('cache-control','private, no-store');headers.set('x-content-type-options','nosniff');
    return new Response(response.body,{status:response.status,headers});
   }
   return response;
  }catch(e){return json({error:'Interner Fehler',hint:clamp(e?.message)},502)}
 },
 async scheduled(controller,env,ctx){
  ctx.waitUntil(ttSync(env).catch(e=>console.error('TikTok scheduled sync:',clamp(e?.message))));
 }
};
