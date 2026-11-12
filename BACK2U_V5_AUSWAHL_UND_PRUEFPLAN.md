# BACK2U Dashboard V5 – Reparaturen und Auswahl aus 50 Ideen

Stand: 12. November 2026. Diese Datei ist der verbindliche Plan für V5; keine der Informationen ist ein Ersatz für einen echten Browser-/Gerätetest.

## Reihenfolge: Was umgesetzt wird

**Priorität 0 – zuerst reparieren**
1. **Navigation:** Der Aufruf von `$('[data-section]').forEach(...)` ist falsch, weil `$` nur ein Element liefert. In V5 auf `$$('[data-section]')` und `$$('.view')` (alle Elemente) korrigiert. Video Radar, Experimente, Zielgruppe, System, Creator Hub sollen wieder reagieren.
2. **Diagramm-Performance:** Mausbewegungen nicht mehr bei jedem Pixel vollständig ins DOM schreiben. V5: Tagesindex prüfen, nur Änderungen zeichnen, via `requestAnimationFrame` maximal einmal je Animationsframe. Tippen und Tastatur bleiben direkt möglich.
3. **Allgemeines Ruckeln:** `Leistung & Glas → Flüssig (empfohlen)` ist pro Theme voreingestellt, mit begrenztem teurem Backdrop-Blur, ohne riesige Ambient-Blur-Layer und ohne CSS-Drop-Shadows auf den Live-Diagrammlinien; `Volle Effekte` bleibt auswählbar.
4. **Frutiger-Aero-Cursor:** Die optionalen Cursor-Grafiken sind auf 22×22 CSS-Pixel verkleinert; auf Touch-Geräten ist die Option ohnehin nicht aktiv.
5. **Sprache:** Große Kennzahlen und Beschriftungen statt „API-/Sheets-Tageswerte“, „Archiv-Tageswerte“, „Netto-/Abo-Daten“ oder „Unvollständige Tage“ nun Alltagssprache.

**Priorität 1 – sichtbare neue Funktionen:** Unter dem neuen Tab **✦ Creator Hub**.

## Welche Vorschläge aus den Top 50 jetzt wirklich drin sind

| Nutzeridee | Umsetzung in V5 | Anzeige |
|---|---|---|
| #9 Durchschnitt pro Video | Nur bekannte echte Gesamtaufrufe geteilt durch Anzahl der entsprechenden Plattform-Videos. YouTube-Export-Zeitraumzahlen werden ausgeschlossen. | Große KPI-Karte „Ø Aufrufe pro Video“ |
| #11 Tagesrekord | Höchster belegter Tag aus den vorhandenen Tagesberichten; vollständige Plattformtage bevorzugt, Teildaten sonst deutlich markiert. | Große KPI-Karte mit Datum |
| #12 Streak | Längste Folge aufeinanderfolgender Upload-Tage aus den bekannten Veröffentlichungsdaten. | KPI-Karte „Posting-Serie“ |
| #15 + #19 Meilensteine/Abzeichen | Schwellenwerte nur bei vorhandenen Zahlen (100.000 / 1 Mio. / 5 Mio. erfasste Gesamtaufrufe, 1.000/5.000/10.000 Abos/Follower je Konto, 7+ Tage Posting-Folge). | Abzeichen aus den tatsächlichen Daten |
| #17 Ziele | Einstellbares Ziel für bisher erfasste Video-Gesamtaufrufe; Fortschritt automatisch berechnet. Die Zielzahl wird lokal im Browser gespeichert. Keine erfundene Erfolgsprognose. | Thematischer Fortschrittsbalken |
| #20 Monatsrückblick, zunächst leicht | Anzahl Veröffentlichungen, Posting-Tage und bisherige bekannte Gesamtaufrufe der in diesem Monat veröffentlichten Videos. Kein falscher „Monatsaufrufe“-Vergleich. | Drei kleine Monatskarten über dem Kalender |
| #25 Posting-Kalender | Anklickbare Tage zeigen je Plattform veröffentlichte Videos und deren bisherige erfasste Gesamtaufrufe. **Nicht** die Aufrufe, die exakt an diesem Tag erzielt wurden. | Siebenspalten-Kalender und Videodetails |
| #26 Ideenliste | Neue Videoideen hinzufügen, abhaken und entfernen. Nur im aktuellen Browser gespeichert, ausdrücklich nicht Cloud-synchronisiert. | Editable Ideenliste im Creator Hub |
| #39 Suche oben | Globale Videosuche im Header öffnet direkt gefilterten Video Radar. | Kleines Suchfeld „Video suchen“ |
| #40 Filter merken | Plattform und 7/28/90 Tage bleiben nach einem Neuladen erhalten; Theme-Einstellungen wurden ohnehin pro Theme gespeichert. | Automatische Wiederherstellung |
| #43 bessere Kontraste | Vorhandenes Contrast-Styling bleibt, neuer standardmäßiger Flüssig-Modus vermeidet unnötig aufwendige optische Filter. | Konsistent mit den 36 Themes |
| #44 + #45 Datenstand/fehlende Zahlen | Der Creator Hub kennzeichnet den Datenstand und beschreibt fehlende Werte in Alltagssprache. | Fußnote mit Datum und Hinweisen |

