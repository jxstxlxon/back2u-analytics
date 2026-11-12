/**
 * BACK2U V7.7 – direct YouTube video analytics (7, 28 and 90 completed days).
 *
 * NEW file in existing BACK2U LIVE CONNECTOR Google Apps Script project.
 * Calls official YouTube Analytics API, does NOT substitute 7/28/90-day metrics
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
 const endDay=new Date(Date.now()-2*86400000);
 const day=x=>Utilities.formatDate(x,'UTC','yyyy-MM-dd'),end=day(endDay);
 const base=['views','estimatedMinutesWatched','averageViewDuration','averageViewPercentage','shares'];
 const mapping={
  views:'views',estimatedMinutesWatched:'watchMinutes',
  averageViewDuration:'averageViewSeconds',
  averageViewPercentage:'averageViewPercentage',shares:'shares'
 };
 let success=0,issues=[];
 for(const days of [7,28,90]){
  const start=day(new Date(endDay.getTime()-(days-1)*86400000));
  const rowsByVideo=new Map();
  const query=(metrics,index)=>YouTubeAnalytics.Reports.query({
   ids:'channel=='+B2U_YT_INSIGHTS_CHANNEL,
   startDate:start,endDate:end,metrics:metrics.join(','),
   dimensions:'video',sort:'-views',startIndex:index,maxResults:200
  });
  try{
   for(let index=1;index<=1001;index+=200){
    let response;
    try{response=query(base,index)}
    catch(e){
     // A single unsupported optional metric must not disable all views.
     if(index!==1)throw e;
     issues.push(days+'d grouped metrics unavailable; retrieving views');
     response=query(['views'],index);
    }
    const names=(response?.columnHeaders||[]).slice(1).map(x=>x.name);
    const sourceNames=names.length?names:
      (response?.rows?.[0]?.length===base.length+1?base:['views']);
    const rows=response?.rows||[];
    for(const row of rows){
     const id=String(row[0]||'');
     if(!/^[\w-]{11}$/.test(id))continue;
     const value={};
     for(let j=0;j<sourceNames.length;j++){
      const name=sourceNames[j],key=mapping[name];
      const numeric=Number(row[j+1]);
      if(!key||row[j+1]==null||!Number.isFinite(numeric)||numeric<0)continue;
      value[key+days+'d']=
       ['averageViewSeconds','averageViewPercentage'].includes(key)?
        Math.round(numeric*100)/100:Math.round(numeric);
     }
     if(Object.keys(value).length)rowsByVideo.set(id,{id,metrics:value});
    }
    if(rows.length<200)break;
    if(index===1001)throw new Error('Too many video analytics rows');
   }
   if(!rowsByVideo.size)throw new Error('No valid video metrics');
   // Enrich only those IDs for which the optional engagement report is available.
   try{
    const more=YouTubeAnalytics.Reports.query({
     ids:'channel=='+B2U_YT_INSIGHTS_CHANNEL,
     startDate:start,endDate:end,metrics:'engagedViews',
     dimensions:'video',sort:'-engagedViews',maxResults:200
    });
    for(const row of more?.rows||[]){
     const entry=rowsByVideo.get(String(row[0])),n=Number(row[1]);
     if(entry&&Number.isSafeInteger(n)&&n>=0)entry.metrics['engagedViews'+days+'d']=n;
    }
   }catch(_){} // Optional engagedViews not supported or missing.
   const payload={schema:1,platform:'yt',accountId:B2U_YT_INSIGHTS_CHANNEL,
    snapshotDate:day(new Date()),periodDays:days,periodStart:start,periodEnd:end,
    videos:[...rowsByVideo.values()]};
   const response=UrlFetchApp.fetch(B2U_YT_INSIGHTS_URL,{
    method:'post',contentType:'application/json',
    headers:{Authorization:'Bearer '+secret},
    payload:JSON.stringify(payload),muteHttpExceptions:true
   });
   if(response.getResponseCode()!==200)
    throw new Error('Cloudflare '+response.getResponseCode()+': '+response.getContentText().slice(0,170));
   success++;
   Logger.log('BACK2U YouTube '+days+' Tage · '+payload.videos.length+' Videos');
  }catch(e){
   // Keep all older valid reporting windows in D1; never invent a number.
   issues.push(days+'d: '+String(e?.message||e).slice(0,150));
  }
 }
 if(!success)throw new Error('Kein gültiger YouTube Video-Analytics-Import: '+issues.join('; '));
 if(issues.length)Logger.log('Nicht verfügbare YouTube-Metriken: '+issues.join('; '));
}
function back2uInstallYouTubeVideoInsightsDirect(){
 back2uYouTubeVideoInsightsDirect();
 const name='back2uYouTubeVideoInsightsDirect';
 if(!ScriptApp.getProjectTriggers().some(t=>t.getHandlerFunction()===name))
  ScriptApp.newTrigger(name).timeBased().inTimezone('Europe/Berlin').atHour(10).everyDays(1).create();
 Logger.log('YouTube Videoanalysen täglich eingerichtet.');
}
