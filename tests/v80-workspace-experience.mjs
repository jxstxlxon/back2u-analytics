import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const html=readFileSync(new URL('../site/index.html',import.meta.url),'utf8');

assert.ok(html.includes('return state.days===28}'),
 'Archived 28-day snapshots must never substitute for real 90-day totals');
assert.ok(html.includes('state.selected=groups.find(g=>g.groupKey===state.selected?.groupKey)'),
 'Grouped details must bind to current video snapshot after refresh');
assert.ok(html.includes('state.selected=vlist.find(v=>v.platform===selected?.platform'),
 'Single-video details must bind to current video record after refresh');

const ux=readFileSync(new URL('../site/workspace-v80.js',import.meta.url),'utf8');
const css=readFileSync(new URL('../site/workspace-v80.css',import.meta.url),'utf8');
const universe=readFileSync(new URL('../site/theme-universe-v806.css',import.meta.url),'utf8');

const referenceChrome=readFileSync(new URL('../site/theme-chrome-v816.css',import.meta.url),'utf8');
const momentumMesh=readFileSync(new URL('../site/theme-momentum-mesh-v816.svg',import.meta.url),'utf8');
assert.ok(html.includes('href="/theme-chrome-v816.css?v=1"'),'Reference-grade chrome must be part of live HTML');
assert.ok(html.indexOf('/theme-chrome-v816.css')>html.indexOf('/theme-photo-v814.css'),'Premium chrome must load after existing themes');
assert.ok(momentumMesh.includes('viewBox="0 0 1200 650"')&&momentumMesh.includes('id="spark"'),
 'Momentum wave must be a real sharp SVG, not a screenshot with fake metrics');
assert.ok(referenceChrome.includes('theme-momentum-mesh-v816.svg'),
 'Hyperdrive and Corvette must display the static decorative Momentum mesh');
assert.ok(referenceChrome.includes('data-theme-id="ex19"')&&referenceChrome.includes('data-theme-id="ex06"'));
assert.ok(referenceChrome.includes('.platform-card:nth-child(1)')&&referenceChrome.includes('.platform-card:nth-child(3)'),
 'Platform colors must remain individually recognizable');
assert.ok(!referenceChrome.includes('backdrop-filter:blur(')&&!referenceChrome.includes('filter:blur('),
 'Reference design must not reintroduce scrolling GPU blur');


const cinema=readFileSync(new URL('../site/theme-cinematic-v807.css',import.meta.url),'utf8');
assert.ok(html.includes('href="/theme-cinematic-v807.css?v=1"'),'Cinematic theme CSS must load');
assert.ok(html.indexOf('/theme-cinematic-v807.css')>html.indexOf('/theme-universe-v806.css'),'Cinematic art direction must override older styles');
assert.ok(html.includes('id="themeWorldName"'),'Cinematic hero must expose the active world');
assert.ok(cinema.includes('.masthead')&&cinema.includes('var(--t-scene-url)'),'Cinematic hero must show actual SVG scene');
assert.ok(cinema.includes('data-reference-layout="sidebar"'),'Sidebar specificity must not hide the hero');
assert.ok(cinema.includes('backdrop-filter:none!important')===false,'Cinematic styles should not need new backdrop sampling');
assert.ok(!cinema.includes('filter:blur('),'Cinematic styling must stay free of GPU blur');


assert.ok(html.includes('href="/theme-universe-v806.css?v=1"'),'Universe style asset must load');
assert.ok(html.indexOf('/theme-universe-v806.css')>html.indexOf('/workspace-v80.css'),'Universe overrides must load last');
assert.ok(universe.includes('BACK2U V8.0.6 / Theme Universe visual overhaul'));
for(const id of ['ex05','ex06','ex19','ex04','ex20','n24','n15','n04'])
 assert.ok(universe.includes('data-theme-id="'+id+'"'),'Missing theme direction '+id);
assert.ok(universe.includes('backdrop-filter:none!important'),'Universe should avoid scroll-time backdrop sampling');
assert.ok(universe.includes('background-attachment:scroll!important'),'Universe artwork must not use fixed wallpaper');
assert.ok(!universe.includes('filter:blur('),'Universe effect should not reintroduce heavy blur');


