/* Private Google Apps Script --> Netlify adapter. No keys or account data stored in source. */
const numeric = x => (x === null || x === undefined || String(x).trim() === '') ? null : Number.isFinite(Number(x)) ? Number(x) : null;
const day = x => String(x || '').slice(0, 10);
const safe = x => String(x ?? '').slice(0, 500);
const url = x => { try { const u = new URL(String(x)); return u.protocol === 'https:' ? u.href : null; } catch { return null; } };
let memo = null;

export async function googleSheetsSnapshot(force = false) {
  if (!force && memo && Date.now() < memo.until) return { ...memo.data, fromCache: true };
  const raw = process.env.BACK2U_GOOGLE_FEED_URL || '';
  const secret = process.env.BACK2U_GOOGLE_FEED_SECRET || '';
  if (secret.length < 24) throw Error('Sheets-Feed-Secret fehlt oder ist zu kurz');
  let endpoint;
  try { endpoint = new URL(raw); } catch { throw Error('Google-Sheets-Feed-URL ungültig'); }
  if (endpoint.protocol !== 'https:' || endpoint.hostname !== 'script.google.com' || !/^\/macros\/s\/[^/]+\/exec$/.test(endpoint.pathname))
    throw Error('Sheets-Feed-URL muss eine Google Apps Script-Web-App sein');
  const response = await fetch(endpoint.href, {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify({ token: secret }),
    redirect: 'follow',
    signal: AbortSignal.timeout(28000)
  });
  if (!response.ok) throw Error('Google-Sheets-Feed antwortet HTTP ' + response.status);
  let body;
  try { body = await response.json(); } catch { throw Error('Google-Sheets-Feed hat kein JSON zurückgegeben'); }
  if (body?.error) throw Error(body.error === 'unauthorized' ? 'Google-Sheets-Feed-Secret falsch' : 'Google-Sheets-Feed konnte die Tabelle nicht lesen');
  if (body?.schema !== 1 || !Array.isArray(body.daily) || !Array.isArray(body.videos)) throw Error('Google-Sheets-Feed: falsches Datenformat');
  if (body.daily.length > 3000 || body.videos.length > 3000) throw Error('Google-Sheets-Feed: zu viele Zeilen');
  const daily = body.daily
    .filter(x => /^\d{4}-\d{2}-\d{2}$/.test(day(x.date)))
    .map(x => ({ d: day(x.date), views: numeric(x.views), likes: numeric(x.likes), comments: numeric(x.comments) }))
    .sort((a,b) => a.d.localeCompare(b.d));
  const videos = body.videos
    .filter(x => /^[\w-]{11}$/.test(String(x.video || '')))
    .map(x => {
      const id = String(x.video);
      return {
        id, platform: 'yt', title: safe(x.video_title) || 'YouTube Short',
        date: day(x.published_at),
        url: 'https://www.youtube.com/shorts/' + id,
        thumb: url(x.videoimage) || 'https://i.ytimg.com/vi/' + id + '/hqdefault.jpg',
        views: numeric(x.views), likes: numeric(x.likes), comments: numeric(x.comments),
        follows: numeric(x.subscribers_gained), reportType: 'period',
        source: 'Windsor.ai: Aufrufe im 28-Tage-Berichtsfenster'
      };
    });
  if (!daily.length) throw Error('YouTube_Live enthält noch keine gültigen Tagesdaten');
  const result = {
    schema: 1, generatedAt: new Date().toISOString(),
    status: 'partial',
    platforms: {
      yt: { daily, videos, profile: {} },
      ig: { daily: [], videos: [], profile: {} },
      tt: { daily: [], videos: [], profile: {} }
    },
    errors: [
      { platform: 'ig', task: 'ig-feed', message: 'Instagram-Feed noch nicht eingerichtet' },
      { platform: 'tt', task: 'tt-feed', message: 'TikTok-Feed noch nicht eingerichtet' }
    ],
    source: 'Privates Google Sheet / Windsor.ai',
    refreshInterval: '24h',
    dataThrough: daily.at(-1).d,
    sheetFetchedAt: typeof body.fetchedAt === 'string' ? body.fetchedAt : null,
    historyLimitDays: 28
  };
  memo = { data: result, until: Date.now() + 5 * 60 * 1000 };
  return result;
}
