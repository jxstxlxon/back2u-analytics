/**
 * BACK2U V7.7 – per-Reel official Meta insights (lifetime).
 *
 * Add as a NEW file to existing BACK2U LIVE CONNECTOR Apps Script project.
 * Requires InstagramAudienceDirect.gs with the verified account resolver and
 * Instagram_Unified.gs b2uIgRequest_. Uses existing private script tokens only.
 * Runs a bounded number of requests; rotates across the full private
 * Instagram_API_All inventory. Unknown API metrics are NEVER mapped to zero.
 */
const B2U_IG_REEL_INSIGHTS_ENDPOINT=
 'https://back2u-cloud.leon-mueller0806.workers.dev/api/direct-video-insights/ingest';
function b2uIgMetricValue_(entry){
 const raw=entry?.total_value?.value??
  (Array.isArray(entry?.values)&&entry.values.length===1?entry.values[0].value:null);
 if(raw===null||raw===undefined||raw==='')return null;
 const n=Number(raw);return Number.isFinite(n)&&n>=0?n:null;
}
function b2uIgReelInsightsFor_(mediaId,isReel){
 const nameToKey={shares:'shares',saved:'saves',total_interactions:'interactions',
  ig_reels_avg_watch_time:'averageWatchMs',
  ig_reels_video_view_total_time:'totalWatchMs'};
 const wanted=isReel?Object.keys(nameToKey):
  ['shares','saved','total_interactions'];
 function parse(payload){
  const result={};
  for(const x of payload?.data||[]){
   const metric=String(x?.name||''),key=nameToKey[metric];
   if(!key)continue;
   const n=b2uIgMetricValue_(x);
   if(n===null)continue;
   if(key==='averageWatchMs')result[key]=Math.round(n*10)/10;
   else result[key]=Math.round(n); // Meta reports count/millisecond values
  }
  return result;
 }
 try{return parse(b2uIgRequest_(mediaId+'/insights',{metric:wanted.join(',')}))}
 catch(_){
  // One unsupported metric can cause a batch to fail. Try independently.
  const result={};
  for(const metric of wanted){
   try{Object.assign(result,parse(b2uIgRequest_(mediaId+'/insights',{metric})))}
   catch(_){}
  }
  return result;
 }
}
function back2uInstagramReelInsightsDirect(){
 if(typeof b2uIgProfileForAudience_!=='function')
  throw new Error('InstagramAudienceDirect.gs und Instagram_Unified.gs vorher hinzufügen.');
 const secret=PropertiesService.getScriptProperties().getProperty('BACK2U_CLOUDFLARE_FEED_SECRET');
 if(!secret||secret.length<24)throw new Error('BACK2U_CLOUDFLARE_FEED_SECRET fehlt.');
 const profile=b2uIgProfileForAudience_();
 if(String(profile.username||'').toLowerCase()!=='lxon_jxmpstyle')
  throw new Error('Falsches Instagram-Konto.');
 const tab=SpreadsheetApp.openById(BACK2U_SPREADSHEET_ID).getSheetByName('Instagram_API_All');
 if(!tab||tab.getLastRow()<2)throw new Error('Private Instagram_API_All Tabelle fehlt.');
 const rows=tab.getDataRange().getDisplayValues();
 const idx=key=>rows[0].indexOf(key);
 const id=idx('Media ID'),type=idx('Product type'),source=idx('Source'),published=idx('Published at');
 if([id,type,source,published].some(n=>n<0))throw new Error('Nicht unterstütztes Meta-Tabellenformat.');
 const owned=rows.slice(1).filter(row=>/^\d{12,25}$/.test(String(row[id]||''))&&
  row[source]==='Meta Instagram API').sort((a,b)=>String(b[published]).localeCompare(String(a[published])));
 if(!owned.length)throw new Error('Keine offiziellen Instagram-Media-Einträge.');
 const props=PropertiesService.getScriptProperties();
 const offset=Number(props.getProperty('B2U_IG_REEL_INSIGHTS_CURSOR')||0);
 const selected=owned.slice(offset,offset+20);
 const candidates=selected.length?selected:owned.slice(0,20);
 const result=[];
 for(const row of candidates){
  const mediaId=String(row[id]),isReel=String(row[type]).toUpperCase()==='REELS';
  const metrics=b2uIgReelInsightsFor_(mediaId,isReel);
  if(Object.keys(metrics).length)result.push({id:mediaId,metrics});
 }
 if(!result.length)throw new Error('Keine Reel-Insights verfügbar; bestehende D1-Zahlen bleiben unverändert.');
 const payload={schema:1,platform:'ig',accountId:'lxon_jxmpstyle',
  snapshotDate:Utilities.formatDate(new Date(),'UTC','yyyy-MM-dd'),videos:result};
 const response=UrlFetchApp.fetch(B2U_IG_REEL_INSIGHTS_ENDPOINT,{
  method:'post',contentType:'application/json',headers:{Authorization:'Bearer '+secret},
  payload:JSON.stringify(payload),muteHttpExceptions:true
 });
 if(response.getResponseCode()!==200)
  throw new Error('Meta Reel Insights HTTP '+response.getResponseCode()+': '+response.getContentText().slice(0,260));
 // Rotate only after successful persistence. Every cycle will revisit latest videos.
 props.setProperty('B2U_IG_REEL_INSIGHTS_CURSOR',String(offset+20>=owned.length?0:offset+20));
 Logger.log('Meta per-Reel Zusatzkennzahlen erfolgreich: '+result.length+
  ' von '+candidates.length+' geprüften Media-Einträgen.');
}
function back2uInstallInstagramReelInsightsDirect(){
 back2uInstagramReelInsightsDirect();
 const name='back2uInstagramReelInsightsDirect';
 if(!ScriptApp.getProjectTriggers().some(t=>t.getHandlerFunction()===name))
  ScriptApp.newTrigger(name).timeBased().inTimezone('Europe/Berlin').atHour(11).everyDays(1).create();
 Logger.log('Instagram Reel-Insights täglich geplant.');
}
