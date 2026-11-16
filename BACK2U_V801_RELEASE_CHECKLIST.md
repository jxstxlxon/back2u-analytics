# BACK2U V8.0.1 — Full version release and browser quality gate

## Scope
V8.0 contains Overview, Video Radar, Creator Hub, Experiments, Audience, System, Story Studio and 36 themes.

This release addresses two quality gaps:

1. The TikTok Display API scan had a 25 × 20 = 500-video ceiling per run. The known catalog exceeds 500. The bounded adaptive budget covers 600–800 videos per run and retains cursor-based continuation for larger inventories. An incomplete upstream scan still produces a warning. No older video records are deleted.
2. Previous CSS/source tests did not exercise real browser interactions. The new isolated Chromium suite checks actual display and clicks on three device viewports with all private API calls disabled.

## Quality gates
- [x] Existing JavaScript/Worker tests are part of Production Safety CI.
- [x] Pure TikTok budget and checkpoint tests included.
- [ ] Chromium mobile 390 × 844: bottom nav, search before ranking, Creator and Audience, More, Theme and Story.
- [ ] Chromium tablet 834 × 1112: horizontal nav and Video Radar.
- [ ] Chromium desktop 1440 × 900: sidebar, non-overlapping content, Creator and System.
- [ ] Both GitHub CI jobs green and production base unchanged before merge.
- [ ] Cloudflare V8.0 assets verified by actual public layout probe.
- [ ] Authenticated TikTok scan reports real final-page completion and no remaining pagination warning.
- [ ] Private 12-point official data parity, D1 restoration and physical iPhone Safari QA (separate access required).

## Privacy / safety
- Browser QA serves only checked-in static files on localhost. All private API calls receive a local 503 and external media/font hosts are blocked.
- No passwords, cookies, OAuth tokens, D1 snapshots or screenshots are logged or transmitted.
- Actions permissions are read-only; browser tests never deploy.
- Worker uses capped TikTok API calls and preserves saved cursors and historical video records.
- No change to auth, guest access, OAuth scopes, database schema, cron frequency, video ranking semantics or Themes.

## Limits
- Chromium mobile emulation does not replace real iPhone Safari verification.
- A larger page budget does not prove actual upstream completion. Only a final API page and verified production status can do that.
- Source tests do not prove Cloudflare rollout.
- Windsor-independent operation, seven-day verified direct coverage, and D1 recovery are separately unfinished until demonstrated.
