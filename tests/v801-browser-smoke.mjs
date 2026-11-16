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
 await phone.locator('#themeStudioToggle').click();
 assert.ok(await phone.locator('#themeStudioPanel').isVisible());
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
 assert.equal(await ipad.locator('#mobileBottomNav').evaluate(x=>getComputedStyle(x).display),'none');
 assert.notEqual(await ipad.locator('#dashboardWorkspace>.section-nav').evaluate(x=>getComputedStyle(x).display),'none');
 await ipad.locator('#dashboardWorkspace>.section-nav [data-section="videos"]').click();
 assert.ok(await ipad.locator('#videoSearch').isVisible());
 assert.deepEqual(ipadErrors,[]);
 console.log('OK Chromium iPad 834: horizontal navigation, video library and no accidental phone bottom bar');
 await ipad.close();

 const {page:desktop,errors:desktopErrors}=await createPage('Desktop 1440×900',{width:1440,height:900});
 const desktopRetina=await desktop.evaluate(async()=>{
  const img=document.querySelector('.theme-world-stage img');
  await img.decode();
  const header=document.querySelector('.masthead');
  return {width:img.getBoundingClientRect().width,
   height:header.getBoundingClientRect().height,
   sharp:decodeURIComponent(img.src.slice('data:image/svg+xml,'.length)).includes('viewBox="0 0 1920 1080"')};
 });
 assert.ok(desktopRetina.width>=650&&desktopRetina.width<=980&&desktopRetina.height>=340&&desktopRetina.sharp,
  'Desktop must render a large true vector illustration: '+JSON.stringify(desktopRetina));
 for(const id of ['ex06','ex05','ex18','ex04']){
  assert.ok(await desktop.evaluate(id=>window.BACK2U_THEMES.use(id),id));
  await desktop.waitForFunction(id=>document.body.dataset.themeId===id,id);
  const desktopHeroBackground=await desktop.evaluate(()=>getComputedStyle(document.querySelector('.masthead')).backgroundImage);
  assert.ok(!desktopHeroBackground.includes('data:image/svg+xml'),
   'Photo worlds must not stack geometric SVG with photographic atlas: '+id);
  await shot(desktop,'desktop-'+id);
 }
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
 assert.deepEqual(desktopErrors,[]);
 console.log('OK Chromium Desktop 1440: sticky rail, creator, system and safe content geometry');
 await desktop.close();
}finally{
 await browser.close();
 await new Promise(resolve=>server.close(resolve));
}
