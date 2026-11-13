/* BACK2U V7.8 – independent, verified TikTok Organic account-day history.
   Only opt-in after private D1 backup + proven Windsor plan access.
   Data stored separately from snapshot, OAuth, videos and audience. */
const ACCOUNT='_000Gn_3riaTBVXEHqk1YfrwMWPK3cJcFkGv';
const SOURCE='TikTok Organic via Windsor.ai (daily account report)';
const FIELDS=['account_id','date','video_views','profile_views','daily_total_followers_count'];
const MS=86400000;
const dateOf=ms=>new Date(ms).toISOString().slice(0,10);
const validDay=x=>typeof x==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(x)&&
 Number.isFinite(Date.parse(x+'T00:00:00Z'))&&dateOf(Date.parse(x+'T00:00:00Z'))===x;
function count(raw){
 if(raw===null||raw===undefined||raw==='')return null;
 if(typeof raw!=='number'&&!(typeof raw==='string'&&/^\d+$/.test(raw)))throw Error('Invalid count');
 const n=Number(raw);
 if(!Number.isSafeInteger(n)||n<0)throw Error('Invalid count');
 return n;
}
export function validateTikTokDailyRows(rows,now=Date.now()){
 if(!Array.isArray(rows)||rows.length<3||rows.length>35)throw Error('Incomplete daily report');
 const today=dateOf(now),earliest=dateOf(now-32*MS),seen=new Set(),daily=[];
 for(const row of rows){
  if(String(row?.account_id||'')!==ACCOUNT)throw Error('Wrong TikTok account');
  const date=String(row?.date||'');
  if(!validDay(date)||date>today||date<earliest||seen.has(date))throw Error('Invalid or duplicate day');
  seen.add(date);
  if(date===today)continue; // Current day may be partial, do not count as complete.
  const metrics={};
  for(const [out,input] of [['views','video_views'],['profileViews','profile_views'],
   ['followersTotal','daily_total_followers_count']]){
   const v=count(row[input]);if(v!==null)metrics[out]=v;
  }
  if(Object.keys(metrics).length)daily.push({date,metrics});
 }
 if(daily.filter(r=>Number.isSafeInteger(r.metrics.views)&&
  Number.isSafeInteger(r.metrics.profileViews)).length<3)
  throw Error('Fewer than three verified complete days');
 daily.sort((a,b)=>a.date.localeCompare(b.date));
 return {schema:1,platform:'tt',accountId:ACCOUNT,source:SOURCE,
  snapshotDate:today,updatedAt:new Date(now).toISOString(),daily};
}
export function mergeTikTokDaily(old,next,now=Date.now()){
 if(next?.schema!==1||next.accountId!==ACCOUNT||!Array.isArray(next.daily))
  throw Error('Invalid validated TikTok report');
 const byDay=new Map((old?.schema===1?old.daily:[]).filter(r=>
  validDay(r?.date)&&r?.metrics&&typeof r.metrics==='object')
  .map(r=>[r.date,{...r,metrics:{...r.metrics}}]));
 for(const row of next.daily){
  const prev=byDay.get(row.date),prior=String(prev?.sourceSnapshotDate||prev?.asOf||'').slice(0,10);
  if(prior&&next.snapshotDate<prior)continue;
  const metrics={...(prev?.metrics||{})};
  for(const [k,v] of Object.entries(row.metrics||{}))
   if(['views','profileViews','followersTotal'].includes(k)&&Number.isSafeInteger(v)&&v>=0)
    metrics[k]=v;
  byDay.set(row.date,{date:row.date,metrics,sourceSnapshotDate:next.snapshotDate,asOf:next.updatedAt});
 }
 return {schema:1,accountId:ACCOUNT,source:SOURCE,snapshotDate:next.snapshotDate,
  updatedAt:next.updatedAt,daily:[...byDay.values()]
   .filter(r=>r.date>=dateOf(now-400*MS)&&r.date<dateOf(now))
   .sort((a,b)=>a.date.localeCompare(b.date)).slice(-400)};
}
export function overlayTikTokDaily(snapshot,store){
 if(!snapshot?.platforms?.tt||store?.schema!==1||store.accountId!==ACCOUNT||
  !Array.isArray(store.daily))return snapshot;
 const tt=snapshot.platforms.tt;
 const byDay=new Map((tt.daily||[]).filter(x=>validDay(x?.d)).map(x=>[x.d,{...x}]));
 for(const item of store.daily){
  if(!validDay(item?.date))continue;
  const row={...(byDay.get(item.date)||{d:item.date})};
  row.sourceFields={...(row.sourceFields||{})};
  for(const k of ['views','profileViews','followersTotal']){
   const v=item.metrics?.[k];
   if(Number.isSafeInteger(v)&&v>=0){row[k]=v;row.sourceFields[k]=SOURCE}
  }
  row.tiktokDailyAsOf=item.asOf;
  byDay.set(item.date,row);
 }
 tt.daily=[...byDay.values()].sort((a,b)=>a.d.localeCompare(b.d));
 tt.dailySource=SOURCE+' + retained historical data';
 const measured=store.daily.filter(x=>Number.isSafeInteger(x.metrics?.views));
 tt.directDailyThrough=measured.at(-1)?.date||null;
 tt.directDailyCount=measured.length;
 return snapshot;
}
export function tiktokDailyCoverage(store,now=Date.now()){
 const end=Date.parse(dateOf(now)+'T00:00:00Z')-MS;
 const indexed=new Map((store?.daily||[]).map(x=>[x.date,x.metrics||{}]));
 const windows={};
 for(const size of [7,28,90]){
  const known={views:0,profileViews:0,followersTotal:0};
  for(let i=0;i<size;i++){
   const d=dateOf(end-i*MS),metrics=indexed.get(d)||{};
   for(const k of Object.keys(known))if(Number.isSafeInteger(metrics[k])&&metrics[k]>=0)known[k]++;
  }
  windows[String(size)]={days:size,known,complete:known.views===size&&known.profileViews===size};
 }
 const observed=(store?.daily||[]).filter(x=>Number.isSafeInteger(x.metrics?.views));
 return {lastMeasuredDay:observed.at(-1)?.date||null,totalStoredDays:store?.daily?.length||0,
  windows,source:store?.source||null};
}
const redact=e=>String(e?.message||'TikTok request failed').slice(0,150)
 .replace(/https?:\/\/\S+/gi,'[URL]').replace(/api_key=[^\s&]+/gi,'[redacted]');
