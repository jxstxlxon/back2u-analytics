import assert from 'node:assert/strict';
import {
 validateTikTokOrganicDays,validateTikTokOrganicMedia,
 combineTikTokOrganicState,overlayTikTokOrganicState,
 runTikTokOrganicSync,tiktokOrganicStatus
} from '../cloudflare/tiktok-windsor-repair.js';

const NOW=Date.parse('2026-11-15T01:50:00Z');
const ACCOUNT='_000Gn_3riaTBVXEHqk1YfrwMWPK3cJcFkGv';
const USER='back2u.mp3';
const rows=Array.from({length:7},(_,i)=>({
 date:'2026-11-'+String(9+i).padStart(2,'0'),account_id:ACCOUNT,username:USER,
 video_views:i>=5?0:8500+i*250,likes:i>=5?0:600+i*7,
 comments:i>=5?0:45+i*3,shares:i>=5?0:20+i,
 followers_count:i>=5?0:10+i,
 total_followers_count:i===6?4900:i===5?0:4800+i*15
}));
const videos=Array.from({length:7},(_,i)=>({
 date:'2026-11-'+String(12+Math.floor(i/3)).padStart(2,'0'),
 account_id:ACCOUNT,username:USER,video_id:String(7700000000000000000n+BigInt(i)),
 video_views_count:300+i*50,video_likes:33+i,video_comments:i,
 video_caption:'Jumpstyle demo '+i,
 video_create_datetime:'2026-11-14T12:00:00'
}));
const data=()=>({
 days:validateTikTokOrganicDays(rows,NOW),
 media:validateTikTokOrganicMedia(videos,NOW)
});
let passed=0;const test=(name,fn)=>{fn();passed++;console.log('OK '+name)};
const testAsync=async(name,fn)=>{await fn();passed++;console.log('OK '+name)};
const db=()=>{
 const m=new Map();return{m,get:async(_,key)=>m.get(key)||null,put:async(_,key,value)=>{m.set(key,value)}};
};

