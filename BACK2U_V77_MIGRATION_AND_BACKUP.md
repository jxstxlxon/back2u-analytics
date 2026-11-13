# BACK2U V7.7 – kostenlose Direktquellen, kontrollierter Wechsel

**Stand:** 12.11.2026. Dies ist ein **Vorbereitungs-PR**, kein automatisches Umschalten. Bestehendes Windsor.ai, alle Cloudflare-Secrets, D1-Tabellen und Gastzugänge bleiben unangetastet.

## 1. Backup und Rollback

GitHub-Codebackup vor diesem Branch: `backup/back2u-cloud-pre-v77-direct-2026-11-12` -> `c722bbcc16800fc01e96f81b845536f98167d65f`.

**Wichtig:** Ein GitHub-Backup ist **kein** D1-Datenbank-Backup. Die D1-Daten konnten in diesem Chat nicht direkt exportiert werden, weil kein Cloudflare-Datenbankzugriff angeschlossen ist. Für D1 gibt es automatisch Time Travel (auf Cloudflare Free üblicherweise **7 Tage**, sofern die Datenbank den Production-Storage nutzt). Ein dauerhafter Export muss vor einem endgültigen Wechsel manuell oder über einen Cloudflare-Admin-Connector erfolgen.

Vom eigenen angemeldeten Rechner im Repository aus (nicht im Chat oder in GitHub ausführen):

```sh
npx wrangler login
npx wrangler d1 info back2u-cloud
npx wrangler d1 time-travel info back2u-cloud
npx wrangler d1 export back2u-cloud --remote --output=back2u-d1-pre-v77.sql
```

Die erzeugte SQL-Datei enthält persönliche Analytics, TikTok-OAuth-Informationen, Gastdaten und ggf. Tokens. **Privat/verschlüsselt speichern, niemals in den öffentlichen Repo-Branch, einen Chat, Google Drive mit öffentlichem Link oder ein öffentliches Issue hochladen.**

Cloudflare Time Travel erlaubt eine Wiederherstellung per Bookmark/Zeitpunkt innerhalb des verfügbaren Zeitfensters. **Restores überschreiben die aktuelle Datenbank** und dürfen niemals zur gewöhnlichen Migration verwendet werden.

## 2. Die vorhandenen offiziellen APIs weiterverwenden

Die Google-Tabelle `BACK2U LIVE – Analytics` besitzt bereits direkt aktualisierte private Tabellen `YouTube_API_All` und `Instagram_API_All`. Diese wurden am 12.11.2026 mit aktuellen Zeilen kontrolliert.

V7.7 fügt **zwei getrennte, authentifizierte** Cloudflare-Ingest-Endpunkte hinzu:

- `POST /api/direct-audience/ingest` – drei Zielgruppenverteilungen pro Quelle (yt/ig).
- `POST /api/direct-media/ingest` – Lifetime-Video-Statistiken pro Quelle aus den bestehenden `*_API_All` Tabellen.

Beide akzeptieren ausschließlich den vorhandenen serverseitigen `BACK2U_CLOUDFLARE_FEED_SECRET`-Bearer. **Keine neuen Tokens in GitHub.**

Der Worker speichert unter `direct_audience_v1` und `direct_media_v1`, getrennt von `snapshot`, `yt_analytics_daily` und `audience_v1`. Ein Upload ersetzt nur seine eigene Plattform; fehlende/ungültige Werte werden abgewiesen oder bewahren bisherige bekannte Videokennzahlen. TikTok wird nicht geändert.

Die Zielgruppenanzeige verwendet einen offiziellen Direktreport nur, wenn dessen Datum mindestens so aktuell ist wie der konkurrierende Windsor-Report. Stände und Messbasen bleiben sichtbar.

**YouTube direkt:**
1. Im vorhandenen privaten Projekt **BACK2U LIVE CONNECTOR** als neue Datei `BACK2U_YouTube_Audience_Direct.gs` aus dem Repo hinzufügen.
2. Bestehende Advanced Services **YouTube Data API v3** und **YouTube Analytics API v2** prüfen.
3. `back2uYouTubeAudienceDirect` einzeln testen; erwarteter Cloudflare-HTTP-200-Upload mit 3 Aufteilungen.
4. Nach Erfolg `back2uInstallYouTubeAudienceDirect` einmal ausführen. Es legt nur einen noch nicht vorhandenen täglichen Trigger an.

**Instagram direkt:**
1. Im selben Projekt `BACK2U_Instagram_Audience_Direct.gs` hinzufügen.
2. Vorhandene Meta-Skriptfunktion `b2uIgRequest_` und private `IG_SUAT_TOKEN`-Skripteigenschaft nutzen.
3. `back2uInstagramAudienceDirect` einzeln testen. Fehlende Berechtigungen, weniger als 100 Follower oder ein anderes Meta-API-Antwortformat stoppen den Upload und lassen die alten Daten bestehen.
4. Nach Erfolg `back2uInstallInstagramAudienceDirect` ausführen.

