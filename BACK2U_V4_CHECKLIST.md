# BACK2U Dashboard V4 – Implementierungs- und Abnahmecheckliste

## Grundsätze

- **Die 25 ausgesuchten Designs** (01,02,03,04,05,06,10,11,12,13,15,16,17,18,19,20,21,22,23,24,25,27,28,29,30) bleiben gemeinsam mit **allen 11 Frutiger-Aero-Varianten** erhalten.
- Echte **YouTube-, Instagram-, TikTok-Analytics**, Video-IDs, Datenqualität, Unterscheidung zwischen Lifetime und 7/28/90 Tagen bleiben unangetastet. Keine Fake-Metriken, fehlende Werte bleiben „–“, Facebook nicht einschalten.
- Benutzerdefinierte Farben, Schrift, Glas, Chartstyle, Cursor und andere Theme-Werte sind **pro Theme getrennt** im lokalen Browser gespeichert.
- **Kein automatischer Production-Merge**. Nach PR-Merge Cloudflare `Ready` überprüfen, danach Gerätetests.
- Die Bilder aus dem Chat dienen als **visuelle Referenz**, sind aber nicht selbst als vollflächige Bildscreenshots mit möglicherweise erfundenen Zahlen eingebaut.

## Phase 1 · Performance [im Code umgesetzt – echte Messung ausstehend]

- [x] **Video Radar am PC**: `mergedVideos()` und plattformübergreifende Gruppen pro Live-Datenstand/Screenshot-Archiv-Zustand memoisiert, um Wiederholungsberechnungen beim Filtern zu vermeiden.
- [x] Suche wird mit 165 ms entprellt statt auf jeden Tastendruck neu berechnet.
- [x] Video Library zeigt zunächst **5 Videos**; mit „Weitere Videos anzeigen“ auf 15 pro Seite erweiterbar. Alle älteren Videos bleiben über Paging/Suche verfügbar.
- [x] Bilddekodierung `async`, Thumbnails weiterhin lazy geladen.
- [x] Im Video-Radar werden GPU-intensive Ambient-Layer und Panel-Blur vorsichtiger eingesetzt.
- [x] **iPhone 17 Pro**: Mobile Scroll-Optimierung durch Wegfall schwerer fixierter Hintergrundebenen und Deckelung mehrfacher Backdrop-Filter auf Touch-Geräten.
- [ ] **Realgerät-Messung**: schnelle Scrollstrecken auf iPhone und Desktop-Video-Radar mit Profiling/Video prüfen; gegebenenfalls konkrete Frame-/GPU-Flaschenhälse gezielt nachbessern.

## Phase 2 · Mobile und iPad [CSS umgesetzt – visuelle Abnahme ausstehend]

- [x] iPhone-Header, Logo, Buttons und Sync-Zeile flexibler umgebrochen.
- [x] Navigation horizontal scrollbar statt Überschneidungen abzuschneiden.
- [x] Hero-Zahlen, Plattformkarten, Chart-KPIs, Plattform-Tageswerte, Video-Liste, Filter und Systemmatrix für kleinere Displays angepasst.
- [x] Alle drei Standout-Videokarten sind auf iPhone verfügbar.
- [x] Separate Tablet-Breakpoints für 761–1099 px; Hochformat mit sinnvoll gestapelten Karten, Querformat mit geteilten KPI-/Video-/Experiment-Bereichen.
- [ ] iPhone und iPad im Hoch-/Querformat mit allen 36 Themes auf echte Überlappungen und Bedienbarkeit prüfen.

## Phase 3 · Theme-Studio und Typografie [umgesetzt]

- [x] **Sieben kuratierte Schrift-Optionen** im Theme-Menü: Theme-Original, Segoe UI Modern, Helvetica/Segoe Liquid Glass, Trebuchet Aero, Century Gothic/Aptos Geometrisch, Aptos Elegant und Arial Narrow Tech.
- [x] Kein Font-Download; verwendete systembasierte Fonts mit geordneten Fallbacks.
- [x] Bestehende adaptive Textfarben und Chartfarb-Tokens bleiben dynamisch, auch wenn Nutzer eigene Akzent-/Sekundärfarben auswählen.
- [x] Elf Aero-Presets besitzen individuelle zusätzliche Vektor-Artworks, nicht nur andere Farben (Wellen, Blasen, tropische Blätter, Regenbogen, Orbit, Zitrus, Perlen, Lagune, Sonnenaufgang).
- [x] Aero-Glasflächen erhalten pro Preset eigene Reflex- und Licht-Tokens, **abgeleitet aus den selbst gewählten Farben**.
- [x] **Aero-Cursor** (System / Aqua Glass Arrow / Glass Orb / Crystal Pointer) nur im Aero-Theme-Menü sichtbar; auf Touch-Geräten bleibt die normale Bedienung.
- [ ] Designähnlichkeit mit den einzelnen generierten Referenzbildern auf PC/iPad/iPhone visuell prüfen.

