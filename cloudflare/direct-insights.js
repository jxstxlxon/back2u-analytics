/*
 * BACK2U V7.7 official platform insights – independently versioned D1 stores.
 * No credentials, public stats or tokens. Raw media lifetime values are never
 * conflated with video Analytics' reporting-window statistics.
 */
const IDS={yt:'UCBnnaMohI_VfKihekEwaQEw',ig:'lxon_jxmpstyle'};
const YT_WINDOWS=[7,28,90];
const YT_METRICS=YT_WINDOWS.flatMap(n=>[
 'views'+n+'d','shares'+n+'d','watchMinutes'+n+'d',
 'averageViewSeconds'+n+'d','averageViewPercentage'+n+'d','engagedViews'+n+'d'
]);
const IG_METRICS=['shares','saves','interactions','averageWatchMs','totalWatchMs','skipRate'];
const IG_DAILY=['views','reach','likes','comments','shares','saves','interactions','accountsEngaged'];
function isInt(x){return typeof x==='number'&&Number.isSafeInteger(x)&&x>=0}
function validDay(x){return typeof x==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(x)&&
 Number.isFinite(Date.parse(x+'T00:00:00Z'))&&new Date(Date.parse(x+'T00:00:00Z')).toISOString().slice(0,10)===x}
function currentDay(now){return new Date(now).toISOString().slice(0,10)}
function olderThan(day,now,days){return Date.parse(day+'T00:00:00Z')<now-days*86400000}
function rowsUnique(rows,prop){const seen=new Set();for(const r of rows){const id=r?.[prop];if(seen.has(id))throw Error('Duplicate source row');seen.add(id)}}
function rejectBadKeys(obj,known){for(const k of Object.keys(obj)){if(!known.includes(k))throw Error('Unknown metric '+k)}}
export function validateDirectVideoInsights(body,now=Date.now()){
 if(body?.schema!==1||!Object.hasOwn(IDS,body.platform)||String(body.accountId)!==IDS[body.platform])
  throw Error('Wrong creator account');
 const p=body.platform,asOf=body.snapshotDate;
 if(!validDay(asOf)||asOf>currentDay(now)||olderThan(asOf,now,8))throw Error('Invalid snapshot date');
 if(!Array.isArray(body.videos)||body.videos.length<1||body.videos.length>1100)throw Error('Empty or oversized video report');
 if(p==='yt'&&(!YT_WINDOWS.includes(body.periodDays)||
  !validDay(body.periodStart)||!validDay(body.periodEnd)||
  body.periodStart>body.periodEnd||body.periodEnd>asOf||
  (Date.parse(body.periodEnd+'T00:00:00Z')-Date.parse(body.periodStart+'T00:00:00Z'))>
     (body.periodDays+1)*86400000))
  throw Error('Invalid YouTube video analytics range');
 rowsUnique(body.videos,'id');
 const normalized=body.videos.map(r=>{
  const id=String(r?.id||'');
  if(p==='yt'?!/^[\w-]{11}$/.test(id):!/^\d{12,25}$/.test(id))throw Error('Invalid media id');
  if(!r.metrics||typeof r.metrics!=='object'||Array.isArray(r.metrics))throw Error('Missing metrics');
  const permitted=p==='yt'?YT_METRICS:IG_METRICS;
  rejectBadKeys(r.metrics,permitted);
  const vals={};
  for(const [key,v] of Object.entries(r.metrics)){
   if(v===null||v===undefined)continue;
   if(typeof v!=='number'||!Number.isFinite(v)||v<0||
    (!/^averageView(Percentage|Seconds)(7|28|90)d$/.test(key)&&!['skipRate','averageWatchMs'].includes(key)&&!isInt(v)))
    throw Error('Invalid metric '+key);
   if(key==='skipRate'&&v>100)throw Error('Skip rate >100');
   vals[key]=v;
  }
  if(!Object.keys(vals).length)throw Error('No known metrics');
  return {id,metrics:vals};
 });
 return {schema:1,platform:p,snapshotDate:asOf,updatedAt:new Date(now).toISOString(),
  period:p==='yt'?{days:body.periodDays,start:body.periodStart,end:body.periodEnd}:null,
  source:p==='yt'?'YouTube Analytics API (video range)':'Meta Graph API (media insights)',
  videos:normalized};
}
export function mergeDirectVideoInsights(previous,next){
 const old=previous?.platforms?.[next.platform];
 const n=next.period?.days;
 const rows=new Map((old?.videos||[]).map(v=>[String(v.id),v]));
 for(const row of next.videos){
  const former=rows.get(row.id);
  const metrics={...(former?.metrics||{})};
  if(next.platform==='yt'){
   // Refresh the chosen 7/28/90-day report; retain other periods.
   for(const key of Object.keys(metrics))if(key.endsWith(n+'d'))delete metrics[key];
  }
  Object.assign(metrics,row.metrics);
  rows.set(row.id,{id:row.id,metrics});
 }
 const periods=next.platform==='yt'?{...(old?.periods||{}),[String(n)]:next.period}:null;
 return {schema:1,updatedAt:next.updatedAt,platforms:{...(previous?.platforms||{}),
  [next.platform]:{snapshotDate:next.snapshotDate,updatedAt:next.updatedAt,
   period:next.period,periods,source:next.source,videos:[...rows.values()].slice(-1200)}}};
}
export function validateInstagramDaily(payload,now=Date.now()){
 if(payload?.schema!==1||payload.platform!=='ig'||payload.accountId!==IDS.ig)
  throw Error('Invalid Instagram daily source account');
 const stamp=String(payload.snapshotDate||'');
 if(!validDay(stamp)||stamp>currentDay(now)||olderThan(stamp,now,8))throw Error('Invalid Instagram report stamp');
 if(!Array.isArray(payload.daily)||payload.daily.length<1||payload.daily.length>60)throw Error('Instagram daily report empty');
 rowsUnique(payload.daily,'date');
 const days=payload.daily.map(r=>{
  const date=String(r?.date||'');
  if(!validDay(date)||date>=stamp||olderThan(date,now,94))throw Error('Invalid day in Instagram report');
  if(!r.metrics||typeof r.metrics!=='object'||Array.isArray(r.metrics))throw Error('Missing daily metrics');
  rejectBadKeys(r.metrics,IG_DAILY);
  const metrics={};
  for(const [k,value]of Object.entries(r.metrics)){
   if(value===null||value===undefined)continue;
   if(!isInt(value))throw Error('Bad daily value for '+k);
   metrics[k]=value;
  }
  if(!Object.keys(metrics).length)throw Error('Instagram daily entry is fully empty');
  return {date,metrics};
 });
 return {schema:1,platform:'ig',snapshotDate:stamp,updatedAt:new Date(now).toISOString(),
  source:'Meta Graph API (account daily)',daily:days};
}
export function mergeInstagramDaily(old,next){
 const byDay=new Map((old?.daily||[]).map(r=>[r.date,r]));
 for(const r of next.daily){
  const former=byDay.get(r.date);
  byDay.set(r.date,{date:r.date,metrics:{...(former?.metrics||{}),...r.metrics},asOf:next.updatedAt});
 }
 return {schema:1,updatedAt:next.updatedAt,source:next.source,
  daily:[...byDay.values()].sort((a,b)=>a.date.localeCompare(b.date)).slice(-94)};
}
export function overlayDirectInsights(snapshot,{video,daily}={}){
 if(!snapshot?.platforms)return snapshot;
 for(const p of ['yt','ig']){
  const src=video?.platforms?.[p];
  if(!src||!Array.isArray(src.videos)||!snapshot.platforms[p])continue;
  const data=new Map(src.videos.map(x=>[String(x.id),x]));
  for(const v of snapshot.platforms[p].videos||[]){
   const entry=data.get(String(v.id));if(!entry)continue;
   v.analytics={source:src.source,period:src.period,periods:src.periods,updatedAt:src.updatedAt,
    ...entry.metrics};
  }
 }
 if(daily?.schema===1&&Array.isArray(daily.daily)&&snapshot.platforms.ig){
  const days=new Map((snapshot.platforms.ig.daily||[]).map(r=>[r.d,r]));
  for(const entry of daily.daily){
   const old=days.get(entry.date)||{d:entry.date};
   const direct=entry.metrics;
   const merged={...old,sourceFields:{...(old.sourceFields||{})}};
   const map={views:'views',reach:'reach',likes:'likes',comments:'comments',
    shares:'shares',saves:'saves',interactions:'interactions',accountsEngaged:'accountsEngaged'};
   for(const [k,v] of Object.entries(direct)){
    if(!Object.hasOwn(map,k))continue;
    merged[map[k]]=v;
    merged.sourceFields[map[k]]='Meta Graph API (direct daily)';
   }
   merged.directAsOf=entry.asOf;
   days.set(entry.date,merged);
  }
  snapshot.platforms.ig.daily=[...days.values()].sort((a,b)=>a.d.localeCompare(b.d));
  snapshot.platforms.ig.dailySource='Meta Graph API (verified per-day entries) + retained Windsor history';
  snapshot.platforms.ig.directDailyThrough=daily.daily.at(-1)?.date||null;
 }
 return snapshot;
}
