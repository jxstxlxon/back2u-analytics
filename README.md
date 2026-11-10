# BACK2U – Creator Command Center

Der öffentliche Netlify-Build nutzt `site/index.html` und `netlify/functions/api.mjs`.
Die separate Root-Datei `index.html` ist ein historischer Stand und wird nicht als Website veröffentlicht.

## Deployment

1. Das vorhandene Netlify-Projekt `quiet-halva-285199` ist mit diesem Repository und Branch `main` verbunden.
2. Netlify übernimmt aus `netlify.toml`: Build `npm run build`, Publish `site`, Functions `netlify/functions`.
3. Die bestehenden Environment-Variablen `DASHBOARD_PASSWORD` und `SESSION_SECRET` sichern die Dashboard-Sitzung.
4. Die ebenfalls als Netlify-Secrets hinterlegten `BACK2U_GOOGLE_FEED_SECRET` und `BACK2U_GOOGLE_FEED_URL` gehören zum privaten Google-Sheets-Feed. Der produktive Datenabgleich erfolgt per **Push** aus Google Apps Script und braucht derzeit nur den Feed-Secret-Wert.
5. Nach dem Deploy `/api/health` prüfen. `configured:true` bedeutet ausschließlich, dass die erforderlichen Variablen vorhanden sind.
6. `/api/diagnostics` zeigt nach Anmeldung die tatsächlich eingelesenen YouTube-Tage und Videoanzahl.

## Datenquelle

- Windsor.ai synchronisiert YouTube- und Instagram-Daten täglich in eine **private** Google-Tabelle.
- Das Google Apps Script `NetlifyPush.gs` überträgt YouTube- und Instagram-Daten mit einem gesonderten Sicherheitstoken an `/api/ingest`. Nach dem Aktualisieren der Script-Datei `pushToNetlify` manuell testen und `installBack2uDailySync` ausführen, um den 09:00-Uhr-Abgleich in der Zeitzone Europe/Berlin neu zu setzen (Sommerzeit beachten).
- Netlify hält die übernommenen Werte in einem privaten Datenspeicher. Der Browser bekommt sie nur nach erfolgreicher Dashboard-Anmeldung.
- Der ältere direkte Windsor-API-Abruf ist deaktiviert: Er wird nicht für die laufende Google-Sheets-Synchronisierung benötigt.
- YouTube-Einzelvideos haben zurzeit **28-Tage-Kennzahlen**. Die 7- und 90-Tage-Auswahl darf diese Werte nicht als andere Berichtszeiträume ausgeben.
- Instagram hat jetzt zwei Windsor-Exporte: `Instagram_Live` (Tagesaufrufe, Reichweite, Interaktionen) und `Instagram_Videos` (Gesamtwerte je Medienobjekt) – tägliche Synchronisierung via Apps Script. TikTok bleibt bei Archivdaten.

## Sicherheit

- Keine Zugangsdaten, privaten Apps-Script-URLs oder Tokens in den Quellcode oder den Chat kopieren.
- Das Repository sowie die eigentliche Website sind derzeit öffentlich. Historische Zahlen sind weiterhin im HTML eingebettet; Dashboard-Login schützt **nur die Live-API**, nicht diese statischen Archivwerte.
- Netlifys Secret-Scanner bleibt **aktiv**. Keine pauschalen Ausschlüsse für erkannte Secret-Werte einrichten.
- Falls ein Netlify-Secret-Wert offensichtlich nur ein Variablenname oder Platzhalter ist, den **Wert in Netlify** korrigieren oder ein ungenutztes Secret entfernen. Ein tatsächlich exponierter geheimer Wert muss in seinem Ursprungsdienst rotiert werden.

## Fehlerbehebung

- `/api/health` gibt 404 zurück: Netlify-Functions-Bundle oder Redirect-Konfiguration kontrollieren.
- `configured:false`: Netlify-Secrets und neue Bereitstellung prüfen.
- `/api/diagnostics` meldet `waiting`: Apps Script `pushToNetlify` einmal ausführen und das Ausführungsprotokoll prüfen.
- `/api/diagnostics` meldet YouTube `ok`: Der Feed ist übertragen worden. Der jüngste Berichtstag kann wegen der YouTube-Verzögerung zurückliegen.
- Secret-Scanning-Fehler: die gemeldeten konkreten Fundstellen kontrollieren und echte Secret-Werte entfernen; Scanner nicht abschalten.
