import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const text=readFileSync(new URL('../.github/workflows/cloudflare-production-deploy.yml',import.meta.url),'utf8');
const config=JSON.parse(readFileSync(new URL('../wrangler.cloudflare.jsonc',import.meta.url),'utf8'));
const refName=name=>String.fromCharCode(36)+'{{ secrets.'+name+' }}';

assert.ok(text.includes('name: BACK2U publish Cloudflare production'));
assert.ok(text.includes('branches: [cloudflare-migration]'));
assert.ok(text.includes("if: github.ref == 'refs/heads/cloudflare-migration'"));
assert.ok(text.includes('CLOUDFLARE_API_TOKEN: '+refName('CLOUDFLARE_API_TOKEN')));
assert.ok(text.includes('CLOUDFLARE_ACCOUNT_ID: '+refName('CLOUDFLARE_ACCOUNT_ID')));
assert.ok(text.includes('if [[ -z "$CLOUDFLARE_API_TOKEN" || -z "$CLOUDFLARE_ACCOUNT_ID" ]]'));
assert.ok(text.includes('BACK2U_DEPLOY=NOT_CONFIGURED'));
assert.ok(text.includes('BACK2U_DEPLOY=VERIFIED'));
assert.ok(text.includes('BACK2U_DEPLOY=RELEASE_NOT_VERIFIED'));
assert.ok(text.includes('npx --yes wrangler@4 deploy --dry-run --config wrangler.cloudflare.jsonc'));
assert.ok(text.includes('npx --yes wrangler@4 deploy --config wrangler.cloudflare.jsonc'));
assert.ok(text.indexOf('run: npm test')<text.indexOf('deploy --dry-run'));
assert.ok(text.indexOf('deploy --dry-run')<text.indexOf('Deploy only the production Worker'));
assert.ok(text.includes('concurrency:\n  group: back2u-production-worker\n  cancel-in-progress: false'));
assert.ok(text.includes('persist-credentials: false'));
assert.equal(config.name,'back2u-cloud');
assert.equal(config.assets.directory,'./site');
assert.equal(config.d1_databases?.[0]?.binding,'DB');
assert.equal(config.keep_vars,true,'Preserve existing secret Worker variables on deploy');
assert.deepEqual(config.triggers.crons,['*/30 * * * *']);

// Private analytics and secrets must never be printed into public logs.
for(const forbidden of [
 'echo "$CLOUDFLARE_API_TOKEN"',
 'echo "$CLOUDFLARE_ACCOUNT_ID"',
 'cat /tmp/back2u-deployed-health.json',
 'cat /tmp/back2u-deployed-index.html',
 'curl -v', 'set -x', 'wrangler d1 export',
 '/api/snapshot','/api/direct-parity','/api/audience',
])assert.ok(!text.includes(forbidden),'Unexpected handling of private data: '+forbidden);

assert.ok(text.includes('id="mobileBottomNav"'));
assert.ok(text.includes('id="topSevenExpand"'));
assert.ok(text.includes('env(safe-area-inset-bottom,0px)'));
console.log('OK optional protected Cloudflare auto-deploy: no secret values, branch gate, tests before publish, D1 preservation and live UI verification');
