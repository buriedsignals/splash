# Beat — the 2011 Tohoku earthquake, the largest of 17 great western-Pacific quakes in the file

**Type:** proportional symbol. **Medium/genre:** map / static **and** map / video (one component
family, two outputs: `render/static.png` at 900 × 560 over a 496 px plate, and
`render/quake-symbol.mp4` at 1080 × 1080, 30 fps, 240 frames = 8.0 s over a 620 px plate).

## Claim

Of the great earthquakes in this file, the 2011 Tohoku event is the largest: **magnitude 9.1**,
against a next-largest of **8.6** (2005 Sumatra–Nias). Seventeen events of magnitude 7.8 or greater
are plotted, sized by magnitude.

## Data

- Source: USGS Earthquake Catalog (earthquake.usgs.gov), M7.8+, western Pacific.
- `quakes-symbol.csv`: **17 rows**, columns `time, mag, longitude, latitude, place`.
- Extent: longitude 97.05 → 166.38, latitude −12.52 → 46.59 — the western Pacific rim, from Sumatra
  to the Kuril Islands.

## Exact values — computed 2026-08-09 from `quakes-symbol.csv`

| Mag | Date | Where |
| --- | --- | --- |
| 9.1 | 2011-03-11 | Great Tohoku earthquake, Japan |
| 8.6 | 2005-03-28 | 78 km WSW of Singkil, Indonesia |
| 8.4 | 2007-09-12 | 122 km SW of Bengkulu, Indonesia |
| 8.3 | 2006-11-15 | Kuril Islands |
| 8.1 | 2007-04-01 | Solomon Islands |
| 8.1 | 2007-01-13 | Kuril Islands |
| 8.0 | 2013-02-06 | Santa Cruz Islands |

…then six at 7.9 and four at 7.8. Minimum in the file **7.8**, maximum **9.1** — the "M7.8+" in the
source line is exact.

- **Years present: 2005 → 2017.** Every row falls in that window; there is no row after
  2017-01-22.
- Energy arithmetic behind the caveat: one whole magnitude step is 10^1.5 = **31.6×** the energy, so
  "roughly 32×" is right; Tohoku (9.1) against Sumatra (8.6) is 10^(1.5 × 0.5) = **5.6×** the energy,
  and against the smallest event drawn (7.8) it is **89×**.

## Subject and accent

One accent, `#C1440E`, on one mark: the outline of the Tohoku circle. Everything else is a muted
fill. Radius is `scaleSqrt` rooted at zero over `[0, maxMag]` — an equal-AREA encoding, never a
linear radius. Draw order is descending magnitude, so a large circle can never hide a small one
behind it.

## Reveal order (video)

30 fps, 240 frames. `establish` 0–26 (title, source, empty legend) → `reference` 32–52 (the
magnitude legend, the scale the circles will be read against, laid down before any circle) →
`reveal` 70–156 (the 17 circles arriving in the data's own order, largest first) → `subject`
158–178 (Tohoku taking the accent) → `conclusion` 180–202 (the assertion) → `hold` 202–240 (1.27 s
of stillness, well over the half-second floor). Contract-checked: every event starts after the
previous one ends, and `hold` ends exactly at frame 240.

## Anti-patterns for this case

- Never linear-scale a symbol's radius. Area is what a reader compares, so radius must go as the
  square root; the legend caption says which one is in use rather than leaving a reader to guess.
- Never let a reader read circle area as energy. Magnitude is logarithmic: the drawn circles differ
  by a few percent while the events differ by orders of magnitude. The caveat's job is to say so,
  and it is drawn in the frame, not gated behind interaction.
- Do not sort the draw order by anything but size — small circles must be drawn last or they vanish.

## Defects found while deriving this brief (not fixed here)

1. **The credited window is seven years wider than the data.** The source line and the alt both say
   "2005–2024"; the frozen file's last event is **2017-01-22**, and there are no rows for 2018–2024.
   The title's "in two decades" rests on the same missing seven years. Everything the file contains
   is consistent with the ranking claim, but the claim as written cannot be checked against the
   committed data — which is the exact failure mode "freeze the data beside the beat" exists to
   prevent.
2. **"The largest circle on the map by a wide margin" is contradicted by the beat's own geometry.**
   With radius ∝ √mag rooted at zero, Tohoku's radius is √(9.1/8.6) = **1.029×** the M8.6 circle's.
   Measured directly in the committed `render/static.svg`: the data circles are **r = 30.00** and
   **r = 29.16** — a difference of **0.84 px**, under 3%. (The 29.83 circle in the same file is the
   legend's M9.0 key, not an event.) The accent outline, not the size, is what makes Tohoku findable;
   the alt tells a non-sighted reader about a visual difference that is not there.

## Source line

`Source: USGS Earthquake Catalog (earthquake.usgs.gov), M7.8+, western Pacific, 2005–2024 · basemap © MapTiler, © OpenStreetMap`
(The window in this line does not match the frozen data — see the defects above.)
