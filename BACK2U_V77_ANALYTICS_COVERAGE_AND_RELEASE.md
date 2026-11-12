# BACK2U V7.7 – direkte YouTube- & Instagram-Analytics: Datenabdeckung und Freigabe

**Stand: 12.11.2026. Noch NICHT in Produktion.** Alle neuen Funktionen sind als Ergänzung des bestehenden Workers vorbereitet. V7.6, TikTok, die Windsor.ai-Exports und die bestehenden D1-Statistiken bleiben unangetastet. Reale Apps-Script-/Meta-OAuth-Abfragen und ein vollständiger Cloudflare-D1-Export stehen noch aus.

## Was mit den offiziellen APIs möglich ist

| Bereich | YouTube | Instagram |
| --- | --- | --- |
| Video-Gesamtwerte | Offizielle YouTube Data API, private Tabelle `YouTube_API_All` | Offizielle Meta API, private Tabelle `Instagram_API_All` |
| Video-Analyse (zusätzlich) | 7/28/90 Tage: Videoaufrufe, Shares, Watchtime, Ø Dauer, Ø prozentualer Wiedergabeanteil; optionale `engagedViews` | Pro Reel: Shares, Saves, Interaktionen, Ø Wiedergabezeit und gesamte Wiedergabezeit; nur wenn Meta die Metrik zugänglich macht |
| Tageswerte | Offizielle YouTube Analytics API: Views, Likes, Kommentare, Followerbewegungen; optional Shares, Watchtime und interessierte Aufrufe | Meta Konto-Insights: echte tägliche Views, Reichweite, Interaktionen, Likes, Kommentare, Shares, Saves, erreichte Interagierende; nur einzeln verifizierte Tagesfenster |
| Followerstände | Bestehender direkter YouTube-Daily-Repair | Bestehender direkter `back2uInstagramFollowerSync` |
| Demografie | Direkte offizielle YouTube Reports | Direkte `follower_demographics` aus Meta (Account/Permission/100-Follower-abhängig) |
| Retention-Kurve, vollständige Shorts-/Studio-Spezialwerte | Nicht in diesem Release; nur belegte `averageViewPercentage` | Reel-spezifische Watchtime, keine erfundene Retention-Kurve |
| Historische 90 Tage IG daily | YouTube API hat direkt 115 Tageswerte | Vorsichtiger Meta-Backfill: bis zu 90 Tage bei nachgewiesener API-Verfügbarkeit; ältere/fehlende Werte bleiben aus altem Datensatz und werden nicht nachträglich erfunden |

**Semantik beachten:** YouTube Video Data API `views` = kumulierte Lifetime-Zahlen, YouTube Video Analytics `views7d/28d/90d` = Aufrufe im echten Zeitfenster. Instagram Reel-Watchtime wird von Meta in Millisekunden geliefert. Reichweite eines Tages = pro Tag eindeutige Accounts; Summe der Tagesreichweiten ist NICHT die Anzahl eindeutiger Accounts über 7/28/90 Tage. Instagram `views` umfasst je nach Meta-API-Bericht Reels, Posts, Stories und Profil – nicht aus Reel-Lifetime-Deltas ableiten.

Einzelne Instagram-Metriken können durch Konto-/App-Berechtigungen, den Meta-API-Versionsstand oder verzögerte Verarbeitung fehlen. **Fehlend ist nicht Null** und kein Anlass für erfundene Werte.

## Technische Backend-Datenquellen

- `POST /api/direct-audience/ingest` → `direct_audience_v1` (nur zwei Direktplattformen)
- `POST /api/direct-media/ingest` → `direct_media_v1` (Video-Lifetime-Katalog)
- `POST /api/direct-video-insights/ingest` → `direct_video_insights_v1` (YT 7/28/90 getrennt / IG Lifetime-Reel-Kennzahlen)
- `POST /api/direct-instagram-daily/ingest` → `direct_ig_daily_v1` (echte Meta Tagesberichte)
- Bestehendes `POST /api/youtube-daily/ingest` akzeptiert zusätzliche *optionale* offizielle Shares, Wiedergabezeit, durchschnittliche Wiedergabedauer und interessierte Aufrufe.

**Berechtigungen:** Sämtliche Ingest-Endpunkte verlangen dasselbe private `BACK2U_GOOGLE_FEED_SECRET`, das bereits bei deinem Cloudflare-Worker und Google Apps Script hinterlegt ist. Keine neue Passwortvergabe, keine geheimen URLs/Gateway-Schlüssel im Repository. `GET /api/direct-audience/status` und `GET /api/direct-insights/status` sind nur als Admin sichtbar; Gäste bleiben bei geschützten Snapshot-Zugriffen.

