import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {
 hasVerifiedTikTokSync,reconcileSnapshotWarnings,publicSnapshotWarningDiagnosis
} from '../cloudflare/snapshot-warning-reconcile.js';

const validTT={
 schema:1,accountId:'tt-verified-account',
 source:'TikTok Organic via Windsor.ai',
 daily:[{d:'2026-11-14',views:5000}],
 videos:[{id:'7345678901234567890',views:700,source:'TikTok Organic über Windsor.ai'}],
 updatedAt:'2026-11-15T09:00:00Z'
};
const success={status:'ok',lastSuccessAt:'2026-11-15T09:00:00Z'};
const direct={id:'7345678901234567890',source:'Official TikTok Display API',views:1000};
const organic={id:'7345678901234567890',source:'TikTok Organic über Windsor.ai',views:1100};
const oldFeed={platform:'tt',task:'tt-feed',message:'TikTok synchronization not yet enabled'};
const oldScan={platform:'tt',task:'video-list',message:'TikTok has more videos than current page limit'};
const external={platform:'ig',task:'media',message:'Instagram still missing verified values'};
const snapshot=(errors,videos=[organic])=>({
 schema:1,status:'partial',generatedAt:'2026-11-15T12:00:00Z',
 platforms:{yt:{daily:[],videos:[]},ig:{daily:[],videos:[]},tt:{daily:[],videos}},
 errors
});
const input=snapshot([oldFeed]);
const original=JSON.stringify(input);
assert.equal(hasVerifiedTikTokSync(validTT,success,input),true,
 'A real TikTok catalog AND real account-day values verify enabled sync');
const cleaned=reconcileSnapshotWarnings(input,{tiktokOrganic:validTT,tiktokSync:success});
assert.equal(cleaned.errors.length,0);
assert.equal(cleaned.status,'ok');
assert.equal(JSON.stringify(input),original,'Hydrated response fix must not mutate raw D1 snapshot');
assert.equal(reconcileSnapshotWarnings(snapshot([oldFeed,external]),{
 tiktokOrganic:validTT,tiktokSync:success}).errors.length,1,
 'Any unrelated or unknown genuine source error must remain');
assert.equal(reconcileSnapshotWarnings(snapshot([oldFeed,external]),{
 tiktokOrganic:validTT,tiktokSync:success}).errors[0].platform,'ig');
assert.equal(reconcileSnapshotWarnings(snapshot([oldFeed,oldScan]),{
 tiktokOrganic:validTT,tiktokSync:success,
 tiktokCursor:{hasMore:true,complete:false,updatedAt:'2026-11-15T12:00:00Z'}
}).errors.length,1,'Do not hide an unfinished TikTok pagination scan');
assert.equal(reconcileSnapshotWarnings(snapshot([oldFeed,oldScan]),{
 tiktokOrganic:validTT,tiktokSync:success,
 tiktokCursor:{hasMore:false,complete:true,updatedAt:'2026-11-15T12:00:00Z'}
}).errors.length,1,
 'Organic media alone cannot pretend the direct TikTok inventory scan finished');
assert.equal(reconcileSnapshotWarnings(snapshot([oldFeed,oldScan],[direct]),{
 tiktokOrganic:validTT,tiktokSync:success,
 tiktokCursor:{hasMore:false,complete:true,updatedAt:'2026-11-15T12:00:00Z'}
}).errors.length,0,
 'Finished official direct scan resolves an obsolete pagination warning');
assert.equal(reconcileSnapshotWarnings(snapshot([oldFeed]),{tiktokOrganic:validTT,tiktokSync:{status:'error'}}).errors.length,1);
assert.equal(reconcileSnapshotWarnings(snapshot([oldFeed]),{
 tiktokOrganic:{...validTT,daily:[]},tiktokSync:success}).errors.length,1);
assert.equal(reconcileSnapshotWarnings(snapshot([oldFeed]),{
 tiktokOrganic:{...validTT,source:'unverified'},tiktokSync:success}).errors.length,1);
assert.equal(reconcileSnapshotWarnings(snapshot([oldFeed],[]),{
 tiktokOrganic:validTT,tiktokSync:success}).errors.length,1);
assert.equal(reconcileSnapshotWarnings(snapshot([oldFeed,'Fallback warning']),{
 tiktokOrganic:validTT,tiktokSync:success}).errors[0],'Fallback warning',
 'Fallback must remain visible as a real degraded snapshot');
assert.strictEqual(reconcileSnapshotWarnings(snapshot([external]),{
 tiktokOrganic:validTT,tiktokSync:success}).errors[0],external,
 'Do not erase or rewrite other source warnings');
