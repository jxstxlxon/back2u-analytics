/* BACK2U V7.7 – direct official YouTube/Meta demographic feeds.
   No OAuth tokens in this module; requests are authenticated by Worker bearer secret.
   These helpers are pure and permit deterministic safety tests. */
const PLATFORMS={
 yt:{id:'UCBnnaMohI_VfKihekEwaQEw',source:'YouTube Analytics API (direct)'},
 ig:{id:'lxon_jxmpstyle',source:'Meta Graph API (direct)'}
};
const REQUIRED=['age','gender','countries'];
const DATE=/^\d{4}-\d{2}-\d{2}$/;
const rounding=value=>Math.round((value+Number.EPSILON)*10)/10;
const cleanText=(v,n)=>typeof v==='string'&&v.trim().length>0&&v.trim().length<=n&&!/[\x00-\x1f<>]/.test(v);
function percentRows(entries,type){
 if(!Array.isArray(entries)||entries.length< (type==='gender'?2:type==='age'?4:5)||entries.length>80)
  throw Error('Report incomplete: '+type);
 const labels=new Set();
 let sum=0,hasOther=false;
 const groups=entries.map(row=>{
  if(!Array.isArray(row)||row.length!==2)throw Error('Bad row format');
  const label=String(row[0]||'').trim();
  const value=Number(row[1]);
  if(!cleanText(label,65)||labels.has(label)||!Number.isFinite(value)||value<0||value>100)
   throw Error('Bad category or percentage for '+type);
  labels.add(label);
  if(label==='Weitere')hasOther=true;
  sum+=value;
  return [label,rounding(value)];
 });
 if(Math.abs(sum-100)>0.51)throw Error('Distribution not 100% in '+type);
 groups.sort((a,b)=>Number(a[0]==='Weitere')-Number(b[0]==='Weitere')||b[1]-a[1]);
 const roundedSum=groups.reduce((n,x)=>n+x[1],0),delta=rounding(100-roundedSum);
 const idx=hasOther?groups.findIndex(x=>x[0]==='Weitere'):groups.length-1;
 groups[idx][1]=rounding(groups[idx][1]+delta);
 if(groups[idx][1]<0||groups[idx][1]>100)throw Error('Invalid rounding delta');
 return groups;
}
export function validateDirectAudience(data,now=Date.now()){
 if(data?.schema!==1||!Object.hasOwn(PLATFORMS,data.platform))throw Error('Unsupported account/platform');
 const p=data.platform;
 if(String(data.accountId)!==PLATFORMS[p].id)throw Error('Wrong creator account');
 const d=String(data.snapshotDate||'');
 const millis=Date.parse(d+'T00:00:00Z');
 if(!DATE.test(d)||!Number.isFinite(millis)||new Date(millis).toISOString().slice(0,10)!==d||
   millis>Date.parse(new Date(now).toISOString().slice(0,10)+'T00:00:00Z')||
   millis<Date.parse(new Date(now-8*86400000).toISOString().slice(0,10)+'T00:00:00Z'))
  throw Error('Stale, future or invalid report date');
 if(!data.audience||typeof data.audience!=='object')throw Error('No audience groups');
 const audience={},audienceMeta={};
 for(const kind of REQUIRED){
  audience[kind]=percentRows(data.audience[kind],kind);
  const m=data.audienceMeta?.[kind];
  if(!m||!cleanText(m.source,180)||!cleanText(m.basis,420))
   throw Error('Missing source and measurement basis for '+kind);
  if(m.source!==PLATFORMS[p].source)throw Error('Unexpected report provenance');
  const period=m.period===undefined?null:String(m.period);
  if(period!==null&&(!cleanText(period,100)))throw Error('Bad report period');
  audienceMeta[kind]={source:m.source,asOf:d,basis:m.basis,...(period?{period}:{})};
 }
 return {platform:p,accountId:PLATFORMS[p].id,snapshotDate:d,
  updatedAt:new Date(now).toISOString(),audience,audienceMeta};
}
export function mergeDirectAudience(previous,valid){
 const platform=valid.platform;
 // Different platforms never clobber each other's source data.
 const result={schema:1,updatedAt:valid.updatedAt,platforms:{...(previous?.platforms||{})}};
 result.platforms[platform]={
  accountId:valid.accountId,snapshotDate:valid.snapshotDate,updatedAt:valid.updatedAt,
  audience:valid.audience,audienceMeta:valid.audienceMeta
 };
 return result;
}
export function chooseEffectiveAudience(imported,direct){
 const out=imported?.schema===1?
  {schema:1,snapshotDate:imported.snapshotDate,updatedAt:imported.updatedAt,
   audience:structuredClone(imported.audience||{}),audienceMeta:structuredClone(imported.audienceMeta||{})}:
  {schema:1,snapshotDate:null,updatedAt:null,audience:{},audienceMeta:{}};
 if(direct?.schema!==1)return out;
 for(const [p,entry] of Object.entries(direct.platforms||{})){
  if(!Object.hasOwn(PLATFORMS,p)||!entry?.audience||!entry?.audienceMeta)continue;
  const existingDay=String(out.audienceMeta?.[p]?.age?.asOf||out.snapshotDate||'');
  // Never replace a newer Windsor snapshot with an older direct report.
  if(existingDay&&entry.snapshotDate<existingDay)continue;
  out.audience[p]={...(out.audience[p]||{}),...entry.audience};
  out.audienceMeta[p]={...(out.audienceMeta[p]||{}),...entry.audienceMeta};
  if(!out.snapshotDate||entry.snapshotDate>out.snapshotDate)out.snapshotDate=entry.snapshotDate;
 }
 return out;
}
