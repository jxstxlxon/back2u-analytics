/* BACK2U V7.5 – private D1 audience import. No source stats committed into GitHub. */
(()=>{'use strict';
 const $=id=>document.getElementById(id);
 const status=message=>{const target=$('audienceImportStatus');if(target)target.textContent=message};
 async function api(path,opts={}){
  const res=await fetch(path,{credentials:'same-origin',cache:'no-store',...opts});
  const payload=await res.json().catch(()=>({}));
  if(!res.ok)throw new Error(payload.error||'HTTP '+res.status);
  return payload;
 }
 function validateFile(obj){
  if(obj?.schema!==1||obj?.channelId!=='UCBnnaMohI_VfKihekEwaQEw'||obj?.tiktokHandle!=='back2u.mp3')
   throw new Error('Die Datei gehört nicht zum verbundenen BACK2U-YouTube-/TikTok-Konto.');
  for(const [p,types] of Object.entries({yt:['countries','gender','age'],tt:['age']})){
   for(const type of types){
    if(!Array.isArray(obj.audience?.[p]?.[type])||!obj.audience[p][type].length)
     throw new Error('Fehlende Aufteilung '+p+'/'+type);
   }
  }
  return obj;
 }
 async function init(){
  if(location.protocol==='file:')return;
  const panel=$('audienceImportPanel');if(!panel)return;
  let access;try{access=await api('/api/access')}catch{return}
  if(access.role!=='admin')return;
  panel.hidden=false;
  let existing=false;
  try{const state=await api('/api/audience');
   existing=Boolean(state.configured);
   status(existing?'Private Zielgruppendaten vorhanden · Stand '+String(state.snapshotDate||'unbekannt')+'. Eine erneute Datei ersetzt nur diese vier Aufteilungen.':'Noch keine privaten Zielgruppendaten importiert.');
  }catch(e){status('Importstatus konnte nicht geladen werden: '+e.message)}
  $('audienceImportForm').addEventListener('submit',async e=>{
   e.preventDefault();
   const file=$('audienceImportFile').files?.[0],button=$('audienceImportButton');
   if(!file){status('Bitte zuerst die heruntergeladene BACK2U-Audience-JSON-Datei auswählen.');return}
   if(file.size>35000){status('Datei zu groß; maximal 35 KB.');return}
   let data;
   try{data=validateFile(JSON.parse(await file.text()))}
   catch(err){status('Import abgebrochen: '+err.message);return}
   if(existing&&!confirm('Die vier bisherigen privaten Zielgruppenaufteilungen durch diese Datei ersetzen?'))return;
   button.disabled=true;status('Übertrage die geprüften Zielgruppendaten in die private Cloudflare-Datenbank …');
   try{
    const done=await api('/api/audience',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(data)});
    existing=true;
    status('Import abgeschlossen: '+done.importedGroups+' Aufteilungen gespeichert. Datenstand '+done.snapshotDate+'. Aktualisiere die Statistikansicht.');
    const refresh=$('refreshBtn');if(refresh)refresh.click();
   }catch(err){status('Import fehlgeschlagen: '+err.message)}
   finally{button.disabled=false}
  });
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();