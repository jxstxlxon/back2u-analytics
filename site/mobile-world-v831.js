/* BACK2U V8.3.1 – make the mobile world usable and visible in the header.
 * Presentation-only DOM controls. Reuses the real existing Theme Studio,
 * preset preferences and glass slider. Does not read account/API data. */
(function(){
'use strict';
const select=s=>document.querySelector(s);
function init(){
 const mast=select('.masthead'),stamp=mast?.querySelector('.theme-world-stamp');
 const existingTheme=select('#themeStudioToggle'),glass=mast?.querySelector('.mast-right');
 if(!mast||!stamp||!existingTheme||!glass||stamp.querySelector('.v831-world-actions'))return;
 const actions=document.createElement('div');actions.className='v831-world-actions';
 const look=document.createElement('button');look.id='v831OpenStudio';look.type='button';
 look.textContent='✦ Theme';look.setAttribute('aria-label','Designwelt wechseln');
 const toggle=document.createElement('button');toggle.id='v831GlassToggle';toggle.type='button';
 toggle.textContent='◉ Glas';toggle.setAttribute('aria-label','Glasintensität einstellen');
 glass.id=glass.id||'v831GlassPanel';
 toggle.setAttribute('aria-controls',glass.id);
 toggle.setAttribute('aria-expanded','false');
 actions.append(look,toggle);stamp.append(actions);
 const closeGlass=()=>{
  mast.classList.remove('v831-glass-open');
  toggle.setAttribute('aria-expanded','false');
 };
 look.addEventListener('click',()=>{closeGlass();existingTheme.click()});
 toggle.addEventListener('click',()=>{
  const open=mast.classList.toggle('v831-glass-open');
  toggle.setAttribute('aria-expanded',String(open));
 });
 document.addEventListener('keydown',e=>{
  if(e.key==='Escape'&&mast.classList.contains('v831-glass-open'))closeGlass();
 });
 window.addEventListener('back2u-theme-changed',closeGlass);
 const wide=window.matchMedia?.('(min-width:761px)');
 if(wide?.addEventListener)wide.addEventListener('change',e=>{if(e.matches)closeGlass()});
 document.body.classList.add('v831-mobile-ready');
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
else init();
})();
