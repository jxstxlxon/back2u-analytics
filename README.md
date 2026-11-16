# BACK2U Creator Command Center

Privates Creator-Analytics-Dashboard für **YouTube**, **Instagram** und **TikTok**. Die produktive Website läuft über **Cloudflare Workers + D1**, nicht über das historische Netlify-Projekt.

- Produktionsadresse: `https://back2u-cloud.leon-mueller0806.workers.dev/`
- Produktions-Quellbranch: **`cloudflare-migration`**
- Worker: `cloudflare/worker.js`
- Statische Dashboard-Assets: `site/` (`index.html` und ausgelagerte JS-/CSS-Module)
- Worker-Konfiguration: `wrangler.cloudflare.jsonc`
- Private Daten: Cloudflare D1, niemals ein öffentlicher GitHub-Commit

**Wichtig:** Ein grüner GitHub-Test, PR-Merge oder eine erfolgreiche Worker-Kompilierung ist **kein Beleg für ein echtes Cloudflare-Deployment**. Den laufenden Worker und die angemeldete Dashboard-Ansicht getrennt prüfen.

## Relevante Funktionen

- Übersicht mit echten **7/28/90-Tage-Fenstern**, Tagesverlauf, Plattformverteilung, Followerständen und ausdrücklich gekennzeichneten All-time-Summen
- Video Radar mit Suche, sicherer plattformübergreifender Zuordnung und **7-Tage-Top-10**; Gesamtaufrufe dürfen nicht als Wochenzuwachs bezeichnet werden
- Optionale manuelle Verknüpfung von bekannten Video-IDs, getrennt und rückgängig machbar in D1 gespeichert
- Creator Hub mit Posting-Kalender, Zielverfolgung, Textwerkstatt und Ideen
- Experimente, Zielgruppen-Ansichten, Story Studio (PNG) und viele Themes
- Eigentümer- und zeitlich begrenzte **schreibgeschützte** Gastzugänge
- Responsive Informationsarchitektur: Desktop-Seitenleiste ab 1240 px, iPhone-Bottom-Navigation und kompaktes Top-3-Ranking mit Aufklappen
- Admin-only Systemansicht mit zwölf offiziellen Direktdaten-Kriterien (`/api/direct-parity`), jeweils mit echten Zeit-/Quellennachweisen

## Datenquellen

| Quelle | Herkunft | Grundsatz |
| --- | --- | --- |
| YouTube Videos | Direkte YouTube Data API / privates Apps Script, soweit angebunden | Lifetime-Video-Views sind nicht die YouTube-Analytics-Berichtsfenster |
| YouTube Tageswerte | Private YouTube Analytics API und/oder ausdrücklich gekennzeichnete Windsor-Backfills | Fehlende Tage bleiben fehlend |
| Instagram Videos/Insights | Meta Graph API und/oder Windsor-Extras | Metrikdefinitionen/Zeiträume nicht stillschweigend vermischen |
| Instagram Tageswerte | Meta Account Insights und/oder Windsor | Summe täglicher Reichweite ist nicht 7-Tage-Unique-Reach |
| TikTok Videos | TikTok Display API / verifizierte Organic-Daten | Ein vollständiger Videokatalog ist getrennt von funktionierenden Tageswerten zu prüfen |
| TikTok Tageswerte | TikTok Organic via Windsor.ai, solange verfügbar | Quelle und letzte erfolgreiche Synchronisierung müssen sichtbar bleiben |

**Windsor.ai nicht abschalten oder stillschweigend auf einen anderen Tarif umstellen, bevor die direkten YouTube-/Instagram-Daten und TikTok-Quelle unter realen Kontoberechtigungen unabhängig geprüft sind.**

## Cloudflare-Synchronisierung

Das Repo verwendet die Produktionskonfiguration mit dem **30-Minuten-Cron** `*/30 * * * *` (UTC). Der Worker unterstützt zusätzlich ältere 15-Minuten-Phasen. Beim 30-Minuten-Takt führt der Zeitplan die Zusatz-/Medien-/Zielgruppenphasen kombiniert aus, damit keine Quellen ausgelassen werden.

