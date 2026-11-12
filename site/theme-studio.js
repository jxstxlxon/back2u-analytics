/* BACK2U Theme Studio — per-preset visual preferences, no API changes */
(function(){
'use strict';
const rows=[
'n01|01 · Cobalt Pulse|dark|#06102b|#18376e|#142e59|#2fbbff|#6979ff',
'n02|02 · Titanium Mirage|dark|#171c27|#343f4a|#35434c|#e5d2b5|#a7c8d8',
'n03|03 · Solar Ember|dark|#290e0e|#70301a|#4b2522|#ffa23c|#f25d6d',
'n04|04 · Emerald Luxe|dark|#041a13|#14513a|#16483b|#35eba0|#79d6b7',
'n05|05 · Cobalt Wave|dark|#061630|#144583|#184979|#338bff|#49d7f7',
'n06|06 · Emerald Crystal|dark|#08241e|#105e49|#1d5d4c|#26e9b4|#a1e8ce',
'n10|10 · Prism Noir|dark|#18171f|#3d3946|#383642|#b4a2ec|#d4d0e1',
'n11|11 · Mint Aurora|dark|#042623|#176861|#1c625b|#37eed1|#7bf2e1',
'n12|12 · Arctic Glass|light|#deeffc|#abcee9|#e8f8ff|#398be4|#5bcce9',
'n13|13 · Molten Rose Glass|dark|#2b131c|#77444b|#693f4a|#f9a391|#e86bb0',
'n15|15 · Amethyst Ice|dark|#20143a|#514283|#564780|#b596ff|#88a4ff',
'n16|16 · Aurora Spectrum|dark|#061833|#243b63|#2e3e62|#3cdcea|#da74ea',
'n17|17 · Prismatic Violet|dark|#101336|#313079|#3d3879|#b28aff|#6aafff',
'n18|18 · Ocean Emerald|dark|#061f28|#135c59|#1e5860|#39dfdf|#60dca3',
'n19|19 · Emerald Pulse|dark|#091e16|#3b5e29|#335840|#92f74e|#41dbad',
'n20|20 · Cyber Aurora|dark|#071226|#343164|#2e3e61|#44ddf7|#d166f8',
'n21|21 · Aurora Cyan Violet|dark|#0b1129|#2f2b5b|#2d4167|#2ee8ef|#ad8cff',
'n22|22 · Pearl Horizon|light|#e9e9f8|#c8c9ee|#f0eafa|#8677fa|#6ed3ef',
'n23|23 · Sunset Pearl|light|#f5d4d0|#e9a19e|#f7d9d5|#ee8280|#f5bd7f',
'n24|24 · Ocean Crystal|dark|#071d36|#1b5486|#235a85|#49bdff|#32e5d9',
'n25|25 · Obsidian Prism|dark|#080c16|#293047|#293246|#9b92ff|#63cedf',
'n27|27 · Titanium Midnight|dark|#101920|#33454a|#2c3d42|#9dd2d6|#d1cfbd',
'n28|28 · Ocean Circuit|dark|#041d28|#115862|#195969|#37e3df|#5abaff',
'n29|29 · Crystal Frost|light|#dfeeff|#c2ceee|#e3effd|#6c9df8|#b194ee',
'n30|30 · Holographic Pearl|dark|#1d1734|#4e437a|#4e467a|#bb96ff|#72ddec',
'fa00|Frutiger Aero · Original|aero|#8bdefb|#26a6d7|#b6eef7|#32c5ea|#4ee6a9',
'fa01|Ocean Breeze|aero|#83d9f8|#159ed2|#abedfd|#0cbce9|#38e2a1',
'fa02|Tropical Aurora|aero|#8be9ee|#1dbfbf|#b1f2e9|#22ccbd|#b8ed42',
'fa03|Crystal Meadow|aero|#c4f3ef|#93d6ed|#e6f8fb|#2eb8dd|#8fe77e',
'fa04|Rainbow Aqua|aero|#b9e6f5|#77c2e1|#e5e7fa|#797ff7|#ef91d2',
'fa05|Azure Orbital|aero|#66c8f6|#0a89c8|#a9e5fb|#269cf2|#42dfe2',
'fa06|Citrus Wave|aero|#9cebdc|#1bb8c3|#cbf8e5|#3be3c2|#c7f146',
'fa07|Pearl Aqua|aero|#e1f6fb|#b3deec|#effcfc|#23add7|#8be6bc',
'fa08|Sky Garden|aero|#a7def5|#43b6d5|#b7eeea|#48cae2|#74ec83',
'fa09|Lagoon Prism|aero|#59bee6|#0a8bac|#8bd9f0|#23bee2|#48e7b1',
'fa10|Fresh Horizon|aero|#8addf6|#32b8d6|#b1f1f1|#22c3ea|#6ce7c6'
];
const presets=rows.map(s=>{const a=s.split('|');return {id:a[0],name:a[1],family:a[2],bg:a[3],bg2:a[4],card:a[5],accent:a[6],secondary:a[7],light:a[2]!=='dark'}});
const byId=Object.fromEntries(presets.map(p=>[p.id,p]));
const key='back2u-theme-studio-v1';
let state={id:'n01',edits:{}};
try{let old=JSON.parse(localStorage.getItem(key)||'null');if(old&&byId[old.id]){state.id=old.id;if(old.edits&&typeof old.edits==='object'&&!Array.isArray(old.edits))state.edits=old.edits}}catch(e){}
const defaults={tintStrength:14,glow:55,blur:27,sheen:56,radius:25,saturation:130,chartContrast:78,backgroundIntensity:76,outlineStrength:55};
const ranges={tintStrength:[0,80],glow:[0,100],blur:[0,64],sheen:[0,100],radius:[12,42],saturation:[80,180],chartContrast:[20,100],backgroundIntensity:[0,100],outlineStrength:[0,100]};
let category='all';
const el=id=>document.getElementById(id);
const color=(c,d)=>typeof c==='string'&&/^#[\da-f]{6}$/i.test(c)?c:d;
const rgb=x=>{x=color(x,'#000000');return [1,3,5].map(n=>parseInt(x.slice(n,n+2),16)).join(',')};
function luminance(hex){
 let a=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255).map(v=>v<=.04045?v/12.92:Math.pow((v+.055)/1.055,2.4));
 return .2126*a[0]+.7152*a[1]+.0722*a[2];
}
function colorHue(hex){
 let r=parseInt(hex.slice(1,3),16)/255,g=parseInt(hex.slice(3,5),16)/255,b=parseInt(hex.slice(5,7),16)/255;
 let max=Math.max(r,g,b),min=Math.min(r,g,b),delta=max-min;if(!delta)return 206;
 let h=max===r?((g-b)/delta)%6:max===g?(b-r)/delta+2:(r-g)/delta+4;
 return ((h*60)+360)%360;
}
function adaptiveType(p,v){
 const aero=p.family==='aero',pearl=p.light,metal=['n02','n10','n25','n27'].includes(p.id);
 return {
  fontUI:aero?'"Trebuchet MS","Segoe UI",Verdana,sans-serif':pearl?'"Aptos","Segoe UI Variable Text","Segoe UI",Arial,sans-serif':'"Segoe UI Variable Text","Segoe UI",-apple-system,BlinkMacSystemFont,sans-serif',
  fontDisplay:aero?'"Trebuchet MS","Arial Rounded MT Bold","Segoe UI",sans-serif':metal?'"Arial Narrow","Segoe UI Variable Display","Segoe UI",sans-serif':pearl?'"Aptos Display","Segoe UI Variable Display","Segoe UI",sans-serif':'"Segoe UI Variable Display",-apple-system,BlinkMacSystemFont,sans-serif',
  text:p.light?'#102c43':'#f5f8ff',
  secondary:p.light?'#2e526c':'#c3d5e9',
  label:p.light?'#1f4661':'#d6e9ff',
  neutral:p.light?'#244b65':'#b6d0e8',
  onAccent:luminance(v.accent)>.48?'#132a3f':'#ffffff'
 };
}
const clamp=(v,a,b,def)=>{v=Number(v);return Number.isFinite(v)?Math.min(b,Math.max(a,v)):def};
const save=()=>{try{localStorage.setItem(key,JSON.stringify(state))}catch(e){}};
function settings(){
 let p=byId[state.id],o=state.edits[state.id]||{},v={};
 for(let k of Object.keys(defaults)){let min=ranges[k][0],max=ranges[k][1];v[k]=clamp(o[k],min,max,defaults[k])}
 v.accent=color(o.accent,p.accent);v.secondary=color(o.secondary,p.secondary);v.tint=color(o.tint,p.accent);
 v.bgmode=['aurora','soft','quiet','bubbles'].includes(o.bgmode)?o.bgmode:(p.family==='aero'?'bubbles':'aurora');
 v.layout=['auto','sidebar','wide'].includes(o.layout)?o.layout:'auto';
 v.finish=['original','gem','chrome','frost','iridescent','spectral','obsidian','sunset','neon'].includes(o.finish)?o.finish:'original';
 v.density=o.density==='compact'?'compact':'normal';
 v.typography=['original','modern','tech','aero','elegant','glass','geometric'].includes(o.typography)?o.typography:'original';
 v.aeroCursor=['auto','aqua','orb','crystal'].includes(o.aeroCursor)?o.aeroCursor:'auto';
 v.readability=['auto','strong'].includes(o.readability)?o.readability:'auto';
 v.chartMode=['line','area','bar'].includes(o.chartMode)?o.chartMode:'line';
 v.performance=o.performance==='full'?'full':'smooth';
 v.motion=o.motion!==false;
 return v;
}
function setvar(k,v){document.documentElement.style.setProperty(k,String(v))}
function apply(){
 let p=byId[state.id],v=settings(),glass=el('glassSlider');
 let strength=glass?clamp(glass.value,0,100,48):48,alpha=p.light?.45+strength*.0039:.22+strength*.0056;
 const artEngine=window.BACK2U_REFERENCE_ART;
 const themeArt=typeof artEngine==='function'?artEngine({...p,accent:v.accent,secondary:v.secondary}):null;
 if(themeArt){
  document.body.dataset.referenceLayout=v.layout==='auto'?themeArt.layout:v.layout;
  document.body.dataset.themeFinish=v.finish==='original'?themeArt.finish:v.finish;
  document.body.dataset.themeMotif=themeArt.type;
  document.body.dataset.themeArtwork='on';
  setvar('--t-scene-url','url("'+themeArt.url+'")');
 }
 document.body.dataset.themeTone=p.light?'light':'dark';
 document.body.dataset.themeId=p.id;
 document.body.dataset.themeFamily=p.family;
 document.body.dataset.themeBackground=v.bgmode;
 document.body.dataset.performance=v.performance;
 document.body.classList.toggle('t-dense',v.density==='compact');
 document.body.classList.toggle('t-still',!v.motion);
 const cursorMode=p.family==='aero'?v.aeroCursor:'auto';
 document.body.dataset.aeroCursor=cursorMode;
 if(cursorMode!=='auto'){
  const icon=cursorMode==='aqua'
   ?'<path d="M4 2L4 28L11 20L17 30L23 27L17 16L29 15Z" fill="#f8ffff" stroke="#0aa7d5" stroke-width="2.2"/><path d="M5 4L6 22L12 15L25 14Z" fill="#81e5ff" opacity=".65"/>'
   :cursorMode==='orb'
   ?'<circle cx="14" cy="14" r="11" fill="#75dcfa" fill-opacity=".72" stroke="#fff" stroke-width="3"/><circle cx="10" cy="9" r="4" fill="#fff" opacity=".85"/><circle cx="14" cy="14" r="6" fill="none" stroke="#2cb5df" stroke-width="1.8"/>'
   :'<path d="M4 2L4 29L12 21L17 29L22 26L17 17L29 16Z" fill="#d5f8ff" stroke="#8aa8ff" stroke-width="2.2"/><path d="M4 2L13 13L4 29" fill="none" stroke="#fff" stroke-width="1.8"/>';
  const image='<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 32 32">'+icon+'</svg>';
  const hotspot=cursorMode==='orb'?'10 10':'3 2';
  setvar('--aero-cursor','url("data:image/svg+xml,'+encodeURIComponent(image)+'") '+hotspot+', auto');
 }else setvar('--aero-cursor','auto');
 const type=adaptiveType(p,v),mainHue=colorHue(v.accent);
 const manualFonts={
  modern:['"Segoe UI Variable Text","Segoe UI",sans-serif','"Segoe UI Variable Display","Segoe UI",sans-serif'],
  tech:['"Arial Narrow","Segoe UI",sans-serif','"Arial Narrow","Segoe UI Variable Display",sans-serif'],
  aero:['"Trebuchet MS",Verdana,sans-serif','"Trebuchet MS","Arial Rounded MT Bold",sans-serif'],
  elegant:['"Aptos","Segoe UI",sans-serif','"Aptos Display","Segoe UI Variable Display",sans-serif'],
  glass:['"Helvetica Neue","Segoe UI",Arial,sans-serif','"Helvetica Neue","Segoe UI",Arial,sans-serif'],
  geometric:['"Century Gothic","Aptos","Trebuchet MS",sans-serif','"Century Gothic","Aptos Display","Trebuchet MS",sans-serif']
 };
 if(manualFonts[v.typography]){type.fontUI=manualFonts[v.typography][0];type.fontDisplay=manualFonts[v.typography][1]}
 if(v.readability==='strong'){
  type.secondary=p.light?'#183b55':'#e3f0ff';
  type.label=p.light?'#17334b':'#f3faff';
 }
 setvar('--t-font-ui',type.fontUI);setvar('--t-font-display',type.fontDisplay);
 setvar('--t-ink-strong',type.text);setvar('--t-ink-muted',type.secondary);setvar('--t-ink-label',type.label);
 setvar('--t-on-accent',type.onAccent);
 setvar('--t-accent-readable','hsl('+mainHue+' 79% '+(p.light?'31':'75')+'%)');
 setvar('--t-secondary-readable','hsl('+colorHue(v.secondary)+' 76% '+(p.light?'34':'77')+'%)');
 setvar('--t-chart-axis',type.neutral);setvar('--t-chart-grid',p.light?'rgba(33,72,100,.42)':'rgba(193,216,245,.25)');
 ['yt','ig','tt'].forEach((k,i)=>{
  let hue=(mainHue+[0,112,219][i])%360;
  let l=p.light?([33,35,32][i]):([68,73,71][i]);
  setvar('--chart-'+k,'hsl('+hue+' 78% '+l+'%)');
 });
 setvar('--t-bg',p.bg);setvar('--t-bg2',p.bg2);setvar('--t-card',rgb(p.card));
 setvar('--t-accent',v.accent);setvar('--t-accent-rgb',rgb(v.accent));
 setvar('--t-secondary',v.secondary);setvar('--t-secondary-rgb',rgb(v.secondary));
 setvar('--t-tint',rgb(v.tint));setvar('--t-tint-alpha',(v.tintStrength/100).toFixed(2));
 setvar('--t-opacity',Math.min(.94,alpha).toFixed(3));setvar('--t-blur',v.blur+'px');
 setvar('--t-glow',(v.glow/100).toFixed(2));setvar('--t-sheen',(v.sheen/100).toFixed(2));
 setvar('--t-edge-alpha',(.15+v.sheen*.0034).toFixed(3));setvar('--t-top-alpha',(.27+v.sheen*.004).toFixed(3));setvar('--t-reflect-alpha',(.10+v.sheen*.0028).toFixed(3));
 setvar('--t-shadow-size',(v.glow*.29).toFixed(1)+'px');setvar('--t-shadow-alpha',(v.glow*.0018).toFixed(3));
 setvar('--t-radius',v.radius+'px');setvar('--t-saturation',v.saturation+'%');setvar('--t-chart-contrast',(v.chartContrast/100).toFixed(2));
 setvar('--t-background-veil',((100-v.backgroundIntensity)/100*.72).toFixed(3));
 setvar('--t-outline-alpha',(.17+.0063*v.outlineStrength).toFixed(3));
 setvar('--ink',p.light?'#102c43':'#edf6ff');setvar('--muted',p.light?'#33556f':'#b4c7da');setvar('--soft',p.light?'#556b81':'#8da9c3');
 setvar('--t-label',p.light?'#21435e':'#d9ecfa');setvar('--t-grid',p.light?'#426c93':'#95bde8');
 document.documentElement.style.colorScheme=p.light?'light':'dark';
 const label=el('themeCurrentName');if(label)label.textContent=p.name;
 const trigger=el('themeStudioToggle');if(trigger)trigger.title='Theme: '+p.name;
 refreshEditor();
 window.dispatchEvent(new CustomEvent('back2u-theme-changed',{detail:{id:p.id,accent:v.accent,secondary:v.secondary,light:p.light}}));
}
function edit(k,value){
 let o=state.edits[state.id]||{},p=byId[state.id];
 if(k in ranges)o[k]=clamp(value,...ranges[k],defaults[k]);
 else if(['accent','secondary','tint'].includes(k))o[k]=color(value,p.accent);
 else if(k==='bgmode')o[k]=['aurora','soft','quiet','bubbles'].includes(value)?value:'aurora';
 else if(k==='density')o[k]=value==='compact'?'compact':'normal';
 else if(k==='typography')o[k]=['original','modern','tech','aero','elegant','glass','geometric'].includes(value)?value:'original';
 else if(k==='aeroCursor')o[k]=['auto','aqua','orb','crystal'].includes(value)?value:'auto';
 else if(k==='readability')o[k]=['auto','strong'].includes(value)?value:'auto';
 else if(k==='chartMode')o[k]=['line','area','bar'].includes(value)?value:'line';
 else if(k==='performance')o[k]=value==='full'?'full':'smooth';
 else if(k==='layout')o[k]=['auto','sidebar','wide'].includes(value)?value:'auto';
 else if(k==='finish')o[k]=['original','gem','chrome','frost','iridescent','spectral','obsidian','sunset','neon'].includes(value)?value:'original';
 else if(k==='motion')o[k]=!!value;
 else return;
 state.edits[state.id]=o;save();apply();
}
function refreshEditor(){
 const v=settings();
 ['accent','secondary','tint','bgmode','density','layout','finish','typography','readability','chartMode','aeroCursor','performance'].concat(Object.keys(defaults)).forEach(k=>{
  if(el('theme_'+k))el('theme_'+k).value=v[k];
  if(el('theme_out_'+k))el('theme_out_'+k).textContent=v[k]+(['blur','radius'].includes(k)?' px':'%');
 });
 if(el('theme_motion'))el('theme_motion').checked=v.motion;
 if(el('themeAeroCursorRow'))el('themeAeroCursorRow').hidden=byId[state.id].family!=='aero';
 if(el('themeStatus'))el('themeStatus').textContent='Aktuell: '+byId[state.id].name+' · auf diesem Gerät gespeichert';
 document.querySelectorAll('.theme-option').forEach(b=>{const active=b.dataset.preset===state.id;b.classList.toggle('selected',active);b.setAttribute('aria-pressed',String(active))});
}
function renderGrid(){
 const grid=el('themeGrid');if(!grid)return;grid.replaceChildren();
 const query=(el('themeSearch')?.value||'').toLowerCase().trim();
 presets.filter(p=>(category==='all'||p.family===category)&&p.name.toLowerCase().includes(query)).forEach(p=>{
  const b=document.createElement('button');b.type='button';b.className='theme-option';b.dataset.preset=p.id;
  b.style.setProperty('--preview-a',p.bg);b.style.setProperty('--preview-b',p.bg2);b.style.setProperty('--preview-c',p.accent);
  if(typeof window.BACK2U_REFERENCE_ART==='function'){
   b.style.setProperty('--ref-preview','url("'+window.BACK2U_REFERENCE_ART(p).url+'")');
  }
  const art=document.createElement('span');art.className='theme-option-preview';art.setAttribute('aria-hidden','true');
  const name=document.createElement('strong');name.textContent=p.name;
  const desc=document.createElement('small');desc.textContent=p.family==='aero'?'Frutiger Aero':p.family==='light'?'Hell':'Dunkel';
  b.append(art,name,desc);
  b.addEventListener('click',()=>{state.id=p.id;save();apply();renderGrid()});
  grid.appendChild(b);
 });
 if(el('themeNone'))el('themeNone').hidden=grid.childElementCount!==0;
 refreshEditor();
}
const rangeControl=(key,label,min,max)=>'<label class="theme-slider">'+label+' <output id="theme_out_'+key+'"></output><input id="theme_'+key+'" data-setting="'+key+'" type="range" min="'+min+'" max="'+max+'"></label>';
const colorControl=(key,label)=>'<label class="theme-color">'+label+'<input id="theme_'+key+'" data-setting="'+key+'" type="color"></label>';
function setup(){
 const panel=document.createElement('div');panel.id='themeStudioPanel';panel.hidden=true;
 const controls=Object.keys(ranges).map(k=>rangeControl(k,({tintStrength:'Farb-Layer',glow:'Glow & Licht',blur:'Unschärfe',sheen:'Kantenglanz',radius:'Eckenradius',saturation:'Farbsättigung',chartContrast:'Diagrammkontrast',backgroundIntensity:'Hintergrundmotiv',outlineStrength:'Rahmenintensität'})[k],ranges[k][0],ranges[k][1])).join('');
 panel.innerHTML=[
 '<div id="themeBackdrop" class="theme-backdrop"></div>',
 '<section class="theme-dialog glass" role="dialog" aria-modal="true" aria-labelledby="themeDialogTitle">',
 '<header class="theme-dialog-head"><div><small>BACK2U / DESIGN SYSTEM</small><h2 id="themeDialogTitle">Liquid Glass Studio</h2><p>36 Themes · Farben, Licht und Glas individuell einstellen</p></div><button id="themeClose" type="button" aria-label="Schließen">✕</button></header>',
 '<div class="theme-dialog-body"><section class="theme-library"><div class="theme-search-row"><input id="themeSearch" type="search" placeholder="Theme suchen …" aria-label="Theme suchen"><span>36 Presets</span></div>',
 '<div class="theme-tabs" role="group" aria-label="Kategorien"><button data-family="all" class="selected">Alle</button><button data-family="dark">Dunkel</button><button data-family="light">Hell</button><button data-family="aero">Frutiger Aero</button></div>',
 '<div id="themeGrid" class="theme-grid"></div><p id="themeNone" hidden>Keine Themes gefunden.</p></section>',
 '<section class="theme-adjust"><h3>Dein Theme</h3><p id="themeCurrentName"></p>',
 '<div class="theme-colors">',colorControl('accent','Hauptfarbe'),colorControl('secondary','Zweitfarbe'),colorControl('tint','Farbüberlagerung'),'</div>',
 controls,
 '<label class="theme-choice">Hintergrund<select id="theme_bgmode" data-setting="bgmode"><option value="aurora">Aurora</option><option value="soft">Weicher Verlauf</option><option value="quiet">Ruhig</option><option value="bubbles">Glass Bubbles</option></select></label>',
 '<label class="theme-choice">Bild-Layout<select id="theme_layout" data-setting="layout"><option value="auto">Wie die Vorlage</option><option value="sidebar">Leuchtende Seitenleiste</option><option value="wide">Breites Dashboard</option></select></label>',
 '<label class="theme-choice">Glasoberfläche<select id="theme_finish" data-setting="finish"><option value="original">Wie die Vorlage</option><option value="neon">Neon Liquid</option><option value="gem">Crystal Gem</option><option value="chrome">Chrome</option><option value="frost">Frosted</option><option value="iridescent">Iridescent</option><option value="spectral">Holographic</option><option value="obsidian">Obsidian</option><option value="sunset">Sunset Pearl</option></select></label>',
 '<label class="theme-choice">Schriftart<select id="theme_typography" data-setting="typography"><option value="original">Passend zum Theme (Standard)</option><option value="modern">Segoe UI · Modern</option><option value="glass">Helvetica/Segoe · Liquid Glass</option><option value="aero">Trebuchet · Frutiger Aero</option><option value="geometric">Century Gothic/Aptos · Geometrisch</option><option value="elegant">Aptos · Elegant</option><option value="tech">Arial Narrow · Tech</option></select></label>',
 '<label class="theme-choice" id="themeAeroCursorRow" hidden>Frutiger-Aero-Cursor<select id="theme_aeroCursor" data-setting="aeroCursor"><option value="auto">System-Cursor</option><option value="aqua">Aqua Glass Arrow</option><option value="orb">Glass Orb</option><option value="crystal">Crystal Pointer</option></select></label>',
 '<label class="theme-choice">Diagrammstil<select id="theme_chartMode" data-setting="chartMode"><option value="line">Linien</option><option value="area">Flächen</option><option value="bar">Balken</option></select></label>',
 '<label class="theme-choice">Leistung & Glas<select id="theme_performance" data-setting="performance"><option value="smooth">Flüssig (empfohlen)</option><option value="full">Volle Effekte (mehr Leistung nötig)</option></select></label>',
 '<label class="theme-choice">Textkontrast<select id="theme_readability" data-setting="readability"><option value="auto">Automatisch lesbar</option><option value="strong">Extra deutlich</option></select></label>',
 '<label class="theme-choice">Abstände<select id="theme_density" data-setting="density"><option value="normal">Komfortabel</option><option value="compact">Kompakt</option></select></label>',
 '<label class="theme-checkbox"><input id="theme_motion" type="checkbox" data-setting="motion"> Animationen</label>',
 '<div class="theme-dialog-footer"><button id="themeReset" type="button">Dieses Theme zurücksetzen</button><button id="themeDone" type="button">Fertig</button></div><small id="themeStatus" aria-live="polite"></small>',
 '</section></div></section>'
 ].join('');
 document.body.append(panel);
 const open=()=>{panel.hidden=false;document.body.classList.add('theme-open');el('themeStudioToggle').setAttribute('aria-expanded','true');renderGrid();el('themeClose').focus()};
 const close=()=>{if(panel.hidden)return;panel.hidden=true;document.body.classList.remove('theme-open');el('themeStudioToggle').setAttribute('aria-expanded','false');el('themeStudioToggle').focus()};
 el('themeStudioToggle')?.addEventListener('click',()=>panel.hidden?open():close());
 ['themeClose','themeDone','themeBackdrop'].forEach(id=>el(id).addEventListener('click',close));
 el('themeSearch').addEventListener('input',renderGrid);
 document.querySelectorAll('[data-family]').forEach(btn=>btn.addEventListener('click',()=>{
  category=btn.dataset.family;document.querySelectorAll('[data-family]').forEach(x=>x.classList.toggle('selected',x===btn));renderGrid();
 }));
 document.querySelectorAll('#themeStudioPanel [data-setting]').forEach(item=>{
  const k=item.dataset.setting;
  item.addEventListener(k==='motion'?'change':'input',()=>edit(k,k==='motion'?item.checked:item.value));
 });
 el('themeReset').addEventListener('click',()=>{delete state.edits[state.id];save();apply()});
 document.addEventListener('keydown',event=>{
  if(panel.hidden)return;if(event.key==='Escape'){event.preventDefault();close()}
  if(event.key==='Tab'){
   const all=Array.from(panel.querySelectorAll('button,input,select')).filter(e=>!e.disabled&&e.getClientRects().length);
   if(!all.length)return;
   if(event.shiftKey&&document.activeElement===all[0]){event.preventDefault();all[all.length-1].focus()}
   else if(!event.shiftKey&&document.activeElement===all[all.length-1]){event.preventDefault();all[0].focus()}
  }
 });
 const g=el('glassSlider');if(g)g.addEventListener('input',apply);
 document.querySelectorAll('[data-glass-preset]').forEach(b=>b.addEventListener('click',()=>requestAnimationFrame(apply)));
 apply();renderGrid();
}
window.BACK2U_THEMES={
 list:()=>presets.map(p=>({id:p.id,name:p.name,family:p.family,light:p.light})),
 current:()=>state.id,
 get:id=>{let p=byId[id]||byId[state.id];let o=state.edits[p.id]||{};return {...p,
  accent:color(o.accent,p.accent),secondary:color(o.secondary,p.secondary),
  tint:color(o.tint,p.accent),chartMode:['line','area','bar'].includes(o.chartMode)?o.chartMode:'line',
  backgroundIntensity:clamp(o.backgroundIntensity,0,100,76),outlineStrength:clamp(o.outlineStrength,0,100,55),readability:o.readability==='strong'?'strong':'auto',
  fontProfile:['aero','elegant','tech','modern','glass','geometric'].includes(o.typography)?o.typography:(p.family==='aero'?'aero':p.light?'elegant':'futuristic'),aeroCursor:['auto','aqua','orb','crystal'].includes(o.aeroCursor)?o.aeroCursor:'auto'};},
 use:id=>{if(byId[id]){state.id=id;save();apply();renderGrid();return true}return false},
 setChartMode:mode=>{if(['line','area','bar'].includes(mode))edit('chartMode',mode)}
};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',setup,{once:true});
else setup();
})();