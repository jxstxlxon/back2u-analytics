/**
 * BACK2U: Offiziellen Instagram-Followerstand abrufen und sicher an Cloudflare D1 senden.
 *
 * Als NEUE Datei InstagramFollowerSync.gs in BACK2U LIVE CONNECTOR einfügen.
 * Nutzt Instagram_Unified.gs -> b2uIgRequest_ (Facebook Graph API) und private Script Properties IG_SUAT_TOKEN
 * und BACK2U_CLOUDFLARE_FEED_SECRET (keine Secrets in diese Datei schreiben).
 *
 * Vor der Automatik zuerst back2uInstagramFollowerSync einzeln testen.
 * Danach back2uInstallInstagramFollowerSync einmal ausführen.
 */

const BACK2U_IG_FOLLOWER_ENDPOINT =
  'https://back2u-cloud.leon-mueller0806.workers.dev/api/instagram-profile/ingest';

function back2uInstagramFollowerSync() {
  const props = PropertiesService.getScriptProperties();
  const instagramToken = props.getProperty('IG_SUAT_TOKEN');
  const cloudToken = props.getProperty('BACK2U_CLOUDFLARE_FEED_SECRET');

  if (!instagramToken) throw new Error('IG_SUAT_TOKEN fehlt in den Skripteigenschaften.');
  if (!cloudToken || cloudToken.length < 24)
    throw new Error('BACK2U_CLOUDFLARE_FEED_SECRET fehlt in den Skripteigenschaften.');

  // Reuse the proven Facebook Graph API helper from Instagram_Unified.gs.
  // The system-user token is NOT an Instagram Login token; graph.instagram.com/me
  // returns HTTP 401 even when the existing media/insights sync is working.
  if (typeof b2uIgRequest_ !== 'function')
    throw new Error('Instagram_Unified.gs: b2uIgRequest_ fehlt. Bestehenden Instagram-Sync prüfen.');

  const graph = (path, params) => b2uIgRequest_(path, params || {});
  const candidates = [];

  // Reuse an existing IG-user ID from the project's private configuration, if present.
  for (const key of ['IG_USER_ID', 'IG_ACCOUNT_ID', 'IG_BUSINESS_ACCOUNT_ID',
    'INSTAGRAM_USER_ID', 'INSTAGRAM_ACCOUNT_ID', 'B2U_IG_USER_ID']) {
    const v = props.getProperty(key);
    if (/^\d{12,25}$/.test(String(v || ''))) candidates.push(String(v));
  }

  // A verified media ID is already in the private Instagram_API_All sheet.
  // For one's OWN media, Graph API's 'owner' points to the IG user node.
  try {
    const book = SpreadsheetApp.openById(BACK2U_SPREADSHEET_ID);
    const tab = book.getSheetByName('Instagram_API_All');
    if (tab && tab.getLastRow() >= 2) {
      const mediaIds = tab.getRange(2, 1, Math.min(10, tab.getLastRow() - 1), 1)
        .getDisplayValues().map(x => x[0]).filter(x => /^\d{12,25}$/.test(x));
      for (const mediaId of mediaIds) {
        try {
          const media = graph(mediaId, {fields: 'owner'});
          if (/^\d{12,25}$/.test(String(media?.owner?.id || ''))) {
            candidates.push(String(media.owner.id));
            break;
          }
        } catch (_) {} // Try the next recent media.
      }
    }
  } catch (_) {} // Continue to the Page association fallback.

  // Page-linked Instagram Professional account (Meta's Facebook Login flow).
  if (!candidates.length) {
    try {
      const pages = graph('me/accounts', {
        fields: 'instagram_business_account{id,username}', limit: 100
      });
      for (const page of pages?.data || []) {
        const id = page?.instagram_business_account?.id;
        if (/^\d{12,25}$/.test(String(id || ''))) candidates.push(String(id));
      }
    } catch (_) {}
  }

  let profile = null;
  for (const id of [...new Set(candidates)]) {
    try {
      const found = graph(id, {fields: 'id,username,followers_count'});
      if (String(found?.username || '').trim().toLowerCase() === 'lxon_jxmpstyle'
        && Number.isSafeInteger(Number(found.followers_count))) {
        profile = found;
        break;
      }
    } catch (_) {}
  }

  if (!profile) {
    throw new Error('Instagram-Followerprofil nicht lesbar. Prüfe Instagram_Unified.gs '
      + 'und ob die vorhandene Meta-Verbindung die eigene IG-Konto-ID erreicht. '
      + 'Keinen Token in das Ausführungsprotokoll kopieren.');
  }

  const account = String(profile.username || '').trim().toLowerCase();
  if (account !== 'lxon_jxmpstyle')
    throw new Error('Falsches Instagram-Konto: erwartet @lxon_jxmpstyle, erhalten: ' + account);

  const followerCount = Number(profile.followers_count);
  if (!Number.isSafeInteger(followerCount) || followerCount < 0)
    throw new Error('Instagram hat kein gültiges followers_count-Feld geliefert.');

  const ingestResponse = UrlFetchApp.fetch(BACK2U_IG_FOLLOWER_ENDPOINT, {
    method: 'post',
    contentType: 'application/json',
    headers: {Authorization: 'Bearer ' + cloudToken},
    payload: JSON.stringify({
      schema: 1,
      username: account,
      followers_count: followerCount
    }),
    muteHttpExceptions: true
  });

  if (ingestResponse.getResponseCode() !== 200) {
    throw new Error('Cloudflare HTTP ' + ingestResponse.getResponseCode() + ': '
      + ingestResponse.getContentText().slice(0, 280));
  }
  const result = JSON.parse(ingestResponse.getContentText());
  Logger.log('BACK2U Instagram-Follower erfolgreich: '
    + result.followers + ' · Stand ' + result.asOf);
}

function back2uInstallInstagramFollowerSync() {
  back2uInstagramFollowerSync();
  const hasTrigger = ScriptApp.getProjectTriggers().some(
    t => t.getHandlerFunction() === 'back2uInstagramFollowerSync'
  );
  if (!hasTrigger) {
    ScriptApp.newTrigger('back2uInstagramFollowerSync')
      .timeBased().everyHours(2).create();
  }
  Logger.log('Instagram-Follower-Abgleich eingerichtet: alle 2 Stunden.');
}
