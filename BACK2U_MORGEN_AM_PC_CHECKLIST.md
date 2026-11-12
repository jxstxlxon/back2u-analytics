# BACK2U – Dein Morgen-am-PC-Plan (V7.7 + V7.8)

**Wichtig: Noch nichts mergen, keine vorhandene Windsor.ai-Verbindung deaktivieren, keine Secrets veröffentlichen.** Diese Checkliste wurde aus den aktuellen Repo-Dateien und Funktionsnamen erstellt. Der neue TikTok-Tages-Sync ist per Vorgabe deaktiviert.

## 0 – GitHub-Status lesen, 2 Minuten

- [ ] **V7.7:** offener PR #24 gegen `cloudflare-migration`, Basis für alle direkten YouTube-/Instagram-Feeds.
- [ ] **V7.8:** Draft-PR #25 gegen den V7.7-Branch, nicht direkt gegen Live. GitHub Actions grün kontrollieren. `npm test`: 21 V7.7 + 30 TikTok + 12 Rollen-Tests, zusätzlich Wrangler `deploy --dry-run` und Chromium-Layoutcheck (360/393/430/820/1440 px).
- [ ] Arbeitsstand vor Änderungen notieren. Git-Backup-Branch `backup/back2u-cloud-pre-v77-direct-2026-11-12` existiert bereits.

## 1 – Privates, vollständiges D1-Backup, bevor wir APIs oder Merge ändern

**Einfachere Windows-Option:** Wenn der V7.8-Branch auf dem PC vorhanden ist, `scripts/BACK2U_D1_BACKUP_WINDOWS.cmd` ausführen. Das Skript kontrolliert Cloudflare-Anmeldung und Datenbank, verlangt ausdrücklich die Eingabe `JA` und exportiert nur in den durch `.gitignore` geschützten Ordner `private-backups`. Es löscht oder importiert nichts. Voraussetzung: Node.js/npm und Cloudflare-Zugang auf dem PC. Falls das Skript nicht vorliegt, bleibt die direkte Terminal-Variante unten.

Auf einem angemeldeten PC im eigenen Repo-Terminal:

```bash
npx wrangler login
npx wrangler d1 info back2u-cloud
npx wrangler d1 export back2u-cloud --remote --output=back2u-d1-pre-v78.sql
```

- [ ] Prüfen, ob `back2u-d1-pre-v78.sql` wirklich existiert und nicht leer ist. Datei **privat** und möglichst verschlüsselt aufbewahren. Sie kann OAuth-Tokens, Statistiken und Gastzugangsdaten enthalten.
- [ ] Die `.sql`-Datei weder in GitHub noch in ChatGPT noch in einen öffentlichen Ordner hochladen. **Nicht** versehentlich `wrangler d1 import` oder `time-travel restore` ausführen.
- [ ] Erst wenn Backup bestätigt ist, Cloudflare-Preview und Apps-Script-Berechtigungen testen.

## 2 – V7.7 testen: BACK2U LIVE CONNECTOR in Google Apps Script

Das **bestehende** Apps-Script-Projekt öffnen. Keine zweite, neue Kopie und keine gleichnamigen Funktionen parallel anlegen. Server-Secret `BACK2U_CLOUDFLARE_FEED_SECRET`, Instagram `IG_SUAT_TOKEN` und die Google Advanced Services `YouTube` und `YouTubeAnalytics` gehören nur in die bestehende private Umgebung.

Alle Dateien liegen im Repo unter `scripts/`:

| Reihenfolge | Datei | Manuelle Testfunktion |
|---|---|---|
| 1 | `BACK2U_YouTube_Daily_Analytics.gs` (bestehende Funktion **ersetzen**, nicht duplizieren) | `back2uYouTubeDailyRepair` |
| 2 | `BACK2U_YouTube_Audience_Direct.gs` | `back2uYouTubeAudienceDirect` |
| 3 | `BACK2U_Instagram_Audience_Direct.gs` | `back2uInstagramAudienceDirect` |
| 4 | `BACK2U_Direct_Media_Push.gs` | `back2uYouTubeMediaDirect` und danach `back2uInstagramMediaDirect` |
| 5 | `BACK2U_YouTube_Video_Insights_Direct.gs` | `back2uYouTubeVideoInsightsDirect` |
| 6 | `BACK2U_Instagram_Daily_Direct.gs` | `back2uInstagramDailyDirect` |
| 7 | `BACK2U_Instagram_Reel_Insights_Direct.gs` | `back2uInstagramReelInsightsDirect` |

- [ ] **Nicht blind auf Run klicken, solange die neue Route nur in PR und noch nicht in Cloudflare-Preview erreichbar ist:** Erst eine getrennte Preview-URL mit korrekt isolierter D1-Bindung herstellen und prüfen. Die Skriptdateien enthalten aktuell Produktiv-Worker-URLs, daher dürfen wir keine Tests auslösen, die ohne den V7.7-Backendstand in Production scheitern oder unerwartet Production beschreiben. Preview-Feed-URL bei Bedarf ausschließlich in einer privaten Testkopie des Skripts konfigurieren.
- [ ] Erforderliche Berechtigungen einmal bestätigen; jeden manuellen Lauf einzeln anhand des tatsächlichen Apps-Script-Ausführungslogs und einer bestätigten HTTP-200-Antwort validieren.
- [ ] **Trigger-Installer** (`back2uInstall...Direct`) erst nach erfolgreichen Direktaufrufen und ausdrücklicher Freigabe ausführen, nicht heute blind.
- [ ] Bestehende Apps-Script- und Windsor-Exporte bleiben bestehen. Nach V7.7-Freigabe mindestens sieben Tage alte und neue Messwerte parallel vergleichen.

