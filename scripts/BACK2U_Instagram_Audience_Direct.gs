/**
 * BACK2U V7.7 – Instagram audience from EXISTING Meta Graph API connection.
 *
 * Add to the existing Apps Script project alongside InstagramFollowerSync.gs.
 * Reuses private Instagram_Unified.gs -> b2uIgRequest_ (Facebook Graph API);
 * reuses BACK2U_CLOUDFLARE_FEED_SECRET; never embeds IG_SUAT_TOKEN or Cloudflare secrets.
 *
 * Meta permissions, account eligibility, follower thresholds and API version
 * may affect availability. Run back2uInstagramAudienceDirect ONCE and inspect
 * the Apps Script execution status before installing the automatic trigger.
 */
const BACK2U_IG_AUDIENCE_URL='https://back2u-cloud.leon-mueller0806.workers.dev/api/direct-audience/ingest';
const BACK2U_IG_COUNTRY_NAMES={
 DE:'Deutschland',US:'USA',BR:'Brasilien',MX:'Mexiko',IN:'Indien',
 TR:'Türkei',GB:'Vereinigtes Königreich',ID:'Indonesien',FR:'Frankreich',
 MA:'Marokko',PH:'Philippinen',RU:'Russland',PL:'Polen',AT:'Österreich',
 TH:'Thailand',CA:'Kanada',CH:'Schweiz'
};
function b2uIgProfileForAudience_(){
 if(typeof b2uIgRequest_!=='function')
  throw new Error('Instagram_Unified.gs: b2uIgRequest_ nicht gefunden.');
 const props=PropertiesService.getScriptProperties();
 if(!props.getProperty('IG_SUAT_TOKEN'))
  throw new Error('Private IG_SUAT_TOKEN-Skripteigenschaft fehlt.');
 const ids=[];
 for(const k of ['IG_USER_ID','IG_ACCOUNT_ID','IG_BUSINESS_ACCOUNT_ID',
  'INSTAGRAM_USER_ID','INSTAGRAM_ACCOUNT_ID','B2U_IG_USER_ID']){
  const v=props.getProperty(k);
  if(/^\d{12,25}$/.test(String(v||'')))ids.push(String(v));
 }
 // Use the same media-owner resolution as the existing follower sync.
 try{
  const book=SpreadsheetApp.openById(BACK2U_SPREADSHEET_ID);
  const tab=book.getSheetByName('Instagram_API_All');
  if(tab&&tab.getLastRow()>=2){
   const mediaIds=tab.getRange(2,1,Math.min(10,tab.getLastRow()-1),1)
    .getDisplayValues().map(r=>r[0]).filter(x=>/^\d{12,25}$/.test(x));
   for(const media of mediaIds){
    try{
     const owner=b2uIgRequest_(media,{fields:'owner'})?.owner?.id;
     if(/^\d{12,25}$/.test(String(owner||''))){ids.push(String(owner));break}
    }catch(_){} 
   }
  }
 }catch(_){}
 try{
  const pages=b2uIgRequest_('me/accounts',{fields:'instagram_business_account{id,username}',limit:100});
  for(const page of pages?.data||[]){
   const user=page?.instagram_business_account;
   if(String(user?.username||'').toLowerCase()==='lxon_jxmpstyle'&&
      /^\d{12,25}$/.test(String(user.id)))ids.push(String(user.id));
  }
 }catch(_){}
 for(const id of [...new Set(ids)]){
  try{
   const profile=b2uIgRequest_(id,{fields:'id,username,followers_count'});
   if(String(profile?.username||'').toLowerCase()==='lxon_jxmpstyle'&&
      /^\d{12,25}$/.test(String(profile.id||'')))return profile;
  }catch(_){}
 }
 throw new Error('Meta-Zugriff auf @lxon_jxmpstyle fehlt; keine Daten wurden verändert.');
}
function b2uIgDemography_(id,category){
 const data=b2uIgRequest_(id+'/insights',{
  metric:'follower_demographics',period:'lifetime',
  metric_type:'total_value',breakdown:category,timeframe:'last_30_days'
 });
 // Expected Meta Graph: data[0].total_value.breakdowns[0].results
 const nested=data?.data?.[0]?.total_value?.breakdowns||[];
 const breakdown=nested.find(b=>Array.isArray(b.results)&&b.results.length);
 if(!breakdown)throw new Error('Meta liefert keine follower_demographics für '+category+
  '. Berechtigungen und mindestens 100 Follower prüfen.');
 const entries=breakdown.results.map(r=>{
  const parts=r.dimension_values;
  if(!Array.isArray(parts)||parts.length!==1||!Number.isSafeInteger(Number(r.value)))
   throw new Error('Meta lieferte ein unerwartetes '+category+'-Datenformat.');
  return [String(parts[0]),Number(r.value)];
 });
 if(entries.some(r=>r[1]<0)||entries.length<(category==='gender'?2:4))
  throw new Error('Meta '+category+'-Verteilung ist zu klein oder unvollständig.');
 return entries;
}
function b2uIgAudiencePercent_(entries,category){
 const total=entries.reduce((s,r)=>s+r[1],0);
 if(total<=0)throw new Error('Meta '+category+' hat keine nutzbaren Follower.');
 const names=category==='gender'?{M:'Männer',F:'Frauen',U:'Nicht angegeben'}:{};
 const mapped=entries.map(([name,num])=>{
  const label=names[name]||(category==='country'?(BACK2U_IG_COUNTRY_NAMES[name]||name):
   String(name).replace(/-/g,'–'));
  return [label,Math.round(num/total*1000)/10];
 }).sort((a,b)=>b[1]-a[1]);
 const rows=category==='country'&&mapped.length>10?
  [...mapped.slice(0,10),['Weitere',0]]:mapped;
 let last=rows.length-1;
 const delta=Math.round((100-rows.reduce((s,r)=>s+r[1],0))*10)/10;
 rows[last][1]=Math.round((rows[last][1]+delta)*10)/10;
 if(rows[last][1]<0||rows.some(r=>r[1]<0||r[1]>100))
  throw new Error('Instagram demografische Prozentsumme ist nicht plausibel.');
 return {rows,total,reportedGroups:entries.length};
}
function back2uInstagramAudienceDirect(){
 const props=PropertiesService.getScriptProperties();
 const secret=props.getProperty('BACK2U_CLOUDFLARE_FEED_SECRET');
 if(!secret||secret.length<24)throw new Error('BACK2U_CLOUDFLARE_FEED_SECRET fehlt.');
 const profile=b2uIgProfileForAudience_();
 const id=String(profile.id);
 const age=b2uIgAudiencePercent_(b2uIgDemography_(id,'age'),'age');
 const gender=b2uIgAudiencePercent_(b2uIgDemography_(id,'gender'),'gender');
 const countries=b2uIgAudiencePercent_(b2uIgDemography_(id,'country'),'country');
 const fmt=d=>Utilities.formatDate(d,'UTC','yyyy-MM-dd');
 const asOf=fmt(new Date()),source='Meta Graph API (direct)';
 const payload={
  schema:1,platform:'ig',accountId:'lxon_jxmpstyle',snapshotDate:asOf,
  audience:{age:age.rows,gender:gender.rows,countries:countries.rows},
  audienceMeta:{
   age:{source,basis:'Anteile an '+age.total+' Instagram-Followern mit bekannter Altersverteilung, nicht zwingend alle Follower'},
   gender:{source,basis:'Anteile an '+gender.total+' Instagram-Followern im Geschlechtsbericht; Nicht angegeben bleibt separat'},
   countries:{source,basis:'Anteile an '+countries.total+' Instagram-Followern mit bekannter Länderzuordnung; fehlende Länder bleiben unbekannt'}
  }
 };
 const response=UrlFetchApp.fetch(BACK2U_IG_AUDIENCE_URL,{
  method:'post',contentType:'application/json',headers:{Authorization:'Bearer '+secret},
  payload:JSON.stringify(payload),muteHttpExceptions:true
 });
 if(response.getResponseCode()!==200)
  throw new Error('Cloudflare '+response.getResponseCode()+': '+response.getContentText().slice(0,220));
 Logger.log('Instagram-Zielgruppe synchronisiert: '+JSON.stringify({
  snapshotDate:asOf,groups:3,reportedCountries:countries.reportedGroups}));
}
function back2uInstallInstagramAudienceDirect(){
 back2uInstagramAudienceDirect(); // Must succeed before scheduling.
 const name='back2uInstagramAudienceDirect';
 if(!ScriptApp.getProjectTriggers().some(t=>t.getHandlerFunction()===name))
  ScriptApp.newTrigger(name).timeBased().inTimezone('Europe/Berlin').atHour(9).everyDays(1).create();
 Logger.log('Instagram-Zielgruppe: täglicher Meta-Abgleich eingerichtet.');
}
