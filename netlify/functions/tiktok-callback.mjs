import {createHash,timingSafeEqual} from 'node:crypto';
import {getStore} from '@netlify/blobs';
const REDIRECT='https://quiet-halva-285199.netlify.app/.netlify/functions/tiktok-callback';
const STORE={name:'back2u-tiktok-private',region:'eu-central-1'};
const CLEAR='back2u_tiktok_oauth_state=; Path=/; Max-Age=0; Secure; HttpOnly; SameSite=Lax';
const hash=x=>createHash('sha256').update(String(x)).digest();
const same=(a,b)=>timingSafeEqual(hash(a),hash(b));
function page(msg,good=false,status=200){
 const html='<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>BACK2U TikTok</title><body style="font:16px system-ui;background:#111827;color:white;padding:32px"><h2>'+(good?'TikTok verbunden':'TikTok-Verbindung')+'</h2><p>'+msg+'</p><a style="color:#a5b4fc" href="/">Zum BACK2U-Dashboard</a></body>';
 return new Response(html,{status,headers:{'content-type':'text/html; charset=utf-8','cache-control':'no-store','set-cookie':CLEAR,'content-security-policy':"default-src 'none'; style-src 'unsafe-inline'",'x-content-type-options':'nosniff','referrer-policy':'no-referrer'}});
}
export default async function handler(req){
 if(req.method!=='GET')return page('Nur GET erlaubt.',false,405);
 const p=new URL(req.url).searchParams;
 const cookie=(req.headers.get('cookie')||'').split(';').map(x=>x.trim()).find(x=>x.startsWith('back2u_tiktok_oauth_state='))?.split('=')[1];
 const state=p.get('state');
 if(!cookie||!state||!same(state,cookie))return page('Sicherheitspruefung fehlgeschlagen. Bitte Verbindung neu starten.',false,400);
 if(p.has('error'))return page('TikTok-Anmeldung wurde abgebrochen oder verweigert.',false,400);
 const code=p.get('code')||'';
 if(!code||code.length>2048)return page('Keinen gueltigen Anmeldungscode erhalten.',false,400);
 const clientKey=process.env.TIKTOK_CLIENT_KEY||'';
 const clientSecret=process.env.TIKTOK_CLIENT_SECRET||'';
 if(!clientKey||!clientSecret)return page('TikTok-Schluessel fehlen in Netlify.',false,503);
 try{
  const body=new URLSearchParams({client_key:clientKey,client_secret:clientSecret,code,grant_type:'authorization_code',redirect_uri:REDIRECT});
  const res=await fetch('https://open.tiktokapis.com/v2/oauth/token/',{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded','cache-control':'no-cache'},body:body.toString(),signal:AbortSignal.timeout(12000)});
  const tok=await res.json();
  if(!res.ok||!tok?.access_token||!tok?.refresh_token||!tok?.open_id)return page('TikTok hat die Anmeldung nicht bestaetigt. Bitte Redirect URI und App-Freigabe pruefen.',false,502);
  const scopes=String(tok.scope||'').split(',').map(x=>x.trim());
  if(!scopes.includes('video.list')||!scopes.includes('user.info.basic'))return page('Berechtigung video.list oder user.info.basic wurde nicht freigegeben.',false,403);
  const now=Date.now();
  await getStore(STORE).setJSON('creator-oauth',{accessToken:tok.access_token,refreshToken:tok.refresh_token,openId:String(tok.open_id),scope:tok.scope,expiresAt:now+Math.max(0,Number(tok.expires_in)||0)*1000,refreshExpiresAt:now+Math.max(0,Number(tok.refresh_expires_in)||0)*1000,connectedAt:new Date(now).toISOString()});
  return page('Das TikTok-Konto wurde autorisiert. Der Zugang ist privat gespeichert; als Naechstes folgt der Videoabruf.',true,200);
 }catch{return page('Technischer Fehler bei der TikTok-Verbindung. Bitte erneut versuchen.',false,502)}
}