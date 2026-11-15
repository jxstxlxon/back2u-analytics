import assert from 'node:assert/strict';
import {syncPhaseForUtcMinute,isLegacyThirtyMinuteCron} from '../cloudflare/sync-schedule.js';
import {readFileSync} from 'node:fs';
const phases=[
 [0,'tiktok-daily'],[14,'tiktok-daily'],
 [15,'instagram-youtube-extras'],[29,'instagram-youtube-extras'],
 [30,'tiktok-profile-instagram-followers'],[44,'tiktok-profile-instagram-followers'],
 [45,'instagram-media-audience'],[59,'instagram-media-audience']
];
for(const [minute,expected] of phases)assert.equal(syncPhaseForUtcMinute(minute),expected);
for(const minute of [-1,60,NaN,1.5])assert.equal(syncPhaseForUtcMinute(minute),'none');
const counts={};
for(let minute=0;minute<60;minute++)counts[syncPhaseForUtcMinute(minute)]=(counts[syncPhaseForUtcMinute(minute)]||0)+1;
assert.equal(Object.keys(counts).length,4);
console.log('OK four isolated 15-minute Cloudflare source phases; TikTok day is always its own phase');

// Production may still be configured for the previous */30 trigger.
assert.equal(isLegacyThirtyMinuteCron('*/30 * * * *'),true);
assert.equal(isLegacyThirtyMinuteCron('0,30 * * * *'),true);
assert.equal(isLegacyThirtyMinuteCron('*/15 * * * *'),false);
assert.equal(isLegacyThirtyMinuteCron(undefined),false);
const worker=readFileSync(new URL('../cloudflare/worker.js',import.meta.url),'utf8');
assert.ok(worker.includes('const legacy30=isLegacyThirtyMinuteCron(controller?.cron)'));
assert.ok(worker.includes('if(legacy30)runExtras()'));
assert.ok(worker.includes('if(legacy30)runMediaAndAudience()'));
assert.ok(worker.includes('scheduler_heartbeat_v1'));
assert.ok(worker.includes("recent:Number.isFinite(age)&&age>=0&&age<65*60000"));
assert.ok(!worker.includes('health.schedulerToken='), 'Cron status must never expose secrets');
console.log('OK legacy 30-minute trigger includes missing extras/media phases; no new API or auth routes');