const visualRescue=readFileSync(new URL('../site/theme-art-direction-v809.css',import.meta.url),'utf8');
const atlas=readFileSync(new URL('../site/theme-worlds-v809.jpg',import.meta.url));

const newAtlas=readFileSync(new URL('../site/theme-worlds-v810.jpg',import.meta.url));
const newScenes=readFileSync(new URL('../site/theme-photo-v810.css',import.meta.url),'utf8');

const newestAtlas=readFileSync(new URL('../site/theme-worlds-v811.jpg',import.meta.url));
const newestScenes=readFileSync(new URL('../site/theme-photo-v811.css',import.meta.url),'utf8');
assert.ok(newestAtlas.length>200000,'V8.1.1 photo atlas must be self-hosted and high-detail');
assert.ok(html.includes('href="/theme-photo-v811.css?v=1"'),'V8.1.1 photo CSS must load');
assert.ok(html.indexOf('/theme-photo-v811.css')>html.indexOf('/theme-photo-v810.css'),'V8.1.1 overrides must load after prior themes');
for(const id of ['ex17','ex19','ex20','ex01'])assert.ok(newestScenes.includes('data-theme-id="'+id+'"'),'Missing V8.1.1 photo world '+id);
assert.ok(!newestScenes.includes('filter:blur('),'Photorealistic art must not add GPU blur');

assert.ok(newAtlas.length>200000,'V8.1 photo atlas must be self-hosted and not a placeholder');
assert.ok(html.includes('href="/theme-photo-v810.css?v=1"'),'V8.1 photo CSS is linked');
assert.ok(html.indexOf('/theme-photo-v810.css')>html.indexOf('/theme-art-direction-v809.css'),'New photo art must load last');
for(const id of ['ex13','ex14','ex15','ex16'])assert.ok(newScenes.includes('data-theme-id="'+id+'"'),'Missing v810 theme art '+id);
assert.ok(!newScenes.includes('filter:blur('),'New art cannot introduce GPU blur filters');

assert.ok(atlas.length>150000,'Cinematic four-world atlas must be bundled locally, not remote or placeholder');
assert.ok(visualRescue.includes('theme-worlds-v809.jpg'),'Dedicated photographic worlds must be styled');
for(const id of ['ex05','ex06','ex18','ex04'])assert.ok(visualRescue.includes('data-theme-id="'+id+'"'),'Missing photo-scene mapping '+id);

assert.ok(html.includes('href="/theme-art-direction-v809.css?v=1"'),'visual rescue stylesheet must load');
assert.ok(html.indexOf('/theme-art-direction-v809.css')>html.indexOf('/theme-retina-v808.css'),'visual rescue must be last');
assert.ok(visualRescue.includes('display:none!important'),'KPI hero wallpaper must be removed');
assert.ok(visualRescue.includes('data-reference-layout="sidebar"'),'high-specificity fixed sidebar scene must be disabled');
assert.ok(visualRescue.includes('background-attachment:scroll!important'),'wallpaper must not be fixed');
assert.ok(!visualRescue.includes('filter:blur('),'must not reintroduce scroll-time blur');

const retinaCss=readFileSync(new URL('../site/theme-retina-v808.css',import.meta.url),'utf8');
const retinaArt=readFileSync(new URL('../site/theme-worlds-v808.js',import.meta.url),'utf8');
const retinaStage=readFileSync(new URL('../site/theme-stage-v808.js',import.meta.url),'utf8');
new vm.Script(retinaArt,{filename:'theme-worlds-v808.js'});
new vm.Script(retinaStage,{filename:'theme-stage-v808.js'});
assert.ok(html.includes('href="/theme-retina-v808.css?v=1"'),'Retina CSS must load');
assert.ok(html.includes('src="/theme-worlds-v808.js?v=1" defer'),'Retina art generator must load');
assert.ok(html.includes('src="/theme-stage-v808.js?v=1" defer'),'Retina stage must load');
assert.ok(html.indexOf('/theme-retina-v808.css')>html.indexOf('/theme-cinematic-v807.css'),'Retina styles must win the cascade');
assert.ok(html.indexOf('/reference-theme-art.js')<html.indexOf('/theme-worlds-v808.js'),'Retina scenes must wrap the original art engine');
assert.ok(html.indexOf('/theme-worlds-v808.js')<html.indexOf('/theme-studio.js'),'Theme Studio must receive upgraded art');
assert.ok(retinaArt.includes('viewBox="0 0 1920 1080"'),'Retina vector viewbox must be high resolution');
assert.ok(retinaArt.includes("ex05:'backrooms'")&&retinaArt.includes("ex06:'corvette'"));
assert.ok(retinaCss.includes('.theme-world-stage')&&retinaCss.includes('.theme-hero-stage'));
assert.ok(retinaCss.includes('data-reference-layout'),'Legacy sidebar rules must be overridden');
assert.ok(!retinaCss.includes('filter:blur('),'Retina visual layer cannot add expensive blur');
assert.ok(retinaStage.includes('back2u-theme-changed'),'Art stage must respond to theme changes');

