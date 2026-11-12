import assert from 'node:assert/strict';
import {validateTikTokDailyRows,mergeTikTokDaily,overlayTikTokDaily,
 tiktokDailyCoverage,runTikTokDailySync} from '../cloudflare/tiktok-daily.js';

const NOW=Date.parse('2026-11-12T22:30:00Z');
const TT='_000Gn_3riaTBVXEHqk1YfrwMWPK3cJcFkGv';
const day=n=>new Date(Date.parse('2026-11-12T00:00:00Z')-n*86400000).toISOString().slice(0,10);
const source=(n,rest={})=>({account_id:TT,date:day(n),video_views:6000+n,
 profile_views:90+n,daily_total_followers_count:4500-n,...rest});
const rows=Array.from({length:28},(_,i)=>source(i+1)).concat(source(0,{video_views:null,profile_views:null}));
let n=0;
const check=(label,fn)=>{fn();n++;console.log('OK '+label)};
const asyncCheck=async(label,fn)=>{await fn();n++;console.log('OK '+label)};
const valid=validateTikTokDailyRows(rows,NOW);
check('correct TikTok account',()=>assert.equal(valid.accountId,TT));
check('28 completed days only',()=>assert.equal(valid.daily.length,28));
check('unfinished today excluded',()=>assert.equal(valid.daily.some(r=>r.date===day(0)),false));
check('chronological ordering',()=>assert.deepEqual([valid.daily[0].date,valid.daily.at(-1).date],[day(28),day(1)]));
check('foreign account rejected',()=>assert.throws(()=>validateTikTokDailyRows(rows.map(r=>({...r,account_id:'bad'})),NOW)));
check('duplicate date rejected',()=>assert.throws(()=>validateTikTokDailyRows([...rows,rows[0]],NOW)));
check('future date rejected',()=>assert.throws(()=>validateTikTokDailyRows(rows.map((r,i)=>i? r:{...r,date:'2026-11-13'}),NOW)));
check('impossible calendar day rejected',()=>assert.throws(()=>validateTikTokDailyRows(rows.map((r,i)=>i? r:{...r,date:'2026-02-30'}),NOW)));
check('negative views rejected',()=>assert.throws(()=>validateTikTokDailyRows(rows.map((r,i)=>i? r:{...r,video_views:-1}),NOW)));
check('fractional follower count rejected',()=>assert.throws(()=>validateTikTokDailyRows(rows.map((r,i)=>i? r:{...r,daily_total_followers_count:4.5}),NOW)));
check('totally missing day metrics rejected',()=>assert.throws(()=>validateTikTokDailyRows(rows.map(r=>({...r,video_views:null,profile_views:null})),NOW)));
check('zero is valid',()=>assert.equal(validateTikTokDailyRows(rows.map((r,i)=>i? r:{...r,video_views:0}),NOW).daily.at(-1).metrics.views,0));
check('missing stays missing, not zero',()=>{
 const modified=validateTikTokDailyRows(rows.map((r,i)=>i? r:{...r,profile_views:null}),NOW);
 assert.equal(Object.hasOwn(modified.daily.at(-1).metrics,'profileViews'),false);
});
const stored=mergeTikTokDaily(null,valid,NOW);
check('28-day completeness verified',()=>assert.equal(tiktokDailyCoverage(stored,NOW).windows['28'].complete,true));
check('90-day history not invented',()=>assert.equal(tiktokDailyCoverage(stored,NOW).windows['90'].complete,false));
check('repeated sync idempotent',()=>assert.equal(mergeTikTokDaily(stored,valid,NOW).daily.length,28));
check('updates one day without losing other metrics',()=>{
 const next={...valid,daily:[{date:day(1),metrics:{views:333}}]};
 const result=mergeTikTokDaily(stored,next,NOW);
 assert.equal(result.daily.at(-1).metrics.views,333);
 assert.equal(result.daily.at(-1).metrics.profileViews,91);
});
check('old report cannot downgrade newer values',()=>{
 const older={...valid,snapshotDate:day(1),daily:[{date:day(2),metrics:{views:1}}]};
 assert.equal(mergeTikTokDaily(stored,older,NOW).daily.find(r=>r.date===day(2)).metrics.views,6002);
});
check('older accumulated days survive 28-day API window',()=>{
 const archive={...stored,daily:[{date:day(70),metrics:{views:5}},...stored.daily]};
 assert.equal(mergeTikTokDaily(archive,valid,NOW).daily.length,29);
});
check('400-day retention cap enforced',()=>{
 const archive={...stored,daily:[{date:day(410),metrics:{views:5}},...stored.daily]};
 assert.equal(mergeTikTokDaily(archive,valid,NOW).daily.length,28);
});
const snapshot={platforms:{yt:{daily:[{d:day(1),views:100}]},
 ig:{daily:[{d:day(1),views:200}]},
 tt:{daily:[{d:day(1),follows:12,likes:44}],videos:[{id:'old',views:99}],profile:{followers:4777}}}};
