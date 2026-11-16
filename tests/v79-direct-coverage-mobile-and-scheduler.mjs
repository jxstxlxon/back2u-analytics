import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {isLegacyThirtyMinuteCron} from '../cloudflare/sync-schedule.js';

const html=readFileSync(new URL('../site/index.html',import.meta.url),'utf8');
const code=readFileSync(new URL('../site/audience-import.js',import.meta.url),'utf8');
const css=readFileSync(new URL('../site/workspace-v78.css',import.meta.url),'utf8');
const wrangler=JSON.parse(readFileSync(new URL('../wrangler.cloudflare.jsonc',import.meta.url),'utf8'));
assert.equal(wrangler.triggers.crons.length,1,'Do not add parallel duplicate schedules');
assert.equal(wrangler.triggers.crons[0],'*/30 * * * *',
 'Repo configuration must match observed 30-minute production trigger');
assert.equal(isLegacyThirtyMinuteCron(wrangler.triggers.crons[0]),true,
 'Worker must execute all four logical source groups on a two-tick cron');
assert.ok(html.includes('id="directParityRefresh"'));
assert.ok(html.includes('src="/audience-import.js?v=4"'));
assert.ok(html.includes('href="/workspace-v78.css?v=2"'));
assert.ok(code.includes("await refreshDirectParity();"));
assert.ok(code.includes("$('directParityRefresh')?.addEventListener('click',refreshDirectParity)"));
assert.ok(code.includes("const audit=await api('/api/direct-parity')"));
assert.ok(code.includes("if(access.role!=='admin')return"));
assert.ok(css.includes('.direct-coverage-groups{display:grid;grid-template-columns:repeat(2,minmax(0,1fr))'));
assert.ok(css.includes('.direct-coverage-groups{grid-template-columns:minmax(0,1fr)}'));
assert.ok(css.includes('.direct-coverage-details>summary:focus-visible'));
class Element{
 constructor(tag='div'){
  this.tag=tag;this.children=[];this.attributes={};this.style={};this.textContent='';this.className='';
 }
 append(...nodes){this.children.push(...nodes);}
 replaceChildren(...nodes){this.children=[...nodes];}
 setAttribute(key,value){this.attributes[key]=value;}
}
const target=new Element('div');
const document={createElement:tag=>new Element(tag)};
const start=code.indexOf('function renderDirectParity(');
const end=code.indexOf('\n async function refreshDirectParity(',start);
assert.ok(start>=0&&end>start);
const render=vm.runInNewContext(code.slice(start,end)+'\n;renderDirectParity',{
 $:key=>key==='directParityStatus'?target:null,document
});
const ids=['yt_audience','yt_media','yt_7_insights','yt_28_insights','yt_90_insights','yt_daily',
 'ig_audience','ig_media','ig_daily_views','ig_daily_reach','ig_daily_interactions','ig_reels'];
const checks=ids.map((id,i)=>({id,label:'Check '+i,details:i===11?'<img src=x onerror=alert(1)>':'Report '+i,pass:i<8}));
render({summary:{passed:8,total:12},checks});
assert.equal(target.children.length,3,'Compact summary, collapsible details, source disclosure');
const summary=target.children[0],details=target.children[1],note=target.children[2];
assert.equal(summary.className,'direct-coverage-summary');
assert.match(summary.children[0].textContent,/8\/12/);
assert.match(summary.children[1].textContent,/4 Prüfungen offen/);
const progress=summary.children[2];
assert.equal(progress.attributes['aria-valuenow'],'8');
assert.equal(progress.attributes['aria-valuemax'],'12');
assert.equal(progress.children[0].style.width,'67%');
assert.equal(details.tag,'details','Twelve rows must not overwhelm the iPhone viewport');
assert.match(details.children[0].textContent,/4 offen/);
const groups=details.children[1];
assert.equal(groups.children.length,2);
assert.equal(groups.children[0].children.length,7,'YouTube title + six source checks');
assert.equal(groups.children[1].children.length,7,'Instagram title + six source checks');
assert.equal(groups.children[1].children.at(-1).children[1].children[1].textContent,
 '<img src=x onerror=alert(1)>','Source text must remain inert, not interpreted as HTML');
assert.match(note.textContent,/Kein automatischer Wechsel von Windsor.ai/);
render({checks:[]});
assert.equal(target.children.length,1,'A missing API payload cannot masquerade as full coverage');
assert.match(target.children[0].children[0].textContent,/Noch kein überprüfbarer/);
render({checks:ids.map(id=>({id,label:id,details:'OK',pass:true}))});
assert.equal(target.children[0].children[2].children[0].style.width,'100%');
assert.match(target.children[0].children[1].textContent,/zusätzlich erforderlich/);
console.log('OK 12-check source audit: grouped YouTube/Instagram, mobile collapse, safe text, explicit incomplete status, no Windsor auto-disable and exact 30-minute Cron');