assert.equal(reconcileSnapshotWarnings({errors:'invalid'},{}).errors,'invalid',
 'Malformed messages must not be converted to success');
assert.equal(reconcileSnapshotWarnings(null,{}),null);

// Contract checks: this must be used AFTER organic, official direct TikTok,
// Instagram and YouTube overlays; the reconciliation cannot alter raw ingest.
const worker=readFileSync(new URL('../cloudflare/worker.js',import.meta.url),'utf8');
const hydration=worker.slice(worker.indexOf('async function hydratedSnapshot('),
 worker.indexOf('\nasync function ingestInstagramProfile'));
assert.ok(hydration.indexOf('overlayTikTokOrganicState(')>-1);
assert.ok(hydration.indexOf('overlayTikTokOrganicState(')<hydration.indexOf('reconcileSnapshotWarnings('));
assert.ok(hydration.includes("get(env,'tt_windsor_sync_v1')"));
assert.ok(hydration.includes("get(env,'tt_page_cursor')"));
assert.ok(!worker.includes("await put(env,'snapshot',reconcileSnapshotWarnings("),
 'Do not change original private video records to fix stale display warning');

// A still-real pagination problem must be explained, not silently hidden.
const html=readFileSync(new URL('../site/index.html',import.meta.url),'utf8');
const from=html.indexOf('function snapshotWarningHint('),to=html.indexOf('\n',html.indexOf('\n}',from)+2);
assert.ok(from>0&&to>from);
const hint=vm.runInNewContext('('+html.slice(from,html.indexOf('\n}',from)+2)+')');
assert.match(hint({errors:[oldScan]}),/TikTok.*älteren Videos/);
assert.match(hint({errors:[oldFeed]}),/TikTok.*Synchronisierung/);
assert.match(hint({errors:[external]}),/Einzelne Zusatzwerte/);
assert.ok(html.includes("button.textContent=unfinishedTikTok?'TikTok weiter synchronisieren':'Erneut prüfen'"));
assert.ok(html.includes("document.body.dataset.back2uAccessRole==='admin'"),
 'Guest sessions must never be offered owner-only direct import');

// Public health exposes ONLY allowlisted operational categories; the
// persisted account/video statistics and raw warning details stay private.
const warningData={tiktokOrganic:validTT,tiktokSync:success};
assert.deepEqual(publicSnapshotWarningDiagnosis(snapshot([oldFeed]),warningData),{
 category:'none',legacyTikTokRecovered:true
});
assert.deepEqual(publicSnapshotWarningDiagnosis(snapshot([oldFeed,oldScan]),warningData),{
 category:'tiktok-pagination',legacyTikTokRecovered:true
});
assert.equal(publicSnapshotWarningDiagnosis(snapshot([oldScan]),warningData).category,'tiktok-pagination');
assert.equal(publicSnapshotWarningDiagnosis(snapshot([external]),warningData).category,'other');
assert.equal(publicSnapshotWarningDiagnosis(snapshot([oldScan,external]),warningData).category,'multiple');
assert.equal(publicSnapshotWarningDiagnosis(snapshot([oldFeed]),{
 tiktokOrganic:{...validTT,daily:[]},tiktokSync:success
}).category,'tiktok-bootstrap');
assert.equal(publicSnapshotWarningDiagnosis(snapshot([oldFeed],[]),warningData).category,'none',
 'Separately saved verified TikTok Organic video data must count for readiness');
assert.equal(publicSnapshotWarningDiagnosis(null,warningData).category,'unknown');
const serialized=JSON.stringify(publicSnapshotWarningDiagnosis(snapshot([oldFeed,oldScan]),warningData));
for(const secret of ['tt-verified-account','7345678901234567890','TikTok has more videos','2026-11-15']){
 assert.ok(!serialized.includes(secret),'Public diagnostic must never expose data: '+secret);
}
assert.ok(worker.includes('health.snapshotNotice=publicSnapshotWarningDiagnosis('));
const healthWorkflow=readFileSync(new URL('../.github/workflows/production-windsor-health.yml',import.meta.url),'utf8');
assert.ok(healthWorkflow.includes('SNAPSHOT_NOTICE='));
assert.ok(healthWorkflow.includes('SNAPSHOT_LEGACY_TIKTOK_RECOVERED='));

console.log('OK authenticated warning reconciliation: remove stale TT bootstrap only with verified day/video source; retain genuine errors, fallback, pagination and guest safety');
