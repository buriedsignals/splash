# Beat — 2024's magnitude-4+ earthquakes are not spread evenly: one hex cell holds 1,724 of them

**Type:** hex grid (spatial bins). **Medium/genre:** map / static. **Channel:** article web,
900 × 728 (frame height derived from the plate), over an 836 × 480 baked plate (`bake.mjs --width 836 --height 480`, bounds
`[-20, -60] → [340, 78]` — Pacific-centred, seam in the mid-Atlantic).

## Claim

Magnitude-4-or-greater earthquakes in 2024 cluster on the Pacific plate boundaries rather than
spreading across the globe: binned into equal hexagons, the densest single cell holds **1,724**
events against a median non-empty cell of **12** — roughly 133 times the middle of the
distribution — and its own events are catalogued by USGS as **Fiji** (49%) and **Tonga** (36%).

## Data

- Source: USGS Earthquake Catalog (earthquake.usgs.gov), magnitude 4.0+, worldwide, 2024.
- `quakes-density.csv`: **14,175 rows**, the raw catalogue export, 22 columns. Every row is
  `type = earthquake`; magnitudes run **4.0 → 7.5**; every `time` value is in 2024; latitudes run
  −65.30 → 86.61.
- The beat draws COUNT per cell only. Magnitude and depth are present in the file and deliberately
  unused — see the anti-patterns.

## Exact values — recomputed 2026-08-09 after the plate was corrected (see below)

Every figure below is printed by `render.mjs` on each run, from the frozen CSV and the plate's own
geometry. Nothing here is typed into the furniture: the caveat's latitude range comes from the
corners MapLibre settled on, and the alt's place names come from the subject cell's own member
events.

- **150 non-empty cells**, hex size 26.5 px, out of a far larger possible grid.
- Ranked counts: **1,724 · 974 · 829 · 781 · 663 · 636 …**; median non-empty cell **12**, so the
  top cell is **133×** the middle of the distribution.
- Densest cell: **1,724 events**, catalogued as **Fiji 49% / Tonga 36%**. Then 974
  (Philippines 69% / Indonesia 30%), 829 (Chile 53% / Argentina 23%), 781 (Indonesia 44% /
  Papua New Guinea 35%), 663 (Japan 85%).
- Class breaks printed in the legend: 1–13, 14–51, 52–284, 285–663, 664+, with
  76 / 37 / 23 / 10 / 4 cells in each — a distribution whose bottom class holds half the cells.
- The plate holds **61°S–78°N** (measured corners: −60.54° to 78.22°), and **104 of the 14,175**
  catalogued events fall outside it, poleward. Both numbers are in the caveat, derived.

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
  (`proof/mapgen-hexgrid-web`) bins the SAME 14,175 rows on a 836 × 520 Greenwich-centred plate and
  gets 1,374 in the Fiji–Tonga cell, with an Indonesia–Philippines cell second at 1,371, three
  events behind. This beat's own history is the sharpest demonstration: on the old 836 × 300 plate
  the winner was Indonesia–Philippines at 1,906; on the corrected 836 × 480 plate it is Fiji–Tonga
  at 1,724. Change the cell size, the frame or the seam and the "densest cell" changes hands. Never
  write a sentence that would be false at a different bin size; "the Ring of Fire, not an even
  spread" is robust, "the densest place on Earth" would not be. This is also why the alt names the
  cell from its own events' catalogue entries rather than from a typed place.
- Do not draw empty cells. 150 non-empty cells are drawn out of a far larger possible grid, because
  an empty hexagon over the mid-Atlantic asserts a measurement that was never taken.

## Defect found while deriving this brief — CORRECTED 2026-08-09

**The plate showed the world twice.** The bake asked MapLibre to fit `[-179.9, -60] → [179.9, 78]`
into an 836 × 300 box. That box is height-limited: fitting 138° of latitude into 300 px forces a
world only **527.7 px wide**, centred, so the map occupied x ≈ 154–682 of the 836 px frame — 63% of
it. MapLibre's `renderWorldCopies` default filled the remaining 37% with repeats of the same
continents, and those copies carried **no hexagons**. A reader saw Australia and the Americas drawn
twice, once under the grid and once bare, and could reasonably read the bare copies as regions with
no earthquakes. Confirmed in the plate's own geometry: the baked points spanned exactly x = 154–682.

**What the fix had to survive.** Switching `renderWorldCopies` off does NOT fix it — measured, with
copies off MapLibre instead clamps the camera so the world fills the width, which at 836 × 300 zooms
to 0.707 and shows only 35°S–67°N, silently dropping **1,057** of the 14,175 events off-frame. That
is a different lie about where earthquakes are. The invariant is that **the world must fill the
frame's width** — then a repeat, if drawn at all, lies entirely outside the picture — **and** the
frame must still reach the bounds that were asked for. Both are now asserted in `bake.mjs`, and the
assertion was mutation-checked: re-baking at 836 × 300 fails loudly, naming the height that fixes it.

The plate is now **836 × 480** (475.3 px is the minimum for this latitude range at this width), and
the still's frame height is derived from the plate rather than fixed at 560, so the legend cannot be
pushed off the bottom.

**And the camera moved to −20…340°.** Once the frame was honest, looking at it showed a second
problem the old padding had hidden: on a Greenwich-centred world the antimeridian runs straight
through the densest cluster. The Fiji–Tonga cell landed hard against the west edge with half its
hexagon clipped away and its own neighbours binned into a separate cell 836 px east — **1,451**
events in the visible half against **1,724** once the cluster is kept whole. Cutting at 20°W puts
the seam in the mid-Atlantic instead, which leaves both the Ring of Fire and Africa uncut and costs
this catalogue almost nothing. `map.project` does not wrap to the camera, so every longitude is
normalised into [−20, 340) before projection.

**Two typed strings went with it.** The caveat's "the map holds 60°S–78°N" and the alt's "a dark
cell around Indonesia and the Philippines" were both true only of the 836 × 300 binning. The
latitude range is now read from the plate's measured corners, and the place names from the subject
cell's own member events (`cellMembers` + `dominantRegions` in `geo-hex.ts`), which is why the alt
now says Fiji and Tonga.

## Source line

`Source: USGS Earthquake Catalog (earthquake.usgs.gov), magnitude 4.0+, worldwide, 2024 · basemap © MapTiler, © OpenStreetMap`
