import {runAudienceAutoSync} from './audience-sync.js';
import {validateDirectAudience,mergeDirectAudience,chooseEffectiveAudience} from './direct-audience.js';
import {validateDirectMedia,mergeDirectMedia,overlayDirectMedia} from './direct-media.js';
import {validateDirectVideoInsights,mergeDirectVideoInsights,validateInstagramDaily,mergeInstagramDaily,overlayDirectInsights} from './direct-insights.js';
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

/* Guest access V7.3: separate, revocable, expiry-checked viewer sessions.
   Links have 256-bit random secrets in URL fragments; D1 stores only SHA-256 hashes. */
const GUEST_DURATIONS=[900,3600,21600,86400,604800,2592000];
const GUEST_TABLE='back2u_guest_links';
const guestSessionClear='back2u_guest_cf=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax';
const guestTableSql='CREATE TABLE IF NOT EXISTS '+GUEST_TABLE+
 ' (id TEXT PRIMARY KEY, token_hash TEXT NOT NULL UNIQUE, label TEXT NOT NULL, created_at INTEGER NOT NULL, expires_at INTEGER NOT NULL, revoked_at INTEGER)';
async function ensureGuestTable(env){await env.DB.prepare(guestTableSql).run()}
async function sha256Hex(value){
 const buffer=await crypto.subtle.digest('SHA-256',enc.encode(value));
 return [...new Uint8Array(buffer)].map(b=>b.toString(16).padStart(2,'0')).join('');
}
function requireSameSiteJson(req){
 const site=req.headers.get('sec-fetch-site');
 const origin=req.headers.get('origin');
 const type=req.headers.get('content-type')||'';
 return (site!=='cross-site')&&(!origin||origin===new URL(req.url).origin)&&/^application\/json(?:;|$)/i.test(type);
}
async function guestSession(req,env){
 if(!env.SESSION_SECRET||!env.DB)return null;
 const val=cookie(req,'back2u_guest_cf'),parts=val.split('.');
 if(parts.length!==2||!parts[0]||!parts[1]||parts[0].length>1000)return null;
 if(!(await equal(parts[1],await hmac(env.SESSION_SECRET,parts[0]))))return null;
 let claim;
 try{claim=JSON.parse(dec.decode(ub64(parts[0])))}catch{return null}
 const now=Date.now();
 if(claim.v!==2||typeof claim.id!=='string'||!/^[-\da-f]{36}$/i.test(claim.id)||
   !Number.isSafeInteger(claim.e)||claim.e<=now)return null;
 try{
  const record=await env.DB.prepare('SELECT id,expires_at,revoked_at FROM '+GUEST_TABLE+' WHERE id=?')
   .bind(claim.id).first();
  if(!record||record.revoked_at!==null||record.expires_at<=now||claim.e>record.expires_at)return null;
  return {id:record.id,expiresAt:record.expires_at};
 }catch{return null}
}
async function accessRole(req,env){
 if(await authorized(req,env))return {role:'admin'};
 const guest=await guestSession(req,env);
 return guest?{role:'guest',expiresAt:guest.expiresAt}:{role:null};
}
function guestLandingPage(){
 const html=String.raw`<!doctype html><html lang="de"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>BACK2U Gasteinladung</title><style>body{margin:0;min-height:100dvh;display:grid;place-items:center;background:#081426;color:#e8f4ff;font:16px system-ui}main{width:min(90vw,390px);background:#192d4a;border:1px solid #4f80aa;padding:24px;border-radius:20px}p{line-height:1.6;color:#bcd2eb}a{color:#93dcff}</style><main><h1>BACK2U · Gast</h1><p id="message">Deine Einladung wird sicher geprüft …</p><a href="/">Zur Anmeldung</a></main><script>(async()=>{const msg=document.getElementById('message'),token=location.hash.slice(1);history.replaceState(null,'','/guest');if(!/^[A-Za-z0-9_-]{42,48}$/.test(token)){msg.textContent='Einladungslink fehlt oder ist ungültig.';return}try{const r=await fetch('/api/guest/redeem',{method:'POST',headers:{'content-type':'application/json'},credentials:'same-origin',cache:'no-store',body:JSON.stringify({token})});if(!r.ok){msg.textContent='Der Link ist abgelaufen, widerrufen oder ungültig.';return}location.replace('/')}catch{msg.textContent='Verbindung fehlgeschlagen. Bitte erneut öffnen.'}})();</script></html>`;
 return new Response(html,{headers:{'content-type':'text/html; charset=utf-8',...NO_STORE,
  'content-security-policy':"default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; connect-src 'self'; base-uri 'none'; form-action 'none'",
  'x-frame-options':'DENY'}});
}
async function redeemGuest(req,env){
 if(req.method!=='POST')return json({error:'POST only'},405);
 if(!requireSameSiteJson(req))return json({error:'Unzulässige Anfrage'},403);
 let body;try{body=await req.json()}catch{return json({error:'Bad JSON'},400)}
 const token=body?.token;
 if(typeof token!=='string'||!/^[A-Za-z0-9_-]{42,48}$/.test(token))return json({error:'Ungültige Einladung'},401);
 let row;
 try{
  row=await env.DB.prepare('SELECT id,expires_at,revoked_at FROM '+GUEST_TABLE+' WHERE token_hash=?')
   .bind(await sha256Hex(token)).first();
 }catch{return json({error:'Ungültige Einladung'},401)}
 if(!row||row.revoked_at!==null||row.expires_at<=Date.now())return json({error:'Einladung abgelaufen'},401);
 const claim=b64(enc.encode(JSON.stringify({v:2,id:row.id,e:row.expires_at})));
 const maxAge=Math.max(1,Math.ceil((row.expires_at-Date.now())/1000));
 const signed=await hmac(env.SESSION_SECRET,claim);
 return json({ok:true,role:'guest',expiresAt:row.expires_at},200,{
  'set-cookie':'back2u_guest_cf='+claim+'.'+signed+
   '; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age='+maxAge});
}
async function guestLinks(req,env){
 if(req.method!=='GET'&&req.method!=='POST')return json({error:'Method not allowed'},405);
 if(req.method==='POST'&&!requireSameSiteJson(req))return json({error:'Unzulässige Anfrage'},403);
 if(!env.DB||!env.SESSION_SECRET)return json({error:'Gastzugänge nicht eingerichtet'},503);
 await ensureGuestTable(env);
 if(req.method==='GET'){
  const q=await env.DB.prepare('SELECT id,label,created_at,expires_at,revoked_at FROM '+GUEST_TABLE+
   ' ORDER BY created_at DESC LIMIT 100').all();
  return json({links:(q.results||[]).map(r=>({
   id:r.id,label:r.label,createdAt:r.created_at,expiresAt:r.expires_at,revokedAt:r.revoked_at
  }))});
 }
 let body;try{body=await req.json()}catch{return json({error:'Bad JSON'},400)}
 const duration=Number(body?.durationSeconds);
 if(!GUEST_DURATIONS.includes(duration))return json({error:'Ungültige Laufzeit'},422);
 const label=String(body?.label||'Gast').trim().slice(0,50);
 if(!label||/[\u0000-\u001f]/.test(label))return json({error:'Ungültige Bezeichnung'},422);
 const now=Date.now(),expires=now+duration*1000;
 const active=await env.DB.prepare('SELECT COUNT(*) AS n FROM '+GUEST_TABLE+
  ' WHERE revoked_at IS NULL AND expires_at>?').bind(now).first();
 if(Number(active?.n||0)>=30)return json({error:'Maximal 30 aktive Einladungen'},409);
 const id=crypto.randomUUID(),token=b64(crypto.getRandomValues(new Uint8Array(32)));
 await env.DB.prepare('INSERT INTO '+GUEST_TABLE+
  ' (id,token_hash,label,created_at,expires_at,revoked_at) VALUES(?,?,?,?,?,NULL)')
  .bind(id,await sha256Hex(token),label,now,expires).run();
 return json({ok:true,id,label,expiresAt:expires,link:new URL('/guest',req.url).href+'#'+token},201);
}
async function revokeGuest(req,env,id){
 if(req.method!=='DELETE')return json({error:'DELETE only'},405);
 const origin=req.headers.get('origin');
 if((origin&&origin!==new URL(req.url).origin)||req.headers.get('sec-fetch-site')==='cross-site')
  return json({error:'Unzulässige Anfrage'},403);
 if(!/^[-\da-f]{36}$/i.test(id))return json({error:'Ungültige ID'},400);
 await ensureGuestTable(env);
 await env.DB.prepare('UPDATE '+GUEST_TABLE+' SET revoked_at=? WHERE id=? AND revoked_at IS NULL')
  .bind(Date.now(),id).run();
 return json({ok:true});
}

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

