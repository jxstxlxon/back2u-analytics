/* BACK2U V8.0.8 visual stage – presentation-only.
 * Real analytics, auth, dates and filters are not read or modified here.
 * Decorative artwork never contains fictional metrics or blocking controls.
 */
(function(){
 'use strict';
 const $=s=>document.querySelector(s);
 const createStage=(parent,cls)=>{
  if(!parent)return null;
  const existing=parent.querySelector(':scope > .'+cls);
  if(existing)return existing;
  const stage=document.createElement('div');
  stage.className=cls;
  stage.setAttribute('aria-hidden','true');
  stage.setAttribute('role','presentation');
  const image=document.createElement('img');
  image.alt='';
  image.decoding='async';
  image.draggable=false;
  stage.appendChild(image);
  parent.appendChild(stage);
  return stage;
 };
 function update(){
  const themes=window.BACK2U_THEMES,artEngine=window.BACK2U_REFERENCE_ART;
  if(!themes||typeof artEngine!=='function')return;
  const preset=themes.get(themes.current());
  if(!preset)return;
  const art=artEngine(preset);
  if(!art||!art.url)return;
  const head=createStage($('.masthead'),'theme-world-stage');
  const hero=createStage($('#overview .hero-main'),'theme-hero-stage');
  for(const stage of [head,hero]){
   const img=stage?.querySelector('img');
   if(img&&img.getAttribute('src')!==art.url){
    img.src=art.url;
   }
  }
  const masthead=$('.masthead');
  if(masthead){
   let label=masthead.querySelector(':scope > .theme-world-stage-info');
   if(!label){
    label=document.createElement('div');
    label.className='theme-world-stage-info';
    label.setAttribute('aria-hidden','true');
    const strong=document.createElement('strong');
    const small=document.createElement('small');
    small.textContent='BACK2U • RETINA THEME WORLD';
    label.append(strong,small);
    masthead.appendChild(label);
   }
   const title=label.querySelector('strong');
   if(title)title.textContent=preset.name.replace(/^[0-9]+ · /,'');
  }
 }
 function setup(){
  update();
  window.addEventListener('back2u-theme-changed',update);
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',setup,{once:true});
 else setup();
})();