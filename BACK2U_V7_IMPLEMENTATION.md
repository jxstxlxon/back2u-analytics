# BACK2U V7 – Umsetzung, Abnahme und nächste Schritte

**Stand:** 12. November 2026 – Implementierungsbranch. **Kein direktes Produktions-Deployment.**

## Was wirklich umgesetzt wurde

### 1. Tagesdaten und Diagramme
- Anzeige verwendet für YouTube bevorzugt echte `views` aus Cloudflare/Analytics; `engaged` (interessierte Aufrufe) wird **nur dann** angezeigt, wenn keine echten Views im Zeitraum verfügbar sind, und ausdrücklich gekennzeichnet.
- Gemeinsame Tagesachse für den aktiven 7/28/90-Tage-Zeitraum. Fehlende Tage bleiben **leer**, nicht Null.
- Anzeige der letzten geprüften YouTube-Tagesdaten und Datendeckung im Diagramm.
- Kein „0 Aufrufe“ bei einer Plattform ohne Tagesbericht.
- Zusätzliches theme-adaptives **Kreisdiagramm unter dem Tagesverlauf**. Es zeigt ausschließlich bekannte Werte des ausgewählten Tages, inklusive fehlender Plattformen.
- YouTubes interessierte Aufrufe werden nicht mit normalen Video-/Profilaufrufen in die Anteile gemischt.
- Fehlende tägliche TikTok-Daten sind weiterhin **ein echtes Quellendatenproblem**. Die Display API für Videolisten liefert Gesamtwerte je Video, keine vollständige tägliche Profilstatistik. Nichts wird erfunden.

**Offen: neue YouTube-Tagesdaten tatsächlich in Cloudflare nachschieben.** Das bestehende, bereits angebundene `scripts/BACK2U_YouTube_Daily_Analytics.gs` sendet über ein privates Token an `/api/youtube-daily/ingest`. Er ist auf einen Sechs-Stunden-Trigger ausgelegt. Das Repository enthält diesen Code, aber ein GitHub-Commit führt das Skript im Google-Konto **nicht** aus. Die Cloudflare-Diagnose im authentifizierten Dashboard kann den `youtubeDailyVerified.dataThrough`-Stand anzeigen. Bei Rückstand: im verbundenen Apps-Script-Projekt den Trigger und sein Ausführungsprotokoll prüfen, `back2uYouTubeDailyRepair` einmal ausführen und danach die neue Backend-Diagnose kontrollieren. YouTube verarbeitet die neuesten Tage häufig verzögert. Keine pauschale Behauptung, dass der letzte Kalendertag schon vollständig verfügbar ist.

### 2. Experimente – nicht mehr Uploadmenge mit gesamten Tagesaufrufen verwechseln
- Die Grafik **Posting-Rhythmus** zeigt die Verteilung der Uploadtage (0, 1–2, 3–4, 5+ veröffentlichte Plattformvideos).
- Darunter **Formatvergleich** mit dem Median bisheriger Video-Gesamtaufrufe, Plattformen und Anzahl der vergleichbaren Videos. Historische YouTube-Zeitraumreports fließen hier nicht als Lifetime ein.
- **Eigener A/B-Vergleich:** Zwei Varianten, Anzahl veröffentlichter Videos und Summe der nach **identischen 24 Stunden** erfassten Aufrufe manuell eingeben. Ergebnisse berechnen Durchschnitt pro Video. Bei weniger als fünf Videos je Variante oder geringem Abstand wird ausdrücklich kein eindeutiger Sieger ausgerufen.
- **Dein nächster sauberer Test**: zuerst eine Sache ändern, dann nach 24 Stunden messen, dann sinnvoll vergleichen.
- Die Visualisierung erweckt **keinen Kausalitätsbeweis** über Upload-Frequenz.