/* Audience import: data stays in private D1, NEVER in static GitHub files. */
const AUDIENCE_KEY='audience_v1';
const allowedAudienceGroups={yt:['countries','gender','age'],tt:['age']};
function validateAudienceImport(data){
 if(!data||data.schema!==1||data.channelId!=='UCBnnaMohI_VfKihekEwaQEw'||data.tiktokHandle!=='back2u.mp3')
  throw new Error('Channel/account identity or schema mismatch');
 if(!/^\d{4}-\d\d-\d\d$/.test(String(data.snapshotDate||'')))
  throw new Error('Invalid snapshot date');
 const audience={},audienceMeta={};
 for(const [platform,groups] of Object.entries(allowedAudienceGroups)){
  audience[platform]={};audienceMeta[platform]={};
  for(const type of groups){
   const rows=data.audience?.[platform]?.[type];
   if(!Array.isArray(rows)||!rows.length||rows.length>40)throw new Error('Missing or oversized '+platform+'/'+type);
   const labels=new Set();let total=0;
   audience[platform][type]=rows.map(entry=>{
    if(!Array.isArray(entry)||entry.length!==2)throw new Error('Invalid category row');
    const label=String(entry[0]||'').trim(),value=Number(entry[1]);
    if(!label||label.length>70||/[\x00-\x1f<>]/.test(label)||labels.has(label)||!Number.isFinite(value)||value<0||value>100)
     throw new Error('Invalid category label or percentage');
    labels.add(label);total+=value;
    return [label,Math.round(value*100)/100];
   });
   if(Math.abs(total-100)>0.51)throw new Error('Percentage sum is not close to 100 for '+platform+'/'+type);
   const m=data.audienceMeta?.[platform]?.[type];
   if(!m||typeof m!=='object')throw new Error('Missing metadata');
   audienceMeta[platform][type]={};
   for(const field of ['source','asOf','period','basis']){
    if(m[field]===undefined)continue;
    const val=String(m[field]);
    if(val.length>400||/[<>]/.test(val))throw new Error('Invalid metadata');
    audienceMeta[platform][type][field]=val;
   }
   if(!audienceMeta[platform][type].source||!audienceMeta[platform][type].basis)
    throw new Error('Source and measurement basis required');
  }
 }
 return {schema:1,snapshotDate:data.snapshotDate,updatedAt:new Date().toISOString(),audience,audienceMeta};
}
async function audienceAdmin(req,env){
 if(req.method==='GET'){
  const saved=await get(env,AUDIENCE_KEY);
  const sync=await get(env,'audience_sync_status');
  return json({configured:!!saved,updatedAt:saved?.updatedAt||null,snapshotDate:saved?.snapshotDate||null,
   automatic:{configured:!!String(env.WINDSOR_API_KEY||'').trim(),tiktokOnlyMode:env.BACK2U_WINDSOR_TIKTOK_ONLY==='true',
    status:sync?.status||'not_started',lastAttemptAt:sync?.lastAttemptAt||null,
    lastSuccessAt:sync?.lastSuccessAt||null,snapshotDate:sync?.snapshotDate||null,
    error:sync?.error||null,groups:sync?.groups||null}});

 }
 if(req.method!=='POST')return json({error:'Method not allowed'},405);
 if(!requireSameSiteJson(req))return json({error:'Unzulässige Anfrage'},403);
 const raw=await req.text();
 if(raw.length>40000)return json({error:'Audience import too large'},413);
 let data;try{data=JSON.parse(raw)}catch{return json({error:'Invalid JSON'},400)}
 let valid;try{valid=validateAudienceImport(data)}catch(e){return json({error:clamp(e?.message)},422)}
 const previous=await get(env,AUDIENCE_KEY);
 // A manual 4-group backup must not accidentally erase 5 additional groups
 // created by the automatic 9-group sync.
 if(previous?.schema===1&&previous.audience){
  valid.audience={
   yt:{...(previous.audience.yt||{}),...valid.audience.yt},
   ig:{...(previous.audience.ig||{})},
   tt:{...(previous.audience.tt||{}),...valid.audience.tt}
  };
  valid.audienceMeta={
   yt:{...(previous.audienceMeta?.yt||{}),...valid.audienceMeta.yt},
   ig:{...(previous.audienceMeta?.ig||{})},
   tt:{...(previous.audienceMeta?.tt||{}),...valid.audienceMeta.tt}
  };
 }
 await put(env,AUDIENCE_KEY,valid);
 return json({ok:true,importedGroups:4,updatedAt:valid.updatedAt,snapshotDate:valid.snapshotDate});
}

