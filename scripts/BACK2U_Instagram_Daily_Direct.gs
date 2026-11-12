/**
 * BACK2U V7.7 – Verified Instagram account-day totals from Meta Graph API.
 *
 * NEW file in the existing private BACK2U LIVE CONNECTOR Apps Script project.
 * Requires InstagramAudienceDirect.gs (b2uIgProfileForAudience_),
 * Instagram_Unified.gs (b2uIgRequest_), private IG_SUAT_TOKEN, and the existing
 * BACK2U_CLOUDFLARE_FEED_SECRET. No token values are stored in code.
 *
 * Only fetches a *one-day Meta account insight window* at a time. Lifetime
 * media views, changes of video lifetime counts and multi-day unique reach
 * are NEVER reported as daily account metrics.
 */
const B2U_IG_DAILY_ENDPOINT='https://back2u-cloud.leon-mueller0806.workers.dev/api/direct-instagram-daily/ingest';
const B2U_IG_METRIC_PAIRS={
 views:'views',reach:'reach',likes:'likes',comments:'comments',
 shares:'shares',saves:'saves',total_interactions:'interactions',
 accounts_engaged:'accountsEngaged'
};
function b2uIgDailyFetch_(id,metricNames,day){
 const start=new Date(day+'T00:00:00Z').getTime()/1000;
 // Exclusive end: next midnight UTC. Avoid accidentally including two days.
 const query={
  metric:metricNames.join(','),period:'day',metric_type:'total_value',
  since:String(start),until:String(start+86400)
 };
 const r=b2uIgRequest_(id+'/insights',query);
 const metrics={};
 for(const entry of r?.data||[]){
  const name=String(entry?.name||'');
  if(!Object.hasOwn(B2U_IG_METRIC_PAIRS,name))continue;
  const raw=entry?.total_value?.value;
  if(raw===null||raw===undefined||raw==='')continue;
  const value=Number(raw);
  if(Number.isSafeInteger(value)&&value>=0)
   metrics[B2U_IG_METRIC_PAIRS[name]]=value;
 }
 return metrics;
}
function b2uIgDailyMetricBatch_(id,day,metrics){
 // Unsupported metrics must never turn previously measured values into zero.
 try{return b2uIgDailyFetch_(id,metrics,day)}
 catch(_){
  const collected={};
  for(const name of metrics){
   try{Object.assign(collected,b2uIgDailyFetch_(id,[name],day))}
   catch(_){} // Missing metric is absent, not 0.
  }
  return collected;
 }
}
function back2uInstagramDailyDirect(){
 if(typeof b2uIgProfileForAudience_!=='function')
  throw new Error('BACK2U_Instagram_Audience_Direct.gs zuerst im bestehenden Apps Script hinzufügen.');
 const secret=PropertiesService.getScriptProperties().getProperty('BACK2U_CLOUDFLARE_FEED_SECRET');
 if(!secret||secret.length<24)throw new Error('BACK2U Feed Secret fehlt.');
 const profile=b2uIgProfileForAudience_();
 if(String(profile.username||'').toLowerCase()!=='lxon_jxmpstyle')
  throw new Error('Falsches Instagram-Konto.');
 const id=String(profile.id);
 const today=Utilities.formatDate(new Date(),'UTC','yyyy-MM-dd');
 const timestamp=Date.parse(today+'T00:00:00Z');
 const format=d=>Utilities.formatDate(d,'UTC','yyyy-MM-dd');
 const props=PropertiesService.getScriptProperties();
 const progress=Number(props.getProperty('B2U_IG_DAILY_BACKFILL_DAY')||0);
 // Retest newest 3 days on each run; stagger days 4–89 over subsequent runs.
 // This avoids expensive all-history re-import and handles delayed Meta reports.
 const offsets=[1,2,3];
 for(let n=0;n<4;n++){
  const older=4+progress+n;
  if(older<=89)offsets.push(older);
 }
 const rows=[],errors=[];
 for(const offset of offsets){
  const date=format(new Date(timestamp-offset*86400000));
  const core=b2uIgDailyMetricBatch_(id,date,['views','reach','total_interactions']);
  const optional=b2uIgDailyMetricBatch_(id,date,['likes','comments','shares','saves','accounts_engaged']);
  const metrics={...core,...optional};
  if(!Object.keys(metrics).length){errors.push(date);continue}
  rows.push({date,metrics});
 }
 if(!rows.length)throw new Error('Meta lieferte keine bestätigten Tageswerte; letzte BACK2U-Daten bleiben unverändert.');
 const payload={schema:1,platform:'ig',accountId:'lxon_jxmpstyle',
  snapshotDate:today,daily:rows};
 const resp=UrlFetchApp.fetch(B2U_IG_DAILY_ENDPOINT,{
  method:'post',contentType:'application/json',headers:{Authorization:'Bearer '+secret},
  payload:JSON.stringify(payload),muteHttpExceptions:true
 });
 if(resp.getResponseCode()!==200)
  throw new Error('BACK2U Meta Tagesreport HTTP '+resp.getResponseCode()+': '+resp.getContentText().slice(0,250));
 // Advance backfill cursor only after a successful server write. Missing days
 // stay recorded as missing; user may rerun the explicit backfill later.
 props.setProperty('B2U_IG_DAILY_BACKFILL_DAY',String(progress+4>86?0:progress+4));
 Logger.log('Instagram Direkttage gespeichert: '+rows.length+', ohne Daten: '+errors.length);
}
function back2uInstallInstagramDailyDirect(){
 back2uInstagramDailyDirect(); // authorize and confirm complete run before scheduling
 const name='back2uInstagramDailyDirect';
 if(!ScriptApp.getProjectTriggers().some(t=>t.getHandlerFunction()===name))
  ScriptApp.newTrigger(name).timeBased().inTimezone('Europe/Berlin').atHour(10).everyDays(1).create();
 Logger.log('Offizielle Instagram Tagesstatistiken täglich geplant.');
}
