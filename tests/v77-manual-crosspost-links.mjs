import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {
 normalizeManualRef,manualRefKey,validateManualMembers,mutateManualLinks,
 manualCrosspostRoute,MANUAL_LINKS_KEY
} from '../cloudflare/manual-crosspost-links.js';

const yt={platform:'yt',id:'abc123DE_-0'};
const ig={platform:'ig',id:'17841476673616735'};
const tt={platform:'tt',id:'7345678901234567890'};
const yt2={platform:'yt',id:'XYZ123DE_-0'};
assert.equal(normalizeManualRef(yt).id,yt.id);
assert.equal(normalizeManualRef(ig).id,ig.id);
assert.equal(normalizeManualRef(tt).id,tt.id);
assert.equal(normalizeManualRef({platform:'wrong',id:yt.id}),null);
assert.equal(normalizeManualRef({platform:'yt',id:'no'}),null);
assert.equal(manualRefKey(yt),'yt:'+yt.id);
assert.equal(validateManualMembers([ig,yt])[0].platform,'yt');
assert.throws(()=>validateManualMembers([yt,yt2]),/Pro Plattform/);
assert.throws(()=>validateManualMembers([yt]),/zwei oder drei/);
assert.throws(()=>validateManualMembers([yt,ig,tt,yt2]),/zwei oder drei/);
const uuid='aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa',uuid2='bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb';
const first=mutateManualLinks(null,'link',{members:[yt,ig]},()=>uuid);
assert.equal(first.groups.length,1);
assert.equal(first.groups[0].id,uuid);
assert.deepEqual(Array.from(first.groups[0].members,x=>x.platform),['yt','ig']);
assert.equal(JSON.stringify(mutateManualLinks(first,'link',{members:[ig,yt]},()=>uuid2)),JSON.stringify(first),
 'Identical repeated POST must be idempotent');
const expanded=mutateManualLinks(first,'link',{members:[yt,tt]},()=>uuid2);
assert.equal(expanded.groups.length,1);
assert.deepEqual(Array.from(expanded.groups[0].members,x=>x.platform),['yt','ig','tt']);
assert.equal(expanded.groups[0].id,uuid,'Expansion retains original undo ID');
const other=mutateManualLinks(first,'link',{members:[yt2,tt]},()=>uuid2);
assert.equal(other.groups.length,2);
assert.throws(()=>mutateManualLinks(other,'link',{members:[yt,tt]}),/zwei unterschiedliche Videos derselben Plattform/);
assert.deepEqual(mutateManualLinks(expanded,'delete',{id:uuid}).groups,[]);
assert.throws(()=>mutateManualLinks(expanded,'delete',{id:uuid2}),/nicht gefunden/);

const snapshot={platforms:{
 yt:{videos:[{id:yt.id},{id:yt2.id}]},
 ig:{videos:[{id:ig.id}]},
 tt:{videos:[{id:tt.id}]}
}};
function mockDB(){
 const db=new Map([['snapshot',JSON.stringify(snapshot)]]);
 const stats={};
 const env={DB:{
  prepare(query){
   return {bind(...args){
    return {
     async first(){
      if(!query.startsWith('SELECT value FROM back2u_store'))throw Error('Unexpected SELECT');
      const value=db.get(args[0]);return value?{value}:null;
     },
     async run(){
      if(query.startsWith('INSERT INTO back2u_store')){
       if(db.has(args[0]))return {meta:{changes:0}};
       db.set(args[0],args[1]);return {meta:{changes:1}};
      }
      if(query.startsWith('UPDATE back2u_store')){
       if(db.get(args[1])!==args[2])return {meta:{changes:0}};
       db.set(args[1],args[0]);return {meta:{changes:1}};
      }
      throw Error('Unexpected write query');
     }
    };
   }};
  }
 }};
 return {env,db,stats};
}
const {env,db}=mockDB();
const helpers={
 json:(value,status=200)=>new Response(JSON.stringify(value),{status,headers:{'content-type':'application/json'}}),
 requireSameSiteJson:req=>
  req.headers.get('content-type')?.startsWith('application/json')&&
  req.headers.get('origin')===new URL(req.url).origin&&
  req.headers.get('sec-fetch-site')!=='cross-site'
};
const endpoint='https://back2u.example/api/manual-video-links';
const request=(method,pathname='',body,origin='https://back2u.example')=>new Request(endpoint+pathname,{
 method,headers:{'content-type':'application/json','origin':origin},
 ...(body?{body:JSON.stringify(body)}:{})
});
async function call(method,role,body,subPath='',origin){
 const response=await manualCrosspostRoute(request(method,subPath,body,origin),env,role,helpers);
 return {code:response.status,data:await response.json()};
}
const initial=await call('GET','guest');
assert.equal(initial.code,200);
assert.equal(initial.data.canEdit,false);
assert.deepEqual(initial.data.groups,[]);
assert.equal((await call('POST','guest',{members:[yt,ig]})).code,403,
 'Guests may read but never create links');
assert.equal((await call('DELETE','guest',null,'/'+uuid)).code,403,
 'Guests may not remove links');
