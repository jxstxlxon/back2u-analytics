# BACK2U V7.7 – Preview ohne Produktions-Umleitung befüllen

**Stand 13.11.2026.** Der Cloudflare-Preview-Worker ist separat mit `DB → back2u-v7-preview` verbunden. `GET /api/health`: `configured:true`, `dbReady:true`, `loginReady:true`, `sourceReady:false`. `GET /api/direct-parity` war **0/12**, weil noch keine Direktberichte in der separaten Testdatenbank liegen. Das ist **kein Code-Fehlertest**, sondern die erwartete Datenabdeckungsprüfung einer leeren Preview.

## Vorher: Safety

- **V7.7-Preview auswählen, nicht Production und nicht Previews Base** (Name im Cloudflare-Header prüfen).
- Preview-Datenbankverbindung `DB → back2u-v7-preview` vor Änderungen noch einmal prüfen.
- Produktive Apps-Script-Trigger und `BACK2U_CLOUDFLARE_FEED_SECRET` nicht ändern.
- Nichts mergen/deployen; vollständiges privates D1-SQL-Backup vom 13.11.2026 wurde extern gesichert.
- In GitHub/Chat keine SQL-Dateien, Feed-Secrets oder OAuth-Tokens hochladen.

## Schritt 1 – Ein separates Preview-Secret hinterlegen

In Cloudflare **V7.7 Preview → Settings → Runtime variables and secrets → Add variable**:

- Type: **Secret**
- Name: `BACK2U_GOOGLE_FEED_SECRET`
- Value: ein **neuer**, zufälliger, nur für V7.7 Preview genutzter Token, mindestens 24 Zeichen (besser 32+).
- Nicht den produktiven Schlüssel kopieren. Nicht denselben Schlüssel in Produktions-Settings setzen.

Anschließend sollte `/api/health` der V7.7 Preview `sourceReady:true` zeigen. **Das bedeutet nur, dass der Ingest-Schlüssel gesetzt ist, nicht dass die Daten bereits importiert sind.**

## Schritt 2 – Einmaliger, streng auf Preview beschränkter Media-Test

Im vorhandenen **privaten** Google Apps Script `BACK2U LIVE CONNECTOR`:

1. Neue Datei `BACK2U_V77_Preview_Media_Smoke.gs` erstellen und den Inhalt von `scripts/BACK2U_V77_Preview_Media_Smoke.gs` aus dem V7.7-GitHub-Branch einfügen. Bestehende Dateien und Trigger unverändert lassen.
2. **Erst nur** `back2uV77PreviewCheck` manuell ausführen. Sie liest `YouTube_API_All` und `Instagram_API_All`, validiert die Aktualität, zählt gültige Videos und **sendet nichts**. Die Ausführungsprotokolle dürfen nur die beiden Videoanzahlen und keine sensiblen Inhalte anzeigen.
3. In **Apps Script → Projekteinstellungen → Skripteigenschaften** zwei **neue**, zusätzliche Eigenschaften setzen:
   - `BACK2U_V77_PREVIEW_URL`: vollständige **V7.7-Preview-Basisadresse** aus der Browser-Adressleiste, `https://feature-back2u-v77-...-back2u-cloud.<subdomain>.workers.dev`, **ohne** `/api/health` oder `/api/access`.
   - `BACK2U_V77_PREVIEW_FEED_SECRET`: exakt den separaten Token aus Schritt 1.
4. **Erst wenn Check und Konfiguration stimmen:** `back2uV77PreviewSend` **einmal** manuell ausführen. Die Funktion akzeptiert nur den erwarteten **V7.7-Preview-Hostnamen**, stoppt bei fehlenden/zu alten Quellen, verwendet den separaten Preview-Token, sendet ausschließlich an `/api/direct-media/ingest` und legt **keine** Trigger an.
5. Im Admin-Browser die Preview `/api/direct-parity` neu aufrufen. Erwartung: `yt_media` und `ig_media` können bei erfolgreichem Import `pass:true` werden (mindestens 10 valide Videos je Quelle, frisch). Die **anderen zehn Checks bleiben vorerst offen**, bis wir deren eigenständige Datenquellen geprüft haben.

## Bei Fehlern

- 401/403 → falscher/fehlender **Preview**-Token; nicht den produktiven Schlüssel ändern.
- 503 → fehlendes `BACK2U_GOOGLE_FEED_SECRET` in der **Preview**, oder Worker nicht bereit.
- 422 → falsch formatierte Videozeilen oder Profil-/Kanalprüfung; nicht blind an der Validatorlogik drehen.
- Fehlende `BACK2U_SPREADSHEET_ID` → prüfen, ob die bekannte Konstante im bestehenden privaten Apps Script vorhanden ist; nicht durch den Schlüssel ersetzen.
- Veraltete `*_API_All` → erst bestehende **offizielle** Tabellenaktualisierung prüfen. Keine unbestätigten Daten backfillen.
- Fehlende 7/28/90-Videoanalysen, Demografie oder Tagesreihen sind nach nur diesem Media-Test **korrekt weiter offen**.

**Stoppregel:** Niemals die allgemeinen V7.7-Dateien `BACK2U_Direct_Media_Push.gs`, `BACK2U_YouTube_Video_Insights_Direct.gs` usw. unverändert in der Preview testen: Ihre bisherigen Upload-URLs zeigen direkt auf den **Produktiv-Worker**. Erst preview-spezifisch absichern. Keine Triggerverschiebung oder Windsor-Abschaltung vor echter Freigabe.

**Achtung Öffentlichkeit:** Die Preview kann als Website erreichbar sein. Auch bei Passwortschutz enthält das öffentlich ausgelieferte HTML noch ältere Archiv-Analytics (`window.SEED`). Die private D1-Datenbank bleibt getrennt, aber historische HTML-Werte sind unabhängig vom Login-Schutz separat zu behandeln.
