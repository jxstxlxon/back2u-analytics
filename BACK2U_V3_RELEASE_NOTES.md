# BACK2U Dashboard · V3 – Adaptive Visuals, Chart Intelligence und Story Studio

**Branch:** `feature/back2u-adaptive-charts-story-studio-v3`  
**Ziel:** Bestehende 36 Referenz-Themes und Live-Analytics beibehalten; Lesbarkeit, Diagramme, Branding und Story-Ausgabe verbessern, ohne Backend-/D1-/API-Daten zu verändern.

## Branding & Design

- Browser-Titel **BACK2U Dashboard**, skalierbares eigenes B2-Mark-SVG als Favicon, Header- und Sidebar-Logo sowie Story-Logo. Das Mark ist ein Vektor-Nachbau des stilisierten BACK2U-Motivs, kein Anspruch auf pixelidentische Kopie eines hochgeladenen Markenlogos.
- Pro Theme **adaptive Schriften** aus geräteintern verfügbaren Font-Familien (Modern, Tech, Elegant, Aero); im Theme Studio optional manuell überschreibbar.
- Angepasste Typografie für helle/dunkle Designs; **Lesbarkeit automatisch oder extra deutlich**; lesbare Akzent-Verläufe auch nach individuellen Farbänderungen.
- Extra-Regler pro Theme für Hintergrund-Intensität und optische Glas-Rahmenstärke, zusätzlich zu den vorhandenen Farb-, Glow-, Blur-, Radius-, Sättigungs- und Chart-Kontrast-Reglern.
- SVG-Artworks und Logo bleiben auf hochauflösenden Displays scharf. Keine neuen externen Schriftartdateien, Analytics-Screenshots, frei erfundenen Zahlen oder Fremdbibliotheken.

## Diagramme

- **Linie, Fläche oder Balken** direkt im Dashboard wählbar; Farben passen sich dem jeweils gewählten und angepassten Theme an, die Plattformreihen bleiben unterscheidbar.
- Lesbare numerische Y-Achse, Datums-X-Achse und Tooltips (auch Pointer/Touch).
- Vier zusätzliche Karten: **erfasste Summe**, **Durchschnitt je erfasstem Tag**, **höchster** und **niedrigster** erfasster Tag.
- Datenqualitäts-Text zeigt Anzahl Tage mit Messwerten und vollständig abgedeckte Plattformtage. Keine Imputation fehlender Tageswerte, keine Veränderung der vorhandenen Messgrößen.
- Wegen unterschiedlicher Berichtstypen (u.a. interessierte YouTube-Aufrufe) gilt: plattformübergreifende Summen sind **addierte vorhandene Messwerte**, keine einheitlichen Zuschauer und nicht immer direkt vergleichbar. Bei unvollständiger Abdeckung kennzeichnen, statt Wachstum zu behaupten.

## Story Studio V3

- **Bis zu 8 Story-Bilder**, auf jedem einzeln konfigurierbar:
  - Title, Theme (alle 36 / "wie Dashboard"), Layout Balanced/Bold/Compact
  - Plattform: Alle/YouTube/Instagram/TikTok
  - Zeitraum: 7/28/90 Tage
  - Drei unabhängig belegbare Content-Karten: Zeitraumaufrufe, Follower, Videogruppen, bestes Video, Plattform-Aufrufe, Plattform-Follower, Tagesdiagramm, stärkster Tag, Ø je erfasstem Tag
- **Dynamische 9:16-Vorschau**, direkte Verwendung der vorhandenen Dashboard-Daten und des gewählten Theme-Artworks.
- Der vorhandene Speichern-Button exportiert das **jeweils ausgewählte** Bild als **1440 × 2560 PNG** (Story-Modus, keine Browserchrome). Bilder werden einzeln exportiert.
- Für fehlende Daten: `–` oder ein klarer Datenhinweis statt erfundener Zahlen.
- Alle Story-Einstellungen werden **nur in LocalStorage dieses Geräts** abgelegt, ohne den Cloudflare-Datenstand zu verändern. Die individuellen Farb-/Typografie-Anpassungen aus dem Theme Studio werden übernommen, sofern das Story-Theme dieser Vorlage entspricht.
- Die alte unveränderte Story-Implementierung bleibt als lokaler Fallback enthalten; bei aktivem V3-Composer wird deren Vorschaubereich ausgeblendet und der PNG-Button schreibgeschützt abgefangen.

## Technische Änderungen

**Nur Frontend-Dateien:**
- `site/index.html` (Titel, Logo, 4 Chart-KPI-Karten, Diagramm-Umschalter, zwei schmale interne Daten-Bridges, Asset-Links)
- `site/theme-studio.js` (farbabhängige Text-/Chart-Tokens, optionale Schrift- und Kontrasteinstellungen, sichere öffentliche Theme-Lese-API)
- `site/ui-v3.css` (Kontrastschutz, typografische Konsistenz, responsive Story-Oberfläche, Karte/Chart-Finishing)
- `site/chart-v3.js` (SVG mit numerischen Achsen und echten Messpunkten)
- `site/story-composer-v3.js` (Slide-Auswahl, echte Daten-Slots, 1440px-Story-Export)
- `site/back2u-mark.svg` (Vektormarke).

**Nicht geändert:** `cloudflare/worker.js`, D1-Daten, Secrets, API-Rechte, Videolisten, Analytics-Synchronisierungen, Original-Seed-Daten.

## Abnahme nach Merge / Cloudflare Ready

1. Browser-Titel + Header-Logo sowie Desktop-Sidebar-Logo prüfen.
2. Orange/Sunset, Crystal Frost/Peal Horizon, Obsidian/Emerald und mindestens zwei Frutiger Aero Designs öffnen. Kleine Labels und Diagrammwerte müssen klar erkennbar sein.
3. Hauptfarbe auf Hellgelb und Dunkelrot ändern; Überschriften/Textkontrast, Linien und Story-Vorschau prüfen. Theme wechseln/zurück -> Einstellungen bleiben gespeichert.
4. Im Diagramm Linie/Fläche/Balken wählen, Y-Achse und Datenqualitäts-Text kontrollieren. Fehlende Plattformtage dürfen nicht als 0 gezählt werden.
5. Story Studio öffnen, mindestens 2 Bilder erstellen, auf beiden unterschiedliche Themen und Slots konfigurieren, auf dem iPhone/PC prüfen und beide einzeln als PNG abspeichern. Prüfen, dass Export `1440x2560` groß ist und die Daten mit der Vorschau übereinstimmen.
6. Das bestehende Dashboard, Video Radar, Plattform-/Zeitraumfilter, TikTok Sync/Audit, Follower Intelligence und Systemdiagnose kontrollieren.
7. Wenn ein UI-Fehler sichtbar wird: vorheriges Cloudflare-Deployment wiederherstellen und Fehler am PR-Branch korrigieren.

**Hinweis:** Die früher generierten Bilder waren Visual-Konzepte. SVG/Liquid-Glass-CSS nähern sie an, sind ohne direkte visuelle Browserprüfung jedoch nicht garantierte Pixel-1:1-Kopien.
