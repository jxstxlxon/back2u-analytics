/*
 * BACK2U V7.7: read-only integrity and coverage audit.
 * This is NOT proof of equal definitions or authorization to disable Windsor.
 */
const asDay=ms=>new Date(ms).toISOString().slice(0,10);
const safe=(o,k)=>typeof o?.[k]==='number'&&Number.isFinite(o[k])&&o[k]>=0;
function lastSevenCompleted(now){
 const end=Date.parse(asDay(now)+'T00:00:00Z')-2*86400000;
 return Array.from({length:7},(_,i)=>asDay(end-(6-i)*86400000));
}
function ageInDays(date,now){
 const d=Date.parse(String(date||'')+'T00:00:00Z');
 return Number.isFinite(d)?Math.floor((Date.parse(asDay(now)+'T00:00:00Z')-d)/86400000):null;
}
export function auditDirectCoverage({audience,media,video,instagramDaily,youtubeDaily}={},now=Date.now()){
 const dates=lastSevenCompleted(now),checks=[];
 const mark=(id,label,pass,details)=>checks.push({id,label,pass:!!pass,details:String(details||'')});
 for(const p of ['yt','ig']){
  const source=audience?.platforms?.[p],types=['age','gender','countries'];
  const count=types.filter(k=>Array.isArray(source?.audience?.[k])&&source.audience[k].length>=2).length;
  const age=ageInDays(source?.snapshotDate,now);
  mark(p+'_audience',p==='yt'?'YouTube Zielgruppen':'Instagram Zielgruppen',
   count===3&&age!==null&&age>=0&&age<=3,count+'/3 Verteilungen · '+(age??'–')+' Tage alt');
 }
 for(const p of ['yt','ig']){
  const source=media?.platforms?.[p],count=source?.videos?.length||0,age=ageInDays(source?.snapshotDate,now);
  mark(p+'_media',p==='yt'?'YouTube Videokatalog':'Instagram Videokatalog',
   count>=10&&age!==null&&age>=0&&age<=3,count+' Videos · '+(age??'–')+' Tage alt');
 }
 const yt=video?.platforms?.yt,ig=video?.platforms?.ig;
 for(const days of [7,28,90]){
  const period=yt?.periods?.[String(days)],rows=(yt?.videos||[])
   .filter(v=>safe(v.metrics,'views'+days+'d')).length;
  const age=ageInDays(period?.end,now);
  mark('yt_'+days+'_insights','YouTube Videoanalysen '+days+' Tage',
   !!period&&rows>=10&&age!==null&&age>=1&&age<=4,
   rows+' Videos · Ende vor '+(age??'–')+' Tagen');
 }
 const yMap=new Map((youtubeDaily?.daily||[]).map(r=>[r.d,r]));
 const yDays=dates.filter(day=>safe(yMap.get(day),'views')).length;
 mark('yt_daily','YouTube Tagesaufrufe',yDays===7,yDays+'/7 bestätigte Tage');
 const igMap=new Map((instagramDaily?.daily||[]).map(r=>[r.date,r.metrics]));
 for(const [key,label]of [['views','IG Tagesaufrufe'],['reach','IG Tagesreichweite'],['interactions','IG Tagesinteraktionen']]){
  const n=dates.filter(day=>safe(igMap.get(day),key)).length;
  mark('ig_daily_'+key,label,n===7,n+'/7 bestätigte Tage');
 }
 const igExtra=(ig?.videos||[]).filter(v=>['shares','saves','averageWatchMs']
  .some(k=>safe(v.metrics,k))).length;
 mark('ig_reels','Instagram Reel-Zusatzwerte',igExtra>=10,igExtra+' Reels mit Zusatzwerten');
 return {
  schema:1,asOf:asDay(now),
  status:checks.every(c=>c.pass)?'coverage_complete':'incomplete',
  readyForParityReview:checks.every(c=>c.pass),
  releaseApproved:false,
  summary:{passed:checks.filter(c=>c.pass).length,total:checks.length},
  checkedDates:{start:dates[0],end:dates[6]},
  checks,
  warnings:[
   'Datenabdeckung ist kein Beweis gleicher Metrikdefinitionen.',
   'Vollständiger privater Cloudflare D1-SQL-Export ist separat erforderlich.',
   'Google- und Meta-Live-Autorisierung sowie Gastzugang sind extern zu prüfen.',
   'Vor einem Windsor-Wechsel sieben Tage realen Parallelbetrieb vergleichen.'
  ]
 };
}
