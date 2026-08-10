---
size: landscape
type: hex-grid
---

# Beat — 2024's magnitude-4+ earthquakes are not spread evenly: one hex cell holds 1,724 of them

**Type:** hex grid (spatial bins). **Medium/genre:** map / static. **Size:** landscape
(1920 × 1080), over an 836 × 480 baked plate (`bake.mjs --width 836 --height 480`, bounds
`[-20, -60] → [340, 78]` — Pacific-centred, seam in the mid-Atlantic).

The size is in the front matter above as well as in that sentence, and the front matter is the one
that counts: `render.mjs` reads it with `readPinnedSize`. It used to say "article web, 900 × 728
(frame height derived from the plate)", checked by nothing — and that derivation was a good answer
to the wrong question, because it made the FRAME follow the plate, so a journalist pinning a size at
gate 2c reached nothing at all.

## What each size does with this geography

The plate is WIDE — 836 × 480, 1.742:1, over 360.0° of longitude — and the map is drawn at the
plate's own aspect at every size, never stretched, never cropped. This is one of the two beats in
the tree where Web Mercator's ceiling is anywhere near: a box of aspect 1.742 can hold at most
360 × 1.742 = **627.0°**, and this camera shows **360.0°**, so it clears with 267° to spare —
asserted, not clamped, inside `mapStageBox`.

| size | delivered | arrangement | the map | leftover |
| --- | --- | --- | --- | --- |
| landscape 1920 × 1080 | **yes**, measured 1920 × 1080 from the PNG's own IHDR | column left, plate right, key under the plate, credit across the foot | 1213 × 697 | 467 px of column, 0 px letterboxed |
| square 1080 × 1080 | refused | — | — | — |
| portrait 1080 × 1920 | refused | — | — | — |

**Where the leftover lands is the one thing this beat had to work out for itself**, because its
plate is wide inside frames that are wide too. Stacking the furniture above and below the map — the
arrangement it shipped at 900 px — spends the frame's HEIGHT, and at this aspect every pixel of
height costs 1.74 pixels of the map's width. Measured at 1920 × 1080, from the same words at the
same legibility floor:

- **stacked**: the furniture takes **364 px** of the 855 px above the credit (title 2 lines,
  caveat 3, key 1) and the map is left **855 × 491**;
- **beside**: the map is **1213 × 697** — 1.4× the width, 2.0× the area.

So the furniture stands in a column, and its width is derived twice over rather than chosen. It is
first the **narrowest column this beat's own words fit in**, scanned upward from the 258 px its
longest unbreakable word needs; then, because below a certain width the plate stops being bound by
width and starts being bound by height — at which point a narrower column buys no more map and only
opens a gap nothing explains — the column **takes back whatever the geography cannot use**, which
is `1750 − 70 − 1213 = 467 px`. Re-wrapped at 467 px the column is title 5 lines and caveat 9,
**597 px of the 855 px** available, and the 258 px of slack lands in one place, between the headline
and the fine print, where it reads as air rather than as a missing block. Nothing is letterboxed:
the plate takes the full width it is handed and the key sits directly under it.

**The credit is a strip across the foot of the frame, at the full 1750 px, and not the last block of
the column.** In the column it wrapped to five lines whose first landed at y = 835 of 1080 — the top
of the bottom quarter, which is not the bottom eighth
`skills/splash/test/credit-anchors-to-the-frame-bottom.test.ts` measures on the committed SVG. At
the full content width it is one line, on the margin, at y = 995 (0.921 down the frame), under
everything it credits.

At landscape the type scale is the table's own **2.2**: this beat used to carry an 11 px class label
and an 11.5 px note, and `sizes.mjs` derives every row's `typeScale` from a smallest base token of
12, so a beat under 12 misses every floor by construction and can only be rescued by inventing a
bigger multiplier for its whole hierarchy. Both tokens are now 12, which costs a hierarchy that had
already collapsed — 12 / 11.5 / 11 all round to 26 at this floor. Drawn tokens: 44 / 29 / 26 px, all
clear of the 26 px floor `assertTypeFloor` measures off the rendered markup.

