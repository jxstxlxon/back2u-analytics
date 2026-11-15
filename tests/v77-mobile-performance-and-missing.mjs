import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const html=readFileSync(new URL('../site/index.html',import.meta.url),'utf8');
const css=readFileSync(new URL('../site/mobile-performance-v77.css',import.meta.url),'utf8');
assert.ok(html.includes('mobile-performance-v77.css?v=1'),
 'The iPhone optimization CSS must actually be loaded from the live site');
assert.match(css,/@media screen and \(max-width: 860px\) and \(pointer: coarse\)/,
 'Only touch mobile devices should automatically use low-cost glass');
assert.match(css,/-webkit-backdrop-filter:\s*none\s*!important/,
 'iOS Safari requires an explicit WebKit backdrop-filter override');
assert.match(css,/background-color:\s*rgba\(var\(--t-card/,
 'Retain a readable, theme-tinted replacement instead of transparent/black cards');
assert.match(css,/\.v77-missing-details/,
 'Missing data needs a cheap compact disclosure rather than dozens of glass cards');
assert.match(css,/summary\s*\{/,
 'Users must be able to expand unknown items');
assert.ok(!/@media\s*\(min-width:\s*1000px\)/.test(css),
 'Desktop should be unaffected');

const blocks=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)];
let parsed=0;
for(const [i,block] of blocks.entries()){
 if(!block[1].trim())continue;
 new vm.Script(block[1],{filename:'dashboard-inline-'+i+'.js'});
 parsed++;
}
assert.ok(parsed>=1);
const a=html.indexOf('function renderExtendedDaily(){');
const b=html.indexOf('\nfunction renderOverview()',a);
assert.ok(a>0&&b>a,'New extra renderer must be available');
const functionSrc=html.slice(a,b);
const panel={innerHTML:''},foot={textContent:''};
function renderFixture(items,selected=['yt','ig','tt']){
 panel.innerHTML='';foot.textContent='';
 const ctx={
  $:key=>key==='#extendedDailyMetrics'?panel:key==='#extendedDailyNote'?foot:null,
  platforms:()=>selected,
  targetRange:()=>({start:'2026-10-18',end:'2026-11-14'}),
  state:{days:28},
  mergedDaily:p=>items[p]||[],
  NAMES:{yt:'YouTube',ig:'Instagram',tt:'TikTok'},
  fmt:x=>new Intl.NumberFormat('de-DE').format(x),
  dec:x=>String(x),
  esc:x=>String(x).replace(/[&<>]/g,v=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[v]))
 };
 vm.runInNewContext(functionSrc+'\nrenderExtendedDaily()',ctx);
 return panel.innerHTML;
}
const none=renderFixture({});
assert.equal((none.match(/class="glass metric-box"/g)||[]).length,0,
 'No expensive glass-card placeholders when an API has no verified data');
assert.ok(none.includes('<details class="v77-missing-details">'),
 'Missing cards must stay accessible in a native, collapsed details disclosure');
assert.ok(none.includes('Zum Anzeigen öffnen'));
assert.ok(none.includes('YouTube · Wiedergabezeit'));
assert.ok(none.includes('TikTok · Profilaufrufe'));

const good=renderFixture({
 tt:[
  {d:'2026-11-12',views:7979,profileViews:88,netFollows:-3,
   source:'TikTok Organic via Windsor.ai'},
  {d:'2026-11-13',views:7681,profileViews:118,netFollows:6,
   source:'TikTok Organic via Windsor.ai'}
 ],
 ig:[{d:'2026-11-13',saves:65,
  sourceFields:{saves:'Windsor.ai Instagram Insights (account-day)'}}]
});
assert.ok(good.includes('TikTok · Profilaufrufe'));
assert.ok(good.includes('206'),'Profile visits are displayed from verified day reports');
assert.ok(good.includes('TikTok · Netto-Followeränderung'));
assert.ok(good.includes('Instagram · Gespeicherte Beiträge'));
const numberCards=(good.match(/class="glass metric-box"/g)||[]).length;
assert.equal(numberCards,3,'Only three verified values create three GPU-heavy cards, not 21 placeholders');
console.log('BACK2U iPhone performance and compact missing metrics: all checks passed');
