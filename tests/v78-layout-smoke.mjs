/*
 * BACK2U V7.8 browser smoke: real Chromium rendering, no live Cloudflare
 * access, no private source material, no production login or write calls.
 */
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../site');
const summary={enabled:false,sync:{status:'not_started'},coverage:{
 lastMeasuredDay:null,totalStoredDays:0,
 windows:{'7':{known:{views:0,profileViews:0}},'28':{known:{views:0,profileViews:0}},
 '90':{known:{views:0,profileViews:0}}}
}};
let manualSyncAttempts=0;
const mime={'.html':'text/html; charset=utf-8','.js':'application/javascript; charset=utf-8',
 '.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.txt':'text/plain; charset=utf-8',
 '.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp'};
const app=createServer(async(req,res)=>{
 const url=new URL(req.url,'http://127.0.0.1');
 const pathname=decodeURIComponent(url.pathname);
 const send=(code,data)=>{
  res.writeHead(code,{'content-type':'application/json; charset=utf-8',
   'cache-control':'no-store'});res.end(JSON.stringify(data));
 };
 if(pathname==='/api/access')return send(200,{role:'admin'});
 if(pathname==='/api/audience')return send(200,{configured:false,automatic:{configured:false}});
 if(pathname==='/api/tiktok-daily/status')return send(200,summary);
 if(pathname==='/api/tiktok-daily/sync'){manualSyncAttempts++;return send(503,{error:'Test-Backend: aus'});}
 if(pathname==='/api/snapshot')return send(503,{error:'Nur Beispielansicht: keine echten Live-Daten'});
 if(pathname.startsWith('/api/'))return send(503,{error:'Nicht verbunden im isolierten Browsertest'});
 let p=path.resolve(root,'.'+(pathname==='/'?'/index.html':pathname));
 if(!p.startsWith(root+path.sep)){res.writeHead(403);res.end();return}
 try{
  const bytes=await readFile(p);
  res.writeHead(200,{'content-type':mime[path.extname(p)]||'application/octet-stream',
   'cache-control':'no-store'});res.end(bytes);
 }catch{res.writeHead(404);res.end('Not found')}
});
await new Promise((resolve,reject)=>{app.once('error',reject);app.listen(0,'127.0.0.1',resolve)});
const address=app.address(),url='http://127.0.0.1:'+address.port;
let browser;
try{
 browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 const configs=[
  {name:'compact-phone',width:360,height:740},
  {name:'iphone',width:393,height:852},
  {name:'large-phone',width:430,height:932},
  {name:'ipad-portrait',width:820,height:1180},
  {name:'desktop',width:1440,height:900}
 ];
 for(const v of configs){
  const context=await browser.newContext({viewport:{width:v.width,height:v.height},isMobile:v.width<500,
   hasTouch:v.width<500});
  const page=await context.newPage();
  const errors=[];
  page.on('pageerror',e=>errors.push(String(e.message)));
  await page.goto(url,{waitUntil:'domcontentloaded',timeout:25000});
  await page.locator('button[data-section="system"]').click();
  await page.waitForFunction(()=>{
   const s=document.getElementById('tiktokDailyStatus');
   return s&&s.textContent.includes('Automatik');
  },{timeout:15000});
  const layout=await page.evaluate(()=>{
   const ids=['audienceImportPanel','tiktokDailyStatus','tiktokDailySyncNow','tiktokDailyHint'];
   const elements=Object.fromEntries(ids.map(id=>{
    const el=document.getElementById(id),r=el.getBoundingClientRect();
    return [id,{left:r.left,right:r.right,width:r.width,height:r.height,visible:r.height>0&&r.width>0}];
   }));
   return {vw:innerWidth,docWidth:document.documentElement.scrollWidth,elements,
    buttonText:document.getElementById('tiktokDailySyncNow').textContent.trim(),
    text:document.getElementById('tiktokDailyStatus').textContent.trim()};
  });
  for(const [id,r] of Object.entries(layout.elements)){
   assert.ok(r.visible,v.name+' '+id+' is not rendered');
   assert.ok(r.left>=-4&&r.right<=v.width+4,
    v.name+' '+id+' overflows horizontal viewport: '+JSON.stringify(r));
  }
  assert.ok(layout.text.includes('Automatik aus'),v.name+': false sync state label missing');
  assert.ok(layout.text.includes('7T: 0'),v.name+': missing-day coverage label absent');
  const before=manualSyncAttempts;
  page.once('dialog',d=>d.dismiss());
  await page.locator('#tiktokDailySyncNow').click();
  assert.equal(manualSyncAttempts,before,v.name+': cancel prompted a data import');
  assert.equal(errors.length,0,v.name+' uncaught JS errors: '+errors.join('; '));
  console.log('OK '+v.name+' '+v.width+'px: no TikTok admin panel overflow, sync remains opt-in');
  await context.close();
 }
 console.log('BACK2U V7.8 Chromium layout smoke passed: '+configs.length+'/'+configs.length);
} finally {
 if(browser)await browser.close();
 await new Promise(resolve=>app.close(resolve));
}
