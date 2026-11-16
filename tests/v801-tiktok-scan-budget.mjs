import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {tiktokScanPageBudget,TIKTOK_MIN_PAGES,TIKTOK_MAX_PAGES,TIKTOK_VIDEOS_PER_PAGE} from '../cloudflare/tiktok-scan-budget.js';

assert.equal(TIKTOK_VIDEOS_PER_PAGE,20);
assert.equal(TIKTOK_MIN_PAGES,30);
assert.equal(TIKTOK_MAX_PAGES,40);
const actual=[
 [undefined,30],[null,30],['not available',30],[-1,30],[0,30],
 [480,30],[499,30],[500,30],[501,30],[540,30],
 [541,31],[600,33],[700,38],[740,40],[999,40],[Number.MAX_SAFE_INTEGER,40]
];
for(const [count,expected] of actual)
 assert.equal(tiktokScanPageBudget(count),expected,'Budget for '+count);
assert.ok(tiktokScanPageBudget(501)*TIKTOK_VIDEOS_PER_PAGE>501,
 'Previously fixed 25 pages (500 videos) must not limit a 501+ catalog');
for(let i=0;i<2500;i+=17){
 const pages=tiktokScanPageBudget(i);
 assert.ok(Number.isInteger(pages)&&pages>=30&&pages<=40);
}

const worker=readFileSync(new URL('../cloudflare/worker.js',import.meta.url),'utf8');
assert.ok(worker.includes("import {tiktokScanPageBudget} from './tiktok-scan-budget.js'"));
assert.ok(worker.includes("const scanBudget=tiktokScanPageBudget(checkpoint?.storedAfterMerge);"));
assert.ok(worker.includes("ttFetch(env,scanBudget,validCheckpoint?Number(checkpoint.cursor):undefined)"));
assert.ok(worker.includes("storedAfterMerge:videos.length"));
assert.ok(worker.includes("completedAt:t.hasMore?(checkpoint?.completedAt||null):new Date().toISOString()"));
assert.ok(worker.includes("cursor:t.hasMore?t.nextCursor:null"));
assert.ok(worker.includes("hasMore:t.hasMore,pagesLastBatch:t.pages"));
assert.ok(worker.includes("complete:!t.hasMore"));
assert.ok(worker.includes("if(t.hasMore)snapshot.errors.push("),
 'Incomplete scans must still produce an honest warning');
assert.ok(worker.includes("if(hasMore&&(cursor===undefined||cursor===null))throw Error('TikTok pagination cursor missing')"),
 'Never fake completion if upstream did not return a cursor');
assert.ok(!worker.includes("ttFetch(env,25,validCheckpoint"),
 'Old fixed 500-video limit must not remain');
assert.ok(worker.includes("const snapshot=await get(env,'snapshot');"),
 'Read latest snapshot after remote pagination to preserve latest Google Sheets push');
const site=readFileSync(new URL('../site/index.html',import.meta.url),'utf8');
assert.ok(site.includes('Scan wird bei weiteren Synchronisierungen fortgesetzt'));
assert.ok(site.includes('offizieller Videoscan abgeschlossen'));
assert.ok(!site.includes("API-Videos synchronisiert"),'Merged archive catalog must not be mislabeled API-only');
console.log('OK TikTok catalog 500+ scan adaptive bounded to 600–800 videos, correct cursor resume, no false completeness, owner status and no data deletion');
