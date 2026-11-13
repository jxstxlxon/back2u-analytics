# BACK2U – Funktionsplanung nach V7.8 (ab V7.9)

**Status:** Technisches Konzept, keine neuen API-Freigaben, keine automatische Veröffentlichung. Nicht als bereits implementiert behandeln.

## Priorität 1 – Vertrauenswürdige Creator-Analyse

### A. Datenherkunft und Abdeckung pro Plattform / Kennzahl
**Problem:** Ein vorhandener Lifetime-Wert oder ein Snapshot mit lückenhaften Tagen sieht sonst wie ein vollständiger aktueller 28-/90-Tage-Bericht aus.

**Umsetzung:**
- In `/api/snapshot` für jeden Messwert `source`, `asOf`, `periodStart`, `periodEnd`, `basis` und `knownDays` verwenden, ohne bestehende Formate zu brechen.
- In V7.8 vorerst nur verifizierte TikTok-Tageswerte einblenden; ab V7.9 generische Provenienz-Verwaltung für YouTube, Instagram und TikTok.
- Dashboard-„Datenqualitätsradar“: 7/28/90 Tage je Anbieter, letzte bestätigte Aktualisierung, manuell/automatisch, bekannte Lücken.
- Keine `null`- oder `undefined`-Werte als 0, keine Prozentvergleiche zwischen anders definierten Metriken.
**Abnahme:** 90-Tage-Grafik bei nur 28 echten TikTok-Tagen zeigt *28/90* und die übrigen Tage ohne Linie; auf iPhone/iPad ist die Quelle ohne Aufklappen sicht- oder erreichbar.

### B. Echte Videoentwicklung nach 24 und 48 Stunden
**Problem:** Bisherige Lifetime-Zahlen sagen nicht, wie gut ein Upload in seinen ersten 24 Stunden wirklich funktioniert hat.

**Datenmodell:** `video_metrics_history` (privat, D1) mit `platform`, `videoId`, `publishedAt`, `capturedAt`, `viewsLifetime`, `likesLifetime`, `sharesLifetime`, `source`. Plattform-ID und Video-ID eindeutig; keine Vermischung von Tageskanalaufrufen und Video-Lifetime.

**Auswertung:** Ersten gemessenen Wert in einem transparenten Fenster um `publishedAt+24h` bzw. `+48h` zeigen. Bei zu großer Abweichung in der Messzeit „nicht exakt gemessen“ anzeigen, **keine** rückwirkende 24h-Zahl aus heutigen Lifetime-Zählern ableiten.

**Abnahme:** Ein Video ohne Messpunkt in der zulässigen Zeitspanne zeigt „–“, nicht 0 oder geschätzte Aufrufe. TikTok/Instagram/YouTube werden getrennt bewertet.

## Priorität 2 – Experimente, die etwas aussagen

### C. Posting-Zeit- und Uploadfrequenz-Teststudio
- A/B-Testpläne für z. B. 2 vs. 4 Uploads/Tag oder 11 vs. 19 Uhr.
- Pro Test: Plattform, Format, Variante, Start/Ende, mindestens fünf möglichst vergleichbare Videos je Variante, 24-/48h-Messfenster.
- Median und Streuung anzeigen; Stichproben- und Confounder-Hinweise (Wochentag, Song, Clipqualität, Feiertag).
- Nie behaupten, dass mehr Uploads die Views *verursacht* haben, nur weil der Durchschnitt steigt.
**Abnahme:** Fehlende 24h-Messdaten sperren automatische Gewinneraussagen.

### D. Format-Performance und Crosspost-Verknüpfung
- Gleichen Clip über TikTok, Instagram und YouTube heuristisch gruppieren, aber Zuordnung durch manuelle Bestätigung/Korrektur ermöglichen.
- Vergleich „dieselbe Datei auf drei Plattformen“ zeigt Werte pro Plattform getrennt, plus Messzeitpunkt und Erfassungsgrad.
- Persönliche „Pattern Library“: Format, Hook, Song, Kameraeinstellung, Hose, Drehort und Schnittmuster – zunächst manuell taggbar.
**Abnahme:** Kein Clip wird allein wegen eines gleichen Titels endgültig zusammengelegt; einzelne Uploads bleiben erhalten.

## Priorität 3 – Creator-Arbeitsabläufe / mobile UX

### E. Story Studio mit echten Vorlagen
- Vier auswählbare Story-Layouts mit vorgefertigten, editierbaren Überschriften; Format 9:16.
- Dynamischer Farb- und Kontrastabgleich über alle Theme-Studio-Themes; keine schwer lesbaren Beschriftungen.
- Kollisionsprüfung von Titel, Untertitel, Buttons und Statistik für iPhone-Safe-Areas, iPad und Desktop.
- Vorschau ohne automatische Veröffentlichung; Export nur durch ausdrückliche Aktion.
**Abnahme:** Keine Überlagerungen bei kleinen iPhones oder iPad-Split-View. Themes verwenden nicht nur Hintergründe, sondern abgestimmte Text- und Akzentfarben.

### F. Creator-Planer mit realistischem Aufwand
- Produzieren, Filmen, Schneiden, Review, Posten als separate Status; 3-/7-Tage-Kalender.
- Direkt in die Planung bekannte Videoformate übernehmen; markierte Entwürfe nicht als veröffentlichte Uploads zählen.
- Formate und Slots nach nachweislichen Daten priorisieren; wenn Daten fehlen, klar als Idee markieren.
**Abnahme:** Bei Gerätewechsel nicht versehentlich vorgeben, browserlokale Pläne seien überall synchronisiert. Server-Sync erst mit explizitem Owner-Zugang und D1-Datentrennungsregel.

## Reihenfolge und Schutz

1. V7.7 abschließen (D1-Backup, echte APIs, sieben Tage Parallelvergleich).
2. V7.8 TikTok-Tagesdaten freigeben und zunächst nur beobachtend prüfen.
3. V7.9 **Datenqualität** und Snapshot-Historie vor umfangreichen neuen Visualisierungen.
4. V7.10 **Experiment Lab** auf echte Messpunkte stützen.
5. V7.11 Story Studio und mobile iPhone-/iPad-Qualität danach gezielt ausbauen.

Für jede Phase: eigener Draft-PR, Syntax-/Integritätstests, mobiles Abnahmeprotokoll, keine Produktion ohne Backup, keine erfundenen Analytics-Daten.
