import assert from 'node:assert/strict';
import {
 validateInstagramWindsorMedia,mergeInstagramWindsorMedia,
 overlayInstagramWindsorMedia,runInstagramWindsorMediaSync,
 instagramWindsorMediaStatus
} from '../cloudflare/instagram-media-repair.js';
const now=Date.parse('2026-11-15T01:30:00Z');
const data=Array.from({length:22},(_,i)=>({
 date:'2026-11-'+String(10+Math.floor(i/5)).padStart(2,'0'),
 media_id:String(18100000000000000n+BigInt(i)),
 media_caption:'Jumpstyle video '+i,
 media_views:500+i,media_like_count:40+i,
 media_total_comments_count:2,media_reach:400+i,
 media_permalink:'https://www.instagram.com/reel/Df'+i+'myReel/',
 media_thumbnail_url:'https://scontent.cdninstagram.com/a.jpg',
 media_type:'REELS',account_id:'27282542318110290'
}));
let passed=0;function check(name,run){run();passed++;console.log('OK '+name)}
async function checkAsync(name,run){await run();passed++;console.log('OK '+name)}
const makeDb=()=>{const store=new Map();return{store,get:async(_,key)=>store.get(key)||null,put:async(_,key,value)=>store.set(key,value)}};
check('verified recent Instagram reels report contains true lifetime counts',()=>{
 const out=validateInstagramWindsorMedia(data,now);
 assert.equal(out.length,22);assert.equal(out[0].views,500);
 assert.equal(out[0].reportType,'lifetime');
 assert.equal(out.at(-1).date,'2026-11-14');
});
check('wrong account is rejected',()=>{
 assert.throws(()=>validateInstagramWindsorMedia(data.map(x=>({...x,account_id:'other'})),now),/Konto/);
});
check('invalid or duplicate Instagram IDs and links rejected',()=>{
 assert.throws(()=>validateInstagramWindsorMedia([...data,data[0]],now),/Medium/);
 assert.throws(()=>validateInstagramWindsorMedia(data.map(x=>({...x,media_permalink:'https://evil.example/'})),now),/Medium/);
});
check('empty optional metrics stay unknown instead of fake zeros',()=>{
 const out=validateInstagramWindsorMedia(data.map(x=>({...x,media_reach:null,media_total_comments_count:null})),now);
 assert.ok(out.every(x=>!Object.hasOwn(x,'reach')&&!Object.hasOwn(x,'comments')));
 assert.equal(out.length,data.length);
});
check('items missing verified views cannot accidentally overwrite existing count',()=>{
 const out=validateInstagramWindsorMedia(data.map((x,i)=>i===0?{...x,media_views:null}:x),now);
 assert.equal(out.length,21);assert.equal(out[0].id,data[1].media_id);
});
check('historic Instagram videos survive a recent batch update',()=>{
 const previous={schema:1,videos:[{id:'18199999999999999',platform:'ig',date:'2026-04-12',views:95}]};
 const merged=mergeInstagramWindsorMedia(previous,validateInstagramWindsorMedia(data,now),now);
 assert.equal(merged.videoCount,23);
 assert.ok(merged.videos.some(v=>v.id==='18199999999999999'));
});
check('overlay updates only Instagram media and does not rewrite daily or other platforms',()=>{
 const initial={platforms:{yt:{videos:[{id:'youtube'}]},tt:{videos:[{id:'tiktok'}]},
  ig:{daily:[{d:'2026-11-11',views:5918}],videos:[{id:data[0].media_id,views:1,thumb:'https://old.jpg'},{id:'18199999999999999',views:300}]}}};
 const daily=JSON.stringify(initial.platforms.ig.daily);
 const yt=JSON.stringify(initial.platforms.yt),tt=JSON.stringify(initial.platforms.tt);
 const record=mergeInstagramWindsorMedia(null,validateInstagramWindsorMedia(data,now),now);
 overlayInstagramWindsorMedia(initial,record);
 assert.equal(initial.platforms.ig.videos.find(v=>v.id===data[0].media_id).views,500);
 assert.equal(initial.platforms.ig.videos.find(v=>v.id==='18199999999999999').views,300);
 assert.equal(JSON.stringify(initial.platforms.ig.daily),daily);
 assert.equal(JSON.stringify(initial.platforms.yt),yt);
 assert.equal(JSON.stringify(initial.platforms.tt),tt);
});
check('same-day official Meta direct video values win over Windsor',()=>{
 const initial={platforms:{ig:{videos:[{id:data[0].media_id,views:999}],daily:[]}}};
 const record=mergeInstagramWindsorMedia(null,validateInstagramWindsorMedia(data,now),now);
 overlayInstagramWindsorMedia(initial,record,{platforms:{ig:{snapshotDate:'2026-11-15'}}});
 assert.equal(initial.platforms.ig.videos[0].views,999);
});
await checkAsync('Cloudflare Cron uses existing Windsor secret and fetches only account media',async()=>{
 const db=makeDb(),requests=[];
 const env={WINDSOR_API_KEY:'dummy_private_32_character_secret_123'};
 const fetcher=async url=>{requests.push(new URL(url));return{ok:true,json:async()=>data}};
 const a=await runInstagramWindsorMediaSync(env,{...db,fetcher,now});
 assert.equal(a.status,'ok');assert.equal(a.batchVideos,22);
 assert.equal(db.store.has('snapshot'),false);
 assert.equal(requests[0].searchParams.get('select_accounts'),'17841476673616735');
 assert.equal(requests[0].searchParams.get('date_preset'),'last_28d');
 assert.ok(requests[0].searchParams.get('fields').includes('media_views'));
 const b=await runInstagramWindsorMediaSync(env,{...db,fetcher,now:now+3600000});
 assert.equal(b.status,'skipped');assert.equal(requests.length,1);
});
await checkAsync('failing upstream request cannot delete saved media',async()=>{
 const db=makeDb(),env={WINDSOR_API_KEY:'dummy_private_32_character_secret_123'};
 await runInstagramWindsorMediaSync(env,{...db,now,fetcher:async()=>({ok:true,json:async()=>data})});
 const old=JSON.stringify(db.store.get('ig_windsor_media_v1'));
 const result=await runInstagramWindsorMediaSync(env,{...db,now:now+86400000,fetcher:async()=>({ok:false,status:503})});
 assert.equal(result.status,'error');
 assert.equal(JSON.stringify(db.store.get('ig_windsor_media_v1')),old);
});
await checkAsync('no Cloudflare Windsor secret triggers neither fetch nor writes',async()=>{
 const db=makeDb();
 const r=await runInstagramWindsorMediaSync({}, {...db,now,fetcher:()=>{throw Error('must not fetch')}});
 assert.equal(r.status,'not_configured');assert.equal(db.store.size,0);
});
await checkAsync('admin status hides credentials',async()=>{
 const db=makeDb(),key='dummy_private_32_character_secret_123';
 const status=await instagramWindsorMediaStatus({WINDSOR_API_KEY:key},{get:db.get});
 assert.equal(status.configured,true);assert.ok(!JSON.stringify(status).includes(key));
});
console.log('BACK2U Instagram media recovery '+passed+'/'+passed+' passed');
