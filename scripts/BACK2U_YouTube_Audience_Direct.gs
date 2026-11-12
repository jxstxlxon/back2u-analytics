/**
 * BACK2U V7.7 – Own-channel YouTube Analytics demographics, no Windsor dependency.
 *
 * ADD as a NEW .gs file in the EXISTING BACK2U LIVE CONNECTOR Apps Script project.
 * Requires enabled advanced Services: YouTube Data API v3 and YouTube Analytics API v2.
 * Reuses BACK2U_CLOUDFLARE_FEED_SECRET, NEVER logs tokens.
 *
 * Do not delete the existing YouTube daily / video sync.
 */
const BACK2U_YT_DEMO_ID='UCBnnaMohI_VfKihekEwaQEw';
const BACK2U_YT_DEMO_ENDPOINT='https://back2u-cloud.leon-mueller0806.workers.dev/api/direct-audience/ingest';
const BACK2U_YT_COUNTRY_NAMES={
 DE:'Deutschland',US:'USA',BR:'Brasilien',PL:'Polen',GB:'Vereinigtes Königreich',
 ID:'Indonesien',AT:'Österreich',PH:'Philippinen',RU:'Russland',MX:'Mexiko',
 FR:'Frankreich',NL:'Niederlande',CA:'Kanada',CH:'Schweiz',CZ:'Tschechien',
 TR:'Türkei',IN:'Indien',TH:'Thailand',MY:'Malaysia'
};
function b2uYtNormalizePercents_(values,group){
 if(!Array.isArray(values)||values.length< (group==='gender'?2:4))
  throw new Error('YouTube '+group+' Bericht unvollständig – letzter D1-Wert bleibt unverändert.');
 const total=values.reduce((s,v)=>s+Number(v[1]),0);
 if(!Number.isFinite(total)||Math.abs(total-100)>0.51)
  throw new Error('YouTube '+group+' Prozentbasis nicht vollständig: '+total);
 const ret=values.map(([name,percent])=>[String(name),Math.round(Number(percent)*10)/10]);
 ret.sort((a,b)=>b[1]-a[1]);
 const sum=ret.reduce((s,v)=>s+v[1],0);
 ret[ret.length-1][1]=Math.round((ret[ret.length-1][1]+100-sum)*10)/10;
 return ret;
}
function b2uYtCountryPercent_(rows){
 if(!Array.isArray(rows)||rows.length<5)throw new Error('YouTube-Länderreport unvollständig.');
 const valid=rows.map(r=>[String(r[0]),Number(r[1])]);
 if(valid.some(r=>!r[0]||!Number.isSafeInteger(r[1])||r[1]<0))
  throw new Error('YouTube meldete ungültige Länderaufrufe.');
 const total=valid.reduce((s,r)=>s+r[1],0);
 if(total<=0)throw new Error('Keine gültigen geografischen Aufrufe.');
 valid.sort((a,b)=>b[1]-a[1]);
 const top=valid.slice(0,10).map(([country,views])=>
  [BACK2U_YT_COUNTRY_NAMES[country]||country,Math.round(views/total*1000)/10]);
 const other=Math.round((100-top.reduce((sum,r)=>sum+r[1],0))*10)/10;
 return {rows:[...top,['Weitere',other]],reportCountries:valid.length,totalViews:total};
}
function back2uYouTubeAudienceDirect(){
 if(typeof YouTube==='undefined'||typeof YouTubeAnalytics==='undefined')
  throw new Error('YouTube Data API v3 und YouTube Analytics API v2 unter Services (+) aktivieren.');
 const secret=PropertiesService.getScriptProperties().getProperty('BACK2U_CLOUDFLARE_FEED_SECRET');
 if(!secret||secret.length<24)throw new Error('BACK2U_CLOUDFLARE_FEED_SECRET fehlt.');
 const channels=YouTube.Channels.list('id',{mine:true});
 const matches=(channels.items||[]).filter(c=>c.id===BACK2U_YT_DEMO_ID);
 if(matches.length!==1)throw new Error('Google-Login gehört nicht zum Back2u-YouTube-Kanal.');
 const end=new Date(Date.now()-2*86400000);
 const start=new Date(end.getTime()-27*86400000);
 const fmt=d=>Utilities.formatDate(d,'UTC','yyyy-MM-dd');
 const from=fmt(start),until=fmt(end);
 const query=(dimensions,metrics)=>YouTubeAnalytics.Reports.query({
  ids:'channel=='+BACK2U_YT_DEMO_ID,startDate:from,endDate:until,dimensions,metrics
 });
 const ageResponse=query('ageGroup','viewerPercentage');
 const genderResponse=query('gender','viewerPercentage');
 const geoResponse=query('country','views');
 if(!ageResponse?.rows?.length||!genderResponse?.rows?.length||!geoResponse?.rows?.length)
  throw new Error('YouTube Analytics lieferte keinen vollständigen Demografiereport.');
 const ageNames={'age13-17':'13–17','age18-24':'18–24','age25-34':'25–34',
  'age35-44':'35–44','age45-54':'45–54','age55-64':'55–64','age65-':'65+'};
 const genderNames={male:'Männer',female:'Frauen',user_specified:'Selbst angegeben'};
 const age=b2uYtNormalizePercents_(ageResponse.rows.map(r=>[ageNames[String(r[0])]||String(r[0]),r[1]]),'age');
 const gender=b2uYtNormalizePercents_(genderResponse.rows.map(r=>[genderNames[String(r[0])]||String(r[0]),r[1]]),'gender');
 const countries=b2uYtCountryPercent_(geoResponse.rows);
 const source='YouTube Analytics API (direct)',period=from+' bis '+until;
 const payload={schema:1,platform:'yt',accountId:BACK2U_YT_DEMO_ID,
  snapshotDate:fmt(new Date()),audience:{age,gender,countries:countries.rows},
  audienceMeta:{
   age:{source,period,basis:'Offizielle YouTube-Zuschaueranteile, keine absoluten Personen'},
   gender:{source,period,basis:'Offizielle YouTube-Zuschaueranteile, keine absoluten Personen'},
   countries:{source,period,basis:'Länderzuordnung von '+countries.totalViews+
    ' YouTube-Aufrufen in '+countries.reportCountries+' gemeldeten Ländern, keine eindeutigen Zuschauer'}
  }};
 const reply=UrlFetchApp.fetch(BACK2U_YT_DEMO_ENDPOINT,{method:'post',
  contentType:'application/json',headers:{Authorization:'Bearer '+secret},
  payload:JSON.stringify(payload),muteHttpExceptions:true});
 if(reply.getResponseCode()!==200)
  throw new Error('Cloudflare '+reply.getResponseCode()+': '+reply.getContentText().slice(0,200));
 Logger.log('YouTube-Zielgruppenreport übertragen: '+JSON.stringify({
  asOf:payload.snapshotDate,period,groups:3,countries:countries.reportCountries}));
}
function back2uInstallYouTubeAudienceDirect(){
 // Test the correct account, scopes and destination before activating a timer.
 back2uYouTubeAudienceDirect();
 const name='back2uYouTubeAudienceDirect';
 if(!ScriptApp.getProjectTriggers().some(t=>t.getHandlerFunction()===name))
  ScriptApp.newTrigger(name).timeBased().inTimezone('Europe/Berlin').atHour(9).everyDays(1).create();
 Logger.log('YouTube-Zielgruppe: täglicher eigener API-Abgleich geplant.');
}