test('verified day values are read from TikTok account metrics',()=>{
 const result=validateTikTokOrganicDays(rows,NOW);
 assert.equal(result.daily[0].d,'2026-11-09');
 assert.equal(result.daily[0].views,8500);
 assert.equal(result.daily.at(-1).d,'2026-11-13');
 assert.equal(result.daily.length,5);
});
test('all-zero newest days are missing rather than confirmed zero',()=>{
 const x=validateTikTokOrganicDays(rows,NOW);
 assert.ok(x.daily.every(r=>r.d!=='2026-11-14'&&r.d!=='2026-11-15'));
 assert.equal(x.profile.followers,4900);
 assert.equal(x.profile.date,'2026-11-15');
});
test('fake account or username rejected',()=>{
 assert.throws(()=>validateTikTokOrganicDays(rows.map(x=>({...x,account_id:'other'})),NOW),/Konto/);
 assert.throws(()=>validateTikTokOrganicMedia(videos.map(x=>({...x,username:'other'})),NOW),/verifiziert/);
});
test('identical duplicated completed dates never abort the full report',()=>{
 const result=validateTikTokOrganicDays([...rows,rows[0]],NOW);
 assert.equal(result.daily.length,5);
 assert.equal(result.daily[0].d,'2026-11-09');
});
test('conflicting duplicate date does not fabricate a daily count',()=>{
 const contradictory={...rows[0],video_views:123456};
 const result=validateTikTokOrganicDays([...rows,contradictory],NOW);
 assert.ok(!result.daily.some(x=>x.d==='2026-11-09'));
 assert.equal(result.daily.at(-1).d,'2026-11-13');
});
test('duplicate NULL-filled today records are ignored rather than aborting all days',()=>{
 const duplicate={...rows.at(-1),video_views:null,likes:null,comments:null,
  shares:null,followers_count:null,total_followers_count:4837};
 const result=validateTikTokOrganicDays([...rows,duplicate,duplicate],NOW);
 assert.equal(result.daily.length,5);
 assert.equal(result.daily.at(-1).d,'2026-11-13');
 assert.equal(result.profile.followers,4837);
});
test('missing view counts cannot be replaced with null or invented zero',()=>{
 assert.throws(()=>validateTikTokOrganicDays(rows.map(x=>({...x,video_views:null})),NOW),/fehlen|zu wenig bestätigte Tage/);
});
test('recent TikTok video IDs stay literal strings and lifetime views are not daily',()=>{
 const output=validateTikTokOrganicMedia(videos,NOW);
 assert.equal(output.length,7);
 assert.ok(output.every(x=>x.url.includes('/@back2u.mp3/video/')&&x.reportType==='lifetime'));
 assert.equal(output[0].views,300);
});
test('independent new data preserves prior historical verified days and media',()=>{
 const previous={schema:1,daily:[{d:'2026-10-22',views:151}],videos:[{
  id:'7650000000000000001',date:'2026-10-22',views:100,platform:'tt'
 }]};
 const next=combineTikTokOrganicState(previous,data(),NOW);
 assert.equal(next.daily[0].d,'2026-10-22');
 assert.ok(next.videos.some(x=>x.id==='7650000000000000001'));
 assert.equal(next.videos.length,8);
});
test('overlay adds missing videos and days but protects official TikTok video values',()=>{
 const officialId=videos[0].video_id;
 const snapshot={platforms:{ig:{profile:{followers:123}},yt:{profile:{subscribers:10}},
  tt:{daily:[],videos:[{id:officialId,source:'Official TikTok Display API',views:999,platform:'tt'}],
   profile:{followers:4790}}}};
 const ig=JSON.stringify(snapshot.platforms.ig),yt=JSON.stringify(snapshot.platforms.yt);
 const merged=combineTikTokOrganicState(null,data(),NOW);
 overlayTikTokOrganicState(snapshot,merged,{updatedAt:'2026-11-11T12:00:00Z',followers:4790,openId:'oauth'});
 assert.equal(snapshot.platforms.tt.daily.length,5);
 assert.equal(snapshot.platforms.tt.videos.length,7);
 assert.equal(snapshot.platforms.tt.videos.find(v=>v.id===officialId).views,999);
 assert.equal(snapshot.platforms.tt.profile.followers,4900);
 assert.equal(JSON.stringify(snapshot.platforms.ig),ig);
 assert.equal(JSON.stringify(snapshot.platforms.yt),yt);
});
test('same-day official TikTok follower number wins over Windsor',()=>{
 const snapshot={platforms:{tt:{daily:[],videos:[],profile:{followers:4950}}}};
 const merged=combineTikTokOrganicState(null,data(),NOW);
 overlayTikTokOrganicState(snapshot,merged,{updatedAt:'2026-11-15T01:10:00Z',followers:4950,openId:'oauth'});
 assert.equal(snapshot.platforms.tt.profile.followers,4950);
});
await testAsync('cron creates a separate D1 store and does not replace original snapshot',async()=>{
 const d=db(),calls=[];
 const fetcher=async url=>{
  const parsed=new URL(url);calls.push(parsed);
  const media=parsed.searchParams.get('fields').includes('video_id');
  return {ok:true,json:async()=>media?videos:rows};
 };
 const key='private_mock_windsor_key_ABCDEFGHIJKLMNOPQ';
 const env={WINDSOR_API_KEY:key};
 const r=await runTikTokOrganicSync(env,{...d,now:NOW,fetcher});
 assert.equal(r.status,'ok');
 assert.equal(d.m.has('snapshot'),false);
 assert.equal(d.m.get('tt_windsor_daily_v1').videos.length,0);
 assert.equal(calls.length,1);
 assert.equal(r.mediaStatus,'separate-oauth');
 assert.ok(calls.every(x=>x.pathname==='/tiktok_organic'&&x.searchParams.get('select_accounts')===ACCOUNT));
 const dailyQuery=calls.find(x=>x.searchParams.get('fields').includes('unique_video_views'));
 assert.equal(dailyQuery.searchParams.get('date_to'),'2026-11-14');
 assert.ok(dailyQuery.searchParams.get('fields').includes('engaged_audience'));
 assert.ok(dailyQuery.searchParams.get('fields').includes('daily_lost_followers'));
 const skip=await runTikTokOrganicSync(env,{...d,now:NOW+20*60000,fetcher});
 assert.equal(skip.status,'skipped');
 assert.equal(calls.length,1);
});
await testAsync('connection outage leaves previous successful TikTok data intact',async()=>{
 const d=db(),env={WINDSOR_API_KEY:'private_mock_windsor_key_ABCDEFGHIJKLMNOPQ'};
 await runTikTokOrganicSync(env,{...d,now:NOW,fetcher:async url=>({
  ok:true,json:async()=>url.includes('video_id')?videos:rows
 })});
 const prior=JSON.stringify(d.m.get('tt_windsor_daily_v1'));
 const fail=await runTikTokOrganicSync(env,{...d,now:NOW+86400000,fetcher:async()=>({
  ok:false,status:503
 })});
 assert.equal(fail.status,'error');
 assert.equal(JSON.stringify(d.m.get('tt_windsor_daily_v1')),prior);
});
await testAsync('missing Windsor secret does not make outbound requests or D1 changes',async()=>{
 const d=db();
 const result=await runTikTokOrganicSync({},{
  ...d,now:NOW,fetcher:()=>{throw Error('Fetch must not happen')}
 });
 assert.equal(result.status,'not_configured');
 assert.equal(d.m.size,0);
});
await testAsync('diagnostic reports missing credentials without revealing secrets',async()=>{
 const d=db();
 const x=await tiktokOrganicStatus({WINDSOR_API_KEY:'PRIVATE_PRIVATE_123456'},{get:d.get});
 assert.equal(x.configured,true);
 assert.ok(!JSON.stringify(x).includes('PRIVATE_PRIVATE_123456'));
});

