/* V8.5 focused analytics tools. No new data source, guesses or tracking. */
(function(){
'use strict';
const $=s=>document.querySelector(s);
const KEY='back2u-dashboard-focus-v850';
function init(){
 const periods=$('.controlbar .period-tabs'),hero=$('#overview .hero-main');
 if(!periods||!hero||$('#v850Focus'))return;
 const focus=document.createElement('button');focus.type='button';focus.id='v850Focus';
 focus.textContent='◈ Fokus';focus.title='Theme-Cover ausblenden und direkt Zahlen ansehen';
 focus.setAttribute('aria-label','Fokusmodus für Kennzahlen umschalten');
 const enabled=()=>document.body.classList.contains('v850-focus');
 function setFocus(on){
  document.body.classList.toggle('v850-focus',on);
  focus.setAttribute('aria-pressed',String(on));
  focus.textContent=on?'◈ Cover':'◈ Fokus';
  focus.title=on?'Theme-Cover wieder anzeigen':'Cover ausblenden und Statistik priorisieren';
  try{localStorage.setItem(KEY,on?'1':'0')}catch(e){}
 }
 try{setFocus(localStorage.getItem(KEY)==='1')}catch(e){setFocus(false)}
 periods.appendChild(focus);
 focus.addEventListener('click',()=>setFocus(!enabled()));
 const copy=document.createElement('button');copy.type='button';copy.id='v850CopySnapshot';
 copy.className='v850-copy';copy.textContent='⧉ Werte kopieren';
 copy.setAttribute('aria-label','Aktuelle Statistik mit Datenbasis als Text kopieren');
 const status=document.createElement('span');status.id='v850CopyStatus';
 status.setAttribute('role','status');status.setAttribute('aria-live','polite');
 status.className='v850-copy-status';
 const foot=hero.querySelector('.hero-bottom')||hero;foot.append(copy,status);
 copy.addEventListener('click',async()=>{
  const label=$('#heroLabel')?.textContent?.trim()||'Gesamtaufrufe';
  const value=$('#heroValue')?.textContent?.trim()||'–';
  const period=$('.period-tabs button.selected[data-days]')?.textContent?.trim()||'Zeitraum nicht angegeben';
  const platform=$('.platform-tabs button.selected')?.textContent?.trim()||'Alle';
  const source=$('#heroFootnote')?.textContent?.trim()||'Datenbasis nicht angegeben';
  const note=$('#heroDelta')?.textContent?.trim()||'';
  const life=$('#lifetimeViewsTotal')?.textContent?.trim()||'–';
  const lines=['BACK2U Creator Dashboard',platform+' · '+period,
   label+': '+value,'All-Time erfasste Videoaufrufe: '+life,
   note?'Hinweis: '+note:'','Datenbasis: '+source,
   'Kopiert: '+new Date().toLocaleString('de-DE')].filter(Boolean);
  try{
   await navigator.clipboard.writeText(lines.join('\n'));
   status.textContent='Kopiert ✓';
  }catch(e){status.textContent='Kopieren im Browser nicht erlaubt';}
 });
 window.BACK2U_FOCUS_MODE={enabled,set:setFocus};
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
else init();
})();