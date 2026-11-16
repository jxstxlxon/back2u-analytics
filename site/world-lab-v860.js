/* BACK2U V8.6 — 9 radically different interface architectures.
 * Real DOM data only. Guest-safe device-local visual preferences.
 * Comparison does not apply the target theme until a user explicitly chooses.
 */
(function(){
'use strict';
const THEME_MAP={
 velocity:"n01 n02 n20 n27 n28 ex06 ex19",
 aero:"n22 n23 fa00 fa01 fa02 fa03 fa04 fa05 fa06 fa07 fa08 fa09 fa10 ex04 ex20",
 liminal:"ex05",
 cathedral:"n10 n25 ex07 ex17",
 frost:"n06 n12 n24 n29 ex09 ex11 ex16",
 cosmos:"n15 n16 n17 n21 n30 ex01 ex08 ex12 ex15",
 garden:"n04 n11 n19 ex03 ex10 ex18",
 inferno:"n03 n13 ex02 ex14",
 ocean:"n05 n18 ex13",
};
const archetypes=Object.fromEntries(Object.entries(THEME_MAP)
 .flatMap(([kind,ids])=>ids.split(' ').map(id=>[id,kind])));
const LABELS={
 velocity:'Velocity / Motorsport',aero:'Aero / Aqua',liminal:'Liminal / Backrooms',
 cathedral:'Cathedral / Monument',frost:'Crystal / Ice',
 cosmos:'Cosmos / Aurora',garden:'Organic / Garden',
 inferno:'Inferno / Plasma',ocean:'Ocean / Fluid'
};
const KEY='back2u-world-architect-v860';
const $=sel=>document.querySelector(sel);
const themes=()=>window.BACK2U_THEMES;
const known=new Set(Object.keys(archetypes));
let prefs={},compare=false,target=null,observer=null;
function restore(){
 try{
  const old=JSON.parse(localStorage.getItem(KEY)||'null');
  if(old&&typeof old==='object'&&old.overrides&&typeof old.overrides==='object'){
   for(const [id,k] of Object.entries(old.overrides))
    if(known.has(id)&&(k==='auto'||LABELS[k]))prefs[id]=k;
  }
 }catch(e){}
}
function save(){try{localStorage.setItem(KEY,JSON.stringify({overrides:prefs}))}catch(e){}}
function layout(id){
 const mode=prefs[id]||'auto';return mode==='auto'?archetypes[id]:(LABELS[mode]?mode:archetypes[id]);
}
function update(){
 const id=themes()?.current();
 if(!id||!known.has(id))return;
 document.body.dataset.v860World=layout(id);
 document.body.dataset.v860Theme=id;
 const active=$('#v860Architecture');
 if(active)active.value=prefs[id]||'auto';
 const mini=$('#v860WorldTag');
 if(mini)mini.textContent=LABELS[layout(id)]||'Design World';
 const name=$('#v860WorldLabel');
 if(name)name.textContent=LABELS[layout(id)]||'';
}
function installPulse(){
 const mast=$('.masthead'),primary=mast?.querySelector(':scope > div:first-child');
 if(!primary||$('#v860LivePulse'))return;
 const pulse=document.createElement('div');pulse.id='v860LivePulse';pulse.className='v860-live-pulse';
 pulse.setAttribute('aria-label','Aktuelle Hauptkennzahl');
 pulse.innerHTML='<span class="v860-pulse-kicker">◉ LIVE DATA / '+ 
 'BACK2U</span><small id="v860PulseLabel"></small>'+
 '<strong id="v860PulseValue"></strong><span id="v860PulseRange"></span>';
 const dock=primary.querySelector('.theme-world-stamp');
 primary.insertBefore(pulse,dock);
 const refs=[['#heroLabel','#v860PulseLabel'],['#heroValue','#v860PulseValue'],
  ['#rangeLabel','#v860PulseRange']];
 function paint(){
  for(const [from,to] of refs){
   const value=$(from)?.textContent?.trim()||'–';
   const dest=$(to);if(dest&&dest.textContent!==value)dest.textContent=value;
  }
 }
 paint();
 const mo=new MutationObserver(paint);
 for(const [from] of refs){
  const node=$(from);if(node)mo.observe(node,{subtree:true,childList:true,characterData:true});
 }
}
function renderPreview(el,id){
 const p=themes()?.get(id);if(!p)return;
 el.className='v860-compare-preview theme-option';
 el.dataset.preset=id;el.dataset.previewSource=/^(ex\d\d|n04|n15|n23|n24)$/.test(id)?'photo':'vector';
 el.style.setProperty('--preview-a',p.bg);el.style.setProperty('--preview-b',p.bg2);
 el.style.setProperty('--preview-c',p.accent);
 el.replaceChildren();
 const pic=document.createElement('span');pic.className='theme-option-preview';pic.setAttribute('aria-hidden','true');
 const name=document.createElement('strong');name.textContent=p.name;
 el.append(pic,name);
 if(el.dataset.previewSource==='vector'){
  const art=window.BACK2U_REFERENCE_ART?.(p);
  if(art?.url)el.style.setProperty('--ref-preview','url("'+art.url+'")');
 }else el.style.removeProperty('--ref-preview');
}
function installStudio(){
 const panel=$('#themeStudioPanel'),library=panel?.querySelector('.theme-library'),grid=$('#themeGrid');
 if(!panel||!library||!grid||$('#v860WorldLab'))return;
 const lab=document.createElement('section');lab.id='v860WorldLab';
 lab.className='v860-world-lab';lab.setAttribute('aria-label','World Lab – Theme Architekturen');
 const title=document.createElement('div');title.className='v860-lab-title';
 title.innerHTML='<span>BACK2U / WORLD LAB</span><h3>Eine neue Welt. Nicht nur eine neue Farbe.</h3>';
 const actions=document.createElement('div');actions.className='v860-lab-actions';
 const select=document.createElement('select');select.id='v860Architecture';
 select.setAttribute('aria-label','Design-Architektur der aktuellen Theme-Welt');
 for(const [k,label] of [['auto','Original-Architektur'],...Object.entries(LABELS)]){
  const option=document.createElement('option');option.value=k;option.textContent=label;select.append(option);
 }
 const compareBtn=document.createElement('button');compareBtn.type='button';
 compareBtn.id='v860CompareToggle';compareBtn.textContent='◫ Welten vergleichen';
 compareBtn.setAttribute('aria-pressed','false');
 actions.append(select,compareBtn);lab.append(title,actions);
 const desc=document.createElement('p');desc.className='v860-world-description';
 desc.innerHTML='Aktiver Stil: <strong id="v860WorldLabel"></strong>. '+ 
 'Du kannst für jedes Theme einen eigenen Aufbau speichern.';
 lab.append(desc);
 const comparePanel=document.createElement('div');comparePanel.className='v860-compare-panel';
 comparePanel.id='v860ComparePanel';comparePanel.hidden=true;
 const slots=document.createElement('div');slots.className='v860-compare-slots';
 const a=document.createElement('div'),other=document.createElement('div');
 a.id='v860CompareCurrent';other.id='v860CompareOther';
 slots.append(a,other);
 const line=document.createElement('p');line.id='v860CompareInstructions';
 line.textContent='Wähle unten eine Theme-Karte. Das aktuelle Design bleibt unverändert, bis du es übernimmst.';
 const accept=document.createElement('button');accept.type='button';accept.id='v860CompareUse';
 accept.textContent='Dieses Theme übernehmen';accept.disabled=true;
 comparePanel.append(line,slots,accept);
 lab.append(comparePanel);
 library.insertBefore(lab,library.querySelector('#v850ThemeTools')||library.querySelector('.theme-search-row'));
 select.addEventListener('change',()=>{
  const id=themes().current(),v=select.value;
  if(!known.has(id)||!(v==='auto'||LABELS[v]))return;
  if(v==='auto')delete prefs[id];else prefs[id]=v;
  save();update();
 });
 function comparison(){
  renderPreview(a,themes().current());
  if(target&&known.has(target))renderPreview(other,target);
  else{
   other.replaceChildren();
   const blank=document.createElement('span');blank.textContent='ZWEITE WELT WÄHLEN';
   blank.className='v860-comparison-placeholder';other.append(blank);
  }
  accept.disabled=!target;
  grid.querySelectorAll('.theme-option').forEach(card=>card.dataset.comparison=card.dataset.preset===target?'true':'false');
 }
 function setCompare(on){
  compare=on;compareBtn.setAttribute('aria-pressed',String(on));
  compareBtn.textContent=on?'✕ Vergleich schließen':'◫ Welten vergleichen';
  comparePanel.hidden=!on;
  grid.setAttribute('data-v860-compare',String(on));
  if(!on)target=null;
  if(on)comparison();
  else grid.querySelectorAll('.theme-option').forEach(card=>delete card.dataset.comparison);
 }
 compareBtn.addEventListener('click',()=>setCompare(!compare));
 // Capture before existing per-card click handlers. Do not mutate live theme.
 grid.addEventListener('click',event=>{
  if(!compare)return;
  const card=event.target.closest('button.theme-option[data-preset]');
  if(!card||!grid.contains(card))return;
  event.preventDefault();event.stopPropagation();event.stopImmediatePropagation();
  target=card.dataset.preset;
  comparison();
 },true);
 accept.addEventListener('click',()=>{
  if(!target||!known.has(target))return;
  themes().use(target);setCompare(false);update();
 });
 const gridMo=new MutationObserver(()=>{
  if(compare){
   grid.querySelectorAll('.theme-option').forEach(card=>{
    card.dataset.comparison=card.dataset.preset===target?'true':'false';
   });
  }
 });
 gridMo.observe(grid,{childList:true});
 window.addEventListener('back2u-theme-changed',()=>{update();if(compare)comparison()});
 update();
 window.BACK2U_WORLD_LAB={
  world:id=>layout(id||themes().current()),
  families:()=>({...archetypes}),
  isComparing:()=>compare,
  comparison:()=>target
 };
}
function init(){
 if(!themes())return;
 restore();update();installPulse();installStudio();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
else init();
})();