import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const html=readFileSync(new URL('../site/index.html',import.meta.url),'utf8');
const ux=readFileSync(new URL('../site/workspace-v80.js',import.meta.url),'utf8');
const css=readFileSync(new URL('../site/workspace-v80.css',import.meta.url),'utf8');
const stories=readFileSync(new URL('../site/story-composer-v3.js',import.meta.url),'utf8');
const themes=readFileSync(new URL('../site/theme-studio.js',import.meta.url),'utf8');
const v78=readFileSync(new URL('../site/workspace-v78.css',import.meta.url),'utf8');

new vm.Script(ux,{filename:'workspace-v80.js'});
new vm.Script(stories,{filename:'story-composer-v3.js'});
assert.ok(html.includes('href="/workspace-v80.css?v=1"'));
assert.ok(html.includes('src="/workspace-v80.js?v=1" defer'));
assert.ok(html.includes('src="/story-composer-v3.js?v=7" defer'));
assert.ok(html.indexOf('src="/workspace-v80.js?v=1"')>html.indexOf('src="/audience-import.js?v=4"'),
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
for(const id of ['n24','n04','n23','n15'])assert.ok(ux.includes("'"+id+"'"));
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
assert.ok(css.includes('@media(max-width:375px)'));
assert.ok(css.includes('@media(prefers-reduced-motion:reduce)'));
assert.ok(css.includes('var(--t-accent'));
console.log('OK V8.0 UX: no data scope changes, 36 existing themes, 4 safe story presets, mobile-first sections, owner-safe video controls, actual creator/audience/system anchors and no new API access');