async function audienceSyncAdmin(req,env){
 if(req.method!=='POST')return json({error:'POST only'},405);
 if(!requireSameSiteJson(req))return json({error:'Unzulässige Anfrage'},403);
 const result=await runAudienceAutoSync(env,{get,put,force:true,tiktokOnly:env.BACK2U_WINDSOR_TIKTOK_ONLY==='true'});
 const code=result.status==='ok'?200:result.status==='not_configured'?503:502;
 return json(result,code);
}

/* Google Apps Script -> Cloudflare, private bearer feed, no browser request. */
async function ingestDirectAudience(req,env){
 if(req.method!=='POST')return json({error:'POST only'},405);
 const secret=env.BACK2U_GOOGLE_FEED_SECRET;
 if(!secret||secret.length<24)return json({error:'Feed secret missing'},503);
 const supplied=(req.headers.get('authorization')||'').replace(/^Bearer\s+/i,'');
 if(!supplied||!(await equal(secret,supplied)))return json({error:'Forbidden'},403);
 const raw=await req.text();
 if(raw.length>35000)return json({error:'Payload too large'},413);
 let data;try{data=JSON.parse(raw)}catch{return json({error:'Bad JSON'},400)}
 let valid;try{valid=validateDirectAudience(data)}catch(e){return json({error:clamp(e?.message)},422)}
 const previous=await get(env,'direct_audience_v1');
 const old=previous?.platforms?.[valid.platform];
 if(old?.snapshotDate&&old.snapshotDate>valid.snapshotDate)
  return json({error:'An older report cannot replace a newer direct report'},409);
 const merged=mergeDirectAudience(previous,valid);
 await put(env,'direct_audience_v1',merged);
 return json({ok:true,platform:valid.platform,groups:3,snapshotDate:valid.snapshotDate,
  source:valid.platform==='yt'?'YouTube Analytics API':'Meta Graph API'});
}
async function ingestDirectMedia(req,env){
 if(req.method!=='POST')return json({error:'POST only'},405);
 const secret=env.BACK2U_GOOGLE_FEED_SECRET;
 if(!secret||secret.length<24)return json({error:'Feed secret missing'},503);
 const token=(req.headers.get('authorization')||'').replace(/^Bearer\s+/i,'');
 if(!token||!(await equal(secret,token)))return json({error:'Forbidden'},403);
 const raw=await req.text();
 if(raw.length>1740000)return json({error:'Direct media payload too large'},413);
 let data;try{data=JSON.parse(raw)}catch{return json({error:'Bad JSON'},400)}
 let valid;try{valid=validateDirectMedia(data)}catch(e){return json({error:clamp(e?.message)},422)}
 const old=await get(env,'direct_media_v1');
 const prior=old?.platforms?.[valid.platform];
 if(prior?.snapshotDate&&prior.snapshotDate>valid.snapshotDate)
  return json({error:'Older catalog cannot replace newer direct catalog'},409);
 const merged=mergeDirectMedia(old,valid);
 await put(env,'direct_media_v1',merged);
 return json({ok:true,platform:valid.platform,rows:valid.videos.length,snapshotDate:valid.snapshotDate});
}


