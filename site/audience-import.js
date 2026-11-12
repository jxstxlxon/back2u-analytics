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
 let initialized=false;
 const formatTime=iso=>iso?new Date(iso).toLocaleString('de-DE'):'noch nie';
 function showDirect(sources){
  const target=$('directAudienceStatus');if(!target)return;
  const details=['yt','ig'].map(p=>{
   const x=sources?.[p],name=p==='yt'?'YouTube':'Instagram';
   if(!x?.configured)return name+': Noch kein erfolgreicher direkter Abruf';
   const day=String(x.snapshotDate||'unbekannt').split('-').reverse().join('.');
   return name+': '+(x.groups===3?'3/3 Aufteilungen':'unvollständig')+' · Stand '+day;
  });
  target.textContent=details.join('  |  ');
 }
 function showAutomatic(data){
  const node=$('audienceAutoSyncStatus'),button=$('audienceSyncNow');
  if(!node||!button)return;
  const a=data.automatic||{};
  button.disabled=!a.configured;
  if(!a.configured){node.textContent='Einmalige Einrichtung fehlt: WINDSOR_API_KEY ist in Cloudflare noch nicht hinterlegt.';return}
  if(a.status==='ok'){node.textContent='Automatik aktiv · letzter erfolgreicher Abgleich: '+formatTime(a.lastSuccessAt)+' · '+(a.groups||9)+' Aufteilungen.';return}
  if(a.status==='error'){node.textContent='Letzter Abgleich fehlgeschlagen: '+(a.error||'unbekannt')+'. Vorhandene Werte bleiben erhalten. Letzter Erfolg: '+formatTime(a.lastSuccessAt);return}
  if(a.status==='running'){node.textContent='Automatischer Abgleich läuft seit '+formatTime(a.lastAttemptAt)+'.';return}
  node.textContent='Automatik eingerichtet · erster Abgleich noch ausstehend. Du kannst ihn jetzt starten.';
 }
 async function init(){
  if(initialized||location.protocol==='file:')return;
  const panel=$('audienceImportPanel');if(!panel)return;
  let access;try{access=await api('/api/access')}catch{return}
  if(access.role!=='admin')return;
  initialized=true;panel.hidden=false;
  let existing=false;
  try{const state=await api('/api/audience');
   existing=Boolean(state.configured);
   showAutomatic(state);
   try{const direct=await api('/api/direct-audience/status');showDirect(direct.sources)}
   catch{const node=$('directAudienceStatus');if(node)node.textContent='Direktstatus kann gerade nicht geladen werden.'}
   status(existing?'Private Zielgruppendaten vorhanden · Stand '+String(state.snapshotDate||'unbekannt')+'.':'Noch keine privaten Zielgruppendaten importiert.');
  }catch(e){status('Importstatus konnte nicht geladen werden: '+e.message)}
  $('audienceSyncNow').addEventListener('click',async()=>{
   const button=$('audienceSyncNow'),target=$('audienceAutoSyncStatus');
   button.disabled=true;target.textContent='Rufe neun aktuelle Zielgruppen-Berichte bei Windsor.ai ab …';
   try{
    const result=await api('/api/audience/sync',{method:'POST',headers:{'content-type':'application/json'},body:'{}'});
    if(result.status!=='ok')throw new Error(result.error||result.reason||result.status);
    target.textContent='Erfolgreich: 9 von 9 Aufteilungen aktualisiert · '+formatTime(result.lastSuccessAt)+'.';
    existing=true;
    const refresh=$('refreshBtn');if(refresh)refresh.click();
   }catch(e){target.textContent='Automatischer Abruf fehlgeschlagen: '+e.message+'. Die bisher gespeicherten Statistiken bleiben erhalten.'}
   finally{
    try{showAutomatic(await api('/api/audience'))}catch{button.disabled=false}
   }
  });
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
 window.addEventListener('back2u:auth',init);
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();