import assert from 'node:assert/strict';
import {syncPhaseForUtcMinute} from '../cloudflare/sync-schedule.js';
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
