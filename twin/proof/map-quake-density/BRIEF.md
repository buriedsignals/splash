# Beat — 2024's magnitude-4+ earthquakes are not spread evenly: one hex cell holds 1,906 of them

**Type:** hex grid (spatial bins). **Medium/genre:** map / static. **Channel:** article web,
900 × 560, over an 836 × 300 baked plate (`bake.mjs --width 836 --height 300`, bounds
`[-179.9, -60] → [179.9, 78]`).

## Claim

Magnitude-4-or-greater earthquakes in 2024 cluster on the Pacific plate boundaries rather than
spreading across the globe: binned into equal hexagons, the densest single cell holds **1,906**
events against a median non-empty cell of about 20 — roughly ninety times the middle of the
distribution — and that cell sits over the Molucca Sea, between Indonesia and the Philippines.

## Data

- Source: USGS Earthquake Catalog (earthquake.usgs.gov), magnitude 4.0+, worldwide, 2024.
- `quakes-density.csv`: **14,175 rows**, the raw catalogue export, 22 columns. Every row is
  `type = earthquake`; magnitudes run **4.0 → 7.5**; every `time` value is in 2024; latitudes run
  −65.30 → 86.61.
- The beat draws COUNT per cell only. Magnitude and depth are present in the file and deliberately
  unused — see the anti-patterns.

## Exact values — computed 2026-08-09, recomputing the binning from the CSV

The subject cell was identified by re-projecting the frozen CSV into the plate's own Mercator frame
and re-binning it, then matching the result against the committed `render/static.svg`:

- The rendered SVG holds **107** hexagons; the accent-outlined one is centred at (616.8, 188.5) in
  the map group's coordinates. The independent recomputation puts its densest cell at
  (616.3, 188.4) — a **0.5 px** match — and the second-densest at (163.1, 219.8) against the SVG's
  second dark cell at (163.3, 219.9).
- Densest cell: **1,906 events**, member points averaging **130.5°E, 0.0°** — the Molucca Sea, top
  place string "86 km ENE of Kinablangan, Philippines". The alt's "around Indonesia and the
  Philippines" is correct.
- Second: **1,534 events** at 176.9°W, 20.6°S (Fiji region). Third: 862 (Vanuatu), fourth: 832
  (south-west Japan), fifth: 831 (northern Chile).
- Median non-empty cell ≈ 20 events; the top cell is roughly **90×** the median. Class breaks
  printed in the legend: 1–23, 24–91, 92–377, 378–886, 887+, with 53 / 27 / 17 / 7 / 3 cells in
  each — a distribution whose bottom class holds half the cells.

## Subject and accent

One sequential grey ramp derived from ground and ink, luminance moving in one direction only, and
**one** accent — `#C1440E`, used on exactly one shape: the outline of the densest cell. The accent
is not in the ramp, so it can never be mistaken for a class. The subject is found by reducing the
cells at render time (the script throws if the outlined cell is not actually the maximum), never
named by hand.

## Hierarchy of the proof

1. The dark band tracing the Pacific rim — the shape the title claims.
2. The accent-outlined cell, the single densest, the number the claim rests on.
3. The legend, which says "count, not energy or magnitude" in its own caption, before a reader can
   read darkness as violence.
4. The caveat, which spends its words on what the encoding cannot say.

## Anti-patterns for this case

- **Count is not energy.** A cell packed with hundreds of M4.2 events outranks one holding a single
  M7.5. The frozen data makes this concrete: magnitudes span 4.0–7.5, and a single M7.5 releases
  roughly 10^1.5×3.5 ≈ 180,000 times the energy of an M4.0, so the darkest cell is emphatically not
  the most violent place on the map. The legend caption and the caveat both say so.
- Do not read cell darkness as a rate. There is no population or area denominator here; every cell
  is the same size on the projection, but a Mercator cell near 60°N covers far less ground than one
  at the equator — the frame is held to 60°S–78°N for exactly that reason.
- **The subject is an artefact of the grid, and must be treated as one.** The web sibling
  (`proof/mapgen-hexgrid-web`) bins the SAME 14,175 rows on a 836 × 520 plate and gets a different
  winner — Fiji/Tonga at 1,374, with the Indonesia–Philippines cell second at 1,371, three events
  behind. Change the cell size or the frame and the "densest cell" changes hands. Never write a
  sentence that would be false at a different bin size; "the Ring of Fire, not an even spread" is
  robust, "the densest place on Earth" would not be.
- Do not draw empty cells. 107 non-empty cells are drawn out of a far larger possible grid, because
  an empty hexagon over the mid-Atlantic asserts a measurement that was never taken.

## Defect found while deriving this brief (not fixed here)

**The plate shows the world twice.** The bake asks MapLibre to fit `[-179.9, -60] → [179.9, 78]`
into an 836 × 300 box. That box is height-limited: fitting 138° of latitude into 300 px forces a
world only **528 px wide**, centred, so the actual map occupies x ≈ 154–682 of the 836 px frame —
63% of it. MapLibre's `renderWorldCopies` default fills the remaining 37% with repeats of the same
continents, and those copies carry **no hexagons**. The arithmetic is confirmed by the two cell
matches above: pixel 163.1 is 176.9°W and pixel 616.3 is 130.5°E, giving 0.678°/px, i.e. a world
530.8 px wide. So a reader sees Australia and the Americas drawn twice, once under the grid and once
bare, and may reasonably read the bare copies as regions with no earthquakes. The web sibling does
not have this problem: at 836 × 520 the fit is width-limited, the world fills the frame exactly, and
no copies appear.

## Source line

`Source: USGS Earthquake Catalog (earthquake.usgs.gov), magnitude 4.0+, worldwide, 2024 · basemap © MapTiler, © OpenStreetMap`
