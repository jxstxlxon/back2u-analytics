import assert from 'node:assert/strict';
import {webcrypto} from 'node:crypto';
import worker from '../cloudflare/worker.js';

globalThis.crypto ||= webcrypto;
const enc=new TextEncoder();
const base='https://back2u.example';
const secret='integration-test-session-secret';
const tt='_000Gn_3riaTBVXEHqk1YfrwMWPK3cJcFkGv';
const guestId='12345678-1234-4123-8123-123456789abc';
const guestExpiry=Date.now()+3600000;
const storage=new Map([['tt_daily_v1',{schema:1,accountId:tt,
 source:'TikTok Organic via Windsor.ai (daily account report)',
 daily:[{date:'2026-11-10',metrics:{views:5000,profileViews:120},asOf:'2026-11-12T11:00:00Z'},
 {date:'2026-11-11',metrics:{views:7000,profileViews:130},asOf:'2026-11-12T12:00:00Z'}]}],
 ['snapshot',{schema:1,source:'Existing sources',platforms:{
 yt:{daily:[{d:'2026-11-11',views:123}],videos:[]},
 ig:{daily:[{d:'2026-11-11',views:456}],videos:[]},
 tt:{daily:[{d:'2026-11-11',follows:15}],videos:[{id:'stored',views:100}],profile:{followers:4777}}}}]
]);
const db={prepare(sql){
 let args=[];
 return {bind(...params){args=params;return this},
  async first(){
   if(sql.startsWith('SELECT value FROM back2u_store')){
    const value=storage.get(args[0]);return value===undefined?null:{value:JSON.stringify(value)};
   }
   if(sql.includes('FROM back2u_guest_links')&&args[0]===guestId)
    return {id:guestId,expires_at:guestExpiry,revoked_at:null};
   return null;
  },
  async run(){throw Error('Unexpected SQL mutation')}
 };
}};
const env={DB:db,SESSION_SECRET:secret,DASHBOARD_PASSWORD:'local-test-no-login',BACK2U_TIKTOK_DAILY_ENABLE:'false'};
async function sign(payload){
 const key=await crypto.subtle.importKey('raw',enc.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);
 return Buffer.from(await crypto.subtle.sign('HMAC',key,enc.encode(payload))).toString('base64url');
}
async function makeCookie(role){
 if(role==='anonymous')return '';
 const claim=role==='admin'?{v:1,e:Math.floor(Date.now()/1000)+3600}:{v:2,id:guestId,e:guestExpiry};
 const raw=Buffer.from(JSON.stringify(claim)).toString('base64url');
 return (role==='admin'?'back2u_session_cf':'back2u_guest_cf')+'='+raw+'.'+await sign(raw);
}
async function call(path,{role='anonymous',method='GET',headers={},body}={}){
 const cookie=await makeCookie(role);
 const req=new Request(base+path,{method,headers:{...headers,...(cookie?{cookie}:{})},body});
 const res=await worker.fetch(req,env,{});
 return {status:res.status,data:await res.json()};
}
let n=0;
async function test(label,fn){await fn();n++;console.log('OK '+label)}

await test('anonymous user cannot inspect TikTok daily data',async()=>{
 assert.equal((await call('/api/tiktok-daily/status')).status,401);
});
await test('anonymous user cannot trigger TikTok daily import',async()=>{
 assert.equal((await call('/api/tiktok-daily/sync',{method:'POST'})).status,401);
});
await test('guest can view aggregated TikTok data through existing snapshot',async()=>{
 const res=await call('/api/snapshot',{role:'guest'});
 assert.equal(res.status,200);
 const p=res.data.platforms;
 assert.equal(p.tt.daily.find(r=>r.d==='2026-11-11').views,7000);
 assert.equal(p.tt.daily.find(r=>r.d==='2026-11-11').follows,15);
 assert.equal(p.tt.profile.followers,4777);
 assert.equal(p.yt.daily[0].views,123);
 assert.equal(p.ig.daily[0].views,456);
});
await test('guest cannot inspect owner-only sync status',async()=>{
 assert.equal((await call('/api/tiktok-daily/status',{role:'guest'})).status,403);
});
await test('guest cannot force source synchronization',async()=>{
 assert.equal((await call('/api/tiktok-daily/sync',{role:'guest',method:'POST'})).status,403);
});
await test('owner can read status and coverage without secrets',async()=>{
 const r=await call('/api/tiktok-daily/status',{role:'admin'});
 assert.equal(r.status,200);
 assert.equal(r.data.enabled,false);
 assert.equal(r.data.coverage.totalStoredDays,2);
 assert.equal(JSON.stringify(r.data).includes(secret),false);
});
await test('owner cannot POST a GET-only status route',async()=>{
 assert.equal((await call('/api/tiktok-daily/status',{role:'admin',method:'POST'})).status,405);
});
await test('owner cannot GET a POST-only synchronization route',async()=>{
 assert.equal((await call('/api/tiktok-daily/sync',{role:'admin'})).status,405);
});
await test('cross-origin sync request blocked before accessing Windsor',async()=>{
 const r=await call('/api/tiktok-daily/sync',{role:'admin',method:'POST',
  headers:{origin:'https://evil.example','content-type':'application/json'},body:'{}'});
 assert.equal(r.status,403);
});
await test('cross-site fetch metadata blocked',async()=>{
 const r=await call('/api/tiktok-daily/sync',{role:'admin',method:'POST',
  headers:{'sec-fetch-site':'cross-site','content-type':'application/json'},body:'{}'});
 assert.equal(r.status,403);
});
await test('non-JSON manual sync blocked',async()=>{
 const r=await call('/api/tiktok-daily/sync',{role:'admin',method:'POST',
  headers:{'content-type':'text/plain'},body:'{}'});
 assert.equal(r.status,403);
});
await test('missing private source key fails closed',async()=>{
 const before=JSON.stringify(storage.get('tt_daily_v1'));
 const r=await call('/api/tiktok-daily/sync',{role:'admin',method:'POST',
  headers:{origin:base,'content-type':'application/json'},body:'{}'});
 assert.equal(r.status,503);
 assert.equal(r.data.status,'not_configured');
 assert.equal(JSON.stringify(storage.get('tt_daily_v1')),before);
 assert.equal(storage.has('tt_daily_sync_status'),false);
});
console.log('BACK2U V7.8 worker authorization tests passed: '+n+'/'+n);
