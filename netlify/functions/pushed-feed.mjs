/* Receive an authenticated push from Google Apps Script and persist it in Netlify Blobs.
   Dashboard data remains available across serverless invocations and deployments. */
import { getStore } from '@netlify/blobs';
import { createHash, timingSafeEqual } from 'node:crypto';

const STORE = { name: 'back2u-private-analytics', region: 'eu-central-1' };
const KEY = 'youtube-latest';
const toNum = x => x === null || x === undefined || String(x).trim() === '' ? null : Number.isFinite(Number(x)) ? Number(x) : null;
const toDay = x => String(x || '').slice(0, 10);
const toText = x => String(x ?? '').slice(0, 500);
const toUrl = x => { try {const u = new URL(String(x)); return u.protocol === 'https:' ? u.href : null;} catch {return null;} };
const same = (a,b) => timingSafeEqual(createHash('sha256').update(String(a)).digest(),createHash('sha256').update(String(b)).digest());
const json = (data,status=200) => new Response(JSON.stringify(data), {status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'private, no-store','x-content-type-options':'nosniff'}});

function parsePush(body) {
  if (body?.schema !== 1 || !Array.isArray(body.daily) || !Array.isArray(body.videos) ||
      body.daily.length > 1000 || body.videos.length > 1500) throw Error('Ungültiges Google-Sheets-Datenformat');
  const dailyByDate = new Map();
  for (const d of body.daily) {
    const date = toDay(d.date);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;
    dailyByDate.set(date,{d:date,views:toNum(d.views),likes:toNum(d.likes),comments:toNum(d.comments)});
  }
  const daily = [...dailyByDate.values()].sort((a,b)=>a.d.localeCompare(b.d));
  const videosById = new Map();
  for (const v of body.videos) {
    const id = String(v.video || '');
    if (!/^[\w-]{11}$/.test(id)) continue;
    videosById.set(id,{
      id,platform:'yt',title:toText(v.video_title)||'YouTube Short',
      date:toDay(v.published_at),
      url:'https://www.youtube.com/shorts/'+id,
      thumb:toUrl(v.videoimage)||'https://i.ytimg.com/vi/'+id+'/hqdefault.jpg',
      views:toNum(v.views), likes:toNum(v.likes), comments:toNum(v.comments),
      follows:toNum(v.subscribers_gained),reportType:'period',
      source:'Windsor.ai: Werte im 28-Tage-Berichtszeitraum'
    });
  }
  if (!daily.length) throw Error('Keine gültigen YouTube-Tageswerte');
  return {
    schema:1,generatedAt:new Date().toISOString(),status:'partial',
    platforms:{
      yt:{daily,videos:[...videosById.values()],profile:{},videoMetricDays:28},
      ig:{daily:[],videos:[],profile:{}},
      tt:{daily:[],videos:[],profile:{}}
    },
    errors:[
      {platform:'ig',task:'ig-feed',message:'Instagram-Live-Feed noch nicht eingerichtet'},
      {platform:'tt',task:'tt-feed',message:'TikTok-Live-Feed noch nicht eingerichtet'}
    ],
    source:'Privates Google Sheet / Google-zu-Netlify-Sync',
    refreshInterval:'24h',
    dataThrough:daily.at(-1).d,
    sheetFetchedAt:typeof body.fetchedAt==='string'?toText(body.fetchedAt):null,
    historyLimitDays:28
  };
}

export async function ingestGoogleSheets(request) {
  if (request.method !== 'POST') return json({error:'POST erforderlich'},405);
  const key = process.env.BACK2U_GOOGLE_FEED_SECRET || '';
  if (key.length < 24) return json({error:'Sync nicht konfiguriert'},503);
  const provided = (request.headers.get('authorization')||'').replace(/^Bearer\s+/i,'');
  if (!provided || !same(provided,key)) return json({error:'Zugriff verweigert'},403);
  const size = Number(request.headers.get('content-length')||0);
  if (size > 1_500_000) return json({error:'Daten zu groß'},413);
  let payload;
  try {const raw=await request.text();if(raw.length>1_500_000)return json({error:'Daten zu groß'},413);payload=JSON.parse(raw);} catch {return json({error:'Ungültiges JSON'},400);}
  let snapshot;
  try {snapshot=parsePush(payload);} catch(e) {return json({error:String(e.message)},422);}
  try {await getStore(STORE).setJSON(KEY,snapshot,{metadata:{syncedAt:snapshot.generatedAt,dataThrough:snapshot.dataThrough}});}
  catch {return json({error:'Speichern der privaten Daten fehlgeschlagen'},502);}
  return json({ok:true,source:'private-google-sheets-push',days:snapshot.platforms.yt.daily.length,videos:snapshot.platforms.yt.videos.length,dataThrough:snapshot.dataThrough});
}
export async function getPushedGoogleSheets() {
  const entry = await getStore(STORE).get(KEY,{type:'json',consistency:'strong'});
  if (!entry || entry.schema !== 1 || !Array.isArray(entry.platforms?.yt?.daily)) return null;
  return entry;
}
