/**
 * BACK2U V7.7 – direct YouTube video analytics (last 28 completed days).
 *
 * NEW file in existing BACK2U LIVE CONNECTOR Google Apps Script project.
 * Calls official YouTube Analytics API, does NOT substitute 28-day metrics
 * for Data API lifetime views. Uses existing protected D1 ingestion token.
 * Only create daily trigger after a successful first manual execution.
 */
const B2U_YT_INSIGHTS_URL='https://back2u-cloud.leon-mueller0806.workers.dev/api/direct-video-insights/ingest';
const B2U_YT_INSIGHTS_CHANNEL='UCBnnaMohI_VfKihekEwaQEw';
function back2uYouTubeVideoInsightsDirect(){
 if(typeof YouTube==='undefined'||typeof YouTubeAnalytics==='undefined')
  throw new Error('YouTube Data API v3 und YouTube Analytics API v2 müssen in Services aktiviert sein.');
 const secret=PropertiesService.getScriptProperties().getProperty('BACK2U_CLOUDFLARE_FEED_SECRET');
 if(!secret||secret.length<24)throw new Error('Sicherer BACK2U Cloudflare Feed-Zugang fehlt.');
 const channels=YouTube.Channels.list('id',{mine:true});
 if(!(channels?.items||[]).some(c=>c.id===B2U_YT_INSIGHTS_CHANNEL))
  throw new Error('Falscher YouTube-Kanal – keine Statistiken übertragen.');
 const to=new Date(Date.now()-2*86400000);
 const from=new Date(to.getTime()-27*86400000);
 const day=x=>Utilities.formatDate(x,'UTC','yyyy-MM-dd'),start=day(from),end=day(to);
 const base='views,estimatedMinutesWatched,averageViewDuration,averageViewPercentage,shares';
 const byVideo=new Map();
 // Full scan for *active within period* videos, independent of publication date.
 for(let startIndex=1;startIndex<=1001;startIndex+=200){
  const response=YouTubeAnalytics.Reports.query({
   ids:'channel=='+B2U_YT_INSIGHTS_CHANNEL,
   startDate:start,endDate:end,metrics:base,dimensions:'video',
   sort:'-views',startIndex,maxResults:200
  });
  const rows=response?.rows||[];
  for(const r of rows){
   if(!/^[\w-]{11}$/.test(String(r[0]||'')))continue;
   const int=x=>Number.isSafeInteger(Number(x))&&Number(x)>=0?Number(x):null;
   const float=x=>Number.isFinite(Number(x))&&Number(x)>=0?Number(x):null;
   const metrics={
    views28d:int(r[1]),watchMinutes28d:int(Math.round(Number(r[2]))),
    averageViewSeconds28d:float(r[3]),averageViewPercentage28d:float(r[4]),
    shares28d:int(r[5])
   };
   Object.keys(metrics).forEach(k=>{if(metrics[k]===null)delete metrics[k]});
   if(Object.keys(metrics).length)byVideo.set(String(r[0]),{id:String(r[0]),metrics});
  }
  if(rows.length<200)break;
  if(startIndex===1001)throw new Error('YouTube meldet über 1200 aktive Videos – bitte Paging erweitern.');
 }
 if(!byVideo.size)throw new Error('Keine Videodaten von YouTube Analytics. D1 bleibt unverändert.');
 // Optional second metric: may not be authorized for every video/API account.
 try{
  const extra=YouTubeAnalytics.Reports.query({
   ids:'channel=='+B2U_YT_INSIGHTS_CHANNEL,
   startDate:start,endDate:end,metrics:'engagedViews',dimensions:'video',
   sort:'-engagedViews',maxResults:200
  });
  for(const r of extra?.rows||[]){
   const item=byVideo.get(String(r[0]));
   if(item&&Number.isSafeInteger(Number(r[1]))&&Number(r[1])>=0)
    item.metrics.engagedViews28d=Number(r[1]);
  }
 }catch(_){
  // Incompatible/unsupported metric is left UNKNOWN, never zero.
 }
 const videoRows=[...byVideo.values()];
 const payload={schema:1,platform:'yt',accountId:B2U_YT_INSIGHTS_CHANNEL,
  snapshotDate:day(new Date()),periodStart:start,periodEnd:end,
  videos:videoRows};
 const resp=UrlFetchApp.fetch(B2U_YT_INSIGHTS_URL,{
  method:'post',contentType:'application/json',
  headers:{Authorization:'Bearer '+secret},
  payload:JSON.stringify(payload),muteHttpExceptions:true
 });
 if(resp.getResponseCode()!==200)
  throw new Error('YouTube Analytics Cloudflare '+resp.getResponseCode()+': '+resp.getContentText().slice(0,260));
 Logger.log('BACK2U YouTube Videoanalysen: '+videoRows.length+' Videos; Zeitraum '+start+' bis '+end);
}
function back2uInstallYouTubeVideoInsightsDirect(){
 back2uYouTubeVideoInsightsDirect();
 const name='back2uYouTubeVideoInsightsDirect';
 if(!ScriptApp.getProjectTriggers().some(t=>t.getHandlerFunction()===name))
  ScriptApp.newTrigger(name).timeBased().inTimezone('Europe/Berlin').atHour(10).everyDays(1).create();
 Logger.log('YouTube Videoanalysen täglich eingerichtet.');
}
