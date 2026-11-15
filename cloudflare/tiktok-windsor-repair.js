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
 if(!Array.isArray(rows)||rows.length<3||rows.length>35)
  throw Error('TikTok-Tagesbericht fehlt oder ist unvollständig');
 const today=iso(now),cutoff=iso(now-21*DAY);
 const byDate=new Map(),candidates=[];
 const conflicted=new Set();
 for(const row of rows){
  if(!accountOK(row))throw Error('TikTok-Konto nicht verifiziert');
  const d=String(row.date||'');
  if(!dateOK(d)||d<cutoff||d>today)
   throw Error('Ungültiger TikTok-Berichtstag');
  const fields={views:'video_views',likes:'likes',comments:'comments',
   shares:'shares',follows:'followers_count',netFollows:'daily_total_followers',
   lostFollowers:'daily_lost_followers',engagedAudience:'engaged_audience',
   bioLinkClicks:'bio_link_clicks',uniqueViews:'unique_video_views',
   profileViews:'profile_views'};
  // Current-day account rows can have NULL metrics while followers_count
  // is already published. They must not veto all completed historical days.
  const followerTotal=numeric(row.total_followers_count);
  if(followerTotal!==null&&followerTotal>0)candidates.push({date:d,followers:followerTotal});
  if(d===today)continue; // current-day NULL/duplicate rows are not completed days
  const entry={d};
  for(const [to,from] of Object.entries(fields)){
   const value=numeric(row[from]);
   if(value!==null)entry[to]=value;
   else if(row[from]!==null&&row[from]!==undefined&&row[from]!=='')
    throw Error('TikTok-Tagesmetrik ungültig: '+from);
  }
  if(entry.views===undefined){
   if(d>=iso(now-3*DAY))continue;
   throw Error('TikTok-Tagesaufrufe fehlen');
  }
  // A completely zero-filled recent report may be a not-yet-published batch.
  // Do not interpret it as a confirmed day with zero views/follows/likes.
  const incompleteZero=entry.views===0&&
   ['likes','comments','shares','follows'].every(k=>entry[k]===0||entry[k]===undefined)&&
   d>=iso(now-3*DAY);
  if(incompleteZero)continue;
  // Repeated, identical rows must not block ALL valid days. Conflicting rows
  // for one date are discarded rather than guessed or silently summed.
  if(conflicted.has(d))continue;
  const existing=byDate.get(d);
  if(existing){
   const keys=new Set([...Object.keys(existing),...Object.keys(entry)]);
   const contradiction=[...keys].some(k=>k!=='d'&&existing[k]!==undefined&&
      entry[k]!==undefined&&existing[k]!==entry[k]);
   if(contradiction){conflicted.add(d);byDate.delete(d);continue}
   byDate.set(d,{...existing,...entry});
  }else byDate.set(d,entry);
 }
 const daily=[...byDate.values()].filter(Boolean).sort((a,b)=>a.d.localeCompare(b.d));
 if(daily.length<3)throw Error('TikTok-Tagesstatistik enthält zu wenig bestätigte Tage');
 const profile=candidates.sort((a,b)=>a.date.localeCompare(b.date)).at(-1)||null;
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
 const throttle=(old.status==='ok'||old.status==='partial')?6*3600000:
  old.status==='running'?45*60000:60*60000;
 if(!force&&Number.isFinite(last)&&now-last>=0&&now-last<throttle)
  return{status:'skipped',lastSuccessAt:old.lastSuccessAt||null};
 const time=new Date(now).toISOString();
 await put(env,STATUS_STORE,{...old,status:'running',lastAttemptAt:time});
 try{
  const query=(fields,preset)=>{
   const u=new URL('https://connectors.windsor.ai/tiktok_organic');
   u.searchParams.set('api_key',secret);
   u.searchParams.set('fields',fields);
   // Use explicit completed-day UTC range: preset-only reports sometimes
   // include a repeated, NULL-filled current day and block whole batches.
   if(preset==='last_14d'){
    u.searchParams.set('date_from',iso(now-15*DAY));
    u.searchParams.set('date_to',iso(now-DAY));
   }else u.searchParams.set('date_preset',preset);
   u.searchParams.set('select_accounts',ACCOUNT);
   u.searchParams.set('_renderer','json');
   return u.href;
  };
  const opts=()=>({method:'GET',headers:{accept:'application/json'},
   signal:AbortSignal.timeout(25000)});
  const dailyUrl=query('date,account_id,username,video_views,likes,comments,shares,followers_count,daily_total_followers,daily_lost_followers,engaged_audience,bio_link_clicks,total_followers_count,unique_video_views,profile_views','last_14d');
  const mediaUrl=query('date,account_id,username,video_id,video_create_datetime,video_views_count,video_likes,video_comments,video_caption','last_21d');
  const [dFetch,mFetch]=await Promise.allSettled([fetcher(dailyUrl,opts()),fetcher(mediaUrl,opts())]);
  if(dFetch.status!=='fulfilled'||!dFetch.value.ok)
   throw Error('TikTok day HTTP '+(dFetch.status==='fulfilled'?dFetch.value.status:'connection failed'));
  const dr=await dFetch.value.json();
  const verifiedDays=validateTikTokOrganicDays(responseRows(dr),now);
  // Video inventory is optional: an independent media outage may not stop
  // correct account-wide daily statistics from reaching the dashboard.
  let media=[],mediaError=null;
  if(mFetch.status==='fulfilled'&&mFetch.value.ok){
   try{
    const mr=await mFetch.value.json(),rows=responseRows(mr);
    if(Array.isArray(rows)&&rows.length)media=validateTikTokOrganicMedia(rows,now);
    else mediaError='no recent media';
   }catch(e){mediaError=errorText(e)}
  }else mediaError='video connector unavailable';
  const verified={days:verifiedDays,media};
  const previous=await get(env,DAY_STORE);
  const combined=combineTikTokOrganicState(previous,verified,now);
  // Both batches must validate before a single new store is written.
  await put(env,DAY_STORE,combined);
  const result={status:mediaError?'partial':'ok',lastAttemptAt:time,lastSuccessAt:time,
   dayThrough:combined.daily.at(-1)?.d||null,dailyDays:combined.daily.length,
   recentVideos:combined.videos.length,latestVideoDay:combined.videos.at(-1)?.date||null,
   mediaStatus:mediaError?'unavailable':'ok',mediaError,error:null};
  await put(env,STATUS_STORE,result);
  return result;
 }catch(e){
  const failed={...old,status:'error',lastAttemptAt:time,
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
