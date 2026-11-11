import {createHash,createHmac,timingSafeEqual} from 'node:crypto';
import {getStore} from '@netlify/blobs';
const STORE={name:'back2u-tiktok-private',region:'eu-central-1'};
const eq=(a,b)=>timingSafeEqual(createHash('sha256').update(String(a)).digest(),createHash('sha256').update(String(b)).digest());
function owner(req){
 const secret=process.env.SESSION_SECRET||'';
 const cookie=(req.headers.get('cookie')||'').split(';').map(x=>x.trim()).find(x=>x.startsWith('back2u_session='))?.slice(15);
 if(!secret||!cookie)return false;
 const [raw,signature]=cookie.split('.');
 if(!raw||!signature||!eq(signature,createHmac('sha256',secret).update(raw).digest('base64url')))return false;
 try{const d=JSON.parse(Buffer.from(raw,'base64url').toString('utf8'));return d.v===1&&d.e>Math.floor(Date.now()/1000)}catch{return false}
}
const escapeHtml=s=>String(s??'').slice(0,180).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const page=(heading,details,status=200)=>{
 const html='<!doctype html><html lang="de"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>BACK2U TikTok Test</title><body style="margin:0;padding:32px;background:#07101e;color:#edf5ff;font:16px/1.65 system-ui"><main style="max-width:650px;margin:auto"><h1>BACK2U · TikTok</h1><h2>'+escapeHtml(heading)+'</h2><p>'+escapeHtml(details)+'</p><p><a style="color:#83c8ff" href="/">Zurück zum Dashboard</a></p></main></body></html>';
 return new Response(html,{status,headers:{'content-type':'text/html; charset=utf-8','cache-control':'private, no-store','x-content-type-options':'nosniff','referrer-policy':'no-referrer','content-security-policy':"default-src 'none'; style-src 'unsafe-inline'"}});
};
export default async function handler(req){
 if(req.method!=='GET')return page('Fehler','Nur GET erlaubt.',405);
 if(!owner(req))return page('Nicht angemeldet','Bitte zuerst im BACK2U-Dashboard anmelden und den Link im selben Browser öffnen.',401);
 try {
  const store=getStore(STORE);
  let token=await store.get('creator-oauth',{type:'json',consistency:'strong'});
  if(!token?.accessToken||!token?.refreshToken)return page('Noch nicht verbunden','Bitte TikTok-Anmeldung abschließen.',404);
  if(!String(token.scope||'').split(',').includes('video.list'))return page('Berechtigung fehlt','Bitte TikTok erneut mit video.list autorisieren.',403);
  if(Date.now()+120000>=Number(token.expiresAt||0)){
   const clientKey=process.env.TIKTOK_CLIENT_KEY||'';
   const clientSecret=process.env.TIKTOK_CLIENT_SECRET||'';
   if(!clientKey||!clientSecret)return page('Konfiguration unvollständig','TikTok-Schlüssel fehlen.',503);
   const body=new URLSearchParams({client_key:clientKey,client_secret:clientSecret,grant_type:'refresh_token',refresh_token:token.refreshToken});
   const response=await fetch('https://open.tiktokapis.com/v2/oauth/token/',{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},body:body.toString(),signal:AbortSignal.timeout(12000)});
   const next=await response.json();
   if(!response.ok||!next.access_token||!next.refresh_token)return page('TikTok-Anmeldung abgelaufen','Bitte TikTok erneut verbinden. Die alten Zugangsdaten wurden nicht überschrieben.',401);
   const now=Date.now();
   token={...token,accessToken:next.access_token,refreshToken:next.refresh_token,scope:next.scope||token.scope,openId:next.open_id||token.openId,expiresAt:now+Number(next.expires_in||0)*1000,refreshExpiresAt:now+Number(next.refresh_expires_in||0)*1000};
   await store.setJSON('creator-oauth',token);
  }
  const url='https://open.tiktokapis.com/v2/video/list/?fields=id,title,video_description,create_time,share_url,view_count,like_count,comment_count,share_count,duration';
  const response=await fetch(url,{method:'POST',headers:{authorization:'Bearer '+token.accessToken,'content-type':'application/json'},body:JSON.stringify({max_count:20}),signal:AbortSignal.timeout(15000)});
  const data=await response.json();
  if(!response.ok||!data||data.error?.code!=='ok'){
    return page('Videoabruf noch nicht erfolgreich','TikTok meldet: '+String(data?.error?.code||'HTTP '+response.status).slice(0,80)+'. Prüfe die Sandbox-Berechtigung video.list.',502);
  }
  const items=Array.isArray(data.data?.videos)?data.data.videos:[];
  const n=items.length;
  const example=items[0];
  const extra=example?' Beispiel: '+String(example.title||example.video_description||'Ohne Titel').slice(0,90)+', '+String(example.view_count??'?')+' Aufrufe.':'';
  return page('Verbindung und Videoabruf funktionieren',String(n)+' Videos in der ersten TikTok-Abfrage erhalten. '+(data.data?.has_more?'Weitere Seiten vorhanden.':'Keine weiteren Seiten gemeldet.')+extra);
 }catch(err){return page('TikTok-Test fehlgeschlagen','Die Funktion konnte TikTok nicht vollständig abfragen. Bitte Screenshot dieser Seite senden.',502)}
}