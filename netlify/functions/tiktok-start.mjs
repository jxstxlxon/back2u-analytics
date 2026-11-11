import {createHash,createHmac,randomBytes,timingSafeEqual} from 'node:crypto';
const REDIRECT='https://quiet-halva-285199.netlify.app/.netlify/functions/tiktok-callback';
const hash=x=>createHash('sha256').update(String(x)).digest();
const same=(a,b)=>timingSafeEqual(hash(a),hash(b));
function owner(req){
 const key=process.env.SESSION_SECRET||'';
 if(!key)return false;
 const cookie=(req.headers.get('cookie')||'').split(';').map(x=>x.trim()).find(x=>x.startsWith('back2u_session='))?.slice(15);
 if(!cookie)return false;
 const [raw,sig]=cookie.split('.');
 if(!raw||!sig||!same(sig,createHmac('sha256',key).update(raw).digest('base64url')))return false;
 try{const v=JSON.parse(Buffer.from(raw,'base64url').toString('utf8'));return v.v===1&&v.e>Math.floor(Date.now()/1000)}catch{return false}
}
function message(txt,status){return new Response('<!doctype html><meta charset="utf-8"><title>BACK2U TikTok</title><body><h2>BACK2U TikTok</h2><p>'+txt+'</p><a href="/">Zum Dashboard</a></body>',{status,headers:{'content-type':'text/html; charset=utf-8','cache-control':'no-store','content-security-policy':"default-src 'none'",'referrer-policy':'no-referrer'}})}
export default async function handler(req){
 if(req.method!=='GET')return message('Nur GET erlaubt.',405);
 if(!owner(req))return message('Bitte zuerst im BACK2U-Dashboard anmelden und dann den TikTok-Login erneut starten.',401);
 const key=process.env.TIKTOK_CLIENT_KEY||'';
 if(!key||!process.env.TIKTOK_CLIENT_SECRET)return message('TikTok-Schluessel sind in Netlify noch nicht eingerichtet.',503);
 const state=randomBytes(32).toString('base64url');
 const url=new URL('https://www.tiktok.com/v2/auth/authorize/');
 url.searchParams.set('client_key',key);
 url.searchParams.set('response_type','code');
 url.searchParams.set('scope','user.info.basic,video.list');
 url.searchParams.set('redirect_uri',REDIRECT);
 url.searchParams.set('state',state);
 return new Response(null,{status:302,headers:{location:url.href,'set-cookie':'back2u_tiktok_oauth_state='+state+'; Path=/; Max-Age=600; Secure; HttpOnly; SameSite=Lax','cache-control':'no-store','referrer-policy':'no-referrer'}});
}