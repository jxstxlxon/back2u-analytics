/*
 * Optional owner-only manual crosspost linkage.
 * Changes only a separate D1 association record, never source video metrics.
 * The Video Radar and Top 10 share the same grouping bridge.
 */
(() => {
 'use strict';
 const bridge=window.BACK2U_MANUAL_BRIDGE;
 const panel=document.getElementById('manualLinksPanel');
 if(!bridge||!panel)return;
 const $=id=>document.getElementById(id);
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const labels={yt:'YouTube',ig:'Instagram',tt:'TikTok'};
 const key=v=>bridge.videoRef(v);
 const editable=v=>!!v&&bridge.verifiedVideo(v);
 const groupEligible=g=>g?.members?.some(editable);
 const groupKey=g=>String(g?.groupKey||'');
 const status=message=>{$('manualLinksStatus').textContent=message};
 let anchor=null,match=null,busy=false,canEdit=false,links=[];
 const validGroups=()=>bridge.groups().filter(groupEligible);
 const present=g=>String(g?.title||g?.first?.title||'Unbenanntes Video');
 const platforms=g=>new Set((g?.members||[]).map(x=>x.platform));
 const dateOf=g=>String(g?.date||'');
 const canMatch=(a,b)=>a&&b&&a!==b&&
  ![...platforms(b)].some(p=>platforms(a).has(p))&&
  [...(a.members||[]),...(b.members||[])].length<=3;
 function describe(g){
  const ps=(g?.members||[]).map(x=>labels[x.platform]||x.platform).join(' + ');
  return present(g)+' · '+ps+(dateOf(g)?' · '+dateOf(g):'');
 }
 function selectAnchor(g){
  anchor=g;match=null;
  $('manualAnchorSelected').textContent='Ausgangsvideo: '+describe(g);
  $('manualMatchSelected').textContent='Noch keine zweite Version ausgewählt.';
  $('manualMatchSearch').disabled=false;
  $('manualMatchSearch').value='';
  status('Wähle jetzt die passende Version von einer fehlenden Plattform aus.');
  renderSearch('anchor');renderSearch('match');setSaveState();
 }
 function selectMatch(g){
  match=g;$('manualMatchSelected').textContent='Passende Version: '+describe(g);
  status('Prüfe beide Videos und bestätige die Verknüpfung.');
  renderSearch('match');setSaveState();
 }
 function setSaveState(){$('manualLinkSave').disabled=busy||!canMatch(anchor,match)}
 function renderSearch(type){
  const first=type==='anchor',input=$(first?'manualAnchorSearch':'manualMatchSearch');
  const root=$(first?'manualAnchorResults':'manualMatchResults');
  if(!canEdit||(!first&&!anchor)){root.replaceChildren();return}
  const q=input.value.toLocaleLowerCase('de-DE').trim();
  let items=validGroups().filter(g=>first?true:canMatch(anchor,g));
  // Make nearby uploads appear first when looking for a crosspost, but let
  // any exact title/ID query find older or differently named videos too.
  const day=anchor?.date?Date.parse(anchor.date+'T12:00:00Z'):NaN;
  if(!first&&Number.isFinite(day)&&!q)
   items=items.filter(g=>Number.isFinite(Date.parse(g.date+'T12:00:00Z'))&&
    Math.abs(Date.parse(g.date+'T12:00:00Z')-day)<=5*86400000);
  if(q)items=items.filter(g=>[present(g),dateOf(g),...g.members.flatMap(v=>
   [labels[v.platform],v.id])].join(' ').toLocaleLowerCase('de-DE').includes(q));
  items.sort((a,b)=>!first&&Number.isFinite(day)?
   Math.abs(Date.parse(a.date+'T12:00:00Z')-day)-Math.abs(Date.parse(b.date+'T12:00:00Z')-day):
   String(b.date||'').localeCompare(String(a.date||'')));
  root.innerHTML=items.slice(0,8).map((g,i)=>'<button type="button" data-manual-index="'+i+'">'+
   '<strong>'+esc(present(g))+'</strong><small>'+esc((g.members||[]).map(v=>labels[v.platform]).join(' + '))+
   ' · '+esc(g.date||'Datum fehlt')+'</small></button>').join('')||
   '<p class="manual-search-empty">'+(q?'Keine Treffer – versuche einen anderen Suchbegriff.':
   first?'Noch keine identifizierbaren Videos geladen.':'Keine passende Version in den nächsten fünf Tagen gefunden. Suche nach einem Titel.')+'</p>';
  const visible=items.slice(0,8);
  root.querySelectorAll('[data-manual-index]').forEach(el=>el.addEventListener('click',()=>{
   const g=visible[Number(el.dataset.manualIndex)];
   if(g)(first?selectAnchor:selectMatch)(g);
  }));
 }
 function renderStored(){
  const root=$('manualSavedLinks');
  if(!links.length){root.innerHTML='<p class="manual-search-empty">Noch keine manuellen Zuordnungen. Die automatische Erkennung bleibt aktiv.</p>';return}
  const byKey=new Map(bridge.videos().filter(v=>key(v)).map(v=>[key(v),v]));
  root.innerHTML=links.map(g=>{
   const text=(g.members||[]).map(v=>{
    const video=byKey.get(key(v));
    return (labels[v.platform]||v.platform)+': '+(video?.title||'Video derzeit nicht im Live-Datensatz');
   }).join(' · ');
   return '<div class="manual-saved-row"><span>'+esc(text)+'</span><button type="button" data-unlink-id="'+
    esc(g.id)+'">Zuordnung aufheben</button></div>';
  }).join('');
  root.querySelectorAll('[data-unlink-id]').forEach(el=>el.addEventListener('click',()=>removeLink(el.dataset.unlinkId)));
 }
 function apply(data){
  if(!data||!Array.isArray(data.groups))throw Error('Ungültige Zuordnungsantwort');
  links=data.groups;canEdit=!!data.canEdit;
  panel.hidden=!canEdit;
  if(!canEdit){anchor=null;match=null}
  bridge.setLinks({groups:links,canEdit});
  if(canEdit){renderStored();renderSearch('anchor');renderSearch('match');setSaveState()}
 }
 async function readLinks(){
  try{
   const res=await fetch('/api/manual-video-links',{credentials:'same-origin',cache:'no-store'});
   if(!res.ok)throw Error('HTTP '+res.status);
   const data=await res.json();apply(data);
  }catch(e){
   // Never display stale/unverified manual combinations as if confirmed.
   links=[];canEdit=false;panel.hidden=true;
   bridge.setLinks({groups:[],canEdit:false});
  }
 }
 async function saveLink(){
  if(busy||!canEdit||!canMatch(anchor,match))return;
  const a=anchor.members.find(editable),b=match.members.find(editable);
  if(!a||!b){status('Diese Video-IDs sind derzeit nicht im Cloudflare-Datensatz. Bitte neu laden.');return}
  const confirmed=window.confirm('Diese Videos wirklich miteinander verknüpfen?\n\n'+describe(anchor)+'\n\n'+describe(match)+'\n\nDie Originalaufrufe bleiben unverändert.');
  if(!confirmed)return;
  busy=true;setSaveState();status('Speichere die Zuordnung sicher in Cloudflare …');
  try{
   const res=await fetch('/api/manual-video-links',{method:'POST',credentials:'same-origin',
    cache:'no-store',headers:{'content-type':'application/json'},
    body:JSON.stringify({members:[{platform:a.platform,id:a.id},{platform:b.platform,id:b.id}]})});
   const data=await res.json().catch(()=>({}));
   if(!res.ok)throw Error(data.error||'Speichern fehlgeschlagen ('+res.status+')');
   apply({groups:data.groups,canEdit:true});
   anchor=null;match=null;
   $('manualAnchorSelected').textContent='Noch kein Ausgangsvideo ausgewählt.';
   $('manualMatchSelected').textContent='Noch keine zweite Version ausgewählt.';
   $('manualMatchSearch').disabled=true;
   status(data.unchanged?'Diese Videos sind bereits zugeordnet.':'Zuordnung gespeichert. Die Video-Rankings wurden neu berechnet.');
  }catch(e){status('Zuordnung nicht gespeichert: '+String(e.message||e))}
  finally{busy=false;setSaveState()}
 }
 async function removeLink(id){
  if(busy||!canEdit||!links.some(g=>g.id===id))return;
  if(!window.confirm('Diese manuelle Verknüpfung aufheben? Die automatische Video-Erkennung bleibt bestehen.'))return;
  busy=true;setSaveState();status('Hebe die Zuordnung auf …');
  try{
   const res=await fetch('/api/manual-video-links/'+encodeURIComponent(id),{
    method:'DELETE',credentials:'same-origin',cache:'no-store'});
   const data=await res.json().catch(()=>({}));
   if(!res.ok)throw Error(data.error||'Aufheben fehlgeschlagen ('+res.status+')');
   apply({groups:data.groups,canEdit:true});
   anchor=null;match=null;
   $('manualAnchorSelected').textContent='Noch kein Ausgangsvideo ausgewählt.';
   $('manualMatchSelected').textContent='Noch keine zweite Version ausgewählt.';
   $('manualMatchSearch').disabled=true;
   status('Manuelle Zuordnung aufgehoben. Automatische Erkennung ist weiterhin aktiv.');
  }catch(e){status('Zuordnung nicht aufgehoben: '+String(e.message||e))}
  finally{busy=false;setSaveState()}
 }
 function openGroup(group){
  if(!canEdit||!group)return;
  panel.hidden=false;panel.open=true;
  const g=bridge.groups().find(x=>groupKey(x)===groupKey(group))||group;
  if(!groupEligible(g)){status('Dieses Video ist nicht eindeutig im Live-Datensatz identifiziert.');return}
  selectAnchor(g);
  panel.scrollIntoView({behavior:'smooth',block:'start'});
  $('manualMatchSearch').focus({preventScroll:true});
 }
 window.BACK2U_MANUAL_LINKS={openGroup};
 $('manualAnchorSearch').addEventListener('input',()=>renderSearch('anchor'));
 $('manualMatchSearch').addEventListener('input',()=>renderSearch('match'));
 $('manualLinkSave').addEventListener('click',saveLink);
 panel.addEventListener('toggle',()=>{if(panel.open&&canEdit){renderSearch('anchor');renderSearch('match');renderStored()}});
 window.addEventListener('back2u:live',()=>readLinks());
 window.addEventListener('back2u:auth',()=>readLinks());
 readLinks();
})();