const themeSource=readFileSync(new URL('../site/theme-studio.js',import.meta.url),'utf8');

new vm.Script(themeSource,{filename:'theme-studio.js'});
assert.ok(html.includes('src="/theme-studio.js?v=11" defer'),'Optimized Theme Studio must bypass stale browser JS cache');
assert.ok(themeSource.includes('const photoThemeIds=new Set('),'Self-hosted photo themes should skip redundant vector previews');
assert.ok(html.includes('href="/theme-studio.css?v=2"'),'Touch-friendly theme controls must load');
assert.ok(themeSource.includes("item.addEventListener('change',commit)"),'iOS select/color controls must commit on change');

assert.ok(themeSource.includes("typeof IntersectionObserver==='function'"),'Theme Studio should lazily render visible vector artwork');
assert.ok(themeSource.includes("el('themeStudioPanel')?.hidden"),'Hidden studio must not render 56 cards during normal navigation');
const photoMatch=themeSource.match(/const photoThemeIds=new Set\(\[([^\]]+)\]\)/);
assert.ok(photoMatch,'Photo theme list must be explicit and stable');
const photographed=photoMatch[1].match(/'ex\d{2}'/g)||[];
assert.equal(photographed.length,20,'All 20 Extreme photographic themes must bypass legacy vector thumbnails');

const v814Css=readFileSync(new URL('../site/theme-photo-v814.css',import.meta.url),'utf8');
assert.ok(html.includes('href="/theme-photo-v814.css?v=1"'),'V814 photo CSS must load');
assert.ok(html.indexOf('/theme-photo-v814.css')>html.indexOf('/theme-photo-v813.css'),'V814 CSS must be last');
for(const [id,slug] of [['ex09','lunar'],['ex10','sakura'],['ex11','ice'],['ex12','eclipse']]){
 const image=readFileSync(new URL('../site/theme-world-v814-'+slug+'.jpg',import.meta.url));
 assert.ok(image.length>35000,'High-detail local art missing for '+id);
 assert.ok(v814Css.includes('data-theme-id="'+id+'"'),'Missing theme mapping '+id);
 assert.ok(photographed.includes("'"+id+"'"),'V814 photo theme must skip SVG '+id);
}
assert.ok(!v814Css.includes('filter:blur('),'V814 art must not add GPU blur');


const v813Atlas=readFileSync(new URL('../site/theme-worlds-v813.jpg',import.meta.url));
const v813Styles=readFileSync(new URL('../site/theme-photo-v813.css',import.meta.url),'utf8');
assert.ok(v813Atlas.length>100000,'New 4-world atlas must be a real local image');
assert.ok(html.includes('href="/theme-photo-v813.css?v=1"'),'New theme CSS must be linked');
assert.ok(html.indexOf('/theme-photo-v813.css')>html.indexOf('/theme-photo-v811.css'),'New theme CSS must be loaded after prior world styles');
for(const id of ['ex02','ex03','ex07','ex08']){
 assert.ok(v813Styles.includes('data-theme-id="'+id+'"'),'Missing photo theme '+id);
 assert.ok(photographed.includes("'"+id+"'"),'Photo theme must skip redundant SVG '+id);
}
assert.ok(!v813Styles.includes('filter:blur('),'New artwork cannot add expensive GPU blur');


