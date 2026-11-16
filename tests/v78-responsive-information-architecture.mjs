import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const html=readFileSync(new URL('../site/index.html',import.meta.url),'utf8');
const styles=readFileSync(new URL('../site/workspace-v78.css',import.meta.url),'utf8');
const between=(start,end)=>html.slice(html.indexOf(start),html.indexOf(end,html.indexOf(start)));
const idMatches=id=>[...html.matchAll(new RegExp('id="'+id+'"','g'))].length;
for(const id of ['dashboardWorkspace','mobileBottomNav','mobileMoreToggle','mobileMoreDrawer',
 'mobileMoreBackdrop','mobileMoreClose','mobileMoreTheme','topSevenExpand','topSevenList']){
 assert.equal(idMatches(id),1,'New control must have exactly one id='+id);
}
assert.ok(html.includes('<link rel="stylesheet" href="/workspace-v78.css?v=1">'));
assert.ok(html.indexOf('<div class="dashboard-workspace"')<html.indexOf('<nav class="section-nav"'));
assert.ok(html.indexOf('</div><!-- /dashboard-workspace -->')>html.indexOf('</main>'));
assert.ok(html.indexOf('id="mobileBottomNav"')>html.indexOf('</div><!-- /dashboard-workspace -->'));
const mainNav=between('<nav class="section-nav"','</nav>');
const desktopOrder=[...mainNav.matchAll(/data-section="([^"]+)"/g)].map(x=>x[1]);
assert.deepEqual(desktopOrder,['overview','videos','creator','experiments','audience','system'],
 'Desktop nav must be organized by everyday -> creative -> analysis -> configuration');
const bottomNav=between('<nav id="mobileBottomNav"','</nav>');
const bottomOrder=[...bottomNav.matchAll(/data-section="([^"]+)"/g)].map(x=>x[1]);
assert.deepEqual(bottomOrder,['overview','videos','creator','audience'],
 'iPhone bottom bar should be no more than four primary sections plus More');
assert.ok(bottomNav.includes('id="mobileMoreToggle"'));
const moreMenu=between('<div id="mobileMoreDrawer"','</div>\n<div id="storyOverlay"');
for(const section of ['experiments','system'])
 assert.ok(moreMenu.includes('data-section="'+section+'"'),'More sheet missing '+section);
assert.ok(moreMenu.includes('id="mobileMoreTheme"'));
assert.ok(html.includes('id="mobileMoreDrawer" class="mobile-more-drawer" hidden'));
assert.ok(html.includes('id="topSevenExpand" class="top-seven-expand" aria-expanded="false" aria-controls="topSevenList" hidden'));
assert.ok(html.includes("root.dataset.collapsed=String(!state.topSevenExpanded)"));
assert.ok(html.includes("more.hidden=result.items.length<=3"));
assert.ok(html.includes("state.topSevenExpanded=!state.topSevenExpanded;renderTopSeven()"));
assert.ok(html.includes("const result=topSevenRanking(crossPlatformVideoGroups(),state.topSevenMode,today,"),
 'Collapse must not silently reduce the measured top ten or change grouping');
for(const id of ['overview','videos','creator','experiments','audience','system']){
 assert.ok(html.includes('<section id="'+id+'" class="view'),'All original views must remain');
}
assert.ok(html.includes('class="section-heading overview-trend-heading"'));
assert.ok(html.includes('class="section-heading overview-top-heading"'));
assert.ok(html.includes('class="creator-two-col creator-highlights-row"'));
assert.ok(html.includes('class="creator-two-col creator-notes-row"'));
assert.ok(html.includes("if(active)x.setAttribute('aria-current','page');else x.removeAttribute('aria-current')"));
assert.ok(html.includes('closeMobileMore();'));
assert.ok(html.includes("$('#mobileMoreTheme').addEventListener('click',()=>{closeMobileMore();$('#themeStudioToggle').click();})"));
assert.ok(html.includes("if(e.key==='Escape'&&!$('#mobileMoreDrawer').hidden)closeMobileMore(true)"),
 'More menu must close with Escape and restore focus');
