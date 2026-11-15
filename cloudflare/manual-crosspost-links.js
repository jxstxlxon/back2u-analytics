/*
 * Manual crosspost associations for BACK2U — separate from all analytics
 * snapshots, import pipelines and official API data.
 * Only the owner may create/delete these links; guest sessions can view them.
 */
export const MANUAL_LINKS_KEY='manual_crosspost_links_v1';
const MAX_GROUPS=250;
const KEY_RE={yt:/^[A-Za-z0-9_-]{11}$/,ig:/^\d{12,25}$/,tt:/^\d{12,25}$/};
const PATH='/api/manual-video-links';
const PLATFORM_ORDER=['yt','ig','tt'];

export function normalizeManualRef(value){
 const platform=String(value?.platform||'');
 const id=String(value?.id||'').trim();
 if(!Object.hasOwn(KEY_RE,platform)||!KEY_RE[platform].test(id))return null;
 return {platform,id};
}
export const manualRefKey=ref=>ref.platform+':'+ref.id;
export function validateManualMembers(input){
 if(!Array.isArray(input)||input.length<2||input.length>3)
  throw Error('Wähle zwei oder drei Video-Versionen.');
 const members=input.map(normalizeManualRef);
 if(members.some(x=>!x))throw Error('Mindestens eine Video-ID ist ungültig.');
 const platforms=new Set(members.map(x=>x.platform));
 if(platforms.size!==members.length)throw Error('Pro Plattform darf nur eine Video-Version verknüpft sein.');
 return members.sort((a,b)=>PLATFORM_ORDER.indexOf(a.platform)-PLATFORM_ORDER.indexOf(b.platform));
}
function checkedState(data){
 if(data==null)return {schema:1,groups:[]};
 if(data.schema!==1||!Array.isArray(data.groups)||data.groups.length>MAX_GROUPS)
  throw Error('Gespeicherte Zuordnungen sind unlesbar.');
 for(const g of data.groups){
  if(!/^[\da-f-]{36}$/i.test(String(g.id))||
      !Array.isArray(g.members)||g.members.length<2||g.members.length>3||
      !g.members.every(v=>normalizeManualRef(v)))
   throw Error('Gespeicherte Zuordnungen sind ungültig.');
 }
 return data;
}
export function mutateManualLinks(data,operation,{members,id}={},createId=()=>crypto.randomUUID()){
 const old=checkedState(data);
 const groups=old.groups.map(g=>({...g,members:g.members.map(v=>({...v}))}));
 if(operation==='delete'){
  const next=groups.filter(g=>g.id!==id);
  if(next.length===groups.length)throw Error('Zuordnung nicht gefunden.');
  return {schema:1,groups:next};
 }
 if(operation!=='link')throw Error('Unbekannte Änderung.');
 const selected=validateManualMembers(members);
 const keys=new Set(selected.map(manualRefKey));
 const overlapping=groups.filter(g=>g.members.some(m=>keys.has(manualRefKey(m))));
 const merged=new Map();
 for(const item of [...overlapping.flatMap(g=>g.members),...selected]){
  const ref=normalizeManualRef(item);
  if(!ref)throw Error('Ungültige gespeicherte Video-ID.');
  const previous=merged.get(ref.platform);
  if(previous&&manualRefKey(previous)!==manualRefKey(ref))
   throw Error('Diese Zuordnung enthält zwei unterschiedliche Videos derselben Plattform.');
  merged.set(ref.platform,ref);
 }
 const assembled=[...merged.values()].sort((a,b)=>
  PLATFORM_ORDER.indexOf(a.platform)-PLATFORM_ORDER.indexOf(b.platform));
 if(assembled.length<2||assembled.length>3)throw Error('Maximal drei Plattformen pro Video.');
 const keepId=overlapping[0]?.id||createId();
 if(overlapping.length===1&&overlapping[0].members.length===assembled.length&&
   overlapping[0].members.every(m=>assembled.some(x=>manualRefKey(x)===manualRefKey(m))))
  return {schema:1,groups};
 const next=groups.filter(g=>!overlapping.includes(g));
 if(next.length>=MAX_GROUPS)throw Error('Zu viele Zuordnungen gespeichert.');
 next.push({id:keepId,members:assembled,createdAt:overlapping[0]?.createdAt||new Date().toISOString()});
 return {schema:1,groups:next};
}
function storedIds(snapshot){
 const known=new Set();
 for(const platform of PLATFORM_ORDER)for(const v of snapshot?.platforms?.[platform]?.videos||[]){
  const r=normalizeManualRef({platform,id:v.id});
  if(r)known.add(manualRefKey(r));
 }
 return known;
}
async function getRow(env){
 return env.DB.prepare('SELECT value FROM back2u_store WHERE key=?')
  .bind(MANUAL_LINKS_KEY).first();
}
async function saveCAS(env,prior,body){
 const json=JSON.stringify(body);
 const query=prior?
  'UPDATE back2u_store SET value=?,updated_at=CURRENT_TIMESTAMP WHERE key=? AND value=?':
  'INSERT INTO back2u_store (key,value,updated_at) VALUES(?,?,CURRENT_TIMESTAMP) ON CONFLICT(key) DO NOTHING';
 const statement=env.DB.prepare(query);
 const result=prior?
  await statement.bind(json,MANUAL_LINKS_KEY,prior.value).run():
  await statement.bind(MANUAL_LINKS_KEY,json).run();
 return result.meta?.changes===1;
}
export async function manualCrosspostRoute(req,env,role,{json,requireSameSiteJson}){
 if(!env.DB)return json({error:'Dashboard-Speicher nicht eingerichtet'},503);
 const url=new URL(req.url),path=url.pathname;
 if(path===PATH&&req.method==='GET'){
  const row=await getRow(env);
  try{
   const current=checkedState(row?JSON.parse(row.value):null);
   return json({schema:1,groups:current.groups,canEdit:role==='admin'});
  }catch{return json({error:'Video-Zuordnungen aktuell nicht lesbar'},503)}
 }
 // Even a guest who knows the correct API URL must never change shared links.
 if(role!=='admin')return json({error:'Nur Eigentümer dürfen Video-Zuordnungen ändern'},403);
 if(path===PATH&&req.method==='POST'){
  if(!requireSameSiteJson(req))return json({error:'Unzulässige Anfrage'},403);
  const text=await req.text();if(text.length>2000)return json({error:'Anfrage zu groß'},413);
  let body;try{body=JSON.parse(text)}catch{return json({error:'Ungültige Anfrage'},400)}
  let members;try{members=validateManualMembers(body?.members)}catch(e){return json({error:e.message},422)}
  // Validate each reference against REAL stored IDs; never let caller invent a
  // phantom video, and never mutate video records or official metrics.
  const snapshot=await env.DB.prepare('SELECT value FROM back2u_store WHERE key=?')
   .bind('snapshot').first();
  let actual;
  try{actual=storedIds(snapshot?JSON.parse(snapshot.value):null)}catch{return json({error:'Videodaten nicht erreichbar'},503)}
  if(members.some(m=>!actual.has(manualRefKey(m))))
   return json({error:'Ein Video wurde nicht in der aktuellen Datenbank gefunden. Bitte neu laden.'},422);
  const row=await getRow(env);
  let current,next;
  try{
   current=checkedState(row?JSON.parse(row.value):null);
   next=mutateManualLinks(current,'link',{members});
  }catch(e){return json({error:e.message},422)}
  if(JSON.stringify(current)===JSON.stringify(next))return json({ok:true,groups:current.groups,unchanged:true});
  if(!await saveCAS(env,row,next))return json({error:'Zuordnungen wurden gerade geändert. Bitte neu laden.'},409);
  return json({ok:true,groups:next.groups});
 }
 if(path.startsWith(PATH+'/')&&req.method==='DELETE'){
  const origin=req.headers.get('origin');
  if(req.headers.get('sec-fetch-site')==='cross-site'||
      (origin&&origin!==url.origin))return json({error:'Unzulässige Anfrage'},403);
  const id=path.slice((PATH+'/').length);
  if(!/^[\da-f-]{36}$/i.test(id))return json({error:'Ungültige Zuordnungs-ID'},422);
  const row=await getRow(env);
  let next;try{next=mutateManualLinks(row?JSON.parse(row.value):null,'delete',{id})}
   catch(e){return json({error:e.message},404)}
  if(!await saveCAS(env,row,next))return json({error:'Zuordnungen wurden gerade geändert. Bitte neu laden.'},409);
  return json({ok:true,groups:next.groups});
 }
 return json({error:'Methode nicht erlaubt'},405);
}