async function ingestDirectInsights(req,env,kind){
 if(req.method!=='POST')return json({error:'POST only'},405);
 const secret=env.BACK2U_GOOGLE_FEED_SECRET;
 if(!secret||secret.length<24)return json({error:'Feed secret missing'},503);
 const auth=(req.headers.get('authorization')||'').replace(/^Bearer\s+/i,'');
 if(!auth||!(await equal(auth,secret)))return json({error:'Forbidden'},403);
 const raw=await req.text();
 if(raw.length>270000)return json({error:'Payload too large'},413);
 let body;try{body=JSON.parse(raw)}catch{return json({error:'Invalid JSON'},400)}
 let value;try{value=kind==='daily'?validateInstagramDaily(body):validateDirectVideoInsights(body)}
 catch(e){return json({error:clamp(e?.message)},422)}
 const key=kind==='daily'?'direct_ig_daily_v1':'direct_video_insights_v1';
 const last=await get(env,key);
 if(kind==='daily'){
  await put(env,key,mergeInstagramDaily(last,value));
  return json({ok:true,source:value.source,rows:value.daily.length,snapshotDate:value.snapshotDate});
 }
 const previous=last?.platforms?.[value.platform];
 if(previous?.snapshotDate>value.snapshotDate)return json({error:'Older video insights report'},409);
 await put(env,key,mergeDirectVideoInsights(last,value));
 return json({ok:true,platform:value.platform,source:value.source,videos:value.videos.length,
  period:value.period||'lifetime',snapshotDate:value.snapshotDate});
}

async function directAudienceStatus(req,env){
 if(req.method!=='GET')return json({error:'GET only'},405);
 const direct=await get(env,'direct_audience_v1');
 return json({sources:Object.fromEntries(['yt','ig'].map(p=>[p,{
  configured:!!direct?.platforms?.[p],lastSuccessAt:direct?.platforms?.[p]?.updatedAt||null,
  snapshotDate:direct?.platforms?.[p]?.snapshotDate||null,
  groups:Object.keys(direct?.platforms?.[p]?.audience||{}).length
 }]))});
}

