import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const html=readFileSync(new URL('../site/index.html',import.meta.url),'utf8');
const css=readFileSync(new URL('../site/dashboard-v7.css',import.meta.url),'utf8');
const shift=(d,n)=>new Date(Date.parse(d+'T12:00:00Z')+n*86400000).toISOString().slice(0,10);
const ymd=time=>new Date(time).toISOString().slice(0,10);
const rankStart=html.indexOf('function topSevenRanking(');
const rankEnd=html.indexOf('\nfunction renderTopSeven()',rankStart);
assert.ok(rankStart>0&&rankEnd>rankStart,'Ranking function and video-link checker must exist');
const {topSevenRanking:rank,topSevenVideoUrl:safeUrl}=vm.runInNewContext(
 html.slice(rankStart,rankEnd)+'\n;({topSevenRanking,topSevenVideoUrl})',{
 shift,ymd,URL,cleanUrl:s=>{try{const url=new URL(s);return ['https:','http:'].includes(url.protocol)?url.href:null}catch{return null}}
});
const single=v=>({groupKey:v.id,title:v.title,date:v.date,first:v,members:[v]});
const singles=items=>items.map(single);
const ids=x=>Array.from(x.items,v=>v.group.members[0].id);
const recent=[
 {platform:'yt',id:'aaaaaaaaaaa',date:'2026-11-09',title:'Older boundary',reportType:'lifetime',views:5000},
 {platform:'ig',id:'111111111111111',date:'2026-11-15',title:'Today',reportType:'lifetime',views:9200},
 {platform:'tt',id:'222222222222222',date:'2026-11-10',title:'TikTok',reportType:'lifetime',views:1100},
 {platform:'yt',id:'bbbbbbbbbbb',date:'2026-11-08',title:'Just outside',reportType:'lifetime',views:999999},
 {platform:'ig',id:'333333333333333',date:'2026-11-14',title:'Missing views',reportType:'lifetime'},
 {platform:'yt',id:'ccccccccccc',date:'2026-11-12',title:'Historical report value',reportType:'period',views:99999},
 {platform:'tt',id:'444444444444444',date:'2026-11-10',title:'Another value',reportType:'lifetime',views:0}
];
const full=rank(singles(recent),'uploads','2026-11-15',['yt','ig','tt']);
assert.equal(full.start,'2026-11-09');
assert.equal(full.end,'2026-11-15');
assert.equal(full.totalRanked,4,'Only genuine lifetime totals inside the publication week');
assert.equal(full.unknown,2,'Missing numbers must stay missing');
assert.deepEqual(ids(full),['111111111111111','aaaaaaaaaaa','222222222222222','444444444444444']);
assert.equal(rank(singles(recent),'uploads','2026-11-15',['ig']).totalRanked,1);
assert.equal(rank(singles(recent),'uploads','2026-11-15',['tt']).items.at(-1).views,0);
assert.equal(rank(singles(recent.map(v=>({...v,views:undefined}))),'uploads','2026-11-15',['yt','ig','tt']).totalRanked,0);

const source='YouTube Analytics API (video range)',window7={start:'2026-11-08',end:'2026-11-14'};
const metrics=(views7d,period=window7,metricSource=source)=>({source:metricSource,periods:{'7':period},views7d});
const periodVideos=[
 {platform:'yt',id:'recent11',date:'2026-11-15',analytics:metrics(3300)},
 {platform:'yt',id:'oldVideo',date:'2026-10-03',analytics:metrics(11000)},
 {platform:'yt',id:'olderWindow',date:'2026-11-11',analytics:metrics(99000,{start:'2026-11-06',end:'2026-11-12'})},
 {platform:'yt',id:'stale',date:'2026-11-12',analytics:metrics(100000,{start:'2026-11-01',end:'2026-11-07'})},
 {platform:'ig',id:'igFake',date:'2026-11-14',analytics:metrics(999999)},
 {platform:'yt',id:'badSource',date:'2026-11-12',analytics:metrics(888888,window7,'Unverified')},
 {platform:'yt',id:'badDate',date:'2026-11-12',analytics:metrics(888888,{start:'9999-99-93',end:'9999-99-99'})},
 {platform:'yt',id:'noCount',date:'2026-11-12',analytics:metrics(null)}
];
const measured=rank(singles(periodVideos),'period','2026-11-15',['yt','ig','tt']);
assert.equal(measured.start,'2026-11-08');
assert.equal(measured.end,'2026-11-14');
assert.deepEqual(ids(measured),['oldVideo','recent11']);
assert.equal(rank(singles(periodVideos),'period','2026-11-15',['ig']).totalRanked,0);
assert.equal(rank(singles(periodVideos),'period','2026-11-18',['yt']).totalRanked,0);
const twelve=Array.from({length:12},(_,i)=>({platform:'tt',id:String(i),date:'2026-11-15',reportType:'lifetime',views:i}));
assert.equal(rank(singles(twelve),'uploads','2026-11-15',['tt']).items.length,10);

