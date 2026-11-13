/**
 * BACK2U V7.7 ISOLATED PREVIEW ONLY — manual one-off YouTube/Instagram media check.
 *
 * ADD as ONE NEW file to the existing private BACK2U LIVE CONNECTOR Apps Script.
 * Nothing runs automatically; NEVER install a trigger for these functions.
 * Does NOT change existing YouTube, Instagram, TikTok or Windsor syncs.
 *
 * Private Apps Script properties required for the SEND function:
 * BACK2U_V77_PREVIEW_URL         = https://feature-back2u-v77-....workers.dev
 * BACK2U_V77_PREVIEW_FEED_SECRET = new, unrelated >=24-character random secret
 *
 * The same random secret belongs ONLY in the v7.7 Cloudflare Preview runtime
 * variable BACK2U_GOOGLE_FEED_SECRET (Secret type).
 * Do not replace the production BACK2U_CLOUDFLARE_FEED_SECRET property.
 *
 * Uses the existing private project constant BACK2U_SPREADSHEET_ID.
 * Does not log any private tokens, video titles or payloads.
 */

function b2uV77PreviewConfig_() {
  const props=PropertiesService.getScriptProperties();
  const base=String(props.getProperty('BACK2U_V77_PREVIEW_URL')||'').trim().replace(/\/+$/,'');
  const secret=String(props.getProperty('BACK2U_V77_PREVIEW_FEED_SECRET')||'');
  // Deliberately reject the production hostname and any unrelated domain.
  if(!/^https:\/\/feature-back2u-v77-[a-z0-9-]+\.workers\.dev$/i.test(base))
    throw new Error('Nur die V7.7-Cloudflare-Preview-URL ist zulaessig; keine Live-URL.');
  if(secret.length<24)throw new Error('Separates BACK2U_V77_PREVIEW_FEED_SECRET fehlt oder ist zu kurz.');
  if(typeof BACK2U_SPREADSHEET_ID==='undefined'||!BACK2U_SPREADSHEET_ID)
    throw new Error('Die bisherige private BACK2U_SPREADSHEET_ID-Konstante fehlt.');
  return {base,secret};
}
function b2uV77PreviewRows_(tab,expected,map){
  if(!tab||tab.getLastRow()<11)
    throw new Error('Direkter API-Video-Tab fehlt oder hat weniger als 10 Videos.');
  const rows=tab.getDataRange().getDisplayValues();
  const norm=s=>String(s||'').toLowerCase().normalize('NFKD')
    .replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]/g,'');
  const actual=rows[0].map(norm);
  const indexes=expected.map(x=>actual.indexOf(norm(x)));
  if(indexes.some(x=>x<0))throw new Error('API-Tabellenkopf ist nicht vollstaendig.');
  const videos=rows.slice(1).map(row=>map(indexes.map(i=>row[i]))).filter(Boolean);
  if(videos.length<10||videos.length>1400)
    throw new Error('Unerwartete gueltige Videoanzahl: '+videos.length);
  return videos;
}
function b2uV77PreviewDate_(x){
  const d=String(x||'').slice(0,10);
  return /^\d{4}-\d{2}-\d{2}$/.test(d)?d:null;
}
function b2uV77PreviewFresh_(tab,column){
  const max=Math.min(tab.getLastRow(),30);
  const dates=tab.getRange(2,column,max-1,1).getDisplayValues();
  const through=Utilities.formatDate(new Date(Date.now()-2*86400000),'UTC','yyyy-MM-dd');
  const today=Utilities.formatDate(new Date(),'UTC','yyyy-MM-dd');
  if(!dates.some(x=>{const d=b2uV77PreviewDate_(x[0]);return d&&d>=through&&d<=today;}))
    throw new Error('Direkt-Video-Quelle aelter als 48 Stunden; Import gestoppt.');
}
function b2uV77PreviewCatalogs_(){
  if(typeof BACK2U_SPREADSHEET_ID==='undefined'||!BACK2U_SPREADSHEET_ID)
    throw new Error('BACK2U_SPREADSHEET_ID nicht eingerichtet.');
  const ss=SpreadsheetApp.openById(BACK2U_SPREADSHEET_ID);
  const yt=ss.getSheetByName('YouTube_API_All');
  const ig=ss.getSheetByName('Instagram_API_All');
  if(!yt||!ig)throw new Error('YouTube_API_All oder Instagram_API_All nicht gefunden.');
  b2uV77PreviewFresh_(yt,9);
  b2uV77PreviewFresh_(ig,13);
  const videosYt=b2uV77PreviewRows_(yt,[
    'Video ID','Titel','Veröffentlicht','Video URL','Thumbnail URL',
    'Aufrufe gesamt','Likes gesamt','Kommentare gesamt','Letztes Update','Status','Kanal ID'
  ],v=>{
    const [id,title,published,url,thumb,views,likes,comments,,status,channel]=v;
    if(!/^[\w-]{11}$/.test(String(id))||String(channel)!=='UCBnnaMohI_VfKihekEwaQEw'||
      String(status).toLowerCase()!=='public'||!b2uV77PreviewDate_(published))return null;
    return {id,title,date:b2uV77PreviewDate_(published),url,thumb,views,likes,comments};
  });
  const videosIg=b2uV77PreviewRows_(ig,[
    'Media ID','Caption','Media type','Product type','Permalink','Published at',
    'Thumbnail URL','Likes','Comments','Views','Reach','Insights updated','Last seen','Source'
  ],v=>{
    const [id,title,,,url,published,thumb,likes,comments,views,reach,,,source]=v;
    if(!/^\d{12,25}$/.test(String(id))||
      !/^https:\/\/(?:www\.)?instagram\.com\/(?:reel|p|tv)\//.test(String(url))||
      source!=='Meta Instagram API'||!b2uV77PreviewDate_(published))return null;
    return {id,title,date:b2uV77PreviewDate_(published),url,thumb,views,likes,comments,reach};
  });
  return [
    {platform:'yt',accountId:'UCBnnaMohI_VfKihekEwaQEw',videos:videosYt},
    {platform:'ig',accountId:'lxon_jxmpstyle',videos:videosIg}
  ];
}
function back2uV77PreviewCheck(){
  // READ-ONLY, no HTTP writes. Do this before configuring a separate secret.
  const reports=b2uV77PreviewCatalogs_();
  for(const r of reports)Logger.log('Preview check: '+r.platform+' '+r.videos.length+' gueltige API-Videos.');
  Logger.log('Nur gelesen. Kein Import und keine Live-API veraendert.');
}
function back2uV77PreviewSend(){
  // One-off manual action after the Cloudflare Preview secret is set.
  const {base,secret}=b2uV77PreviewConfig_();
  const reports=b2uV77PreviewCatalogs_();
  const snapshotDate=Utilities.formatDate(new Date(),'UTC','yyyy-MM-dd');
  for(const report of reports){
    const payload={schema:1,platform:report.platform,accountId:report.accountId,
      snapshotDate,videos:report.videos};
    const response=UrlFetchApp.fetch(base+'/api/direct-media/ingest',{
      method:'post',contentType:'application/json',
      headers:{Authorization:'Bearer '+secret},
      payload:JSON.stringify(payload),muteHttpExceptions:true
    });
    const status=response.getResponseCode();
    if(status!==200)
      throw new Error('Preview '+report.platform+' HTTP '+status+
        ': '+response.getContentText().slice(0,120));
    Logger.log('V7.7 Preview import '+report.platform+' '+report.videos.length+' Videos: OK');
  }
  Logger.log('Nur Preview-Datenbank aktualisiert. Kein Trigger erstellt.');
}
