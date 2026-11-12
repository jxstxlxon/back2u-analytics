/* BACK2U V3 – truthful numeric axes, data-quality-aware summaries and theme-matched SVG. */
(function(){
'use strict';
const MODES=['line','area','bar'];let mode='line';
const chart=document.getElementById('trendChart');
const modes=document.querySelectorAll('#chartModes [data-chart-mode]');
const f=(n)=>Number.isFinite(n)?new Intl.NumberFormat('de-DE',{maximumFractionDigits:0}).format(n):'–';
const fmtDate=d=>d.slice(8,10)+'.'+d.slice(5,7)+'.';
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const cssColor=(p,fallback)=>'var(--chart-'+p+', '+fallback+')';
const colorFor={yt:'#ff7b92',ig:'#a995ff',tt:'#39dbc9'};
function niceStep(n){const q=Math.pow(10,Math.floor(Math.log10(n||1))),v=n/q;return(v<=1?1:v<=2?2:v<=2.5?2.5:v<=5?5:10)*q}
function draw(ctx){
 const {ps,xs,dMap,NAMES,days,range}=ctx;
 chart.classList.remove('v71-drawn');
 document.getElementById('trendLegend').innerHTML=ps.map(p=>'<span><i class="legend-color-'+p+'" style="background:'+cssColor(p,colorFor[p])+'"></i>'+esc(NAMES[p])+'</span>').join('');
 document.getElementById('chartTitle').textContent='Tagesverlauf · '+(mode==='bar'?'Balken':mode==='area'?'Flächen':'Linien');
 document.getElementById('chartSubtitle').textContent=range.start+' bis '+range.end;
 modes.forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.chartMode===mode)));
 const cards=document.getElementById('chartKpis'),note=document.getElementById('chartSummaryNote'),foot=document.getElementById('chartFoot');
 if(xs.length<2){window.BACK2U_V7_SELECTED_DAY=null;window.BACK2U_V7?.dayPie(null,ctx);chart.innerHTML='<div class="empty">Für diesen Zeitraum liegen zu wenige Tagesdaten vor.</div>';cards.textContent='';const dayPanel=document.getElementById('chartDayBreakdown');if(dayPanel)dayPanel.textContent='Keine vollständige Tagesauswertung verfügbar.';note.textContent='Fehlende Werte werden nicht geschätzt.';foot.textContent='Kein Vergleich ohne ausreichend Daten.';return}
 const observed=xs.map(d=>{
  const values=ps.map(p=>dMap[p].get(d)).filter(v=>typeof v==='number'&&Number.isFinite(v)&&v>=0);
  return{d,coverage:values.length,value:values.reduce((a,b)=>a+b,0)};
 }).filter(r=>r.coverage>0);
 if(!observed.length){
  window.BACK2U_V7_SELECTED_DAY=null;
  window.BACK2U_V7?.dayPie(null,ctx);
  chart.innerHTML='<div class="empty">Für diese Plattform sind momentan keine echten Tagesaufrufe vorhanden. Gesamtaufrufe einzelner Videos dürfen nicht als Tageswerte erscheinen.</div>';
  cards.textContent='';
  document.getElementById('chartDayBreakdown').textContent='Noch keine Tageswerte verfügbar – kein Nullwert.';
  note.textContent='Der Zeitraum ist '+range.start+' bis '+range.end+'. Für diese Tage gibt es keine gemeldeten Tageszahlen.';
  foot.textContent='Bitte prüfe den Datenstand unter System. Bei TikTok sind Video-Gesamtaufrufe nicht dasselbe wie tägliche Profilaufrufe.';
  return;
 }
 const complete=observed.filter(r=>r.coverage===ps.length);
 const peaks=complete; // Only comparable days can define highest/lowest records.
 const sum=observed.reduce((a,r)=>a+r.value,0);
 const avg=observed.length?sum/observed.length:null;
 const completeAvg=complete.length?complete.reduce((total,r)=>total+r.value,0)/complete.length:null;
 const partialAvgCaption=complete.length!==observed.length
  ?'Ø Tage mit gemeldeten Werten: '+f(Math.round(avg))+' (Teiltage enthalten)'
  :null;
 const highest=peaks.reduce((best,r)=>!best||r.value>best.value?r:best,null);
 const lowest=peaks.reduce((best,r)=>!best||r.value<best.value?r:best,null);
 const entries=[
  ['Erfasste Aufrufe'+(complete.length===days?'':' · unvollständig'),f(sum),observed.length+' von '+days+' Tagen mit Daten · '+complete.length+' vollständig'],
  ['Ø vollständig erfasster Tag',completeAvg===null?'–':f(Math.round(completeAvg)),
   complete.length?complete.length+' Tage mit Daten aller '+ps.length+' gewählten Plattformen':'Kein Tag mit Daten aller gewählten Plattformen',
   partialAvgCaption],
  ['Höchster Tag',highest?f(highest.value):'–',highest?fmtDate(highest.d):'keine vollständig erfassten Tage'],
  ['Niedrigster Tag',lowest?f(lowest.value):'–',lowest?fmtDate(lowest.d):'keine vollständig erfassten Tage']
 ];
 cards.innerHTML=entries.map(e=>'<div class="chart-kpi"><span class="chart-kpi-label">'+esc(e[0])+'</span><strong class="chart-kpi-number">'+esc(e[1])+'</strong><small class="chart-kpi-meta">'+esc(e[2])+'</small>'+(e[3]?'<small class="v71-secondary-avg">'+esc(e[3])+'</small>':'')+'</div>').join('');
 note.textContent='Zahlen vorhanden für '+observed.length+' von '+days+' Tagen. '+complete.length+' Tage haben Werte von allen gewählten Plattformen. '+(complete.length?'Höchster und niedrigster Tag stammen aus diesen gemeinsamen Tagen.':'Ohne vollständig erfasste gemeinsame Tage werden keine Rekordtage ausgewiesen.')+' Fehlende Tage werden nicht geschätzt.';
 const all=ps.flatMap(p=>xs.map(x=>dMap[p].get(x)).filter(v=>typeof v==='number'&&Number.isFinite(v)&&v>=0));
 const max=Math.max(1,...all),tick=niceStep(max/4),ymax=Math.ceil(max/tick)*tick;
 // A small real SVG viewport keeps labels readable on iPhone instead of shrinking a 1000px SVG.
 const compact=chart.getBoundingClientRect().width<=540;
 const W=compact?430:1000,H=compact?300:295,L=compact?63:83,R=compact?14:18,T=compact?22:16,B=compact?49:41,PW=W-L-R,PH=H-T-B;
 const x=i=>L+PW*i/(xs.length-1),y=v=>T+PH*(1-v/ymax);
 let out='<svg viewBox="0 0 '+W+' '+H+'" role="img" aria-label="Tagesdiagramm mit numerischer Y-Achse und '+ps.length+' Plattformreihen" preserveAspectRatio="xMidYMid meet"><defs>';
 for(const p of ps)out+='<linearGradient id="v3gr-'+p+'" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" style="stop-color:'+cssColor(p,colorFor[p])+';stop-opacity:.24"/><stop offset="100%" style="stop-color:'+cssColor(p,colorFor[p])+';stop-opacity:0"/></linearGradient>';
 out+='</defs>';
 for(let i=0;i<=4;i++){
  const v=Math.round(ymax*(4-i)/4),yy=y(v);
  out+='<line class="chart-grid" x1="'+L+'" x2="'+(W-R)+'" y1="'+yy+'" y2="'+yy+'"/><text class="chart-axis-label" x="'+(L-12)+'" y="'+(yy+4.2)+'" text-anchor="end">'+f(v)+'</text>';
 }
 for(const p of ps){
  const valid=xs.map((d,i)=>({i,d,v:dMap[p].get(d)})).filter(d=>typeof d.v==='number'&&Number.isFinite(d.v)&&d.v>=0);
  if(!valid.length)continue;
  const stroke=cssColor(p,colorFor[p]);
  if(mode==='bar'){
   const group=Math.min(20,Math.max(3,PW/xs.length*.77)),barW=Math.max(1,group/ps.length*.85);
   for(const q of valid){const xx=x(q.i)-group/2+ps.indexOf(p)*(group/ps.length),yy=y(q.v);out+='<rect x="'+xx.toFixed(2)+'" y="'+yy.toFixed(2)+'" width="'+barW.toFixed(2)+'" height="'+Math.max(0,T+PH-yy).toFixed(2)+'" rx="1.2" fill="'+stroke+'" opacity=".90"/>'}
  }else{
   const groups=[];
   for(const q of valid){const last=groups[groups.length-1];if(!last||q.i-last[last.length-1].i>1)groups.push([q]);else last.push(q)}
   for(const group of groups){
    if(group.length<2)continue;
    const path=group.map((q,i)=>(i?'L':'M')+x(q.i).toFixed(1)+','+y(q.v).toFixed(1)).join('');
    if(mode==='area')out+='<path d="'+path+'L'+x(group[group.length-1].i)+','+(T+PH)+'L'+x(group[0].i)+','+(T+PH)+'Z" fill="url(#v3gr-'+p+')"/>';
    out+='<path class="chart-series-line" d="'+path+'" fill="none" stroke="'+stroke+'"/>';
   }
   const q=valid[valid.length-1];out+='<circle class="chart-point" cx="'+x(q.i)+'" cy="'+y(q.v)+'" r="4.2" fill="'+stroke+'"/>';
  }
 }
 const stepX=compact?Math.max(1,Math.ceil((xs.length-1)/3)):Math.max(1,Math.floor(xs.length/5));
 for(let i=0;i<xs.length;i++){if(i!==0&&i!==xs.length-1&&i%stepX!==0)continue;out+='<text class="chart-axis-label" x="'+x(i)+'" y="'+(H-11)+'" text-anchor="middle">'+fmtDate(xs[i])+'</text>'}
 out+='<line id="chartSelectionLine" x1="0" x2="0" y1="'+T+'" y2="'+(T+PH)+'" stroke="var(--t-chart-axis,#b7d8ee)" stroke-opacity=".68" stroke-dasharray="5 4" stroke-width="1.5" style="pointer-events:none"/>';
 for(const p of ps)out+='<circle id="chartFocus-'+p+'" r="5.3" cx="0" cy="0" stroke="var(--t-bg,#0a1327)" stroke-width="2" fill="'+cssColor(p,colorFor[p])+'" style="pointer-events:none"/>';
 out+='<rect id="chartHit" x="'+L+'" y="'+T+'" width="'+PW+'" height="'+PH+'" fill="transparent" tabindex="0" role="slider" aria-label="Datum im Diagramm auswählen" style="touch-action:pan-y"/></svg>';
 chart.innerHTML=out;
 chart.classList.add('v71-drawn');
 foot.textContent='Die Plattformen zählen Aufrufe teilweise unterschiedlich. Die Zahlen stammen aus deinen gespeicherten Berichten; sie sind nicht immer direkt vergleichbar.';
 const hit=document.getElementById('chartHit'),hover=document.getElementById('chartHoverLabel');
 const breakdown=document.getElementById('chartDayBreakdown');
 let selectedIndex=-1;
 const updateSelection=i=>{
  if(i===selectedIndex)return;
  selectedIndex=i;
  if(hit)hit.dataset.selectedIndex=String(i);
  const d=xs[i],fullDate=d.slice(8)+'.'+d.slice(5,7)+'.'+d.slice(0,4);
  window.BACK2U_V7_SELECTED_DAY=d;
  window.BACK2U_V7?.dayPie(d,ctx);
  const total=ps.map(p=>dMap[p].get(d)).filter(v=>typeof v==='number'&&Number.isFinite(v)).reduce((a,b)=>a+b,0);
  const covered=ps.filter(p=>typeof dMap[p].get(d)==='number').length;
  const parts=ps.map(p=>{
   const val=dMap[p].get(d);
   return '<span class="chart-day-platform"><i style="background:'+cssColor(p,colorFor[p])+'"></i><small>'+NAMES[p]+'</small><strong>'+f(val)+'</strong></span>';
  }).join('');
  if(breakdown)breakdown.innerHTML='<span class="chart-day-header"><strong>'+fullDate+'</strong><small>'+covered+' von '+ps.length+' Plattformen mit Tageswerten</small></span><span class="chart-day-total"><small>Erfasste Summe</small><b>'+(covered?f(total):'–')+'</b></span>'+parts;
  hover.textContent=fullDate+' · '+ps.map(p=>NAMES[p]+': '+f(dMap[p].get(d))).join(' · ');
  const line=document.getElementById('chartSelectionLine');
  if(line){line.setAttribute('x1',x(i));line.setAttribute('x2',x(i))}
  for(const p of ps){
   const dot=document.getElementById('chartFocus-'+p),v=dMap[p].get(d);
   if(!dot)continue;
   dot.setAttribute('visibility',typeof v==='number'&&Number.isFinite(v)?'visible':'hidden');
   if(typeof v==='number'&&Number.isFinite(v)){dot.setAttribute('cx',x(i));dot.setAttribute('cy',y(v))}
  }
 };
 if(hit){
  let pendingIndex=-1,frame=0,touchStart=null;
  const indexAt=e=>{
   const rect=chart.getBoundingClientRect(),pixel=(e.clientX-rect.left)/rect.width*W;
   return Math.max(0,Math.min(xs.length-1,Math.round((pixel-L)/PW*(xs.length-1))));
  };
  const handler=e=>{
   // iPhone scrolling must not silently change the selected day.
   if(e.pointerType==='touch')return;
   const i=indexAt(e);
   if(i===selectedIndex||i===pendingIndex)return;
   pendingIndex=i;
   if(frame)return;
   frame=requestAnimationFrame(()=>{
    frame=0;
    if(pendingIndex>=0)updateSelection(pendingIndex);
    pendingIndex=-1;
   });
  };
  hit.addEventListener('pointermove',handler);
  hit.addEventListener('pointerdown',e=>{
   if(e.pointerType==='touch'){touchStart={x:e.clientX,y:e.clientY};return}
   if(frame){cancelAnimationFrame(frame);frame=0}
   pendingIndex=-1;
   updateSelection(indexAt(e));
  });
  hit.addEventListener('pointerup',e=>{
   if(e.pointerType!=='touch'||!touchStart)return;
   const moved=Math.hypot(e.clientX-touchStart.x,e.clientY-touchStart.y);
   touchStart=null;
   if(moved<=12)updateSelection(indexAt(e)); // deliberate tap only
  });
  hit.addEventListener('pointercancel',()=>{touchStart=null});
 hit.addEventListener('keydown',e=>{if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();const cur=Number(hit.dataset.selectedIndex??xs.length-1);const next=Math.max(0,Math.min(xs.length-1,cur+(e.key==='ArrowLeft'?-1:1)));hit.dataset.selectedIndex=next;updateSelection(next)}});
 }
 const latestWithData=xs.findLastIndex(d=>ps.some(p=>typeof dMap[p].get(d)==='number'&&Number.isFinite(dMap[p].get(d))));
 updateSelection(latestWithData>=0?latestWithData:xs.length-1);
}
window.BACK2U_CHARTS={render:draw,setMode(next){if(MODES.includes(next)){mode=next;window.BACK2U_THEMES?.setChartMode?.(next);window.BACK2U_REFRESH_CHART?.()}},getMode:()=>mode};
modes.forEach(btn=>btn.addEventListener('click',()=>window.BACK2U_CHARTS.setMode(btn.dataset.chartMode)));
window.addEventListener('back2u-theme-changed',()=>{
 const profile=window.BACK2U_THEMES?.get(window.BACK2U_THEMES.current());
 mode=MODES.includes(profile?.chartMode)?profile.chartMode:'line';
 window.BACK2U_REFRESH_CHART?.();
});
const profile=window.BACK2U_THEMES?.get(window.BACK2U_THEMES.current());
 if(MODES.includes(profile?.chartMode))mode=profile.chartMode;
 window.BACK2U_REFRESH_CHART?.();
})();