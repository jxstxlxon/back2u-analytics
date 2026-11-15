/**
 * BACK2U V7.7: independent TikTok Organic day + recent-media recovery.
 * Fetches from the account already connected to Windsor.ai using the
 * Cloudflare runtime's existing WINDSOR_API_KEY, if it is configured.
 * Never exposes that secret or replaces the original D1 snapshot.
 */
const ACCOUNT='_000Gn_3riaTBVXEHqk1YfrwMWPK3cJcFkGv';
const USER='back2u.mp3';
const DAY_STORE='tt_windsor_daily_v1';
const MEDIA_STORE='tt_windsor_media_v1';
const PROFILE_STORE='tt_windsor_profile_v1';
const STATUS_STORE='tt_windsor_sync_v1';
const DAY=86400000;
const iso=ms=>new Date(ms).toISOString().slice(0,10);
const numeric=x=>x!==''&&x!==null&&x!==undefined&&typeof x!=='boolean'&&
  Number.isSafeInteger(Number(x))&&Number(x)>=0?Number(x):null;
const dateOK=x=>typeof x==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(x)&&
 !Number.isNaN(Date.parse(x+'T00:00:00Z'))&&iso(Date.parse(x+'T00:00:00Z'))===x;
const errorText=e=>String(e?.message||e||'Unknown error')
 .replace(/https?:\/\/\S+/gi,'[URL]').slice(0,150);
function responseRows(body){
 return Array.isArray(body)?body:Array.isArray(body?.data)?body.data:
  Array.isArray(body?.results)?body.results:null;
}
function accountOK(row){
 return String(row?.account_id||'')===ACCOUNT &&
  String(row?.username||'').trim().toLowerCase()===USER;
}

export function validateTikTokOrganicDays(rows,now=Date.now()){
 if(!Array.isArray(rows)||rows.length<3||rows.length>150)
  throw Error('TikTok-Tagesbericht fehlt oder ist unvollständig');
 const today=iso(now),cutoff=iso(now-32*DAY);
 const byDate=new Map(),conflicted=new Set(),candidates=[];
 const fields={views:'video_views',likes:'likes',comments:'comments',
  shares:'shares',follows:'followers_count',
  netFollows:'daily_total_followers',lostFollowers:'daily_lost_followers',
  engagedAudience:'engaged_audience',bioLinkClicks:'bio_link_clicks',
  uniqueViews:'unique_video_views',profileViews:'profile_views'};
 // TikTok net follower changes may legitimately be negative.
 const signed=x=>x!==''&&x!==null&&x!==undefined&&typeof x!=='boolean'&&
  Number.isSafeInteger(Number(x))&&Math.abs(Number(x))<=1000000?Number(x):null;
 for(const row of rows){
  // Never mix data from another TikTok account.
  if(!accountOK(row))throw Error('TikTok-Konto nicht verifiziert');
  const rawDate=String(row.date||'').trim();
  // Windsor may include timestamp-formatted days, duplicated pending-day
  // records, or extraneous rows outside the explicitly requested window.
  const d=rawDate.slice(0,10);
  if(!dateOK(d)||d<cutoff||d>today)continue;
  const followerTotal=numeric(row.total_followers_count);
  if(followerTotal!==null&&followerTotal>0)candidates.push({date:d,followers:followerTotal});
  if(d===today)continue; // current-day analytics are not completed
  const entry={d};
  for(const [to,from] of Object.entries(fields)){
   const raw=row[from];
   const v=(to==='netFollows'||to==='follows')?signed(raw):numeric(raw);
   // Unknown optional fields are *absent*, never invented as zero.
   if(v!==null)entry[to]=v;
  }
  // A row without a trustworthy primary views count cannot be a day.
  if(entry.views===undefined)continue;
  const placeholder=entry.views===0&&
   ['likes','comments','shares','uniqueViews','profileViews','engagedAudience'].every(k=>entry[k]===0||entry[k]===undefined)&&
   d>=iso(now-3*DAY);
  if(placeholder)continue; // pending all-zero batch is not a verified day
  if(conflicted.has(d))continue;
  const prior=byDate.get(d);
  if(prior){
   const keys=new Set([...Object.keys(prior),...Object.keys(entry)]);
   const incompatible=[...keys].some(k=>k!=='d'&&prior[k]!==undefined&&
    entry[k]!==undefined&&prior[k]!==entry[k]);
   if(incompatible){conflicted.add(d);byDate.delete(d);continue}
   byDate.set(d,{...prior,...entry});
  }else byDate.set(d,entry);
 }
 const daily=[...byDate.values()].sort((x,y)=>x.d.localeCompare(y.d));
 if(daily.length<3)throw Error('TikTok-Tagesstatistik enthält zu wenig bestätigte Tage');
 const profile=candidates.sort((x,y)=>x.date.localeCompare(y.date)).at(-1)||null;
 return {daily,profile};
}

