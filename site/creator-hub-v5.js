/* BACK2U Creator Hub V5 — real source-backed calendar, Hall of Fame, KPIs, goals and local notes.
   The page never treats missing reports as zero and never mixes period-video views into lifetime rankings. */
(function(){
'use strict';
const bridge=window.BACK2U_CREATOR_BRIDGE;
if(!bridge)return;
const $=id=>document.getElementById(id);
const fmt=n=>typeof n==='number'&&Number.isFinite(n)?new Intl.NumberFormat('de-DE',{maximumFractionDigits:0}).format(n):'–';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const P={yt:'YouTube',ig:'Instagram',tt:'TikTok'};
const DATA_KEY='back2u_creator_ideas_v1',GOAL_KEY='back2u_creator_views_goal_v1',PLAN_KEY='back2u_creator_scheduled_v73';
const iso=/^\d{4}-\d{2}-\d{2}$/;
const validDate=s=>iso.test(s)&&!Number.isNaN(Date.parse(s+'T12:00:00Z'));

// Only conservative, source-preserving crosspost suggestions.
// A matching title must contain >=3 words and be published within 2 days.
// Each platform can appear at most once in a group; all original rows survive.
function crosspostKey(title){
 const value=String(title||'')
  .replace(/https?:\/\/\S+|@[A-Za-z0-9_.]+|#[\p{L}\p{N}_]+/gu,' ')
  .normalize('NFKD').replace(/\p{M}/gu,'')
  .toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ')
  .trim().replace(/\s+/g,' ');
 const words=value.split(' ').filter(Boolean);
 return words.length>=3&&value.length>=13?value:null;
}
function crosspostGroups(videos){
 const groups=[],index=new Map();
 const ordered=videos.filter(v=>validDate(v.date)&&safeVideo(v)).slice()
  .sort((a,b)=>a.date.localeCompare(b.date)||String(a.platform).localeCompare(String(b.platform))||String(a.id||'').localeCompare(String(b.id||'')));
 for(const video of ordered){
  const key=crosspostKey(video.title);
  let found=null;
  if(key){
   const candidates=index.get(key)||[];
   for(const group of candidates){
    if(group.items.some(item=>item.platform===video.platform))continue;
    const closest=Math.min(...group.items.map(item=>Math.abs(Date.parse(item.date+'T12:00:00Z')-Date.parse(video.date+'T12:00:00Z'))/86400000));
    if(closest<=2&&(!found||closest<found.distance))found={group,distance:closest};
   }
  }
  if(found){found.group.items.push(video);continue}
  const group={date:video.date,title:video.title||'Video ohne Titel',items:[video]};
  groups.push(group);
  if(key){if(!index.has(key))index.set(key,[]);index.get(key).push(group)}
 }
 return groups.sort((a,b)=>a.date.localeCompare(b.date)||String(a.title||'').localeCompare(String(b.title||'')));
}

const now=()=>new Date().toLocaleDateString('sv-SE',{timeZone:'Europe/Berlin'});
let month=now().slice(0,7),selectedDay=null,lastModel=null;
const load=(key,fallback)=>{try{const x=JSON.parse(localStorage.getItem(key)||'null');return x===null?fallback:x}catch{return fallback}};
const save=(key,value)=>{try{localStorage.setItem(key,JSON.stringify(value))}catch{}};
function readPlanned(){
 const raw=load(PLAN_KEY,[]);
 if(!Array.isArray(raw))return [];
 return raw.slice(0,500).filter(v=>v&&typeof v==='object'&&validDate(v.date)&&/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(String(v.time||''))&&['yt','ig','tt'].includes(v.platform))
 .map(v=>({id:String(v.id||'').slice(0,64),date:v.date,time:v.time,platform:v.platform,format:String(v.format||'Videoidee').slice(0,90),done:!!v.done}))
 .filter(v=>v.id);
}
const knownTotal=v=>v.reportType==='lifetime'&&typeof v.views==='number'&&Number.isFinite(v.views)&&v.views>=0;
const safeVideo=v=>v&&['yt','ig','tt'].includes(v.platform);
function createModel(){
 const raw=bridge.snapshot(),videos=raw.videos.filter(safeVideo);
 const lifetime=videos.filter(knownTotal).sort((a,b)=>b.views-a.views);
 const total=lifetime.length?lifetime.reduce((acc,v)=>acc+v.views,0):null;
 const avg=lifetime.length?Math.round(total/lifetime.length):null;
 const byDay=new Map();
 for(const video of videos){
  if(!validDate(video.date))continue;
  if(!byDay.has(video.date))byDay.set(video.date,[]);
  byDay.get(video.date).push(video);
 }
 const postDays=[...byDay.keys()].sort();
 let longest=0,run=0,previous=null;
 for(const d of postDays){
  const serial=Date.parse(d+'T12:00:00Z')/86400000;
  run=previous!==null&&serial===previous+1?run+1:1;
  longest=Math.max(longest,run);previous=serial;
 }
 const totalFollowers=raw.follower.filter(x=>typeof x.count==='number'&&Number.isFinite(x.count)&&x.count>=0);
 const followers=totalFollowers.length===3?totalFollowers.reduce((s,x)=>s+x.count,0):null;
 const byReportDay=new Map();
 for(const source of raw.daily){
  for(const point of source.days){
   if(!validDate(point.d)||typeof point.views!=='number'||!Number.isFinite(point.views)||point.views<0)continue;
   let entry=byReportDay.get(point.d);
   if(!entry){entry={date:point.d,total:0,platforms:new Set()};byReportDay.set(point.d,entry)}
   if(entry.platforms.has(source.platform))continue;
   entry.total+=point.views;entry.platforms.add(source.platform);
  }
 }
 const full=[...byReportDay.values()].filter(d=>d.platforms.size===3);
 const sourceDays=full.length?full:[...byReportDay.values()];
 const record=sourceDays.reduce((best,x)=>!best||x.total>best.total?x:best,null);
 const badges=[];
 for(const [limit,label,emoji] of [[100000,'100.000 Videoaufrufe','✦'],[1000000,'1 Million Videoaufrufe','💎'],[5000000,'5 Millionen Videoaufrufe','👑']]){
  if(total!==null&&total>=limit)badges.push({label,emoji});
 }
 for(const stand of raw.follower){
  if(typeof stand.count!=='number')continue;
  for(const threshold of [1000,5000,10000]){
   if(stand.count>=threshold)badges.push({label:fmt(threshold)+' '+(stand.platform==='yt'?'Abos':'Follower')+' · '+(P[stand.platform]||''),emoji:'🏅'});
  }
 }
 if(longest>=7)badges.push({label:fmt(longest)+' Tage am Stück gepostet (erfasst)',emoji:'🔥'});
 return {raw,videos,lifetime,total,avg,byDay,postDays,longest,followers,knownFollowers:totalFollowers.length,record,recordComplete:full.length>0,badges};
}
function nearestGoal(total){
 if(total===null)return 100000;
 const thresholds=[100000,250000,500000,1000000,2000000,5000000,10000000,20000000,50000000,100000000];
 return thresholds.find(x=>x>total)||Math.ceil(total/10000000+1)*10000000;
}
function getGoal(total){
 const val=Number(load(GOAL_KEY,null));
 return Number.isSafeInteger(val)&&val>0&&val<=1000000000000?val:nearestGoal(total);
}
function renderKpis(m){
 const cells=[
  ['Ø Aufrufe pro Video',fmt(m.avg),m.lifetime.length?fmt(m.lifetime.length)+' Videos mit bekannten Gesamtwerten':'Noch keine vergleichbaren Gesamtaufrufe','◈'],
  ['Dein bester erfasster Tag',m.record?fmt(m.record.total):'–',m.record?m.record.date.split('-').reverse().join('.')+(m.recordComplete?' · alle 3 Plattformen':' · nur vorhandene Zahlen'):'Keine passenden Tageszahlen','✧'],
  ['Posting-Serie',m.longest?fmt(m.longest)+' Tage':'–',m.longest?'Längste Folge mit mindestens einem Upload pro Tag':'Noch keine Uploadtage erfasst','🔥'],
  ['Follower & Abonnenten',fmt(m.followers),m.knownFollowers===3?'Drei erfasste Kontostände, nicht eindeutige Personen':'Für eine Gesamtsumme fehlen Kontostände','✦']
 ];
 $('creatorKpis').innerHTML=cells.map(x=>'<article class="glass creator-stat"><span class="creator-stat-icon">'+x[3]+'</span><small>'+esc(x[0])+'</small><strong>'+esc(x[1])+'</strong><p>'+esc(x[2])+'</p></article>').join('');
}
function renderHall(m){
 if(!m.lifetime.length){$('creatorHall').innerHTML='<p class="creator-empty">Für ein sicheres Ranking fehlen noch Video-Gesamtaufrufe.</p>';return}
 $('creatorHall').innerHTML=m.lifetime.slice(0,3).map((v,i)=>{
  const medal=['🥇','🥈','🥉'][i],p=P[v.platform]||v.platform;
  return '<div class="creator-hall-row"><span class="creator-medal">'+medal+'</span><div class="creator-hall-title"><strong>'+esc(v.title||'Video ohne Titel')+'</strong><small>'+esc(p)+(validDate(v.date)?' · '+esc(v.date.split('-').reverse().join('.')):'')+'</small></div><b>'+fmt(v.views)+'<small>Aufrufe</small></b></div>';
 }).join('');
}
function parseGoalInput(raw){
 const s=String(raw||'').trim().toLowerCase().replace(/\s+/g,'').replace(',','.');
 const match=/^(\d+(?:\.\d+)?)([km]?)$/.exec(s);
 if(!match)return null;
 const unit=match[2]==='m'?1000000:match[2]==='k'?1000:1;
 const value=Number(match[1])*unit;
 return Number.isSafeInteger(value)&&value>=1&&value<=1e12?value:null;
}
function shortened(n){
 if(n>=1e6&&n%1e6===0)return String(n/1e6)+'m';
 if(n>=1000&&n%1000===0)return String(n/1000)+'k';
 return String(n);
}
function renderGoals(m){
 const goal=getGoal(m.total),percentage=m.total===null?0:Math.max(0,Math.min(100,Math.round(m.total/goal*100)));
 $('creatorGoals').innerHTML='<div class="creator-goal-progress"><strong>'+fmt(m.total)+' <span>von '+fmt(goal)+' Aufrufen</span></strong><div class="creator-progress-track" role="progressbar" aria-valuemin="0" aria-valuemax="'+goal+'" aria-valuenow="'+(m.total||0)+'"><div style="width:'+percentage+'%"></div></div><p>'+percentage+' % erreicht'+(m.total===null?' · Video-Gesamtzahlen fehlen':'')+'</p></div>'
 +'<form id="creatorGoalForm" class="creator-goal-form"><label for="creatorGoalInput">Mein nächstes Ziel · z. B. 10k oder 10m</label><div><input id="creatorGoalInput" type="text" inputmode="decimal" maxlength="18" pattern="[0-9.,kKmM ]+" value="'+shortened(goal)+'" placeholder="z. B. 10m" required/><button type="submit">Ziel speichern</button></div></form>'
 +'<p class="creator-small-note">Gezählt werden nur Videos mit bekannten Gesamtaufrufen. Fehlende Videos sind nicht enthalten.</p>';
 $('creatorGoalForm').addEventListener('submit',e=>{
  e.preventDefault();const value=parseGoalInput($('creatorGoalInput').value);
  if(!Number.isSafeInteger(value)||value<1||value>1e12){$('creatorGoalInput').setCustomValidity('Bitte ein gültiges Ziel zwischen 1 und einer Billion eingeben.');$('creatorGoalInput').reportValidity();return}
  $('creatorGoalInput').setCustomValidity('');save(GOAL_KEY,value);renderGoals(m);
 });
 $('creatorGoalInput').addEventListener('input',e=>e.target.setCustomValidity(''));
}
function monthDays(value){
 const [year,mo]=value.split('-').map(Number);
 const first=new Date(Date.UTC(year,mo-1,1)),count=new Date(Date.UTC(year,mo,0)).getUTCDate();
 return {offset:(first.getUTCDay()+6)%7,count};
}
function shiftMonth(value,delta){
 let [year,mon]=value.split('-').map(Number);const d=new Date(Date.UTC(year,mon-1+delta,1));
 return d.getUTCFullYear()+'-'+String(d.getUTCMonth()+1).padStart(2,'0');
}
function renderCalendar(m){
 const [y,mo]=month.split('-').map(Number);
 $('creatorMonthLabel').textContent=new Intl.DateTimeFormat('de-DE',{month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(Date.UTC(y,mo-1,1)));
 const names=['Mo','Di','Mi','Do','Fr','Sa','So'];
 const info=monthDays(month);
 const allClipGroups=crosspostGroups(m.videos);
 const monthlyGroups=allClipGroups.filter(g=>g.date.startsWith(month+'-'));
 const groupsByDay=new Map();
 for(const group of monthlyGroups){
  if(!groupsByDay.has(group.date))groupsByDay.set(group.date,[]);
  groupsByDay.get(group.date).push(group);
 }
 const monthlyVideos=m.videos.filter(v=>validDate(v.date)&&v.date.startsWith(month+'-'));
 const monthlyPlans=readPlanned().filter(v=>v.date.startsWith(month+'-'));
 const plansByDay=new Map();
 for(const v of monthlyPlans){
  if(!plansByDay.has(v.date))plansByDay.set(v.date,[]);
  plansByDay.get(v.date).push(v);
 }
 for(const entries of plansByDay.values())entries.sort((a,b)=>a.time.localeCompare(b.time));
 const activeDates=new Set(monthlyGroups.map(g=>g.date));
 const validLifetime=monthlyVideos.filter(knownTotal);
 const lifetimeViews=validLifetime.length?validLifetime.reduce((n,v)=>n+v.views,0):null;
 const prev=shiftMonth(month,-1);
 const previousCount=allClipGroups.filter(g=>g.date.startsWith(prev+'-')).length;
 const completeMonth=month<now().slice(0,7);
 const viewNote=validLifetime.length<monthlyVideos.length?'Einige Video-Gesamtzahlen fehlen':'Gesamtaufrufe dieser Videos bis jetzt';
 $('creatorMonthSummary').innerHTML=[
  ['Videos (gruppiert)',fmt(monthlyGroups.length),fmt(monthlyVideos.length)+' Plattform-Uploads · '+(completeMonth?'Vormonat: '+fmt(previousCount)+' Clips':'laufender Monat')],
  ['Tage mit Posts',fmt(activeDates.size),'Mindestens ein Video veröffentlicht'],
  ['Aufrufe dieser Videos',fmt(lifetimeViews),viewNote],
  ['Geplante Ideen',fmt(monthlyPlans.length),'Nur lokal gespeichert · keine veröffentlichten Videos']
 ].map(x=>'<div class="creator-month-stat"><small>'+esc(x[0])+'</small><strong>'+esc(x[1])+'</strong><span>'+esc(x[2])+'</span></div>').join('');
 let html=names.map(name=>'<span class="creator-cal-weekday">'+name+'</span>').join('');
 for(let i=0;i<info.offset;i++)html+='<span class="creator-cal-empty"></span>';
 for(let day=1;day<=info.count;day++){
  const key=month+'-'+String(day).padStart(2,'0'),posts=m.byDay.get(key)||[],clips=groupsByDay.get(key)||[],planned=plansByDay.get(key)||[];
  const known=posts.filter(knownTotal),views=known.length?known.reduce((n,v)=>n+v.views,0):null;
  const platformCount=['yt','ig','tt'].map(p=>posts.filter(v=>v.platform===p).length);
  const platformDots='<span class="creator-cal-platforms">'+platformCount.map((n,i)=>n?'<i data-p="'+['yt','ig','tt'][i]+'" title="'+['YouTube','Instagram','TikTok'][i]+': '+n+'">'+n+'</i>':'').join('')+'</span>';
  const label=key+' · '+clips.length+' Videogruppen aus '+posts.length+' Plattform-Uploads, '+planned.length+' geplante Ideen'+(views===null?'':', '+fmt(views)+' bekannte Plattformaufrufe');
  html+='<button type="button" class="creator-cal-day'+(clips.length?' has-posts':'')+(planned.length?' has-plan':'')+(key===selectedDay?' selected':'')+'" data-date="'+key+'" aria-label="'+esc(label)+'"><strong>'+day+'</strong>'+(clips.length?'<span>'+clips.length+' '+(clips.length===1?'Clip':'Clips')+'</span>'+platformDots+'<small>'+posts.length+' Plattformposts'+(views===null?'':' · '+fmt(views)+' Aufrufe')+'</small>':(planned.length?'':'<span class="creator-no-post">·</span>'))+(planned.length?'<small class="v73-planned-label">'+planned.length+' geplant</small>':'')+'</button>';
 }
 $('creatorCalendar').innerHTML=html;
 $('creatorCalendar').querySelectorAll('[data-date]').forEach(btn=>btn.addEventListener('click',()=>{selectedDay=btn.dataset.date;renderCalendar(m)}));
 if(!selectedDay||!selectedDay.startsWith(month+'-')){
  const keys=[...new Set([...groupsByDay.keys(),...plansByDay.keys()])].filter(d=>d.startsWith(month+'-')).sort();
  selectedDay=keys.at(-1)||month+'-01';
 }
 // Preserve selection styling when the user changes months.
 $('creatorCalendar').querySelectorAll('[data-date]').forEach(btn=>btn.classList.toggle('selected',btn.dataset.date===selectedDay));
 const entries=groupsByDay.get(selectedDay)||[],planned=plansByDay.get(selectedDay)||[];
 $('creatorDayDetail').innerHTML='<div class="creator-day-header"><strong>'+esc(selectedDay.split('-').reverse().join('.'))+'</strong><span>'+entries.length+' '+(entries.length===1?'Videogruppe':'Videogruppen')+' · Crossposts zusammengefasst</span></div>'
 +(entries.length?entries.slice(0,32).map(group=>{
  const video=group.items.find(x=>/^https:\/\//i.test(String(x.thumb||'')))||group.items[0];
  const thumb=String(video.thumb||'');
  const caption=esc(group.title||'Video ohne Titel');
  const medal=/^https:\/\//i.test(thumb)?'<img src="'+esc(thumb)+'" alt="" loading="lazy" decoding="async"/>':'<span>▶</span>';
  const totals=group.items.filter(knownTotal);
  const groupViews=totals.length?fmt(totals.reduce((n,v)=>n+v.views,0)):'–';
  const variants=group.items.slice().sort((a,b)=>['yt','ig','tt'].indexOf(a.platform)-['yt','ig','tt'].indexOf(b.platform));
  return '<article class="creator-day-video v7-day-video v74-clip-group"><div class="v7-day-thumb">'+medal+'</div><div class="v7-day-body">'
   +'<strong class="v74-clip-title">'+caption+'</strong>'
   +'<small>'+group.items.length+' Plattform'+(group.items.length===1?'':'en')+' · '+groupViews+' bekannte Plattformaufrufe (keine Unique Views)</small>'
   +'<div class="v74-clip-platforms">'+variants.map(v=>{
    const name=esc(P[v.platform]||v.platform);
    const validLink=/^https:\/\/(?:www\.)?(?:youtube\.com|youtu\.be|instagram\.com|tiktok\.com)\//i.test(String(v.url||''));
    const caption=validLink?'<a href="'+esc(v.url)+'" target="_blank" rel="noopener noreferrer">'+name+' ↗</a>':'<span>'+name+'</span>';
    const label=knownTotal(v)?fmt(v.views)+' Aufrufe':'Aufrufe: –';
    return '<div class="v74-clip-platform" data-platform="'+esc(v.platform)+'">'+caption+'<small>'+label+' · '+esc(v.date.split('-').reverse().join('.'))+'</small></div>';
   }).join('')+'</div></div></article>';
 }).join(''):'<p class="creator-empty">Für diesen Tag sind keine Videogruppen erfasst.</p>')
 +(entries.length>32?'<small>Weitere '+fmt(entries.length-32)+' Videogruppen findest du im Video Radar.</small>':'')
 +'<p class="v74-clip-method">Crossposts mit gleichem eindeutigen Titel innerhalb von 2 Tagen werden dem ersten Veröffentlichungstag zugeordnet. Das ist eine vorsichtige automatische Zuordnung: abweichende Titel bleiben getrennt. Die Plattformwerte und Veröffentlichungstage bleiben sichtbar.</p>'
 +(planned.length?'<div class="v73-day-plans"><h4>Geplante Ideen <small>Nur lokal gespeichert · keine Upload-Nachweise</small></h4>'+planned.map(v=>
   '<div class="v73-plan-entry'+(v.done?' done':'')+'"><label><input type="checkbox" data-plan-done="'+esc(v.id)+'" '+(v.done?'checked':'')+'/><span>'+esc(v.time)+' · '+esc(P[v.platform])+' · '+esc(v.format)+'</span></label><button type="button" data-plan-remove="'+esc(v.id)+'" aria-label="Geplante Idee entfernen">✕</button></div>'
  ).join('')+'</div>':'');
 $('creatorDayDetail').querySelectorAll('[data-plan-done]').forEach(box=>box.addEventListener('change',()=>{
  const next=readPlanned().map(v=>v.id===box.dataset.planDone?{...v,done:box.checked}:v);save(PLAN_KEY,next);renderCalendar(m);
 }));
 $('creatorDayDetail').querySelectorAll('[data-plan-remove]').forEach(btn=>btn.addEventListener('click',()=>{
  save(PLAN_KEY,readPlanned().filter(v=>v.id!==btn.dataset.planRemove));renderCalendar(m);
 }));
}
function renderMilestones(m){
 $('creatorMilestones').innerHTML=m.badges.length?m.badges.slice(0,9).map(x=>'<div class="creator-milestone"><span>'+x.emoji+'</span><strong>'+esc(x.label)+'</strong></div>').join(''):'<p class="creator-empty">Sobald ein Meilenstein sicher belegt ist, erscheint hier ein Abzeichen.</p>';
}
function readIdeas(){
 const raw=load(DATA_KEY,[]);
 return Array.isArray(raw)?raw.filter(x=>x&&typeof x.text==='string').slice(0,50).map(x=>({id:String(x.id||''),text:x.text.slice(0,160),done:!!x.done})):[];
}
function renderIdeas(){
 const list=readIdeas();
 $('creatorIdeas').innerHTML=list.length?list.map(x=>'<div class="creator-idea'+(x.done?' done':'')+'"><label><input type="checkbox" data-idea-done="'+esc(x.id)+'" '+(x.done?'checked':'')+'/><span>'+esc(x.text)+'</span></label><button type="button" data-idea-remove="'+esc(x.id)+'" aria-label="Idee entfernen">✕</button></div>').join(''):'<p class="creator-empty">Noch keine Idee gespeichert. Dein nächster Videohit könnte hier anfangen.</p>';
 $('creatorIdeas').querySelectorAll('[data-idea-done]').forEach(el=>el.addEventListener('change',()=>{
  const next=readIdeas().map(x=>x.id===el.dataset.ideaDone?{...x,done:el.checked}:x);save(DATA_KEY,next);renderIdeas();
 }));
 $('creatorIdeas').querySelectorAll('[data-idea-remove]').forEach(el=>el.addEventListener('click',()=>{
  save(DATA_KEY,readIdeas().filter(x=>x.id!==el.dataset.ideaRemove));renderIdeas();
 }));
}
$('creatorPrev').addEventListener('click',()=>{month=shiftMonth(month,-1);selectedDay=null;renderCalendar(lastModel)});
$('creatorNext').addEventListener('click',()=>{month=shiftMonth(month,1);selectedDay=null;renderCalendar(lastModel)});
$('creatorIdeaForm').addEventListener('submit',e=>{
 e.preventDefault();const inp=$('creatorIdeaInput'),v=inp.value.trim();if(!v)return;
 const list=readIdeas();if(list.length>=50){inp.setCustomValidity('Maximal 50 Ideen gleichzeitig.');inp.reportValidity();return}
 const id=String(Date.now())+'-'+Math.random().toString(36).slice(2,7);list.unshift({id,text:v.slice(0,160),done:false});
 save(DATA_KEY,list);inp.value='';inp.setCustomValidity('');renderIdeas();
});
$('creatorIdeaInput').addEventListener('input',e=>e.target.setCustomValidity(''));
function render(){
 lastModel=createModel();
 renderKpis(lastModel);renderHall(lastModel);renderGoals(lastModel);renderCalendar(lastModel);renderMilestones(lastModel);renderIdeas();
 $('creatorMethodNote').textContent='Alle Werte stammen aus deinen gespeicherten Videos und Berichten. Nicht vorhandene Zahlen werden nicht als Null dargestellt. Videoaufrufe sind bisherige Gesamtwerte – keine Aufrufe am Uploadtag. Ideen und Ziele bleiben nur auf diesem Gerät gespeichert.'+(lastModel.raw.lastUpdated?' Letzter Datenabgleich: '+new Date(lastModel.raw.lastUpdated).toLocaleString('de-DE')+'.':'');
}
window.addEventListener('back2u-plan-updated',e=>{
 const date=e.detail?.date;
 if(validDate(date)){month=date.slice(0,7);selectedDay=date}
 if(lastModel)renderCalendar(lastModel);
});
window.BACK2U_CREATOR_HUB={render,model:createModel,readPlanned,crosspostGroups};
})();