Both refusals are the type floor's, not the geography's, and both were reproduced by
`render.mjs --still --size <name>`:

- **square** — at a 36 px floor the narrowest column (352 px, the width of "earthquakes" at 60 px
  bold) takes **1488 px of the 759 px** left above a credit that is itself 3 lines: title 9 lines,
  caveat 17. It would leave the plate 488 px against a five-class key that measures **1073 px**, and
  a map narrower than its own key cannot name its classes beside it. Stacked instead, the furniture
  takes **837 px of that 759 px**, leaving **−78 px** for the map.
- **portrait** — the same numbers inside Meta's 979 px safe band rather than the whole frame, so
  only 658 px are left above the credit and stacking leaves **−179 px**.

Nothing in the removal ladder makes type smaller, and the caveat is the sentence that keeps this
beat's own claim honest — see the anti-patterns below, and the area-encoding disclosure, which the
frame is not allowed to buy room from.

## What the bigger frame showed, and what it cost

**The plate is no longer drawn 1:1, and the old rule that said it must be was too strong.** The
component's own comment held that the plate's box had to be `geometry.frame` verbatim "so the hex
cells never need a scale transform that would also squash the hexagons into ellipses". The hazard is
real; what causes it is a NON-UNIFORM scale. `mapStageBox` keeps the plate's aspect at every size —
that is its whole contract — so **one** number (1.451 here) scales the plate, the cell centres and
the cell radius together and a hexagon stays a hexagon. The cell seam scales with the PLATE and not
with the type, because it is a join between two pieces of the picture rather than a piece of
furniture; the accent ring scales with the type, because it is emphasis and has to read as a
deliberate mark wherever the plate lands.

**What the bigger plate broke, and how it was fixed.** The ringed cell's caption used to be placed
by an edge test — "right of the hexagon unless the plate has no room there, then left" — which is
the only thing that can go wrong on an 836 px plate. On a 1213 px one it laid its halo straight
across a cell of the **top class, 829 events**, carving it in two with a white band while every
counter stayed green: nothing was clipped, nothing ran off the plate. Opening the render is what
found it.

The placement is now derived, and the budget is the beat's own legend rather than a typed
threshold: of the boxes that sit whole on the plate, take the one whose **worst crossed class is
lowest**, then the declared side order, then the fewest lines. The candidate forms are the note's
own structure — `render.mjs` emits "<count> events · <where>", two facts joined by a middot, so the
caption breaks at its own separator or not at all. Measured on this plate: one line right crosses
class 5 (the 829), one line left class 4 (549), one line above class 5 (974), **two lines right
class 3 (59)**, which is what ships. A width-driven re-wrap was tried first and measured *better* on
cells crossed — four lines cross 2 cells, worst class 2 — and is not used, because
"1,724 / events · / Fiji and / Tonga" shreds a sentence into a ragged column and leaves a separator
dangling at a line end. Nothing here shrinks type: the caption is drawn at 29 px, above the 26 px
floor, in both forms.

**What it cost anyway: the map is smaller at the size it is read at.** A 1920 px frame is read in a
900 px article column, so the delivered plate measures **569 CSS px** against the 836 CSS px the
900 px frame gave it. That is the honest price of a 26 px floor on a wide plate, and it is stated
here rather than bought back by narrowing the words.

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

The plate is now **836 × 480** (475.3 px is the minimum for this latitude range at this width). At
the time, the still's frame HEIGHT was derived from the plate rather than fixed at 560, so the
legend could not be pushed off the bottom. **Superseded 2026-08-10 by the export-size migration**:
the frame no longer follows the plate — the frame is the size gate 2c pinned and the plate is fitted
into it by `mapStageBox`, which is why `stillFrameHeight` is gone. The legend is still protected,
by the same arithmetic read from the other end: the furniture is measured first and the plate takes
what is left, and where nothing is left the beat refuses with the numbers in the message.

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
