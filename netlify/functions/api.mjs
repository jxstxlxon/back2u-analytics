import {createHash,createHmac,timingSafeEqual} from 'node:crypto';
import {googleSheetsSnapshot} from './sheet-feed.mjs';
import {getPushedGoogleSheets,ingestGoogleSheets} from './pushed-feed.mjs';
const txt=v=>String(v??'').slice(0,500);
const resp=(j,s=200,h={})=>new Response(JSON.stringify(j),{status:s,headers:{'content-type':'application/json; charset=utf-8','cache-control':'private, no-store','x-content-type-options':'nosniff',...h}});
const equal=(a,b)=>timingSafeEqual(createHash('sha256').update(String(a)).digest(),createHash('sha256').update(String(b)).digest());
function signingKey(){return process.env.SESSION_SECRET||''}
const sheetsReady=()=>Boolean(process.env.BACK2U_GOOGLE_FEED_URL&&process.env.BACK2U_GOOGLE_FEED_SECRET);
const pushReady=()=>Boolean((process.env.BACK2U_GOOGLE_FEED_SECRET||'').length>=24);
const sourceReady=()=>Boolean(pushReady()||sheetsReady());
function signature(x){return createHmac('sha256',signingKey()).update(x).digest('base64url')}
function sessionCookie(){const raw=Buffer.from(JSON.stringify({v:1,e:Math.floor(Date.now()/1000)+2592000})).toString('base64url');return 'back2u_session='+raw+'.'+signature(raw)+'; Path=/api; HttpOnly; Secure; SameSite=Lax; Max-Age=2592000'}
function authorized(req){if(!signingKey())return false;const val=(req.headers.get('cookie')||'').split(';').map(s=>s.trim()).find(s=>s.startsWith('back2u_session='))?.slice(15);if(!val)return false;const [raw,sig]=val.split('.');if(!raw||!sig||!equal(sig,signature(raw)))return false;try{const x=JSON.parse(Buffer.from(raw,'base64url').toString('utf8'));return x.v===1&&x.e>Math.floor(Date.now()/1000)}catch{return false}}
export default async function handler(request){
 const u=new URL(request.url);const op=u.searchParams.get('op')||u.pathname.split('/').at(-1);
 if(op==='health')return resp({service:'BACK2U LIVE',configured:!!(sourceReady()&&process.env.DASHBOARD_PASSWORD&&process.env.SESSION_SECRET),loginReady:!!process.env.DASHBOARD_PASSWORD,sourceReady:sourceReady(),source:pushReady()?'private-google-sheets-push':sheetsReady()?'private-google-sheets':'none'});
 if(op==='login'){
  if(request.method!=='POST')return resp({error:'Nur POST erlaubt'},405);
  if(!process.env.SESSION_SECRET||!sourceReady()||!process.env.DASHBOARD_PASSWORD)return resp({error:'Netlify-Variablen unvollständig'},503);
  let x;try{x=await request.json()}catch{return resp({error:'Ungültige Anmeldung'},400)}
  if(typeof x?.password!=='string'||x.password.length>512||process.env.DASHBOARD_PASSWORD.length<12||!equal(x.password,process.env.DASHBOARD_PASSWORD))return resp({error:'Passwort falsch'},401);
  return resp({ok:true},200,{'set-cookie':sessionCookie()});
 }
 if(op==='logout')return resp({ok:true},200,{'set-cookie':'back2u_session=; Path=/api; Max-Age=0; Secure; HttpOnly; SameSite=Lax'});
 if(op==='ingest')return ingestGoogleSheets(request);
 if(op==='diagnostics'){
  if(request.method!=='GET')return resp({error:'Nur GET erlaubt'},405);
  if(!authorized(request))return resp({error:'Bitte anmelden'},401);
  if(!sourceReady())return resp({error:'API-Zugang nicht eingerichtet'},503);
  if(pushReady()){
    try {
      const sheet=await getPushedGoogleSheets();
      if(!sheet)return resp({service:'BACK2U LIVE · Diagnose',source:'private-google-sheets-push',status:'waiting',message:'Noch kein Export von Google angekommen. Apps Script: pushToNetlify ausführen.'});
      return resp({service:'BACK2U LIVE · Diagnose',source:'private-google-sheets-push',platforms:[{platform:'YouTube',status:'ok',rows:sheet.platforms.yt.daily.length,videos:sheet.platforms.yt.videos.length,dataThrough:sheet.dataThrough},{platform:'Instagram',status:'pending'},{platform:'TikTok',status:'pending'}],lastPush:sheet.generatedAt});
    } catch(e){return resp({service:'BACK2U LIVE · Diagnose',source:'private-google-sheets-push',error:'Speicherzugriff fehlgeschlagen'},502)}
  }
  if(sheetsReady()){
    try {const sheet=await googleSheetsSnapshot(true);return resp({service:'BACK2U LIVE · Diagnose',checkedAt:new Date().toISOString(),source:'private-google-sheets',platforms:[{platform:'YouTube',status:sheet.platforms.yt.daily.length?'ok':'empty',rows:sheet.platforms.yt.daily.length,videos:sheet.platforms.yt.videos.length,dataThrough:sheet.dataThrough},{platform:'Instagram',status:'pending'},{platform:'TikTok',status:'pending'}]})}
    catch(e){return resp({service:'BACK2U LIVE · Diagnose',source:'private-google-sheets',error:String(e.message||e)},502)}
  }
  return resp({service:'BACK2U LIVE · Diagnose',source:'none',status:'unavailable',message:'Kein Google-Sheets-Feed konfiguriert'},503);
 }
 if(op!=='snapshot')return resp({error:'Nicht gefunden'},404);
 if(request.method!=='GET')return resp({error:'Nur GET erlaubt'},405);
 if(!authorized(request))return resp({error:'Bitte anmelden'},401);
 if(!sourceReady())return resp({error:'Datenquelle fehlt'},503);
 try{
   if(pushReady()){
     const pushed=await getPushedGoogleSheets();
     if(!pushed)throw Error('Google hat noch keine Daten an Netlify gesendet. Bitte pushToNetlify in Apps Script ausführen.');
     return resp(pushed);
   }
   return resp(await googleSheetsSnapshot(u.searchParams.get('refresh')==='1'))
 }
 catch(e){return resp({error:'Abruf fehlgeschlagen',hint:txt(e.message)},502)}
}
