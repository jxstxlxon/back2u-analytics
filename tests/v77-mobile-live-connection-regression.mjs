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
assert.ok(worker.includes("health.snapshotStored="));
assert.ok(worker.includes("health.snapshotHasVideoCatalog="));
assert.ok(worker.includes("health.snapshotHasDailySeries="));
assert.ok(!worker.includes("health.snapshotRecord="),
 'No private snapshot data should appear in public health route');
console.log('OK mobile Safari viewport and archived-fallback diagnosis regression');
