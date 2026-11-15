/**
 * BACK2U V7.7: supplemental YouTube channel-day metrics from the existing
 * Windsor.ai YouTube Analytics connector. No fake values and no YouTube
 * private Apps Script changes. Does not overwrite verified official metrics.
 */
const CHANNEL='UCBnnaMohI_VfKihekEwaQEw';
const STORE='yt_windsor_extras_v1',STATUS='yt_windsor_extras_sync_v1';
const DAY=86400000;
const iso=ms=>new Date(ms).toISOString().slice(0,10);
const validDay=d=>typeof d==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(d)&&
 Number.isFinite(Date.parse(d+'T00:00:00Z'))&&
 iso(Date.parse(d+'T00:00:00Z'))===d;
function metric(x,{decimal=false}={}){
 if(x===null||x===undefined||x===''||typeof x==='boolean')return null;
 const n=Number(x);
 return Number.isFinite(n)&&n>=0&&(decimal||Number.isSafeInteger(n))?n:null;
}
const safeError=e=>String(e?.message||e||'Unknown error').replace(/https?:\/\/\S+/gi,'[URL]').slice(0,150);
const FIELDS=['date','account_id','engaged_views','estimated_minutes_watched','average_view_duration','shares'];

export function validateYouTubeWindsorExtras(rows,now=Date.now()){
 if(!Array.isArray(rows)||rows.length<1||rows.length>50)
  throw Error('No verified YouTube account-day report');
 const cutoff=iso(now-32*DAY),yesterday=iso(now-DAY);
 const map=new Map();
 for(const row of rows){
  if(String(row?.account_id||'')!==CHANNEL)throw Error('YouTube account mismatch');
  const d=String(row.date||'');
  if(!validDay(d)||d<cutoff||d>yesterday)throw Error('YouTube date out of bounds');
  const values={d};
  for(const [from,to,decimal] of [
   ['engaged_views','engagedViews',false],
   ['estimated_minutes_watched','watchMinutes',false],
   ['average_view_duration','averageViewSeconds',true],
   ['shares','shares',false]
  ]){
   const raw=row[from],v=metric(raw,{decimal});
   if(v!==null)values[to]=v;
   else if(raw!==null&&raw!==undefined&&raw!=='')
    throw Error('Invalid YouTube analytics metric '+from);
  }
  if(Object.keys(values).length<2)continue;
  const old=map.get(d);
  if(old){
   const conflicting=Object.keys(values).some(k=>k!=='d'&&old[k]!==undefined&&
    values[k]!==undefined&&old[k]!==values[k]);
   if(conflicting)throw Error('Conflicting YouTube account-day reports');
   map.set(d,{...old,...values});
  }else map.set(d,values);
 }
 if(!map.size)throw Error('No measured YouTube values in report');
 return [...map.values()].sort((a,b)=>a.d.localeCompare(b.d));
}

export function combineYouTubeWindsorExtras(before,daily,now=Date.now()){
 const previous=before?.schema===1&&Array.isArray(before.daily)?before.daily:[];
 const map=new Map(previous.filter(x=>validDay(x?.d)).map(x=>[x.d,x]));
 for(const row of daily)map.set(row.d,row);
 return {schema:1,channelId:CHANNEL,updatedAt:new Date(now).toISOString(),
  daily:[...map.values()].sort((a,b)=>a.d.localeCompare(b.d)).slice(-120),
  source:'Windsor.ai YouTube Analytics (account-day)'};
}

