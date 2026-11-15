/**
 * BACK2U V7.7 Instagram CURRENT follower totals via existing Windsor.ai key.
 *
 * Independent supplement to the original direct Meta profile endpoint.
 * followers_count = current profile total; follower_count_1d = daily new
 * follows. Never conflate the two.
 */
const SOURCE_ACCOUNT='17841476673616735';
const META_ACCOUNT='27282542318110290';
const EXPECTED_USER='lxon_jxmpstyle';
const PROFILE_STORE='ig_windsor_followers_v1';
const SYNC_STORE='ig_windsor_followers_sync_v1';
const DAY_PATTERN=/^\d{4}-\d{2}-\d{2}$/;
const day=now=>new Date(now).toISOString().slice(0,10);
const isCount=x=>Number.isSafeInteger(x)&&x>=0&&x<=1000000000;
const safeError=e=>String(e?.message||e||'Unbekannter Fehler')
 .replace(/https?:\/\/\S+/gi,'[URL]').slice(0,150);

export function validateInstagramWindsorFollowers(rows){
 if(!Array.isArray(rows)||rows.length!==1)
  throw Error('Instagram-Followerprofil fehlt oder liefert mehrere Konten');
 const row=rows[0];
 if(!row||row.account_id!==META_ACCOUNT||
  String(row.username||'').trim().toLowerCase()!==EXPECTED_USER)
  throw Error('Falsches Instagram-Profil');
 const raw=row.followers_count;
 if(raw===null||raw===undefined||raw===''||typeof raw==='boolean')
  throw Error('Instagram-Gesamtfollower nicht verfügbar');
 const n=Number(raw);
 if(!isCount(n))throw Error('Ungültiger Instagram-Gesamtfollowerstand');
 return {accountId:META_ACCOUNT,username:EXPECTED_USER,followers:n};
}

export function mergeInstagramWindsorFollowers(previous,verified,now=Date.now()){
 const stamp=new Date(now).toISOString(),today=day(now);
 const entries=new Map(
  (previous?.schema===1&&Array.isArray(previous.history)?previous.history:[])
  .filter(r=>DAY_PATTERN.test(String(r?.date||''))&&isCount(r?.followers)&&r.date<=today)
  .map(r=>[r.date,{date:r.date,followers:r.followers}])
 );
 entries.set(today,{date:today,followers:verified.followers});
 return {schema:1,username:EXPECTED_USER,accountId:META_ACCOUNT,
  followers:verified.followers,updatedAt:stamp,
  source:'Instagram profile via Windsor.ai (Meta)',
  history:[...entries.values()].sort((a,b)=>a.date.localeCompare(b.date)).slice(-120)};
}

export function overlayInstagramWindsorFollowers(snapshot,record,directMeta){
 if(!snapshot?.platforms?.ig||record?.schema!==1||
  record.username!==EXPECTED_USER||record.accountId!==META_ACCOUNT||
  !isCount(record.followers)||Number.isNaN(Date.parse(record.updatedAt||'')))
  return snapshot;
 const directOK=directMeta?.username===EXPECTED_USER&&isCount(directMeta.followers);
 const directStamp=directOK?Date.parse(directMeta.updatedAt||''):NaN;
 const windsorStamp=Date.parse(record.updatedAt);
 if(directOK&&Number.isFinite(directStamp)&&directStamp>=windsorStamp)
  return snapshot;
 const prior=snapshot.platforms.ig.profile||{};
 const history=new Map();
 const add=arr=>{
  for(const point of Array.isArray(arr)?arr:[]){
   if(!DAY_PATTERN.test(String(point?.date||''))||!isCount(point.followers))continue;
   history.set(point.date,{date:point.date,followers:point.followers});
  }
 };
 add(prior.history);
 add(directOK?directMeta.history:[]);
 add(record.history);
 snapshot.platforms.ig.profile={...prior,username:record.username,
  followers:record.followers,asOf:record.updatedAt,source:record.source,
  history:[...history.values()].sort((a,b)=>a.date.localeCompare(b.date)).slice(-120)
 };
 return snapshot;
}

export async function runInstagramWindsorFollowersSync(env,{
 get,put,fetcher=fetch,now=Date.now(),force=false
}={}){
 const key=String(env?.WINDSOR_API_KEY||'').trim();
 if(key.length<16)return{status:'not_configured',reason:'Windsor key missing'};
 const previous=await get(env,SYNC_STORE)||{};
 const last=Date.parse(previous.lastAttemptAt||'');
 const delay=previous.status==='ok'?6*3600000:
   previous.status==='running'?45*60000:60*60000;
 if(!force&&Number.isFinite(last)&&now-last>=0&&now-last<delay)
  return{status:'skipped',lastSuccessAt:previous.lastSuccessAt||null};
 const stamp=new Date(now).toISOString();
 await put(env,SYNC_STORE,{...previous,status:'running',lastAttemptAt:stamp});
 try{
  const url=new URL('https://connectors.windsor.ai/instagram');
  url.searchParams.set('api_key',key);
  url.searchParams.set('fields','followers_count,username,account_id');
  url.searchParams.set('select_accounts',SOURCE_ACCOUNT);
  url.searchParams.set('date_preset','last_3dT');
  url.searchParams.set('_renderer','json');
  const response=await fetcher(url.href,{
   method:'GET',headers:{accept:'application/json'},
   signal:AbortSignal.timeout(25000)
  });
  if(!response.ok)throw Error('Windsor HTTP '+response.status);
  const data=await response.json();
  const rows=Array.isArray(data)?data:Array.isArray(data?.data)?data.data:
   Array.isArray(data?.results)?data.results:null;
  const valid=validateInstagramWindsorFollowers(rows);
  const prior=await get(env,PROFILE_STORE);
  const profile=mergeInstagramWindsorFollowers(prior,valid,now);
  await put(env,PROFILE_STORE,profile);
  const status={status:'ok',lastAttemptAt:stamp,lastSuccessAt:stamp,
   updatedAt:stamp,followers:profile.followers,error:null};
  await put(env,SYNC_STORE,status);
  return status;
 }catch(e){
  const status={...previous,status:'error',lastAttemptAt:stamp,
   error:safeError(e),lastSuccessAt:previous.lastSuccessAt||null};
  await put(env,SYNC_STORE,status);
  return status;
 }
}

export async function instagramWindsorFollowersStatus(env,{get}){
 const [profile,status,meta]=await Promise.all([
  get(env,PROFILE_STORE),get(env,SYNC_STORE),get(env,'ig_profile')
 ]);
 return {
  configured:!!(env.WINDSOR_API_KEY&&String(env.WINDSOR_API_KEY).trim().length>=16),
  syncStatus:status?.status||'never_run',
  error:status?.error||null,
  lastAttemptAt:status?.lastAttemptAt||null,
  lastSuccessAt:status?.lastSuccessAt||null,
  currentTotal:isCount(profile?.followers)?profile.followers:null,
  asOf:profile?.updatedAt||null,
  directMetaTotal:isCount(meta?.followers)?meta.followers:null,
  directMetaAsOf:meta?.updatedAt||null
 };
}
