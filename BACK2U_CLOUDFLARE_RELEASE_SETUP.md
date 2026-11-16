# BACK2U Cloudflare: automatisches Produktions-Deployment

**Stand: 16.11.2026.** Im GitHub-Repository liegt der Worker- und UI-Code, die aktuell erreichbare Cloudflare-Version wurde bei der Live-Prüfung jedoch **nicht** als V7.8 bestätigt.

## GitHub und Cloudflare verbinden

1. In Cloudflare einen auf den eigenen Account begrenzten API-Token mit Berechtigungen für das **Bearbeiten von Workers-Skripten** erzeugen. Die erforderlichen Rechte ggf. auf den Worker und dessen Ressourcen einschränken. In ChatGPT und in GitHub-Dateien **niemals** den Token als Klartext senden.
2. In GitHub `jxstxlxon/back2u-analytics` → **Settings → Secrets and variables → Actions → New repository secret** die beiden folgenden **verschlüsselten** Repository-Secrets hinzufügen:
   - `CLOUDFLARE_API_TOKEN`: dein privater Cloudflare-API-Token.
   - `CLOUDFLARE_ACCOUNT_ID`: die Account-ID, zu der der Worker `back2u-cloud` gehört.
3. Die GitHub-Actions-Berechtigungen für das Repository aktiviert lassen. Danach löst der **nächste Push/Merge auf `cloudflare-migration`** mit Änderungen an UI, Worker, Wrangler-Konfiguration oder Workflow den Release aus. `main` ist **nicht** die Cloudflare-Produktions-Branch.
4. Unter **Actions → BACK2U publish Cloudflare production** auf den aktuellen Lauf gehen und nur die technischen Statuszeilen kontrollieren: `BACK2U_DEPLOY=AUTH_CONFIGURED`, die vollständigen Tests, den Dry-Run, dann `BACK2U_DEPLOY=VERIFIED`. Kein Status `VERIFIED` bedeutet, dass die neue Live-Version noch nicht nachgewiesen wurde.
5. Anschließend das Dashboard mit dem eigenen Login in Safari/Desktop testen. Die öffentliche Live-Prüfung bestätigt nur HTML/CSS und Health, **nicht** private 7/28/90-Tage-Direktwerte oder Login-/Guest-Rechte.

## Sicherheitsregeln
- Keine Schlüssel in Quellcode, Ausgaben, Screenshots oder Issues. GitHub-Secrets werden nur als Umgebungsvariablen im Release-Job übergeben.
- Der Release-Workflow läuft **ausschließlich** auf `cloudflare-migration`, mit serieller Ausführung; er startet nur nach bestandenen Regressionstests und Worker-Dry-Run.
- Die Konfiguration `wrangler.cloudflare.jsonc` behält `keep_vars:true`, bestehende D1-Bindung, Arbeitername und Cron-Takt. **Kein automatisches D1-Schema-Update/Import**, keine Löschung alter Analytics.
- Die Veröffentlichung selbst erfolgt mit `wrangler deploy`. Worker-Versionen können in Cloudflare zurückgerollt werden; private D1-Daten müssen für umfassende Wiederherstellbarkeit zusätzlich separat gesichert werden.
- Ein fehlendes Secret führt zum sichtbaren Status `BACK2U_DEPLOY=NOT_CONFIGURED` und stoppt **vor** dem Deployment. Der Status darf nicht mit einem erfolgreichen Release verwechselt werden.
- Vor einem geplanten größeren Umbau an Datenbank oder OAuth getrenntes, privates D1-Backup erstellen. Solche Änderungen werden von diesem Workflow **nicht** automatisch migriert.

## Bekannte Grenzen
- ChatGPTs aktueller GitHub-Zugriff darf API-Tokens nicht auslesen oder neue GitHub Actions Secrets hinterlegen. Der Nutzer muss dies einmalig in den jeweiligen Settings erledigen.
- Im privaten **BACK2U LIVE CONNECTOR Apps Script** fehlende Services/OAuth/Trigger werden durch einen Worker-Deploy nicht magisch aktiviert.
- Das bestehende 12-Punkte-Direktdaten-Audit und sieben Tage Parallelvergleich müssen vor einer Abschaltung von Windsor.ai vollständig vorliegen. Siehe Issue #27.

## Fehlerbehebung
| Anzeige im Job | Konsequenz |
| --- | --- |
| `NOT_CONFIGURED` | Beide Actions-Secrets prüfen, nicht im Repository veröffentlichen |
| Test / Dry-Run fehlgeschlagen | Keine Veröffentlichung; Code/Test in GitHub korrigieren |
| `RELEASE_NOT_VERIFIED` | Worker-Deploy versucht, aber öffentliche Dateien oder Health nicht bestätigt – Cloudflare Deploy-Log prüfen |
| `VERIFIED` | Live-HTML, CSS und öffentlicher API-Health-Endpunkt wurden tatsächlich nachgewiesen; danach Owner-UI testen |
