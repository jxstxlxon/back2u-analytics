/**
 * BACK2U V7.7 – recover stale Instagram DAILY data without Apps Script edits.
 *
 * Uses only the existing WINDSOR_API_KEY in Cloudflare, and a known, scoped
 * Instagram connector/account already used by the private Google Sheets export.
 * The fetched account-day numbers are independently saved and overlaid on GET.
 *
 * No secret is written to D1 or to logs; no changes to original snapshots,
 * videos, direct-Meta records, Google Apps Script, TikTok or YouTube.
 */
const WINDSOR_IG_CONNECTOR='17841476673616735';
const WINDSOR_IG_ACCOUNT='27282542318110290';
const IG_DAILY_STORE='ig_windsor_daily_v1';
const IG_DAILY_STATUS='ig_windsor_daily_sync_v1';
const IG_DAILY_FIELDS=['date','views','reach','likes','comments','follower_count_1d','account_id'];
const DAY_MS=86400000;
const checkedDay=s=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&
  Number.isFinite(Date.parse(s+'T00:00:00Z'))&&
  new Date(Date.parse(s+'T00:00:00Z')).toISOString().slice(0,10)===s;
const metric=x=>{
  if(x===null||x===undefined||x==='')return null;
  const n=Number(x);return Number.isSafeInteger(n)&&n>=0?n:null;
};
const ymd=ms=>new Date(ms).toISOString().slice(0,10);
const errorText=e=>String(e?.message||e||'Unbekannter Fehler')
  .replace(/https?:\/\/\S+/gi,'[URL]').slice(0,150);

export function validateInstagramWindsorDaily(records,now=Date.now()){
 if(!Array.isArray(records)||records.length<3||records.length>40)
  throw Error('Instagram-Tagesbericht unvollständig');
 const today=Date.parse(ymd(now)+'T00:00:00Z');
 const earliest=ymd(today-16*DAY_MS),lastCompleted=ymd(today-DAY_MS);
 const seen=new Set(),daily=[];
 for(const raw of records){
  if(!raw||String(raw.account_id)!==WINDSOR_IG_ACCOUNT)
   throw Error('Instagram-Konto stimmt nicht überein');
  const date=String(raw.date||'');
  if(!checkedDay(date)||date<earliest||date>lastCompleted||seen.has(date))
   throw Error('Ungültiges, mehrfaches oder noch nicht abgeschlossenes Instagram-Datum');
  seen.add(date);
  const values={};
  const fields={
   views:'views',reach:'reach',likes:'likes',comments:'comments',
   follower_count_1d:'follows'
  };
  for(const [from,to] of Object.entries(fields)){
   const val=metric(raw[from]);
   if(val!==null)values[to]=val;
   else if(raw[from]!==undefined&&raw[from]!==null&&raw[from]!=='')
    throw Error('Ungültiger Instagram-Messwert '+from);
  }
  // The two account-day totals are mandatory to prevent misleading updates.
  if(values.views===undefined||values.reach===undefined)
   throw Error('Instagram-Tagesaufrufe oder Tagesreichweite fehlen');
  daily.push({d:date,...values});
 }
 daily.sort((a,b)=>a.d.localeCompare(b.d));
 if(daily.length<3)throw Error('Weniger als drei verifizierte Instagram-Tage');
 return daily;
}

export function mergeInstagramWindsorDaily(previous,validated,now=Date.now()){
 const today=ymd(now);
 const existing=(previous?.schema===1&&Array.isArray(previous.daily))
   ?previous.daily:[];
 const all=new Map(existing.filter(d=>checkedDay(d.d)&&d.d<=today).map(d=>[d.d,d]));
 for(const day of validated)all.set(day.d,day);
 return {schema:1,source:'Windsor.ai Instagram Insights (account-day)',
  accountId:WINDSOR_IG_ACCOUNT,updatedAt:new Date(now).toISOString(),
  dataThrough:[...all.keys()].sort().at(-1)||null,
  daily:[...all.values()].sort((a,b)=>a.d.localeCompare(b.d)).slice(-125)};
}

