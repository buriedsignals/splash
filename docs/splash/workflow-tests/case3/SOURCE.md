# Sources — Case 3: Men's marathon world record progression

## Dataset

`data.csv` lists the men's marathon world record progression from 2003 to 2026:
year, athlete, nationality, time (h:mm:ss), time in seconds, location.

All rows are officially ratified world records (World Athletics), as compiled in the
Wikipedia marathon world record progression table.

## Per-figure provenance

| Figure | Source |
|---|---|
| Full progression 2003–2026 (dates, athletes, times, locations) | Wikipedia — Marathon world record progression: https://en.wikipedia.org/wiki/Marathon_world_record_progression |
| Kelvin Kiptum 2:00:35 (Chicago, 8 Oct 2023) ratification | World Athletics — press release: https://worldathletics.org/news/press-releases/ratified-world-marathon-record-kelvin-kiptum |
| Sabastian Sawe 1:59:30 (London, 26 Apr 2026), first sub-2:00 record-eligible | World Athletics — news: https://worldathletics.org/competitions/world-athletics-label-road-races/news/sawe-two-hour-assefa-world-record-london-marathon ; Olympics.com: https://www.olympics.com/en/news/sabastian-sawe-2026-london-marathon-breakdown-stats-splits-world-record |

`time_seconds` was computed from the h:mm:ss values (e.g. 2:04:55 = 7495 s) for charting.

## Reporting that inspired the article

- World Athletics record ratification announcements (Kiptum 2023, Sawe 2026).
- Olympics.com and CITIUS Mag coverage of the 2026 London Marathon sub-two-hour breakthrough.

## Notes

- Every quantified claim in `article.md` (each time, the 65-second and 5:25 gaps, "seven of the
  last ten" Kenyan records, "eight of those records" in Berlin, "three times in four years")
  is derivable from `data.csv`.
- The 5:25 total improvement = 2:04:55 (7495 s) − 1:59:30 (7170 s) = 325 s.
- The 65-second drop = 2:00:35 (7235 s) − 1:59:30 (7170 s).
