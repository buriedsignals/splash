# Beat — the 2011 Tohoku earthquake, the largest of 17 great western-Pacific quakes in the file

**Type:** proportional symbol. **Medium/format:** map / static **and** map / video (one component
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

- **Years present: 2005 → 2017**, derived by `yearWindow()` and used verbatim in the title, the
  source line and the alt. Every row falls in that window; there is no row after 2017-01-22.
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

## Defects found while deriving this brief — BOTH CORRECTED 2026-08-09

1. **The credited window was seven years wider than the data.** The source line and the alt both
   said "2005–2024" and the title said "in two decades"; the frozen file's last event is
   **2017-01-22**, and there are no rows for 2018–2024. Corrected by DERIVING the window:
   `yearWindow()` in `geo-symbol.ts` reads the years out of the rows' own ISO timestamps, and
   `render.mjs` builds the title, the source line and the alt from it. The rendered title now says
   "between 2005 and 2017", the source line "2005–2017". Re-rendered: `render/static.png` and
   `render/quake-symbol.mp4` (240 frames), both opened and read.

2. **"The largest circle on the map by a wide margin" was contradicted by the beat's own geometry.**
   With radius ∝ √mag rooted at zero, the subject's radius is √(9.1/8.6) = **1.028659×** the M8.6
   circle's — measured through the beat's own `radiusScale`, **+2.87%**, which at the still's 30 px
   maximum is **0.84 px**. Confirmed in the committed `render/static.svg`: r = 30.00 against 29.16.
   (The 29.83 circle in the same file is the legend's M9.0 key, not an event.)

   **The claim was rewritten, not the encoding — and here is why.** Making the sentence true would
   mean either rooting the radius scale somewhere other than zero, which breaks the equal-AREA
   proportion a reader compares, or sizing circles by ENERGY (10^1.5Δ, a 5.6× ratio here), which
   would contradict the legend's own caption, the caveat, and USGS's own convention for event maps —
   a bigger lie than the one being fixed. So the type's discipline stands and the words move: the
   alt now says the subject "is the largest circle, but only just … under 3% wider than the
   magnitude-8.6 circle off Sumatra — a difference of 0.8 pixels at this size. The accent outline,
   not the size, is what identifies it." The percentage is derived through the same scale the
   circles are drawn with, so it cannot drift from what it describes. Looking at the rendered PNG
   confirms the point: the M9.1 circle and the M8.6 circle off Sumatra are indistinguishable in
   size, and only the accent outline separates them.

3. **The size legend did not bracket the data it keyed.** Its three references came from
   `niceReferenceValues`, half-magnitude steps down from the max rounded to the nearest half — for a
   maximum of 9.1 that is 9.0, so the legend's LARGEST key (r = 29.83) was smaller than the largest
   circle on the map (r = 30.00, M9.1), and its smallest key named M8.0 while four of the seventeen
   events drawn are below it, down to M7.8. A size legend is a ruler; it has to start and stop where
   the marks do. Replaced by `spanReferenceValues`, which keys the legend to the smallest mark, the
   largest, and the value halfway between, at the data's own one-decimal precision: **M7.8 / M8.5 /
   M9.1**, radii **27.775 / 28.994 / 30.000**, read out of the re-rendered `render/static.svg`. The
   top key is now the same radius as the M9.1 circle, exactly.

   **What this does not fix, deliberately.** The three legend circles are still within 8.0% of each
   other (was 6.1%), because that is what the encoding says: radius ∝ √magnitude rooted at zero over
   a file spanning 7.8 to 9.1 puts every circle it draws between 27.8 and 30 px. Making those
   circles visibly different would mean sizing by ENERGY, which point 2 above rejected in writing
   and for the same reasons. The caveat in the frame already says the size difference is not the
   event difference — and it says it about "a circle 1.3 units bigger", which is now precisely the
   legend's own span.

## Source line

`Source: USGS Earthquake Catalog (earthquake.usgs.gov), M7.8+, western Pacific, 2005–2017 · basemap © MapTiler, © OpenStreetMap`
(Derived: the magnitude floor, the window and the event count are all read out of the frozen file.)
