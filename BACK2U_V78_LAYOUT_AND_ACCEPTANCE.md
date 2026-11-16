# BACK2U V7.8 – Informationsarchitektur für PC und iPhone

**Stand: 16.11.2026.** Dies ist eine responsive Layout-Überarbeitung, keine Veränderung der API-Daten oder D1-Datenbank. Die bereits vorhandenen Analytics-, Gast-, Story- und Theme-Funktionen bleiben bestehen.

## Leitprinzip
Die häufigste Handlung muss ohne langes Scrollen möglich sein. **Zuerst lesen und entscheiden, dann konfigurieren.** Die Plattform- und Zeitraumfilter behalten ihre Bedeutung. Im Video Radar ist das plattformübergreifende Top-10-Ranking weiterhin von einem individuellen Plattformfilter unabhängig. Die Zahlen bleiben auch bei fehlenden Daten korrekt beschriftet.

## Reihenfolge auf dem iPhone
1. **Oben:** Logo, Suchfeld, Story/Design, Live-Status, Aktualisieren.
2. **Direkt darunter:** Plattformen (Alle/YT/IG/TT), Zeitraum (7/28/90), ein kompakter Glas-Regler. Die frühere große Marketing-Einleitung nimmt keinen Platz über den Kennzahlen ein.
3. **Übersicht:** Aufrufe im Zeitraum und die drei Plattformen; Follower/Gesamtzahl; Datenfrische; Tagesverlauf und Tagesanteile; erfolgreichste Videos; All-time-Summe; anschließend zusätzliche API-Metriken und detaillierte methodische Informationen.
4. **Video Radar:** zunächst **3 beste Videogruppen**, bei Bedarf Top-10 mit einem Button. Dann optionale manuelle Crosspost-Zuordnung und die vollständige Suche/Filter/Liste. Es bleiben zehn Ranking-Plätze im Datensatz: die übrigen sieben sind nur visuell eingeklappt.
5. **Creator Hub:** KPIs, Posting-Kalender, Hall of Fame & Ziele, Content-Plan & Textwerkstatt, Meilensteine & Ideen.
6. **Immer unten erreichbar:** Übersicht, Videos, Creator, Zielgruppe, Mehr. „Mehr“ führt zu Experimenten, System und Design. Tastatur-Escape und Tippen außerhalb schließen das Menü.

## Reihenfolge auf dem PC
- **Ab 1240 px:** sechs Bereiche in einer persistenten linken Seitenleiste in sinnvoller Reihenfolge: Übersicht, Video Radar, Creator Hub, Experimente, Zielgruppe, System. Die Inhalte bleiben rechts und nutzen die restliche Breite.
- **761–1239 px:** die bestehende horizontale Bereichsnavigation bleibt erhalten, damit keine zu schmale Inhaltsfläche entsteht.
- **Creator Hub:** Kalender und Handlungsmöglichkeiten vor Meilensteinen/Ideenspeicher. Das bestehende zweispaltige Layout kann die verfügbare Breite weiterhin ausnutzen.

## Design- und Barrierefreiheitsregeln
- Alle vorhandenen Themes/Farbwelten werden übernommen. Kein festes Dark-Only-Farbschema.
- Die iPhone-Bottom-Bar respektiert Safe Areas und verdeckt das letzte Dashboard-Element nicht.
- Navigation mit Tastatur und sichtbarer Fokussierung: Escape schließt „Mehr“; die aktive Seite hat `aria-current="page"`; Menüstatus verwendet `aria-expanded`.
- Story- und Theme-Overlay verdecken die Bottom-Bar kontrolliert.
- Kleine Displays (320–375 px) behalten kleine, aber lesbare Beschriftungen. Größere Schrift/Accessibility-Textgröße muss im echten Browser zusätzlich geprüft werden.
- Keine zweite Kopie der Analytics-Abfragen, keine eigenen Import-Schedules, kein Speicherzugriff durch das neue Navigationsmenü.

## Abnahmecheckliste vor Live-Freigabe
- [x] Quelldateien, Markup, neue IDs und Verknüpfungen durch Regressionstests geprüft.
- [x] Sechs vorhandene Dashboard-Bereiche sind im HTML erhalten; beide Navigationen steuern dieselbe `setSection`-Funktion.
- [x] PC-Leiste und iPhone-Fußnavigation haben eigene Breakpoints, inklusive Safe-Area-Offsets.
- [x] Die zehn Videos bleiben im Ranking; nur die visuelle iPhone-Liste wird zunächst auf drei begrenzt.
- [ ] Reale iPhone-Safari-Abnahme mit Owner-Login: 375/390/430 px, Portrait + Landscape, aktive/geschlossene/wechselnde Mehr-Navigation, Keyboard, Story-Overlay, Themes.
- [ ] Reale iPad-Abnahme (768–1194 px) inklusive Portrait/Landscape, Video-Detail, Postingkalender, Touch-Bedienung.
- [ ] Reale Desktop-Browserprüfung bei 1240, 1440 und 1920 px: sticky rail, Detailansicht, Scrollen, 6 Themes inkl. hellem Aero.
- [ ] Cloudflare-Assets-Deployment ist separat bestätigt (grüne GitHub-Tests allein deployen nicht).
- [ ] Endgültige Direktdatenprüfung über `/api/direct-parity` und Windsor-unabhängigen Google-/Meta-Betrieb. Siehe Issue #27.

## Offene Zugriffsgrenze
Der Quellcode und die GitHub Actions können geprüft und gemergt werden. Der direkte Zugriff auf die geschützte Cloudflare-D1-Verwaltung, das private Google-Apps-Script-Projekt und echte angemeldete Browsergeräte ist über die aktuelle GitHub-Verbindung **nicht** gegeben. Weder erfolgreiche Syntax-/Mocktests noch diese Layout-Änderung sind ein Nachweis, dass alle offiziellen Datenquellen dauerhaft laufen.

## Rollback
Wenn ein echtes Gerät bei dieser Gestaltung Probleme zeigt, nur die Änderungen an `site/index.html`, `site/workspace-v78.css`, `package.json` und den Tests zurückrollen. **D1-/OAuth-/Snapshot-Daten unverändert lassen.**