**Zusätzlich: Hall of Fame** (im ursprünglichen Ideentext): Podium mit 🥇🥈🥉, Titel, Plattform und echten Gesamtaufrufen. Zeitraumberichte werden nicht in dieses Ranking gemischt.

## So sieht der neue Creator Hub aus

**Desktop:**
- Oben vier große glasige Kacheln: Ø Aufrufe / stärkster erfasster Tag / Posting-Serie / Kontostände.
- Darunter zwei große Glasflächen nebeneinander: links **🏆 Hall of Fame** mit Medaillen, rechts **🎯 Meine Ziele** mit leuchtendem Fortschrittsbalken.
- Darunter über die ganze Breite: **📅 Posting-Kalender** mit Monatsnavigation, Monatszusammenfassung und Details zum angeklickten Uploadtag.
- Unten zwei Flächen: **✨ Erfolge** und **📝 Videoideen**.

**iPhone:**
- Zwei KPI-Karten pro Reihe; alle großen Bereiche untereinander.
- Kalender mit sieben Wochenspalten; kompakte Tageszellen, die anklickbar bleiben.
- Schrift, Glas, Konturen, Farbverläufe und Badges übernehmen die aktuell gewählte Theme-Palette, einschließlich eigener Farbanpassungen.

## Welche weiteren Ideen ich bewusst empfehlen würde – aber erst bei ausreichenden Daten

