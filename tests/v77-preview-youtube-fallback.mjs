import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const helper=readFileSync(new URL('../scripts/BACK2U_V77_Preview_Media_Smoke.gs',import.meta.url),'utf8');
const source=readFileSync(new URL('../scripts/BACK2U_V77_Preview_YT_Insights.gs',import.meta.url),'utf8');
const preview='https://feature-back2u-v77-direct-yt-ig-tiktok-audit-20261-back2u-cloud.example.workers.dev';
let passed=0;
const ok=(msg,run)=>{run();passed++;console.log('OK '+msg)};
const FixedDate=class extends Date {
 constructor(...args){super(...(args.length?args:['2026-11-13T10:10:00Z']))}
 static now(){return Date.parse('2026-11-13T10:10:00Z')}
};
function runCase(mode,dryRun=false){
 const posts=[],queries=[],logs=[];
 const properties={
  BACK2U_V77_PREVIEW_URL:mode==='bad_host'?'https://back2u-cloud.example.workers.dev':preview,
  BACK2U_V77_PREVIEW_FEED_SECRET:'PREVIEW_ONLY_SECRET_1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ'
 };
 const rows=Array.from({length:24},(_,i)=>['V'+String(i).padStart(10,'0'),100+i,230+i,12.5,74.5,3+i]);
 const query=(a)=>{
  queries.push(a);
  if(a.metrics==='engagedViews')return {rows:[]};
  if(mode==='all_fail')throw Error('The query is not supported');
  if(mode==='views_mine'&&a.metrics!=='views')throw Error('The query is not supported');
  if(mode==='views_channel'&&(a.ids==='channel==MINE'||a.metrics!=='views'))
   throw Error('The query is not supported');
  const headers=['video',...a.metrics.split(',')];
  const vals=rows.map(row=>[row[0],...headers.slice(1).map(h=>({
   views:row[1],estimatedMinutesWatched:row[2],
   averageViewDuration:row[3],averageViewPercentage:row[4],shares:row[5]
  }[h]))]);
  if(a.startIndex&&a.startIndex>1)return {columnHeaders:headers.map(name=>({name})),rows:[]};
  return {columnHeaders:headers.map(name=>({name})),rows:vals};
 };
 const context=vm.createContext({
  Date:FixedDate,
  BACK2U_SPREADSHEET_ID:'private_mock_id',
  PropertiesService:{getScriptProperties:()=>({getProperty:k=>properties[k]})},
  YouTube:{Channels:{list:()=>({items:[{id:'UCBnnaMohI_VfKihekEwaQEw'}]})}},
  YouTubeAnalytics:{Reports:{query}},
  Utilities:{formatDate:d=>d.toISOString().slice(0,10)},
  Logger:{log:s=>logs.push(s)},
  UrlFetchApp:{fetch:(url,opts)=>{
   posts.push({url,payload:JSON.parse(opts.payload)});
   return{getResponseCode:()=>200,getContentText:()=>''};
  }}
 });
 vm.runInContext(helper+'\n'+source,context);
 let error;
 try{vm.runInContext(dryRun?'back2uV77PreviewYouTubeInsightsCheck()':'back2uV77PreviewYouTubeInsightsSend()',context)}
 catch(e){error=String(e.message)}
 return {posts,queries,logs,error};
}
ok('dry-run reads three windows and never sends',()=>{
 const r=runCase('full',true);
 assert.equal(r.error,undefined);assert.equal(r.posts.length,0);
 assert.equal(r.logs.filter(s=>s.includes('PREVIEW CHECK')).length,3);
});
ok('full documented report succeeds without first-page startIndex',()=>{
 const r=runCase('full');
 assert.equal(r.error,undefined);assert.equal(r.posts.length,3);
 assert.ok(r.queries.filter(a=>a.metrics.startsWith('views,')).every(a=>!('startIndex' in a)));
 assert.deepEqual(r.posts.map(p=>p.payload.periodDays),[7,28,90]);
 assert.ok(r.posts.every(p=>p.url===preview+'/api/direct-video-insights/ingest'));
});
ok('views-only MINE fallback preserves missing optional metrics as absent',()=>{
 const r=runCase('views_mine');
 assert.equal(r.error,undefined);assert.equal(r.posts.length,3);
 assert.ok(r.posts.every(p=>p.payload.videos.every(v=>Object.keys(v.metrics).length===1)));
 assert.ok(r.queries.some(q=>q.metrics==='views'&&q.ids==='channel==MINE'));
});
ok('explicit channel fallback after failed MINE is accepted',()=>{
 const r=runCase('views_channel');
 assert.equal(r.error,undefined);assert.equal(r.posts.length,3);
 assert.ok(r.queries.some(q=>q.ids==='channel==UCBnnaMohI_VfKihekEwaQEw'&&q.metrics==='views'));
});
ok('unsupported API keeps Preview D1 unchanged',()=>{
 const r=runCase('all_fail');
 assert.ok(r.error?.includes('Keine YouTube-Videoanalysen erfolgreich'));
 assert.equal(r.posts.length,0);
});
ok('live host rejected before any API call or writes',()=>{
 const r=runCase('bad_host');
 assert.ok(r.error?.includes('Nur die V7.7-Cloudflare-Preview-URL'));
 assert.equal(r.queries.length,0);assert.equal(r.posts.length,0);
});
console.log('BACK2U V7.7 preview YouTube fallback: '+passed+'/'+passed+' safe tests passed');