assert.equal((await call('POST','admin',{members:[yt,ig]},'','https://elsewhere.invalid')).code,403,
 'Cross-site requests may not write');
assert.equal((await call('POST','admin',{members:[yt,{platform:'ig',id:'111111111111111'}]})).code,422,
 'Unknown/phantom media IDs cannot be linked');
assert.equal((await call('POST','admin',{members:[yt,yt2]})).code,422);
const created=await call('POST','admin',{members:[yt,ig]});
assert.equal(created.code,200);
assert.equal(created.data.groups.length,1);
assert.equal((await call('POST','admin',{members:[yt,ig]})).data.unchanged,true);
assert.equal((await call('POST','admin',{members:[yt,tt]})).data.groups[0].members.length,3);
assert.equal((await call('GET','guest')).data.groups[0].members.length,3,
 'Guest sees committed owner associations');
assert.equal(db.get('snapshot'),JSON.stringify(snapshot),'Original D1 video/metric snapshot is NEVER overwritten');
assert.ok(db.has(MANUAL_LINKS_KEY),'Links exist in independent D1 key');
const stored=JSON.parse(db.get(MANUAL_LINKS_KEY));
assert.equal((await call('DELETE','admin',null,'/'+stored.groups[0].id)).code,200);
assert.deepEqual((await call('GET','guest')).data.groups,[]);
assert.equal((await call('DELETE','admin',null,'/'+uuid2)).code,404);
assert.equal(db.get('snapshot'),JSON.stringify(snapshot));

const html=readFileSync(new URL('../site/index.html',import.meta.url),'utf8');
const js=readFileSync(new URL('../site/manual-video-links.js',import.meta.url),'utf8');
const css=readFileSync(new URL('../site/dashboard-v7.css',import.meta.url),'utf8');
new vm.Script(js,{filename:'manual-video-links.js'});
const from=html.indexOf('function manualVideoRef(');
const to=html.indexOf('\nlet groupCache=null;',from);
assert.ok(from>0&&to>from,'Production UI must own reusable pure manual-group overlay');
const merge=vm.runInNewContext(html.slice(from,to)+'\n;manualMergeGroups',{
 knownMetric:(members,k)=>{const nums=members.map(m=>m[k]).filter(Number.isFinite);return nums.length?nums.reduce((x,y)=>x+y,0):null}
});
const a={platform:'yt',id:yt.id,title:'Different YouTube title',date:'2026-11-10',views:5000};
const b={platform:'ig',id:ig.id,title:'Different Instagram title',date:'2026-11-12',views:3000};
const c={platform:'tt',id:tt.id,title:'Different TikTok title',date:'2026-11-14',views:4000};
const base=[a,b,c].map((v,i)=>({members:[v],first:v,title:v.title,date:v.date,groupKey:String(i),views:v.views}));
const manualTwo=merge(base,[{members:[yt,ig]}]);
assert.equal(manualTwo.length,2);
assert.ok(manualTwo.some(g=>g.views===8000));
const manualThree=merge(base,[{members:[yt,ig]},{members:[yt,tt]}]);
assert.equal(manualThree.length,1);
assert.equal(manualThree[0].views,12000);
assert.deepEqual(Array.from(manualThree[0].members,v=>v.platform),['yt','ig','tt']);
assert.equal(merge(base,[]).length,3,'Undo preserves original ungrouped video records');
const conflict=merge([...base,{members:[{...a,id:yt2.id}],groupKey:'extra'}],[{members:[yt,yt2]}]);
assert.equal(conflict.length,4,'Different videos on same platform cannot be grouped');

for(const need of [
 'id="manualLinksPanel"','id="manualAnchorSearch"','id="manualMatchSearch"',
 'id="manualLinkSave"','id="manualSavedLinks"','window.BACK2U_MANUAL_BRIDGE',
 'manualMergeGroups(finished,state.manualLinks)','manualLinks:[]',
 'manualCanEdit:false','manual-video-links.js?v=1',
 'href="/dashboard-v7.css?v=15"'
])assert.ok(html.includes(need),'Missing manual grouping UI: '+need);
assert.ok(js.includes("if(!canEdit||!group)return"));
assert.ok(js.includes("window.confirm("));
assert.ok(js.includes("method:'DELETE'"));
assert.ok(css.includes('#manualLinksPanel[hidden]'));
assert.ok(css.includes('@media(max-width:620px)'));
const worker=readFileSync(new URL('../cloudflare/worker.js',import.meta.url),'utf8');
assert.ok(worker.includes("const access=await accessRole(req,env);"));
assert.ok(worker.includes("if(!access.role)return json({error:'Bitte anmelden'},401);"));
assert.ok(worker.includes("if(access.role!=='admin')return json({error:'Nur Administrator'},403);"));
assert.ok(worker.includes("manualCrosspostRoute(req,env,access.role"));
console.log('OK manual crossposts: safe ID validation, persistent D1 CAS, guest read-only, CSRF guards, expansion/undo, collision avoidance, shared top-7 and mobile controls');