export function validateTikTokOrganicMedia(rows,now=Date.now()){
 if(!Array.isArray(rows)||!rows.length||rows.length>800)
  throw Error('TikTok-Medienbericht fehlt oder ist unvollständig');
 const today=iso(now),cutoff=iso(now-35*DAY);
 const byId=new Map();
 for(const row of rows){
  if(!accountOK(row))throw Error('TikTok-Medienkonto nicht verifiziert');
  const id=String(row.video_id||''),d=String(row.date||'');
  if(!/^\d{12,25}$/.test(id)||!dateOK(d)||d<cutoff||d>today||byId.has(id))
   throw Error('Ungültige oder doppelte TikTok-Video-ID/Datum');
  const views=numeric(row.video_views_count);
  if(views===null)continue;
  const likes=numeric(row.video_likes),comments=numeric(row.video_comments);
  const video={id,platform:'tt',date:d,
   title:String(row.video_caption||'').slice(0,500)||'TikTok-Video',
   url:'https://www.tiktok.com/@'+USER+'/video/'+id,
   views,reportType:'lifetime',source:'TikTok Organic über Windsor.ai'};
  if(likes!==null)video.likes=likes;
  if(comments!==null)video.comments=comments;
  byId.set(id,video);
 }
 if(!byId.size)throw Error('TikTok-Videos ohne bestätigte Aufrufe');
 return [...byId.values()].sort((a,b)=>a.date.localeCompare(b.date));
}

export function combineTikTokOrganicState(before,verified,now=Date.now()){
 const prior=before?.schema===1?before:{};
 const currentDay=new Map((prior.daily||[]).filter(x=>dateOK(x.d)).map(x=>[x.d,x]));
 for(const row of verified.days.daily)currentDay.set(row.d,row);
 const currentVideo=new Map((prior.videos||[])
  .filter(x=>/^\d{12,25}$/.test(String(x.id))).map(x=>[x.id,x]));
 for(const row of verified.media)currentVideo.set(row.id,row);
 const latest=verified.days.profile;
 const priorProfile=prior.profile;
 const newest=latest&&(!priorProfile||latest.date>=priorProfile.date)?latest:priorProfile||null;
 return {schema:1,accountId:ACCOUNT,username:USER,updatedAt:new Date(now).toISOString(),
  daily:[...currentDay.values()].sort((a,b)=>a.d.localeCompare(b.d)).slice(-125),
  videos:[...currentVideo.values()].sort((a,b)=>a.date.localeCompare(b.date)).slice(-800),
  profile:newest,source:'TikTok Organic via Windsor.ai'};
}

export function overlayTikTokOrganicState(snapshot,record,directProfile){
 if(!snapshot?.platforms?.tt||record?.schema!==1||record.accountId!==ACCOUNT)
  return snapshot;
 const tt=snapshot.platforms.tt;
 const byDay=new Map((tt.daily||[]).filter(r=>dateOK(r.d)).map(r=>[r.d,r]));
 for(const row of record.daily||[]){
  if(!dateOK(row.d)||numeric(row.views)===null)continue;
  byDay.set(row.d,{...(byDay.get(row.d)||{}),...row,
   source:'TikTok Organic via Windsor.ai'});
 }
 tt.daily=[...byDay.values()].sort((a,b)=>a.d.localeCompare(b.d));
 tt.dailySource=record.source;
 tt.windsorDailyThrough=tt.daily.at(-1)?.d||null;

 const byVideo=new Map((tt.videos||[]).map(v=>[String(v.id),v]));
 for(const row of record.videos||[]){
  if(!/^\d{12,25}$/.test(String(row.id)))continue;
  const former=byVideo.get(row.id);
  // Never overwrite fresh direct TikTok Display API metrics.
  if(former?.source==='Official TikTok Display API')continue;
  byVideo.set(row.id,{...(former||{}),...row});
 }
 tt.videos=[...byVideo.values()];
 tt.windsorMediaUpdatedAt=record.updatedAt;

 const follower=record.profile;
 if(follower&&dateOK(follower.date)&&numeric(follower.followers)!==null&&
    follower.followers>0){
  const officialFresh=directProfile?.openId&&
   Number.isSafeInteger(directProfile.followers)&&
   dateOK(String(directProfile.updatedAt||'').slice(0,10))&&
   String(directProfile.updatedAt).slice(0,10)>=follower.date;
  if(!officialFresh){
   const before=tt.profile||{};
   tt.profile={...before,followers:follower.followers,
    asOf:follower.date,source:'TikTok Organic via Windsor.ai'};
  }
 }
 return snapshot;
}