export function overlayYouTubeWindsorExtras(snapshot,record){
 if(!snapshot?.platforms?.yt||record?.schema!==1||record.channelId!==CHANNEL||
  !Array.isArray(record.daily))return snapshot;
 const map=new Map((snapshot.platforms.yt.daily||[]).filter(r=>validDay(r?.d))
  .map(r=>[r.d,r]));
 for(const day of record.daily){
  if(!validDay(day.d))continue;
  const old=map.get(day.d)||{d:day.d};
  const merged={...old,sourceFields:{...(old.sourceFields||{})}};
  for(const key of ['engagedViews','watchMinutes','averageViewSeconds','shares']){
   if(metric(day[key],{decimal:key==='averageViewSeconds'})===null)continue;
   // Official direct YouTube Analytics is stronger than Windsor's proxy.
   if(metric(old[key],{decimal:key==='averageViewSeconds'})!==null&&
    (old.source==='YouTube Analytics API'||
     old.sourceFields?.[key]==='YouTube Analytics API'))continue;
   merged[key]=day[key];merged.sourceFields[key]=record.source;
  }
  map.set(day.d,merged);
 }
 snapshot.platforms.yt.daily=[...map.values()].sort((a,b)=>a.d.localeCompare(b.d));
 snapshot.platforms.yt.windsorExtrasThrough=record.daily.at(-1)?.d||null;
 return snapshot;
}

export async function runYouTubeWindsorExtrasSync(env,{
 get,put,fetcher=fetch,now=Date.now(),force=false
}={}){
 const key=String(env?.WINDSOR_API_KEY||'').trim();
 if(key.length<16)return {status:'not_configured'};
 const old=await get(env,STATUS)||{};
 const last=Date.parse(old.lastAttemptAt||'');
 const pipelineVersion='v77.10-full-28day-youtube-extras';
 const throttle=old.status==='ok'?6*3600000:
  old.status==='running'?45*60000:60*60000;
 if(!force&&old.pipelineVersion===pipelineVersion&&Number.isFinite(last)&&now-last>=0&&now-last<throttle)
  return {status:'skipped',lastSuccessAt:old.lastSuccessAt||null};
 const stamp=new Date(now).toISOString();
 await put(env,STATUS,{...old,pipelineVersion,status:'running',lastAttemptAt:stamp});
 try{
  const url=new URL('https://connectors.windsor.ai/youtube');
  url.searchParams.set('api_key',key);
  url.searchParams.set('fields',FIELDS.join(','));
  url.searchParams.set('date_from',iso(now-28*DAY));
  url.searchParams.set('date_to',iso(now-DAY));
  url.searchParams.set('select_accounts',CHANNEL);
  url.searchParams.set('_renderer','json');
  const response=await fetcher(url.href,{
   method:'GET',headers:{accept:'application/json'},
   signal:AbortSignal.timeout(16000)
  });
  if(!response.ok)throw Error('Windsor YouTube HTTP '+response.status);
  const body=await response.json();
  const rows=Array.isArray(body)?body:
   Array.isArray(body?.data)?body.data:Array.isArray(body?.results)?body.results:null;
  const verified=validateYouTubeWindsorExtras(rows,now);
  const previous=await get(env,STORE);
  const combined=combineYouTubeWindsorExtras(previous,verified,now);
  await put(env,STORE,combined);
  const status={pipelineVersion,status:'ok',lastAttemptAt:stamp,lastSuccessAt:stamp,
   dataThrough:combined.daily.at(-1)?.d||null,rows:combined.daily.length,error:null};
  await put(env,STATUS,status);return status;
 }catch(e){
  const status={...old,pipelineVersion,status:'error',lastAttemptAt:stamp,
   error:safeError(e),lastSuccessAt:old.lastSuccessAt||null};
  await put(env,STATUS,status);return status;
 }
}

export async function youtubeWindsorExtrasStatus(env,{get}){
 const [data,status]=await Promise.all([get(env,STORE),get(env,STATUS)]);
 return{configured:!!(env.WINDSOR_API_KEY&&String(env.WINDSOR_API_KEY).trim().length>=16),
  status:status?.status||'never_run',lastSuccessAt:status?.lastSuccessAt||null,
  error:status?.error||null,dataThrough:data?.daily?.at(-1)?.d||null,
  rows:data?.daily?.length||0};
}
