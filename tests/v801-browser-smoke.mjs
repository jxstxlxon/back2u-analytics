/**
 * Real Chromium smoke test against a LOCAL read-only static snapshot of the
 * private dashboard. No credentials, cookies, Cloudflare D1 access or live
 * account data. This test verifies actual responsive layout and controls,
 * not a simulated CSS string.
 *
 * Workflow installs Playwright + Chromium. Run only in isolated CI.
 */
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {chromium} from 'playwright';

const dir=path.resolve(fileURLToPath(new URL('../site/',import.meta.url)));
const type={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8',
 '.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg',
 '.json':'application/json'};
const server=createServer(async(req,res)=>{
 const u=new URL(req.url||'/', 'http://127.0.0.1');
 if(u.pathname.startsWith('/api/')){
  // The real account API is intentionally NEVER queried. Offline preview
  // falls back to its known static seed and preserves "not live" semantics.
  res.writeHead(503,{'content-type':'application/json','cache-control':'no-store'});
  res.end('{"error":"Offline QA: keine privaten API-Daten"}');return;
 }
 const p=path.resolve(dir,'.'+(u.pathname==='/'?'/index.html':u.pathname));
 if(!p.startsWith(dir+path.sep)){res.writeHead(403);res.end();return}
 try{
  const bytes=await readFile(p);
  res.writeHead(200,{'content-type':type[path.extname(p)]||'application/octet-stream',
   'cache-control':'no-store','x-content-type-options':'nosniff'});
  res.end(bytes);
 }catch{res.writeHead(404);res.end()}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const base='http://127.0.0.1:'+server.address().port;
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
const screenshotDir=path.resolve(process.cwd(),'artifacts','v809');
await mkdir(screenshotDir,{recursive:true});
async function shot(page,name){await page.screenshot({path:path.join(screenshotDir,name+'.png'),animations:'disabled'});}

async function createPage(name,viewport,flags={}){
 const page=await browser.newPage({viewport,deviceScaleFactor:flags.mobile?3:1,
  isMobile:!!flags.mobile,hasTouch:!!flags.mobile});
 const errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*',route=>{
  // Disable all third-party media and hosts; no credential/session leakage.
  if(!route.request().url().startsWith(base))return route.abort();
  return route.continue();
 });
 await page.goto(base+'/',{waitUntil:'domcontentloaded',timeout:45000});
 await page.waitForFunction(()=>document.documentElement.dataset.v80Ready==='true',undefined,{timeout:30000});
 await page.waitForFunction(()=>!!window.BACK2U_THEMES&&!!window.BACK2U_STORY_COMPOSER,undefined,{timeout:30000});
 const overflow=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,
  width:document.documentElement.clientWidth}));
 assert.ok(overflow.scroll<=overflow.width+24,
  name+' layout has horizontal overflow '+JSON.stringify(overflow));
 assert.deepEqual(errors,[],name+' has unhandled JavaScript page errors');
 return {page,errors};
}
try{
 const {page:phone,errors:phoneErrors}=await createPage('iPhone 390×844',{width:390,height:844},{mobile:true});


 assert.equal(await phone.locator('#mobileBottomNav').evaluate(x=>getComputedStyle(x).display),'grid',
  'iPhone uses fixed bottom navigation');
 const navStatus=await phone.locator('.section-nav').evaluate(x=>({
  display:getComputedStyle(x).display,parent:x.parentElement?.id||x.parentElement?.tagName,
  direct:x.matches('#dashboardWorkspace>.section-nav'),
  mq:matchMedia('(max-width:760px)').matches
 }));
 assert.equal(navStatus.display,'none',
  'iPhone hides desktop navigation; info='+JSON.stringify(navStatus));
 await phone.locator('#mobileBottomNav [data-section="videos"]').click();
 await phone.waitForFunction(()=>document.querySelector('#videos')?.classList.contains('active'));
 assert.ok(await phone.locator('#videoSearch').isVisible(),'Search is available above rankings');
 const search=await phone.locator('#videoSearch').boundingBox();
 const top=await phone.locator('#topSevenCard').boundingBox();
 assert.ok(search&&top&&search.y<top.y,'Video search precedes the 7d ranking on iPhone');
 await phone.locator('#mobileBottomNav [data-section="creator"]').click();
 await phone.waitForFunction(()=>document.querySelector('#creator')?.classList.contains('active'));
 assert.ok(await phone.locator('#creatorCalendar').isVisible());
 assert.equal(await phone.locator('#creator .v80-creator-jumps .v80-action').count(),6);
 await phone.locator('#mobileBottomNav [data-section="audience"]').click();
 await phone.waitForFunction(()=>document.querySelector('#audience')?.classList.contains('active'));
 assert.equal(await phone.locator('#audience .v80-audience-filter button').count(),4);
 await phone.locator('#audience .v80-audience-filter button[data-audience-type="age"]').click();
 assert.equal(await phone.locator('#audience .v80-filter-button[data-audience-type="age"]').getAttribute('aria-pressed'),'true');
 await phone.locator('#mobileMoreToggle').click();
 assert.ok(await phone.locator('#mobileMoreDrawer').isVisible());
 assert.equal(await phone.locator('#mobileMoreToggle').getAttribute('aria-expanded'),'true');
 assert.equal(await phone.locator('#mobileMoreDrawer [data-v80-action]').count(),2);
 await phone.locator('#mobileMoreDrawer [data-section="experiments"]').click();
 await phone.waitForFunction(()=>document.querySelector('#experiments')?.classList.contains('active'));
 assert.ok(await phone.locator('#mobileMoreDrawer').isHidden());

 // Theme updates go through the existing theme API. This is a disposable
 // local browser profile, never a user's real saved themes.
 assert.equal(await phone.locator('#themeGrid .theme-option').count(),0,
  'Closed Theme Studio must not build 56 unseen preview cards');

 // V8.4 acceptance: actual cover geometry, compact header and theme navigation.
 const initialCinematicTheme=await phone.evaluate(()=>window.BACK2U_THEMES.current());
 const cinematic=await phone.evaluate(()=>{
  const mast=document.querySelector('.masthead'),stage=mast.querySelector(':scope>.theme-world-stage');
  const top=document.querySelector('.topbar'),dock=mast.querySelector('.v831-world-actions');
  const prev=document.querySelector('#v840PrevWorld'),next=document.querySelector('#v840NextWorld');
  const number=document.querySelector('.v840-world-index');
  const stageR=stage.getBoundingClientRect(),mastR=mast.getBoundingClientRect();
  return {headerGrid:getComputedStyle(top).display,
   headerHeight:top.getBoundingClientRect().height,
   mastHeight:mastR.height,stageHeight:stageR.height,
   stageOpacity:getComputedStyle(stage).opacity,
   pagerVisible:!!prev?.getClientRects().length&&!!next?.getClientRects().length,
   dockHeight:dock.getBoundingClientRect().height,stampHeight:mast.querySelector('.theme-world-stamp').getBoundingClientRect().height,number:number?.textContent,
   textVisible:document.querySelector('.masthead h1').getBoundingClientRect().height>=60,
   overflow:document.documentElement.scrollWidth>document.documentElement.clientWidth+20};
 });
 assert.ok(cinematic.headerGrid==='grid'&&cinematic.headerHeight<=200&&
  cinematic.mastHeight>=300&&cinematic.mastHeight<=335&&cinematic.stageHeight>=300&&cinematic.stageOpacity==='1'&&
  cinematic.pagerVisible&&cinematic.dockHeight>=37&&cinematic.stampHeight>=74&&cinematic.textVisible&&!cinematic.overflow,
  'iPhone must have a genuinely new cinematic cover/command bar: '+JSON.stringify(cinematic));
 await phone.locator('#v840NextWorld').click();
 assert.notEqual(await phone.evaluate(()=>window.BACK2U_THEMES.current()),initialCinematicTheme,
  'Next world must switch actual UI theme');
 await phone.locator('#v840PrevWorld').click();
 assert.equal(await phone.evaluate(()=>window.BACK2U_THEMES.current()),initialCinematicTheme,
  'World pager must return to the original theme');
 for(const width of [320,390,430]){
  await phone.setViewportSize({width,height:844});
  const layout=await phone.evaluate(()=>{
   const h=document.querySelector('.masthead').getBoundingClientRect(),
    p=document.querySelector('#v840PrevWorld').getBoundingClientRect(),
    n=document.querySelector('#v840NextWorld').getBoundingClientRect();
   return {width:innerWidth,cover:h.height,prev:p.width,next:n.width,
    overflow:document.documentElement.scrollWidth>document.documentElement.clientWidth+20};
  });
  assert.ok(layout.cover>=280&&layout.cover<=338&&layout.prev>=35&&layout.next>=35&&!layout.overflow,
   'Cinematic composition must fit narrow phones without clipping: '+JSON.stringify(layout));
 }
 await phone.setViewportSize({width:390,height:844});


 // V8.4.1 user-supplied Safari screenshot bug regression:
 // eyebrow must not overlap headline; hero must no longer consume 443px.
 for(const width of [320,353,375,390,430]){
  await phone.setViewportSize({width,height:844});
  const visual=await phone.evaluate(()=>{
   const mast=document.querySelector('.masthead'),
     title=mast.querySelector('h1'),eyebrow=mast.querySelector('.eyebrow');
   const t=title.getBoundingClientRect(),e=eyebrow.getBoundingClientRect();
   const control=document.querySelector('.controlbar').getBoundingClientRect();
   return {width:innerWidth,heroHeight:mast.getBoundingClientRect().height,
    labelBottom:e.bottom,titleTop:t.top,titleBottom:t.bottom,
    controlsBottom:control.bottom,headlineVisible:t.height>=52,
    overflow:document.documentElement.scrollWidth>document.documentElement.clientWidth+18};
  });
  assert.ok(visual.labelBottom<=visual.titleTop-3,
   'Eyebrow/headline collision like user screenshot: '+JSON.stringify(visual));
  assert.ok(visual.heroHeight<=340&&visual.heroHeight>=277&&visual.controlsBottom<740&&
   visual.headlineVisible&&!visual.overflow,
   'Cinematic artwork must fit a realistic phone and reveal data faster: '+JSON.stringify(visual));
 }
 await phone.setViewportSize({width:390,height:844});

 // V8.3.1: real mobile world + useful inline controls. No screenshot-only test.
 const integratedWorld=await phone.evaluate(()=>{
  const mast=document.querySelector('.masthead'),stage=mast.querySelector(':scope>.theme-world-stage');
  const img=stage?.querySelector('img'),dock=mast.querySelector('.v831-world-actions');
  return {stageOpacity:stage?Number(getComputedStyle(stage).opacity):0,
   imageOpacity:img?Number(getComputedStyle(img).opacity):0,
   dockVisible:!!dock?.getClientRects().length,
   name:document.querySelector('#themeWorldName')?.textContent,
   width:document.documentElement.clientWidth,
   overflow:document.documentElement.scrollWidth>document.documentElement.clientWidth+20};
 });
 assert.ok(integratedWorld.stageOpacity>=.95&&integratedWorld.imageOpacity>=.85&&integratedWorld.dockVisible&&
  integratedWorld.name&&!integratedWorld.overflow,
  'iPhone should show actual world art and controls, not 35%-opacity wallpaper: '+JSON.stringify(integratedWorld));
 assert.ok(await phone.locator('.masthead .mast-right').isHidden(),
  'Glass tuning must not cover art by default on iPhone');
 await phone.locator('#v831GlassToggle').click();
 assert.equal(await phone.locator('#v831GlassToggle').getAttribute('aria-expanded'),'true');
 assert.ok(await phone.locator('.masthead .mast-right').isVisible()&&await phone.locator('#glassSlider').isVisible(),
  'Glass tuner must open with its original accessible range input');
 await phone.locator('#v831GlassToggle').click();
 assert.equal(await phone.locator('#v831GlassToggle').getAttribute('aria-expanded'),'false');
 assert.ok(await phone.locator('.masthead .mast-right').isHidden());
 await phone.locator('#v831OpenStudio').click();
 assert.ok(await phone.locator('#themeStudioPanel').isVisible(),
  'Header world action must open the actual Theme Studio');
 await phone.locator('#themeClose').click();

 await phone.locator('#themeStudioToggle').click();
 assert.ok(await phone.locator('#themeStudioPanel').isVisible());
 assert.equal(await phone.locator('#themeGrid .theme-option').count(),56,
  'Opening Theme Studio must show the full theme collection');


 // V8.2.1 mobile gallery regression: real card geometry and usable filter tabs,
 // Preserve the existing selected theme for all later, independent tests.
 const originalGalleryTheme=await phone.evaluate(()=>window.BACK2U_THEMES.current());
 // not only DOM count. The previous iPhone failure compressed cards into strips.
 for(const width of [320,390,430,760]){
  await phone.setViewportSize({width,height:844});
  const gallery=await phone.evaluate(()=>{
   const root=document.querySelector('#themeStudioPanel');
   const body=root.querySelector('.theme-dialog-body');
   const grid=root.querySelector('.theme-grid');
   const cards=[...grid.querySelectorAll('.theme-option')];
   const first=cards[0]?.getBoundingClientRect(),third=cards[2]?.getBoundingClientRect();
   const preview=cards[0]?.querySelector('.theme-option-preview').getBoundingClientRect();
   const tabs=root.querySelector('.theme-tabs').getBoundingClientRect();
   return {count:cards.length,cardHeight:first?.height,previewHeight:preview?.height,
    nextRowTop:third?.top,firstRowBottom:first?.bottom,
    gridHeight:grid.getBoundingClientRect().height,gridScroll:grid.scrollHeight,
    viewportOverflow:document.documentElement.scrollWidth>document.documentElement.clientWidth+20,
    bodyScroll:body.scrollHeight>body.clientHeight,
    tabsHeight:tabs.height,gridColumns:getComputedStyle(grid).gridTemplateColumns.split(' ').length};
  });
  assert.equal(gallery.count,56,'Full 56-card collection must remain available '+width);
  assert.ok(gallery.cardHeight>=165&&gallery.previewHeight>=85,
   'Theme previews must be full-size, not stripes: '+JSON.stringify({width,gallery}));
  assert.ok(gallery.nextRowTop>=gallery.firstRowBottom-2,
   'Theme preview grid rows must not overlap: '+JSON.stringify({width,gallery}));
  assert.equal(gallery.gridColumns,width<=820?2:3,'Two mobile columns required '+width);
  assert.ok(gallery.gridHeight>800&&gallery.bodyScroll&&!gallery.viewportOverflow,
   'Theme studio must scroll as one vertical view without horizontal overflow: '+JSON.stringify({width,gallery}));
  assert.ok(gallery.tabsHeight>=40,'Usable filter touch targets '+width);
 }
 await phone.setViewportSize({width:390,height:844});
 await phone.locator('#themeStudioPanel [data-family="aero"]').click();
 const aeroGalleryCount=await phone.locator('#themeGrid .theme-option').count();
 assert.ok(aeroGalleryCount>=10&&aeroGalleryCount<56,'Aero filter should show only matching themes');
 assert.equal(await phone.locator('#themeStudioPanel [data-family="aero"]').getAttribute('aria-pressed'),'true');
 const firstAero=phone.locator('#themeGrid .theme-option').first();
 const firstAeroId=await firstAero.getAttribute('data-preset');
 await firstAero.click();
 assert.equal(await phone.evaluate(()=>window.BACK2U_THEMES.current()),firstAeroId);
 assert.equal(await phone.locator('#themeGrid .theme-option[data-preset="'+firstAeroId+'"]').getAttribute('aria-pressed'),'true');
 await phone.locator('#themeStudioPanel [data-family="all"]').click();
 assert.equal(await phone.locator('#themeGrid .theme-option').count(),56);
 await phone.evaluate(id=>window.BACK2U_THEMES.use(id),originalGalleryTheme);

 const photoPreviews=await phone.evaluate(()=>{
  const ids=['ex05','ex13','ex17'],urls=['theme-worlds-v809.jpg','theme-worlds-v810.jpg','theme-worlds-v811.jpg'];
  return ids.map((id,i)=>{
   const card=document.querySelector('#themeGrid .theme-option[data-preset="'+id+'"]');
   return {id,vectorGenerated:!!card?.style.getPropertyValue('--ref-preview'),
    photoLoaded:getComputedStyle(card.querySelector('.theme-option-preview')).backgroundImage.includes(urls[i])};
  });
 });
 assert.ok(photoPreviews.every(x=>x.photoLoaded&&!x.vectorGenerated),
  'Photographic themes should use atlas imagery without generating redundant SVGs: '+JSON.stringify(photoPreviews));

 const legacyPhotoPreviews=await phone.evaluate(()=>['n24','n04','n15','n23'].map(id=>{
  const card=document.querySelector('#themeGrid .theme-option[data-preset="'+id+'"]');
  return {id,exists:!!card,vectorGenerated:!!card?.style.getPropertyValue('--ref-preview'),
   background:card?getComputedStyle(card.querySelector('.theme-option-preview')).backgroundImage:''};
 }));
 assert.ok(legacyPhotoPreviews.every(x=>x.exists&&!x.vectorGenerated&&x.background.includes('theme-worlds-v815.jpg')),
  'iPhone legacy photo thumbnails must use the local atlas rather than SVG: '+JSON.stringify(legacyPhotoPreviews));

 // V8.2.0 regression: temporarily expose the overview without mutating app state.
 // The preceding workflow intentionally left the Experiments view active.
 const originalActiveView=await phone.evaluate(()=>{
  const active=document.querySelector('#dashboardWorkspace>.view.active');
  document.querySelectorAll('#dashboardWorkspace>.view.active').forEach(e=>e.classList.remove('active'));
  document.querySelector('#overview').classList.add('active');
  return active?.id||null;
 });
 const originalPhoneViewport=phone.viewportSize();
 const mobileKpiQA=[];
 for(const width of [320,375,390,430]){
  await phone.setViewportSize({width,height:844});
  const snapshot=await phone.evaluate(()=>{
   const samples=[
    ['hero','#heroValue','1.234.567.890'],
    ['lifetime','#lifetimeViewsTotal','1.234.567.890'],
    ['platform','.platform-number','1.234.567.890'],
    ['follower','.follower-aggregate-total','1.234.567.890']
   ];
   const findings=[];
   for(const [label,selector,value] of samples){
    const el=document.querySelector(selector);
    if(!el)continue;
    const original=el.textContent;
    el.textContent=value;
    const style=getComputedStyle(el),range=document.createRange();
    range.selectNodeContents(el);
    findings.push({label,displayed:!!el.getClientRects().length,
     wraps:range.getClientRects().length>1,
     overflows:el.scrollWidth>el.clientWidth+3,
     nowrap:style.whiteSpace==='nowrap'});
    el.textContent=original;
   }
   const cards=[...document.querySelectorAll('#overview .platform-card')];
   return {width:innerWidth,findings,cardCount:cards.length,
    platformColumns:getComputedStyle(document.querySelector('#overview .platform-stack')).gridTemplateColumns.split(' ').length,
    horizontalOverflow:document.documentElement.scrollWidth>document.documentElement.clientWidth+20};
  });
  mobileKpiQA.push(snapshot);
  assert.ok(snapshot.findings.every(x=>x.displayed&&!x.wraps&&!x.overflows&&x.nowrap),
   'All genuine-size KPI values must remain single-line at '+width+': '+JSON.stringify(snapshot));
  assert.equal(snapshot.platformColumns,1,'Mobile platform metrics must be full-width on '+width+'px iPhones');
  assert.ok(!snapshot.horizontalOverflow,'Mobile layout must not scroll sideways at '+width+': '+JSON.stringify(snapshot));
 }
 if(originalPhoneViewport)await phone.setViewportSize(originalPhoneViewport);
 await phone.evaluate(id=>{
  document.getElementById('overview').classList.remove('active');
  if(id)document.getElementById(id)?.classList.add('active');
 },originalActiveView);

 const firstVector=phone.locator('#themeGrid .theme-option[data-preset="n01"]');
 await firstVector.scrollIntoViewIfNeeded();
 await phone.waitForFunction(()=>!!document.querySelector('#themeGrid .theme-option[data-preset="n01"]')?.style.getPropertyValue('--ref-preview'),
  null,{timeout:10000});
 assert.ok((await firstVector.evaluate(x=>x.style.getPropertyValue('--ref-preview'))).includes('data:image/svg+xml'),
  'Visible non-photo previews must still appear on demand');
 // Basic theme values must be usable on an actual touch-size viewport.
 // Check persisted values and active CSS, not just the presence of inputs.
 await phone.locator('#theme_accent').fill('#2277ee');
 assert.equal(await phone.evaluate(()=>document.documentElement.style.getPropertyValue('--t-accent').trim()),'#2277ee',
  'iPhone color control must update active dashboard accent');
 await phone.locator('#theme_layout').selectOption('wide');
 assert.equal(await phone.evaluate(()=>document.body.dataset.referenceLayout),'wide',
  'iPhone layout selector must update the actual dashboard');
 await phone.locator('#theme_chartMode').selectOption('bar');
 assert.equal(await phone.evaluate(()=>window.BACK2U_THEMES.get(window.BACK2U_THEMES.current()).chartMode),'bar',
  'iPhone chart-mode basic control must update the active selection');
 const glow=phone.locator('#theme_glow');
 await glow.scrollIntoViewIfNeeded();
 await glow.evaluate(e=>{e.value='79';e.dispatchEvent(new Event('change',{bubbles:true}));});
 assert.equal(await phone.evaluate(()=>document.documentElement.style.getPropertyValue('--t-glow').trim()),'0.79',
  'iPhone range final change must commit the glow value');
 await phone.locator('#themeReset').click();
 assert.equal(await phone.locator('#theme_accent').inputValue(),'#2fbbff',
  'iPhone reset must restore the preset primary color');
 assert.equal(await phone.locator('#theme_layout').inputValue(),'auto',
  'iPhone reset must restore original layout');
 assert.equal(await phone.evaluate(()=>document.documentElement.style.getPropertyValue('--t-glow').trim()),'0.55',
  'iPhone reset must restore base glow');
 assert.equal(await phone.locator('#themeStudioPanel .v80-theme-favorite').count(),8);
 await phone.locator('#themeStudioPanel [data-v80-theme="ex05"]').click();
 assert.equal(await phone.evaluate(()=>window.BACK2U_THEMES.current()),'ex05');
 await phone.locator('#themeStudioPanel [data-v80-theme="ex06"]').click();
 assert.equal(await phone.evaluate(()=>window.BACK2U_THEMES.current()),'ex06');
 await phone.locator('#themeClose').click();
 const mobileHeadline=await phone.evaluate(()=>{
  const h=document.querySelector('.masthead h1'),r=h.getBoundingClientRect();
  const mast=document.querySelector('.masthead').getBoundingClientRect();
  const st=getComputedStyle(h);
  return {visible:st.display!=='none'&&st.visibility!=='hidden',width:r.width,height:r.height,
    inside:r.top>=mast.top&&r.bottom<=mast.bottom+1,text:h.textContent,
    background:getComputedStyle(document.querySelector('.masthead')).backgroundImage};
 });
 assert.ok(mobileHeadline.visible&&mobileHeadline.height>=55&&mobileHeadline.inside,
  'iPhone must show actual hero title: '+JSON.stringify(mobileHeadline));
 assert.ok(!mobileHeadline.background.includes('data:image/svg+xml'),
  'Photo themes must not retain giant obsolete SVG car behind their photo');
 await shot(phone,'iphone-black-corvette');
 await phone.locator('#themeStudioToggle').click();
 await phone.waitForFunction(()=>document.querySelector('.theme-world-stage img')?.src.startsWith('data:image/svg+xml,'));
 const retinaScene=await phone.evaluate(async()=>{
  const stage=document.querySelector('.theme-world-stage img');
  await stage.decode();
  const mast=document.querySelector('.masthead');
  const style=getComputedStyle(mast);
  const sceneSvg=decodeURIComponent(stage.src.slice('data:image/svg+xml,'.length));
  return {world:document.querySelector('.theme-world-stage-info strong')?.textContent,
   retina:sceneSvg.includes('viewBox="0 0 1920 1080"'),
   fullWidth:stage.getBoundingClientRect().width>=mast.getBoundingClientRect().width-2,
   background:style.backgroundImage.includes('data:image/svg+xml'),
   hero:!!document.querySelector('#overview .theme-hero-stage img'),
   height:mast.getBoundingClientRect().height};
 });
 assert.equal(retinaScene.world,'Black Corvette');
 assert.ok(retinaScene.retina,'Retina vector art uses 1920x1080 coordinates');
 assert.ok(!retinaScene.background,'Photographic masthead must no longer render obsolete SVG background');
 assert.ok(retinaScene.fullWidth,'Scene image covers header at 3x iPhone DPR');
 assert.ok(retinaScene.hero,'Theme art also exists in real KPI hero');
 assert.ok(retinaScene.height>=320,'Mobile hero has meaningful image area');

 const sceneStyle=await phone.evaluate(()=>({
  image:getComputedStyle(document.querySelector('.masthead')).backgroundImage,
  label:document.querySelector('#themeWorldName')?.textContent,
  artwork:document.body.dataset.themeArtwork
 }));
 assert.ok(!sceneStyle.image.includes('data:image/svg+xml'),'Only the actual photograph should appear behind the Corvette hero');
 assert.equal(sceneStyle.label,'BLACK CORVETTE');

 const photoWorld=await phone.evaluate(async()=>{
  const background=getComputedStyle(document.querySelector('.masthead>.theme-world-stage')).backgroundImage;
  const img=new Image();
  img.src='/theme-worlds-v809.jpg';
  await img.decode();
  return {background,loaded:img.complete,width:img.naturalWidth,height:img.naturalHeight};
 });
 assert.ok(photoWorld.background.includes('theme-worlds-v809.jpg'),'Selected theme uses new photo-based scene');
 assert.ok(photoWorld.loaded&&photoWorld.width>=1200,'Self-hosted atlas decodes at high resolution');


 const cinematicContrast=await phone.evaluate(()=>{
  const img=document.querySelector('.masthead > .theme-world-stage');
  const mast=document.querySelector('.masthead');
  const hero=document.querySelector('#overview .hero-main');
  const stage=document.querySelector('#overview .theme-hero-stage');
  const bodyBg=getComputedStyle(document.body).backgroundImage;
  const kpiBg=getComputedStyle(hero).backgroundImage;
  const mastBg=getComputedStyle(mast).backgroundImage;
  return {
   bodyImage:bodyBg.includes('data:image/svg+xml'),
   heroImage:kpiBg.includes('data:image/svg+xml'),
   sceneOnly:getComputedStyle(stage).display==='none',
   stageRatio:img.getBoundingClientRect().width/mast.getBoundingClientRect().width,
   stageOpacity:Number.parseFloat(getComputedStyle(img).opacity),
   mastImage:mastBg.includes('data:image/svg+xml'),
   width:document.documentElement.scrollWidth,
   viewport:document.documentElement.clientWidth
  };
 });
 assert.ok(!cinematicContrast.bodyImage,'No huge wallpaper behind entire dashboard');
 assert.ok(!cinematicContrast.heroImage&&cinematicContrast.sceneOnly,'Real KPIs must not be cartoon wallpaper');
 assert.ok(cinematicContrast.stageRatio<=1.01&&cinematicContrast.stageOpacity<=.45,'On phone, background art must be dimmed: '+JSON.stringify(cinematicContrast));
 assert.ok(!cinematicContrast.mastImage,'Legacy background SVG must be removed from photographic hero');
 assert.ok(cinematicContrast.width<=cinematicContrast.viewport+24,'No mobile horizontal overflow');

 assert.equal(sceneStyle.artwork,'on');


 assert.ok(await phone.evaluate(()=>window.BACK2U_THEMES.use('ex19')));
 await phone.waitForFunction(()=>document.body.dataset.themeId==='ex19');
 const redlineMobile=await phone.evaluate(()=>{
  const hero=document.querySelector('#overview .hero-main');
  const h=document.querySelector('.masthead h1');
  return {mesh:getComputedStyle(hero,'::before').backgroundImage,
   titleHeight:h.getBoundingClientRect().height,
   overflow:document.documentElement.scrollWidth>document.documentElement.clientWidth+20};
 });
 assert.ok(redlineMobile.mesh.includes('theme-momentum-mesh-v816.svg')&&redlineMobile.titleHeight>40&&!redlineMobile.overflow,
  'iPhone must render reference-grade design without hiding the real headline');
 await phone.locator('#themeClose').click();
 await shot(phone,'iphone-v816-reference-hyperdrive');
 await phone.locator('#themeStudioToggle').click();
 await phone.locator('#themeStudioPanel [data-v80-theme="n04"]').click();
 assert.equal(await phone.evaluate(()=>window.BACK2U_THEMES.current()),'n04');
 await phone.locator('#themeClose').click();
 await phone.locator('#storyModeToggle').click();
 await phone.waitForFunction(()=>document.querySelector('#storyOverlay')?.classList.contains('story-composer-active'));
 assert.equal(await phone.locator('#scQuickTemplates [data-story-template]').count(),4);
 assert.ok(await phone.locator('#scPreview').isVisible());
 assert.ok(await phone.locator('#storyEditorRoot .v80-story-customize').isVisible());
 assert.equal(await phone.locator('#storyEditorRoot .v80-story-customize').getAttribute('open'),null,
  'Advanced story settings start collapsed on iPhone');
 await phone.locator('#scQuickTemplates [data-story-template="week"]').click();
 const slide=await phone.evaluate(()=>window.BACK2U_STORY_COMPOSER.getSlides()[0]);
 assert.equal(slide.days,7);
 assert.deepEqual(slide.slots,['views','average','trend']);
 await phone.locator('#storyEditorRoot .v80-story-customize summary').click();
 assert.ok(await phone.locator('#scDays').isVisible());
 await phone.locator('#storyClose').click();
 assert.ok(await phone.locator('#storyOverlay').isHidden());
 assert.deepEqual(phoneErrors,[],'iPhone interactions must not generate JS exceptions');
 console.log('OK Chromium iPhone 390: bottom nav, video hierarchy, creator, audience, More, light theme, story templates and advanced editor');
 await phone.close();

 const {page:ipad,errors:ipadErrors}=await createPage('iPad 834×1112',{width:834,height:1112});

 assert.ok(await ipad.locator('.v831-world-actions').isHidden(),
  'iPad keeps the regular desktop/tablet control layout');
 assert.ok(await ipad.locator('.masthead .mast-right').isVisible(),
  'iPad glass tuning stays available without mobile overlay');

 assert.equal(await ipad.locator('#mobileBottomNav').evaluate(x=>getComputedStyle(x).display),'none');
 assert.notEqual(await ipad.locator('#dashboardWorkspace>.section-nav').evaluate(x=>getComputedStyle(x).display),'none');
 await ipad.locator('#dashboardWorkspace>.section-nav [data-section="videos"]').click();
 assert.ok(await ipad.locator('#videoSearch').isVisible());
 assert.deepEqual(ipadErrors,[]);
 console.log('OK Chromium iPad 834: horizontal navigation, video library and no accidental phone bottom bar');
 await ipad.close();

 const {page:desktop,errors:desktopErrors}=await createPage('Desktop 1440×900',{width:1440,height:900});

 // V8.3: inspect actual material/hero DOM from all 56 existing themes.
 // Use a disposable Chromium browser profile and restore the original preset.
 const v830Audit=await desktop.evaluate(()=>{
  const themes=window.BACK2U_THEMES;
  const originals=themes.list(),saved=themes.current();
  const seen=new Set(),issues=[];
  for(const t of originals){
   if(!themes.use(t.id)){issues.push(t.id+':cannot select');continue;}
   const signature=getComputedStyle(document.body).getPropertyValue('--v830-signature').trim();
   const hero=getComputedStyle(document.querySelector('#overview .hero-main'));
   const head=document.querySelector('.masthead h1');
   const img=document.querySelector('.masthead>.theme-world-stage img');
   const isPhoto=/^(ex\d\d|n04|n15|n23|n24)$/.test(t.id);
   const vectorUri=img?.getAttribute('src')||'';
   const matchingSvg=isPhoto||(
     vectorUri.startsWith('data:image/svg+xml,')&&
     decodeURIComponent(vectorUri.slice('data:image/svg+xml,'.length)).includes('data-back2u-signature="'+t.id+'"'));
   if(!signature.includes('"'+t.id+'-'))issues.push(t.id+':wrong CSS signature '+signature);
   if(seen.has(signature))issues.push(t.id+':duplicate CSS signature');
   if(!matchingSvg)issues.push(t.id+':missing unique vector overlay');
   if(!hero.backgroundImage.includes('gradient'))issues.push(t.id+':no material background');
   if(!head||head.getBoundingClientRect().height<30)issues.push(t.id+':hidden headline');
   const fullStage=document.querySelector('.masthead>.theme-world-stage')?.getBoundingClientRect();
   const headerBox=document.querySelector('.masthead').getBoundingClientRect();
   if(!fullStage||fullStage.width<headerBox.width-3)issues.push(t.id+':scene too narrow');
   seen.add(signature);
  }
  themes.use(saved);
  return {total:originals.length,unique:seen.size,issues,
   overflow:document.documentElement.scrollWidth>document.documentElement.clientWidth+24};
 });
 assert.equal(v830Audit.total,56,'All previous 56 theme IDs must remain selectable');
 assert.equal(v830Audit.unique,56,'Every existing theme must have a distinct computed material signature');
 assert.deepEqual(v830Audit.issues,[],'Theme world remaster missing some real artwork/materials: '+JSON.stringify(v830Audit.issues));
 assert.ok(!v830Audit.overflow,'Full theme sweep must not cause horizontal desktop overflow');


 assert.ok(await desktop.locator('#v840PrevWorld').isHidden()&&await desktop.locator('#v840NextWorld').isHidden(),
  'Only the iPhone experience should show the world pager');
 const desktopWorld=await desktop.evaluate(()=>{
  const s=document.querySelector('.masthead>.theme-world-stage');
  return {height:document.querySelector('.masthead').getBoundingClientRect().height,
   stageWidth:s.getBoundingClientRect().width,headerWidth:document.querySelector('.masthead').getBoundingClientRect().width};
 });
 assert.ok(desktopWorld.height>=370&&desktopWorld.stageWidth>=desktopWorld.headerWidth-2,
  'Desktop must display a full-width theme image, not the old 63%-width strip: '+JSON.stringify(desktopWorld));

 const desktopRetina=await desktop.evaluate(async()=>{
  const img=document.querySelector('.theme-world-stage img');
  await img.decode();
  const header=document.querySelector('.masthead');
  return {width:img.getBoundingClientRect().width,
   height:header.getBoundingClientRect().height,
   sharp:decodeURIComponent(img.src.slice('data:image/svg+xml,'.length)).includes('viewBox="0 0 1920 1080"')};
 });
 assert.ok(desktopRetina.width>=900&&desktopRetina.width<=1300&&desktopRetina.height>=370&&desktopRetina.sharp,
  'Desktop must render a large true vector illustration: '+JSON.stringify(desktopRetina));
 for(const id of ['ex06','ex05','ex18','ex04']){
  assert.ok(await desktop.evaluate(id=>window.BACK2U_THEMES.use(id),id));
  await desktop.waitForFunction(id=>document.body.dataset.themeId===id,id);
  const desktopHeroBackground=await desktop.evaluate(()=>getComputedStyle(document.querySelector('.masthead')).backgroundImage);
  assert.ok(!desktopHeroBackground.includes('data:image/svg+xml'),
   'Photo worlds must not stack geometric SVG with photographic atlas: '+id);
  await shot(desktop,'desktop-'+id);
 }

 for(const id of ['ex13','ex14','ex15','ex16']){
  assert.ok(await desktop.evaluate(id=>window.BACK2U_THEMES.use(id),id));
  await desktop.waitForFunction(id=>document.body.dataset.themeId===id,id);
  const scene=await desktop.evaluate(async()=>{
   const img=new Image();
   img.src='/theme-worlds-v810.jpg';
   await img.decode();
   const header=document.querySelector('.masthead');
   const stage=document.querySelector('.masthead>.theme-world-stage');
   return {image:img.naturalWidth,stage:getComputedStyle(stage).backgroundImage,
    oldSvg:getComputedStyle(header).backgroundImage.includes('data:image/svg+xml'),
    stillThere:!!document.querySelector('.masthead h1')};
  });
  assert.ok(scene.image>=1200&&scene.stage.includes('theme-worlds-v810.jpg'), 'Photo theme must have real image: '+id);
  assert.ok(!scene.oldSvg&&scene.stillThere,'Photo scene must not draw old SVG or hide actual heading: '+id);
  await shot(desktop,'desktop-'+id);
 }

 for(const id of ['ex17','ex19','ex20','ex01']){
  assert.ok(await desktop.evaluate(id=>window.BACK2U_THEMES.use(id),id),'Theme selection failed: '+id);
  await desktop.waitForFunction(id=>document.body.dataset.themeId===id,id);
  const scene=await desktop.evaluate(async()=>{
   const img=new Image();
   img.src='/theme-worlds-v811.jpg';
   await img.decode();
   const masthead=document.querySelector('.masthead');
   const stage=document.querySelector('.masthead>.theme-world-stage');
   const title=masthead.querySelector('h1');
   const rect=title.getBoundingClientRect();
   return {image:img.naturalWidth,
    stage:getComputedStyle(stage).backgroundImage,
    oldSvg:getComputedStyle(masthead).backgroundImage.includes('data:image/svg+xml'),
    heading:rect.height>50&&getComputedStyle(title).display!=='none',
    overflow:document.documentElement.scrollWidth>document.documentElement.clientWidth+20};
  });
  assert.ok(scene.image>=1200&&scene.stage.includes('theme-worlds-v811.jpg'),'Photo world must display actual image: '+id);
  assert.ok(!scene.oldSvg&&scene.heading&&!scene.overflow,'No obsolete SVG, hidden heading or viewport overflow: '+id+' '+JSON.stringify(scene));
  await shot(desktop,'desktop-'+id);
 }

 for(const id of ['ex02','ex03','ex07','ex08']){
  assert.ok(await desktop.evaluate(id=>window.BACK2U_THEMES.use(id),id),'Theme selection failed '+id);
  await desktop.waitForFunction(id=>document.body.dataset.themeId===id,id);
  const imageTest=await desktop.evaluate(async()=>{
   const img=new Image();img.src='/theme-worlds-v813.jpg';await img.decode();
   const stage=document.querySelector('.masthead>.theme-world-stage');
   const mast=document.querySelector('.masthead');
   const h=mast.querySelector('h1'),r=h.getBoundingClientRect();
   return {width:img.naturalWidth,image:getComputedStyle(stage).backgroundImage,
    vector:getComputedStyle(mast).backgroundImage.includes('data:image/svg+xml'),
    heading:r.height>=50&&getComputedStyle(h).display!=='none',
    overflow:document.documentElement.scrollWidth>document.documentElement.clientWidth+24};
  });
  assert.ok(imageTest.width>=1200&&imageTest.image.includes('theme-worlds-v813.jpg'),
   'New world image must be loaded: '+id+' '+JSON.stringify(imageTest));
  assert.ok(!imageTest.vector&&imageTest.heading&&!imageTest.overflow,
   'Header must stay functional and avoid old SVG wallpaper: '+id+' '+JSON.stringify(imageTest));
  await shot(desktop,'desktop-'+id);
 }

 for(const [id,asset] of [['ex09','lunar'],['ex10','sakura'],['ex11','ice'],['ex12','eclipse']]){
  assert.ok(await desktop.evaluate(id=>window.BACK2U_THEMES.use(id),id),'Theme selection failed '+id);
  await desktop.waitForFunction(id=>document.body.dataset.themeId===id,id);
  const art=await desktop.evaluate(async(asset)=>{
   const img=new Image();img.src='/theme-world-v814-'+asset+'.jpg';await img.decode();
   const stage=document.querySelector('.masthead>.theme-world-stage');
   const mast=document.querySelector('.masthead'),h=mast.querySelector('h1'),rect=h.getBoundingClientRect();
   return {w:img.naturalWidth,image:getComputedStyle(stage).backgroundImage,
    legacySvg:getComputedStyle(mast).backgroundImage.includes('data:image/svg+xml'),
    heading:rect.height>50&&getComputedStyle(h).display!=='none',
    overflow:document.documentElement.scrollWidth>document.documentElement.clientWidth+24};
  },asset);
  assert.ok(art.w>=550&&art.image.includes('theme-world-v814-'+asset+'.jpg'),
   'Cinematic photo must load '+id+' '+JSON.stringify(art));
  assert.ok(!art.legacySvg&&art.heading&&!art.overflow,'Photo hero must remain usable '+id+' '+JSON.stringify(art));
  await shot(desktop,'desktop-'+id);
 }

 // The design must be visible in the real render, not only stylesheet text.
 assert.ok(await desktop.evaluate(()=>window.BACK2U_THEMES.use('ex19')));
 await desktop.waitForFunction(()=>document.body.dataset.themeId==='ex19');
 const redlineChrome=await desktop.evaluate(()=>{
  const top=document.querySelector('.topbar');
  const main=document.querySelector('#overview .hero-main');
  const nav=document.querySelector('#dashboardWorkspace>.section-nav');
  const cards=[...document.querySelectorAll('#platformStack .platform-card')];
  return {
   chrome:getComputedStyle(top).borderTopWidth,
   topLight:getComputedStyle(top,'::before').backgroundImage,
   mesh:getComputedStyle(main,'::before').backgroundImage,
   cards:cards.length,
   colors:cards.map(x=>getComputedStyle(x).borderLeftColor),
   navigation:getComputedStyle(nav.querySelector('button.active')).backgroundImage,
   heading:document.querySelector('.masthead h1').getBoundingClientRect().height,
   overflow:document.documentElement.scrollWidth>document.documentElement.clientWidth+20
  };
 });
 assert.ok(parseFloat(redlineChrome.chrome)>=1.5,'Retina top border missing: '+JSON.stringify(redlineChrome));
 assert.ok(redlineChrome.topLight.includes('linear-gradient'),'Missing illuminated topbar micro-detail');
 assert.ok(redlineChrome.mesh.includes('theme-momentum-mesh-v816.svg'),
  'Momentum card must display the real static neon particle mesh');
 assert.equal(redlineChrome.cards,3,'Keep all real platform KPIs');
 assert.equal(new Set(redlineChrome.colors).size,3,'Each platform must retain its distinct accent');
 assert.ok(redlineChrome.heading>50&&!redlineChrome.overflow,'Desktop chrome must not hide headline or overflow');
 await shot(desktop,'desktop-v816-reference-hyperdrive');
 await desktop.locator('#overview .hero-main').scrollIntoViewIfNeeded();
 await shot(desktop,'desktop-v816-momentum-detail');
 await desktop.evaluate(()=>window.scrollTo(0,0));
 assert.ok(await desktop.evaluate(()=>window.BACK2U_THEMES.use('ex20')));
 await desktop.waitForFunction(()=>document.body.dataset.themeId==='ex20');
 const lightChrome=await desktop.evaluate(()=>({
  headline:document.querySelector('.masthead h1').getBoundingClientRect().height,
  stats:document.querySelector('#heroValue').getBoundingClientRect().width,
  overflow:document.documentElement.scrollWidth>document.documentElement.clientWidth+20
 }));
 assert.ok(lightChrome.headline>50&&lightChrome.stats>50&&!lightChrome.overflow,
  'Dreamwave remains usable and its real data visible');
 await shot(desktop,'desktop-v816-reference-dreamwave');
 // Desktop basic values must work with the same controls.
 await desktop.locator('#themeStudioToggle').click();
 await desktop.locator('#theme_accent').fill('#123abc');
 assert.equal(await desktop.evaluate(()=>document.documentElement.style.getPropertyValue('--t-accent').trim()),'#123abc',
  'Desktop color picker updates CSS');
 await desktop.locator('#theme_layout').selectOption('wide');
 assert.equal(await desktop.evaluate(()=>document.body.dataset.referenceLayout),'wide',
  'Desktop layout control updates view');
 await desktop.locator('#themeReset').click();
 assert.equal(await desktop.locator('#theme_layout').inputValue(),'auto');
 await desktop.locator('#themeClose').click();

 // Rebased legacy-photo integration: verify actual decoded image and accessible hero
 // without changing the rest of the test profile's selected theme.
 const legacyOriginalTheme=await desktop.evaluate(()=>window.BACK2U_THEMES.current());
 for(const id of ['n24','n04','n15','n23']){
  assert.ok(await desktop.evaluate(id=>window.BACK2U_THEMES.use(id),id),'Legacy theme selection failed '+id);
  const scene=await desktop.evaluate(async()=>{
   const img=new Image();img.src='/theme-worlds-v815.jpg';await img.decode();
   const mast=document.querySelector('.masthead'),stage=mast.querySelector('.theme-world-stage'),heading=mast.querySelector('h1');
   return {decodedWidth:img.naturalWidth,background:getComputedStyle(stage).backgroundImage,
    heading:heading.getBoundingClientRect().height>=30&&getComputedStyle(heading).display!=='none',
    overflow:document.documentElement.scrollWidth>document.documentElement.clientWidth+24};
  });
  assert.ok(scene.decodedWidth>=1200&&scene.background.includes('theme-worlds-v815.jpg')&&scene.heading&&!scene.overflow,
   'Legacy photo must render without hidden H1 or horizontal overflow: '+id+' '+JSON.stringify(scene));
 }
 await desktop.evaluate(id=>window.BACK2U_THEMES.use(id),legacyOriginalTheme);
 const railLayout=await desktop.locator('#dashboardWorkspace>.section-nav').evaluate(x=>({
  position:getComputedStyle(x).position,referenceLayout:document.body.dataset.referenceLayout||''
 }));
 assert.ok(['fixed','sticky'].includes(railLayout.position),
  'Desktop has accessible sticky rail or explicitly selected fixed sidebar theme: '+JSON.stringify(railLayout));
 if(railLayout.position==='fixed')assert.equal(railLayout.referenceLayout,'sidebar',
  'Only an explicitly selected sidebar design may keep the legacy fixed nav');
 const rail=await desktop.locator('#dashboardWorkspace>.section-nav').boundingBox();
 const main=await desktop.locator('#dashboardWorkspace>main').boundingBox();
 assert.ok(rail&&main&&rail.x+rail.width<=main.x+4,'Desktop left rail must not overlap content');
 await desktop.locator('#dashboardWorkspace>.section-nav [data-section="creator"]').click();
 await desktop.waitForFunction(()=>document.querySelector('#creator')?.classList.contains('active'));
 assert.ok(await desktop.locator('#creatorCalendar').isVisible());
 await desktop.locator('#dashboardWorkspace>.section-nav [data-section="system"]').click();
 await desktop.waitForFunction(()=>document.querySelector('#system')?.classList.contains('active'));
 assert.ok(await desktop.locator('#connectionCards').isVisible());
 assert.ok(await desktop.locator('#v80SystemMethods').count()===1);
 // Regression: after loading a second valid API snapshot, the selected video
 // detail must be rebound to the NEW record instead of displaying stale metrics.
 // All values are local synthetic fixtures; no user API/account is accessed.
 let syntheticViews=111;
 await desktop.route('**/api/snapshot*',async route=>{
  const sample={generatedAt:'2026-11-16T15:00:00Z',dataThrough:'2026-11-15',
   errors:[],platforms:{
    yt:{videos:[{id:'QA_SENTINEL',platform:'yt',title:'QA_REFRESH_SENTINEL_VIDEO',
      date:'2026-11-15',views:syntheticViews,likes:11,comments:1,reportType:'lifetime'}],daily:[],profile:{}},
    ig:{videos:[],daily:[],profile:{}},tt:{videos:[],daily:[],profile:{}}
   }};
  await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(sample)});
 });
 await desktop.locator('#dashboardWorkspace>.section-nav [data-section="videos"]').click();
 await desktop.locator('#videoSearch').fill('QA_REFRESH_SENTINEL_VIDEO');
 await desktop.locator('#refreshBtn').click();
 await desktop.waitForFunction(()=>document.querySelector('#detailPanel .detail-metrics .detail-metric b')?.textContent==='111',
  null,{timeout:15000});
 assert.ok((await desktop.locator('#videoList').innerText()).includes('111'));
 syntheticViews=222;
 await desktop.locator('#refreshBtn').click();
 await desktop.waitForFunction(()=>document.querySelector('#detailPanel .detail-metrics .detail-metric b')?.textContent==='222',
  null,{timeout:15000});
 assert.ok((await desktop.locator('#videoList').innerText()).includes('222'),
  'Grouped list and selected detail must show the same refreshed count');
 await desktop.locator('.controlbar [data-platform="yt"]').click();
 await desktop.waitForFunction(()=>document.querySelector('#detailPanel .detail-metrics .detail-metric b')?.textContent==='222');
 syntheticViews=333;
 await desktop.locator('#refreshBtn').click();
 await desktop.waitForFunction(()=>document.querySelector('#detailPanel .detail-metrics .detail-metric b')?.textContent==='333',
  null,{timeout:15000});
 assert.ok((await desktop.locator('#videoList').innerText()).includes('333'),
  'Single-platform detail must rebind to freshly loaded video by ID');
 console.log('OK refreshed group and single-video detail reflect latest synthetic API snapshot');
 assert.deepEqual(desktopErrors,[]);
 console.log('OK Chromium Desktop 1440: sticky rail, creator, system and safe content geometry');
 await desktop.close();
}finally{
 await browser.close();
 await new Promise(resolve=>server.close(resolve));
}