async function hydratedSnapshot(env){
 const s=await get(env,'snapshot');
 if(!s?.platforms?.yt)return s;
 const [imported,direct]=await Promise.all([get(env,AUDIENCE_KEY),get(env,'direct_audience_v1')]);
 if(imported?.schema===1||direct?.schema===1)s.audienceImport=chooseEffectiveAudience(imported,direct);
 const instagramProfile=await get(env,'ig_profile');
 if(instagramProfile?.username==='lxon_jxmpstyle'&&Number.isSafeInteger(instagramProfile.followers)&&instagramProfile.followers>=0){
  s.platforms.ig.profile={...s.platforms.ig.profile,followers:instagramProfile.followers,username:instagramProfile.username,
   asOf:instagramProfile.updatedAt,source:'Instagram Graph API',history:instagramProfile.history||[]};
 }
 const [catalog,videoInsights,igDaily]=await Promise.all([
  get(env,'direct_media_v1'),get(env,'direct_video_insights_v1'),get(env,'direct_ig_daily_v1')
 ]);
 if(catalog?.schema===1)overlayDirectMedia(s,catalog);
 if(videoInsights?.schema===1||igDaily?.schema===1)
  overlayDirectInsights(s,{video:videoInsights,daily:igDaily});
 const tiktokProfile=await get(env,'tt_profile');
 const tiktokAuth=tiktokProfile?await get(env,'tt_oauth'):null;
 if(s.platforms.tt&&tiktokProfile?.openId&&tiktokProfile.openId===tiktokAuth?.openId&&
    Number.isSafeInteger(tiktokProfile.followers)&&tiktokProfile.followers>=0){
   s.platforms.tt.profile={...s.platforms.tt.profile,followers:tiktokProfile.followers,
     videoCount:tiktokProfile.videoCount,asOf:tiktokProfile.updatedAt,
     source:'TikTok Display API',history:tiktokProfile.history||[]};
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
  const more={};
  for(const field of ['shares','engagedViews','watchMinutes','averageViewSeconds']){
   if(row[field]===undefined||row[field]===null)continue;
   const value=Number(row[field]);
   if(!Number.isFinite(value)||value<0||
      (field!=='averageViewSeconds'&&field!=='watchMinutes'&&!Number.isSafeInteger(value)))
    return json({error:'Invalid YouTube '+field},422);
   more[field]=value;
  }
  byDate.set(d,{d,views:numeric.views,likes:numeric.likes,comments:numeric.comments,
   follows:numeric.subscribersGained-numeric.subscribersLost,
   subscribersGained:numeric.subscribersGained,subscribersLost:numeric.subscribersLost,
   ...more,source:'YouTube Analytics API'});
 }
 const old=await get(env,'yt_analytics_daily');
 const merged=new Map((old?.daily||[]).map(row=>[row.d,row]));
 for(const [k,v] of byDate)merged.set(k,{...(merged.get(k)||{}),...v});
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
// Do not request TikTok stats until permission has been enabled for the app.
const ttScopes=env=>env.TIKTOK_STATS_SCOPE_ENABLED==='true'?TT_SCOPES+',user.info.stats':TT_SCOPES;
const ttRedirect=(req,env)=>String(env.TIKTOK_REDIRECT_URI||new URL('/api/tiktok/callback',req.url).href);
async function ttStart(req,env){
 if(!env.TIKTOK_CLIENT_KEY||!env.TIKTOK_CLIENT_SECRET)return toHTML('Nicht eingerichtet','TikTok-Schlüssel fehlen in den Cloudflare Secrets.',503);
 const state=b64(crypto.getRandomValues(new Uint8Array(32)));
 const u=new URL('https://www.tiktok.com/v2/auth/authorize/');
 u.searchParams.set('client_key',env.TIKTOK_CLIENT_KEY);
 u.searchParams.set('response_type','code');
 u.searchParams.set('scope',ttScopes(env));
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
  const existingAccount=await get(env,'tt_oauth');
  if(existingAccount?.openId&&t.open_id&&existingAccount.openId!==t.open_id)
    return toHTML('Falsches Konto','Das TikTok-Konto stimmt nicht mit dem bisher verbundenen Account überein.',403,{'set-cookie':clearState});
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
async function ttRefreshProfile(env){
 const t=await ttAccess(env);
 if(!t?.openId)return {known:false,reason:'TikTok not connected'};
 if(!String(t.scope||'').split(/[\s,]+/).includes('user.info.stats'))
   return {known:false,reason:'user.info.stats not granted'};
 const response=await fetch('https://open.tiktokapis.com/v2/user/info/?fields=open_id,follower_count,video_count',
   {method:'GET',headers:{authorization:'Bearer '+t.accessToken},signal:AbortSignal.timeout(12000)});
 const data=await response.json();
 const p=data?.data?.user;
 if(!response.ok||data?.error?.code!=='ok'||!p||p.open_id!==t.openId)
   throw Error('TikTok profile API unavailable or account mismatch');
 const followers=num(p.follower_count),count=num(p.video_count);
 if(!Number.isSafeInteger(followers)||followers<0)throw Error('TikTok follower count missing');
 const previous=await get(env,'tt_profile');
 const updatedAt=new Date().toISOString(),date=updatedAt.slice(0,10);
 const history=previous?.openId===t.openId&&Array.isArray(previous.history)?previous.history.slice(-364):[];
 const point={date,followers};
 if(history.at(-1)?.date===date)history[history.length-1]=point;
 else history.push(point);
 const videoCount=Number.isSafeInteger(count)&&count>=0?count:null;
 await put(env,'tt_profile',{openId:t.openId,followers,videoCount,updatedAt,history:history.slice(-365)});
 return {known:true,followers,videoCount};
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
 // A denied statistics scope must never interrupt the established video sync.
 const profileSync=await ttRefreshProfile(env).catch(e=>({known:false,error:clamp(e?.message)}));
 const snapshot=await get(env,'snapshot');
 if(!snapshot?.platforms?.yt)return {connected:true,added:t.videos.length,pending:'Google Sheets snapshot not yet migrated'};
 const prior=snapshot.platforms.tt?.videos||[];
 const byId=new Map(prior.map(v=>[String(v.id),v]));
 for(const v of t.videos)byId.set(v.id,v);
 const videos=[...byId.values()];
 // Preserve every known video. Compare only when this run fetched from the newest
 // page through has_more=false; partial/resumed runs cannot establish absences.
 const fullInventoryComparison=!validCheckpoint&&!t.hasMore;
 const fetchedIds=new Set(t.videos.map(v=>String(v.id)));
 const retainedOnly=fullInventoryComparison?prior.filter(v=>!fetchedIds.has(String(v.id))):[];
 const inventory={
  updatedAt:new Date().toISOString(),fullScan:fullInventoryComparison,
  startedFromNewest:!validCheckpoint,pages:t.pages,hasMore:t.hasMore,
  fetchedThisRun:t.videos.length,storedAfterMerge:videos.length,
  previouslyStoredNotReturned:fullInventoryComparison?retainedOnly.length:null,
  samplePreviouslyStoredNotReturned:fullInventoryComparison?retainedOnly.slice(0,8).map(v=>({
    id:clamp(v.id),date:day(v.date),title:clamp(v.title)
  })):[],
  note:fullInventoryComparison?
    'Not returned in one full API scan is not proof of deletion, privacy or unavailability.':
    'Partial or continued scan; do not infer video absences.'
 };
 snapshot.platforms.tt={...snapshot.platforms.tt,daily:snapshot.platforms.tt?.daily||[],videos,profile:snapshot.platforms.tt?.profile||{}};
 snapshot.generatedAt=new Date().toISOString();
 snapshot.errors=(snapshot.errors||[]).filter(x=>x.platform!=='tt');
 if(t.hasMore)snapshot.errors.push({platform:'tt',task:'video-list',message:'TikTok has more videos than the current page limit'});
 snapshot.status=snapshot.errors.length?'partial':'ok';
 await put(env,'snapshot',snapshot);
 await put(env,'tt_scan_reconciliation',inventory);
 await put(env,'tt_page_cursor',{cursor:t.hasMore?t.nextCursor:null,hasMore:t.hasMore,pagesLastBatch:t.pages,updatedAt:new Date().toISOString(),complete:!t.hasMore});
 return {connected:true,added:t.videos.length,total:videos.length,hasMore:t.hasMore,pages:t.pages,complete:!t.hasMore,continued:!!validCheckpoint,
   fetchedThisRun:inventory.fetchedThisRun,previouslyStoredNotReturned:inventory.previouslyStoredNotReturned,
   fullInventoryComparison:inventory.fullScan,
   tiktokFollowersUpdated:profileSync.known,statsScopeRequired:profileSync.reason==='user.info.stats not granted'};
}
/* Read-only cross-check of saved TikTok IDs against the independent video/query API.
   Runs only on explicit owner request, never during the 30-minute cron. */
async function ttAuditVideos(env){
 const token=await ttAccess(env);
 if(!token?.accessToken)throw Error('TikTok account not connected');
 if(!String(token.scope||'').split(/[\s,]+/).includes('video.list'))
   throw Error('TikTok video.list scope missing');
 const snapshot=await get(env,'snapshot'),stored=snapshot?.platforms?.tt?.videos||[];
 if(!stored.length)throw Error('No stored TikTok videos');
 const unique=new Map();
 for(const video of stored){const id=String(video?.id||'');if(/^\d{12,25}$/.test(id))unique.set(id,video)}
 const ids=[...unique.keys()];
 if(!ids.length||ids.length>800)throw Error('Audit supports up to 800 video IDs');
 const scan=await get(env,'tt_scan_reconciliation');
 const profile=await get(env,'tt_profile');
 const accountVerified=!!(profile?.openId&&profile.openId===token.openId);
 const batches=[];
 for(let i=0;i<ids.length;i+=20)batches.push(ids.slice(i,i+20));
 const found=new Set(),failures=[];
 let calls=0;
 for(let start=0;start<batches.length;start+=3){
  const block=await Promise.all(batches.slice(start,start+3).map(async(selected,slot)=>{
   const batch=start+slot+1;
   try{
    const response=await fetch('https://open.tiktokapis.com/v2/video/query/?fields=id,create_time,view_count',
      {method:'POST',headers:{authorization:'Bearer '+token.accessToken,'content-type':'application/json'},
       body:JSON.stringify({filters:{video_ids:selected}}),signal:AbortSignal.timeout(16000)});
    const data=await response.json();
    if(!response.ok||data?.error?.code!=='ok')
     return {batch,error:'TikTok video.query: '+clamp(data?.error?.code||response.status)};
    if(!Array.isArray(data.data?.videos))return {batch,error:'Invalid video.query response'};
    const approved=new Set(selected),responseIds=data.data.videos.map(v=>String(v.id||''));
    if(responseIds.some(id=>!approved.has(id)))return {batch,error:'Unexpected video ID in response'};
    return {batch,ids:responseIds};
   }catch(e){return {batch,error:clamp(e?.message||'Network error')}}
  }));
  for(const item of block){
   calls++;
   if(item.error)failures.push({batch:item.batch,error:item.error});
   else for(const id of item.ids)found.add(id);
  }
 }
 const complete=failures.length===0;
 const notConfirmed=complete?ids.filter(id=>!found.has(id)):null;
 const profileCount=accountVerified&&Number.isSafeInteger(profile.videoCount)?profile.videoCount:null;
 const matchedList=scan?.fullScan===true;
 let interpretation='query_incomplete';
 if(complete)interpretation=notConfirmed.length===0?
   (profileCount===null?'all_ids_confirmed':
    profileCount===found.size?'all_counters_agree':'profile_counter_disagrees_with_both_video_endpoints'):
   'some_listed_ids_not_confirmed_by_video_query';
 const audit={asOf:new Date().toISOString(),storedVideoRows:stored.length,
  uniqueValidStoredIds:ids.length,duplicateStoredRows:stored.length-ids.length,
  queriedBatches:calls,totalBatches:batches.length,queryComplete:complete,
  queryConfirmedIds:complete?found.size:null,queryUnconfirmedIds:complete?notConfirmed.length:null,
  sampleUnconfirmed:complete?notConfirmed.slice(0,8).map(id=>({
   id,date:day(unique.get(id)?.date),title:clamp(unique.get(id)?.title)
  })):[],
  tiktokProfileVideoCount:profileCount,profileAsOf:accountVerified?profile.updatedAt:null,
  priorListFullScan:matchedList,priorListFetched:matchedList?scan.fetchedThisRun:null,
  priorListAsOf:scan?.updatedAt||null,interpretation,
  requestErrors:failures.slice(0,6),noDataDeleted:true};
 await put(env,'tt_video_query_audit',audit);
 return audit;
}
async function route(req,env){
 const path=new URL(req.url).pathname;
 if(path==='/api/health')return json({service:'BACK2U Cloud',configured:!!(env.DB&&env.DASHBOARD_PASSWORD&&env.SESSION_SECRET),dbReady:!!env.DB,
  loginReady:!!env.DASHBOARD_PASSWORD,sourceReady:!!env.BACK2U_GOOGLE_FEED_SECRET});
 if(path==='/api/login')return req.method==='POST'?issueToken(req,env):json({error:'POST only'},405);
 if(path==='/api/guest/redeem')return redeemGuest(req,env);
 if(path==='/api/youtube-daily/ingest')return ingestYoutubeDaily(req,env);
 if(path==='/api/direct-audience/ingest')return ingestDirectAudience(req,env);
 if(path==='/api/direct-media/ingest')return ingestDirectMedia(req,env);
 if(path==='/api/direct-video-insights/ingest')return ingestDirectInsights(req,env,'video');
 if(path==='/api/direct-instagram-daily/ingest')return ingestDirectInsights(req,env,'daily');
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
 const access=await accessRole(req,env);
 if(!access.role)return json({error:'Bitte anmelden'},401);
 if(path==='/api/access')return req.method==='GET'?json(access):json({error:'GET only'},405);
 if(path==='/api/logout'){
  const headers=new Headers(NO_STORE);
  headers.set('content-type','application/json; charset=utf-8');
  headers.append('set-cookie',clearSession);
  headers.append('set-cookie',guestSessionClear);
  return new Response(JSON.stringify({ok:true}),{headers});
 }
 if(path==='/api/snapshot'){
  if(req.method!=='GET')return json({error:'GET only'},405);
  const s=await hydratedSnapshot(env);
  return s?json(s):json({error:'Noch kein Google Sheets Export eingegangen'},503);
 }
 // Guest rights end here: no diagnostics, imports, OAuth, sync, audit or access management.
 if(access.role!=='admin')return json({error:'Nur Administrator'},403);
 if(path==='/api/audience')return audienceAdmin(req,env);
 if(path==='/api/audience/sync')return audienceSyncAdmin(req,env);
 if(path==='/api/direct-audience/status')return directAudienceStatus(req,env);
 if(path==='/api/direct-insights/status'){
  if(req.method!=='GET')return json({error:'GET only'},405);
  const [insights,daily]=await Promise.all([
   get(env,'direct_video_insights_v1'),get(env,'direct_ig_daily_v1')
  ]);
  return json({youtubeVideoInsights:{
   updatedAt:insights?.platforms?.yt?.updatedAt||null,
   videoCount:insights?.platforms?.yt?.videos?.length||0,
   periods:Object.keys(insights?.platforms?.yt?.periods||{}).map(Number).sort((a,b)=>a-b),
   period:insights?.platforms?.yt?.period||null
  },instagramVideoInsights:{
   updatedAt:insights?.platforms?.ig?.updatedAt||null,
   videoCount:insights?.platforms?.ig?.videos?.length||0
  },instagramDaily:{
   updatedAt:daily?.updatedAt||null,
   days:daily?.daily?.length||0,
   dataThrough:daily?.daily?.at(-1)?.date||null
  }});
 }
 if(path==='/api/guest-links')return guestLinks(req,env);
 if(path.startsWith('/api/guest-links/'))return revokeGuest(req,env,path.slice('/api/guest-links/'.length));

 if(path==='/api/diagnostics'){
  const s=await hydratedSnapshot(env);
  const scan=await get(env,'tt_page_cursor');
  const inventory=await get(env,'tt_scan_reconciliation');
  const videoQueryAudit=await get(env,'tt_video_query_audit');
  const tt=s?.platforms?.tt?.videos||[];
  const ttOauth=await get(env,'tt_oauth');
  const ttProfile=s?.platforms?.tt?.profile||{};
  const dates=tt.map(v=>String(v?.date||'')).filter(d=>/^\d{4}-\d{2}-\d{2}$/.test(d)).sort();
  const cutoff=new Date(Date.now()-365*86400000).toISOString().slice(0,10);
  const ttDates={oldest:dates[0]||null,newest:dates.at(-1)||null,
   datedVideos:dates.length,unknownDate:tt.length-dates.length,
   olderThan365Days:dates.filter(d=>d<cutoff).length,cutoff365Days:cutoff,
   olderThanOneYearConfirmed:dates.some(d=>d<cutoff)};
  return json({service:'BACK2U Cloud',source:s?.source||'none',generatedAt:s?.generatedAt||null,
   tiktokScan:{updatedAt:scan?.updatedAt||null,hasMore:scan?.hasMore??null,complete:scan?.complete??null,pagesLastBatch:scan?.pagesLastBatch||null},
   tiktokVideoDateRange:ttDates,
   tiktokVideoQueryAudit:videoQueryAudit||null,
   tiktokVideoReconciliation:inventory?{
    ...inventory,
    officialPublicVideoCount:Number.isSafeInteger(ttProfile.videoCount)?ttProfile.videoCount:null,
    storedVsOfficialDifference:Number.isSafeInteger(ttProfile.videoCount)?tt.length-ttProfile.videoCount:null
   }:null,
   tiktokFollowers:{known:Number.isSafeInteger(ttProfile.followers),asOf:ttProfile.asOf||null,
     statsScopeGranted:String(ttOauth?.scope||'').split(/[\s,]+/).includes('user.info.stats'),
     officialPublicVideoCount:Number.isSafeInteger(ttProfile.videoCount)?ttProfile.videoCount:null},
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
 if(path==='/api/tiktok/audit'){
  if(req.method!=='POST')return json({error:'POST only'},405);
  try{return json({ok:true,...await ttAuditVideos(env)})}
  catch(e){return json({error:clamp(e?.message)},502)}
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
   if(path==='/guest')return guestLandingPage();
   if(!(await accessRole(req,env)).role)return loginPage();
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
  ctx.waitUntil(runAudienceAutoSync(env,{get,put,tiktokOnly:env.BACK2U_WINDSOR_TIKTOK_ONLY==='true'})
   .then(r=>{if(r.status==='error')console.warn('Audience scheduled sync failed:',r.error)})
   .catch(e=>console.error('Audience scheduled sync could not complete:',clamp(e?.message))));
 }
};
