# BACK2U Cloudflare Clip Radar v0.6 — keine Kreditkarte

Kostenlose Cloudflare-Worker-Weboberfläche zur Recherche von Twitch-Clip-Metadaten, manuellen Markierung von Rechte-Nachweisen und JSON-Export. Die Videodateien werden weiterhin in der bestehenden iPhone-Colab-Version gerendert. Der Radar speichert keine Twitch-Tokens auf dem Server, postet nichts und lädt keine fremden Videos herunter.

## Deployment vom iPhone

1. In Cloudflare **Workers & Pages** → **Create application** → **Import a repository** / **GitHub**.
2. GitHub-Repository `jxstxlxon/back2u-analytics` auswählen, **nur** Branch `feature/back2u-clip-factory-render-v05-20261115` verwenden.
3. **Root directory**: `clip-factory-cloudflare`. Worker name: `back2u-gta6-clip-radar` (wie in `wrangler.toml`).
4. Build command falls verlangt: leer bzw. `true`; deploy command: `npx wrangler deploy` (falls Cloudflare nicht selbst erkennt).
5. In den Worker-Einstellungen sicherstellen, dass Free ausgewählt ist. Nicht zu Paid upgraden, keine Zahlungsinformationen hinterlegen.
6. Nach Deployment die `workers.dev`-URL öffnen. Über **Twitch verbinden** mit der **öffentlichen** Twitch Client-ID anmelden (kein Secret in die App kopieren).

## Sicherheits- und Funktionsgrenzen
- Diese Oberfläche ist nach der Bereitstellung öffentlich. Sie enthält nur öffentliche Clip-Metadaten. Zugriffstokens bleiben im aktiven Tab; Rechte-Markierungen liegen im LocalStorage des Geräts und sind deshalb nicht geräteübergreifend synchronisiert.
- Twitch-Anmeldung erfolgt über offiziellen Device Code Grant einer **Public** Twitch-App. Wenn die App versehentlich auf **Confidential** steht, muss sie entsprechend angepasst werden.
- Die Twitch Games API liefert die wirkliche Kategorie; es werden keine Clips als GTA VI ausgegeben, wenn Twitch die Spielkategorie nicht findet.
- Free Worker kann keine FFmpeg-Videobearbeitung durchführen; keine KI-Bilderkennung, kein automatisches Posten und keine dauerhafte Hintergrundanalyse.
- Du kannst aus den Clip-Recherchen ein JSON-Manifest für deine Dokumentation exportieren; dieser Export ersetzt weder die technische Twitch Download-Berechtigung noch eine Verwertungslizenz.
- Isolierter Ordner und Branch; vorhandenes BACK2U Analytics Live-Dashboard nicht ändern.