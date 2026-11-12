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

 function showTikTokDaily(data){
  const node=$('tiktokDailyStatus');if(!node)return;
  const stats=data?.coverage||{},windows=stats.windows||{},sync=data?.sync||{};
  const group=[7,28,90].map(days=>{
   const known=windows[String(days)]?.known||{};
   return days+'T: '+(known.views||0)+' Views-Tage / '+(known.profileViews||0)+' Profil-Tage';
  });
  const latest=stats.lastMeasuredDay||'–';
  const mode=data.enabled?'Automatik freigegeben':'Automatik aus – kein geplanter Windsor-Abruf';
  let details=mode+' · Letzter belegter Tag: '+latest+' · '+group.join(' · ');
  if(sync.status==='ok')details+=' · Letzter Sync: '+formatTime(sync.lastSuccessAt);
  if(sync.status==='error')details+=' · Letzter Fehler: '+String(sync.error||'Abruf fehlgeschlagen');
  if(sync.status==='not_started')details+=' · Noch nicht einmalig getestet';
  node.textContent=details+'. Fehlende Tage werden nicht als 0 gewertet.';
 }
 async function refreshTikTokDaily(){
  const node=$('tiktokDailyStatus');
  try{showTikTokDaily(await api('/api/tiktok-daily/status'))}
  catch{if(node)node.textContent='TikTok-Tagesdatenstatus nicht erreichbar. Keine Daten wurden verändert.'}
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
   try{
    const audit=await api('/api/direct-parity');
    const node=$('directParityStatus');
    if(node){
     const missing=(audit.checks||[]).filter(x=>!x.pass);
     node.textContent='Direktquellen-Datenprüfung: '+audit.summary.passed+'/'+audit.summary.total+' erfüllt. '+
      (missing.length?'Offen: '+missing.map(x=>x.label+' ('+x.details+')').join(' · '):
       'Datenabdeckung vollständig; echter 7-Tage-Parallelvergleich und D1-Backup bleiben Pflicht.')+
      ' Keine automatische Windsor-Abschaltung.';
    }
   }catch{
    const node=$('directParityStatus');
    if(node)node.textContent='Datenqualitätsprüfung nicht erreichbar; Windsor bleibt aktiv.';
   }
   await refreshTikTokDaily();
   status(existing?'Private Zielgruppendaten vorhanden · Stand '+String(state.snapshotDate||'unbekannt')+'.':'Noch keine privaten Zielgruppendaten importiert.');
  }catch(e){status('Importstatus konnte nicht geladen werden: '+e.message)}
  const ttButton=$('tiktokDailySyncNow');
  if(ttButton)ttButton.addEventListener('click',async()=>{
   if(!confirm('Nur nach gesichertem D1-Backup und geprüftem Windsor-Zugang durchführen. TikTok-Tagesdaten jetzt einmalig abrufen?'))return;
   ttButton.disabled=true;
   const node=$('tiktokDailyStatus');
   if(node)node.textContent='Prüfe 28 Tage über TikTok Organic …';
   try{
    const result=await api('/api/tiktok-daily/sync',{
     method:'POST',headers:{'content-type':'application/json'},body:'{}'
    });
    if(result.status!=='ok')throw Error(result.error||result.reason||result.status);
    await refreshTikTokDaily();
    const refresh=$('refreshBtn');if(refresh)refresh.click();
   }catch(e){if(node)node.textContent='Kein neuer TikTok-Tagesimport: '+e.message+'. Bestehende Werte bleiben gespeichert.'}
   finally{ttButton.disabled=false}
  });
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