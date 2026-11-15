import assert from 'node:assert/strict';
import {snapshotWithRawFallback} from '../cloudflare/snapshot-recovery.js';

const original={
 generatedAt:'2026-11-15T02:00:00Z',
 platforms:{
  yt:{videos:[{id:'yt-v1',views:2500}],daily:[{d:'2026-11-11',views:5000}],profile:{subscribers:5520}},
  ig:{videos:[{id:'ig-v1',views:1500}],daily:[{d:'2026-11-11',views:3000}],profile:{followers:2188}},
  tt:{videos:[{id:'tt-v1',views:1900}],daily:[{d:'2026-11-13',views:7681}],profile:{followers:4800}}
 },
 errors:[]
};
const clone=()=>JSON.parse(JSON.stringify(original));
const assertValid=s=>{for(const p of ['yt','ig','tt']){
 assert.ok(s.platforms[p].videos.length>0,'missing '+p+' media after fallback');
 assert.ok(s.platforms[p].daily.length>0,'missing '+p+' daily after fallback');
 assert.ok(Object.values(s.platforms[p].profile).some(Number.isFinite),'missing '+p+' follower snapshot');
}};
let rawReads=0;
const good=await snapshotWithRawFallback({
 hydrate:async()=>clone(),
 raw:async()=>{rawReads++;return clone()}
});
assert.equal(good.recovered,false);
assert.equal(rawReads,0);
assertValid(good.snapshot);

const errors=[];
const fallback=await snapshotWithRawFallback({
 hydrate:async()=>{throw Error('Private Worker D1 internal password token 123')},
 raw:async()=>{rawReads++;return clone()},
 report:msg=>errors.push(msg)
});
assert.equal(fallback.recovered,true);
assert.equal(fallback.snapshot.snapshotFallback,'original-d1');
assertValid(fallback.snapshot);
assert.ok(!JSON.stringify(fallback.snapshot).includes('Private Worker'));
assert.ok(!JSON.stringify(fallback.snapshot).includes('password token'));
assert.ok(!errors.join(' ').includes('password token'));
assert.equal(original.errors.length,0,'Fallback must not mutate original D1 data');

const temporarilyInvalid=await snapshotWithRawFallback({
 hydrate:async()=>({platforms:{yt:{}}}),
 raw:async()=>clone()
});
assert.equal(temporarilyInvalid.recovered,true);
assertValid(temporarilyInvalid.snapshot);

const offline=await snapshotWithRawFallback({
 hydrate:async()=>{throw Error('network')},
 raw:async()=>{throw Error('database temporarily unavailable')}
});
assert.equal(offline.snapshot,null,'Must not fabricate a live snapshot');
assert.equal(offline.recovered,false);

const missing=await snapshotWithRawFallback({
 hydrate:async()=>null,raw:async()=>null
});
assert.equal(missing.snapshot,null,'Missing D1 snapshot must remain unavailable');
console.log('BACK2U authenticated snapshot fallback: preserves all 3 media libraries, daily data, followers and privacy');
