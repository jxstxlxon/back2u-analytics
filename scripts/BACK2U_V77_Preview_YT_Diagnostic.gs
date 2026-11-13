/**
 * BACK2U V7.7 – READ-ONLY YouTube Analytics Query Diagnosis.
 *
 * Select and run: back2uV77PreviewDiagnoseYT
 * This ONLY reads from your own YouTube Analytics channel.
 * It never imports, writes to D1, changes triggers or accesses secrets.
 * Logs only the diagnostic name, response row count, and short error type.
 */
function back2uV77PreviewDiagnoseYT() {
  if(typeof YouTube==='undefined'||typeof YouTubeAnalytics==='undefined')
    throw new Error('YouTube + YouTubeAnalytics in Apps Script > Dienste aktivieren.');
  const me=(YouTube.Channels.list('id',{mine:true}).items||[])[0];
  if(!me||me.id!=='UCBnnaMohI_VfKihekEwaQEw')
    throw new Error('Nicht mit dem erwarteten Back2u-YouTube-Kanal angemeldet.');

  const day=ms=>Utilities.formatDate(new Date(ms),'UTC','yyyy-MM-dd');
  const end=day(Date.now()-4*86400000);
  const start=day(Date.now()-32*86400000);
  const shared={startDate:start,endDate:end};

  const cases=[
    {name:'A: Kanal, nur Aufrufe',args:{
      ...shared,ids:'channel==MINE',metrics:'views'
    }},
    {name:'B: Top-Videos, nur Aufrufe',args:{
      ...shared,ids:'channel==MINE',metrics:'views',
      dimensions:'video',sort:'-views',maxResults:20
    }},
    {name:'C: Top-Videos, volle Metriken',args:{
      ...shared,ids:'channel==MINE',
      metrics:'views,estimatedMinutesWatched,averageViewDuration,averageViewPercentage,shares',
      dimensions:'video',sort:'-views',maxResults:20
    }},
    {name:'D: Top-Videos, Kanal-ID statt MINE',args:{
      ...shared,ids:'channel=='+me.id,metrics:'views',
      dimensions:'video',sort:'-views',maxResults:20
    }}
  ];
  Logger.log('YT-Diagnose: vier reine Lese-Abfragen, keine Datenübertragung.');
  for(const entry of cases){
    try{
      const result=YouTubeAnalytics.Reports.query(entry.args);
      const headers=(result&&result.columnHeaders||[]).map(h=>h.name);
      if(headers.indexOf('views')<0)
        throw new Error('Antwort ohne erwartete views-Spalte');
      Logger.log(entry.name+' -> OK, '+(result.rows||[]).length+' Zeilen');
    }catch(e){
      // No request data, video titles or secrets are logged.
      const message=String(e&&e.message||e).slice(0,180);
      Logger.log(entry.name+' -> FEHLER: '+message);
    }
  }
  Logger.log('YT-Diagnose abgeschlossen. Keine Änderungen vorgenommen.');
}
