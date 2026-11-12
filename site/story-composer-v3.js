/* BACK2U Story Studio V3 — independent 9:16 slide editor with real data + 1440px PNG export. */
(function(){
'use strict';
const overlay=document.getElementById('storyOverlay'),saveButton=document.getElementById('storySave');
const bridge=window.BACK2U_STORY_BRIDGE;
const themes=window.BACK2U_THEMES;
if(!overlay||!bridge||!themes)return;
const KEY='back2u.story.composer.v3',MAX=8;
const TYPES=[
 ['views','Aufrufe · Zeitraum'],['followers','Follower & Abonnenten'],
 ['videoGroups','Videoanzahl / Gruppen'],['top','Bestes Video · Gesamtaufrufe'],
 ['splitViews','Aufrufe je Plattform'],['splitFollowers','Follower je Plattform'],
 ['trend','Tagesverlauf als Diagramm'],['peak','Stärkster erfasster Tag'],
 ['average','Ø je erfasstem Tag']];
const TYPESET=new Set(TYPES.map(x=>x[0]));
const $=id=>document.getElementById(id);
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=n=>typeof n==='number'&&Number.isFinite(n)?new Intl.NumberFormat('de-DE',{maximumFractionDigits:0}).format(n):'–';
const rgb=x=>[1,3,5].map(i=>parseInt(x.slice(i,i+2),16)).join(',');
const P_NAMES={all:'Alle Plattformen',yt:'YouTube',ig:'Instagram',tt:'TikTok'};
const defaults=()=>({title:'Mein Creator-Update',theme:'auto',platform:'all',days:28,layout:'balanced',slots:['views','followers','trend']});
const safeSlide=x=>{
 const d=defaults();if(!x||typeof x!=='object')return d;
 return{
  title:typeof x.title==='string'?x.title.trim().slice(0,56)||d.title:d.title,
  theme:x.theme==='auto'||themes.list().some(p=>p.id===x.theme)?x.theme:'auto',
  platform:Object.prototype.hasOwnProperty.call(P_NAMES,x.platform)?x.platform:d.platform,
  days:[7,28,90].includes(Number(x.days))?Number(x.days):d.days,
  layout:['balanced','bold','compact'].includes(x.layout)?x.layout:'balanced',
  slots:Array.from({length:3},(_,i)=>TYPESET.has(x.slots?.[i])?x.slots[i]:d.slots[i])
 };
};
let composer={slides:[defaults()],selected:0};
try{
 const data=JSON.parse(localStorage.getItem(KEY)||'null');
 if(Array.isArray(data?.slides)&&data.slides.length>0&&data.slides.length<=MAX){
  composer.slides=data.slides.map(safeSlide);composer.selected=Math.max(0,Math.min(composer.slides.length-1,Number(data.selected)||0));
 }
}catch(e){}
const selected=()=>composer.slides[composer.selected];
const persist=()=>{try{localStorage.setItem(KEY,JSON.stringify(composer))}catch(e){}};
const typeOptions=sel=>TYPES.map(([v,label])=>'<option value="'+v+'"'+(v===sel?' selected':'')+'>'+esc(label)+'</option>').join('');
const themeOptions=()=>'<option value="auto">Wie mein Dashboard</option>'+themes.list().map(x=>'<option value="'+esc(x.id)+'">'+esc(x.name)+'</option>').join('');
const logo='<img src="/back2u-mark.svg" alt="" width="48" height="48" decoding="async"/>';
const root=document.createElement('div');root.id='storyEditorRoot';root.className='story-editor-shell';
root.innerHTML='<section class="story-editor-controls" aria-label="Story-Bilder bearbeiten">'
 +'<h2>Story Studio <span style="opacity:.65">/ 9:16</span></h2>'
 +'<p>Jedes Bild erhält eigene Inhalte, Zeitraum, Plattform und ein frei wählbares Liquid-Glass-Theme. Nur vorhandene Werte werden angezeigt.</p>'
 +'<div class="story-tabs" id="scTabs" role="group" aria-label="Story-Seite auswählen"></div>'
 +'<div class="story-input-grid">'
 +'<label>Theme<select id="scTheme">'+themeOptions()+'</select></label>'
 +'<label>Layout<select id="scLayout"><option value="balanced">Balanced</option><option value="bold">Bold</option><option value="compact">Compact</option></select></label>'
 +'<label>Plattform<select id="scPlatform"><option value="all">Alle</option><option value="yt">YouTube</option><option value="ig">Instagram</option><option value="tt">TikTok</option></select></label>'
 +'<label>Zeitraum<select id="scDays"><option value="7">7 Tage</option><option value="28">28 Tage</option><option value="90">90 Tage</option></select></label>'
 +'</div>'
 +'<label>Story-Überschrift<input id="scTitle" maxlength="56" placeholder="Dein Story-Titel" style="width:100%;min-height:40px;border:1px solid #9abde16b;border-radius:11px;background:#132844;color:#fff;padding:9px;font-size:12px"/></label>'
 +'<label>Obere Karte<select id="scSlot0">'+typeOptions('views')+'</select></label>'
 +'<label>Mittlere Karte<select id="scSlot1">'+typeOptions('followers')+'</select></label>'
 +'<label>Untere Karte<select id="scSlot2">'+typeOptions('trend')+'</select></label>'
 +'<div class="story-editor-foot"><button id="scAdd" type="button">+ Story-Bild</button><button id="scRemove" type="button">Bild entfernen</button></div>'
 +'<p class="story-editor-note">PNG-Export des ausgewählten Bilds: <strong>1440 × 2560 px</strong>. Fehlende Tagesdaten bleiben „–“. Die Periodenwerte entsprechen der jeweils verfügbaren Berichtsabdeckung.</p>'
 +'</section><div class="story-editor-preview-wrap"><article id="scPreview" class="story-slide" aria-label="9:16 Story Vorschau"></article></div>';
overlay.appendChild(root);
function seriesFor(data){
 const dates=[...new Set(data.byPlatform.flatMap(p=>p.days.map(r=>r.d)))].sort();
 const series=data.byPlatform.map(p=>({p:p.p,label:p.label,values:new Map(p.days.map(r=>[r.d,r.value]))}));
 const recorded=dates.map(d=>{const values=series.map(s=>s.values.get(d)).filter(v=>typeof v==='number'&&Number.isFinite(v)&&v>=0);return{d,known:values.length,total:values.reduce((a,b)=>a+b,0)}}).filter(x=>x.known);
 return{dates,series,recorded};
}
const compact=n=>{
 if(typeof n!=='number'||!Number.isFinite(n))return'–';
 if(Math.abs(n)<1000)return fmt(Math.round(n));
 const unit=n>=1e6?' Mio.':' Tsd.',d=n>=1e6?1e6:1000;
 return new Intl.NumberFormat('de-DE',{maximumFractionDigits:1}).format(n/d)+unit;
};
function model(k,data){
 const t=seriesFor(data),total=t.recorded.reduce((a,b)=>a+b.total,0);
 const full=t.recorded.filter(x=>x.known===t.series.length);
 const basis=full.length?full:t.recorded;
 const peak=basis.reduce((a,b)=>!a||b.total>a.total?b:a,null);
 const top=data.top;
 if(k==='views')return{label:data.complete?'Aufrufe · '+data.days+' Tage':'Erfasste Aufrufe · Teilzeitraum',value:data.views,desc:data.complete?'Zeitraumwerte':'Einzelne Tageswerte fehlen'};
 if(k==='followers')return{label:'Follower & Abonnenten',value:data.followers,desc:data.archiveFollowers?'Mit Archivstand':data.incompleteFollowers?'Nicht alle Plattformstände verfügbar':'Zuletzt gemeldete Kontostände'};
 if(k==='videoGroups')return{label:data.platform==='all'?'Video-Gruppen':'Videos',value:data.videoGroups,desc:'Erfasste Videoeinträge'};
 if(k==='top')return{label:'Bestes Video · Gesamtaufrufe',value:top?.views??null,desc:top?.title||'Keine Videozahlen verfügbar'};
 if(k==='splitViews')return{label:'Aufrufe je Plattform',value:data.views,desc:data.coverage.map(c=>c.name+': '+fmt(c.views)).join('  ·  ')};
 if(k==='splitFollowers')return{label:'Follower je Plattform',value:data.followers,desc:data.coverage.map(c=>c.name+': '+fmt(c.followers)+(c.source==='archiv'?'*':'')).join('  ·  ')};
 if(k==='trend')return{label:'Verlauf · Tageswerte',chart:t,desc:'Vorhandene Tage, keine Hochrechnung'};
 if(k==='peak')return{label:'Stärkster erfasster Tag',value:peak?.total??null,desc:peak?peak.d.slice(8)+'.'+peak.d.slice(5,7)+'.'+peak.d.slice(0,4)+(full.length?' · Vollständiger Plattformtag':' · Teilwert'):'Keine Tageswerte'};
 if(k==='average')return{label:'Ø je erfasstem Tag',value:t.recorded.length?Math.round(total/t.recorded.length):null,desc:t.recorded.length+' Tage mit verfügbaren Messwerten'};
 return{label:'Nicht verfügbar',value:null,desc:'–'};
}
const paletteSeries=(p,i,theme)=>{
 const baseHue=p==='yt'?8:p==='ig'?260:172;
 const hue=theme.family==='aero'?(baseHue+18)%360:baseHue;
 return 'hsl('+hue+' 85% '+(theme.light?'36':'68')+'%)';
};
function chartSvg(t,p){
 const dates=t.dates;
 if(dates.length<2)return'<div class="story-slot-value">–</div><div class="story-slot-desc">Zu wenige Tagesdaten</div>';
 const all=t.series.flatMap(s=>dates.map(d=>s.values.get(d)).filter(v=>typeof v==='number'&&v>=0));
 if(!all.length)return'<div class="story-slot-value">–</div><div class="story-slot-desc">Keine Tageswerte vorhanden</div>';
 const max=Math.max(1,...all),W=280,H=95,L=38,T=12,R=6,B=21,PW=W-L-R,PH=H-T-B;
 const X=i=>L+(PW*i/(dates.length-1)),Y=v=>T+PH*(1-v/max);
 const nums=[max,Math.round(max/2),0];
 let svg='<svg viewBox="0 0 '+W+' '+H+'" role="img" aria-label="Tageswerte und Skala" preserveAspectRatio="xMidYMid meet">';
 nums.forEach((n,i)=>{const y=T+(PH*i/2);svg+='<line x1="'+L+'" x2="'+(W-R)+'" y1="'+y+'" y2="'+y+'" stroke="currentColor" stroke-opacity=".23" stroke-dasharray="2 4"/><text x="'+(L-5)+'" y="'+(y+3)+'" text-anchor="end" font-size="8" fill="currentColor">'+esc(compact(n))+'</text>'});
 t.series.forEach((s,i)=>{
  const pts=dates.map((d,index)=>({index,v:s.values.get(d)})).filter(o=>typeof o.v==='number'&&o.v>=0);
  const groups=[];pts.forEach(o=>{const last=groups[groups.length-1];if(!last||o.index-last[last.length-1].index>1)groups.push([o]);else last.push(o)});
  groups.filter(g=>g.length>1).forEach(g=>{let d=g.map((o,j)=>(j?'L':'M')+X(o.index).toFixed(1)+','+Y(o.v).toFixed(1)).join('');
   svg+='<path d="'+d+'" stroke="'+paletteSeries(s.p,i,p)+'" stroke-width="2.7" fill="none" stroke-linecap="round" stroke-linejoin="round"/>'});
 });
 svg+='<text x="'+L+'" y="'+(H-5)+'" font-size="8" fill="currentColor">'+dates[0].slice(5).replace('-','.')+'</text><text x="'+(W-R)+'" y="'+(H-5)+'" font-size="8" text-anchor="end" fill="currentColor">'+dates[dates.length-1].slice(5).replace('-','.')+'</text></svg>';
 return svg;
}
function slideContext(){
 const s=selected(),id=s.theme==='auto'?themes.current():s.theme,p=themes.get(id);
 const data=bridge.makeSelection(s.platform,s.days);
 return{s,p,data,id};
}
function displaySlot(k,context,i){
 const item=model(k,context.data),isChart=!!item.chart;
 return '<section class="story-slot" data-size="'+(isChart?'chart':i===0?'hero':i===1?'secondary':'compact')+'">'
  +'<div class="story-slot-label">'+esc(item.label)+'</div>'
  +(isChart?chartSvg(item.chart,context.p):'<div class="story-slot-value">'+esc(fmt(item.value))+'</div>')
  +'<div class="story-slot-desc">'+esc(item.desc)+'</div></section>';
}
function refreshTabs(){
 const tabs=$('scTabs');tabs.replaceChildren();
 composer.slides.forEach((slide,i)=>{const b=document.createElement('button');b.textContent='Bild '+(i+1);b.type='button';b.setAttribute('aria-pressed',String(i===composer.selected));b.addEventListener('click',()=>{composer.selected=i;persist();render()});tabs.appendChild(b)});
 $('scAdd').disabled=composer.slides.length>=MAX;
 $('scRemove').disabled=composer.slides.length<=1;
}
function render(){
 const s=selected(),{p,data,id}=slideContext();
 refreshTabs();
 $('scTheme').value=s.theme;$('scPlatform').value=s.platform;$('scDays').value=String(s.days);
 $('scLayout').value=s.layout;$('scTitle').value=s.title;
 for(let i=0;i<3;i++)$('scSlot'+i).value=s.slots[i];
 const preview=$('scPreview');
 const typography=p.fontProfile==='aero'?'"Trebuchet MS",Verdana,sans-serif':p.fontProfile==='tech'?'"Arial Narrow","Segoe UI",sans-serif':p.light||p.fontProfile==='elegant'?'"Aptos","Segoe UI",sans-serif':'"Segoe UI",-apple-system,sans-serif';
 const storyArt=window.BACK2U_REFERENCE_ART?window.BACK2U_REFERENCE_ART(p):null;
 preview.dataset.storyLayout=s.layout;
 preview.style.setProperty('--story-image',storyArt?'url("'+storyArt.url+'")':'none');
 preview.style.setProperty('--story-bg',p.bg);
 preview.style.setProperty('--story-card-rgb',rgb(p.card));
 preview.style.setProperty('--story-card-alpha',p.light?'.72':'.62');
 preview.style.setProperty('--story-accent',p.accent);preview.style.setProperty('--story-accent-rgb',rgb(p.accent));
 preview.style.setProperty('--story-secondary',p.secondary);
 preview.style.setProperty('--story-ink',p.light?'#102c43':'#f6f9ff');
 preview.style.setProperty('--story-muted',p.light?'#345672':'#d7e7fc');
 preview.style.setProperty('--story-ui',typography);preview.style.setProperty('--story-display',typography);
 preview.innerHTML='<div class="story-slide-inner">'
 +'<div class="story-slide-header"><span class="story-slide-mark">'+logo+'</span><span class="story-slide-brand">BACK2U<small>CREATOR COMMAND CENTER</small></span></div>'
 +'<div class="story-slide-headline"><h2>'+esc(s.title)+'</h2><p>'+esc(P_NAMES[s.platform])+' · '+s.days+' Tage · '+esc(p.name)+'</p></div>'
 +s.slots.map((k,i)=>displaySlot(k,{p,data,s},i)).join('')
 +'<div class="story-slide-footer"><span>BACK2U DASHBOARD</span><span>'+esc(data.apiLoaded?'API-Stand':'Archivstand')+' '+esc(data.updated)+(data.complete?'':' · Teilwerte')+'</span></div>'
 +'</div>';
}
function changed(k,v){
 const s=selected();
 if(k==='title')s.title=String(v).slice(0,56)||'Creator-Update';
 else if(k==='theme')s.theme=v;
 else if(k==='platform')s.platform=v;
 else if(k==='days')s.days=Number(v);
 else if(k==='layout')s.layout=v;
 else if(/^slot[012]$/.test(k))s.slots[Number(k.slice(-1))]=v;
 composer.slides[composer.selected]=safeSlide(s);
 persist();render();
}
function show(){
 overlay.classList.add('story-composer-active');
 root.hidden=false;render();
}
function hide(){overlay.classList.remove('story-composer-active');root.hidden=true}
$('scAdd').addEventListener('click',()=>{if(composer.slides.length>=MAX)return;composer.slides.push({...safeSlide(selected()),title:'Mein Creator-Update '+(composer.slides.length+1),slots:[...selected().slots]});composer.selected=composer.slides.length-1;persist();render()});
$('scRemove').addEventListener('click',()=>{if(composer.slides.length<=1)return;composer.slides.splice(composer.selected,1);composer.selected=Math.max(0,Math.min(composer.selected,composer.slides.length-1));persist();render()});
[['scTheme','theme'],['scPlatform','platform'],['scDays','days'],['scLayout','layout'],['scSlot0','slot0'],['scSlot1','slot1'],['scSlot2','slot2']].forEach(([id,k])=>$(id).addEventListener('change',e=>changed(k,e.target.value)));
$('scTitle').addEventListener('change',e=>changed('title',e.target.value));
document.getElementById('storyModeToggle').addEventListener('click',()=>{if(!overlay.hidden)show();else hide()});
document.getElementById('storyClose').addEventListener('click',hide);
window.addEventListener('back2u-theme-changed',()=>{if(!overlay.hidden&&selected().theme==='auto')render()});
function download(canvas){
 return new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(Error('Bild konnte nicht gerendert werden')),'image/png'));
}
function loadImg(src){return new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=()=>reject(Error('Bild nicht verfügbar'));img.src=src})}
const styleFont=(p)=>p.fontProfile==='aero'?'Trebuchet MS':p.fontProfile==='tech'?'Arial Narrow':p.light||p.fontProfile==='elegant'?'Aptos, Segoe UI':'Segoe UI';
function drawCard(c,x,y,w,h,item,context,index){
 const p=context.p,light=p.light,ink=light?'#102b43':'#f6f8ff',muted=light?'#31516c':'#d0dff3';
 c.fillStyle=light?'rgba(255,255,255,.75)':'rgba(10,20,43,.73)';
 c.strokeStyle=light?'rgba(43,94,134,.36)':'rgba(255,255,255,.54)';c.lineWidth=1.2;
 c.beginPath();c.roundRect(x,y,w,h,17);c.fill();c.stroke();
 c.save();c.beginPath();c.roundRect(x,y,w,h,17);c.clip();
 const glow=c.createLinearGradient(x,y,x+w,y+h);glow.addColorStop(0,'rgba(255,255,255,.26)');glow.addColorStop(1,'rgba(255,255,255,0)');c.fillStyle=glow;c.fillRect(x,y,w,h*.40);c.restore();
 c.textBaseline='alphabetic';c.fillStyle=muted;c.font='700 11px '+styleFont(p);
 c.fillText(String(item.label).toUpperCase().slice(0,47),x+17,y+25,w-34);
 if(item.chart){
  const t=item.chart,dates=t.dates,all=t.series.flatMap(q=>dates.map(d=>q.values.get(d)).filter(v=>typeof v==='number'&&v>=0));
  if(dates.length<2||!all.length){c.fillStyle=ink;c.font='800 32px '+styleFont(p);c.fillText('–',x+20,y+75);return}
  const max=Math.max(1,...all),L=x+40,R=x+w-17,T=y+38,B=y+h-25;
  c.strokeStyle=light?'#244f7558':'#d7efff40';c.lineWidth=.6;
  for(let i=0;i<=2;i++){const yy=T+(B-T)*i/2;c.beginPath();c.moveTo(L,yy);c.lineTo(R,yy);c.stroke();
   c.fillStyle=muted;c.font='9px '+styleFont(p);c.textAlign='right';c.fillText(compact(max*(1-i/2)),L-6,yy+3);c.textAlign='left'}
  t.series.forEach((v,i)=>{c.strokeStyle=paletteSeries(v.p,i,p);c.lineWidth=2.3;c.lineJoin='round';c.beginPath();let started=false,lastIndex=-2;dates.forEach((d,j)=>{
   const z=v.values.get(d);if(typeof z!=='number'||z<0){started=false;return}
   const xx=L+(R-L)*j/(dates.length-1),yy=T+(B-T)*(1-z/max);
   if(!started||lastIndex!==j-1)c.moveTo(xx,yy);else c.lineTo(xx,yy);
   started=true;lastIndex=j
  });c.stroke()});
  c.fillStyle=muted;c.font='9px '+styleFont(p);c.fillText(dates[0].slice(5),L,B+14);c.textAlign='right';c.fillText(dates[dates.length-1].slice(5),R,B+14);c.textAlign='left';
 }else{
  c.fillStyle=ink;c.font='850 '+(index===0?42:index===1?38:34)+'px '+styleFont(p);
  const val=fmt(item.value),width=c.measureText(val).width;
  if(width>w-34){c.font='850 '+Math.max(22,Math.round((index===0?42:36)*(w-34)/width))+'px '+styleFont(p)}
  c.fillText(val,x+16,y+h*.62,w-32);
  c.fillStyle=muted;c.font='600 10.6px '+styleFont(p);
  const desc=String(item.desc||'').slice(0,95);
  let words=desc.split(/\s+/),line='',yline=y+h-20;
  for(const word of words){const temp=line?line+' '+word:word;if(c.measureText(temp).width>w-33){c.fillText(line,x+17,yline);line=word;yline+=12;if(yline>y+h-6)break}else line=temp}
  if(line&&yline<=y+h-5)c.fillText(line,x+17,yline);
 }
}
async function canvasStory(){
 const context=slideContext(),s=context.s,p=context.p,data=context.data,canvas=document.createElement('canvas');
 canvas.width=1440;canvas.height=2560;
 const c=canvas.getContext('2d',{alpha:false});if(!c)throw Error('Canvas wird nicht unterstützt');
 c.scale(4,4);const font=styleFont(p),ink=p.light?'#112b43':'#f8fbff',muted=p.light?'#365873':'#d3e5fa';
 c.fillStyle=p.bg;c.fillRect(0,0,360,640);
 try{const background=window.BACK2U_REFERENCE_ART?.(p);if(background){const img=await loadImg(background.url);c.drawImage(img,0,0,360,640)}}catch(e){}
 const shade=c.createLinearGradient(0,0,360,640);shade.addColorStop(0,p.light?'rgba(255,255,255,.28)':'rgba(5,12,31,.18)');shade.addColorStop(1,p.light?'rgba(255,255,255,.16)':'rgba(1,5,22,.31)');c.fillStyle=shade;c.fillRect(0,0,360,640);
 c.fillStyle=p.accent;c.strokeStyle='#ffffff9c';c.lineWidth=1;c.beginPath();c.roundRect(25,22,40,40,11);c.fill();c.stroke();
 try{const mark=await loadImg('/back2u-mark.svg');c.drawImage(mark,26,23,38,38)}catch(e){c.fillStyle='#fff';c.font='900 22px '+font;c.fillText('B2',31,49)}
 c.fillStyle=ink;c.font='850 23px '+font;c.fillText('BACK2U',76,41);
 c.fillStyle=muted;c.font='700 8.5px '+font;c.fillText('CREATOR COMMAND CENTER',76,54);
 c.font='850 28px '+font;c.fillStyle=ink;
 const title=String(s.title).slice(0,56),words=title.split(/\s+/);
 let line='',titleRows=[];
 for(const word of words){const next=line?line+' '+word:word;if(c.measureText(next).width>305&&line){titleRows.push(line);line=word}else line=next}
 if(line)titleRows.push(line);
 titleRows.slice(0,2).forEach((r,i)=>c.fillText(r,26,111+i*30,310));
 c.fillStyle=muted;c.font='600 11px '+font;c.fillText(P_NAMES[s.platform]+' · '+s.days+' Tage',27,titleRows.length>1?159:133);
 const cards=[{y:172,h:116},{y:301,h:116},{y:430,h:126}];
 s.slots.forEach((slot,i)=>drawCard(c,24,cards[i].y,312,cards[i].h,model(slot,data),context,i));
 c.strokeStyle=p.light?'#3157744a':'#ffffff54';c.lineWidth=1;c.beginPath();c.moveTo(27,581);c.lineTo(333,581);c.stroke();
 c.fillStyle=ink;c.font='750 10px '+font;c.fillText('BACK2U DASHBOARD',27,606);
 c.fillStyle=muted;c.font='500 9px '+font;c.textAlign='right';
 c.fillText((data.apiLoaded?'API-Stand':'Archivstand')+' '+data.updated,333,605);c.textAlign='left';
 return canvas;
}
async function saveCurrent(){
 saveButton.disabled=true;saveButton.textContent='Rendering: 1440 × 2560 …';
 try{
  const canvas=await canvasStory(),blob=await download(canvas);
  const filename='BACK2U_Story_'+String(composer.selected+1).padStart(2,'0')+'_'+new Date().toISOString().slice(0,10)+'.png';
  if(navigator.canShare&&navigator.share){
   const file=new File([blob],filename,{type:'image/png'});
   if(navigator.canShare({files:[file]})){try{await navigator.share({files:[file],title:'BACK2U Story'});return}catch(e){if(e.name==='AbortError')return}}
  }
  const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=filename;a.click();setTimeout(()=>URL.revokeObjectURL(url),30000);
 }catch(e){alert('Story-Export fehlgeschlagen: '+String(e?.message||e))}
 finally{saveButton.disabled=false;saveButton.textContent='↧ Story-Bild speichern'}
}
saveButton.addEventListener('click',e=>{if(overlay.hidden||!overlay.classList.contains('story-composer-active'))return;e.preventDefault();e.stopImmediatePropagation();saveCurrent()},true);
root.hidden=true;
window.BACK2U_STORY_COMPOSER={refresh:()=>{if(!overlay.hidden)render()},getSlides:()=>composer.slides.map(x=>({...x}))};
})();