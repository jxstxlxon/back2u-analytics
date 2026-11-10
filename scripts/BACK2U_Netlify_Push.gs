/**
 * Diese komplette Datei als NetlifyPush.gs in Apps Script verwenden.
 * Verwendet die bereits vorhandenen Helfer BACK2U_SPREADSHEET_ID und back2uSheet_.
 * Das Ziel BACK2U_INGEST_ENDPOINT liegt in privaten Script Properties.
 * Keine neuen Passwörter in den Code eintragen.
 */
/**
 * Liefert die Instagram-Daten aus den von Windsor benannten Tabellen-Spalten.
 * getDisplayValues bewahrt mehrstellige Instagram-Media-IDs unverändert.
 * Zahlen werden auf Netlify kontrolliert und in Number umgewandelt.
 */
function back2uInstagramSheet_(book, name, columns) {
  const sh = book.getSheetByName(name);
  if (!sh) throw new Error('Instagram-Tabellenblatt fehlt: ' + name);
  const rows = sh.getDataRange().getDisplayValues();
  if (rows.length < 2) throw new Error('Noch keine Instagram-Zeilen in ' + name);
  const normalize = value => String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const header = rows[0].map(normalize);
  const mapped = columns.map(spec => {
    const index = header.findIndex(h => spec.slice(1).some(alias => normalize(alias) === h));
    if (index < 0) throw new Error('Windsor-Spalte fehlt in ' + name + ': ' + spec[0]);
    return [spec[0], index];
  });
  return rows.slice(1).filter(row => row.some(cell => cell !== '')).map(row => {
    const record = {};
    mapped.forEach(([key, index]) => { record[key] = row[index] === undefined ? '' : row[index]; });
    return record;
  });
}

function pushToNetlify() {
  const secret = PropertiesService.getScriptProperties().getProperty('BACK2U_FEED_TOKEN');
  if (!secret || secret.length < 24) throw new Error('BACK2U_FEED_TOKEN fehlt.');

  const book = SpreadsheetApp.openById(BACK2U_SPREADSHEET_ID);
  const payload = {
    schema: 1,
    fetchedAt: new Date().toISOString(),
    daily: back2uSheet_(book, 'YouTube_Live', [
      ['date', 'date'], ['views', 'views'], ['likes', 'likes'], ['comments', 'comments']
    ]),
    videos: back2uSheet_(book, 'YouTube_Videos', [
      ['video', 'video'], ['views', 'youtubevideoviews', 'views'],
      ['likes', 'likes'], ['comments', 'comments'],
      ['subscribers_gained', 'subscribersgained'],
      ['video_title', 'videotitle'], ['published_at', 'publishdate'],
      ['videourl', 'fullvideourl'], ['videoimage', 'videoimageurldefault']
    ]),
    igDaily: back2uInstagramSheet_(book, 'Instagram_Live', [
      ['date', 'date'], ['views', 'views'], ['reach', 'reach'],
      ['likes', 'likes'], ['comments', 'comments'],
      ['follower_count_1d', 'newfollowers1day', 'followercount1d']
    ]),
    igVideos: back2uInstagramSheet_(book, 'Instagram_Videos', [
      ['media_id', 'mediaid'], ['media_caption', 'mediacaption'],
      ['media_views', 'mediaviews'], ['media_like_count', 'medialikecount'],
      ['media_comments_count', 'commentscount', 'mediatotalcommentscount'],
      ['media_reach', 'mediareach'], ['media_permalink', 'mediapermalink'],
      ['media_thumbnail_url', 'videothumbnailurl', 'mediathumbnailurl'],
      ['media_type', 'mediatype'], ['date', 'date']
    ])
  };

  // Endpoint is stored in private Script Properties to keep deploy-specific values out of Git.
  const endpoint = PropertiesService.getScriptProperties().getProperty('BACK2U_INGEST_ENDPOINT');
  if (!endpoint || !/^https:\/\/[^/]+\.netlify\.app\/api\/ingest$/.test(endpoint)) {
    throw new Error('BACK2U_INGEST_ENDPOINT fehlt oder ist ungültig.');
  }
  const result = UrlFetchApp.fetch(endpoint, {
    method: 'post',
    contentType: 'application/json',
    headers: { Authorization: 'Bearer ' + secret },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  });
  const status = result.getResponseCode();
  const response = result.getContentText();
  if (status !== 200) throw new Error('Netlify HTTP ' + status + ': ' + response.slice(0, 350));
  Logger.log('BACK2U Synchronisierung erfolgreich: ' + response);
}

function installBack2uDailySync() {
  const existing = ScriptApp.getProjectTriggers().filter(function (t) {
    return t.getHandlerFunction() === 'pushToNetlify';
  });
  existing.forEach(function (t) { ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger('pushToNetlify').timeBased()
    .inTimezone('Europe/Berlin').atHour(9).nearMinute(0).everyDays(1).create();
  Logger.log('Automatischer BACK2U-Sync täglich ca. 09:00 Uhr angelegt.');
}