### 3. Creator Hub
- Zieleingabe akzeptiert `10k` = 10.000, `10m` = 10.000.000, außerdem `1.5m` und `2,5m`. Keine ungültigen oder negativen Ziele.
- Posting-Kalender zeigt YouTube-/Instagram-/TikTok-Zahlen je Tag, Videotitel, Format, Thumbnail und Link sowie bekannte **bisherige Gesamtaufrufe**, nicht fälschlich Views am Veröffentlichungstag.
- Neue **Kommentar- & Caption-Werkstatt** mit vorgefertigten, nachbearbeitbaren kurzen und längeren englischen Texten. Kopieren und lokale Speicherung des Entwurfs.
- Neuer **Content-Planer** mit einstellbaren Testslots und drei/sieben Tagen, der anhand vorhandener Videos häufige erfolgreiche Formate nach Medianeindrücken priorisiert. Uhrzeiten stammen aus bisherigen manuell gewählten Testslots, sind **keine nachgewiesenen besten Postingzeiten**.
- Ein Button kopiert den Plan als strukturierten Auftrag für einen späteren ChatGPT-Workflow. Diese Website verwendet noch **keine live angebundene KI-API und veröffentlicht nichts autonom**.

### 4. Zielgruppe, Designs, Logo, Suche
- Themeangepasste Kreisdiagramme **für alle bekannten Alters- und Geschlechtssegmente**, nicht nur für den größten Anteil. Angezeigte Länder als lesbare Balken mit passenden Farbakzenten.
- Sichtbarer Archiv-Datenstand der Zielgruppenaufteilungen; aktuelle Followerstände sind nicht automatisch neue Demografie.
- TikTok-Stundenübersicht übernimmt Themefarben, statt nur blau zu bleiben.
- BACK2U-Logo bleibt Vektorgrafik; unscharf wirkender Gauß-Schatten auf dem horizontalen Logo wurde entfernt.
- Videosuche sucht nun wirklich in Videotitel/Songtexten, Format, Plattformname und Video-ID – in Einzel- und Gruppensicht.

## Vor einem Merge unbedingt testen
1. Pull-Request-Diff prüfen; Worker, D1, OAuth, Schlüssel und TikTok-Autorisierung wurden **nicht** verändert.
2. Auf PC und iPhone alle sechs Tabs, Suche, Kalendertage, 10k-/10m-Ziele, Textstudio, Planner, Filter und 7/28/90-Tage-Modi ausprobieren.
3. Tagestabelle: Einzelplattform YouTube, Instagram, TikTok; alle zusammen; wähle ein Datum mit und ohne Werte. Im Kreisdiagramm keine scheinbaren 0-Werte für fehlende Daten.
4. Instagram-Geschlechterchart und TikTok-Statistik mit Solar Ember, hellen Aero-Themes und geänderten Farbtokens prüfen.
5. Check Cloudflare `Ready` und realen 6h-YouTube-Trigger; fehlende frischere Werte **nicht** durch erfundene Zahlen ersetzen.
6. Bekannte Performance-Probleme auf iPhone und PC erneut messen. Die neuen V7-Module dürfen keine wiederholten Chart-Neuberechnungen bei Hover auslösen.
7. Erst nach Device-QA das bestehende Deployment durch den neuen Stand ersetzen, Rollback-Version sichern.

## Was bewusst noch nicht automatisch passiert
- Vollständig neue YouTube-Tageswerte oder fehlende TikTok-Tagesaufrufe beschaffen (separate Datenquellen/Autorisierung und echte Ausführung nötig).
- ChatGPT-Pläne autonom erstellen, 24-Stunden-Views aller neuen Videos automatisch verfolgen oder Uploads eigenständig veröffentlichen (erfordert weitere sichere Anbindungen).
- KI-generierte Captions ohne externe Modellanbindung ausgeben; die Vorlagen sind ehrliche Textentwürfe.
- Zielgruppenanteile auf aktuelle Stichtage hochrechnen.

**Technik:** Das V7-Frontend liegt in `site/dashboard-v7.js`, `site/dashboard-v7.css` und zielgenauen Änderungen an `site/index.html`, `site/chart-v3.js`, `site/creator-hub-v5.js`, `site/back2u-wordmark.svg`. 
