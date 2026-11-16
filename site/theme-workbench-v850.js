/* V8.5 Theme Studio: real image spotlight, favourites, recent themes and shuffle.
   All user preferences are device-local. Nothing written to analytics or APIs. */
(function(){
'use strict';
const $=s=>document.querySelector(s);
const KEY='back2u-theme-workbench-v850';
let state={favorites:[],recent:[],mode:'all'};
function safeRead(){
 try{
  const raw=JSON.parse(localStorage.getItem(KEY)||'null');
  const ids=new Set(window.BACK2U_THEMES.list().map(x=>x.id));
  if(raw&&typeof raw==='object'){
   state.favorites=Array.isArray(raw.favorites)?raw.favorites.filter(x=>ids.has(x)).slice(0,56):[];
   state.recent=Array.isArray(raw.recent)?raw.recent.filter(x=>ids.has(x)).slice(0,8):[];
  }
 }catch(e){}
}
function save(){try{localStorage.setItem(KEY,JSON.stringify({favorites:state.favorites,recent:state.recent}))}catch(e){}}
const themes=()=>window.BACK2U_THEMES;
const current=()=>themes().current();
let changing=false;
function init(){
 const panel=$('#themeStudioPanel'),grid=$('#themeGrid'),lib=panel?.querySelector('.theme-library');
 if(!panel||!grid||!lib||!themes()||$('#v850ThemeTools'))return;
 safeRead();
 const feature=document.createElement('section');feature.className='v850-spotlight';
 feature.setAttribute('aria-label','Aktives Theme in groß');
 feature.innerHTML='<div class="v850-feature-art theme-option" aria-hidden="true"><span class="theme-option-preview"></span></div>'+
  '<div class="v850-feature-caption"><div class="v850-feature-title"><small>DEINE DESIGNWELT</small><strong id="v850FeatureName"></strong><span id="v850FeatureFamily"></span></div>'+
  '<button type="button" id="v850Star" aria-label="Aktives Theme als Favorit markieren" aria-pressed="false">☆ Merken</button></div>';
 lib.insertBefore(feature,lib.firstChild);
 const tools=document.createElement('div');tools.id='v850ThemeTools';tools.className='v850-theme-tools';
 tools.setAttribute('role','group');tools.setAttribute('aria-label','Theme-Kurzaktionen');
 tools.innerHTML='<button type="button" data-v850-mode="all" aria-pressed="true">Alle</button>'+
  '<button type="button" data-v850-mode="favorites" aria-pressed="false">★ Favoriten <span id="v850FavoriteCount">0</span></button>'+
  '<button type="button" data-v850-mode="recent" aria-pressed="false">↺ Zuletzt</button>'+
  '<button type="button" id="v850Shuffle" title="Zufälliges Theme auswählen">⤨ Zufall</button>';
 lib.insertBefore(tools,$('.theme-search-row').nextSibling);
 const empty=document.createElement('p');empty.className='v850-empty';empty.hidden=true;
 empty.textContent='Hier ist noch nichts gespeichert. Markiere ein Theme mit ☆ Merken.';
 grid.parentElement.insertBefore(empty,grid.nextSibling);
 const card=feature.querySelector('.v850-feature-art');
 const art=card.querySelector('.theme-option-preview');
 function preview(){
  const p=themes().get(current());if(!p)return;
  card.dataset.preset=p.id;
  card.style.setProperty('--preview-a',p.bg);card.style.setProperty('--preview-b',p.bg2);
  card.style.setProperty('--preview-c',p.accent);
  if(!/^(ex\d\d|n04|n15|n23|n24)$/.test(p.id)){
   const renderer=window.BACK2U_REFERENCE_ART;
   if(typeof renderer==='function'){const v=renderer(p);if(v?.url)card.style.setProperty('--ref-preview','url("'+v.url+'")')}
  }else card.style.removeProperty('--ref-preview');
  $('#v850FeatureName').textContent=p.name.replace(/^[0-9]+ · /,'');
  $('#v850FeatureFamily').textContent=p.family==='aero'?'FRUTIGER AERO':p.family==='light'?'LIGHT GLASS':p.id.startsWith('ex')?'EXTREME':'DARK GLASS';
  const selected=state.favorites.includes(p.id);
  const star=$('#v850Star');star.setAttribute('aria-pressed',String(selected));
  star.textContent=selected?'★ Gespeichert':'☆ Merken';
  star.setAttribute('aria-label',selected?'Aktives Theme aus Favoriten entfernen':'Aktives Theme als Favorit markieren');
 }
 function filter(){
  const ids=state.mode==='favorites'?state.favorites:state.mode==='recent'?state.recent:null;
  const cards=Array.from(grid.querySelectorAll('.theme-option'));
  cards.forEach(button=>{
   const id=button.dataset.preset;
   button.hidden=!!ids&&!ids.includes(id);
   button.dataset.favorite=state.favorites.includes(id)?'true':'false';
  });
  const count=cards.filter(x=>!x.hidden).length;
  $('#v850FavoriteCount').textContent=String(state.favorites.length);
  empty.hidden=count>0||state.mode==='all';
  tools.querySelectorAll('[data-v850-mode]').forEach(btn=>{
   btn.setAttribute('aria-pressed',String(btn.dataset.v850Mode===state.mode));
  });
 }
 function note(id){
  if(changing)return;
  state.recent=[id,...state.recent.filter(x=>x!==id)].slice(0,8);
  save();
  if(!panel.hidden){preview();filter();}
 }
 function use(id){if(!themes().get(id))return;themes().use(id);preview();}
 $('#v850Star').addEventListener('click',()=>{
  const id=current(),idx=state.favorites.indexOf(id);
  if(idx===-1)state.favorites.unshift(id);else state.favorites.splice(idx,1);
  save();preview();filter();
 });
 tools.addEventListener('click',e=>{
  const btn=e.target.closest('button');if(!btn)return;
  if(btn.dataset.v850Mode){
   state.mode=btn.dataset.v850Mode;
   if(state.mode!=='all'){
    const all=panel.querySelector('.theme-tabs [data-family="all"]');
    if(all&&!all.classList.contains('selected'))all.click();
    const search=$('#themeSearch');
    if(search&&search.value){search.value='';search.dispatchEvent(new Event('input',{bubbles:true}))}
   }
   filter();
  }else if(btn.id==='v850Shuffle'){
   const all=themes().list();const candidates=all.filter(p=>p.id!==current());
   if(candidates.length){
    const rand=new Uint32Array(1);
    if(window.crypto?.getRandomValues)window.crypto.getRandomValues(rand);
    else rand[0]=Math.floor(Math.random()*0xffffffff);
    use(candidates[rand[0]%candidates.length].id);
   }
  }
 });
 const observer=new MutationObserver(()=>filter());
 observer.observe(grid,{childList:true});
 window.addEventListener('back2u-theme-changed',e=>{if(e.detail?.id)note(e.detail.id)});
 note(current());preview();filter();
 window.BACK2U_THEME_WORKBENCH={
  favorites:()=>[...state.favorites],
  recent:()=>[...state.recent],
  mode:()=>state.mode
 };
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
else init();
})();