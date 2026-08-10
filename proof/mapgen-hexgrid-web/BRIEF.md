# Beat — 2024's earthquakes cluster on plate boundaries: the densest hex holds 1,374 of them (web)

**Type:** hex grid (spatial bins). **Medium/genre:** map / web. **Channel:** article web, one
self-contained `hex-grid.html` — a LIVE MapTiler map (ruling R1) over one 836 × 520 baked plate that
stays as the fallback layer, plus an always-rendered table of every non-empty cell.

*Rebuilt 2026-08-10.* It used to be two SSR'd fixed-pixel layouts (900 px and 360 px) swapped by a
media query, with no live map in the delivered file at all. Both are gone: see "R1 — the live
layer" and "B5.1 — fitting the window" below.

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
- **118** of the 14,175 events fall outside the plate's own frame (poleward of it) and are dropped
  before binning: the render logs `14057/14175 points on-frame`, and `plate/geometry.json` holds
  exactly 14,057 points. The frame the plate settled on is **−64.478° to 79.847°**, which the caveat
  now states as **64°S–80°N**, read off `frameCorners` at render time.

  *Corrected 2026-08-09.* Both numbers in this bullet were wrong, and so was the sentence a reader
  saw: the caveat typed "60°S–78°N" — 4.5° short at the south, 1.8° short at the north — and said
  nothing at all about dropped events, under a source line reading "worldwide". The mechanism that
  fixes it already existed one beat over (`proof/map-quake-density/render.mjs` derives its own
  `latRange` from the same field) and had simply not travelled. Mutation-checked in a COPY of the
  plate: setting `frameCorners` to −35.2 / 66.9 makes the delivered caveat read "35°S–67°N".

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
drawn unconditionally, so the claim survives with JavaScript off, offline, and after a MapTiler key
is rotated. Hover, tap and focus reveal one cell's own count. Nothing argument-bearing sits behind a
control. There is no filter: a hex cell belongs to no group, so this beat has no orthogonal
subsetting dimension to offer, and `map-web-discipline.md`'s "most beats do not need one" is
answered by not having one.

The table is the non-visual route: a map is spatial, a screen reader is not, and 156 rows ranked
densest-first, each naming the regions its own events are catalogued under, are the answer.

## R1 — the live layer, added 2026-08-10

*"Une carte web qu'on ne peut pas parcourir est une image."* `AUDIT-W5-W6-map.md` §5.6 measured what
that was worth here: the delivered `hex-grid.html` contained no `maplibregl`, no `api.maptiler.com`
and no `NavigationControl`. The whole ruling was deletable in silence.

The page now ships the seed's three layers: `#mw-map` (a live MapLibre map, swapped in on
`map.on("load")`), `#mw-fallback` (the baked plate and its 156 hex `<path>`s, script-free and
request-free), and `.mw-overlay` — a SIBLING of both, carrying one `<button class="pt">` per cell,
which is the only thing that survives the swap and therefore the only place the keyboard path and
the tooltip's own string may live. `live-map.mjs` is a byte-identical copy of
`map-web/assets/live-map.mjs`, line-1 path comment included; everything type-specific travels
in the PLAN `render-web.mjs` writes into the page.

- **The bins are geographic polygons.** `geo-hex.ts` bins in the PLATE's pixel space, so every
  hexagon corner is unprojected with the same `pixelToLonLat` and the same recorded `frameCorners`
  the beat already uses to say where its densest cell is. Consequence, stated in the caveat a reader
  sees: a cell's ground footprint was fixed at bake time, so zooming in enlarges the cells, it does
  not re-bin the data.
- **Antimeridian.** 11 of the 156 rings run past ±180° (raw extent −200.15° to +200.12°). They are
  emitted RAW, so each ring stays continuous with the frame's own linear pixel→longitude mapping.
  Folding each corner independently would turn a small hexagon by the seam into a ring spanning the
  world the wrong way. The ANCHORS are folded, because an anchor is a point and `map.project()` of
  an unfolded −190° lands a hit target off the canvas.
- **Verified, not assumed:** driven with a real key at five viewports, every bin that is on canvas
  answers `queryRenderedFeatures` at its own anchor with its OWN key — 18/18, 7/7, 147/147, 99/99,
  102/102, zero mis-hits. A ring that had wrapped the wrong way would answer for other cells' ground.
- **The leash.** The seed's derivation (`log2(frameLonSpan ÷ studyLonSpan)`) yields **0** here,
  because the study set IS the frame: a planet, 359.8° against 359.8°. A leash of zero is the one
  outcome R1 exists to forbid, so the floor comes from the beat's own inner scale instead — one hex
  cell is `hexSize × degreesPerPixel` = **11.87°** wide, and a reader must be able to bring one cell
  up to half the frame's width, which is `log2(359.8 ÷ 23.74)` = **3.922 zoom levels**. The only
  editorial number in it is the 2.
