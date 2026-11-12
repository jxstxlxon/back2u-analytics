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

## First Cloudflare build

After connecting the `cloudflare-migration` branch to Cloudflare Workers Builds, this branch-only commit triggers the first build. Existing Netlify site remains on `main`. Before the new site is used, configure Worker secrets and verify D1 and login; no Google Sheets endpoint should be redirected until tested.

## TikTok follower statistics (opt-in, zero disruption to existing video sync)

The existing TikTok `user.info.basic,video.list` authorization remains the default.
TikTok requires the **additional** `user.info.stats` scope for `follower_count`
and its own public `video_count` (not the same as the number of locally stored rows).

1. In the TikTok Developer Portal, make sure `user.info.stats` is available and
   approved for the app's current environment. Do not assume a Sandbox approval
   implies approval for Production.
2. In Cloudflare Worker **Variables** (non-secret configuration), set
   `TIKTOK_STATS_SCOPE_ENABLED` to `true`, after the code is deployed.
   Leave it unset or `false` until this permission is available.
3. Sign in to the private dashboard and open `/api/tiktok/start` to
   reauthorize **the same TikTok account** with the new permission.
   The OAuth callback rejects a different previously bound TikTok account.
4. From the dashboard, use **TikTok jetzt synchronisieren**. The existing 30-minute
   Cloudflare Cron then continues refreshing video metadata and follower totals.
5. Open the authenticated `/api/diagnostics` and verify
   `tiktokFollowers.statsScopeGranted:true`,
   `tiktokFollowers.known:true`, and its `asOf` timestamp.
   `officialPublicVideoCount` can help cross-check video archive completeness;
   discrepancies may reflect API filtering or availability rather than missing IDs.

The profile history stores one point per UTC date (up to 365 days). No
follower count is guessed. If the optional permission is absent, statistics
remain unknown/live-unavailable and **video sync continues**.

Other follower sources are already wired:
- YouTube: Apps Script `back2uYouTubeDailyRepair` fetches owned-channel
  `statistics.subscriberCount` and updates D1; scheduled every 6h when installed.
  YouTube reports subscriber totals rounded to three significant figures.
- Instagram: `back2uInstagramFollowerSync` uses Meta Graph API and pushes the
  authenticated account's `followers_count` to D1; intended every 2h when installed.
  Check each trigger's execution log in Apps Script. A configured script file alone
  does **not** establish that triggers are actually running.

### Period values

The 7/28/90-day controls aggregate only available daily values.
YouTube/Instagram can have delayed daily reports; TikTok's Display API
provides lifetime values per video, **not** daily profile views.
Do not substitute lifetime views for a 7/28/90-day total, or treat a partial
daily window as complete. The Video Radar keeps lifetime video values labeled.
