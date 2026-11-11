/**
 * BACK2U Creator Command Center — verified YouTube daily Analytics.
 *
 * ADD AS NEW FILE "YouTubeDailyAnalytics.gs" in BACK2U LIVE CONNECTOR.
 * Enable YouTube Analytics API (v2) from the Apps Script "Services +" panel.
 * Existing Code.gs, CloudflareSync.gs, 30m triggers, Sheets and Netlify stay unchanged.
 *
 * For security, the transfer token is read from existing Script Properties.
 * This addon NEVER contains the token and NEVER exposes your private spreadsheet.
 */

const BACK2U_ANALYTICS_CHANNEL = 'UCBnnaMohI_VfKihekEwaQEw';
const BACK2U_ANALYTICS_ENDPOINT =
  'https://back2u-cloud.leon-mueller0806.workers.dev/api/youtube-daily/ingest';

function back2uYouTubeDailyRepair() {
  if (typeof YouTube === 'undefined') {
    throw new Error('Apps Script > Services (+) > YouTube Data API v3 aktivieren.');
  }
  if (typeof YouTubeAnalytics === 'undefined') {
    throw new Error('Apps Script > Services (+) > YouTube Analytics API v2 aktivieren.');
  }

  const secret = PropertiesService.getScriptProperties()
    .getProperty('BACK2U_CLOUDFLARE_FEED_SECRET');
  if (!secret || secret.length < 24) {
    throw new Error('Skripteigenschaft BACK2U_CLOUDFLARE_FEED_SECRET fehlt.');
  }

  const channels = YouTube.Channels.list('id,statistics', {mine: true});
  const mine = channels.items && channels.items[0];
  if (!mine || mine.id !== BACK2U_ANALYTICS_CHANNEL) {
    throw new Error('Falscher YouTube-Kanal: Zugriff muss auf den Back2u-Kanal erfolgen.');
  }

  // Ask for completed days; YouTube may still be processing the most recent ones.
  const lastCompleted = new Date(Date.now() - 86400000);
  const earliest = new Date(lastCompleted.getTime() - 114 * 86400000);
  const formatDay = d => Utilities.formatDate(d, 'UTC', 'yyyy-MM-dd');
  const from = formatDay(earliest), to = formatDay(lastCompleted);

  const response = YouTubeAnalytics.Reports.query({
    ids: 'channel==' + mine.id,
    startDate: from,
    endDate: to,
    metrics: 'views,likes,comments,subscribersGained,subscribersLost',
    dimensions: 'day',
    sort: 'day'
  });

  if (!response || !response.rows || !response.rows.length) {
    throw new Error('YouTube Analytics liefert derzeit keine vollständigen Tagesdaten.');
  }

  const daily = response.rows.map(row => ({
    date: String(row[0]),
    views: Number(row[1]),
    likes: Number(row[2]),
    comments: Number(row[3]),
    subscribersGained: Number(row[4]),
    subscribersLost: Number(row[5])
  }));

  const payload = {
    schema: 1,
    daily: daily,
    subscriberCount: mine.statistics &&
      mine.statistics.subscriberCount !== undefined
      ? Number(mine.statistics.subscriberCount)
      : null
  };

  const result = UrlFetchApp.fetch(BACK2U_ANALYTICS_ENDPOINT, {
    method: 'post',
    contentType: 'application/json',
    headers: {Authorization: 'Bearer ' + secret},
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  });

  const text = result.getContentText();
  if (result.getResponseCode() !== 200) {
    throw new Error('Cloudflare HTTP ' + result.getResponseCode() + ': ' + text.slice(0, 350));
  }

  Logger.log('BACK2U YouTube Tagesreport erfolgreich: ' + text);
}

function back2uInstallYouTubeDailyRepair() {
  // Test BEFORE creating a recurring trigger.
  back2uYouTubeDailyRepair();
  const active = ScriptApp.getProjectTriggers().some(
    t => t.getHandlerFunction() === 'back2uYouTubeDailyRepair'
  );
  if (!active) {
    ScriptApp.newTrigger('back2uYouTubeDailyRepair')
      .timeBased()
      .everyHours(6)
      .create();
  }
  Logger.log('YouTube Analytics Tageswerte: alle 6 Stunden mit Cloudflare abgleichen.');
}
