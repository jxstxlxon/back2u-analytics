# BACK2U – Liquid Glass Theme Studio (36 Presets)

## Gewünschte Auswahl

Aus der vom Nutzer freigegebenen 30er-Designübersicht werden **genau diese 25** Themes als auswählbare Presets eingebaut:

01 Cobalt Pulse; 02 Titanium Mirage; 03 Solar Ember; 04 Emerald Luxe; 05 Cobalt Wave; 06 Emerald Crystal; 10 Prism Noir; 11 Mint Aurora; 12 Arctic Glass; 13 Molten Rose Glass; 15 Amethyst Ice; 16 Aurora Spectrum; 17 Prismatic Violet; 18 Ocean Emerald; 19 Emerald Pulse; 20 Cyber Aurora; 21 Aurora Cyan Violet; 22 Pearl Horizon; 23 Sunset Pearl; 24 Ocean Crystal; 25 Obsidian Prism; 27 Titanium Midnight; 28 Ocean Circuit; 29 Crystal Frost; 30 Holographic Pearl.

**Alle 11 Frutiger-Aero-Designs zusätzlich:**

- Frutiger Aero Original
- Ocean Breeze
- Tropical Aurora
- Crystal Meadow
- Rainbow Aqua
- Azure Orbital
- Citrus Wave
- Pearl Aqua
- Sky Garden
- Lagoon Prism
- Fresh Horizon

Die sechs übrigen Designs der ursprünglichen 30er-Auswahl (07, 08, 09, 14, 26) sind **nicht** Teil der Theme-Auswahl. Hinweis: Die Presets sind als CSS-basierte Farb- und Glaseffekte umgesetzt; die generierten Konzeptbilder werden **nicht** als vollständige Dashboard-Hintergründe eingesetzt, da sie eigene UI-Elemente und möglicherweise beispielhafte Zahlen enthalten. Die tatsächlichen Dashboard-Daten bleiben aus der realen API/Cloudflare-Verbindung.

## Bedienung

Im Desktop-Dashboard oben rechts **✧ Design & Theme** öffnen; auf dem iPhone erscheint ein feststehender Theme-Button unten rechts. Die 36 auswählbaren Presets sind in **Alle / Dunkel / Hell / Frutiger Aero** gegliedert und durchsuchbar. Das Klicken eines Presets ändert sofort das globale Dashboard-Design.

Folgende Einstellungen können **für jedes Preset einzeln** verändert werden:

- Hauptfarbe, Zweitfarbe und dritte Farbüberlagerung (Color Layer)
- Stärke des Color Layers
- Glow und reflektiertes Licht
- Hintergrund-Unschärfe
- Kantenglanz / Glasreflexe
- Eckenradius
- Farbsättigung
- Diagrammkontrast (auch für helle Themes)
- Hintergrundmodus: Aurora, Weicher Verlauf, Ruhig oder Glass Bubbles
- Kompakter oder komfortabler Layoutmodus
- Animationen ein/aus

Der bestehende Schieberegler **LENS / GLASS INTENSITY** bleibt erhalten und regelt zusätzlich die Transparenz des Glases. Im Theme Studio kann jedes Theme einzeln auf sein Original zurückgesetzt werden.

## Datensicherheit & Kompatibilität

- Die Einstellungen bleiben pro Theme im **Browser-LocalStorage** gespeichert; sie sind nicht automatisch zwischen verschiedenen Geräten synchronisiert.
- Es werden keine Analytics-Zahlen verändert, erfunden oder mit Themes verknüpft.
- Es gibt **keine neuen Cloudflare-Secrets, TikTok-Scopes, Backend-Routen oder Datenbankmigrationen**.
- Die bestehende Login-Sperre, alle Video- und Followerdaten, das Video Radar, die 7/28/90-Tage-Filter sowie der Instagram-Story-Export bleiben unangetastet.
- Reduced-Motion aus den System-Einstellungen bleibt über die bestehende CSS-Regel respektiert.
- Die vorhandene Instagram-Story-Grafik bleibt absichtlich unabhängig vom Dashboard-Theme, damit Exporte nicht unbeabsichtigt verändert werden.

## Technische Umsetzung

`site/theme-studio.js` definiert die 36 Presets, per-Preset-Overrides, Eingabevalidierung, dynamische CSS-Variablen, accessible Dialog-/Keyboard-Bedienung und LocalStorage-Speicherung.

`site/theme-studio.css` enthält die globalen Glaseffekte, mobile Anpassung, helle Diagrammkontraste und Preset-Galerie.

`site/index.html` bindet beide zusätzlichen Assets ein und fügt nur den Theme-Button in die vorhandene Kopfzeile ein.

### Nach Merge/Deployment testen

1. BACK2U unter Cloudflare öffnen und anmelden.
2. **Design & Theme** öffnen, aus 36 Presets auswählen.
3. Mit Pearl Horizon/Arctic Glass die Chart-Lesbarkeit kontrollieren.
4. Hauptfarbe und Farbüberlagerung ändern, Theme wechseln und zurückschalten – eigene Werte sollten erhalten bleiben.
5. Auf dem iPhone Theme-Button, Scrollbarkeit und Schließen per **Fertig** testen.
6. Dashboard neu laden: Einstellungen sollen erhalten sein.
7. Video Radar, Plattformfilter, 7/28/90-Tage-Filter und Story-Export unverändert testen.

Das Konzept ist als CSS-Interpretation der Bildentwürfe gedacht, nicht als Pixel-für-Pixel-Kopie. Falls die Live-Prüfung Layoutprobleme zeigt, Rückkehr zum bisherigen Cloudflare-Deployment möglich.
