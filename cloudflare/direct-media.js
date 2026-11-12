/* V7.7 – validated official-API video catalog from the user's private Google Sheet.
   This is separate from the existing Windsor-supplied channel-day reports.
   It cannot turn lifetime video metrics into daily viewing numbers. */
const OWNER={yt:'UCBnnaMohI_VfKihekEwaQEw',ig:'lxon_jxmpstyle'};
function text(v,max){const s=String(v??'').trim();return s.length<=max?s.slice(0,max):s.slice(0,max)}
function safeNumber(v){
 if(v===null||v===undefined||String(v).trim()==='')return null;
 const n=Number(v);return Number.isSafeInteger(n)&&n>=0?n:null;
}
function https(v,domain){
 try{const u=new URL(String(v));if(u.protocol!=='https:'||!domain.test(u.hostname))return null;return u.href}catch{return null}
}
function normalizeVideo(platform,v){
 if(!v||typeof v!=='object')return null;
 const id=String(v.id||'').trim(),rawDate=String(v.date||'').trim();
 if(!/^\d{4}-\d{2}-\d{2}/.test(rawDate))return null;
 const date=rawDate.slice(0,10);
 if(!Number.isFinite(Date.parse(date+'T00:00:00Z')))return null;
 if(platform==='yt'){
  if(!/^[\w-]{11}$/.test(id))return null;
  const link=https(v.url,/^(www\.)?youtube\.com$|^youtu\.be$/i);
  if(!link)return null;
  return {id,platform:'yt',date,url:link,title:text(v.title||'YouTube Video',500),
   thumb:https(v.thumb,/^i\.ytimg\.com$/i),
   views:safeNumber(v.views),likes:safeNumber(v.likes),comments:safeNumber(v.comments),
   follows:null,reportType:'lifetime',source:'YouTube Data API (direct sheet)'};
 }
 if(!/^\d{12,25}$/.test(id))return null;
 const link=https(v.url,/^(www\.)?instagram\.com$/i);
 if(!link||!/^https:\/\/(?:www\.)?instagram\.com\/(?:reel|p|tv)\//i.test(link))return null;
 return {id,platform:'ig',date,url:link,title:text(v.title||'Instagram Reel',500),
  thumb:https(v.thumb,/^(?:[\w.-]+\.)?(?:cdninstagram\.com|fbcdn\.net)$/i),
  views:safeNumber(v.views),likes:safeNumber(v.likes),comments:safeNumber(v.comments),
  reach:safeNumber(v.reach),follows:null,reportType:'lifetime',
  source:'Meta Instagram API (direct sheet)'};
}
export function validateDirectMedia(payload,now=Date.now()){
 if(payload?.schema!==1||!Object.hasOwn(OWNER,payload.platform)||
  String(payload.accountId)!==OWNER[payload.platform])
  throw Error('Wrong platform or creator account');
 const day=String(payload.snapshotDate||''),stamp=Date.parse(day+'T00:00:00Z');
 if(!/^\d{4}-\d{2}-\d{2}$/.test(day)||!Number.isFinite(stamp)||
    stamp>Date.parse(new Date(now).toISOString().slice(0,10)+'T00:00:00Z')||
    stamp<Date.parse(new Date(now-8*86400000).toISOString().slice(0,10)+'T00:00:00Z'))
  throw Error('Stale or future media report');
 if(!Array.isArray(payload.videos)||payload.videos.length<10||payload.videos.length>1400)
  throw Error('Direct API media report incomplete');
 const videos=new Map();
 for(const v of payload.videos){
  const row=normalizeVideo(payload.platform,v);
  if(!row||videos.has(row.id))throw Error('Unverified, invalid or duplicate video in direct report');
  videos.set(row.id,row);
 }
 if([...videos.values()].every(v=>v.views===null))
  throw Error('All direct video view counts unknown');
 return {schema:1,platform:payload.platform,snapshotDate:day,updatedAt:new Date(now).toISOString(),
  source:payload.platform==='yt'?'YouTube Data API (direct sheet)':'Meta Instagram API (direct sheet)',
  videos:[...videos.values()]};
}
export function mergeDirectMedia(previous,valid){
 return {schema:1,updatedAt:valid.updatedAt,
  platforms:{...(previous?.platforms||{}),[valid.platform]:{
   snapshotDate:valid.snapshotDate,updatedAt:valid.updatedAt,
   source:valid.source,videos:valid.videos
  }}};
}
export function overlayDirectMedia(snapshot,direct){
 if(direct?.schema!==1||!snapshot?.platforms)return snapshot;
 for(const [p,collection]of Object.entries(direct.platforms||{})){
  if(!Object.hasOwn(OWNER,p)||!Array.isArray(collection?.videos)||!snapshot.platforms[p])continue;
  const byId=new Map((snapshot.platforms[p].videos||[]).map(v=>[String(v.id),v]));
  for(const video of collection.videos){
   // Do not replace a known historic value with an API null.
   const old=byId.get(String(video.id))||{};
   const merged={...old,...video};
   for(const metric of ['views','likes','comments','reach']){
    if(video[metric]===null&&old[metric]!=null)merged[metric]=old[metric];
   }
   byId.set(String(video.id),merged);
  }
  snapshot.platforms[p].videos=[...byId.values()];
  snapshot.platforms[p].videosSource=collection.source;
  snapshot.platforms[p].videosDirectAsOf=collection.snapshotDate;
 }
 return snapshot;
}