test('today NULL values cannot break yesterday and older day imports',()=>{
 const mixed=rows.map(x=>x.date==='2026-11-15'?{...x,
  video_views:null,likes:null,comments:null,shares:null,followers_count:null,
  total_followers_count:4837}:x);
 const outcome=validateTikTokOrganicDays(mixed,NOW);
 assert.equal(outcome.daily.at(-1).d,'2026-11-13');
 assert.equal(outcome.daily.length,5);
 assert.equal(outcome.profile.date,'2026-11-15');
 assert.equal(outcome.profile.followers,4837);
});
test('TikTok extra source fields remain grounded in exact account-day values',()=>{
 const extra=rows.map(x=>({...x,
  engaged_audience:x.video_views?500:null,daily_lost_followers:x.video_views?4:null,
  daily_total_followers:x.video_views?12:null,bio_link_clicks:x.video_views?2:null}));
 const result=validateTikTokOrganicDays(extra,NOW);
 assert.equal(result.daily.length,5);
 assert.ok(result.daily.every(x=>x.engagedAudience===500&&x.lostFollowers===4&&
  x.netFollows===12&&x.bioLinkClicks===2));
});
test('daily reach and profile visits come only from verified actual account days',()=>{
 const extended=rows.map(x=>({...x,
  unique_video_views:x.video_views?Math.round(x.video_views*.71):null,
  profile_views:x.video_views?100:null}));
 const outcome=validateTikTokOrganicDays(extended,NOW);
 assert.ok(outcome.daily.every(x=>x.uniqueViews>0&&x.profileViews===100));
 assert.equal(outcome.daily.length,5);
});
test('yesterday NULL values are omitted without aborting older history',()=>{
 const patch=rows.map(x=>x.date==='2026-11-14'?{...x,video_views:null}:x);
 const output=validateTikTokOrganicDays(patch,NOW);
 assert.equal(output.daily.length,5);
 assert.equal(output.daily.at(-1).d,'2026-11-13');
});
await testAsync('media API outage still commits verified TikTok daily reports',async()=>{
 const store=db(),calls=[];
 const env={WINDSOR_API_KEY:'private_mock_windsor_key_ABCDEFGHIJKLMNOPQ'};
 const t=await runTikTokOrganicSync(env,{...store,now:NOW,fetcher:async url=>{
  const isMedia=new URL(url).searchParams.get('fields').includes('video_id');
  calls.push(isMedia?'media':'day');
  if(isMedia)throw Error('Simulated media API timeout');
  return{ok:true,json:async()=>rows};
 }});
 assert.equal(t.status,'ok');
 assert.equal(t.dayThrough,'2026-11-13');
 assert.equal(t.mediaStatus,'separate-oauth');
 assert.equal(store.m.get('tt_windsor_daily_v1').daily.length,5);
 assert.equal(store.m.get('tt_windsor_daily_v1').videos.length,0);
 assert.deepEqual(calls,['day']);
});