## 3 – V7.8 TikTok-Tageswerte kontrollieren

- [ ] Nach erfolgreichem D1-Backup und V7.7-Freigabe V7.8 PR #25 in einer isolierten Preview testen; nicht direkt den Draft-PR mergen.
- [ ] Admin-Aufruf `GET /api/tiktok-daily/status` zeigt `enabled=false`, vorhandene echte Daten und Abdeckung der letzten 7/28/90 Tage.
- [ ] **Nur mit korrektem privaten Windsor-Key** einmal `POST /api/tiktok-daily/sync` über den im Admin-Systembereich vorgesehenen Button starten. Erwartet `status=ok`, richtige TikTok-Account-ID und passende 28 Tageswerte.
- [ ] In der Statistik prüfen: echte Tagesaufrufe und Profilaufrufe; fehlende Werte bleiben „–“, nicht 0. YouTube, Instagram, TikTok-Videos und Gastansichten bleiben wie zuvor.
- [ ] Der automatische Schalter `BACK2U_TIKTOK_DAILY_ENABLE` bleibt **false**. Erst nach positivem manuellen Test und nach dem tatsächlichen Forever-Free-Tarifwechsel testen, ob die TikTok-Organic-Daten weiterhin abrufbar sind.
- [ ] `BACK2U_WINDSOR_TIKTOK_ONLY=true` ist ein **separater** optionaler Schalter. Nicht zusammen mit dem V7.8-Schalter blind aktivieren.

## 3a – Bereits festgestellte Quellabweichungen

Aus dem kontrollierten Vergleich am 13.11.2026 (privates BACK2U LIVE – Analytics Sheet gegen den öffentlichen alten HTML-Archivstand):

- **TikTok:** 25 überlappende abgeschlossene Tages-Videoaufrufe stimmten **25/25** exakt mit den neuen echten TikTok-Organic-Tagesdaten überein. Die Tage 09.–11.11. waren zusätzlich in der API abrufbar. Das bestätigt den alten TikTok-Archivteil für diese Tage, **nicht** automatisch alle historischen Daten.
- **YouTube:** Das derzeit verfügbare Tab `YouTube_Live` hatte seine letzte gezeigte Tageszeile am **09.11.2026**. Der ältere HTML-Export bezeichnet YouTube-Werte größtenteils als **interessierte Aufrufe**, der neuere direkte Tab meldet **Gesamtaufrufe**; die beiden Reihen sind **nicht identisch definiert** und dürfen nicht zu einer einzigen vergleichbaren Tageskurve verschmolzen werden.
- **Instagram:** Bei 28 überlappenden Tagen unterschieden sich die alten archivierten HTML-Views und die aktuelle `Instagram_Live`-Tabelle an **22 Tagen**. Das kann an korrigierten Daten, verschiedenen Stichtagen oder Messdefinitionen liegen; ohne API-Metadaten ist das **kein Beweis für einen Fehler**. Für einen Quellwechsel muss jedes Fenster separat mit identischen Definitionen geprüft werden.

**Morgen deshalb zuerst** den YouTube-Tages-Apps-Script-Trigger `back2uYouTubeDailyRepair` und den vorhandenen Export-/Sheet-Sync prüfen. Bei Instagram den zugrundeliegenden Views-Messumfang und die Stichtage klären, bevor eine Datenquelle ersetzt wird.

## 4 – Datenqualität und Datenschutz

- [ ] Private TikTok- und Meta-Rohdaten bleiben ausschließlich in D1 oder im privaten Sheet, niemals im öffentlichen GitHub-Repo.
- [ ] **Bekannter Altbestand:** Das öffentliche Repo enthält in `site/index.html` weiterhin ein altes `window.SEED` mit archivierten Creator-Statistiken. Das ist unabhängig vom neuen sicheren D1-Import und sollte in einem separaten Privacy-PR vorsichtig aus dem öffentlich zugänglichen Quellcode entfernt werden, sobald eine gleichwertige private Datenquelle und ein sauberer Fallback vorhanden sind. **Nicht direkt löschen**, sonst können Archiv-Anzeige und Offline-Fallback kaputtgehen.
- [ ] Keine 24-Stunden-Videoergebnisse rückwirkend aus aktuellen Lifetime-Views berechnen. Keine 90-Tage-Statistik bei nur 28 belegten Tagen als vollständig kennzeichnen.
- [ ] Auf echtem iPhone/iPad/Safari und PC zusätzlich Theme Studio, Story Studio, Diagramme, Buttons, Gastmodus und Logins manuell ansehen. Chromium-Smoketests sind hierfür nur eine erste Absicherung.

## 5 – Abbruch- und Sicherheitsregeln

Bei 401/403/422, falschen Konten, fehlenden API-Berechtigungen oder unvollständigen Tageswerten **stoppen**, Fehlermeldung notieren und Vorbestand unangetastet lassen. Kein automatisches Downgrade, kein manuelles Überschreiben privater D1-Keys.

**Freigabe nur in dieser Reihenfolge:** D1-Backup → V7.7-Direktquellen in isolierter Preview testen → V7.7 sauber freigeben → 7 Tage Datenparität → V7.8 Preview → V7.8 nach echtem TikTok-Livetest freigeben → Optional den Automatikschalter separat setzen.
