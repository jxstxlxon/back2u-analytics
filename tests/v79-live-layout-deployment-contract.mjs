import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const workflow=readFileSync(new URL('../.github/workflows/production-ui-smoke.yml',import.meta.url),'utf8');
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

// Public smoke requests must be limited to public static assets, never admin
// APIs, authentication, tokens or private analytical response bodies.
assert.ok(workflow.includes('"$base/" -o /tmp/back2u-live-index.html'));
assert.ok(workflow.includes('"$base/workspace-v78.css" -o /tmp/back2u-live-workspace.css'));
for(const forbidden of ['/api/snapshot','/api/direct-parity','/api/access','/api/audience','Authorization:','DASHBOARD_PASSWORD','SESSION_SECRET','cookies.txt'])
 assert.ok(!workflow.includes(forbidden),'Unsafe production smoke reference: '+forbidden);
for(const id of ['dashboardWorkspace','mobileBottomNav','mobileMoreDrawer','topSevenExpand','overview','videos','creator','experiments','audience','system'])
 assert.ok(html.includes('id="'+id+'"'),'Production marker is absent in checked-in app: '+id);
assert.ok(css.includes('grid-template-areas:"side notice" "side content"'));
assert.ok(css.includes('env(safe-area-inset-bottom,0px)'));
console.log('OK privacy-preserving production UI smoke contract: public HTML/CSS only, real deployment check, mobile safe areas and desktop navigation');
