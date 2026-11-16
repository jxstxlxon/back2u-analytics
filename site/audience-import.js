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
 function renderDirectParity(audit){
  const node=$('directParityStatus');if(!node)return;
  node.replaceChildren();
  const checks=Array.isArray(audit?.checks)?audit.checks:[];
  const passed=checks.filter(x=>x?.pass===true).length;
  const all=checks.length;
  const summary=document.createElement('div');summary.className='direct-coverage-summary';
  const label=document.createElement('strong');
  label.textContent=all?passed+'/'+all+' Direktdaten-Prüfungen bestanden':'Noch kein überprüfbarer Direktdaten-Bericht';
  const detail=document.createElement('p');
  detail.textContent=all===0?'Noch keine gültige Prüfantwort verfügbar. Windsor.ai bleibt aktiv.':
   passed===all?'Alle Datenquellen haben die Abdeckungsprüfung bestanden. Ein echter Quellvergleich und D1-Backup sind zusätzlich erforderlich.':
    (all-passed)+' Prüfungen offen. Fehlende Daten werden nicht als 0 ausgewiesen. Windsor.ai bleibt aktiv.';
  const track=document.createElement('div');track.className='direct-coverage-track';
  track.setAttribute('role','progressbar');track.setAttribute('aria-label','Abdeckung offizieller Direktberichte');
  track.setAttribute('aria-valuemin','0');track.setAttribute('aria-valuemax',String(all||12));
  track.setAttribute('aria-valuenow',String(passed));
  const fill=document.createElement('span');fill.style.width=all?Math.round(100*passed/all)+'%':'0%';
  track.append(fill);summary.append(label,detail,track);node.append(summary);
  if(!all)return;
  const details=document.createElement('details');details.className='direct-coverage-details';
  const open=document.createElement('summary');
  open.textContent='Alle '+all+' Prüfkriterien anzeigen ('+(all-passed)+' offen)';
  details.append(open);
  const groups=document.createElement('div');groups.className='direct-coverage-groups';
  for(const [code,name] of [['yt_','YouTube'],['ig_','Instagram']]){
   const group=document.createElement('section');group.className='direct-coverage-group';
   const header=document.createElement('h5');header.textContent=name;group.append(header);
   for(const c of checks.filter(x=>String(x?.id||'').startsWith(code))){
    const row=document.createElement('div');
    row.className='direct-coverage-row '+(c.pass===true?'is-complete':'is-pending');
    const mark=document.createElement('span');mark.setAttribute('aria-hidden','true');
    mark.textContent=c.pass===true?'✓':'○';
    const body=document.createElement('div');
    const title=document.createElement('strong');title.textContent=String(c.label||'Nicht benannt');
    const caption=document.createElement('small');caption.textContent=String(c.details||'Noch kein Bericht');
    body.append(title,caption);row.append(mark,body);group.append(row);
   }
   groups.append(group);
  }
  details.append(groups);node.append(details);
  const note=document.createElement('p');note.className='direct-coverage-method';
  note.textContent='Datenabdeckung bedeutet nicht automatisch gleiche Kennzahlendefinitionen. Kein automatischer Wechsel von Windsor.ai.';
  node.append(note);
 }
 async function refreshDirectParity(){
  const node=$('directParityStatus');
  if(!node)return;
  const btn=$('directParityRefresh');if(btn)btn.disabled=true;
  try{
   const audit=await api('/api/direct-parity');
   renderDirectParity(audit);
  }catch(e){
   node.replaceChildren();
   const info=document.createElement('p');info.className='direct-coverage-error';
   info.textContent='Offizielle Direktdaten-Prüfung nicht erreichbar. Windsor.ai bleibt aktiv. '+String(e.message||'');
   node.append(info);
  }finally{if(btn)btn.disabled=false}
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
   try{
    const report=await api('/api/direct-insights/status');
    const node=$('directInsightsStatus');
    if(node){
     const y=report.youtubeVideoInsights||{},i=report.instagramVideoInsights||{},d=report.instagramDaily||{};
     const ranges=[7,28,90].map(days=>{
      const r=y.ranges?.[String(days)];
      return days+' Tage: '+(r?.period?String(r.videos||0)+' Videos':'noch kein Bericht');
     });
     node.textContent='YouTube Videoanalysen: '+ranges.join(' · ')+
      ' · Instagram Reel-Insights: '+(i.videoCount||0)+' Videos'+
      ' · Meta-Tageswerte: '+(d.days||0)+' Tage'+
      (d.dataThrough?' (bis '+d.dataThrough.split('-').reverse().join('.')+')':'')+
      '. Fehlende Kennzahlen bleiben offen.';
    }
   }catch{
    const node=$('directInsightsStatus');
    if(node)node.textContent='Zusatzstatistiken: Noch kein Direktbericht verfügbar.';
   }
   await refreshDirectParity();
   $('directParityRefresh')?.addEventListener('click',refreshDirectParity);
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