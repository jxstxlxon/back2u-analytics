/**
 * Diesen Funktionsblock UNTEN in die vorhandene Apps-Script-Datei Code.gs kopieren.
 * Verwendet die bereits vorhandenen Helfer BACK2U_SPREADSHEET_ID und back2uSheet_.
 * Keine neuen Passwörter in den Code eintragen.
 */
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
    ])
  };

  const result = UrlFetchApp.fetch('https://quiet-halva-285199.netlify.app/api/ingest', {
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
    .inTimezone('Europe/Berlin').atHour(8).nearMinute(0).everyDays(1).create();
  Logger.log('Automatischer BACK2U-Sync täglich ca. 08:00 Uhr angelegt.');
}