const artSource=readFileSync(new URL('../site/reference-theme-art.js',import.meta.url),'utf8');
const catalog=themeSource.match(/'((?:ex|fa|n)\d{2})\|/g)||[];
assert.equal(catalog.length,56,'Original 36 plus 20 Extreme themes');
for(let i=13;i<=20;i++){
 const id='ex'+i;
 assert.ok(themeSource.includes("'"+id+"|"),'Missing new preset '+id);
 assert.ok(artSource.includes(id+':['),'Missing custom artwork '+id);
}
assert.ok(css.includes('Legacy Theme Remaster'));
assert.ok(artSource.includes('Remastered legacy artwork'));
assert.ok(!css.includes('filter:blur(90px)'));

const stories=readFileSync(new URL('../site/story-composer-v3.js',import.meta.url),'utf8');
const themes=readFileSync(new URL('../site/theme-studio.js',import.meta.url),'utf8');
const v78=readFileSync(new URL('../site/workspace-v78.css',import.meta.url),'utf8');

new vm.Script(ux,{filename:'workspace-v80.js'});
new vm.Script(stories,{filename:'story-composer-v3.js'});
assert.ok(html.includes('href="/workspace-v80.css?v=5"'),'Current workspace CSS must be cache-busted after scroll fixes');
assert.ok(html.includes('src="/workspace-v80.js?v=2" defer'));
assert.ok(html.includes('src="/story-composer-v3.js?v=7" defer'));
assert.ok(html.indexOf('src="/workspace-v80.js?v=2"')>html.indexOf('src="/audience-import.js?v=4"'),
 'Interaction enhancements must follow authenticated existing renderers and themes');
assert.ok(v78.includes('grid-template-areas:"side notice" "side content"'),
 'V8 must preserve the V7.8 verified desktop/iPhone base');
assert.ok(html.includes('id="mobileBottomNav"'));
assert.ok(html.includes('id="mobileMoreDrawer"'));

for(const id of [
 'videos','videoSearch','topSevenCard','videoList','topSevenRefresh','topSevenList',
 'creator','creatorCalendar','creatorGoals','v7TextStudio','v7Planner','creatorIdeaInput','creatorHall',
 'audience','audienceCards','experiments','uploadChart','experimentAb','roadmap',
 'system','connectionCards','qualityMatrix','audienceAutoSyncStatus','guestAccessPanel',
 'themeStudioToggle','storyModeToggle','refreshBtn','mobileMoreClose','tiktokArchiveRow',
]){
 assert.ok(html.includes('id="'+id+'"'),'Missing existing anchor used by V8: '+id);
}
const jumps=[...ux.matchAll(/'([a-z]+(?:-[a-z]+)+)':'(#[A-Za-z][A-Za-z0-9]*)'/g)];
assert.ok(jumps.length>=13,'Section quick actions must cover all existing workspaces');
for(const [,name,selector] of jumps)assert.ok(html.includes('id="'+selector.slice(1)+'"'),
 'Quick action '+name+' must have real anchor '+selector);
assert.ok(ux.includes("document.addEventListener('click',e=>"));
assert.ok(ux.includes("e.target.closest?.('[data-v80-action]')"));
assert.ok(ux.includes("node.scrollIntoView({block:'start',behavior:'smooth'})"));
assert.ok(ux.includes("themeFavorites();storyWorkspace();videoWorkspace();creatorWorkspace();audienceWorkspace()"));
assert.ok(ux.includes("experimentsWorkspace();systemWorkspace();moreWorkspace()"));
assert.ok(ux.includes("new MutationObserver(records=>"));
assert.ok(ux.includes("observer.observe(cards,{childList:true})"));
assert.ok(ux.includes("node.hidden=!visible"),'Audience filters must change presentation, not data');
assert.ok(ux.includes("selected==='all'||title.includes(labels[selected])"));
assert.ok(ux.includes("const themes=window.BACK2U_THEMES"));
assert.ok(ux.includes("themes.use(id)"),'Quick palette choice must persist through official theme API');
for(const id of ['ex01','ex02','ex03','ex04','ex05','ex06','n24','n04'])assert.ok(ux.includes("'"+id+"'"));
assert.ok(ux.includes("original")===false||!ux.includes("state.edits={}"),
 'Theme quick picks must not wipe saved customizations');
assert.ok(ux.includes("const maintenance=section.querySelector('.video-sync-row')"));
assert.ok(ux.includes("details.append(maintenance)"));
assert.ok(ux.includes("details.append(archive)"));
assert.ok(ux.includes("const first=controls.querySelector('.story-input-grid')"));
assert.ok(ux.includes("advanced.append(cursor)"));
assert.ok(ux.includes("if(heading)heading.insertAdjacentElement('afterend',nav)"));

const typesSlice=stories.slice(stories.indexOf('const TYPES='),stories.indexOf('const TYPESET='));
const modelTypes=[...typesSlice.matchAll(/\['([^']+)','[^']+'\]/g)].map(x=>x[1]);
const templateSnippet=stories.slice(stories.indexOf('const QUICK_TEMPLATES='),stories.indexOf('const defaults='));
assert.ok(templateSnippet.startsWith('const QUICK_TEMPLATES='));
const templates=vm.runInNewContext(templateSnippet+';QUICK_TEMPLATES',Object.create(null));
assert.equal(templates.length,4,'Exactly four curated story templates');
assert.deepEqual(Array.from(templates.map(t=>t.id)),['momentum','platforms','best','week']);
for(const t of templates){
 assert.ok(typeof t.title==='string'&&t.title.length<=56);
 assert.ok([7,28,90].includes(t.days));
 assert.ok(['bold','balanced','compact'].includes(t.layout));
 assert.equal(t.slots.length,3);
 for(const slot of t.slots)assert.ok(modelTypes.includes(slot),
  'Story metric not supported by real compositor: '+slot);
}
assert.ok(stories.includes("composer.slides[composer.selected]=safeSlide({...current,"),
 'Templates must change exactly the current slide');
