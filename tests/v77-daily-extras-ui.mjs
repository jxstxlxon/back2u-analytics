import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const html=readFileSync(new URL('../site/index.html',import.meta.url),'utf8');
const scripts=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)];
let compiled=0;
for(const [i,m] of scripts.entries()){
 if(!m[1].trim())continue;
 new vm.Script(m[1],{filename:'index-inline-'+i+'.js'});compiled++;
}
assert.ok(compiled>=1,'Expected real inline dashboard source');
console.log('OK dashboard inline scripts compile: '+compiled);

const start=html.indexOf('function renderExtendedDaily(){');
const end=html.indexOf('\nfunction renderOverview()',start);
assert.ok(start>0&&end>start,'Find complete real extra analytics rendering function');
const render=html.slice(start,end);
const panels={main:{innerHTML:''},foot:{textContent:''}};
const getNode=id=>id==='#extendedDailyMetrics'?panels.main:
 id==='#extendedDailyNote'?panels.foot:null;
const fixture={
 tt:[
  {d:'2026-11-12',views:7979,likes:562,comments:63,shares:14,follows:14,
   uniqueViews:5625,profileViews:88,engagedAudience:948,netFollows:10,
   lostFollowers:4,bioLinkClicks:2,source:'TikTok Organic via Windsor.ai'},
  {d:'2026-11-13',views:7681,likes:485,comments:68,shares:37,follows:13,
   uniqueViews:5491,profileViews:118,engagedAudience:892,netFollows:6,
   lostFollowers:7,bioLinkClicks:0,source:'TikTok Organic via Windsor.ai'},
  {d:'2026-11-14',views:0,likes:0,comments:0,shares:0,follows:0,
   uniqueViews:0,profileViews:0,source:'Unconfirmed day; do not count'}
 ],
 yt:[{d:'2026-11-10',engagedViews:27143,watchMinutes:9169,shares:60,
    averageViewSeconds:20.2682,
    sourceFields:Object.fromEntries(
      ['engagedViews','watchMinutes','shares','averageViewSeconds']
       .map(k=>[k,'Windsor.ai YouTube Analytics (account-day)']))}],
 ig:[
  {d:'2026-11-12',likes:972,comments:15,reach:4795,saves:49,shares:107,
   interactions:1410,engagedAccounts:863,
   sourceFields:Object.fromEntries(
    ['likes','comments','reach','saves','shares','interactions','engagedAccounts']
    .map(k=>[k,'Windsor.ai Instagram Insights (account-day)']))},
  {d:'2026-11-13',likes:9999,comments:9999,reach:9999,
   sourceFields:{likes:'Unverified data',comments:'Unverified data',reach:'Unverified data'}}
 ]
};
function show(selected){
 panels.main.innerHTML='';panels.foot.textContent='';
 vm.runInNewContext(render+'\nrenderExtendedDaily();',{
  $:getNode,
  platforms:()=>selected,
  targetRange:()=>({start:'2026-11-09',end:'2026-11-15'}),
  state:{days:7},
  mergedDaily:p=>fixture[p]||[],
  NAMES:{tt:'TikTok',ig:'Instagram',yt:'YouTube'},
  fmt:n=>new Intl.NumberFormat('de-DE').format(n),
  dec:n=>String(n),
  esc:x=>String(x),
 });
 return {html:panels.main.innerHTML,foot:panels.foot.textContent};
}
const tt=show(['tt']);
for(const label of ['Erreichte Zuschauer','Profilaufrufe','Likes','Kommentare','Geteilte Videos','Gemeldete Followeränderung']){
 assert.ok(tt.html.includes(label),'Missing TikTok extra '+label);
}
assert.ok(tt.html.includes('11.116'),'Unique viewer totals must use only two verified days');
for(const label of ['Interagierende Zuschauer','Netto-Followeränderung','Verlorene Follower','Link-in-Bio-Klicks'])
 assert.ok(tt.html.includes(label),'Missing valid TikTok extra card '+label);
assert.ok(tt.html.includes('1.840'),'Sum of verified TikTok engaged audience must be present');
assert.ok(tt.html.includes('206'),'Verified profile visits sum must be shown');
assert.ok(!tt.html.includes('9.999'),'Never expose fabricated/unverified source values');
assert.ok(tt.foot.includes('fehlende Tage')||tt.foot.includes('Fehlende Tage'));
console.log('OK TikTok extras visible and do not treat unverified zero day as confirmed');

const ig=show(['ig']);
assert.ok(ig.html.includes('972'),'Verified Instagram daily Likes must display');
for(const label of ['Gespeicherte Beiträge','Geteilte Beiträge','Interaktionen','Interagierende Konten'])
 assert.ok(ig.html.includes(label),'Missing verified Instagram metric card '+label);
assert.ok(ig.html.includes('1.410'),'Instagram interactions must come from actual account-day');
assert.ok(!ig.html.includes('10.971'),'Unverified Instagram values must not be added');
assert.ok(ig.html.includes('Meta/Windsor'));
console.log('OK Instagram extras from verified Windsor source without mixing unverified values');

const yt=show(['yt']);
for(const label of ['Interessierte Aufrufe','Wiedergabezeit','Geteilte Videos','Ø Dauer'])
 assert.ok(yt.html.includes(label),'Missing YouTube supplemental verified card '+label);
assert.ok(yt.html.includes('27.143'),'YouTube engaged views must use real verified count');
console.log('OK verified YouTube Windsor daily extra metrics visible');
const empty=show(['yt','ig','tt']);
assert.ok(empty.html.includes('Noch kein bestätigter Tageswert')||empty.html.includes('0 von 7 Tagen'));
console.log('BACK2U V7.7 daily extras UI regression checks passed');
