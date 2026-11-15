// BACK2U: public Twitch metadata research. Never downloads or publishes clips.
const json=(d,s=200)=>Response.json(d,{status:s,headers:{"Cache-Control":"no-store","X-Content-Type-Options":"nosniff"}});
const cid=/^[a-z0-9]{15,50}$/i;
async function proxy(url,opts={}){const r=await fetch(url,{...opts,redirect:"error"});let d;try{d=await r.json()}catch{return json({error:"Twitch response not JSON"},502)}return json(d,r.status)}
export default {async fetch(request,env){
const u=new URL(request.url);
if(!u.pathname.startsWith("/api/")){
const r=await env.ASSETS.fetch(request);const h=new Headers(r.headers);
h.set("Referrer-Policy","no-referrer");h.set("X-Content-Type-Options","nosniff");h.set("X-Frame-Options","DENY");
return new Response(r.body,{status:r.status,headers:h});
}
if(request.method!=="POST"||Number(request.headers.get("content-length")||0)>5000)return json({error:"Invalid method or size"},405);
let b;try{b=await request.json()}catch{return json({error:"Invalid JSON"},400)}
if(!b||typeof b!=="object")return json({error:"Invalid body"},400);
const id=String(b.clientId||"").trim();if(!cid.test(id))return json({error:"Twitch Client-ID fehlt oder ist ungültig"},400);
if(u.pathname==="/api/device"){
return proxy("https://id.twitch.tv/oauth2/device",{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},body:new URLSearchParams({client_id:id,scopes:""})});
}
if(u.pathname==="/api/token"){
const code=String(b.deviceCode||"");if(code.length<10||code.length>300)return json({error:"Device code invalid"},400);
return proxy("https://id.twitch.tv/oauth2/token",{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},body:new URLSearchParams({client_id:id,device_code:code,grant_type:"urn:ietf:params:oauth:grant-type:device_code"})});
}
const t=String(b.accessToken||"");if(!/^[a-z0-9]{15,200}$/i.test(t))return json({error:"Twitch login required"},401);
const headers={Authorization:"Bearer "+t,"Client-Id":id};
if(u.pathname==="/api/games"){
const name=String(b.game||"Grand Theft Auto VI").slice(0,80);
return proxy("https://api.twitch.tv/helix/games?name="+encodeURIComponent(name),{headers});
}
if(u.pathname==="/api/clips"){
const gid=String(b.gameId||"").trim(),bid=String(b.broadcasterId||"").trim();
if(!/^\d{1,20}$/.test(gid||bid)||(gid&&bid))return json({error:"Game-ID oder Broadcaster-ID fehlt"},400);
const h=Math.max(1,Math.min(168,Math.round(Number(b.hours)||72)));
const q=new URLSearchParams({[bid?"broadcaster_id":"game_id"]:bid||gid,started_at:new Date(Date.now()-h*3600000).toISOString(),ended_at:new Date().toISOString(),first:"60"});
return proxy("https://api.twitch.tv/helix/clips?"+q,{headers});
}
return json({error:"Not found"},404);
}};