**Datenintegrität:** Direktdaten liegen in separaten D1-Keys; alte Wiener/Windsor-Werte werden nicht gelöscht. Nur valide API-Kontodaten und gültige Zeitfenster werden übernommen. Nicht zurückgelieferte 7/28/90-Tage-Videozahlen gelten nicht als Null, werden aber für dieses Zeitfenster nicht als aktuelle Werte weitergeführt. YouTube-Video-Lifetime-Zähler werden niemals durch Zeitfensterwerte überschrieben.

## Aktivierung in der vorhandenen privaten Google-Apps-Script-Umgebung

Alle folgenden Dateien **nur in das bereits bestehende BACK2U LIVE CONNECTOR Scriptprojekt als eigene Dateien** kopieren und zuerst einzeln ausführen, **nachdem Cloudflare V7.7 im Test bereitgestellt wurde**. Noch keine automatischen Trigger einrichten:

1. **Bereits bestehende Datenreparatur aktualisieren**: `scripts/BACK2U_YouTube_Daily_Analytics.gs`. Nur den bestehenden Inhalt dieser Datei austauschen, nicht zwei gleichnamige Funktionen erstellen.
2. **Direkte Zielgruppe**: `scripts/BACK2U_YouTube_Audience_Direct.gs` → `back2uYouTubeAudienceDirect`; `scripts/BACK2U_Instagram_Audience_Direct.gs` → `back2uInstagramAudienceDirect`.
3. **Offizieller Videokatalog**: `scripts/BACK2U_Direct_Media_Push.gs` → `back2uYouTubeMediaDirect` / `back2uInstagramMediaDirect`.
4. **Neue Analysewerte**: `scripts/BACK2U_YouTube_Video_Insights_Direct.gs` → `back2uYouTubeVideoInsightsDirect` (7/28/90 Tage).
5. **Meta-Tagesberichte**: `scripts/BACK2U_Instagram_Daily_Direct.gs` → `back2uInstagramDailyDirect` (anfangs die jüngsten 3 plus vier Backfill-Tage; spätere Ausführungen ergänzen Stück für Stück).
6. **Meta Reel-Insights**: `scripts/BACK2U_Instagram_Reel_Insights_Direct.gs` → `back2uInstagramReelInsightsDirect` (max. 20 Medien pro Lauf; rotiert im Bestand).

**Wichtig:** In Google Apps Script müssen die bereits verwendeten `YouTube` und `YouTubeAnalytics` Advanced Services aktiviert und die bereits vorhandene Meta-Hilfsfunktion `b2uIgRequest_` mit gültigem `IG_SUAT_TOKEN` verfügbar sein. Dass eine Funktion in GitHub steht, heißt noch nicht, dass diese Berechtigungen in deinem Apps Script produktiv funktionieren.

Nach **jedem** erfolgreichen Test kann die dazugehörige `back2uInstall...Direct`-Funktion einmal aufgerufen werden. Sie installiert nur ihren eigenen Trigger und lässt die bisherigen Windsor-/TikTok-/Meta-Follower-/YouTube-Tages-Trigger unberührt. Es gibt keine unkontrollierten Abschaltungen.

## Freigabebedingungen

- Vollständiges D1-Backup **zusätzlich** zum bereits erstellten Git-Codebackup `backup/back2u-cloud-pre-v77-direct-2026-11-12`. `wrangler d1 export back2u-cloud --remote --output=back2u-d1-pre-v77.sql` nur auf **einem privaten, angemeldeten Rechner** ausführen und die Datei sicher aufbewahren; die SQL kann private OAuth- und Gastzugangsdaten enthalten. Nicht in öffentlichem Repo speichern.
- Cloudflare-Preview-Build erfolgreich und unveränderte Gastberechtigungen / TikTok-Synchronisierung bestätigt.
- Echte erfolgreiche Apps-Script-API-Anfragen und D1-Ingest-200-Antworten für YouTube und Instagram.
- Unter **System** für beide Zielgruppen je 3/3 sowie bestätigte 7/28/90-YT-Videoberichte und Instagram-Tageswerte.
- **Mindestens 7 Tage Parallelvergleich:** Quelle/Zeitraum/Basis pro Metric protokollieren. Einzelne abweichende API-Definitionen dürfen nicht stillschweigend als gleiche Kennzahl angezeigt werden.
- Noch nicht vollständig ersetzt: Instagram-Tageshistorie vor Beginn der direkten Datensammlung, manche Meta-Metriken, Geschichten/Stories außerhalb der API-Verfügbarkeit, Studio-Only-Retention und TikTok-Zielgruppe nach Trial-Ende.

## TikTok vorerst unverändert

Windsor.ai-TikTok-only-Modus existiert nur als **deaktivierte** Vorbereitung. Erst nach echtem Downgrade auf Forever Free und drei erfolgreichen TikTok-Organic-Abrufen aktivieren: Cloudflare `BACK2U_WINDSOR_TIKTOK_ONLY=true`. Vorher weder Windsor-Quellen noch bestehende D1-Werte verändern.
