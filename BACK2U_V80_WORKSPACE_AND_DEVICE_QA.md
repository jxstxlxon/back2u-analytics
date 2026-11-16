# BACK2U V8.0 – Workspace für PC, iPhone und iPad

Stand: 16.11.2026. Dieses Update ist eine Oberflächenüberarbeitung. D1-Daten, OAuth, Zahlen, 36 Themes, Importe und alle sechs Ansichten bleiben unverändert.

## Leitidee
Ansehen → Vergleichen → Entscheiden → Erst dann einstellen.

## Übersicht nach Gerät und Bereich

| Bereich | iPhone | Desktop/iPad |
| --- | --- | --- |
| Design | Vier schnelle Theme-Einstiege (Ocean Crystal, Emerald Luxe, Sunset Pearl, Amethyst Ice); Katalog und sämtliche Regler dahinter | Die vier Einstiege oberhalb des bestehenden 36-Theme-Rasters |
| Story Studio | Vier echte, geprüfte Vorlagen: Momentum, Plattformvergleich, Top-Video und 7-Tage-Recap. Seitenwahl direkt sichtbar. Erweiterte Karten-/Titel-/Layoutregler aufklappbar | Regler offen neben der 9:16-Vorschau; vorhandener PNG-Export bleibt |
| Video Radar | Suche/Sortierung vor Top-3/Top-10 und vollständiger Videoliste. TikTok-Sync/Archiv in Datenpflege-Details. In-Page-Schnellziele | Gleiches Inhaltsprinzip, mit zweispaltiger Video-Bibliothek und Details |
| Creator Hub | Sprünge zu Kalender, Zielen, Captions, Content-Plan, Ideen, Bestenliste | Gleiche Quick Actions; Kalender vor Rückblick und Archiv |
| Zielgruppe | Sichtfilter Alle, Alter, Geschlecht, Länder; nur belegte Daten, Quellenangaben bleiben | Flexibles Raster und unveränderte Originalwerte |
| Experimente | Sprünge zu Posting-Rhythmus, A/B-Test und nächster Test | Gleicher einfacher Workflow |
| System | Quellenstatus und Datenqualität zuerst, Sync/Gäste danach; technische Erläuterungen klappbar | Einheitliche Informationshierarchie, größere Karte |
| Mehr | Story erstellen, Daten neu laden, Experimente, System, Design | PC: bestehende Seitenleiste |

## Sicherheit und technische Grenzen
- Keine neuen privaten API-Aufrufe. Keine neuen Cloudflare-Routen. Keine D1-Schreibvorgänge oder Auth-Änderungen.
- Theme-Presets über die bereits vorhandene BACK2U_THEMES.use API. Alte Farbanpassungen und Frutiger-Aero-Presets bleiben verfügbar.
- Die vier Story-Vorlagen ändern ausschließlich die aktive Seite und ausschließlich bereits vorhandene Kennzahltypen. Bis zu acht Story-Seiten, bisheriger PNG-Export (1440 × 2560 px) und bestehende lokale Speicherung bleiben erhalten.
- Zielgruppenfilter arbeiten mit CSS-Sichtbarkeit, nicht mit geänderten Messzahlen oder geschätzten Prozenten.
- Das technische TikTok-Menü bleibt auf der normalen gesicherten API-Berechtigungsstruktur.
- Hell/dunkel/Frutiger Aero weiter aus bestehenden Design-Tokens. Kein festes dunkles Farbschema.
- Alte Browser-Links sowie Gastrechte bleiben unverändert.

## Verifizierung vor endgültiger Abnahme
- [x] Bestehende DOM-Anker der aktuellen GitHub-Version geprüft und V8-Assets zuletzt eingebunden.
- [x] V8 Regressionen zu Theme, Story-Kennzahlentypen, Navigation, Zielgruppenfiltern und Datengrenzen im Testkatalog.
- [ ] Echte iPhone-Safari-Sichtprüfung 320–430 px und Querformat, inklusive Story-Klappsteuerung.
- [ ] Echte iPad-Prüfung 768–1194 px (Themes, Story, Kalender, Scrollen).
- [ ] Echte PC-Prüfung 1240/1440/1920 px (Video-Detail, System, Theme-Kontraste).
- [ ] Verifizierte Auslieferung der neuen V8-Assets in Cloudflare plus angemeldeter End-to-End-Test.
- [ ] Prüfung der noch offenen zwölf offiziellen Direktdaten-Kriterien, sieben Tage Parallelvergleich und D1-Wiederherstellung separat.

## Rollback
Die V8 CSS/JS-Dateien und die referenzierenden Links in site/index.html zurücksetzen. Keine Daten-, Worker- oder OAuth-Änderungen sind notwendig. Die bisherige Story-Komponente kann im Zweifel aus der Git-Vorgängerversion zurückgesetzt werden.

## Separat offene Infrastruktur
Cloudflare-D1-Backup, Apps-Script-Trigger und eine dauerhaft kostenlose Windsor-Alternative bleiben unter GitHub-Issue #27 und sind nicht durch ein UI-Update gelöst.