- **The price, measured.** `hex-grid.html` goes from **436 KB to 1263 KB**: 869 KB of that is
  maplibre-gl inlined (rather than fetched from a CDN, which would trade payload for a second
  third-party host), and 129 KB is the plan — 156 hexagons twice over, once for the fill layer and
  once for the edge layer, at four decimal places (~11 m, three orders of magnitude below one drawn
  pixel at the tightest camera the leash allows). Collapsing the two layouts into one render gave
  back the 156 duplicated hex paths and the second copy of every furniture string.

## OPEN — the live camera crops the claim, and the fix is not in this beat

Measured 2026-08-10 by tracing every camera call on the delivered page, at five viewports. **The
live layer opens on a view its own fallback contradicts.**

| viewport | live canvas | fitted zoom | delivered zoom | longitude actually shown |
|---|---|---|---|---|
| 1600 × 900 | 1566 × 715 | 0.960 | **2.417** | **206.2°** of 359.8, lat 20°S–59°N |
| 1024 × 768 | 990 × 543 | 0.490 | **2.359** | **135.7°** |
| 768 × 1024 | 734 × 752 | 0.555 | 0.555 | 351.4° |
| 375 × 667 | 341 × 314 | −1.06 (floored to 0) | 0 | **239.8°** |
| 375 × 812 | 341 × 459 | −1.06 (floored to 0) | 0 | **239.8°** |

Two distinct causes, **both inside `skills/map-web/assets/live-map.mjs`**, which this beat
duplicates byte-for-byte and must not fork:

1. **`leash()` ends with `map.setMaxBounds(map.getBounds())`.** When the fitted camera leaves
   horizontal slack, `getBounds()` returns more than 360° of longitude; MapLibre's own
   `getConstrained` clamps a longitude range to `[0, worldSize]` and then scales the camera up. The
   trace shows that single call taking zoom 0.960 → 2.417 at 1600 × 900.
   **And the slack is unavoidable for a 359.8° study set.** Avoiding the trigger needs the fitted
   world to be at least as wide as the canvas. If longitude binds the fit, the world is exactly
   `FIT_PADDING_PX × 2` = 96 px narrower than the canvas, always. If latitude binds, the world is
   `(canvasH − 96) ÷ 0.6233`, and requiring that to be ≥ `canvasW` while it is also < `canvasW − 96`
   is an empty condition. So there is no canvas size, and no choice of `studyBounds`, that avoids
   it — it is a property of the leash, not of the beat.
2. **`fitToStudy()` calls `map.setMinZoom(0)` before fitting.** A planet needs zoom −1.06 in a
   341 px-wide box; the floor pins it at 0, where 512 px of world sits in a 341 px canvas and a
   third of the globe is off-screen. Before the floor is applied the same fit reaches −1.279 (in the
   trace, at the pre-swap container size), so MapLibre itself is willing.

**Tried and reverted, because it measured worse rather than better:** keeping the plate's own aspect
on the live viewport instead of the seed's `aspect-ratio: auto`. Canvas 1151 × 715, delivered zoom
**3.849**, 56° of longitude. Recorded in `render-web.mjs`'s own CSS comment so nobody re-tries it.

**Candidate fixes, for the owner of `live-map.mjs`:** skip `setMaxBounds` when the visible longitude
span is ≥ 360° (there is no horizontal leash to set — the reader already has the whole planet), and
let `fitToStudy` drop the minimum to MapLibre's own floor rather than 0. Both are one line, and both
are outside this beat.

`live: true` is shipped anyway rather than reverted: the committed artifact carries the R1b
placeholder, so what anyone opens from this repository is the fallback, which is correct and
complete at every viewport (verified with a real pointer: hovering a bin in the no-key page returns
that bin's own reading). Turning the live layer off would re-open exactly the hole the audit found.

## B5.1 — fitting the window

Measured before: **5127 px of page in a 900 px window**, the widest visual using **56%** of the
width — the worst offender in the tree. The cause was the two-rung layout: a 900 px-wide SVG poster
with the title, source, legend and caveat drawn as `<text>` inside it, capped by `max-width: 900px`.

After: the beat's own column is **exactly one window** at every tested viewport — 868 px at
1600 × 900, 736 at 1024 × 768, 992 at 768 × 1024, 635 at 375 × 667, 780 at 375 × 812 (each the
viewport height less the page's own 32 px of padding), with nothing scrolling inside the visual. The
map now uses 72% of the width at 1600 (its own aspect is what stops it at 100%; the height binds),
86% at 1024, 96% at 768, 91% at 375.

**The page is still ~5186 px at 1600 × 900, and 4262 px of that is the table.** One row per
non-empty cell, 156 rows, and it is deliberately not touched: collapsing it behind a disclosure
widget is B5.2, the owner's own call, and `map-web-discipline.md`'s rule is "rendered plainly and
visibly, never behind a toggle". Split per viewport: 868 + 4262 (1600 × 900) · 736 + 4277
(1024 × 768) · 992 + 6789 (768 × 1024) · 635 + 12019 (375 × 667) · 780 + 12019 (375 × 812).

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
