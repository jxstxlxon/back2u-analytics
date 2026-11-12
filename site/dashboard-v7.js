/* BACK2U V7 – analytics-safe UI enhancements, no fabricated data.
   Intentionally no external API credentials in the browser. */
(function(){
'use strict';
const bridge=window.BACK2U_V7_BRIDGE;
if(!bridge)return;
const $=id=>document.getElementById(id);
const fmt=n=>typeof n==='number'&&Number.isFinite(n)?new Intl.NumberFormat('de-DE',{maximumFractionDigits:0}).format(n):'–';
const dec=n=>typeof n==='number'&&Number.isFinite(n)?new Intl.NumberFormat('de-DE',{maximumFractionDigits:1}).format(n):'–';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','"':'&quot;',"'":'&#39;'}[c]));
const names={yt:'YouTube',ig:'Instagram',tt:'TikTok'};
const colors={yt:'var(--chart-yt, #ff7b92)',ig:'var(--chart-ig, #a995ff)',tt:'var(--chart-tt, #39dbc9)'};
const has=x=>typeof x==='number'&&Number.isFinite(x)&&x>=0;
const numeric=v=>Number.isFinite(v)&&v>=0?v:null;
const safeDate=d=>/^\d{4}-\d{2}-\d{2}$/.test(d);
const median=nums=>{const v=nums.filter(has).sort((a,b)=>a-b);return v.length?(v.length%2?v[(v.length-1)/2]:(v[v.length/2-1]+v[v.length/2])/2):null};
const today=()=>new Date().toLocaleDateString('sv-SE',{timeZone:'Europe/Berlin'});
const store=(key,obj)=>{try{localStorage.setItem(key,JSON.stringify(obj))}catch{}};
const restore=(key,def)=>{try{return JSON.parse(localStorage.getItem(key)||'null')??def}catch{return def}};
function model(){return bridge.snapshot()}
function filtered(m){
 return m.videos.filter(v=>m.platforms.includes(v.platform));
}
function within(m,v){return safeDate(v.date)&&v.date>=m.range.start&&v.date<=m.range.end}
function totals(m){return filtered(m).filter(v=>within(m,v))}
const formatName=v=>v.format||'Anderes Format';
function lifetime(v){return v.reportType==='lifetime'&&has(v.views)}
function safeTitle(s){return String(s||'').trim().slice(0,120)}
function describeMissing(m){
 const dates=Object.entries(m.daily).map(([p,rows])=>{
  const current=rows.filter(d=>d.date>=m.range.start&&d.date<=m.range.end&&has(d.views));
  const last=rows.filter(d=>has(d.views)).at(-1)?.date||'–';
  return {p,last,valid:current.length};
 });
 return dates;
}
function dayPie(date,ctx){
 const root=$('chartPlatformPie');if(!root)return;
 if(!date||!ctx){root.innerHTML='<p class="v7-empty">Noch kein Tag ausgewählt.</p>';return}
 const records=ctx.ps.filter(p=>ctx.metricTypes?.[p]!=='engaged').map(p=>({p,value:ctx.dMap?.[p]?.get(date)})).filter(v=>has(v.value));
 const sum=records.reduce((n,v)=>n+v.value,0);
 const complete=records.length===ctx.ps.length;
 const scopeNote=records.length===1&&ctx.ps.length>1
  ?'Nur '+names[records[0].p]+' erfasst – kein vollständiger Plattformvergleich.'
  :null;
 const leg=ctx.ps.map(p=>{
  const engaged=ctx.metricTypes?.[p]==='engaged';
  const entry=records.find(x=>x.p===p);
  const share=entry&&sum>0?Math.round(entry.value/sum*1000)/10:null;
  return '<div class="v7-pie-item"><span class="v7-pie-dot" style="background:'+colors[p]+'"></span><strong>'+names[p]+'</strong><b>'+(share===null?'–':dec(share)+' %')+'</b><small>'+(engaged?'Interessierte Aufrufe nicht vergleichbar':share===null?'Keine Tageszahlen':'Anteil an bekannten Aufrufen'+(complete?'':' · Teilabdeckung'))+'</small></div>';
 }).join('');
 let cursor=0;const stops=[];
 for(const entry of records){const next=cursor+(sum>0?entry.value/sum*100:0);stops.push(colors[entry.p]+' '+cursor+'% '+next+'%');cursor=next}
 const ring=sum>0?'conic-gradient('+stops.join(',')+')':'conic-gradient(rgba(120,160,180,.25) 0% 100%)';
 const dateLabel=date.split('-').reverse().join('.');
 const caution='Plattformen können Aufrufe unterschiedlich zählen. YouTube-Zahlen zu interessierten Aufrufen werden nicht gemischt; einzelne TikTok-Tageswerte können aus älteren Screenshots stammen.';
 root.innerHTML=(scopeNote?'<p class="v71-pie-scope">'+esc(scopeNote)+'</p>':'')+'<div class="v7-pie-chart" style="--v7-pie:'+esc(ring)+'"><div class="v7-pie-core"><small>'+dateLabel+'</small><b>'+records.length+' / '+ctx.ps.length+'</b><small>Plattformen erfasst</small></div></div>'
 +'<div class="v7-pie-list">'+leg+'</div>'
 +'<p class="v7-pie-note">'+(complete?'Alle '+ctx.ps.length+' ausgewählten Plattformen mit Tageszahlen.':'Nur '+records.length+' von '+ctx.ps.length+' Plattformen vorhanden; fehlende Werte sind keine Nullwerte.')+' Prozentwerte beziehen sich nur auf vorhandene Tagesdaten. '+caution+'</p>';
}
function experiments(){
 const m=model(),vids=totals(m),range=m.range,days=[];
 for(let d=range.start;d<=range.end;d=increment(d))days.push(d);
 const counts=new Map(days.map(d=>[d,0]));
 for(const v of vids)counts.set(v.date,(counts.get(v.date)||0)+1);
 const buckets=[{name:'Keine erfassten Uploads',test:n=>n===0},{name:'1–2 Uploads',test:n=>n>=1&&n<=2},{name:'3–4 Uploads',test:n=>n>=3&&n<=4},{name:'5+ Uploads',test:n=>n>=5}]
  .map(x=>({...x,count:days.filter(d=>x.test(counts.get(d)||0)).length}));
 const nPosts=vids.length,activeDays=days.filter(d=>counts.get(d)>0).length;
 const max=Math.max(0,...counts.values());
 const kp=[
  ['Veröffentlichungen',fmt(nPosts),'im gewählten Zeitraum'],
  ['Uploadtage',fmt(activeDays),'Tage mit mindestens einem neuen Video'],
  ['Ø an Uploadtagen',activeDays?dec(nPosts/activeDays):'–','Plattformveröffentlichungen pro aktivem Tag'],
  ['Rekord an einem Tag',fmt(max),'gezählte Plattformveröffentlichungen']
 ];
 $('experimentKpis').innerHTML=kp.map(x=>'<article class="glass metric-box"><small>'+esc(x[0])+'</small><strong>'+esc(x[1])+'</strong><p>'+esc(x[2])+'</p></article>').join('');
 const maxB=Math.max(1,...buckets.map(x=>x.count));
 const recent=days.slice(-28);
 const dayVideos=new Map(recent.map(d=>[d,vids.filter(v=>v.date===d)]));
 const peak=Math.max(1,...recent.map(d=>dayVideos.get(d).length));
 const periods=recent.length<days.length?'Letzte 28 Tage des gewählten Zeitraums':'Ausgewählter Zeitraum';
 $('uploadChart').innerHTML='<p class="v73-rhythm-heading">'+periods+' · erfasste Plattform-Veröffentlichungen, keine Videoaufrufe</p>'
  +'<div class="v73-upload-calendar" role="group" aria-label="Erfasste Veröffentlichungen pro Tag">'+recent.map(d=>{
    const posts=dayVideos.get(d),cnt=posts.length,by=Object.fromEntries(['yt','ig','tt'].map(p=>[p,posts.filter(v=>v.platform===p).length]));
    return '<button type="button" class="v73-upload-day" data-upload-day="'+d+'" aria-label="'+d+' · '+cnt+' erfasste Veröffentlichungen" aria-pressed="false">'
     +'<strong>'+cnt+'</strong><span class="v73-upload-bar" aria-hidden="true">'+['yt','ig','tt'].map(p=>by[p]?'<i style="height:'+(by[p]/peak*100)+'%;background:'+colors[p]+'"></i>':'').join('')+'</span>'
     +'<small>'+d.slice(8)+'.'+d.slice(5)+'</small></button>';
   }).join('')+'</div>'
  +'<div class="v73-upload-detail" id="v73UploadDetail" aria-live="polite"></div>'
  +'<p class="v73-rhythm-heading">Tage nach Anzahl erfasster Uploads</p>'
  +'<div class="v7-rhythm" role="img" aria-label="Verteilung von Uploadtagen">'+buckets.map(x=>
   '<div class="v7-rhythm-row"><span>'+x.name+'</span><div class="v7-rhythm-rail"><i style="width:'+x.count/maxB*100+'%"></i></div><b>'+x.count+' Tage</b></div>'
  ).join('')+'</div>';
 const showDay=d=>{
  const posts=dayVideos.get(d)||[];
  $('uploadChart').querySelectorAll('[data-upload-day]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.uploadDay===d)));
  const counts=['yt','ig','tt'].filter(p=>m.platforms.includes(p)).map(p=>names[p]+': '+posts.filter(v=>v.platform===p).length);
  $('v73UploadDetail').innerHTML='<strong>'+d.split('-').reverse().join('.')+' · '+posts.length+' erfasste Veröffentlichungen</strong>'
   +'<p>'+counts.join(' · ')+'</p>'
   +(posts.length?'<ul>'+posts.slice(0,5).map(v=>'<li>'+esc(names[v.platform])+' · '+esc(safeTitle(v.title)||'Video ohne Titel')+'</li>').join('')+'</ul>'
   +(posts.length>5?'<small>Weitere '+(posts.length-5)+' Einträge im Video Radar.</small>':'')
   :'<small>Keine Veröffentlichung in den derzeit erfassten Videoeinträgen – das beweist keinen vollständigen Upload-Stopp.</small>');
 };
 $('uploadChart').querySelectorAll('[data-upload-day]').forEach(btn=>btn.addEventListener('click',()=>showDay(btn.dataset.uploadDay)));
 if(recent.length)showDay([...recent].reverse().find(d=>dayVideos.get(d).length>0)||recent.at(-1));
 $('uploadNote').textContent='Die Balken zählen erfasste Veröffentlichungen je Plattform – bei Crossposts können mehrere Einträge zum selben Clip gehören. Fehlende Videoeinträge sind möglich (insbesondere bei noch nicht vollständig erfasstem TikTok-Verlauf). Das Diagramm ist kein Beweis, dass mehr Uploads mehr Aufrufe verursachen.';
 // Do not use daily account views as a proxy for the performance of today's uploads.
 const lifetimeRows=vids.filter(lifetime);
 const cohorts=new Map();
 for(const v of lifetimeRows){
  const key=v.platform+'|'+formatName(v);
  if(!cohorts.has(key))cohorts.set(key,[]);
  cohorts.get(key).push(v.views);
 }
 const formats=[...cohorts].map(([key,views])=>({platform:key.split('|')[0],format:key.split('|').slice(1).join('|'),n:views.length,mid:median(views)})).filter(x=>x.n>=3).sort((a,b)=>b.mid-a.mid);
 $('frequencyTable').innerHTML=formats.length?
  '<p class="v7-compare-intro">Bisherige Gesamtaufrufe je Video, getrennt nach Plattform und Format – noch kein fairer 24-Stunden-Vergleich.</p>'
  +formats.slice(0,6).map(x=>'<div class="v7-format-row"><span class="v7-platform-mark" data-p="'+x.platform+'">'+names[x.platform]+'</span><strong>'+esc(x.format)+'</strong><b>'+fmt(Math.round(x.mid))+'</b><small>typische Aufrufe · '+x.n+' Videos</small></div>').join(''):
  '<div class="v7-empty">Noch zu wenige Videos mit vergleichbaren Gesamtwerten je Format vorhanden.</div>';
 $('roadmap').innerHTML=[
  ['01 / HYPOTHESE','Teste nur eine Veränderung','Zum Beispiel zwei Hooks oder 2 gegen 4 Uploads pro Tag auf EINER Plattform. Gleiche Formate, ähnliche Qualität und feste Messregeln.'],
  ['02 / TESTPLAN','Varianten zeitlich fair verteilen','Verteile A und B möglichst über vergleichbare Wochentage. Zusätzliche Uploads und laufende Trends können Ergebnisse verzerren.'],
  ['03 / MESSEN','Alle Videos nach 24 Stunden prüfen','Trage 24h-Aufrufe je Video ein. Bisherige Gesamtaufrufe aus dem Dashboard sind kein Ersatz für einen identischen Messzeitpunkt.'],
  ['04 / EINORDNEN','Tendenz statt Kausalbeweis','Mindestens fünf Videos je Variante sammeln. Median, Ausreißer und mögliche Formatunterschiede berücksichtigen; keine sichere Wirkung nur aus mehr Uploads ableiten.']
 ].map(x=>'<div class="step"><div class="step-label">'+x[0]+'</div><h4>'+x[1]+'</h4><p>'+x[2]+'</p></div>').join('');
 $('formatCards').innerHTML=formats.length?formats.slice(0,6).map(x=>
  '<article class="glass format-card"><small>'+names[x.platform]+' · '+x.n+' Videos</small><b>'+esc(x.format)+'</b><strong>'+fmt(Math.round(x.mid))+'</strong><p>Median der bisherigen Gesamtaufrufe · kein Beweis für den besten Uploadzeitpunkt</p></article>'
 ).join(''):'<div class="glass empty">Für dieses Ranking fehlen ausreichend bekannte Gesamtaufrufe.</div>';
 renderAb();
}
function increment(s){let d=new Date(s+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+1);return d.toISOString().slice(0,10)}
const abDefault={labelA:'Hook A',labelB:'Hook B',nA:'',nB:'',viewsA:'',viewsB:''};
function renderAb(){
 const root=$('experimentAb');if(!root)return;
 const v=restore('back2u_v7_ab',abDefault);
 root.innerHTML='<p class="v7-help">Deine eigenen Ergebnisse nach derselben Messdauer eingeben. Das Dashboard erfindet keine 24-Stunden-Zahlen.</p>'
 +'<form id="v7AbForm" class="v7-ab-form"><div class="v7-ab-head"><span>Variante A</span><span>Variante B</span></div>'
 +'<div class="v7-ab-cols"><div><label>Bezeichnung<input name="labelA" maxlength="40" value="'+esc(v.labelA)+'" required/></label>'
 +'<label>Anzahl Videos<input type="number" min="1" name="nA" value="'+esc(v.nA)+'" required/></label><label>24h-Aufrufe gesamt<input type="number" min="0" name="viewsA" value="'+esc(v.viewsA)+'" required/></label></div>'
 +'<div><label>Bezeichnung<input name="labelB" maxlength="40" value="'+esc(v.labelB)+'" required/></label>'
 +'<label>Anzahl Videos<input type="number" min="1" name="nB" value="'+esc(v.nB)+'" required/></label><label>24h-Aufrufe gesamt<input type="number" min="0" name="viewsB" value="'+esc(v.viewsB)+'" required/></label></div></div>'
 +'<button type="submit">Vergleich auswerten</button></form><div id="v7AbResult" class="v7-ab-result" aria-live="polite"></div>';
 $('v7AbForm').addEventListener('submit',e=>{
  e.preventDefault();const data=Object.fromEntries(new FormData(e.currentTarget).entries());store('back2u_v7_ab',data);
  const a=Number(data.viewsA)/Number(data.nA),b=Number(data.viewsB)/Number(data.nB),nA=Number(data.nA),nB=Number(data.nB);
  if(!has(a)||!has(b)||!Number.isSafeInteger(nA)||!Number.isSafeInteger(nB)||nA<1||nB<1){$('v7AbResult').textContent='Bitte gültige Videos und 24h-Aufrufe eingeben.';return}
  const diff=a===0?(b>0?100:0):Math.abs(a-b)/Math.max(a,b)*100;
  const reliable=nA>=5&&nB>=5&&diff>=15;
  const best=a>b?data.labelA:b>a?data.labelB:null;
  $('v7AbResult').innerHTML='<strong>'+esc(data.labelA)+': '+fmt(Math.round(a))+' Ø · '+esc(data.labelB)+': '+fmt(Math.round(b))+' Ø</strong><p>'
    +(reliable&&best?'Erste Tendenz für '+esc(best)+'. ':'Noch kein eindeutiger Sieger. ')
    +'Beide Gruppen müssen nach exakt 24 Stunden gemessen werden; die Streuung einzelner Videos ist hier nicht berücksichtigt.</p>';
 });
}
function audience(){
 const m=model(),root=$('audienceCards'),ps=m.platforms;
 const required=['countries','gender','age'];
 const availability=ps.flatMap(p=>required.map(type=>({p,type,known:Array.isArray(m.audience?.[p]?.[type])&&m.audience[p][type].length>0})));
 const available=availability.filter(x=>x.known).length;
 const missing=availability.filter(x=>!x.known).map(x=>names[x.p]+' '+({countries:'Länder',gender:'Geschlecht',age:'Alter'}[x.type]));
 $('v7AudienceNote').innerHTML='<div class="v74-audience-coverage"><strong>'+available+' von '+availability.length+' Zielgruppenaufteilungen mit belegter Quelle</strong>'
  +'<small>'+(missing.length?'Fehlend: '+esc(missing.join(' · '))+'. ':'Alle Aufteilungen des ausgewählten Plattformfilters sind verfügbar. ')
  +'Neueste Ergänzung: '+(m.audienceAddedAt?esc(m.audienceAddedAt.split('-').reverse().join('.')):(m.archiveDate?esc(m.archiveDate.split('-').reverse().join('.')):'unbekannt'))
  +'. Originalwerte sind zeitbezogene Momentaufnahmen und werden nicht bei jedem Neuladen neu aus den Studios abgerufen.</small>'
  +'<small>Messbasis: YouTube-Länder = Anteile geografisch zugeordneter Aufrufe; YouTube-Alter/Geschlecht = Zuschaueranteile; TikTok-Alter = Followeranteile. Nicht direkt vergleichbar.</small></div>';
 let cards=[];
 for(const p of ps){
  for(const type of ['countries','gender','age']){
   const label={countries:'Länder',gender:'Geschlecht',age:'Alter'}[type],raw=m.audience?.[p]?.[type];
   const meta=m.audienceMeta?.[p]?.[type]||null;
   const provenance=meta?[meta.source,meta.period||('Stand '+String(meta.asOf||'unbekannt').split('-').reverse().join('.')),meta.basis].filter(Boolean).join(' · '):
    'Archiv-Auswertung · '+(m.archiveDate?String(m.archiveDate).split('-').reverse().join('.'):'Datum unbekannt');
   if(!Array.isArray(raw)||!raw.length){
    const source=p==='yt'?'YouTube Studio → Analytics → Zielgruppe':p==='tt'?'TikTok Studio → Analytics → Zuschauer':'Instagram Insights → Zielgruppe';
    cards.push('<section class="glass audience-card v7-audience-card"><h3><span class="v7-platform-mark" data-p="'+p+'">'+names[p]+'</span> · '+label+'</h3><p class="v74-audience-missing">Noch kein verlässlicher '+label.toLowerCase()+'-Export hinterlegt. Daher keine Prozentwerte.</p><p class="v74-audience-source">Originalwerte dafür in '+esc(source)+' prüfen; keine Schätzung aus Followerzahlen.</p></section>');continue
   }
   const sorted=raw.map(v=>[String(v[0]),Number(v[1])]).filter(x=>has(x[1])).sort((a,b)=>b[1]-a[1]);
   const colorset=['var(--t-accent)','var(--t-secondary)',colors[p],'var(--t-ink-label)','#f3bb75','#7edccc','#a3a0ef'];
   const donut=type!=='countries'?donutFor(sorted,colorset):'';
   const items=sorted.slice(0,type==='countries'?11:7).map(([name,v],i)=>{
    const col=colorset[i%colorset.length];
    return '<div class="v7-audience-row"><span><i style="background:'+col+'"></i>'+esc(name)+'</span><strong>'+dec(v)+' %</strong><div class="v7-audience-track"><b style="width:'+Math.min(100,v)+'%;background:'+col+'"></b></div></div>';
   }).join('');
   cards.push('<section class="glass audience-card v7-audience-card"><h3><span class="v7-platform-mark" data-p="'+p+'">'+names[p]+'</span> · '+label+'</h3>'+donut+'<div class="v7-audience-list">'+items+'</div><p class="v74-audience-source">'+esc(provenance)+'</p></section>');
  }
 }
 root.innerHTML=cards.join('');
 const hours=m.activityHours;
 const hroot=$('hourBars');
 if(hours.length){const mx=Math.max(1,...hours);hroot.innerHTML='<div class="hour-grid">'+hours.map((v,i)=>'<div class="hour-unit"><div class="hour-bar"><i style="height:'+Math.max(3,Number(v)/mx*100)+'%"></i></div><small>'+String(i).padStart(2,'0')+' h</small><b>'+fmt(Number(v))+'</b></div>').join('')+'</div>'}
 else hroot.innerHTML='<p class="v7-empty">Keine verlässlichen Aktivitätsstunden im Export.</p>';
}
function donutFor(entries,palette){
 const slices=[];let pos=0;
 for(const [name,val] of entries){
  if(pos>=100)break;
  const end=Math.min(100,pos+Math.max(0,val));
  if(end>pos)slices.push(palette[slices.length%palette.length]+' '+pos+'% '+end+'%');
  pos=end;
 }
 if(pos<100)slices.push('rgba(120,160,180,.18) '+pos+'% 100%');
 const biggest=entries[0];
 return '<div class="v7-audience-donut" style="background:conic-gradient('+slices.join(',')+')"><div><strong>'+dec(biggest[1])+' %</strong><small>'+esc(biggest[0])+'</small></div></div>';
}
const TEMPLATES=[
 {name:'Kommentar · freundlich',value:'Appreciate you watching!! 💙 What should I try next?'},
 {name:'Kommentar · Tipps erfragen',value:'Still working on getting my kicks cleaner 😭 Any tips?'},
 {name:'Kommentar · Mitmachen',value:'Would you try jumpstyle to this song? 👀'},
 {name:'Kommentar · Hakken',value:'Hakken progress is getting better day by day, what should I practise next?'},
 {name:'Caption · kurz',value:'Practising my jumpstyle again 💙 still improving every day #jumpstyle #harddance'},
 {name:'Caption · länger',value:'Been putting a lot of time into my jumpstyle lately. Still not where I want to be, but I love seeing the small improvements every time I practise. Which part should I work on next? 💙 #jumpstyle #harddance #shuffle'}
];
function creator(){
 renderTexts();renderPlanner();
}
function renderTexts(){
 const root=$('v7TextStudio');if(!root)return;
 const prior=restore('back2u_v7_textDraft',{selected:0,text:TEMPLATES[0].value});
 const index=Number.isSafeInteger(Number(prior.selected))?Math.max(0,Math.min(TEMPLATES.length-1,Number(prior.selected))):0;
 root.innerHTML='<label class="v7-control-label">Vorlage<select id="v7TextSelect">'+TEMPLATES.map((x,i)=>'<option value="'+i+'" '+(i===index?'selected':'')+'>'+esc(x.name)+'</option>').join('')+'</select></label>'
 +'<label class="v7-control-label">Dein Text<textarea id="v7TextDraft" rows="5" maxlength="1800">'+esc(typeof prior.text==='string'?prior.text:TEMPLATES[index].value)+'</textarea></label>'
 +'<div class="v7-button-row"><button type="button" id="v7TextCopy">Text kopieren</button><span id="v7TextSaved">Auf diesem Gerät gespeichert</span></div>'
 +'<p class="v7-help">Bearbeitbare Entwürfe, keine automatisch veröffentlichten Kommentare. Dein eigener Stil bleibt wichtiger als eine feste Vorlage.</p>';
 const set=()=>store('back2u_v7_textDraft',{selected:Number($('v7TextSelect').value),text:$('v7TextDraft').value});
 $('v7TextSelect').addEventListener('change',()=>{$('v7TextDraft').value=TEMPLATES[Number($('v7TextSelect').value)].value;set()});
 $('v7TextDraft').addEventListener('input',set);
 $('v7TextCopy').addEventListener('click',async()=>{try{await navigator.clipboard.writeText($('v7TextDraft').value);$('v7TextSaved').textContent='Kopiert ✓'}catch{$('v7TextSaved').textContent='Bitte Text markieren und kopieren'}});
}
function rankFormats(m){
 const groups=new Map();
 for(const v of m.videos.filter(lifetime)){
  const k=v.platform+'|'+formatName(v);
  if(!groups.has(k))groups.set(k,[]);
  groups.get(k).push(v.views);
 }
 return [...groups].map(([name,a])=>({p:name.split('|')[0],format:name.split('|').slice(1).join('|'),n:a.length,median:median(a)})).filter(x=>x.n>=4).sort((a,b)=>b.median-a.median);
}
const availableSlots=['11:00','15:00','19:00','02:00'];
const PLAN_KEY='back2u_creator_scheduled_v73';
function planRows(formats,slots,days,platforms=['yt','ig','tt']){
 const rows=[];const date0=increment(today());
 for(let d=0;d<days;d++){
  const date=incrementBy(date0,d),daily=[];
  for(let i=0;i<slots.length;i++){
   const choice=formats[(d*slots.length+i)%formats.length];
   daily.push({time:slots[i],platform:choice?.p||(platforms.length?platforms[i%platforms.length]:'yt'),format:choice?.format||['Jumpstyle','Hakken','Edit','Outfit'][i%4]});
  }
  rows.push({date,daily});
 }
 return rows;
}
function incrementBy(date,offset){let d=new Date(date+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+offset);return d.toISOString().slice(0,10)}
function parseSlots(str){
 const out=[...new Set(String(str).split(/[,;\s]+/).map(s=>s.trim()).filter(x=>/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(x)))];
 return out.slice(0,6);
}
function renderPlanner(){
 const root=$('v7Planner');if(!root)return;
 const m=model(),selectedPlatforms=m.platforms.filter(p=>names[p]),best=rankFormats(m).filter(x=>selectedPlatforms.includes(x.p)),planStored=restore('back2u_v7_plan',{slots:'11:00, 15:00, 19:00, 02:00',days:3});
 const slots=parseSlots(planStored.slots);if(!slots.length)slots.push(...availableSlots);
 root.innerHTML='<p class="v7-help">Empfehlungen aus deinen bekannten Videos – keine automatische KI-Auswertung und kein automatisches Posten. Die Uhrzeiten sind deine Testslots, keine wissenschaftlich ermittelte Bestzeit. Auch 02:00 gilt kalendarisch am angezeigten Tag (nicht am Vorabend).</p>'
 +'<form id="v7PlannerForm" class="v7-planner-form"><label>Deine Uhrzeiten<input id="v7PlannerSlots" type="text" value="'+esc(planStored.slots)+'" placeholder="11:00, 15:00, 19:00, 02:00" /></label>'
 +'<label>Tage<select id="v7PlannerDays"><option value="3" '+(planStored.days===3?'selected':'')+'>Nächste 3 Tage</option><option value="7" '+(planStored.days===7?'selected':'')+'>Nächste 7 Tage</option></select></label><button type="submit">Plan erstellen</button></form>'
 +'<div class="v7-plan-insight"><strong>Formate mit guten bisherigen Ergebnissen</strong><p>'+(best.length?best.slice(0,3).map(x=>names[x.p]+' · '+esc(x.format)+' ('+x.n+' Videos)').join(' · '):'Noch zu wenige vergleichbare Videodaten für eine Rangfolge.')+'</p></div>'
 +'<div id="v7PlannerRows"></div><div class="v73-plan-actions"><button type="button" id="v73PlannerSave" class="v7-copy-plan">Ideen in Posting-Kalender übernehmen</button><button type="button" id="v7PlannerCopy" class="v7-copy-plan">Plan für ChatGPT kopieren</button></div><div id="v73PlanStatus" class="v73-plan-status" role="status" aria-live="polite"></div><p class="v7-help">Übernommene Ideen werden ausschließlich in diesem Browser als geplant gespeichert und niemals automatisch veröffentlicht. Sie zählen nicht zu deinen echten Uploads.</p>';
 const render=()=>{
  const rows=planRows(best,slots,Number(planStored.days)||3,selectedPlatforms);
  const lines=[];
  $('v7PlannerRows').innerHTML=rows.map(row=>{
   lines.push(row.date+': '+row.daily.map(v=>v.time+' '+names[v.platform]+' · '+v.format).join(', '));
   return '<details class="v7-plan-day" '+(row===rows[0]?'open':'')+'><summary>'+row.date.split('-').reverse().join('.')+' · '+row.daily.length+' Uploadideen</summary>'+row.daily.map((x,i)=>'<div><span>'+x.time+'</span><strong>'+names[x.platform]+'</strong><b>'+esc(x.format)+'</b><small>Idee '+(i+1)+'</small></div>').join('')+'</details>';
  }).join('');
  $('v73PlannerSave').onclick=()=>{
   const prior=restore(PLAN_KEY,[]);
   const entries=Array.isArray(prior)?prior.filter(x=>x&&typeof x==='object').slice(0,500):[];
   const signature=x=>[x.date,x.time,x.platform,x.format].join('|');
   const seen=new Set(entries.map(signature));
   let added=0;
   for(const row of rows)for(const item of row.daily){
    const record={date:row.date,time:item.time,platform:item.platform,format:String(item.format||'Videoidee').slice(0,90)};
    const sig=signature(record);
    if(seen.has(sig))continue;
    seen.add(sig);added++;
    entries.push({...record,id:'v73-'+Date.now().toString(36)+'-'+added,done:false});
   }
   if(entries.length>500){
    $('v73PlanStatus').textContent='Maximal 500 geplante Ideen gespeichert. Bitte ältere Einträge im Kalender entfernen.';return;
   }
   try{localStorage.setItem(PLAN_KEY,JSON.stringify(entries))}
   catch{$('v73PlanStatus').textContent='Lokales Speichern ist in diesem Browser nicht möglich. Bitte Browser-Speicher prüfen.';return}
   $('v73PlanStatus').textContent=added?added+' neue Ideen in deinem Posting-Kalender gespeichert (nur dieses Gerät).':'Keine neuen Einträge – diese Ideen sind bereits im Kalender.';
   if(added&&window.CustomEvent)window.dispatchEvent(new CustomEvent('back2u-plan-updated',{detail:{date:rows[0]?.date||null}}));
  };
  $('v7PlannerCopy').onclick=async()=>{
   const prompt='Plane meinen Jumpstyle-/Hakken-/Shuffle-Content anhand meiner echten Statistiken. Vorschlag für die nächsten Tage:\n'+lines.join('\n')+'\nOptimier Hooks, Aufnahmeideen und lange natürliche englische Captions. Berücksichtige, dass dies bisherige Gesamtaufrufe und keine kontrollierten Uploadzeit-Tests sind.';
   try{await navigator.clipboard.writeText(prompt);$('v7PlannerCopy').textContent='Für ChatGPT kopiert ✓'}catch{$('v7PlannerCopy').textContent='Kopieren nicht möglich – bitte Browser prüfen'}
  };
 };
 $('v7PlannerForm').addEventListener('submit',e=>{
  e.preventDefault();const valid=parseSlots($('v7PlannerSlots').value);
  if(!valid.length){$('v7PlannerSlots').setCustomValidity('Gib mindestens eine gültige Uhrzeit ein, z. B. 11:00.');$('v7PlannerSlots').reportValidity();return}
  slots.length=0;slots.push(...valid);
  planStored.slots=valid.join(', ');planStored.days=Number($('v7PlannerDays').value);store('back2u_v7_plan',planStored);render();
 });
 $('v7PlannerSlots').addEventListener('input',e=>e.target.setCustomValidity(''));
 render();
}
const api={experiments,audience,creator,dayPie,parseSlots,planRows,rankFormats,median,model};
window.BACK2U_V7=api;
if(window.BACK2U_V7_CHART_STATE)dayPie(window.BACK2U_V7_SELECTED_DAY||null,window.BACK2U_V7_CHART_STATE);
if(document.body?.dataset?.activeSection==='experiments')experiments();
if(document.body?.dataset?.activeSection==='audience')audience();
if(document.body?.dataset?.activeSection==='creator')creator();
})();