/*
 * BACK2U snapshot warnings must describe CURRENT data integrity, not a
 * one-time import bootstrap state persisted months earlier in D1.
 *
 * Never delete source metadata. Reconcile warnings only in the hydrated,
 * authenticated response after validating the independent source stores.
 */
const isObject=x=>!!x&&typeof x==='object'&&!Array.isArray(x);
const isInt=x=>typeof x==='number'&&Number.isSafeInteger(x)&&x>=0;
const validDay=d=>typeof d==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(d)&&
 Number.isFinite(Date.parse(d+'T00:00:00Z'))&&new Date(d+'T00:00:00Z').toISOString().slice(0,10)===d;

/** Verifiable evidence that TikTok ingestion was actually enabled and wrote
 * real daily numbers. This is NOT a claim that a full historical video scan
 * has finished (that is a separate error category).
 */
export function hasVerifiedTikTokSync(record,job,liveSnapshot){
 if(record?.schema!==1||
    record?.source!=='TikTok Organic via Windsor.ai'||
    !record?.accountId||job?.status!=='ok')return false;
 const measuredDays=Array.isArray(record.daily)&&record.daily.some(r=>
  validDay(r?.d)&&isInt(r?.views));
 const media=Array.isArray(liveSnapshot?.platforms?.tt?.videos)&&
  liveSnapshot.platforms.tt.videos.some(v=>
   /^[0-9]{12,25}$/.test(String(v?.id||''))&&
   (v.source==='Official TikTok Display API'||
    v.source==='TikTok Organic über Windsor.ai'));
 return Boolean(measuredDays&&media);
}
export function reconcileSnapshotWarnings(snapshot,{
 tiktokOrganic=null,tiktokSync=null,tiktokCursor=null
}={}){
 if(!isObject(snapshot)||!Array.isArray(snapshot.errors))return snapshot;
 const verifiedTikTok=hasVerifiedTikTokSync(tiktokOrganic,tiktokSync,snapshot);
 const completedScan=Boolean(tiktokCursor?.hasMore===false&&
  tiktokCursor?.complete===true&&
  Number.isFinite(Date.parse(tiktokCursor.updatedAt||''))&&
  (snapshot.platforms?.tt?.videos||[]).some(v=>v.source==='Official TikTok Display API'));
 const retained=snapshot.errors.filter(error=>{
  if(!isObject(error)||error.platform!=='tt')return true;
  // Old Sheets bootstrapping placeholder, not an actual current failure
  // if the independent TikTok sync has successful verified video/day values.
  if(error.task==='tt-feed'&&verifiedTikTok)return false;
  // Only a fully finished OFFICIAL TikTok scan can retire a pagination
  // warning; TikTok daily numbers alone do not prove scan completeness.
  if(error.task==='video-list'&&completedScan)return false;
  return true;
 });
 if(retained.length===snapshot.errors.length)return snapshot;
 return {...snapshot,errors:retained,
  status:retained.length?'partial':snapshot.status==='error'?'error':'ok'};
}


/**
 * Public-safe diagnosis for operational /api/health.
 * Only allowlisted warning categories/booleans are returned. Never return
 * raw account metrics, video IDs, user captions, tokens or error messages.
 * This diagnoses STORED warnings, not an optional overlay failure at runtime.
 */
export function publicSnapshotWarningDiagnosis(snapshot,{tiktokOrganic=null,tiktokSync=null,tiktokCursor=null}={}){
 if(!snapshot?.platforms?.tt||!Array.isArray(snapshot.errors))
  return {category:'unknown',legacyTikTokRecovered:false};
 const old=snapshot.errors;
 // Organic media can be stored separately from the original Apps Script
 // snapshot. We only use it to verify a formerly missing media source.
 const sourceMedia=[...(Array.isArray(snapshot.platforms.tt.videos)?snapshot.platforms.tt.videos:[]),
  ...(Array.isArray(tiktokOrganic?.videos)?tiktokOrganic.videos:[])];
 const live={...snapshot,platforms:{...snapshot.platforms,tt:{
  ...snapshot.platforms.tt,videos:sourceMedia
 }}};
 const current=reconcileSnapshotWarnings(live,{tiktokOrganic,tiktokSync,tiktokCursor});
 const remaining=current.errors||[];
 const tags=new Set(remaining.map(e=>e?.platform==='tt'&&e?.task==='tt-feed'?'tiktok-bootstrap':
  e?.platform==='tt'&&e?.task==='video-list'?'tiktok-pagination':'other'));
 const category=tags.size===0?'none':tags.size>1?'multiple':Array.from(tags)[0];
 const legacyTikTokRecovered=old.some(e=>e?.platform==='tt'&&e?.task==='tt-feed')&&
  !remaining.some(e=>e?.platform==='tt'&&e?.task==='tt-feed');
 return {category,legacyTikTokRecovered};
}