**Videostatistiken (beide Plattformen):**
1. Zusätzliche Datei `BACK2U_Direct_Media_Push.gs` hinzufügen.
2. `back2uYouTubeMediaDirect` und `back2uInstagramMediaDirect` getrennt testen.
3. Erst nach beiden Erfolgen `back2uInstallDirectMediaPush` ausführen. Das überschreibt keine vorhandenen Trigger.

**Keine bestehende Windsor-Verbindung vor diesen Tests entfernen.** Die neuen Direktdaten werden als eigenständige Quellen eingeblendet, nicht als neue Tageswerte erfunden.

## 3. Kritische Restlücke: Instagram-Tageshistorie

Auch bei funktionierender Zielgruppen- und Video-API werden `Instagram_Live` und die alten Tageswerte weiterhin durch Windsor.ai gepflegt. Die Meta-Video-API liefert kumulative Reel-Views und Reichweite, nicht automatisch die korrekte historische tägliche Kanalreichweite/Interaktionen.

Solange kein unabhängiger Instagram-Tagesreport produktiv geprüft ist, kann ein Windsor-Downgrade **die Aktualität der Instagram-Tagesdiagramme beeinträchtigen**. Ohne neue Originalquelle darf das Dashboard keine fiktiven Tageszahlen darstellen.

Zusätzlich prüfen, ob der bestehende YouTube-Tagesreport `back2uYouTubeDailyRepair` tatsächlich als Trigger läuft. Die direkt synchronisierte Video-Tabelle muss die Verfügbarkeit der Vimeo-/YouTube-Daten nicht ersetzen.

## 4. TikTok und Windsor Forever Free – geprüfte Theorie, kein Live-Downgrade

Der offizielle Forever-Free-Tarif lässt **1 Datenquelle / 1 Account** und 5 Destination-Tasks zu; alle Connectoren sind grundsätzlich verfügbar. Derzeit ist das Benutzerkonto noch im **Trial**, und es gibt vier geplante Windsor-Exports für YouTube/Instagram. Der TikTok-Organic-Account `back2u.mp3` ist verbunden, aber für das kostenlose Kontingent nach Ablauf noch nicht unabhängig getestet.

**Wichtiger behobener Architekturfehler:** V7.6 verlangt 9 erfolgreiche Windsor-Aufteilungen gleichzeitig. Bei Forever Free würde TikTok dadurch blockiert, sobald YouTube/Instagram pausen. V7.7 enthält einen **standardmäßig deaktivierten** TikTok-only-Modus (`BACK2U_WINDSOR_TIKTOK_ONLY=true` erst nach Freigabe setzen), der nur drei TikTok-Berichte abruft und den letzten YouTube/Instagram-Bestand bewahrt.

Nach dem tatsächlichen Downgrade zuerst verifizieren:
- TikTok Organic ist als **eine** aktive Quelle mit genau **einem** Account ausgewählt.
- Alle drei TikTok-Abfragen (Alter/Geschlecht/Länder) funktionieren weiter, ohne Tarif-/API-Fehler.
- Im Admin-Dashboard zeigt der D1-Sync `status=ok`, `groups=3`, mit neuem Zeitstempel.
- Die bisherigen YouTube-/Instagram-Werte bleiben sichtbar und werden nicht durch Altstände überschrieben.
- Gastlinks und Zugriffsrechte sind unverändert.

Vor diesen Tests **keine** Windsor-Quelle abklemmen, keine Abonnements kaufen, keinen TikTok-only-Schalter aktivieren.

## 5. Produktiv-Freigabe

Dieser PR wird **nicht automatisch gemergt**, bevor:
- (a) ein dauerhafter *vollständiger* D1-Export oder ein gleichwertiges, vom Eigentümer bestätigtes Backup verfügbar ist,
- (b) Cloudflare-Preview-Build erfolgreich ist,
- (c) YouTube-/Instagram-Apps-Script-Testläufe die Live-API-Berechtigung bestätigen,
- (d) die Unterschiede bei Instagram-Tagesdaten sichtbar dokumentiert sind.

Nach einem späteren Merge mindestens 7 Tage alte und neue Statistiken parallel vergleichen. Erst nach Erfolg weitergehende Windsor-Ausfälle/Abschaltungen planen.

**Rollback:** GitHub-Backup-Branch für Code wiederherstellen; D1 grundsätzlich nur bei tatsächlichem Datenverlust wiederherstellen (Wiederherstellung ist destruktiv). Niemals alle D1-Daten durch den alten Git-Stand ersetzen.
