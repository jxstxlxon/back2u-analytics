/**
 * BACK2U: privater Google-Sheets-Feed für das Netlify-Dashboard.
 * Die Tabelle bleibt privat; nur POST-Anfragen mit dem separaten Secret
 * aus Apps Script > Projekteinstellungen > Skripteigenschaften erhalten Daten.
 * Script Property: BACK2U_FEED_TOKEN
 */
const BACK2U_SPREADSHEET_ID = '1-7pXWyfcRJhtaohaGZZTFzCw62QZuRNFrSD-7LUsjMM';

function doPost(e) {
  const property = PropertiesService.getScriptProperties().getProperty('BACK2U_FEED_TOKEN');
  let supplied = '';
  try { supplied = String(JSON.parse(e.postData.contents).token || ''); } catch (_) {}
  if (!property || property.length < 24 || supplied !== property)
    return back2uJson_({ error: 'unauthorized' });
  try {
    const book = SpreadsheetApp.openById(BACK2U_SPREADSHEET_ID);
    const daily = back2uSheet_(book, 'YouTube_Live', [
      ['date', 'date'], ['views', 'views'], ['likes', 'likes'], ['comments', 'comments']
    ]);
    const videos = back2uSheet_(book, 'YouTube_Videos', [
      ['video', 'video'], ['views', 'youtubevideoviews', 'views'],
      ['likes', 'likes'], ['comments', 'comments'],
      ['subscribers_gained', 'subscribersgained'],
      ['video_title', 'videotitle'], ['published_at', 'publishdate'],
      ['videourl', 'fullvideourl'], ['videoimage', 'videoimageurldefault']
    ]);
    return back2uJson_({ schema: 1, fetchedAt: new Date().toISOString(), daily: daily, videos: videos });
  } catch (err) {
    return back2uJson_({ error: 'source_unavailable' });
  }
}
function back2uSheet_(book, name, wanted) {
  const sheet = book.getSheetByName(name);
  if (!sheet) throw new Error('Missing tab');
  const last = Math.min(sheet.getLastRow(), 3001), cols = Math.min(sheet.getLastColumn(), 26);
  if (last < 2 || cols < 1) return [];
  const rows = sheet.getRange(1, 1, last, cols).getDisplayValues();
  const normal = function (v) { return String(v || '').toLowerCase().replace(/[^a-z0-9]/g, ''); };
  const head = rows[0].map(normal);
  const map = wanted.map(function (spec) {
    for (let i = 1; i < spec.length; i++) {
      const index = head.indexOf(spec[i]);
      if (index !== -1) return index;
    }
    return -1;
  });
  if (map[0] < 0) throw new Error('Missing ID/date column');
  return rows.slice(1).filter(function (r) { return r[map[0]]; }).map(function (r) {
    const item = {};
    wanted.forEach(function (spec, i) { item[spec[0]] = map[i] < 0 ? '' : r[map[i]]; });
    return item;
  });
}
function back2uJson_(body) {
  return ContentService.createTextOutput(JSON.stringify(body)).setMimeType(ContentService.MimeType.JSON);
}
