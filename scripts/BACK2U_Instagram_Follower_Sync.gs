/**
 * BACK2U: Offiziellen Instagram-Followerstand abrufen und sicher an Cloudflare D1 senden.
 *
 * Als NEUE Datei InstagramFollowerSync.gs in BACK2U LIVE CONNECTOR einfügen.
 * Nutzt die bereits vorhandenen privaten Script Properties IG_SUAT_TOKEN
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

  const graphResponse = UrlFetchApp.fetch(
    'https://graph.instagram.com/v25.0/me?fields=username,followers_count',
    {
      method: 'get',
      headers: {Authorization: 'Bearer ' + instagramToken},
      muteHttpExceptions: true
    }
  );

  const graphText = graphResponse.getContentText();
  if (graphResponse.getResponseCode() !== 200)
    throw new Error('Instagram Graph API HTTP ' + graphResponse.getResponseCode()
      + ' – prüfe den bestehenden IG_SUAT_TOKEN und seine Berechtigungen.');

  let profile;
  try { profile = JSON.parse(graphText); }
  catch (_) { throw new Error('Instagram hat kein gültiges JSON zurückgegeben.'); }

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
