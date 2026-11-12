# BACK2U V7.8 – TikTok-Tageshistorie (Vorbereitung / keine Produktion)

**Stand:** 13.11.2026. Dieser Entwicklungszweig basiert auf V7.7 PR #24. Weder V7.7 noch V7.8 automatisch mergen/deployen. Cloudflare D1 zuerst privat sichern.

## Datenquelle

TikTok Organic ist im bestehenden Windsor.ai-Konto als `back2u.mp3` verbunden. Im Trial wurden am 12.11.2026 echte Tage vom 15.10. bis 11.11. kontrolliert: 28 abgeschlossene Tage, insgesamt 205.586 tägliche Videoaufrufe und 2.917 Profilaufrufe. Für den 12.11. lagen noch keine vollständigen Aufrufswerte vor. Ein 90-Tage-Abruf wurde vom Trial wegen der 30-Tage-Historiengrenze abgelehnt. Diese Werte werden **nicht** ins öffentliche Repo geschrieben.

Der Worker ruft ausschließlich **den verifizierten TikTok-Organic-Account** mit den fünf Feldern `account_id,date,video_views,profile_views,daily_total_followers_count` für `last_28d` ab. Er überträgt keine Lifetime-Videoviews als tägliche Accountaufrufe.

## Neue Architektur

- `cloudflare/tiktok-daily.js` validiert Konto-ID, echte Kalenderdaten, doppelte Tage, nichtnegative Ganzzahlen, mindestens drei vollständig gemessene Tage und fehlende vs. echte Nullwerte.
- Die laufende UTC-Tageszeile wird ignoriert, um ein unvollständiges „Heute“ nicht als kompletten Tag zu verkaufen.
- Separate D1-Keys: `tt_daily_v1` für verifizierte Tageshistorie und `tt_daily_sync_status` für den letzten Versuch/Erfolg. Kein Überschreiben von `snapshot`, TikTok OAuth, Zielgruppen oder YouTube/Instagram.
- Bei einem neuen Bericht werden Tage/Teilkennzahlen vorsichtig ergänzt; ältere Importstände überschreiben keine neueren. Es werden bis zu **400 tatsächliche Tage** erhalten; die Windsor-Quelle muss diese Daten nicht selbst 400 Tage zurückliefern.
- Der geschützte `/api/snapshot` mischt die neuen Werte nur im TikTok-Tagesverlauf ein und behält Video-Lifetime-Zahlen, Archivwerte, `follows` und den TikTok-Display-API-Followerstand bei.
- `GET /api/tiktok-daily/status` (Admin-only): letzter erfolgreicher Tag, 7/28/90-Tage-Abdeckung und Automatikstatus.
- `POST /api/tiktok-daily/sync` (Admin-only + Same-Origin JSON): expliziter einmaliger Test. Fehlende Secrets oder falsche Account-Daten führen zu keinem Tagesdaten-Overwrite.
- Bestehender 30-Minuten-Cloudflare-Cron wird **nur optional** erweitert: `BACK2U_TIKTOK_DAILY_ENABLE=true` schaltet eine maximal tägliche Abfrage frei. Voreinstellung: **aus**. Erfolgreiche Läufe frühestens nach 24 Stunden, Fehlversuche frühestens nach 3 Stunden erneut; der TikTok-Display-API-Cron und die bestehenden Zielgruppenjobs bleiben bestehen.
- Im System-Bereich gibt es einen mobilen Admin-Status mit bewusstem Einmaltest-Button. Der Button verlangt vorher eine ausdrückliche Bestätigung für das Backup.

## Grenzen und Datenqualität

