import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const workflow=readFileSync(new URL('../.github/workflows/production-ui-smoke.yml',import.meta.url),'utf8');
const worker=readFileSync(new URL('../cloudflare/worker.js',import.meta.url),'utf8');
const html=readFileSync(new URL('../site/index.html',import.meta.url),'utf8');
const css=readFileSync(new URL('../site/workspace-v78.css',import.meta.url),'utf8');

assert.ok(workflow.includes('name: Check BACK2U live PC and iPhone layout'));
assert.ok(workflow.includes('branches: [cloudflare-migration]'));
assert.ok(workflow.includes('workflow_dispatch:'));
assert.ok(workflow.includes('permissions:\n  contents: read'));
assert.ok(workflow.includes('https://back2u-cloud.leon-mueller0806.workers.dev'));
assert.ok(workflow.includes('curl -fsSL --max-time 12'));
assert.ok(workflow.includes('BACK2U_LIVE_LAYOUT=NOT_YET_DEPLOYED_OR_INACCESSIBLE'));
assert.ok(workflow.includes('BACK2U_LIVE_LAYOUT=VERIFIED'));

// The root path and static CSS are login-protected. An anonymous workflow
// cannot test them: it would download only the login shell and falsely fail.
assert.ok(workflow.includes('"$base/api/layout-verify" -o /tmp/back2u-layout-probe.json'));
assert.ok(!workflow.includes('"$base/" -o /tmp/back2u-live-index.html'));
assert.ok(!workflow.includes('"$base/workspace-v78.css" -o /tmp/back2u-live-workspace.css'));
for(const forbidden of ['/api/snapshot','/api/direct-parity','/api/access','/api/audience',
 '/api/login','Authorization:','DASHBOARD_PASSWORD','SESSION_SECRET','cookies.txt'])
 assert.ok(!workflow.includes(forbidden),'Unsafe production smoke reference: '+forbidden);
const start=worker.indexOf("if(path==='/api/layout-verify')");
const end=worker.indexOf("if(path==='/api/login')",start);
assert.ok(start>0&&end>start,'Public layout verifier must precede login guard');
const route=worker.slice(start,end);
assert.ok(route.includes('env.ASSETS.fetch('),'Check actual deployed Worker static bundle');
assert.ok(route.includes("env.ASSETS.fetch(new Request(new URL('/index.html',req.url)))"));
assert.ok(route.includes("env.ASSETS.fetch(new Request(new URL('/workspace-v78.css',req.url)))"));
assert.ok(route.includes("return json({release:'V8.0',ready:Object.values(checks).every(Boolean),checks})"));
assert.ok(route.includes('Never print, return, or log the protected HTML'));
assert.ok(!/console\.(log|warn|error)/.test(route),'No private HTML or error logs');
assert.ok(!route.includes('body:html')&&!route.includes('json(html)'));
for(const id of ['dashboardWorkspace','mobileBottomNav','mobileMoreDrawer','topSevenExpand',
 'overview','videos','creator','experiments','audience','system'])
 assert.ok(html.includes('id="'+id+'"'),'Production marker absent in source: '+id);
assert.ok(css.includes('grid-template-areas:"side notice" "side content"'));
assert.ok(css.includes('env(safe-area-inset-bottom,0px)'));
console.log('OK privacy-safe production smoke: Worker-internal protected bundle checks, Boolean-only output and real deployment verification without credentials');
