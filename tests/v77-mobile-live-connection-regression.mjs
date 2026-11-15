import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const html=readFileSync(new URL('../site/index.html',import.meta.url),'utf8');
const css=readFileSync(new URL('../site/mobile-performance-v77.css',import.meta.url),'utf8');
const worker=readFileSync(new URL('../cloudflare/worker.js',import.meta.url),'utf8');

for(const [i,m] of [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].entries()){
 if(m[1].trim())new vm.Script(m[1],{filename:'dashboard-live-connection-inline-'+i});
}
// Worker ESM compilation is covered separately by the Cloudflare dry-run CI.

assert.match(css,/html body\[data-theme-artwork="on"\]\[data-theme-background\]/);
assert.match(css,/background-attachment:\s*scroll\s*!important/);
assert.match(css,/background-image:\s*linear-gradient\(155deg,/);
assert.match(css,/min-height:\s*100dvh/);
assert.match(css,/backdrop-filter:\s*none\s*!important/);
assert.match(css,/#notice\.live-unavailable/);
assert.match(css,/\.live-reconnect-button/);

assert.ok(html.includes("Live-Daten derzeit nicht geladen."),
 'An unauthenticated or failed request must never masquerade as all-zero live analytics');
assert.ok(html.includes("Die sichtbaren Archivwerte sind keine aktuellen Statistiken."),
 'Archives must be explicitly labeled when live data cannot be reached');
assert.ok(html.includes("state.lastError==='Bitte anmelden'?'Anmelden':'Erneut verbinden'"),
 'Owner must be able to recover a lost session without editing any scripts');
assert.ok(html.includes("if(!state.live&&!state.loading)loadLive(true)"),
 'Failed initial load retries only once and does not overwrite live state');
assert.ok(html.includes("Die Werte stammen vom letzten erfolgreich geladenen Stand."),
 'A transient failure must preserve and label the last good in-memory data');
assert.ok(html.includes("state.partialWarningCount=syncWarningCount(data)"),
 'A successfully fetched but incomplete D1 snapshot must not become a failed request');
assert.ok(html.includes("state.lastError=null;\n toast(state.partialWarningCount?"),
 'A successful /api/snapshot must clear an earlier real transport error');
assert.ok(!html.includes("state.lastError=data.errors?.length"),
 'Source warnings must never be assigned to the HTTP failure flag');
assert.ok(html.includes("}else if(partial){"),
 'When optional source data is incomplete, show a compact partial warning');
assert.ok(html.includes("notice.classList.toggle('live-partial',partial)"));
assert.ok(html.includes("button.textContent=unfinishedTikTok?'TikTok weiter synchronisieren':'Erneut prüfen'"));
assert.ok(css.includes("#notice.live-partial"));
assert.ok(css.includes(".signal-dot.is-partial"));
assert.ok(html.includes("}catch(e){state.lastError=String(e.message||e);"),
 'A real failed fetch must continue to show an error and preserve previous data');
// Execute the real UI warning classifier rather than repeating its logic in a test.
const warningFunction=html.match(/function syncWarningCount\(data\)\{[^{}]*\}/)?.[0];
assert.ok(warningFunction,'Warning classifier must be a pure testable function');
const warningCount=vm.runInNewContext('('+warningFunction+')');
assert.equal(warningCount({errors:[]}),0,'Complete snapshot shows no warning');
assert.equal(warningCount({errors:[{platform:'tt',task:'video-list'}]}),1,
 'One source warning is not a transport failure');
assert.equal(warningCount({errors:[{platform:'tt'}, {platform:'ig'}]}),2);
assert.equal(warningCount({snapshotFallback:'original-d1',errors:[]}),1,
 'Overlay fallback must remain visible without claiming full freshness');
assert.equal(warningCount({errors:'invalid'}),0,'Untrusted errors must not inflate counters');

// Admin snapshot triggers background imports through ctx.waitUntil.
// The request-scoped context must reach the API router, or authenticated
// /api/snapshot fails before returning saved videos and daily metrics.
assert.ok(worker.includes('async function route(req,env,ctx){'));
assert.ok(worker.includes("if(path.startsWith('/api/'))return await route(req,env,ctx);"));
assert.ok(worker.includes('ctx.waitUntil(runInstagramWindsorDailySync'));
assert.ok(worker.includes('ctx.waitUntil(runYouTubeWindsorExtrasSync'));
assert.ok(worker.includes("health.snapshotStored="));
assert.ok(worker.includes("health.snapshotHasVideoCatalog="));
assert.ok(worker.includes("health.snapshotHasDailySeries="));
assert.ok(!worker.includes("health.snapshotRecord="),
 'No private snapshot data should appear in public health route');
console.log('OK mobile Safari viewport and archived-fallback diagnosis regression');
