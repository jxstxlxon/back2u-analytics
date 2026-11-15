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
test('duplicate days rejected, never used for totals',()=>{
 assert.throws(()=>validateTikTokOrganicDays([...rows,rows[0]],NOW),/mehrfach/);
});
test('missing view counts cannot be replaced with null or invented zero',()=>{
 assert.throws(()=>validateTikTokOrganicDays(rows.map(x=>({...x,video_views:null})),NOW),/fehlen/);
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
 assert.equal(d.m.get('tt_windsor_daily_v1').videos.length,7);
 assert.equal(calls.length,2);
 assert.ok(calls.every(x=>x.pathname==='/tiktok_organic'&&x.searchParams.get('select_accounts')===ACCOUNT));
 const skip=await runTikTokOrganicSync(env,{...d,now:NOW+20*60000,fetcher});
 assert.equal(skip.status,'skipped');
 assert.equal(calls.length,2);
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
console.log('BACK2U TikTok Windsor recovery '+passed+'/'+passed+' tests passed');
