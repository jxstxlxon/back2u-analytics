/**
 * BACK2U V7.7 – official API VIDEO catalog push (not Windsor).
 *
 * ADD as ONE new .gs file to the existing BACK2U LIVE CONNECTOR Apps Script.
 * Reads existing PRIVATE tabs YouTube_API_All and Instagram_API_All, already
 * populated by the channel-owner official APIs; sends no sheet access links.
 * Reuses the existing BACK2U_CLOUDFLARE_FEED_SECRET property.
 * Never alters Windsor export tabs or existing schedules.
 */
const B2U_MEDIA_PUSH_ENDPOINT='https://back2u-cloud.leon-mueller0806.workers.dev/api/direct-media/ingest';
const B2U_MEDIA_YT_ACCOUNT='UCBnnaMohI_VfKihekEwaQEw';
function b2uMediaHeader_(rows,names){
 if(!rows?.length)throw new Error('Tabellenkopf fehlt.');
 const normalize=v=>String(v||'').toLowerCase().normalize('NFKD')
  .replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]/g,'');
 const actual=rows[0].map(normalize);
 const indexes=names.map(name=>actual.indexOf(normalize(name)));
 if(indexes.some(idx=>idx<0))throw new Error('Direkte Video-Tabelle hat unerwartete Spalten.');
 return indexes;
}
function b2uMediaRows_(sheet,headers,mapper){
 if(!sheet||sheet.getLastRow()<11)throw new Error('Direkter Video-Report fehlt/ist unvollständig.');
 const rows=sheet.getDataRange().getDisplayValues();
 const indexes=b2uMediaHeader_(rows,headers);
 const result=rows.slice(1).map(r=>mapper(indexes.map(idx=>r[idx]))).filter(Boolean);
 if(result.length<10||result.length>1400)throw new Error('Unvollständiger Videoscan aus '+sheet.getName());
 return result;
}
function b2uMediaPush_(platform,accountId,videos){
 const secret=PropertiesService.getScriptProperties().getProperty('BACK2U_CLOUDFLARE_FEED_SECRET');
 if(!secret||secret.length<24)throw new Error('BACK2U_CLOUDFLARE_FEED_SECRET fehlt.');
 const payload={schema:1,platform,accountId,
  snapshotDate:Utilities.formatDate(new Date(),'UTC','yyyy-MM-dd'),videos};
 const r=UrlFetchApp.fetch(B2U_MEDIA_PUSH_ENDPOINT,{
  method:'post',contentType:'application/json',
  headers:{Authorization:'Bearer '+secret},
  payload:JSON.stringify(payload),muteHttpExceptions:true
 });
 if(r.getResponseCode()!==200)throw new Error('Cloudflare '+r.getResponseCode()+': '+r.getContentText().slice(0,200));
 Logger.log(platform+' direct API video entries transferred: '+videos.length);
}
function b2uDirectVideoSourceIsFresh_(tab,column){
 const today=Utilities.formatDate(new Date(),'UTC','yyyy-MM-dd');
 const limit=Utilities.formatDate(new Date(Date.now()-2*86400000),'UTC','yyyy-MM-dd');
 const end=Math.min(30,tab.getLastRow());
 const rows=tab.getRange(2,column,end-1,1).getDisplayValues();
 if(!rows.some(r=>/^\d{4}-\d{2}-\d{2}/.test(String(r[0]))&&String(r[0]).slice(0,10)>=limit&&
   String(r[0]).slice(0,10)<=today))
  throw new Error('Direkte API-Tabelle wurde in den letzten 48 Stunden nicht aktualisiert; alte Daten bleiben stehen.');
}
function back2uYouTubeMediaDirect(){
 const book=SpreadsheetApp.openById(BACK2U_SPREADSHEET_ID);
 const tab=book.getSheetByName('YouTube_API_All');
 if(!tab)throw new Error('YouTube_API_All fehlt.');
 b2uDirectVideoSourceIsFresh_(tab,9);
 const header=['Video ID','Titel','Veröffentlicht','Video URL','Thumbnail URL',
  'Aufrufe gesamt','Likes gesamt','Kommentare gesamt','Letztes Update','Status','Kanal ID'];
 const videoRows=b2uMediaRows_(tab,header,c=>{
  const [id,title,published,url,thumb,views,likes,comments,updated,status,channel]=c;
  if(!/^[\w-]{11}$/.test(String(id))||channel!==B2U_MEDIA_YT_ACCOUNT||
     String(status).toLowerCase()!=='public')return null;
  return {id,title,date:String(published).slice(0,10),url,thumb,
   views,likes,comments};
 });
 b2uMediaPush_('yt',B2U_MEDIA_YT_ACCOUNT,videoRows);
}
function back2uInstagramMediaDirect(){
 const book=SpreadsheetApp.openById(BACK2U_SPREADSHEET_ID);
 const tab=book.getSheetByName('Instagram_API_All');
 if(!tab)throw new Error('Instagram_API_All fehlt.');
 b2uDirectVideoSourceIsFresh_(tab,13);
 const header=['Media ID','Caption','Media type','Product type','Permalink',
  'Published at','Thumbnail URL','Likes','Comments','Views','Reach',
  'Insights updated','Last seen','Source'];
 const videoRows=b2uMediaRows_(tab,header,c=>{
  const [id,caption,type,product,link,published,thumb,likes,comments,views,reach,updated,lastseen,source]=c;
  if(!/^\d{12,25}$/.test(String(id))||!/^https:\/\/(?:www\.)?instagram\.com\/(?:reel|p|tv)\//.test(String(link))||
    source!=='Meta Instagram API')return null;
  return {id,title:caption,date:String(published).slice(0,10),url:link,thumb,
   views,likes,comments,reach};
 });
 b2uMediaPush_('ig','lxon_jxmpstyle',videoRows);
}
function back2uInstallDirectMediaPush(){
 // Do not create or replace triggers until BOTH live transfers have succeeded.
 back2uYouTubeMediaDirect();
 back2uInstagramMediaDirect();
 const names=['back2uYouTubeMediaDirect','back2uInstagramMediaDirect'];
 for(const name of names){
  if(!ScriptApp.getProjectTriggers().some(t=>t.getHandlerFunction()===name))
   ScriptApp.newTrigger(name).timeBased().inTimezone('Europe/Berlin').atHour(10).everyDays(1).create();
 }
 Logger.log('Official API media catalog sync scheduled daily; existing triggers untouched.');
}
