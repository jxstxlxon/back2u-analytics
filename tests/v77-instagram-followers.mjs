import assert from 'node:assert/strict';
import {
 validateInstagramWindsorFollowers,
 mergeInstagramWindsorFollowers,
 overlayInstagramWindsorFollowers,
 runInstagramWindsorFollowersSync,
 instagramWindsorFollowersStatus
} from '../cloudflare/instagram-followers-sync.js';

const now=Date.parse('2026-11-15T01:45:00Z');
const good=[{account_id:'27282542318110290',username:'lxon_jxmpstyle',followers_count:2188}];
const makeDb=()=>{
 const store=new Map();
 return {store,get:async(_,key)=>store.get(key)||null,
  put:async(_,key,value)=>store.set(key,value)};
};
let pass=0;
function check(name,fn){fn();console.log('OK '+name);pass++}
async function checkAsync(name,fn){await fn();console.log('OK '+name);pass++}

check('reads verified current 2188 total (not the new-followers-per-day metric)',()=>{
 const result=validateInstagramWindsorFollowers(good);
 assert.equal(result.followers,2188);
 assert.equal(result.username,'lxon_jxmpstyle');
});
check('rejects wrong account or wrong username',()=>{
 assert.throws(()=>validateInstagramWindsorFollowers([{...good[0],account_id:'different'}]),/Profil/);
 assert.throws(()=>validateInstagramWindsorFollowers([{...good[0],username:'other'}]),/Profil/);
});
check('rejects missing, negative, or invalid follower counts',()=>{
 for(const value of [null,undefined,'',false,-1,5.2,'not available']){
  assert.throws(()=>validateInstagramWindsorFollowers([{...good[0],followers_count:value}]));
 }
});
check('rejects empty/multiple account rows rather than guessing',()=>{
 assert.throws(()=>validateInstagramWindsorFollowers([]),/fehlt/);
 assert.throws(()=>validateInstagramWindsorFollowers([...good,...good]),/mehrere/);
});
check('retains measured history without inventing missing dates',()=>{
 const old={schema:1,history:[{date:'2026-11-11',followers:2110}]};
 const result=mergeInstagramWindsorFollowers(old,validateInstagramWindsorFollowers(good),now);
 assert.equal(result.followers,2188);
 assert.deepEqual(result.history.map(r=>r.date),['2026-11-11','2026-11-15']);
});
check('overlays only Instagram profile and preserves other platform data',()=>{
 const old={platforms:{yt:{profile:{subscribers:123}},tt:{profile:{followers:456}},
  ig:{profile:{followers:2000},daily:[{d:'2026-11-14',views:700}],videos:[{id:'a',views:800}]}}};
 const yt=JSON.stringify(old.platforms.yt),tt=JSON.stringify(old.platforms.tt);
 const igDaily=JSON.stringify(old.platforms.ig.daily),igVideos=JSON.stringify(old.platforms.ig.videos);
 const profile=mergeInstagramWindsorFollowers(null,validateInstagramWindsorFollowers(good),now);
 overlayInstagramWindsorFollowers(old,profile);
 assert.equal(old.platforms.ig.profile.followers,2188);
 assert.equal(old.platforms.ig.profile.asOf,'2026-11-15T01:45:00.000Z');
 assert.equal(JSON.stringify(old.platforms.yt),yt);
 assert.equal(JSON.stringify(old.platforms.tt),tt);
 assert.equal(JSON.stringify(old.platforms.ig.daily),igDaily);
 assert.equal(JSON.stringify(old.platforms.ig.videos),igVideos);
});
check('fresher official direct Meta count must take precedence',()=>{
 const current={platforms:{ig:{profile:{followers:2190}}}};
 const profile=mergeInstagramWindsorFollowers(null,validateInstagramWindsorFollowers(good),now);
 overlayInstagramWindsorFollowers(current,profile,{
  username:'lxon_jxmpstyle',followers:2190,updatedAt:'2026-11-15T02:00:00.000Z'
 });
 assert.equal(current.platforms.ig.profile.followers,2190);
});
check('older direct Meta cannot hide newer Windsor count',()=>{
 const current={platforms:{ig:{profile:{followers:2100}}}};
 const profile=mergeInstagramWindsorFollowers(null,validateInstagramWindsorFollowers(good),now);
 overlayInstagramWindsorFollowers(current,profile,{
  username:'lxon_jxmpstyle',followers:2100,updatedAt:'2026-11-11T09:00:00.000Z',
  history:[{date:'2026-11-11',followers:2100}]
 });
 assert.equal(current.platforms.ig.profile.followers,2188);
 assert.equal(current.platforms.ig.profile.history.length,2);
});
await checkAsync('cron uses already configured Windsor connection, not Apps Script',async()=>{
 const db=makeDb(),requests=[];
 const key='TEST_PRIVATE_KEY_ABCDEFGHIJKLMNO123456';
 const fetcher=async url=>{
  requests.push(new URL(url));
  return{ok:true,json:async()=>good};
 };
 const env={WINDSOR_API_KEY:key};
 const result=await runInstagramWindsorFollowersSync(env,{...db,fetcher,now});
 assert.equal(result.status,'ok');
 assert.equal(db.store.get('ig_windsor_followers_v1').followers,2188);
 assert.equal(db.store.has('ig_profile'),false);
 assert.equal(db.store.has('snapshot'),false);
 assert.equal(requests.length,1);
 assert.equal(requests[0].pathname,'/instagram');
 assert.equal(requests[0].searchParams.get('select_accounts'),'17841476673616735');
 assert.equal(requests[0].searchParams.get('fields'),'followers_count,username,account_id');
 assert.equal(requests[0].searchParams.get('date_preset'),'last_3dT');
 assert.ok(!JSON.stringify(result).includes(key));
 const retry=await runInstagramWindsorFollowersSync(env,{...db,fetcher,now:now+30*60000});
 assert.equal(retry.status,'skipped');
 assert.equal(requests.length,1);
});
await checkAsync('failed upstream response preserves last valid follower count',async()=>{
 const db=makeDb(),env={WINDSOR_API_KEY:'TEST_PRIVATE_KEY_ABCDEFGHIJKLMNO123456'};
 await runInstagramWindsorFollowersSync(env,{...db,now,fetcher:async()=>({ok:true,json:async()=>good})});
 const before=JSON.stringify(db.store.get('ig_windsor_followers_v1'));
 const result=await runInstagramWindsorFollowersSync(env,{...db,now:now+86400000,
  fetcher:async()=>({ok:false,status:429})});
 assert.equal(result.status,'error');
 assert.equal(JSON.stringify(db.store.get('ig_windsor_followers_v1')),before);
});
await checkAsync('no secret triggers no network or D1 mutation',async()=>{
 const db=makeDb();
 const result=await runInstagramWindsorFollowersSync({},{
  ...db,now,fetcher:()=>{throw Error('Should never call fetch')}
 });
 assert.equal(result.status,'not_configured');
 assert.equal(db.store.size,0);
});
await checkAsync('admin-only diagnostics contain no token',async()=>{
 const db=makeDb(),key='TEST_PRIVATE_KEY_ABCDEFGHIJKLMNO123456';
 db.store.set('ig_windsor_followers_v1',
  mergeInstagramWindsorFollowers(null,validateInstagramWindsorFollowers(good),now));
 const status=await instagramWindsorFollowersStatus({WINDSOR_API_KEY:key},{get:db.get});
 assert.equal(status.currentTotal,2188);
 assert.ok(!JSON.stringify(status).includes(key));
});
console.log('BACK2U Instagram follower total repair: '+pass+'/'+pass+' safe tests passed');
