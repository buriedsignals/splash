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
- Subject: **1,374 events, 91.6× the median non-empty cell** (median 15).
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
densest-first are the answer.

## Anti-patterns for this case

- **Count, not energy.** A cell full of M4.1 events outranks one holding a single M7.5; magnitude is
  logarithmic, so that single event releases on the order of 10^5 times more energy. The legend
  caption carries this in its own words before a reader can read dark as violent.
- Never present the subject cell as "the most seismic place on Earth". At three events' margin over
  rank 2, and with the winner changing when the plate changes shape, the honest sentence is about
  the PATTERN (boundaries, not an even spread), which every binning agrees on.
- Do not draw empty cells — an empty hexagon asserts a measurement.
- Do not let a hand-typed place name ride along with a derived coordinate. This beat derives the
  subject's latitude and longitude; the place name beside them is the one part still typed — see
  below.

## Defect found while deriving this brief (not fixed here)

Two, both small, both of the class this project keeps finding:

1. **The derived coordinate and the typed place name disagree.** The alt says the densest cell sits
   "in the South Pacific near 21°S, 170°W (the Tonga-Kermadec trench)". The coordinate is computed
   from the plate's own measured corners; the parenthetical is typed. Recomputed from the CSV, the
   member events of that cell average **19.9°S, 176.8°W**, and their own USGS place strings are
   overwhelmingly "Fiji region" and "south of the Fiji Islands" — roughly 700 km west of the named
   longitude. "Fiji–Tonga" is what the data says; "the Tonga-Kermadec trench" is a gloss nothing in
   the file supports.
2. **The accessible table has no location column.** Its three columns are Rank, Event count and
   Density class. A reader using the table therefore learns that some unidentified cell holds 1,374
   events and cannot find out WHERE — on a map, whose entire subject is where. The table exists
   because a screen reader has no spatial access; without a place column it does not deliver the one
   thing it was built to deliver. The sibling `mapgen-choropleth-web` table does carry names.

## Source line

`Source: USGS Earthquake Catalog (earthquake.usgs.gov), magnitude 4.0+, worldwide, 2024 · basemap © MapTiler, © OpenStreetMap`
