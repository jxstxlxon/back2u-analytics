/*
 * BACK2U V7.6 – scheduled private audience refresh from Windsor.ai.
 * No analytics values or API keys belong in the public source tree.
 * Required one-time Cloudflare secret: WINDSOR_API_KEY.
 *
 * Current Cloudflare Worker already runs a cron every 30 minutes.
 * This module refreshes only once in 24 hours, or retries failures after 3 hours.
 */
const AUDIENCE_STORE='audience_v1';
const SYNC_STORE='audience_sync_status';
const EXPECTED={
 yt:'UCBnnaMohI_VfKihekEwaQEw',
 ig:'27282542318110290',
 tt:'_000Gn_3riaTBVXEHqk1YfrwMWPK3cJcFkGv'
};
const REPORTS=[
 {p:'yt',type:'age',connector:'youtube',account:'83736',preset:'last_28d',fields:['account_id','viewer_age_group','viewer_percentage'],label:'viewer_age_group',value:'viewer_percentage',unit:'percent',minimum:4},
 {p:'yt',type:'gender',connector:'youtube',account:'83736',preset:'last_28d',fields:['account_id','viewer_gender','viewer_percentage'],label:'viewer_gender',value:'viewer_percentage',unit:'percent',minimum:2},
 {p:'yt',type:'countries',connector:'youtube',account:'83736',preset:'last_28d',fields:['account_id','country','views'],label:'country',value:'views',unit:'counts',minimum:20,country:true},
 {p:'ig',type:'age',connector:'instagram',account:'17841476673616735',preset:'last_3dT',fields:['account_id','audience_age_name','audience_age_size'],label:'audience_age_name',value:'audience_age_size',unit:'counts',minimum:4},
 {p:'ig',type:'gender',connector:'instagram',account:'17841476673616735',preset:'last_3dT',fields:['account_id','audience_gender_name','audience_gender_size'],label:'audience_gender_name',value:'audience_gender_size',unit:'counts',minimum:2},
 {p:'ig',type:'countries',connector:'instagram',account:'17841476673616735',preset:'last_3dT',fields:['account_id','audience_country_name','audience_country_size'],label:'audience_country_name',value:'audience_country_size',unit:'counts',minimum:5,country:true},
 {p:'tt',type:'age',connector:'tiktok_organic',account:'_000Gn_3riaTBVXEHqk1YfrwMWPK3cJcFkGv',preset:'last_3dT',fields:['account_id','audience_ages_age','audience_ages_percentage'],label:'audience_ages_age',value:'audience_ages_percentage',unit:'fraction',minimum:3},
 {p:'tt',type:'gender',connector:'tiktok_organic',account:'_000Gn_3riaTBVXEHqk1YfrwMWPK3cJcFkGv',preset:'last_3dT',fields:['account_id','audience_genders_gender','audience_genders_percentage'],label:'audience_genders_gender',value:'audience_genders_percentage',unit:'fraction',minimum:2},
 {p:'tt',type:'countries',connector:'tiktok_organic',account:'_000Gn_3riaTBVXEHqk1YfrwMWPK3cJcFkGv',preset:'last_3dT',fields:['account_id','audience_countries_country','audience_countries_percentage'],label:'audience_countries_country',value:'audience_countries_percentage',unit:'fraction',minimum:5,country:true}
];
const AGE_LABELS={
 'age13-17':'13–17','age18-24':'18–24','age25-34':'25–34',
 'age35-44':'35–44','age45-54':'45–54','age55-64':'55–64','age65-':'65+'
};
const YT_COUNTRY_LABELS={
 'Germany':'Deutschland','United States':'USA','Brazil':'Brasilien','Poland':'Polen',
 'United Kingdom':'Vereinigtes Königreich','Indonesia':'Indonesien',
 'Austria':'Österreich','Philippines':'Philippinen','Russia':'Russland',
 'Mexico':'Mexiko','France':'Frankreich','Netherlands':'Niederlande',
 'Canada':'Kanada','Switzerland':'Schweiz','Czech Republic':'Tschechien'
};
function round1(v){return Math.round((v+Number.EPSILON)*10)/10}
function countryName(raw){
 if(raw==='Others'||raw==='Other'||raw==='Weitere')return 'Weitere';
 if(YT_COUNTRY_LABELS[raw])return YT_COUNTRY_LABELS[raw];
 if(/^[A-Z]{2}$/.test(raw)){
  if(raw==='US')return 'USA';
  if(raw==='GB')return 'Vereinigtes Königreich';
  try{return new Intl.DisplayNames(['de'],{type:'region'}).of(raw)||raw}catch{return raw}
 }
 return raw;
}
function labelFor(spec,raw){
 const val=String(raw||'').trim();
 if(spec.country)return countryName(val);
 if(spec.type==='age')return AGE_LABELS[val]||val.replace(/^age/,'').replace(/-/g,'–');
 if(spec.type==='gender'){
  const m={female:'Frauen',male:'Männer',genderUserSpecified:'Selbst angegeben',
   F:'Frauen',M:'Männer',U:'Nicht angegeben',Female:'Frauen',Male:'Männer',Other:'Andere'};
  return m[val]||val;
 }
 return val;
}
function makeShares(spec,rows){
 if(!Array.isArray(rows)||rows.length<spec.minimum||rows.length>300)
  throw Error('Incomplete '+spec.p+'/'+spec.type+' report');
 const seen=new Set(),points=[];
 for(const r of rows){
  if(!r||String(r.account_id||'')!==EXPECTED[spec.p])
   throw Error('Unexpected account in '+spec.p+'/'+spec.type+' report');
  const label=labelFor(spec,r[spec.label]),value=Number(r[spec.value]);
  if(!label||label.length>75||/[<>]/.test(label)||seen.has(label)||!Number.isFinite(value)||value<0)
   throw Error('Invalid '+spec.p+'/'+spec.type+' category');
  seen.add(label);points.push([label,value]);
 }
 const rawTotal=points.reduce((s,r)=>s+r[1],0);
 if(rawTotal<=0)throw Error('Empty '+spec.p+'/'+spec.type+' totals');
 let normalized;
 if(spec.unit==='counts'){
  if(points.some(r=>!Number.isSafeInteger(r[1])))throw Error('Non-integer follower/view count');
  normalized=points.map(([name,n])=>[name,n/rawTotal*100]);
 }else{
  // TikTok Organic returns fractions (e.g. 0.385). Some connector versions use percentages.
  const expectedBase=spec.unit==='fraction'&&Math.abs(rawTotal-1)<0.02?1:100;
  if(Math.abs(rawTotal-expectedBase)>1.1)
   throw Error('Percentage totals not complete in '+spec.p+'/'+spec.type);
  normalized=points.map(([name,n])=>[name,n/expectedBase*100]);
 }
 normalized.sort((a,b)=>Number(a[0]==='Weitere')-Number(b[0]==='Weitere')||b[1]-a[1]);
 if(spec.country&&normalized.length>10){
  const sorted=normalized.filter(x=>x[0]!=='Weitere');
  const group=sorted.slice(0,10);
  const remainder=100-group.reduce((sum,x)=>sum+x[1],0);
  normalized=[...group,['Weitere',Math.max(0,remainder)]];
 }
 // Keep the visible one-decimal percentages at exactly 100.0.
 const out=normalized.map(([n,v])=>[n,round1(v)]);
 const total=out.reduce((sum,x)=>sum+x[1],0);
 const residual=round1(100-total);
 if(Math.abs(residual)>1.2)throw Error('Rounding discrepancy too large');
 const adjust=out.findIndex(x=>x[0]==='Weitere');
 const index=adjust>=0?adjust:out.length-1;
 out[index][1]=round1(out[index][1]+residual);
 if(out.some(x=>x[1]<0||x[1]>100))throw Error('Percentage outside range');
 return {rows:out,rawCount:rows.length,denominator:rawTotal};
}
async function getWindsorReport(spec,key,fetcher){
 const uri=new URL('https://connectors.windsor.ai/'+spec.connector);
 uri.searchParams.set('api_key',key);
 uri.searchParams.set('fields',spec.fields.join(','));
 uri.searchParams.set('date_preset',spec.preset);
 uri.searchParams.set('select_accounts',spec.account);
 uri.searchParams.set('_renderer','json');
 let response;
 try{
  response=await fetcher(uri.toString(),{
   method:'GET',headers:{'accept':'application/json'},
   signal:AbortSignal.timeout(25000)
  });
 }catch{throw Error('Windsor connection failed for '+spec.p+'/'+spec.type)}
 if(!response.ok)throw Error('Windsor HTTP '+response.status+' for '+spec.p+'/'+spec.type);
 let payload;
 try{payload=await response.json()}catch{throw Error('Invalid Windsor JSON for '+spec.p+'/'+spec.type)}
 const records=Array.isArray(payload)?payload:Array.isArray(payload?.data)?payload.data:
  Array.isArray(payload?.results)?payload.results:null;
 if(!records)throw Error('Missing Windsor records for '+spec.p+'/'+spec.type);
 return {spec,values:makeShares(spec,records)};
}
function assembleAudience(reports,nowIso){
 const audience={yt:{},ig:{},tt:{}},audienceMeta={yt:{},ig:{},tt:{}};
 const reportDay=nowIso.slice(0,10);
 const completed=new Date(Date.parse(reportDay+'T00:00:00Z')-86400000).toISOString().slice(0,10);
 const from=new Date(Date.parse(completed+'T00:00:00Z')-27*86400000).toISOString().slice(0,10);
 for(const {spec,values} of reports){
  audience[spec.p][spec.type]=values.rows;
  const basis=spec.p==='yt'
    ?(spec.country
      ?'Anteile von '+values.denominator.toLocaleString('de-DE')+' Aufrufen mit Länderzuordnung ('+values.rawCount+' Länder), keine einzigartigen Zuschauer'
      :'Prozentanteile der YouTube-Zuschauer, keine absoluten Personenwerte')
    :spec.p==='ig'
    ?'Anteil an '+values.denominator.toLocaleString('de-DE')+' Instagram-Followern mit '+(spec.country?'Länderzuordnung':spec.type==='age'?'Alterszuordnung':'Geschlechtszuordnung')+' (nicht zwingend alle Follower)'
    :'Anteile der TikTok-Follower laut TikTok Organic, nicht Videozuschauer';
  audienceMeta[spec.p][spec.type]={
   source:spec.p==='yt'?'YouTube Analytics über Windsor.ai':
    spec.p==='ig'?'Instagram Insights über Windsor.ai':'TikTok Organic über Windsor.ai',
   asOf:reportDay,
   ...(spec.p==='yt'?{period:from+' bis '+completed}:{}),
   basis
  };
 }
 return {schema:1,source:'Windsor.ai (automatic)',snapshotDate:reportDay,updatedAt:nowIso,
  audience,audienceMeta};
}
const errorText=e=>String(e?.message||'Unknown Windsor error').slice(0,160).replace(/https?:\/\/\S+/gi,'[URL]');
/**
 * Call from the existing 30min Cloudflare Cron. No additional trigger.
 * Atomic behavior for audience content: only replace the saved 9 segments
 * after ALL 9 connector reports are complete, scoped and validated.
 */
