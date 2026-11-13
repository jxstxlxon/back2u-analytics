/**
 * BACK2U V7.7 – One-off isolated YouTube 7/28/90 day video analytics PREVIEW.
 *
 * Prerequisites: the existing BACK2U_V77_Preview_Media_Smoke.gs file,
 * including b2uV77PreviewConfig_(), and its TWO private preview-only
 * Apps Script properties. Reuse the validated preview URL + preview token.
 *
 * Run back2uV77PreviewYouTubeInsightsCheck FIRST (read-only Google API).
 * Then run back2uV77PreviewYouTubeInsightsSend ONCE (Preview D1 only).
 *
 * DO NOT run the live function back2uYouTubeVideoInsightsDirect.
 * This module creates no triggers, changes no live scripts, uses no live feed
 * credential, cannot send to the production worker, and logs no video data.
 */
const B2U_V77_PREVIEW_YT_CHANNEL='UCBnnaMohI_VfKihekEwaQEw';
function b2uV77PreviewYouTubeInsights_(dryRun){
 if(typeof YouTube==='undefined'||typeof YouTubeAnalytics==='undefined')
  throw new Error('YouTube Data API v3 und YouTube Analytics API v2 müssen in Services aktiviert sein.');
 const {base:previewBase,secret}=b2uV77PreviewConfig_();
 if(!previewBase.startsWith('https://feature-back2u-v77-'))throw new Error('Preview-Ziel nicht bestaetigt');
 const channels=YouTube.Channels.list('id',{mine:true});
 if(!(channels?.items||[]).some(c=>c.id===B2U_V77_PREVIEW_YT_CHANNEL))
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
   ids:'channel=='+B2U_V77_PREVIEW_YT_CHANNEL,
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
     ids:'channel=='+B2U_V77_PREVIEW_YT_CHANNEL,
     startDate:start,endDate:end,metrics:'engagedViews',
     dimensions:'video',sort:'-engagedViews',maxResults:200
    });
    for(const row of more?.rows||[]){
     const entry=rowsByVideo.get(String(row[0])),n=Number(row[1]);
     if(entry&&Number.isSafeInteger(n)&&n>=0)entry.metrics['engagedViews'+days+'d']=n;
    }
   }catch(_){} // Optional engagedViews not supported or missing.
   const payload={schema:1,platform:'yt',accountId:B2U_V77_PREVIEW_YT_CHANNEL,
    snapshotDate:day(new Date()),periodDays:days,periodStart:start,periodEnd:end,
    videos:[...rowsByVideo.values()]};
   if(dryRun){
    Logger.log('PREVIEW CHECK YouTube '+days+' Tage: '+payload.videos.length+' Videozeilen · kein Upload.');
    success++;continue;
   }
   const response=UrlFetchApp.fetch(previewBase+'/api/direct-video-insights/ingest',{
    method:'post',contentType:'application/json',
    headers:{Authorization:'Bearer '+secret},
    payload:JSON.stringify(payload),muteHttpExceptions:true
   });
   if(response.getResponseCode()!==200)
    throw new Error('Cloudflare '+response.getResponseCode()+': '+response.getContentText().slice(0,170));
   success++;
   Logger.log('PREVIEW IMPORT YouTube '+days+' Tage · '+payload.videos.length+' Videos: HTTP 200');
  }catch(e){
   // Keep all older valid reporting windows in D1; never invent a number.
   issues.push(days+'d: '+String(e?.message||e).slice(0,150));
  }
 }
 if(!success)throw new Error('Keine YouTube-Videoanalysen erfolgreich: '+issues.join('; '));
 if(issues.length)Logger.log('Nicht verfügbare YouTube-Metriken: '+issues.join('; '));
}

function back2uV77PreviewYouTubeInsightsCheck(){
 b2uV77PreviewYouTubeInsights_(true);
}
function back2uV77PreviewYouTubeInsightsSend(){
 b2uV77PreviewYouTubeInsights_(false);
}
