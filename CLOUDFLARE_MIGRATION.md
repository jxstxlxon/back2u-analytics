# BACK2U Cloudflare migration (test branch)

**Do not deploy until Cloudflare D1 is created and the required secrets have been set.** This branch does not change the Netlify production branch.

The current Netlify project publishes `site/`, with `netlify/functions/api.mjs` handling password-protected data and `netlify/functions/pushed-feed.mjs` storing analytics. These Node/Netlify functions need a Cloudflare Worker and D1 replacement before the cutover.

### Infrastructure

- Cloudflare Worker, static assets from `site/`, serve private dashboard HTML only after server-side session authentication.
- D1 `back2u-cloud` storing the pushed Google Sheets snapshot, TikTok OAuth and video stats.
- Maintain existing Apps Script/Google Sheets timers, use the existing Bearer-protected `/api/ingest` format, and verify full YouTube/Instagram Video Radar before switching off Netlify.
- Add new TikTok sandbox redirect URI under the new `workers.dev` hostname and repeat TikTok OAuth consent.
- Enable Cron on Cloudflare only after validating TikTok video.list permissions and API rate limits.

### Secrets (never commit them)

`DASHBOARD_PASSWORD`, `SESSION_SECRET`, `BACK2U_GOOGLE_FEED_SECRET`, `TIKTOK_CLIENT_KEY`, `TIKTOK_CLIENT_SECRET`. Use Cloudflare Secrets, not plain GitHub files.

### Account setup (iPhone)

1. Create a Cloudflare **Free** account. Do not select paid options.
2. In **Storage & databases → D1**, create database `back2u-cloud`.
3. Replace `REPLACE_WITH_YOUR_D1_DATABASE_ID` in `wrangler.cloudflare.jsonc` with the database UUID.
4. Add the Worker source code; only then connect this GitHub branch for deployment.
5. Set Worker secrets and verify the protected dashboard, then activate Google Sheets dual-push.
6. Re-authorize TikTok; verify its video count. Do not shut down Netlify until all tests pass.

Cloudflare Worker source is in `cloudflare/worker.js`. The JavaScript syntax was checked, but a live deployment and end-to-end testing are still outstanding. Do not replace the functioning Netlify URL until the new Worker has been tested.

**Limits:** Free plans are subject to quotas. TikTok production app review may still be necessary.