## Phase 4 · Logo und Branding [umgesetzt]

- [x] Horizontales `back2u-wordmark.svg` als **skalierbare SVG-Nachbildung** der BACK2U-Logo-Referenz oben links.
- [x] Logo im Header, auf großer Sidebar und in Story-Vorschau/PNG; Website-Titel BACK2U Dashboard.
- [ ] **Optischen Bildvergleich** mit dem vom Nutzer gesendeten Logo durchführen. Da die Vorlage ein kleiner Screenshot ist, kann die SVG-Nachbildung von der Originalgrafik abweichen. Eine freigestellte Originaldatei wäre bei Bedarf genauer.

## Phase 5 · Diagramme und Textkontrast [umgesetzt]

- [x] Großes Diagramm: zusätzliches deutliches Datenfeld für ausgewähltes Datum, Teilsumme, YouTube-, Instagram- und TikTok-Werte.
- [x] Vertikale Auswahlmarkierung sowie hervorgehobene Plattformdatenpunkte. Maus/Touch und Tastaturpfeile funktionieren.
- [x] Kompaktere technische Datenhinweise bei der Hero-Kurve; direkter Sprung zum großen Tagesdiagramm.
- [x] Bessere Farben, stärkere Labels, passende Tabellen-, Standout-, Video-Radar-, Status- und Detailflächen in hellen und dunklen Themes.
- [ ] Orange, helle und grüne Themes auf tatsächliche WCAG-Kontrastwerte und visuelle Lesbarkeit prüfen.

## Phase 6 · Story Studio [umgesetzt]

- [x] **Vier vorgefertigte Überschriften** zur Auswahl: Mein Creator-Update / Meine Zahlen im Überblick / So läuft’s gerade / Mein Wachstum.
- [x] Überschrift ist jederzeit frei bearbeitbar. Eigene Texte bleiben gespeichert.
- [x] Das **wirklich ausgewählte Theme** steht im Anpassbereich sichtbar, einschließlich Farbvorschau; bei „Wie Dashboard“ wird auch das konkrete aktuelle Preset angezeigt.
- [x] Die bereits existierende freie Auswahl von Plattform, Zeitraum, drei Datenkarten und bis zu acht Story-Slides bleibt erhalten.
- [x] Individuelle Schriftprofile werden bei 9:16-Vorschau und 1440×2560-PNG berücksichtigt.
- [x] Horizontales Logo in Vorschau und Export übernommen.
- [ ] iPhone/PC: Auswahl und alle drei Daten-Slots prüfen; 1440×2560 PNG gegen angezeigte Vorschau vergleichen.

## Weitere Idee aus dem Screenshot

- [x] **Video Library standardmäßig geschlossen/auf fünf Einträge reduziert** und erweiterbar.
- [x] Bestehendes zweispaltiges Desktop-Radar bleibt erhalten und passt sich Tablet/Mobile an.
- [ ] Hinweis auf wahlweise „Videos vs. Storys“ im Radar wurde **auf Nutzerwunsch ausdrücklich ignoriert**.

## Finale QA / Releaseentscheidung

1. PR-Diff prüfen: Nur `site/*` und diese Checkliste, **keine Backend-/D1-/Secrets-/OAuth-Änderungen**.
2. Testreihe Desktop bei 100%, 125%, 150% Zoom, große Video-Library öffnen, mehrfach filtern und zwischen Videos wechseln.
3. iPhone 17 Pro: schnelle Scrollbewegungen, keine verzögert auftauchenden Cards, Header/Navigation/Statusmatrix ohne Überlappung.
4. iPad Hoch- und Querformat: Theme Studio, Radar, Experimente, Story Composer.
5. Je ein Theme aus dunkel, hell, Orange/Amber sowie **alle elf Aero-Themes** testen; Schriftfarbe und Akzent individualisieren, Themes wechseln, neu laden.
6. Storytitel auswählen, überschreiben, mehrere Slides exportieren; aktives Theme im Anpassbereich prüfen.
7. Erst nach UI-Tests und Zustimmung live deployen; funktionierende Cloudflare-Version als Rollback behalten.

**Status:** Implementiert und statisch/logisch geprüft. Echte Render-/Performance-Tests auf den Nutzergeräten und pixelgenauer Vergleich mit Konzeptbildern stehen aus.
