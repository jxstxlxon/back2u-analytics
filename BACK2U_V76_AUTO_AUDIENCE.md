# BACK2U V7.6 – Automatischer Zielgruppen-Abgleich

## Wozu?

BACK2U speichert jetzt neun Zielgruppenaufteilungen in der **privaten Cloudflare-D1-Datenbank**. Dieser Patch ergänzt einen täglichen Windsor.ai-Abruf für YouTube, Instagram und TikTok. Der einmalige JSON-Import bleibt als Notfalloption vorhanden.

## Einmalige Einrichtung (nur der Administrator)

1. Melde dich in deinem eigenen **Windsor.ai-Konto** an und öffne die API-Key-Einstellungen.
2. Melde dich in **Cloudflare → Workers & Pages → back2u-cloud → Settings → Variables and Secrets** an.
3. Füge eine **verschlüsselte Secret-Variable**, keine öffentliche Textvariable, mit dem Namen `WINDSOR_API_KEY` und deinem Windsor.ai-API-Key als Wert hinzu.
4. **Schicke den API-Key nicht per Chat, GitHub, Screenshot oder E-Mail.** Speichere ihn ausschließlich als Cloudflare Secret.
5. Öffne nach dem Cloudflare-Deployment als Admin das BACK2U Dashboard → **System → Automatische Zielgruppen-Aktualisierung** → **Jetzt aktualisieren**. Erfolgsanzeige: **9 Aufteilungen aktualisiert**.

Es muss **kein neuer Cron Trigger** angelegt werden: Der bestehende Trigger `*/30 * * * *` bleibt für TikTok bestehen. Der Zielgruppen-Abruf läuft innerhalb dieses Triggers und nur, wenn seit dem letzten Erfolg mindestens 24 Stunden vergangen sind; gescheiterte Versuche werden frühestens nach drei Stunden wiederholt.

## Datenzugriff

| Plattform | Windsor.ai Bericht | Zeitraum / Messbasis |
|---|---|---|
| YouTube | `viewer_age_group`, `viewer_gender`, `viewer_percentage` | letzte 28 abgeschlossene Tage, Zuschauer-Prozente |
| YouTube | `country`, `views` | letzte 28 abgeschlossene Tage, Länderaufteilung der Aufrufe |
| Instagram | `audience_age_*`, `audience_gender_*`, `audience_country_*` | zum Abrufzeitpunkt verfügbare Follower-Lifetime-Demografie; unterschiedliche Abdeckungsgrade |
| TikTok Organic | `audience_ages_*`, `audience_genders_*`, `audience_countries_*` | Follower-Anteile, zum Abrufzeitpunkt |

**Nicht direkt vergleichbar:** YouTube-Länder = Aufrufe, YouTube-Alter/Geschlecht = Zuschauer, Instagram & TikTok = Follower. Bei Instagram bedeutet `U` **nicht angegeben** und wird nicht auf männlich/weiblich umverteilt. Länderdaten können eine kleinere Grundgesamtheit als die gesamte Followerschaft haben.

## Datenschutz und Fehlerschutz

- Der Windsor.ai-API-Key liegt **nur als Cloudflare Secret**. Er ist **nicht** im öffentlichen Repository, im statischen HTML oder in D1 hinterlegt.
- Die Windsor.ai-API verlangt eine `api_key`-Query-Variable; die Worker-Integration überträgt sie ausschließlich über HTTPS und schreibt weder vollständige Aufruf-URLs noch API-Antworten in Protokolle.
- Die Antworten werden für die jeweils richtige Konto-ID und alle neun Kategorien geprüft; unvollständige Ergebnisse überschreiben den letzten gültigen D1-Datenstand **nicht**.
- Der synchronisierte Stand befindet sich unter dem D1-Key `audience_v1`. Die Sync-Kontrolle (ohne Schlüssel) befindet sich in `audience_sync_status`.
- Der Endpunkt `POST /api/audience/sync` darf nur vom Admin mit Same-Origin-JSON-Anfrage aufgerufen werden. Gastzugänge können die publizierte Statistik im geschützten Snapshot ansehen, aber keine Synchronisierung auslösen, Schlüssel lesen oder Daten verändern.
- API-Schlüssel und Daten werden **nicht** durch Cloudflare-Deployment oder bestehende Google-Sheets-Feeds ersetzt.

## Betrieb und Fehlerbehebung

- Im Admin-Bereich **System** steht der letzte erfolgreiche Abgleich oder eine konkrete Fehlermeldung. Der Rest des Dashboards bleibt funktionsfähig, auch wenn Windsor.ai nicht erreichbar ist.
- Wenn der Secret-Wert fehlt, bleibt die Synchronisierung deaktiviert und die bisher in D1 importierte Zielgruppe unverändert.
- Der Windsor.ai-Tarif muss den 28-Tage-Zugriff und tägliche API-Aufrufe zulassen; ein Tarif- oder API-Limit kann einen Abgleich verzögern.
- Cloudflare Cron Trigger verwenden **UTC**. Geplante Läufe werden nicht exakt auf die Sekunde garantiert.
- Nach dem Deployment zuerst den Cloudflare-Preview-/Produktions-Build und dann einen echten angemeldeten **Jetzt aktualisieren**-Aufruf prüfen. Es reicht **nicht**, nur einen erfolgreichen Build zu melden.
