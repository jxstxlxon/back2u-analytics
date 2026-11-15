import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const html=readFileSync(new URL('../site/index.html',import.meta.url),'utf8');
const css=readFileSync(new URL('../site/dashboard-v7.css',import.meta.url),'utf8');
const sourceStart=html.indexOf('function topSevenRanking(');
const sourceEnd=html.indexOf('\nfunction renderTopSeven()',sourceStart);
assert.ok(sourceStart>=0&&sourceEnd>sourceStart,'Real ranking function must exist');
const shift=(d,n)=>new Date(Date.parse(d+'T12:00:00Z')+n*86400000).toISOString().slice(0,10);
const ymd=time=>new Date(time).toISOString().slice(0,10);
const rank=vm.runInNewContext(html.slice(sourceStart,sourceEnd)+'\n;topSevenRanking',{shift,ymd});

const recent=[
 {platform:'yt',id:'aaaaaaaaaaa',date:'2026-11-09',title:'Older boundary',reportType:'lifetime',views:5000},
 {platform:'ig',id:'111111111111111',date:'2026-11-15',title:'Today',reportType:'lifetime',views:9200},
 {platform:'tt',id:'222222222222222',date:'2026-11-10',title:'TikTok',reportType:'lifetime',views:1100},
 {platform:'yt',id:'bbbbbbbbbbb',date:'2026-11-08',title:'Just outside',reportType:'lifetime',views:999999},
 {platform:'ig',id:'333333333333333',date:'2026-11-14',title:'Missing views',reportType:'lifetime'},
 {platform:'yt',id:'ccccccccccc',date:'2026-11-12',title:'Historical report value',reportType:'period',views:99999},
 {platform:'tt',id:'444444444444444',date:'2026-11-10',title:'Another value',reportType:'lifetime',views:0}
];
const full=rank(recent,'uploads','2026-11-15',['yt','ig','tt']);
assert.equal(full.start,'2026-11-09');
assert.equal(full.end,'2026-11-15');
assert.equal(full.totalRanked,4,'Only valid lifetime counts within the exact seven publication days');
assert.equal(full.unknown,2,'Unverifiable counts are missing, not zero');
assert.deepEqual(Array.from(full.items,v=>v.video.id),['111111111111111','aaaaaaaaaaa','222222222222222','444444444444444']);
assert.equal(rank(recent,'uploads','2026-11-15',['ig']).totalRanked,1,'Active platform filter applies');
assert.equal(rank(recent,'uploads','2026-11-15',['tt']).items.at(-1).views,0,'Real zero remains a valid metric');
assert.equal(rank(recent.map(v=>({...v,views:undefined})),'uploads','2026-11-15',['yt','ig','tt']).totalRanked,0,'Unknown values cannot masquerade as zero');

const scope='YouTube Analytics API (video range)';
const report={start:'2026-11-08',end:'2026-11-14'};
const metrics=(views7d,period=report,source=scope)=>({source,periods:{'7':period},views7d});
const periodVideos=[
 {platform:'yt',id:'recent11',date:'2026-11-15',analytics:metrics(3300)},
 {platform:'yt',id:'oldVideo',date:'2026-10-03',analytics:metrics(11000)},
 {platform:'yt',id:'olderWindow',date:'2026-11-11',analytics:metrics(99000,{start:'2026-11-06',end:'2026-11-12'})},
 {platform:'yt',id:'stale',date:'2026-11-12',analytics:metrics(100000,{start:'2026-11-01',end:'2026-11-07'})},
 {platform:'ig',id:'igFake',date:'2026-11-14',analytics:metrics(999999)},
 {platform:'yt',id:'badSource',date:'2026-11-12',analytics:metrics(888888,report,'Unverified')},
 {platform:'yt',id:'badDate',date:'2026-11-12',analytics:metrics(888888,{start:'9999-99-93',end:'9999-99-99'})},
 {platform:'yt',id:'noCount',date:'2026-11-12',analytics:metrics(null)}
];
const measured=rank(periodVideos,'period','2026-11-15',['yt','ig','tt']);
assert.equal(measured.start,'2026-11-08');
assert.equal(measured.end,'2026-11-14');
assert.deepEqual(Array.from(measured.items,v=>v.video.id),['oldVideo','recent11'],
 'Period ranking must use only the same verified source window, including older uploads');
assert.equal(rank(periodVideos,'period','2026-11-15',['ig']).totalRanked,0,
 'Instagram video lifetime views must never become seven-day metrics');
assert.equal(rank(periodVideos,'period','2026-11-18',['yt']).totalRanked,0,
 'A stale seven-day report must not appear as a recent ranking');
const twelve=Array.from({length:12},(_,i)=>({platform:'tt',id:String(i),date:'2026-11-15',reportType:'lifetime',views:i}));
assert.equal(rank(twelve,'uploads','2026-11-15',['tt']).items.length,10,'Top ten limit');

for(const snippet of [
 'id="topSevenCard"','id="topSevenMode"','id="topSevenRefresh"',
 'id="topSevenList"','function renderVideos(){renderTopSeven()',
 "state.topSevenMode=e.target.value;renderTopSeven()",
 "topSevenRefresh').addEventListener('click',()=>loadLive(true))",
 "esc(v.title||'Video')","aria-label=\"Video auf ",
 "NICHT nur Aufrufe innerhalb der Woche"
])assert.ok(html.includes(snippet),'Missing live UI feature: '+snippet);
assert.ok(css.includes('.top-seven-item'),'Feature must remain styled');
assert.ok(css.includes('@media(max-width:620px)'),'Mobile list needs its own layout');
console.log('OK Top 10 last seven days: calendar boundaries, valid lifetime scope, verified 7d per-video metrics, missing data, platform filter, refreshed live retrieval and iPhone CSS');