assert.ok(stories.includes("const current=selected()"));
assert.ok(stories.includes("persist();render()"));
assert.ok(stories.includes('id="scQuickTemplates"'));
assert.ok(stories.includes("data-story-template="));
assert.ok(stories.includes("aria-pressed',String(b===btn)"));
assert.ok(stories.includes("const KEY='back2u.story.composer.v3',MAX=8"),
 'Existing user slides and storage version must remain intact');

// The whole point is to keep original single-source-of-truth data intact.
assert.ok(!/fetch\s*\(/.test(ux),'V8 UI must never issue a second competing data fetch');
assert.ok(!/\/api\/|D1|CLOUDFLARE_API_TOKEN|BACK2U_GOOGLE_FEED_SECRET/.test(ux),
 'V8 UI must not introduce cloud writes, API routes or client-side credentials');
assert.ok(!ux.includes('innerHTML='));
assert.ok(themes.includes("window.BACK2U_THEMES={"));
assert.ok(themes.includes("const key='back2u-theme-studio-v1'"));
for(const marker of [
 '#videos.view.active{display:flex','#videos>.tools{order:2','#videos>#topSevenCard{order:4',
 '#creator>.v80-creator-jumps{order:1','#creator>.creator-panel{order:3',
 '#audienceCards .v7-audience-card[hidden]{display:none!important}',
 '#system>#audienceImportPanel{order:4','#system>#guestAccessPanel{order:5',
 '#themeStudioPanel .v80-theme-favorite-grid',
 '.story-overlay.story-composer-active .v80-story-presets',
 '.mobile-more-sheet .v80-more-actions'
])assert.ok(css.includes(marker),'Expected V8 responsive presentation: '+marker);
assert.ok(css.includes('@media(min-width:1240px)'));
assert.ok(css.includes('@media(min-width:761px) and (max-width:1239px)'));
assert.ok(css.includes('@media(max-width:760px)'));
assert.ok(css.includes('body[data-theme-tone] #dashboardWorkspace>.section-nav{display:none!important}'),
 'iPhone nav must override preexisting ui-v4 display:flex!important selector');
assert.ok(css.includes('@media(max-width:375px)'));
assert.ok(css.includes('@media(prefers-reduced-motion:reduce)'));
assert.ok(css.includes('var(--t-accent'));
console.log('OK V8.0 UX: no data scope changes, 36 existing themes, 4 safe story presets, mobile-first sections, owner-safe video controls, actual creator/audience/system anchors and no new API access');