- Öffentliche, **datensparsame** Diagnose: `GET /api/health`. Sie zeigt Bool-/Statusfelder ohne private Video-/Account-Metriken, Tokens oder Rohfehler.
- Private Dashboarddaten: `GET /api/snapshot` nach Eigentümer- oder Gastsitzung.
- Admin-Direktdatenprüfung: `GET /api/direct-parity`, zwölf Kriterien. Eine vollständig grüne Abdeckung allein bestätigt **noch nicht** vergleichbare Metrikdefinitionen, Backup oder die Abschaltbarkeit von Windsor.
- Manuelle Crosspost-Verknüpfungen: `/api/manual-video-links`; nur Eigentümer darf Änderungen durchführen.
- TikTok-Videoaudit und Import: Admin-Endpunkte; nicht als Nebenwirkung einer reinen Seitenansicht beliebig ausführen.

## Entwicklung und Qualität

```bash
npm ci
npm test
npx wrangler deploy --dry-run -c wrangler.cloudflare.jsonc
```

Die CI `.github/workflows/back2u-v77-production-safety.yml` führt Syntax-, Datenintegritäts-, Berechtigungs-, UI- und Worker-Build-Prüfungen aus. Neue Funktionen müssen fehlende Werte, Fallbacks, Gastrechte und Bestandsschutz weiter respektieren.

**Vor einer Produktionänderung:** Pull-Request-Diff prüfen, privaten vollständigen D1-Export als Backup sichern, Cloudflare Preview getrennt testen, Codeversion/Laufzeit-Konfiguration vergleichen und angemeldeten iPhone-/Desktop-Test durchführen. Nur eine Änderung gleichzeitig mergen, anschließend neue Production-Health-Prüfung.

## Datenschutz und Versionsgeschichte

- D1-Werte, OAuth-Refresh-Tokens, Cookie-Secrets, Apps-Script-Schlüssel und persönliche Analytics dürfen **nicht** in GitHub, issue logs, Screenshots oder Chat kopiert werden.
- Auch ältere Commits und historische HTML-Archive im öffentlich zugänglichen Repository können früher veröffentlichte Statistikdaten enthalten. Ein Dashboard-Passwort macht bereits veröffentlichte GitHub-Historie **nicht** privat; für eine künftige vollständige Privatisierung braucht es ein separates, geprüftes Daten-/Historienmigrationkonzept.
- Das alte `main`-Branch-/Netlify-Projekt dokumentiert **nicht** den laufenden Cloudflare-Produktionsstand. Die Live-Arbeiten finden in `cloudflare-migration` statt.

## Offene Punkte, die einen echten Account-Zugriff benötigen

1. Die zwölf Kriterien des Admin-`/api/direct-parity` vollständig mit **live autorisierten** Google-/Meta-Abfragen erfüllen und mehrere Tage gegen bestehende Quelle vergleichen.
2. Private Google-Apps-Script-Dateien/Trigger und ihre Ausführungslogs verifizieren; GitHub-Quellcode aktualisiert diese nicht automatisch.
3. Offizielle TikTok-Display-Videoseiten gegen den Profilzähler und eventuell ältere/privat gelistete Videos auditieren.
4. Windsor.ai-Limit nach Testtarif unter echten Rechten und Alternativen prüfen, **ohne vorherige Abschaltung**.
5. Cloudflare D1-Backup/Wiederherstellungsweg und Cloudflare-Deployment in der Eigentümerumgebung verifizieren.
6. Tatsächliche iPhone-, iPad- und Desktop-Geräte-QA einschließlich Gastzugang, Theme-Kontrast, Video-Navigation und Offline-Verhalten.

Weitere Details: `BACK2U_V78_LAYOUT_AND_ACCEPTANCE.md`, `BACK2U_V77_ANALYTICS_COVERAGE_AND_RELEASE.md`, Issue #27.
