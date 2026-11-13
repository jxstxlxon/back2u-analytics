import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {validateDirectVideoInsights} from '../cloudflare/direct-insights.js';

const source=readFileSync(new URL('../scripts/BACK2U_YouTube_Video_Insights_Direct.gs',import.meta.url),'utf8');
const production='https://back2u-cloud.leon-mueller0806.workers.dev/api/direct-video-insights/ingest';
const now=Date.parse('2026-11-13T11:00:00Z');
const FixedDate=class extends Date {
 constructor(...args){super(...(args.length?args:[now]))}
 static now(){return now}
};
let passed=0;const test=(name,fn)=>{fn();passed++;console.log('OK '+name)};
function simulate(mode,secret='PRODUCTION_SECRET_1234567890_AABBCCDD') {
 const posts=[],queries=[],logs=[];
 const entries=Array.from({length:24},(_,i)=>['V'+String(i).padStart(10,'0'),100+i,210+i,12.3,56.7,3+i]);
 const context=vm.createContext({
  Date:FixedDate,
  PropertiesService:{getScriptProperties:()=>({getProperty:k=>k==='BACK2U_CLOUDFLARE_FEED_SECRET'?secret:null})},
  YouTube:{Channels:{list:()=>({items:[{id:'UCBnnaMohI_VfKihekEwaQEw'}]})}},
  YouTubeAnalytics:{Reports:{query:a=>{
   queries.push(a);
   if(a.metrics==='engagedViews')return {rows:[]};
   if(mode==='fail')throw Error('The query is not supported');
   if(mode==='views_only'&&a.metrics!=='views')throw Error('The query is not supported');
   if(mode==='channel_id'&&(a.ids==='channel==MINE'||a.metrics!=='views'))throw Error('The query is not supported');
   const headers=['video',...a.metrics.split(',')];
   const rows=entries.map(row=>[row[0],...headers.slice(1).map(h=>({
    views:row[1],estimatedMinutesWatched:row[2],
    averageViewDuration:row[3],averageViewPercentage:row[4],shares:row[5]
   }[h]))]);
   return {columnHeaders:headers.map(name=>({name})),rows:a.startIndex>1?[]:rows};
  }}},
  Utilities:{formatDate:d=>d.toISOString().slice(0,10)},
  Logger:{log:x=>logs.push(x)},
  UrlFetchApp:{fetch:(url,opts)=>{
   if(url!==production)throw Error('Wrong production target');
   const body=JSON.parse(opts.payload);
   validateDirectVideoInsights(body,now);
   posts.push(body);
   return{getResponseCode:()=>200,getContentText:()=>''};
  }},
  ScriptApp:{getProjectTriggers:()=>[]}
 });
 vm.runInContext(source,context);
 let error;
 try{vm.runInContext('back2uYouTubeVideoInsightsDirect()',context)}
 catch(e){error=String(e.message)}
 return {queries,posts,logs,error};
}
test('full report validates three time windows',()=>{
 const r=simulate('full');
 assert.equal(r.error,undefined);assert.equal(r.posts.length,3);
 assert.deepEqual(r.posts.map(p=>p.periodDays),[7,28,90]);
 assert.ok(r.queries.filter(q=>q.metrics.startsWith('views,')).every(q=>!('startIndex' in q)));
});
test('unsupported optional metrics fall back to exact real views',()=>{
 const r=simulate('views_only');
 assert.equal(r.error,undefined);assert.equal(r.posts.length,3);
 assert.ok(r.posts.every(p=>p.videos.every(v=>Object.keys(v.metrics).length===1)));
});
test('query unsupported for MINE falls back to own channel id',()=>{
 const r=simulate('channel_id');
 assert.equal(r.error,undefined);assert.equal(r.posts.length,3);
 assert.ok(r.queries.some(q=>q.ids==='channel==UCBnnaMohI_VfKihekEwaQEw'));
});
test('unsupported API never writes to database',()=>{
 const r=simulate('fail');
 assert.ok(r.error?.includes('Keine YouTube-Videoanalysen erfolgreich'));
 assert.equal(r.posts.length,0);
});
test('missing production secret rejects before YouTube API and D1',()=>{
 const r=simulate('full','');
 assert.ok(r.error?.includes('Feed-Zugang fehlt'));
 assert.equal(r.queries.length,0);assert.equal(r.posts.length,0);
});
console.log('BACK2U V7.7 Production YouTube safe fallback '+passed+'/'+passed+' passed');
