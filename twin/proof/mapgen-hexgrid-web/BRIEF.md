# Beat — 2024's earthquakes cluster on plate boundaries: the densest hex holds 1,374 of them (web)

**Type:** hex grid (spatial bins). **Medium/genre:** map / web. **Channel:** article web, one
self-contained `hex-grid.html`, two SSR'd layouts over one 836 × 520 baked plate, plus an
always-rendered table of every non-empty cell.

## Claim

Magnitude-4-or-greater earthquakes in 2024 follow tectonic plate boundaries rather than spreading
across the globe. Binned into equal hexagons, the densest cell holds **1,374** events — about 92×
the median non-empty cell — and it sits in the South Pacific, in the Fiji–Tonga–Kermadec seismic
zone.

## Data

- Source: USGS Earthquake Catalog (earthquake.usgs.gov), magnitude 4.0+, worldwide, 2024.
- `quakes-density.csv`: **14,175 rows**, the raw catalogue export. Every row is `type = earthquake`;
  magnitudes 4.0 → 7.5; every timestamp in 2024. Byte-identical to
  `proof/map-quake-density/quakes-density.csv` (copied, never imported — a beat does not reach into
  another beat's folder).
- 44 of the 14,175 events fall outside the plate's own frame (poleward of it) and are dropped before
  binning, which the frame note states as 60°S–78°N.

## Exact values — the render's own derivation, cross-checked 2026-08-09

Unlike its static sibling, this beat DERIVES its alt text and caveat at render time — cell count,
subject count, ratio to the median and the subject's own latitude/longitude all come from the
computed grid, not from typed strings. Read back out of the committed `hex-grid.html`:

- **156 non-empty cells**; the accessible table carries 156 rows, counted in the file.
- Ranked counts: **1,374 · 1,371 · 774 · 709 · 696 · 590 · 518 · 490 · 456 · 441 …**
- Subject: **1,374 events, 91.6× the median non-empty cell** (median 15), its events averaging
  **19.8°S, 176.7°W** and catalogued as **Fiji 49% / Tonga 45%** — all three derived at render time.
- Independent recomputation from the CSV, re-projecting into an 836 × 520 Mercator frame and
  re-binning at the same target cell count, agrees on the shape and the order: 155 non-empty cells,
  top five **1,415 · 1,367 · 775 · 710 · 696**, median 16, top/median 88.4. Rank 1's member points
  average **176.8°W, 19.9°S** and are labelled "Fiji region" / "south of the Fiji Islands"; rank 2's
  average **127.3°E, 1.8°S** (Timor–Molucca).
- **The margin is three events.** Rank 1 (1,374) and rank 2 (1,371) are 0.2% apart. Anything the
  beat says about "the densest cell" is one re-bin away from naming the other one — which is exactly
  what happens on the static sibling's differently-shaped plate, where Indonesia–Philippines wins.

## Subject and accent

One sequential ramp from ground to ink, luminance monotonic, checked at build time rather than
eyeballed; one accent `#C1440E` on exactly one shape, the outline of the densest cell. The accent is
outside the ramp so it cannot read as a class. Class boundaries are percentile-based and named in
the table ("Class 5 — 97th percentile and above, 697+ events"), so a reader is told what a class IS,
not just what colour it is.

## Interaction

The full argument is in the SSR'd frame: title, legend, caveat, source and all 156 shaded cells are
drawn unconditionally, so the claim survives with JavaScript off. Hover, tap and focus reveal one
cell's own count. Nothing argument-bearing sits behind a control.

The table is the non-visual route: a map is spatial, a screen reader is not, and 156 rows ranked
densest-first, each naming the regions its own events are catalogued under, are the answer.

## Anti-patterns for this case

- **Count, not energy.** A cell full of M4.1 events outranks one holding a single M7.5; magnitude is
  logarithmic, so that single event releases on the order of 10^5 times more energy. The legend
  caption carries this in its own words before a reader can read dark as violent.
- Never present the subject cell as "the most seismic place on Earth". At three events' margin over
  rank 2, and with the winner changing when the plate changes shape, the honest sentence is about
  the PATTERN (boundaries, not an even spread), which every binning agrees on.
- Do not draw empty cells — an empty hexagon asserts a measurement.
- Do not let a hand-typed place name ride along with a derived coordinate. Every part of this
  beat's location sentence — the coordinate, the region names, and the table's own WHERE column —
  now comes out of the events themselves. See the corrections below.

## Defects found while deriving this brief — BOTH CORRECTED 2026-08-09

1. **A typed place name rode a derived coordinate.** The alt said the densest cell sat "in the South
   Pacific near 21°S, 170°W (the Tonga-Kermadec trench)". The coordinate was computed; the
   parenthetical was typed, and it named a trench ~700 km east of where the cell's own events are.

   Fixed at the source of the problem: `bake-plate.mjs` now carries each projected point's own row
   index in the frozen CSV, so a cell can be asked WHICH events it holds, and `dominantRegions()`
   reads their USGS place strings. Labels that begin with the same word ("Fiji", "Fiji region",
   "south of the Fiji Islands") are one region under three spellings and are merged under the
   shortest. The densest cell comes back **Fiji 49% / Tonga 45%**, and the alt now names those.

   The COORDINATE moved too, for the same reason: it now reports the mean position of the cell's own
   **1,374 events — 19.8°S, 176.7°W** (longitude averaged circularly, because this cluster straddles
   the antimeridian and a plain mean of +179 and −179 is 0°, in Africa) — rather than the cell's
   geometric centre at 21.0°S, 169.6°W. This cell sits against the frame's west edge, where half the
   hexagon covers ocean the frame has already cut away, so the centre of the cell is not where its
   data is. The derived mean agrees with this brief's own independent recomputation (19.9°S,
   176.8°W) to a tenth of a degree.

2. **The accessible table had no location column.** Rank / Event count / Density class — three facts
   that are real and checkable, and not one of them spatial, on a map whose entire subject is where.
   The table now carries a fourth column, **"Where its events are catalogued"**, from the same
   derivation: rank 1 Fiji, Tonga · rank 2 Indonesia, Philippines · rank 3 Chile, Argentina · rank 4
   Taiwan, Japan, and so on for all 156 rows. It is not a geocode of the cell's centre — that is
   still rejected, and both the column header and the table caption say the column names where the
   events are FILED, not where the cell is. `HexGridWeb.tsx`'s own doc-comment, which argued the
   column could not honestly exist, has been rewritten to record why it can.

   Verified by loading the rendered `hex-grid.html` in a browser and reading it: 156 rows, the
   subject row highlighted, every name plausible against the map beside it. One label is unhelpful
   rather than wrong — USGS files Californian events as "CA", so one cell reads "Canada, CA".

## Source line

`Source: USGS Earthquake Catalog (earthquake.usgs.gov), magnitude 4.0+, worldwide, 2024 · basemap © MapTiler, © OpenStreetMap`
