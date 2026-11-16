/* BACK2U V8.4 – cinematic mobile world deck, not sample numbers.
 * Extends the existing Theme Studio with previous/next controls. */
(function(){
'use strict';
function init(){
 const mast=document.querySelector('.masthead');
 const stamp=mast?.querySelector('.theme-world-stamp');
 const actions=stamp?.querySelector('.v831-world-actions');
 const themes=window.BACK2U_THEMES;
 if(!mast||!stamp||!actions||!themes||stamp.querySelector('.v840-world-index'))return;
 const list=themes.list();
 if(!Array.isArray(list)||list.length!==56)return;
 const idx=document.createElement('span');
 idx.className='v840-world-index';
 idx.setAttribute('aria-live','polite');
 idx.setAttribute('aria-label','Designwelt-Position');
 const prev=document.createElement('button');
 prev.type='button';prev.id='v840PrevWorld';prev.className='v840-world-pager';
 prev.textContent='‹';prev.setAttribute('aria-label','Vorherige Designwelt');
 const next=document.createElement('button');
 next.type='button';next.id='v840NextWorld';next.className='v840-world-pager';
 next.textContent='›';next.setAttribute('aria-label','Nächste Designwelt');
 stamp.insertBefore(idx,actions);
 actions.insertBefore(prev,actions.firstChild);
 actions.append(next);
 const currentIndex=()=>list.findIndex(p=>p.id===themes.current());
 function refresh(){
  const i=currentIndex();
  idx.textContent=i<0?'–':String(i+1).padStart(2,'0')+' / '+String(list.length).padStart(2,'0');
 }
 function turn(dir){
  const i=currentIndex();
  if(i<0)return;
  themes.use(list[(i+dir+list.length)%list.length].id);
  refresh();
 }
 prev.addEventListener('click',()=>turn(-1));
 next.addEventListener('click',()=>turn(1));
 const story=document.getElementById('storyModeToggle');
 story?.setAttribute('aria-label','Story-Modus öffnen');
 const studio=document.getElementById('themeStudioToggle');
 studio?.setAttribute('aria-label','Theme-Auswahl öffnen');
 window.addEventListener('back2u-theme-changed',refresh);
 refresh();
 document.body.classList.add('v840-cinematic-ready');
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
else init();
})();