overlayTikTokDaily(snapshot,stored);
check('YouTube and Instagram untouched',()=>assert.deepEqual([snapshot.platforms.yt.daily[0].views,snapshot.platforms.ig.daily[0].views],[100,200]));
check('TikTok video and OAuth follower untouched',()=>assert.deepEqual([snapshot.platforms.tt.videos[0].views,snapshot.platforms.tt.profile.followers],[99,4777]));
check('archive net-follows and likes preserved',()=>{
 const r=snapshot.platforms.tt.daily.at(-1);
 assert.deepEqual([r.follows,r.likes,r.views,r.profileViews],[12,44,6001,91]);
});
check('source information is recorded per metric',()=>assert.ok(snapshot.platforms.tt.daily.at(-1).sourceFields.views.includes('Windsor')));
const local=()=>{
 const d=new Map();
 return {get:async(_,key)=>d.get(key)||null,put:async(_,key,value)=>{d.set(key,value)},d};
};
const env={WINDSOR_API_KEY:'unit-test-placeholder-secret-123'};
const network=async uri=>{
 const u=new URL(uri);
 assert.equal(u.hostname,'connectors.windsor.ai');
 assert.equal(u.searchParams.get('select_accounts'),TT);
 assert.equal(u.searchParams.get('date_preset'),'last_28d');
 return {ok:true,status:200,json:async()=>rows};
};
await asyncCheck('mock authenticated import writes private history',async()=>{
 const s=local(),r=await runTikTokDailySync(env,{...s,fetcher:network,force:true,now:NOW});
 assert.equal(r.status,'ok');
 assert.equal(s.d.get('tt_daily_v1').daily.length,28);
});
await asyncCheck('cooldown avoids duplicate API requests',async()=>{
 const s=local();await runTikTokDailySync(env,{...s,fetcher:network,force:true,now:NOW});
 const r=await runTikTokDailySync(env,{...s,fetcher:async()=>{throw Error('must not call')},now:NOW+60000});
 assert.equal(r.status,'skipped');
});
await asyncCheck('network failure does not erase previously verified rows',async()=>{
 const s=local();await runTikTokDailySync(env,{...s,fetcher:network,force:true,now:NOW});
 const old=JSON.stringify(s.d.get('tt_daily_v1'));
 const result=await runTikTokDailySync(env,{...s,force:true,now:NOW+86400000,
  fetcher:async()=>{throw Error('timeout')}});
 assert.equal(result.status,'error');
 assert.equal(JSON.stringify(s.d.get('tt_daily_v1')),old);
});
await asyncCheck('wrong account response cannot overwrite old rows',async()=>{
 const s=local();await runTikTokDailySync(env,{...s,fetcher:network,force:true,now:NOW});
 const old=JSON.stringify(s.d.get('tt_daily_v1'));
 const result=await runTikTokDailySync(env,{...s,force:true,now:NOW+86400000,
  fetcher:async()=>({ok:true,status:200,json:async()=>rows.map(x=>({...x,account_id:'bad'}))})});
 assert.equal(result.status,'error');
 assert.equal(JSON.stringify(s.d.get('tt_daily_v1')),old);
});
await asyncCheck('secret missing fails closed',async()=>{
 const s=local(),r=await runTikTokDailySync({},{...s,now:NOW,
  fetcher:async()=>{throw Error('unexpected request')}});
 assert.equal(r.status,'not_configured');
 assert.equal(s.d.size,0);
});
await asyncCheck('error output does not leak API tokens',async()=>{
 const s=local(),r=await runTikTokDailySync(env,{...s,force:true,now:NOW,
  fetcher:async()=>{throw Error('https://example.org/?api_key=SENSITIVE')}});
 assert.equal(r.status,'error');
 assert.equal(JSON.stringify(r).includes('SENSITIVE'),false);
});
console.log('BACK2U V7.8 TikTok daily tests passed: '+n+'/'+n);
