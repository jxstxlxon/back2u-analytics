/* BACK2U V8.0 — progressive, non-destructive workspace ergonomics.
 * Existing renderer and 36 themes remain authoritative. No data writes.
 */
(() => {
 'use strict';
 const $=s=>document.querySelector(s);
 const $$=s=>[...document.querySelectorAll(s)];
 const create=(tag,className,text)=>{
  const node=document.createElement(tag);
  if(className)node.className=className;
  if(text!==undefined)node.textContent=text;
  return node;
 };
 const button=(label,action)=>{
  const b=create('button','v80-action',label);
  b.type='button';b.dataset.v80Action=action;
  return b;
 };
 const focusView=(target)=>{
  const node=$(target);
  if(!node)return;
  node.scrollIntoView({block:'start',behavior:'smooth'});
 };
 const switchSection=(name)=>{
  const existing=$('.section-nav [data-section="'+name+'"]');
  if(existing){existing.click();return true}
  return false;
 };
 function quickRow(container,items,cls='v80-jumps'){
  if(!container)return null;
  const nav=create('nav',cls);
  nav.setAttribute('aria-label','Direkt zu den wichtigsten Funktionen');
  for(const item of items)nav.append(button(item[0],item[1]));
  const heading=container.querySelector(':scope > .section-heading');
  if(heading)heading.insertAdjacentElement('afterend',nav);
  else container.insertAdjacentElement('afterbegin',nav);
  return nav;
 }
 function themeFavorites(){
  const themes=window.BACK2U_THEMES,panel=$('#themeStudioPanel');
  if(!themes||!panel||panel.querySelector('.v80-theme-favorites'))return;
  const host=panel.querySelector('.theme-dialog-body');
  if(!host)return;
  const wrap=create('section','v80-theme-favorites');
  wrap.setAttribute('aria-label','Theme-Schnellauswahl');
  const intro=create('div','v80-theme-heading');
  intro.append(create('strong','', 'Schnell deinen Look wechseln'),
   create('small','','Vier passende Startpunkte. Alle bisherigen Themes und Regler bleiben darunter.'));
  wrap.append(intro);
  const grid=create('div','v80-theme-favorite-grid');
  const presets=['n24','n04','n23','n15'];
  for(const id of presets){
   const p=themes.get(id),b=create('button','v80-theme-favorite');
   b.type='button';b.dataset.v80Theme=id;
   b.setAttribute('aria-label',p.name+' als Theme verwenden');
   b.style.setProperty('--v80-a',p.accent);b.style.setProperty('--v80-b',p.secondary);
   const preview=create('span','v80-theme-color-preview');
   preview.setAttribute('aria-hidden','true');
   const name=create('strong','',p.name.replace(/^\d+ · /,''));
   const type=create('small','',p.family==='light'?'Helles Glas':p.family==='aero'?'Frutiger Aero':'Dunkles Glas');
   b.append(preview,name,type);
   b.addEventListener('click',()=>{themes.use(id);updateThemeButtons()});
   grid.append(b);
  }
  wrap.append(grid);
  host.parentElement.insertBefore(wrap,host);
  function updateThemeButtons(){
   for(const b of grid.children){
    const selected=b.dataset.v80Theme===themes.current();
    b.classList.toggle('is-active',selected);
    b.setAttribute('aria-pressed',String(selected));
   }
  }
  updateThemeButtons();
  window.addEventListener('back2u-theme-changed',updateThemeButtons);
 }
 function storyWorkspace(){
  const controls=$('#storyEditorRoot .story-editor-controls');
  if(!controls||controls.querySelector('.v80-story-customize'))return;
  const first=controls.querySelector('.story-input-grid');
  const foot=controls.querySelector('.story-editor-foot');
  if(!first||!foot)return;
  const advanced=create('details','v80-story-customize');
  advanced.open=window.matchMedia?.('(min-width:831px)')?.matches??false;
  const summary=create('summary','','◎ Inhalte, Layout und Plattform anpassen');
  advanced.append(summary);
  controls.insertBefore(advanced,first);
  let cursor=first;
  while(cursor&&cursor!==foot){
   const next=cursor.nextElementSibling;
   advanced.append(cursor);
   cursor=next;
  }
 }
 function videoWorkspace(){
  const section=$('#videos');
  if(!section)return;
  const jumps=quickRow(section,[
   ['⌕ Videos finden','video-search'],['✦ Top 7 Tage','video-top'],
   ['▤ Bibliothek','video-library']
  ],'v80-jumps v80-video-jumps');
  jumps?.setAttribute('aria-label','Video Radar Schnellzugriff');
  const maintenance=section.querySelector('.video-sync-row');
  if(maintenance&&!section.querySelector('#v80VideoMaintenance')){
   const details=create('details','v80-maintenance');
   details.id='v80VideoMaintenance';
   const summary=create('summary','', '◎ Datenpflege & TikTok-Abgleich');
   details.append(summary);
   maintenance.parentElement.insertBefore(details,maintenance);
   details.append(maintenance);
   const archive=$('#tiktokArchiveRow');
   if(archive)details.append(archive);
  }
 }
 function creatorWorkspace(){
  const root=$('#creator');
  if(!root)return;
  const nav=quickRow(root,[
   ['📅 Kalender','creator-calendar'],['🎯 Ziele','creator-goals'],
   ['💬 Captions','creator-text'],['🗓 Planer','creator-plan'],
   ['✎ Ideen','creator-ideas'],['🏆 Top-Videos','creator-best']
  ],'v80-jumps v80-creator-jumps');
  nav?.setAttribute('aria-label','Creator Hub Schnellzugriffe');
  const tag=root.querySelector('.section-heading .pill');
  if(tag)tag.textContent='✦ Creator Studio';
 }
 function audienceWorkspace(){
  const root=$('#audience'),cards=$('#audienceCards');
  if(!root||!cards)return;
  const controls=create('div','v80-audience-filter');
  controls.setAttribute('role','group');
  controls.setAttribute('aria-label','Zielgruppenart auswählen');
  const opts=[['all','Alle'],['age','Alter'],['gender','Geschlecht'],['countries','Länder']];
  let selected='all';
  const labels={age:'Alter',gender:'Geschlecht',countries:'Länder'};
  const filter=()=>{
   for(const node of cards.querySelectorAll('.v7-audience-card')){
    const title=node.querySelector('h3')?.textContent||'';
    const visible=selected==='all'||title.includes(labels[selected]);
    node.hidden=!visible;
    node.setAttribute('aria-hidden',String(!visible));
   }
   for(const b of controls.querySelectorAll('button')){
    const active=b.dataset.audienceType===selected;
    b.classList.toggle('active',active);
    b.setAttribute('aria-pressed',String(active));
   }
  };
  for(const [id,label] of opts){
   const b=create('button','v80-filter-button',label);
   b.type='button';b.dataset.audienceType=id;
   b.addEventListener('click',()=>{selected=id;filter()});
   controls.append(b);
  }
  const note=create('p','v80-audience-info',
   'YouTube-Zuschauer, Instagram-Insights und TikTok-Follower sind unterschiedliche Messgruppen. Fehlende Werte bleiben als fehlend markiert.');
  cards.parentElement.insertBefore(controls,cards);
  cards.parentElement.insertBefore(note,cards);
  const observer=new MutationObserver(records=>{
   if(records.some(r=>r.type==='childList'))filter();
  });
  observer.observe(cards,{childList:true});
  filter();
 }
 function experimentsWorkspace(){
  const root=$('#experiments');
  if(!root)return;
  quickRow(root,[
   ['◈ Posting-Rhythmus','experiments-rhythm'],['◎ A/B-Test','experiments-ab'],
   ['✦ Nächster Test','experiments-next']
  ]);
 }
 function systemWorkspace(){
  const root=$('#system');
  if(!root)return;
  quickRow(root,[
   ['● Status','system-status'],['◉ Datenqualität','system-quality'],
   ['↻ Abgleich','system-sync'],['🔐 Gäste','system-guests']
  ]);
  const explanations=root.querySelectorAll('.glass.pane');
  const last=[...explanations].find(x=>x.textContent.includes('So funktioniert die Live-Verbindung'));
  if(last&&!root.querySelector('#v80SystemMethods')){
   const d=create('details','glass v80-system-methods');
   d.id='v80SystemMethods';
   const sum=create('summary','', 'ⓘ Wie das Dashboard seine Daten bekommt');
   last.parentElement.insertBefore(d,last);
   d.append(sum,last);
  }
 }
 function moreWorkspace(){
  const sheet=$('#mobileMoreDrawer .mobile-more-sheet'),title=sheet?.querySelector('.mobile-more-title');
  if(!sheet||!title||sheet.querySelector('[data-v80-action="story"]'))return;
  const txt=create('p','v80-more-desc','Schnell erstellen, analysieren oder dein Dashboard einrichten.');
  title.insertAdjacentElement('afterend',txt);
  const actions=create('div','v80-more-actions');
  actions.append(button('▯ Story erstellen','story'),button('↻ Daten laden','refresh'));
  txt.insertAdjacentElement('afterend',actions);
 }
 const targets={
  'video-search':'#videoSearch',
  'video-top':'#topSevenCard',
  'video-library':'#videoList',
  'creator-calendar':'#creatorCalendar',
  'creator-goals':'#creatorGoals',
  'creator-text':'#v7TextStudio',
  'creator-plan':'#v7Planner',
  'creator-ideas':'#creatorIdeaInput',
  'creator-best':'#creatorHall',
  'experiments-rhythm':'#uploadChart',
  'experiments-ab':'#experimentAb',
  'experiments-next':'#roadmap',
  'system-status':'#connectionCards',
  'system-quality':'#qualityMatrix',
  'system-sync':'#audienceAutoSyncStatus',
  'system-guests':'#guestAccessPanel'
 };
 function action(name){
  if(name==='story'){
   $('#mobileMoreClose')?.click();
   $('#storyModeToggle')?.click();
  }else if(name==='theme'){
   $('#mobileMoreClose')?.click();
   $('#themeStudioToggle')?.click();
  }else if(name==='refresh'){
   $('#mobileMoreClose')?.click();
   $('#refreshBtn')?.click();
  }else if(name==='video-search'){
   focusView('#videoSearch');
   $('#videoSearch')?.focus({preventScroll:true});
  }else if(name==='creator-ideas'){
   focusView('#creatorIdeaForm');
   $('#creatorIdeaInput')?.focus({preventScroll:true});
  }else if(name==='system-sync'&&$('#audienceImportPanel')?.hidden){
   focusView('#connectionCards');
  }else if(name==='system-guests'&&$('#guestAccessPanel')?.hidden){
   focusView('#connectionCards');
  }else if(targets[name])focusView(targets[name]);
 }
 function setup(){
  themeFavorites();storyWorkspace();videoWorkspace();creatorWorkspace();audienceWorkspace();
  experimentsWorkspace();systemWorkspace();moreWorkspace();
  document.addEventListener('click',e=>{
   const b=e.target.closest?.('[data-v80-action]');
   if(b){e.preventDefault();action(b.dataset.v80Action)}
  });
  // Dynamic content appears when its corresponding view is rendered;
  // scroll targets remain stable wrappers even as inner stats are replaced.
  document.documentElement.dataset.v80Ready='true';
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',setup,{once:true});
 else setup();
})();