test('malformed out-of-period rows cannot block valid November account-days',()=>{
 const extra=[
  {...rows[0],date:'2026-09-01'},
  {...rows[0],date:'2026-11-99'},
  {...rows[0],date:'2026-11-09T00:00:00.000Z'}
 ];
 const result=validateTikTokOrganicDays([...rows,...extra],NOW);
 assert.equal(result.daily.length,5);
 assert.equal(result.daily.at(-1).d,'2026-11-13');
});
test('an invalid optional metric is missing, not a cause to discard valid daily views',()=>{
 const edited=rows.map(x=>x.date==='2026-11-11'?{...x,
  engaged_audience:'not available',bio_link_clicks:'n/a'}:x);
 const result=validateTikTokOrganicDays(edited,NOW);
 assert.equal(result.daily.length,5);
 const target=result.daily.find(x=>x.d==='2026-11-11');
 assert.ok(!Object.hasOwn(target,'engagedAudience'));
 assert.ok(!Object.hasOwn(target,'bioLinkClicks'));
 assert.ok(target.views>0);
});
test('negative net follows is a legitimate measured TikTok change',()=>{
 const edited=rows.map(x=>({...x,daily_total_followers:-3,followers_count:-1}));
 const result=validateTikTokOrganicDays(edited,NOW);
 assert.equal(result.daily.length,5);
 assert.ok(result.daily.every(x=>x.netFollows===-3&&x.follows===-1));
});
test('a single primary missing day does not discard other valid days',()=>{
 const edited=rows.map(x=>x.date==='2026-11-11'?{...x,video_views:'NaN'}:x);
 const result=validateTikTokOrganicDays(edited,NOW);
 assert.equal(result.daily.length,4);
 assert.ok(!result.daily.some(x=>x.d==='2026-11-11'));
 assert.equal(result.daily.at(-1).d,'2026-11-13');
});
await testAsync('new importer version retries once despite a recent failed old parser',async()=>{
 const d=db(),fetchCalls=[];
 const env={WINDSOR_API_KEY:'private_mock_windsor_key_ABCDEFGHIJKLMNOPQ'};
 d.m.set('tt_windsor_sync_v1',{status:'error',lastAttemptAt:new Date(NOW).toISOString(),
  error:'Ungültiger TikTok-Berichtstag'});
 const result=await runTikTokOrganicSync(env,{...d,now:NOW+1000,fetcher:async url=>{
  fetchCalls.push(url);
  return{ok:true,json:async()=>url.includes('video_id')?videos:rows};
 }});
 assert.equal(result.status,'ok');
 assert.equal(result.pipelineVersion,'v77.11-phase-isolated-daily');
 assert.equal(result.dayThrough,'2026-11-13');
 assert.equal(fetchCalls.length,1);
 const skip=await runTikTokOrganicSync(env,{...d,now:NOW+120000,
  fetcher:()=>{throw Error('must throttle same deployment')}});
 assert.equal(skip.status,'skipped');
});

await testAsync('stale running status after two minutes retries instead of staying stuck for 45 minutes',async()=>{
 const d=db(),env={WINDSOR_API_KEY:'private_mock_windsor_key_ABCDEFGHIJKLMNOPQ'};
 const first=NOW-3*60000;
 d.m.set('tt_windsor_sync_v1',{pipelineVersion:'v77.11-phase-isolated-daily',
  status:'running',lastAttemptAt:new Date(first).toISOString()});
 const res=await runTikTokOrganicSync(env,{...d,now:NOW,fetcher:async()=>({
  ok:true,json:async()=>rows
 })});
 assert.equal(res.status,'ok');
 assert.equal(res.dayThrough,'2026-11-13');
 assert.equal(d.m.get('tt_windsor_daily_v1').daily.length,5);
});

console.log('BACK2U TikTok Windsor recovery '+passed+'/'+passed+' tests passed');