1. Windsor.ai ist derzeit **Trial**, nicht bestätigt Forever Free. Kein automatischer Downgrade, kein kostenloser Dauerbetrieb behauptet und kein stiller Wechsel zu `BACK2U_WINDSOR_TIKTOK_ONLY`.
2. Free-Plan, API-Zugriff, zulässige Felder und Account-Quota müssen *nach* tatsächlichem Downgrade geprüft werden. Wenn diese Abfragen nicht verfügbar sind, bleibt die bekannte Historie erhalten und der Status zeigt den Fehler.
3. Die 90-Tage-Grafik ist erst vollständig, wenn 90 abgeschlossene Tage wirklich gesammelt wurden. Kein Wiederauffüllen mit Nullen oder künstlichen Deltas.
4. Berichtszeitzone/Verzögerungen bei TikTok Organic beachten; `date` wird so gespeichert, wie der Anbieter sie berichtet. Tageswerte anderer Plattformen können unterschiedliche Messdefinitionen haben.
5. Die direkte TikTok Display API bleibt für Video-ID/Lifetime-/Profilwerte aktiv; die Windsor-Tagesberichte sind eine **zusätzliche** Quelle, kein Ersatz für Display API.
6. Stichtag und Feldherkunft sind im Snapshot ersichtlich. Falls der Live-Abruf später ausfällt, werden frühere echte Werte nicht als aktuell bezeichnet.

## Teststand

`npm test` umfasst:
- V7.7: 21 historische Integritätstests,
- V7.8: 30 TikTok-Daten-/Merge-/Fehlerfalltests,
- V7.8: 12 Worker-API-/Rollen-/CSRF-Tests.

Die 30 TikTok-Daten-/Fehlerfalltests wurden zusätzlich isoliert wiederholt: **30/30 erfolgreich**. Die Worker- und Browserintegration braucht einen echten Node-/Cloudflare-Preview-Lauf. GitHub Actions `.github/workflows/back2u-v78-safety.yml` führt `npm test` und JS-Syntaxprüfungen im Branch ohne Produktions-Secrets aus. Ein Workflow-Run muss separat auf „grün“ verifiziert werden.

## Morgen am PC – Freigabereihenfolge

1. **Privates Cloudflare-D1-Backup erstellen und Integrität prüfen:** im angemeldeten Repo mit `npx wrangler d1 export back2u-cloud --remote --output=back2u-d1-pre-v78.sql`. Datei enthält private Daten/ggf. Tokens: niemals ins Repo oder in Chat hochladen.
2. **V7.7 PR #24** zuerst prüfen: Cloudflare Preview, Guest-Readonly, echte Apps-Script-YouTube-/Instagram-OAuth-Livetests sowie Instagram-Tageswerte. Keine bestehenden Windsor-Trigger deaktivieren. Alte/neue Kennzahlen über sieben Tage abgleichen.
3. **V7.8 PR** vor dem Merge auf die richtige Basis aktualisieren; Node-Test-/Preview-Checks bestätigen. D1-Schema benötigt keine neue Tabelle, nur Schlüssel in `back2u_store`.
4. Mit angemeldetem Administrator `/api/tiktok-daily/status` prüfen: `enabled=false`. Nach erfolgreichem Backup `TikTok-Tageswerte einmalig prüfen` auslösen. Fehlende `WINDSOR_API_KEY` muss in Cloudflare als Secret eingerichtet werden, **nie** im Browsercode/GitHub.
5. Nur wenn HTTP 200, korrekter Account, 28 echte Tageswerte, korrekter 7/28/90-Abdeckungsstatus und unveränderte YouTube-/Instagram-/Gastfunktionen nachgewiesen sind, freigeben.
6. Nach dem tatsächlichen Windsor Forever-Free-Wechsel TikTok mit den drei Zielgruppenberichten **und** dem Tagesbericht erneut prüfen. Danach erst optional `BACK2U_WINDSOR_TIKTOK_ONLY=true` und `BACK2U_TIKTOK_DAILY_ENABLE=true` setzen. Freigabe einzeln, nicht gleichzeitig mit anderen Quellabschaltungen.
7. Bei Problemen den neuen Automatikschalter wieder auf `false` setzen. Es wird keine D1-Rücksetzung gebraucht, sofern die Daten selbst unbeschädigt sind.

**Nicht erledigt / ausdrücklich offen:** dauerhafter privater D1-Export, echter Cloudflare-Preview-Build der letzten Commits, produktiver TikTok-Windsor-Free-API-Test, reales iPhone-/iPad-/Desktop-Safari-Testing sowie 7-Tage-Parität der Direktquellen.