// Reuse the *actual* existing Video Radar grouping heuristic. The same
// crosspost must become one ranked entry, never three separately.
const groupStart=html.indexOf('function groupTitleStem(');
const groupEnd=html.indexOf('\nfunction groupPlatformLabel(',groupStart);
assert.ok(groupStart>0&&groupEnd>groupStart);
const posts=[
 {platform:'yt',id:'video001',title:'AYE AYE Captain',date:'2026-11-10',reportType:'lifetime',views:6100,url:'https://youtube.com/shorts/video001'},
 {platform:'ig',id:'22222222222222',title:'AYE AYE Captain',date:'2026-11-11',reportType:'lifetime',views:3200,url:'https://www.instagram.com/reel/Example1/'},
 {platform:'tt',id:'33333333333333',title:'AYE AYE Captain',date:'2026-11-10',reportType:'lifetime',views:8700,url:'https://www.tiktok.com/@example/video/33333333333333'},
 {platform:'yt',id:'video002',title:'AYE AYE Captain Day 2',date:'2026-11-10',reportType:'lifetime',views:3500},
 {platform:'ig',id:'55555555555555',title:'Unmatched Instagram Clip',date:'2026-11-13',reportType:'lifetime',views:5500},
 {platform:'tt',id:'66666666666666',title:'TikTok Another Song',date:'2026-11-12',reportType:'lifetime'}
];
const norm=s=>String(s||'').replace(/\s+/g,' ').trim();
const getGroups=vm.runInNewContext(html.slice(groupStart,groupEnd)+'\n;crossPlatformVideoGroups',{
 mergedVideos:()=>posts,nl:norm,shift,toDay:d=>Date.parse(d+'T12:00:00Z'),
 guessFormat:()=> 'Jumpstyle',videoMetricValue:(v,k)=>v[k],
 state:{manualLinks:[],manualRevision:0},manualMergeGroups:groups=>groups
});
const grouped=getGroups();
const captain=grouped.find(g=>g.members.some(v=>v.id==='video001'));
assert.equal(captain.members.length,3,'Identical crosspost title within one day joins 3 platforms');
assert.deepEqual(Array.from(captain.members,v=>v.platform),['yt','ig','tt']);
const crossRank=rank(grouped,'uploads','2026-11-15',['yt','ig','tt']);
assert.equal(crossRank.items[0].views,18000,'Video totals sum each platform exactly once');
assert.equal(crossRank.items[0].values.length,3,'Ranking has one item per group and 3 breakdown values');
assert.equal(crossRank.items.filter(x=>x.group===captain).length,1,'Same video cannot take three rank slots');
assert.ok(!captain.members.some(v=>v.id==='video002'),'Similar named series are not merged');
assert.equal(crossRank.unknown,1,'Unmeasured platform is not a zero');
const captainPartial={...captain,members:captain.members.map(v=>v.platform==='ig'?{...v,views:null}:v)};
const partial=rank([captainPartial],'uploads','2026-11-15',['yt','ig','tt']);
assert.equal(partial.items[0].views,14800,'No invented Instagram views for missing metrics');
assert.equal(partial.unknown,1);
const captainTimed={...captain,members:captain.members.map(v=>v.platform==='yt'?{...v,analytics:metrics(650)}:v)};
const periodCross=rank([captainTimed],'period','2026-11-15',['yt','ig','tt']);
assert.equal(periodCross.items[0].views,650,'Video report does not add Instagram/TikTok lifetime views');
assert.equal(periodCross.items[0].members.length,3,'Other account links remain accessible');
assert.equal(periodCross.items[0].values.length,1,'Only YouTube has measured 7-day values');
assert.equal(safeUrl({platform:'yt',url:'https://www.youtube.com/shorts/abc'}),'https://www.youtube.com/shorts/abc');
assert.equal(safeUrl({platform:'yt',url:'https://fake.youtube.com.evil.example/'}),null);
assert.equal(safeUrl({platform:'ig',url:'javascript:alert(1)'}),null);

// The display must be grouped regardless of the global platform filter,
// show a stable 3-column breakdown, use per-account deep links, and preserve
// the 7-day measurement caveat.
for(const snippet of [
 'id="topSevenCard"','id="topSevenMode"','id="topSevenRefresh"','id="topSevenList"',
 'function renderVideos(){renderTopSeven()',
 'topSevenRanking(crossPlatformVideoGroups(),state.topSevenMode,today,',
 "['yt','ig','tt']);",
 "const chips=['yt','ig','tt'].map(",
 'class="top-seven-platforms"','class="top-seven-links"',
 "state.topSevenMode=e.target.value;renderTopSeven()",
 "topSevenRefresh').addEventListener('click',()=>loadLive(true))",
 "NICHT nur die neuen Aufrufe dieser Woche"
])assert.ok(html.includes(snippet),'Missing grouped Top 10 UI feature: '+snippet);
assert.match(css,/#topSevenList \.top-seven-item\s*\{\s*display:grid/);
assert.match(css,/grid-template-areas:"rank thumb body score"/);
assert.match(css,/#topSevenList \.top-seven-platforms/);
assert.match(css,/@media\(max-width:620px\)\s*\{\s*#topSevenList \.top-seven-item/);
assert.ok(html.includes('href="/dashboard-v7.css?v=14"'),'iOS Safari must load new CSS');
console.log('OK Top 10: three-platform grouped video ranking, strict crosspost matching, scope-safe sums, zero/missing distinction, genuine YouTube 7d and stable iPhone grid');