| Idee | Wann sinnvoll / konkrete Gestaltung |
|---|---|
| #10 Bester Wochentag/Uhrzeit zum Posten | Nach vergleichbaren 24h-/48h-Werten **und zuverlässigen Upload-Zeitzonen**; eine klar beschriftete Empfehlungskarte. Sonst nur Upload-Häufigkeit, keine falsche „beste Uhrzeit“. |
| #16 Heute vs. gestern | Erst bei echten aktuellen Tageszahlen für dieselben Plattformen, sonst nicht „heute“ beschriften. Kleine Vergleichskarte mit Datumsangabe. |
| #22 Alters-/Geschlechtsbalken | In „Zielgruppe“, nur aus vorhandenem Export, inklusive Quellen-/Datumsstempel; bestehender Bereich kann visuell vereinfacht werden. |
| #23 Community-Aktivitätszeiten | Bereits teilweise für TikTok vorhanden, aber nur archivierte Daten und unbekannte Zeitzone; einfache Uhrzeitübersicht nach klarer Quellenprüfung. |
| #27 A/B-Experimente | Zwei vergleichbare Gruppen mit gleicher Messdauer, Stichprobengröße, Durchschnitt und `noch kein eindeutiger Sieger` bei zu wenig Daten. |
| #29 Videolänge vs. Erfolg | Interaktives Punktdiagramm nur wenn Länge und vergleichbare Video-Messzeiträume vorliegen. |
| #31 PDF-/Bild-Export | Als gebrandeter Monatsbericht; erfordert Export-/Layouttest, keine Screenshots mit veralteten Beispielzahlen. |
| #34 Zeitraumvergleich | 7/28/90 Tage vs. echter Vorzeitraum nur bei vollständiger vergleichbarer Datenbasis, sonst klar `nicht ausreichend Daten`. |
| #41 Hilfe-Icons | Kurze Tooltipps bei wenigen tatsächlichen Fachbegriffen; keine überladene UI. |
| #47 Auffälligkeiten erkennen | Nur wenn genug Tagesdaten vorhanden sind; eine untypische Abweichung zunächst als `ungewöhnlich`, nicht sicher `viral` ausgeben. |
| #48 Wochenbericht | Bei Bedarf als automatisierbarer PDF-/E-Mail-Bericht nach stabiler Datenbasis, nicht schon mit unvollständigen Tageszahlen. |

## Das würde ich vorerst nicht einbauen

- **#14 Aufrufe/Follower-Verhältnis als `Nicht-Abonnenten`** – das Verhältnis misst nicht, wer tatsächlich gefolgt ist.
- **#13 / #50 Wachstums- und Trendvorhersagen** – ohne saubere Netto-Follower-Zeitreihe und stabile vergleichbare Perioden wären sie irreführend.
- **#21 Weltkarte** – erst nach gut datierten, vergleichbaren Länderwerten; ansonsten ist sie reine Deko.
- **#24 Neu vs. wiederkehrende Zuschauer** – entsprechende Daten müssen verfügbar sein, nicht aus Likes geschätzt werden.
- **#32 Öffentlicher Ansichtslink / #33 Kundenmodus** – Security-/Auth-Plan nötig, bevor private Statistiken freigegeben werden.
- **#36 Skeleton-Animationen / #37 Count-up-Zahlen** – können das bestehende Ruckeln eher verschlimmern.
- **#42 Wisch-Navigation** – nur wenn die Smartphone-Bedienung damit zuverlässiger wird, sonst Konflikte mit horizontalen Diagrammen.
- **#49 Konkurrenzvergleich** – erst mit geprüftem API-/Nutzungsmodell und belegbar öffentlichen Vergleichszahlen.

## Akzeptanztests vor Merge

- [x] Statischer Codecheck: neue und bestehende Skripte parsen.
- [x] Logiktests: bekannte Lifetime-Video-Aufrufe, Tagesrekord mit lückenhaften Tagen, Streak, Hall of Fame, Kalender, Ziel und Ideen.
- [x] Navigation: `$$` statt fehlerhaftes `$` in `setSection`.
- [x] Hover: gezielte Tageswechsel mit rAF, keine unnötigen DOM-Neuzeichnungen bei Bewegung innerhalb desselben Tages.
- [ ] Browser-Test: alle Navigationstabs anklicken, Creator Hub aufrufen, Monatsnavigation und Ideen ausprobieren.
- [ ] PC-Performance: Frame-Rate beim Scrollen und Hover im Video Radar und Diagramm prüfen.
- [ ] iPhone 17 Pro und iPad: Responsive Layout, kein verzögertes Nachzeichnen, Liquid Glass bleibt erkennbar.
- [ ] Cloudflare-Build-Check prüfen; keine Backend-/D1-Änderungen aus V5.
- [ ] Erst nach Prüfung und Nutzerfreigabe übernehmen.

**Ergebnis:** eine kleinere, echte und überprüfbare Auswahl an Funktionen. Alle Datenwerte bleiben an tatsächliche Quellen gebunden.
