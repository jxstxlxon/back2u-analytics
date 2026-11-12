import assert from 'node:assert/strict';
import {auditDirectCoverage} from '../cloudflare/parity-audit.js';
import {validateDirectVideoInsights,mergeDirectVideoInsights,validateInstagramDaily,mergeInstagramDaily,overlayDirectInsights} from '../cloudflare/direct-insights.js';
import {validateDirectAudience,mergeDirectAudience,chooseEffectiveAudience} from '../cloudflare/direct-audience.js';

const now=Date.parse('2026-11-12T21:00:00Z'),today='2026-11-12',yesterday='2026-11-11';
const day=(n)=>new Date(Date.parse(today+'T00:00:00Z')-n*86400000).toISOString().slice(0,10);
let count=0;
function check(label,fn){fn();count++;console.log('OK '+label)}
const ys={schema:1,platform:'yt',accountId:'UCBnnaMohI_VfKihekEwaQEw',
 snapshotDate:today,periodDays:7,periodStart:day(8),periodEnd:day(2),
 videos:[{id:'rRaC0oH8Dys',metrics:{views7d:400,shares7d:3,averageViewSeconds7d:10.5}}]};
const a=[['13–17',18.4],['18–24',7.7],['25–34',24.8],['35–44',29.7],['45–54',14.6],['55–64',3.1],['65+',1.7]];
const g=[['Männer',66.9],['Frauen',32.8],['Selbst angegeben',0.3]];
const c=[['Deutschland',40],['USA',20],['Polen',15],['Österreich',10],['Weitere',15]];
const meta=source=>Object.fromEntries(['age','gender','countries'].map(k=>[k,{source,basis:'Reporting share of actual users'}]));
const ytAud={schema:1,platform:'yt',accountId:'UCBnnaMohI_VfKihekEwaQEw',snapshotDate:today,
 audience:{age:a,gender:g,countries:c},audienceMeta:meta('YouTube Analytics API (direct)')};

check('valid own-channel direct demographics',()=>assert.equal(validateDirectAudience(ytAud,now).audience.age.length,7));
check('spoofed direct demographics rejected',()=>assert.throws(()=>validateDirectAudience({...ytAud,accountId:'wrong'},now)));
check('invalid percent rejected',()=>assert.throws(()=>validateDirectAudience({...ytAud,audience:{...ytAud.audience,age:[['13–17',90],['18–24',3],['25–34',4],['35–44',5]]}},now)));
check('properly scoped seven-day YouTube insight report',()=>assert.equal(validateDirectVideoInsights(ys,now).period.days,7));
check('28d field may not appear in 7d report',()=>assert.throws(()=>validateDirectVideoInsights({...ys,videos:[{id:ys.videos[0].id,metrics:{views28d:5}}]},now)));
const v7=validateDirectVideoInsights(ys,now);
const v28=validateDirectVideoInsights({...ys,periodDays:28,periodStart:day(29),videos:[{id:ys.videos[0].id,metrics:{views28d:920}}]},now);
const combined=mergeDirectVideoInsights(mergeDirectVideoInsights(null,v7),v28);
check('7d and 28d are retained separately',()=>assert.deepEqual([combined.platforms.yt.videos[0].metrics.views7d,combined.platforms.yt.videos[0].metrics.views28d],[400,920]));
check('outdated row in updated window is not retained',()=>{
 const x=mergeDirectVideoInsights(combined,validateDirectVideoInsights({...ys,videos:[{id:'FQInLBuzLIg',metrics:{views7d:35}}]},now));
 assert.equal(x.platforms.yt.videos.find(q=>q.id==='rRaC0oH8Dys')?.metrics.views7d,undefined);
 assert.equal(x.platforms.yt.videos.find(q=>q.id==='rRaC0oH8Dys')?.metrics.views28d,920);
});
const daily={schema:1,platform:'ig',accountId:'lxon_jxmpstyle',snapshotDate:today,
 daily:[{date:yesterday,metrics:{views:1000,reach:700,interactions:33}}]};
check('official true-day Meta data accepted',()=>assert.equal(validateInstagramDaily(daily,now).daily.length,1));
check('faked negative Meta daily values rejected',()=>assert.throws(()=>validateInstagramDaily({...daily,daily:[{date:yesterday,metrics:{views:-1}}]},now)));
check('Meta data from other creator rejected',()=>assert.throws(()=>validateInstagramDaily({...daily,accountId:'other'},now)));
const d=mergeInstagramDaily(null,validateInstagramDaily(daily,now));
const snap={platforms:{yt:{videos:[{id:ys.videos[0].id,views:10000}]},
 ig:{daily:[{d:yesterday,comments:3}],videos:[]},tt:{daily:[],videos:[{id:'old',views:55}]}}};
overlayDirectInsights(snap,{video:combined,daily:d});
check('lifetime video views never changed by seven-day views',()=>assert.equal(snap.platforms.yt.videos[0].views,10000));
check('retained Windsor day metrics preserved',()=>assert.equal(snap.platforms.ig.daily.find(x=>x.d===yesterday).comments,3));
check('TikTok remains intact',()=>assert.equal(snap.platforms.tt.videos[0].views,55));
const old={schema:1,snapshotDate:day(3),audience:{yt:{age:[['OLD',100]]},tt:{age:[['TIKTOK',100]]}},
 audienceMeta:{yt:{age:{asOf:day(3)}}}};
const direct=mergeDirectAudience(null,validateDirectAudience(ytAud,now));
check('new verified official audience supersedes older source',()=>assert.equal(chooseEffectiveAudience(old,direct).audience.yt.age[0][0]!=='OLD',true));
check('TikTok demographics retained during official YT cutover',()=>assert.equal(chooseEffectiveAudience(old,direct).audience.tt.age[0][0],'TIKTOK'));
const noData=auditDirectCoverage({},now);
check('empty direct data never granted parity approval',()=>assert.equal(noData.releaseApproved,false));
check('empty direct data shows zero of twelve groups',()=>assert.equal(noData.summary.passed,0));
check('all coverage checks have details and identity',()=>assert.equal(noData.checks.every(x=>x.id&&x.label&&x.details),true));
check('coverage gate is informative, never an automatic switch',()=>assert.equal(noData.readyForParityReview,false));
check('reject a one-day window falsely labeled seven days',()=>assert.throws(()=>validateDirectVideoInsights({...ys,periodStart:day(2)},now)));
check('reject older Meta snapshot overwriting newer day metrics',()=>{
 const row=day(2);
 const newer=mergeInstagramDaily(null,validateInstagramDaily({...daily,daily:[{date:row,metrics:{views:900}}]},now));
 const older=validateInstagramDaily({...daily,snapshotDate:yesterday,daily:[{date:row,metrics:{views:100}}]},now);
 const result=mergeInstagramDaily(newer,older);
 assert.equal(result.daily.find(x=>x.date===row).metrics.views,900);
});
console.log('BACK2U V7.7 integrity checks passed: '+count+'/21');
