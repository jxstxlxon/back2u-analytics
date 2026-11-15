import assert from 'node:assert/strict';
import {
 validateYouTubeWindsorExtras,combineYouTubeWindsorExtras,
 overlayYouTubeWindsorExtras,runYouTubeWindsorExtrasSync,
 youtubeWindsorExtrasStatus
} from '../cloudflare/youtube-windsor-extras.js';

const NOW=Date.parse('2026-11-15T02:20:00Z');
const CHANNEL='UCBnnaMohI_VfKihekEwaQEw';
const fixture=[
 {date:'2026-11-10',account_id:CHANNEL,engaged_views:27143,
  estimated_minutes_watched:9169,average_view_duration:20.2682,shares:60},
 {date:'2026-11-11',account_id:CHANNEL,engaged_views:28056,
  estimated_minutes_watched:9327,average_view_duration:19.9465,shares:52},
 {date:'2026-11-12',account_id:CHANNEL,engaged_views:25720,
  estimated_minutes_watched:8654,average_view_duration:20.1882,shares:46}
];
let pass=0;const test=(label,fn)=>{fn();pass++;console.log('OK '+label)};
const testAsync=async(label,fn)=>{await fn();pass++;console.log('OK '+label)};
function db(){const m=new Map();return{m,get:async(_,k)=>m.get(k)||null,put:async(_,k,v)=>m.set(k,v)}}
test('uses verified actual channel-day engaged views and watch minutes',()=>{
 const rows=validateYouTubeWindsorExtras(fixture,NOW);
 assert.deepEqual(rows.map(x=>x.engagedViews),[27143,28056,25720]);
 assert.equal(rows[0].watchMinutes,9169);
 assert.equal(rows[0].averageViewSeconds,20.2682);
 assert.equal(rows[0].shares,60);
});
test('wrong channel / future report date rejected',()=>{
 assert.throws(()=>validateYouTubeWindsorExtras(fixture.map(x=>({...x,account_id:'another'})),NOW),/account/);
 assert.throws(()=>validateYouTubeWindsorExtras([...fixture,{...fixture[0],date:'2026-11-15'}],NOW),/date/);
});
test('missing metrics are unknown, never zero',()=>{
 const rows=validateYouTubeWindsorExtras(fixture.map(x=>({...x,shares:null,engaged_views:null})),NOW);
 assert.ok(rows.every(x=>!Object.hasOwn(x,'shares')&&!Object.hasOwn(x,'engagedViews')));
});
test('26 verified YouTube days inside a 28-day window retain real metrics',()=>{
 const rows=Array.from({length:26},(_,i)=>({
  date:new Date(Date.parse('2026-10-18T00:00:00Z')+i*86400000).toISOString().slice(0,10),
  account_id:CHANNEL,engaged_views:7982+i,
  estimated_minutes_watched:2388+i,
  average_view_duration:17.9504,shares:5
 }));
 const parsed=validateYouTubeWindsorExtras(rows,NOW);
 assert.equal(parsed.length,26);
 assert.equal(parsed[0].d,'2026-10-18');
 assert.equal(parsed.at(-1).d,'2026-11-12');
});
test('prior date history preserved',()=>{
 const old={schema:1,daily:[{d:'2026-11-01',engagedViews:111}]};
 const next=combineYouTubeWindsorExtras(old,validateYouTubeWindsorExtras(fixture,NOW),NOW);
 assert.equal(next.daily.length,4);assert.equal(next.daily.at(-1).d,'2026-11-12');
});
test('only missing channel-day metrics added; official YouTube Analytics values win',()=>{
 const snapshot={platforms:{yt:{daily:[{d:'2026-11-10',shares:67,source:'YouTube Analytics API'}],
  profile:{subscribers:8000},videos:[{id:'v',views:50}]},ig:{daily:[{d:'2026-11-10',views:2000}]}}};
 const beforeIG=JSON.stringify(snapshot.platforms.ig),beforeVideos=JSON.stringify(snapshot.platforms.yt.videos);
 const record=combineYouTubeWindsorExtras(null,validateYouTubeWindsorExtras(fixture,NOW),NOW);
 overlayYouTubeWindsorExtras(snapshot,record);
 const first=snapshot.platforms.yt.daily.find(x=>x.d==='2026-11-10');
 assert.equal(first.shares,67);assert.equal(first.engagedViews,27143);
 assert.equal(first.sourceFields.engagedViews,'Windsor.ai YouTube Analytics (account-day)');
 assert.equal(snapshot.platforms.yt.daily.at(-1).d,'2026-11-12');
 assert.equal(JSON.stringify(snapshot.platforms.ig),beforeIG);
 assert.equal(JSON.stringify(snapshot.platforms.yt.videos),beforeVideos);
});
await testAsync('Cron fetch stores separately without updating snapshot or existing secrets',async()=>{
 const d=db(),urls=[],secret='TEST_PRIVATE_SECRET_32CHARACTERS_ABCDEFG';
 const fetcher=async uri=>{urls.push(new URL(uri));return{ok:true,json:async()=>fixture}};
 const env={WINDSOR_API_KEY:secret};
 const res=await runYouTubeWindsorExtrasSync(env,{...d,fetcher,now:NOW});
 assert.equal(res.status,'ok');assert.equal(res.dataThrough,'2026-11-12');
 assert.equal(d.m.has('snapshot'),false);
 assert.equal(d.m.get('yt_windsor_extras_v1').daily.length,3);
 assert.equal(urls.length,1);
 assert.equal(urls[0].pathname,'/youtube');
 assert.equal(urls[0].searchParams.get('date_to'),'2026-11-14');
 assert.equal(urls[0].searchParams.get('date_from'),'2026-10-18');
 assert.equal(urls[0].searchParams.get('select_accounts'),CHANNEL);
 assert.ok(!JSON.stringify(res).includes(secret));
});
await testAsync('API error does not clear previous verified data',async()=>{
 const d=db(),env={WINDSOR_API_KEY:'TEST_PRIVATE_SECRET_32CHARACTERS_ABCDEFG'};
 await runYouTubeWindsorExtrasSync(env,{...d,now:NOW,fetcher:async()=>({ok:true,json:async()=>fixture})});
 const old=JSON.stringify(d.m.get('yt_windsor_extras_v1'));
 const fail=await runYouTubeWindsorExtrasSync(env,{...d,now:NOW+86400000,fetcher:async()=>({ok:false,status:503})});
 assert.equal(fail.status,'error');assert.equal(JSON.stringify(d.m.get('yt_windsor_extras_v1')),old);
});
await testAsync('missing secret does not access external network or database',async()=>{
 const d=db();const result=await runYouTubeWindsorExtrasSync({},{
  ...d,now:NOW,fetcher:()=>{throw Error('must not fetch')}
 });
 assert.equal(result.status,'not_configured');assert.equal(d.m.size,0);
});
await testAsync('read-only status reveals no credentials',async()=>{
 const d=db(),secret='TEST_PRIVATE_SECRET_32CHARACTERS_ABCDEFG';
 const result=await youtubeWindsorExtrasStatus({WINDSOR_API_KEY:secret},{get:d.get});
 assert.equal(result.configured,true);assert.ok(!JSON.stringify(result).includes(secret));
});
console.log('BACK2U YouTube verified daily extras '+pass+'/'+pass+' tests passed');