export async function runTikTokDailySync(env,{get,put,force=false,fetcher=fetch,now=Date.now()}={}){
 const apiKey=String(env?.WINDSOR_API_KEY||'').trim();
 if(apiKey.length<16)return {status:'not_configured',reason:'WINDSOR_API_KEY missing'};
 const prev=await get(env,'tt_daily_sync_status')||{};
 const elapsed=now-Date.parse(prev.lastAttemptAt||0);
 const delay=prev.status==='ok'?MS:prev.status==='running'?40*60000:3*3600000;
 if(!force&&Number.isFinite(elapsed)&&elapsed>=0&&elapsed<delay)
  return {status:'skipped',lastAttemptAt:prev.lastAttemptAt,lastSuccessAt:prev.lastSuccessAt||null};
 const started=new Date(now).toISOString();
 await put(env,'tt_daily_sync_status',{...prev,status:'running',lastAttemptAt:started,error:null});
 try{
  const url=new URL('https://connectors.windsor.ai/tiktok_organic');
  for(const [k,v] of [['api_key',apiKey],['fields',FIELDS.join(',')],
   ['date_preset','last_28d'],['select_accounts',ACCOUNT],['_renderer','json']])
   url.searchParams.set(k,v);
  const r=await fetcher(url.toString(),{method:'GET',headers:{accept:'application/json'},
   signal:AbortSignal.timeout(25000)});
  if(!r.ok)throw Error('Windsor TikTok HTTP '+r.status);
  const payload=await r.json();
  const rows=Array.isArray(payload)?payload:Array.isArray(payload?.data)?payload.data:
   Array.isArray(payload?.results)?payload.results:null;
  const validated=validateTikTokDailyRows(rows,now);
  const updated=mergeTikTokDaily(await get(env,'tt_daily_v1'),validated,now);
  await put(env,'tt_daily_v1',updated);
  const status={status:'ok',lastAttemptAt:started,lastSuccessAt:started,error:null,
   lastDataDay:tiktokDailyCoverage(updated,now).lastMeasuredDay,
   storedDays:updated.daily.length,source:SOURCE};
  await put(env,'tt_daily_sync_status',status);
  return status;
 }catch(e){
  const failed={status:'error',lastAttemptAt:started,lastSuccessAt:prev.lastSuccessAt||null,
   lastDataDay:prev.lastDataDay||null,storedDays:prev.storedDays||null,
   error:redact(e),source:SOURCE};
  await put(env,'tt_daily_sync_status',failed);
  return failed;
 }
}
