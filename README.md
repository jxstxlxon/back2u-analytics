# BACK2U Analytics

Creator-Analytics-Dashboard für YouTube Shorts, TikTok und Instagram Reels.

## Start (Windows / macOS / Linux)

1. Python 3.10+ installieren.
2. Repository herunterladen und im Projektordner `python app.py` ausführen.
3. `http://localhost:8765` im Browser öffnen.
4. Ohne Zugangsdaten zeigt die Oberfläche einen **ausdrücklich gekennzeichneten Demo-Modus**.
5. Für echte Daten `.env.example` nach `.env` kopieren und Zugänge eintragen (oder Umgebungsvariablen setzen).

**Wichtig:** Diese erste GitHub-Version ist ein MVP. YouTube benötigt einen YouTube Data API v3 Key und eine Kanal-ID. TikTok benötigt einen autorisierten Developer-Account/OAuth-Token mit `video.list`. Instagram benötigt die geeigneten Meta/Instagram-API-Zugänge und Berechtigungen. Ein reines GitHub-Login verbindet keine Social-Media-Konten.

Das Programm speichert Daten lokal in SQLite. Keine Zugangsschlüssel ins Repository hochladen. Das Dashboard ist nur für die lokale Nutzung auf `127.0.0.1` ausgelegt; nicht ungeschützt ins Internet stellen.

### Projektziel
- Plattformübergreifende Video-Liste, Gesamtaufrufe, Likes und Engagement
- Automatisierbare Synchronisierung über offizielle Schnittstellen
- CSV-Export und gespeicherte Verlaufssnapshots
- Zugangsdaten ausschließlich serverseitig

### Aktueller Stand
Quellcode wird nach und nach im Repository eingerichtet. Das vollständige Prototyp-Paket wurde im Chat als ZIP bereitgestellt.