export function overlayInstagramWindsorDaily(snapshot,record){
 if(!snapshot?.platforms?.ig||record?.schema!==1||
    record.accountId!==WINDSOR_IG_ACCOUNT||!Array.isArray(record.daily))
   return snapshot;
 const existing=new Map((snapshot.platforms.ig.daily||[]).filter(x=>checkedDay(x.d))
    .map(x=>[x.d,x]));
 for(const day of record.daily){
  if(!checkedDay(day.d))continue;
  const before=existing.get(day.d)||{d:day.d};
  const merged={...before,sourceFields:{...(before.sourceFields||{})}};
  for(const key of ['views','reach','likes','comments','follows']){
   if(metric(day[key])===null)continue;
   // An independently stored, verified per-day count is preferable to a stale
   // Google Sheets snapshot; direct Meta API values get overlaid AFTER this.
   merged[key]=day[key];
   merged.sourceFields[key]=record.source;
  }
  existing.set(day.d,merged);
 }
 snapshot.platforms.ig.daily=[...existing.values()].sort((a,b)=>a.d.localeCompare(b.d));
 snapshot.platforms.ig.dailySource='Windsor.ai verified account-days + retained Sheets history';
 snapshot.platforms.ig.windsorDailyThrough=record.dataThrough||null;
 snapshot.platforms.ig.windsorDailyUpdatedAt=record.updatedAt||null;
 return snapshot;
}

export async function runInstagramWindsorDailySync(env,{
 get,put,fetcher=fetch,now=Date.now(),force=false
}={}){
 const secret=String(env?.WINDSOR_API_KEY||'').trim();
 if(secret.length<16)return {status:'not_configured',reason:'WINDSOR_API_KEY fehlt'};
 const prior=await get(env,IG_DAILY_STATUS)||{};
 const lastAttempt=Date.parse(prior.lastAttemptAt||'');
 const throttle=prior.status==='ok'?6*3600000:prior.status==='running'?45*60000:60*60000;
 if(!force&&Number.isFinite(lastAttempt)&&now-lastAttempt>=0&&now-lastAttempt<throttle)
  return {status:'skipped',lastSuccessAt:prior.lastSuccessAt||null};
 const startedAt=new Date(now).toISOString();
 await put(env,IG_DAILY_STATUS,{...prior,status:'running',lastAttemptAt:startedAt});
 try{
  const url=new URL('https://connectors.windsor.ai/instagram');
  url.searchParams.set('api_key',secret);
  url.searchParams.set('fields',IG_DAILY_FIELDS.join(','));
  url.searchParams.set('date_preset','last_14d');
  url.searchParams.set('select_accounts',WINDSOR_IG_CONNECTOR);
  url.searchParams.set('_renderer','json');
  const response=await fetcher(url.href,{
   method:'GET',headers:{accept:'application/json'},signal:AbortSignal.timeout(25000)
  });
  if(!response.ok)throw Error('Windsor HTTP '+response.status);
  const data=await response.json();
  const records=Array.isArray(data)?data:
   Array.isArray(data?.data)?data.data:Array.isArray(data?.results)?data.results:null;
  const verified=validateInstagramWindsorDaily(records,now);
  const former=await get(env,IG_DAILY_STORE);
  const next=mergeInstagramWindsorDaily(former,verified,now);
  await put(env,IG_DAILY_STORE,next);
  const status={status:'ok',lastAttemptAt:startedAt,lastSuccessAt:startedAt,
   dataThrough:next.dataThrough,rows:next.daily.length,latestBatchDays:verified.length,
   error:null};
  await put(env,IG_DAILY_STATUS,status);
  return status;
 }catch(e){
  const failed={...prior,status:'error',lastAttemptAt:startedAt,
   error:errorText(e),lastSuccessAt:prior.lastSuccessAt||null};
  await put(env,IG_DAILY_STATUS,failed);
  return failed;
 }
}

export async function instagramWindsorDailyStatus(env,{get}){
 const [record,status,snapshot]=await Promise.all([
  get(env,IG_DAILY_STORE),get(env,IG_DAILY_STATUS),get(env,'snapshot')
 ]);
 const base=snapshot?.platforms?.ig?.daily||[];
 return {
  configured:!!(env.WINDSOR_API_KEY&&String(env.WINDSOR_API_KEY).length>=16),
  syncStatus:status?.status||'never_run',
  lastAttemptAt:status?.lastAttemptAt||null,
  lastSuccessAt:status?.lastSuccessAt||null,
  error:status?.error||null,
  snapshotDataThrough:base.at(-1)?.d||null,
  verifiedWindsorThrough:record?.dataThrough||null,
  verifiedDayCount:record?.daily?.length||0
 };
}