assert.ok(html.includes("$('#mobileMoreBackdrop').addEventListener('click',()=>closeMobileMore(true))"));
assert.ok(styles.includes('@media(min-width:1240px)'));
assert.ok(styles.includes('grid-template-areas:"side notice" "side content"'));
assert.ok(styles.includes('position:sticky;top:16px'));
assert.ok(styles.includes('@media(max-width:760px)'));
assert.ok(styles.includes('grid-template-columns:repeat(5,minmax(0,1fr))'));
assert.ok(styles.includes('env(safe-area-inset-bottom,0px)'));
assert.ok(styles.includes('.dashboard-workspace>.section-nav{display:none!important}'));
assert.ok(styles.includes('body.story-open .mobile-bottom-nav,body.theme-open .mobile-bottom-nav{display:none}'));
assert.ok(styles.includes('#topSevenList[data-collapsed="true"] .top-seven-item:nth-child(n+4)'));
const iHero=styles.indexOf('#overview>.hero-grid{order:0}');
const iFollowers=styles.indexOf('#overview>#followerCards{order:1}');
const iTrend=styles.indexOf('#overview>.overview-trend-heading{order:3}');
const iExtras=styles.indexOf('#overview>#extendedDailyCard{order:10}');
assert.ok(iHero>=0&&iFollowers>iHero&&iTrend>iFollowers&&iExtras>iTrend);
for(const s of ['#creator>.creator-panel{order:2}', '#creator>.creator-highlights-row{order:3}',
 '#creator>.creator-two-col.v7-creator-tools{order:4}','@media(prefers-reduced-motion:reduce)'])
 assert.ok(styles.includes(s),'Missing layout/comfort contract: '+s);

// Verify handler syntax and behavior in isolation, including focus restoration.
// No external frameworks required.
const js=html.split('<script>/* BACK2U Creator Command Center')[1].split('</script>')[0];
const start=js.indexOf('function closeMobileMore(');
const end=js.indexOf('function setPeriod(',start);
assert.ok(start>=0&&end>start);
const menu={hidden:true};
const more={expanded:'false',classList:{toggle(){}} ,setAttribute(k,v){this[k]=v},focus(){this.focused=true}};
const close={focused:false,focus(){this.focused=true}};
const selectors={'#mobileMoreDrawer':menu,'#mobileMoreToggle':more,'#mobileMoreClose':close};
const selected=[];
const mockBody={dataset:{}};
const nodes=[...desktopOrder,...bottomOrder,...['experiments','system']].map(section=>({
 dataset:{section},classList:{toggle(k,v){if(k==='active')selected.push({section,active:v})}},
 setAttribute(k,v){this[k]=v},removeAttribute(k){delete this[k]}
}));
const views=desktopOrder.map(id=>({id,classList:{toggle(k,v){}}}));
const context={
 state:{section:'overview'},document:{body:mockBody},window:{scrollY:0},
 $:key=>selectors[key],$$:key=>key==='[data-section]'?nodes:key==='.view'?views:[],
 renderActive(){},console
};
vm.runInNewContext(js.slice(start,end)+'\n;({setSection,toggleMobileMore,closeMobileMore})',context).toggleMobileMore();
assert.equal(menu.hidden,false,'More drawer must open');
assert.equal(more.expanded,'true');
assert.equal(close.focused,true,'More drawer needs keyboard focus');
vm.runInNewContext(js.slice(start,end)+'\n;({setSection,toggleMobileMore,closeMobileMore})',context).setSection('system');
assert.equal(menu.hidden,true,'Switching a section must always close More');
assert.equal(more.expanded,'false');
assert.equal(mockBody.dataset.activeSection,'system');
assert.ok(selected.some(x=>x.section==='system'&&x.active));
console.log('OK V7.8: responsive navigation, user-focused section order, safe-area bottom nav, More keyboard behavior, collapsed Top-3 and complete six-section availability');
