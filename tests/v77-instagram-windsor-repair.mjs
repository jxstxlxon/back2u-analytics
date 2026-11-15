import assert from 'node:assert/strict';
import {
 validateInstagramWindsorDaily,mergeInstagramWindsorDaily,
 overlayInstagramWindsorDaily,runInstagramWindsorDailySync,
 instagramWindsorDailyStatus
} from '../cloudflare/instagram-daily-repair.js';
const now=Date.parse('2026-11-15T01:15:00Z');
const fixture=[
 ['2026-11-10',6822,4235,605,8,18],
 ['2026-11-11',5918,3795,734,11,26],
 ['2026-11-12',7661,4795,972,15,34],
 ['2026-11-13',9441,6385,1111,10,45],
 ['2026-11-14',7444,4664,713,7,0]
].map(([date,views,reach,likes,comments,follower_count_1d])=>
 ({date,views,reach,likes,comments,follower_count_1d,account_id:'27282542318110290'}));
let passed=0;function check(label,fn){fn();passed++;console.log('OK '+label)}
async function checkAsync(label,fn){await fn();passed++;console.log('OK '+label)}
const makeDb=()=>{const m=new Map();return{m,get:async(_,key)=>m.get(key)||null,put:async(_,key,value)=>{m.set(key,value)}}};
check('fresh Windsor data verifies real 2026-11-14 Instagram account-day totals',()=>{
 const daily=validateInstagramWindsorDaily(fixture,now);
 assert.equal(daily.at(-1).d,'2026-11-14');
 assert.equal(daily.at(-1).views,7444);
 assert.equal(daily.at(-1).reach,4664);
 assert.equal(daily.at(-1).follows,0);
});
check('wrong source account rejected',()=>{
 assert.throws(()=>validateInstagramWindsorDaily(fixture.map(x=>({...x,account_id:'other'})),now),/Konto/);
});
check('today or future rows rejected to avoid incomplete totals',()=>{
 assert.throws(()=>validateInstagramWindsorDaily([...fixture,{...fixture[0],date:'2026-11-15'}],now),/Datum/);
});
check('duplicate dates are rejected',()=>{
 assert.throws(()=>validateInstagramWindsorDaily([...fixture,fixture[0]],now),/Datum/);
});
check('invalid/missing metrics cannot masquerade as zeros',()=>{
 assert.throws(()=>validateInstagramWindsorDaily(fixture.map(x=>({...x,reach:null})),now),/fehlen/);
 assert.throws(()=>validateInstagramWindsorDaily(fixture.map(x=>({...x,views:'broken'})),now),/Messwert/);
});
check('28 verified completed Instagram days are accepted without inventing dates',()=>{
 const days=Array.from({length:28},(_,i)=>{
  const d=new Date(Date.parse('2026-10-18T00:00:00Z')+i*86400000).toISOString().slice(0,10);
  return{date:d,account_id:'27282542318110290',views:4735+i,
   reach:3250+i,likes:337+i,comments:6,saves:26,shares:24,
   total_interactions:451+i,accounts_engaged:321+i};
 });
 const result=validateInstagramWindsorDaily(days,now);
 assert.equal(result.length,28);
 assert.equal(result[0].d,'2026-10-18');
 assert.equal(result.at(-1).d,'2026-11-14');
 assert.equal(result[0].saves,26);
});
check('real Instagram Saves, Shares, Interactions and Accounts Engaged pass through unchanged',()=>{
 const fixtureExtended=fixture.map(x=>({...x,saves:55,shares:60,total_interactions:1060,accounts_engaged:700}));
 const verified=validateInstagramWindsorDaily(fixtureExtended,now);
 assert.ok(verified.every(x=>x.saves===55&&x.shares===60&&x.interactions===1060&&x.engagedAccounts===700));
 const snapshot={platforms:{ig:{daily:[]}}};
 overlayInstagramWindsorDaily(snapshot,mergeInstagramWindsorDaily(null,verified,now));
 assert.equal(snapshot.platforms.ig.daily[0].shares,60);
 assert.equal(snapshot.platforms.ig.daily[0].sourceFields.interactions,'Windsor.ai Instagram Insights (account-day)');
});
check('28-day reimport fills Saves/Shares/Engaged Accounts without losing prior optional values',()=>{
 const previous={schema:1,daily:[{d:'2026-11-10',views:1000,reach:950,saves:17,shares:3}]};
 const rows=Array.from({length:28},(_,i)=>({
  date:new Date(Date.parse('2026-10-18T00:00:00Z')+i*86400000).toISOString().slice(0,10),
  account_id:'27282542318110290',views:4735+i,reach:3250+i,
  likes:337+i,comments:6,saves:i===23?undefined:26+i,
  shares:24+i,total_interactions:451+i,accounts_engaged:321+i
 }));
 const combined=mergeInstagramWindsorDaily(previous,validateInstagramWindsorDaily(rows,now),now);
 assert.equal(combined.daily.length,28);
 assert.equal(combined.daily[0].d,'2026-10-18');
 assert.equal(combined.daily.at(-1).d,'2026-11-14');
 assert.equal(combined.daily.find(x=>x.d==='2026-11-10').saves,17);
 assert.equal(combined.daily.at(-1).engagedAccounts,348);
});
check('saved historical days remain preserved when new days are added',()=>{
 const old={schema:1,daily:[{d:'2026-11-01',views:99,reach:90}]};
 const next=mergeInstagramWindsorDaily(old,validateInstagramWindsorDaily(fixture,now),now);
 assert.equal(next.daily[0].d,'2026-11-01');
 assert.equal(next.daily.at(-1).d,'2026-11-14');
 assert.equal(next.daily.length,6);
});
check('dashboard displays new days without touching videos or YouTube',()=>{
 const snapshot={platforms:{yt:{videos:[{id:'Y'}]},ig:{
  videos:[{id:'I',views:42}],daily:[{d:'2026-11-11',views:10,reach:10}]
 }}};
 const oldYt=JSON.stringify(snapshot.platforms.yt),oldVids=JSON.stringify(snapshot.platforms.ig.videos);
 const record=mergeInstagramWindsorDaily(null,validateInstagramWindsorDaily(fixture,now),now);
 overlayInstagramWindsorDaily(snapshot,record);
 assert.equal(snapshot.platforms.ig.daily.at(-1).d,'2026-11-14');
 assert.equal(snapshot.platforms.ig.daily.at(-1).views,7444);
 assert.equal(snapshot.platforms.ig.daily.find(x=>x.d==='2026-11-11').views,5918);
 assert.equal(JSON.stringify(snapshot.platforms.yt),oldYt);
 assert.equal(JSON.stringify(snapshot.platforms.ig.videos),oldVids);
});
await checkAsync('one existing Cloudflare cron run imports real days without changing snapshot',async()=>{
 const db=makeDb(),calls=[];
 const fetcher=async url=>{calls.push(new URL(url));return{ok:true,json:async()=>fixture}};
 const env={WINDSOR_API_KEY:'test_private_secret_at_least_16'};
 const result=await runInstagramWindsorDailySync(env,{...db,fetcher,now});
 assert.equal(result.status,'ok');
 assert.equal(result.dataThrough,'2026-11-14');
 assert.equal(db.m.has('snapshot'),false);
 assert.equal(db.m.get('ig_windsor_daily_v1').daily.length,5);
 assert.equal(calls.length,1);
 assert.equal(calls[0].pathname,'/instagram');
 assert.equal(calls[0].searchParams.get('select_accounts'),'17841476673616735');
 assert.equal(calls[0].searchParams.get('date_from'),'2026-10-18');
 assert.equal(calls[0].searchParams.get('date_to'),'2026-11-14');
 assert.equal(calls[0].searchParams.get('fields'),'date,views,reach,likes,comments,follower_count_1d,saves,shares,total_interactions,accounts_engaged,account_id');
 const duplicate=await runInstagramWindsorDailySync(env,{...db,fetcher,now:now+30*60000});
 assert.equal(duplicate.status,'skipped');
 assert.equal(calls.length,1);
});
await checkAsync('schema upgrade forces exactly one new import despite old successful six-hour throttle',async()=>{
 const db=makeDb(),urls=[];
 const env={WINDSOR_API_KEY:'test_private_secret_at_least_16'};
 db.m.set('ig_windsor_daily_sync_v1',{
  status:'ok',pipelineVersion:'v77.10-full-28day-instagram-extras',
  lastAttemptAt:new Date(now).toISOString(),lastSuccessAt:new Date(now).toISOString()
 });
 const result=await runInstagramWindsorDailySync(env,{...db,now,
  fetcher:async url=>{urls.push(url);return{ok:true,json:async()=>fixture}}
 });
 assert.equal(result.status,'ok');
 assert.equal(result.pipelineVersion,'v77.14-retry-full-instagram-extras');
 assert.equal(urls.length,1);
 const again=await runInstagramWindsorDailySync(env,{...db,now:now+60000,
  fetcher:()=>{throw Error('should have been throttled')}
 });
 assert.equal(again.status,'skipped');
});
await checkAsync('upstream failure never clears last successful report',async()=>{
 const db=makeDb(),env={WINDSOR_API_KEY:'test_private_secret_at_least_16'};
 await runInstagramWindsorDailySync(env,{...db,fetcher:async()=>({ok:true,json:async()=>fixture}),now});
 const oldReport=JSON.stringify(db.m.get('ig_windsor_daily_v1'));
 const r=await runInstagramWindsorDailySync(env,{...db,fetcher:async()=>({ok:false,status:500}),now:now+24*3600000});
 assert.equal(r.status,'error');
 assert.equal(JSON.stringify(db.m.get('ig_windsor_daily_v1')),oldReport);
});
await checkAsync('no secret means no network requests or database writes',async()=>{
 const db=makeDb(),fetcher=()=>{throw Error('Network called with no secret')};
 const r=await runInstagramWindsorDailySync({}, {...db,fetcher,now});
 assert.equal(r.status,'not_configured');
 assert.equal(db.m.size,0);
});
await checkAsync('admin diagnostics disclose no private credentials',async()=>{
 const db=makeDb(),secret='private_dummy_token_very_long';
 db.m.set('snapshot',{platforms:{ig:{daily:[{d:'2026-11-11'}]}}});
 const result=await instagramWindsorDailyStatus({WINDSOR_API_KEY:secret},{get:db.get});
 assert.equal(result.snapshotDataThrough,'2026-11-11');
 assert.equal(result.configured,true);
 assert.ok(!JSON.stringify(result).includes(secret));
});
console.log('BACK2U Instagram Daily Cron Repair: '+passed+'/'+passed+' passed');
