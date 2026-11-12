/* BACK2U guest-access V7.3: UI only. Authorization is enforced in Cloudflare Worker. */
(function(){
'use strict';
const $=id=>document.getElementById(id);
const esc=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const fmtDate=ms=>new Date(ms).toLocaleString('de-DE',{dateStyle:'medium',timeStyle:'short',timeZone:'Europe/Berlin'});
const get=async(path,opts={})=>{
 const res=await fetch(path,{credentials:'same-origin',cache:'no-store',...opts});
 const data=await res.json().catch(()=>({}));
 if(!res.ok)throw new Error(data.error||'Fehler '+res.status);
 return data;
};
const status=message=>{if($('guestAccessStatus'))$('guestAccessStatus').textContent=message};
const lockingSelectors=[
 '#exportJson','#tiktokSyncNow','#tiktokAuditNow','#storySave',
 '#creatorGoalForm input','#creatorGoalForm button',
 '#creatorIdeaForm input','#creatorIdeaForm button',
 '#creatorIdeas input','#creatorIdeas button',
 '#creatorDayDetail [data-plan-done]','#creatorDayDetail [data-plan-remove]',
 '#v7AbForm input','#v7AbForm button',
 '#v7PlannerForm input','#v7PlannerForm select','#v7PlannerForm button',
 '#v73PlannerSave','#v7PlannerCopy',
 '#v7TextStudio textarea','#v7TextStudio select','#v7TextStudio button',
 '#storyOverlay input','#storyOverlay textarea','#storyOverlay select',
 '#storyOverlay button:not(#storyClose)'
];
const lockedSelector=lockingSelectors.join(',');
function lockGuestEdits(){
 document.querySelectorAll(lockedSelector).forEach(el=>{
  if(!el.disabled)el.disabled=true;
  el.setAttribute('title','Gastmodus: nur betrachten; Design darf lokal angepasst werden');
 });
}
async function listLinks(){
 const dest=$('guestAccessList');if(!dest)return;
 const data=await get('/api/guest-links');
 if(!data.links?.length){dest.innerHTML='<p class="guest-access-help">Noch keine Einladungen erstellt.</p>';return}
 const now=Date.now();
 dest.innerHTML=data.links.map(link=>{
  const state=link.revokedAt?'Widerrufen':link.expiresAt<=now?'Abgelaufen':'Aktiv';
  return '<div class="guest-access-row"><div><strong>'+esc(link.label)+'</strong>'
   +'<small>'+state+' · Ablauf '+fmtDate(link.expiresAt)+'</small></div>'
   +(state==='Aktiv'?'<button type="button" data-revoke-guest="'+esc(link.id)+'" aria-label="Gastzugang für '+esc(link.label)+' widerrufen">Widerrufen</button>':'')+'</div>';
 }).join('');
 dest.querySelectorAll('[data-revoke-guest]').forEach(btn=>btn.addEventListener('click',async()=>{
  if(!confirm('Diesen Gastzugang sofort widerrufen? Bereits angesehene Daten lassen sich nicht zurückholen.'))return;
  btn.disabled=true;
  try{
   await get('/api/guest-links/'+encodeURIComponent(btn.dataset.revokeGuest),{method:'DELETE'});
   status('Gastzugang widerrufen. Weitere Zugriffe werden abgelehnt.');
   await listLinks();
  }catch(e){btn.disabled=false;status(e.message)}
 }));
}
function adminPanel(){
 const panel=$('guestAccessPanel');if(!panel)return;
 panel.hidden=false;
 $('guestAccessForm').addEventListener('submit',async e=>{
  e.preventDefault();
  const btn=$('guestAccessCreate');btn.disabled=true;status('Erstelle sicheren Einladungslink …');
  try{
   const data=await get('/api/guest-links',{method:'POST',headers:{'content-type':'application/json'},
    body:JSON.stringify({label:$('guestAccessLabel').value.trim(),durationSeconds:Number($('guestAccessDuration').value)})});
   $('guestAccessNewLink').value=data.link;
   $('guestAccessCreated').hidden=false;
   status('Einladung gültig bis '+fmtDate(data.expiresAt)+'. Nur jetzt ist der vollständige Link abrufbar.');
   await listLinks();
  }catch(e){status(e.message)}
  finally{btn.disabled=false}
 });
 $('guestAccessCopy').addEventListener('click',async()=>{
  const field=$('guestAccessNewLink');if(!field.value)return;
  try{await navigator.clipboard.writeText(field.value);status('Gastlink kopiert. Teile ihn nur mit Personen, denen du deine Statistiken zeigen möchtest.')}
  catch{
   field.focus();field.select();
   if(document.execCommand?.('copy'))status('Gastlink kopiert.');
   else status('Bitte den Link markieren und manuell kopieren.');
  }
 });
 $('guestAccessRefresh').addEventListener('click',()=>listLinks().catch(e=>status(e.message)));
 listLinks().catch(e=>status(e.message));
}
function guestBanner(expiresAt){
 document.body.dataset.back2uAccessRole='guest';
 const banner=$('guestAccessBanner');if(banner){
  banner.hidden=false;
  banner.innerHTML='<span><strong>Gastansicht · Nur Lesen</strong><small>Design und Themes kannst du auf deinem eigenen Gerät ändern. Zugang bis '+fmtDate(expiresAt)+'.</small></span><button type="button" id="guestLogout">Gastansicht verlassen</button>';
  $('guestLogout').addEventListener('click',async()=>{
   await fetch('/api/logout',{credentials:'same-origin',cache:'no-store'}).catch(()=>{});
   location.replace('/');
  });
 }
 lockGuestEdits();
 const observer=new MutationObserver(()=>lockGuestEdits());
 observer.observe(document.body,{childList:true,subtree:true});
 window.setInterval(async()=>{
  try{
   const access=await get('/api/access');
   if(access.role!=='guest'||Number(access.expiresAt)<=Date.now())location.replace('/');
  }catch{location.replace('/')}
 },60000);
}
async function init(){
 if(location.protocol==='file:')return;
 let access;try{access=await get('/api/access')}catch{return}
 if(access.role==='admin'){
  document.body.dataset.back2uAccessRole='admin';
  adminPanel();
 }else if(access.role==='guest'){
  guestBanner(access.expiresAt);
 }
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
else init();
})();