export async function runTikTokOrganicSync(env,{
 get,put,fetcher=fetch,now=Date.now(),force=false
}={}){
 const secret=String(env?.WINDSOR_API_KEY||'').trim();
 if(secret.length<16)return{status:'not_configured',reason:'WINDSOR_API_KEY fehlt'};
 const old=await get(env,STATUS_STORE)||{};
 const last=Date.parse(old.lastAttemptAt||'');
 const pipelineVersion='v77.12-28day-and-mobile';
 const throttle=(old.status==='ok'||old.status==='partial')?6*3600000:
  old.status==='running'?2*60000:5*60000;
 // A newly deployed validation fix must not be blocked by a stale
 // failed attempt from the previous importer. Retry once per version.
 if(!force&&old.pipelineVersion===pipelineVersion&&
    Number.isFinite(last)&&now-last>=0&&now-last<throttle)
  return{status:'skipped',lastSuccessAt:old.lastSuccessAt||null};
 const time=new Date(now).toISOString();
 await put(env,STATUS_STORE,{...old,pipelineVersion,status:'running',lastAttemptAt:time});
 try{
  const query=(fields,preset)=>{
   const u=new URL('https://connectors.windsor.ai/tiktok_organic');
   u.searchParams.set('api_key',secret);
   u.searchParams.set('fields',fields);
   // Use explicit completed-day UTC range: preset-only reports sometimes
   // include a repeated, NULL-filled current day and block whole batches.
   if(preset==='last_28d'){
    u.searchParams.set('date_from',iso(now-28*DAY));
    u.searchParams.set('date_to',iso(now-DAY));
   }else u.searchParams.set('date_preset',preset);
   u.searchParams.set('select_accounts',ACCOUNT);
   u.searchParams.set('_renderer','json');
   return u.href;
  };
  // A daily report must never wait for the separate media inventory.
  // Cloudflare waitUntil may be terminated before a slow second request
  // finishes, leaving the status at "running" and *no* day values in D1.
  // TikTok OAuth continues handling the media catalogue separately.
  const dailyUrl=query('date,account_id,username,video_views,likes,comments,shares,followers_count,daily_total_followers,daily_lost_followers,engaged_audience,bio_link_clicks,total_followers_count,unique_video_views,profile_views','last_28d');
  const dayResponse=await fetcher(dailyUrl,{method:'GET',
   headers:{accept:'application/json'},signal:AbortSignal.timeout(16000)});
  if(!dayResponse.ok)throw Error('TikTok day HTTP '+dayResponse.status);
  const dr=await dayResponse.json();
  const verifiedDays=validateTikTokOrganicDays(responseRows(dr),now);
  const verified={days:verifiedDays,media:[]};
  const previous=await get(env,DAY_STORE);
  const combined=combineTikTokOrganicState(previous,verified,now);
  // Day rows validate before this independent D1 write; media never blocks it.
  await put(env,DAY_STORE,combined);
  const result={pipelineVersion,status:'ok',lastAttemptAt:time,lastSuccessAt:time,
   dayThrough:combined.daily.at(-1)?.d||null,dailyDays:combined.daily.length,
   recentVideos:combined.videos.length,latestVideoDay:combined.videos.at(-1)?.date||null,
   mediaStatus:'separate-oauth',mediaError:null,error:null};
  await put(env,STATUS_STORE,result);
  return result;
 }catch(e){
  const failed={...old,pipelineVersion,status:'error',lastAttemptAt:time,
   lastSuccessAt:old.lastSuccessAt||null,error:errorText(e)};
  await put(env,STATUS_STORE,failed);
  return failed;
 }
}

export async function tiktokOrganicStatus(env,{get}){
 const [saved,job]=await Promise.all([get(env,DAY_STORE),get(env,STATUS_STORE)]);
 return {
  configured:!!(env.WINDSOR_API_KEY&&String(env.WINDSOR_API_KEY).trim().length>=16),
  status:job?.status||'never_run',lastSuccessAt:job?.lastSuccessAt||null,
  mediaStatus:job?.mediaStatus||null,mediaError:job?.mediaError||null,
  lastAttemptAt:job?.lastAttemptAt||null,error:job?.error||null,
  dayThrough:saved?.daily?.at(-1)?.d||null,
  latestVideoDay:saved?.videos?.at(-1)?.date||null,
  totalDayRows:saved?.daily?.length||0,storedVideos:saved?.videos?.length||0
 };
}