export async function runAudienceAutoSync(env,{get,put,force=false,tiktokOnly=false,fetcher=fetch,now=Date.now()}={}){
 const secret=String(env.WINDSOR_API_KEY||'').trim();
 if(secret.length<16)return {status:'not_configured',reason:'WINDSOR_API_KEY missing'};
 const old=await get(env,SYNC_STORE)||{};
 const since=now-Date.parse(old.lastAttemptAt||0);
 const minimum=old.status==='ok'?24*3600*1000:old.status==='running'?40*60*1000:3*3600*1000;
 if(!force&&Number.isFinite(since)&&since>=0&&since<minimum)
  return {status:'skipped',lastAttemptAt:old.lastAttemptAt,lastSuccessAt:old.lastSuccessAt||null};
 const nowIso=new Date(now).toISOString();
 const progress={...old,status:'running',lastAttemptAt:nowIso,error:null};
 await put(env,SYNC_STORE,progress);
 try{
  // Optional future downgrade mode: TikTok is the sole allowed Forever-Free source.
  // This flag is NEVER auto-enabled; require a verified user decision after downgrade.
  const selected=tiktokOnly?REPORTS.filter(spec=>spec.p==='tt'):REPORTS;
  const reports=await Promise.all(selected.map(spec=>getWindsorReport(spec,secret,fetcher)));
  const partial=assembleAudience(reports,nowIso);
  let fresh=partial;
  if(tiktokOnly){
   const previous=await get(env,AUDIENCE_STORE);
   if(previous?.schema!==1||!previous.audience?.yt||!previous.audience?.ig)
    throw Error('Cannot enable TikTok-only without preserved YouTube and Instagram history');
   fresh={...previous,snapshotDate:partial.snapshotDate,updatedAt:nowIso,
    audience:{...previous.audience,tt:partial.audience.tt},
    audienceMeta:{...previous.audienceMeta,tt:partial.audienceMeta.tt}};
  }
  await put(env,AUDIENCE_STORE,fresh);
  const success={status:'ok',lastAttemptAt:nowIso,lastSuccessAt:nowIso,snapshotDate:fresh.snapshotDate,
   groups:selected.length,error:null,source:tiktokOnly?'Windsor.ai (TikTok only)':'Windsor.ai'};
  await put(env,SYNC_STORE,success);
  return success;
 }catch(e){
  const failed={status:'error',lastAttemptAt:nowIso,lastSuccessAt:old.lastSuccessAt||null,
   snapshotDate:old.snapshotDate||null,error:errorText(e),source:'Windsor.ai'};
  await put(env,SYNC_STORE,failed);
  return failed;
 }
}
