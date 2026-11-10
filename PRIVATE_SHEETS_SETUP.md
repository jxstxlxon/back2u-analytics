# BACK2U – sicherer Google-Sheets-Feed (Vorbereitung)

**Noch nicht auf main/Netlify live.** Diese Funktionen liegen auf einem isolierten Testbranch. Die Google-Tabelle bleibt privat.

## Daten
- Google Spreadsheet: `1-7pXWyfcRJhtaohaGZZTFzCw62QZuRNFrSD-7LUsjMM`
- `YouTube_Live`: `date, views, likes, comments` (tägliche Kanalzahlen)
- `YouTube_Videos`: Video-ID, 28-Tage-Aufrufe/Likes/Kommentare/Abonnenten, Titel, Datum, Links, Vorschau
- Instagram und TikTok sind noch nicht Teil dieses privaten Feeds; Archivdaten bleiben im Dashboard.
- Daten können wegen YouTube/Windsor verzögert sein. `generatedAt` ist **nicht** das Ende des Berichtszeitraums; hierfür wird `dataThrough` geliefert.

## Private Verbindung einrichten (Eigentümer)
1. Neues Google Apps Script Projekt auf https://script.google.com/home/projects/create erstellen (bei Bedarf Safari Desktopmodus).
2. In `Code.gs` den vollständigen Inhalt von `scripts/back2u-sheets-feed.gs` einfügen und speichern. Die Tabelle ist im Code mit ihrer ID fest zugeordnet; es wird nichts veröffentlicht.
3. In Apps Script unter **Projekteinstellungen > Skripteigenschaften** eine Eigenschaft `BACK2U_FEED_TOKEN` mit einem neu erzeugten, unabhängigen **mindestens 24 Zeichen langen** zufälligen Secret anlegen. Nicht im Chat posten, nicht in GitHub committen.
4. **Bereitstellen > Neue Bereitstellung > Web-App**; Ausführen als **Ich**; Zugriff **Jeder** (für serverseitige POSTs nötig; ohne gültiges Secret liefert die App keine Tabellenwerte). Die angeforderten Berechtigungen für den Zugriff auf die eigene Tabelle erlauben.
5. Die generierte `https://script.google.com/macros/s/.../exec` URL kopieren.
6. Im **bestehenden** Netlify-Projekt die Environment-Variablen `BACK2U_GOOGLE_FEED_URL` (Web-App-URL) und `BACK2U_GOOGLE_FEED_SECRET` (das gleiche Secret) als **nicht-öffentliche Server-Variablen** einrichten.
7. Erst dann diesen Branch auf main mergen/deployen und nach Anmeldung `/api/diagnostics` sowie `/api/snapshot` testen. Die API akzeptiert den Sheets-Feed nur bei vollständiger Konfiguration, andernfalls bleibt die frühere Windsor-Abfrage aktiv.
8. Nach erfolgreichem Test: Sicherstellen, dass die Daten nicht im öffentlichen HTML, GitHub oder in Screenshot-URLs auftauchen. Alte Windsor-API-Schlüssel nach Rotation auf Netlify aktualisieren oder deaktivieren.

## Sicherheitsmodell
Der Browser spricht **nur** mit der passwortgeschützten Netlify-Funktion. Der Feed akzeptiert ausschließlich POST mit einem separaten langen Token im JSON-Body, dessen Sollwert in Google Apps Script Script Properties liegt. Die private Tabelle wird weder als „Jeder mit Link“ freigegeben noch „Im Web veröffentlicht“. Der Token und das Apps Script URL stehen nicht im öffentlichen Repository.

Der bestehende öffentliche HTML-Quellcode enthält weiterhin historische Analytics-Snapshots; das ist **unabhängig** vom Schutz des privaten Sheets und sollte für vollständige Privatsphäre später bereinigt werden.

## Status
- Script Vorlage hinzugefügt.
- Netlify Parser & optionale Anbindung im Testbranch angelegt.
- **Noch nicht** im Google-Konto als Web-App bereitgestellt, keine Netlify-Secrets gesetzt oder Live-Verbindung getestet.
