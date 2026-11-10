# BACK2U – Creator Command Center

Die aktuelle Netlify-Live-Version liegt in `site/index.html` und `netlify/functions/api.mjs`.
Das Root-`index.html` dient nur als historischer Stand und wird von Netlify **nicht** veröffentlicht.

## Netlify mit diesem Repository verbinden
1. Im **bestehenden** Netlify-Projekt `quiet-halva-285199` unter **Project configuration → Developer settings → Repository** auf **Link repository** tippen.
2. GitHub wählen und `jxstxlxon/back2u-analytics` mit Branch `main` verbinden.
3. Netlify sollte die `netlify.toml` automatisch einlesen: Build `npm run build`, Publish `site`, Functions `netlify/functions`.
4. Drei Umgebungsvariablen als **Secrets** hinterlegen (wurden bereits im Netlify-Projekt vom Eigentümer eingerichtet): `WINDSOR_API_KEY`, `DASHBOARD_PASSWORD`, `SESSION_SECRET`.
5. Nach dem erfolgreichen Deploy `https://quiet-halva-285199.netlify.app/api/health` öffnen. `configured:true` bedeutet nur: Variablen sind vorhanden, nicht dass alle Windsor-Daten verfügbar sind.
6. Webseite öffnen, Dashboard-Passwort eingeben; danach sollten Live-Daten automatisch geladen werden.

## Datenschutz
- Keine Zugangsdaten oder API-Schlüssel im Quellcode!
- Die **Live-Snapshot-API** erfordert eine Anmeldung. 
- **Achtung:** Das Repository und die Netlify-Seite sind derzeit öffentlich; im HTML sind historische Exportwerte eingebettet und damit öffentlich lesbar. Für vollständig private Analytics ist eine zusätzliche Zugangssperre vor der gesamten Website und ein privates Repository nötig.

## Daten
- YouTube, Instagram, TikTok über Windsor.ai.
- Windsor-Testzugang begrenzt die abfragbare Historie derzeit auf ca. 30 Tage; der Server fragt 28 Tage ab.
- YouTube-Videoviews werden zeitbezogen, Instagram-/TikTok-Einzelvideoaufrufe als Lifetime-Werte geliefert. Nicht direkt als identische Messperioden vergleichen.
- 90-Tage-Filter zeigt nur verfügbare Daten; fehlende Zeiträume nicht als Null behandeln.

## Fehlerbehebung
- Bei 404 auf `/api/health`: Netlify hat die Serverfunktion nicht mitgebaut oder Redirects nicht angewendet.
- Bei `configured:false`: Netlify-Umgebungsvariablen kontrollieren und neuen Deploy auslösen.
- Bei Login-Fehler: `DASHBOARD_PASSWORD` prüfen, keine Schlüssel im Chat teilen.
- Bei 502: Windsor-API-Zugriff, Trial-Limits und Konto-Freigaben prüfen.

Hinweis: Die vorherige lokale Python-Prototypversion kann im Repository noch vorhanden sein, wird aber nicht für Netlify veröffentlicht.
