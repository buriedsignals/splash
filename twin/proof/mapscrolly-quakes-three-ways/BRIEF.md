# Beat — the same 14,057 earthquakes, four maps, four different answers

**Type:** dot density, hex grid, proportional symbol — three map types plus a second reading of the
hex grid, carried by the scroll vehicle. **Medium/genre:** map / **scrolly**. **Channel:** article
web, one self-contained `render/quakes-four-maps.html` (1,651 KB: the plate, the marks and
maplibre-gl all inlined), **four steps**, ONE camera reused by every step — **live MapTiler tiles**
since 2026-08-10, with the baked plate kept underneath as the fallback.

## Claim

One year of earthquakes, one camera, four encodings — and the answer moves with the encoding. RAW
DOTS draw the plate boundaries and let you count nothing. HEXAGONS make the pile-up countable: 10 of
156 cells hold half of all 14,057 events. PROPORTIONAL SYMBOLS drop to the 28 events that reached
magnitude 6.5 and pick out different coasts. Shading the SAME hexagons by their strongest event
instead of their count moves the ring again: the cell holding the year's magnitude 7.5, off Japan
and Russia, is only the 7th busiest of the year.

## Why this earns the scroll — and why it is not `mapmore-scrolly-danube` again

`MATRIX.md` recorded exactly one scrolly across 23 types, and it was a map: the Danube beat, which
steps ONE encoding through a growing subset of one route. This one is the other half of what the
vehicle is for.

- **Every step is a DIFFERENT MAP** of the same complete dataset over the same fixed camera — not a
  reveal, not a growing subset, not a moving camera. `DotFrame`, `HexCountFrame`, `SymbolFrame` and
  `HexStrengthFrame` are four components with four mark geometries.
- **What the scroll adds that a still could not.** The argument is a comparison of four encodings of
  one field, and the comparison only works if they land in the SAME rectangle in the SAME place on
  screen. Four stills side by side are four small maps a reader compares by moving their eyes; four
  frames swapped behind a fixed camera are compared by memory of the pixel that just changed. The
  clearest instance is the ring: between step 2 and step 4 it JUMPS from a cell in the south-west
  Pacific to a cell off Japan, on a camera that has not moved. On paper that is two maps and a
  caption asking the reader to trust it.
- **What it adds that a video could not.** Nothing in this beat is a motion; each frame is a state a
  reader has to READ — 156 cells, 28 circles, a legend whose numbers change between steps. A video
  decides how long that takes. It also carries none of this as text: with JavaScript off, this file
  still delivers all four paragraphs and the first map (measured below).
- **The honest cost.** A reader cannot hold two encodings side by side at one instant, which is what
  a small-multiples static beat is for. This beat trades that for one full-frame map at a time and
  for the ring's jump, which side-by-side cannot show at all.

## Data

- Source: USGS Earthquake Catalog (earthquake.usgs.gov), magnitude 4.0+, worldwide, 2024.
- `quakes-density.csv`: **14,175 rows**, the raw catalogue export, frozen unedited beside this beat.
  Byte-identical to `proof/mapgen-hexgrid-web/quakes-density.csv` and
  `proof/map-quake-density/quakes-density.csv` — copied, never imported.
- `plate/plate.png` + `plate/geometry.json`: the **same baked camera** as
  `proof/mapgen-hexgrid-web` — 836 × 520, MapTiler `dataviz-light`, world, frozen beside this beat.
  The bake also carries the projected pixel and the CSV row index of every on-frame event, which is
  what lets a hexagon be asked what it holds. Since 2026-08-10 the plate is the **fallback layer**
  rather than the basemap; `geometry.json`'s `frameCorners` and `worldWidthPx` are what the live
  camera is derived from (see "The live basemap", below).
- `geo-hex.ts`: this beat's own physical copy of `proof/mapgen-hexgrid-web/geo-hex.ts`, md5
  `dec30d19e135e46d1356cd269097dc09`, byte-identical. The hex math does not change between genres.
  Everything NEW is in `quake-encodings.ts`.
- **118 of the 14,175 catalogued events fall poleward of the frame** (64°S–80°N) and are not drawn.
  The credit line says so, and the figures are derived from `frameCorners` at render time rather than
  typed — the correction this exact number needed one beat over.

## Exact values — computed at render time, never typed

| Figure the beat states | Computed value |
| --- | --- |
| events drawn | 14,057 of 14,175 catalogued |
| lowest magnitude in the catalogue | 4.0 |
| non-empty hexagons | 156, at cell size 27.58 plate-px, chosen by `chooseHexSize` |
| cells holding half of all events | 10 |
| busiest cell | 1,374 events, Fiji and Tonga, centre 21.0°S 169.6°W |
| events at magnitude 6.5+ | 28 |
| strongest event | magnitude 7.5, "2024 Noto Peninsula, Japan Earthquake" |
| the cell holding it | Japan and Russia, centre 44.4°N 138.8°E, **518** events |
| its rank by count | **7th** — printed through `ordinal()`, and the whole claim is asserted: `deriveQuakeFacts` throws if the busiest cell and the strongest-event cell ever become the same cell |
| count classes | ≤15 · 84 · 278 · 696 · 1,374 |
| magnitude classes | ≤5.3 · 5.9 · 6.6 · 7.1 · 7.5 |

**The margin on "the busiest" is three events, and the beat is built so that does not matter.** Rank
1 holds 1,374 and rank 2 holds 1,371 — 0.2% apart, and a differently-shaped plate puts the other one
first (`mapgen-hexgrid-web`'s brief records exactly that). What step 4 claims is not "which cell is
busiest" but that the busiest cell and the strongest-event cell are DIFFERENT cells; the
strongest-event cell ranks 7th, so the claim survives the two leaders swapping. The ring in step 2
does name the leader, and the runner-up would be a different hexagon — that is the one sentence in
this beat a re-bin could move, and it is written down here rather than discovered later.

## The four frames

| Frame | Mark | What it answers | What it cannot do |
| --- | --- | --- | --- |
| dots | one round dot per event, `strokeLinecap: round` on zero-length subpaths | where events happen | let you count — the busy rims saturate |
| hex by count | 156 filled hexagons, ground→ink ramp | how many, and how concentrated | say anything about size |
| symbols | 28 circles, `r ∝ 10^(0.75·m)` | how strong, and where the strong ones are | say anything about frequency |
| hex by strongest | the same 156 hexagons, same ramp, different variable | whether "most" and "strongest" are the same place | say how often |

**Three craft decisions worth copying.**

1. **The MARKS are FITTED into the frame, not COVER-cropped.** `scrolly-discipline.md` files a
   basemap under scenery and crops it; that is right for a locator and wrong for a surface carrying
   14,057 marks from Chile to Kamchatka — COVER at a phone's aspect would show about a quarter of
   the world's width. It used to be fitted into the top `1 − PROSE_LANE` so that nothing was ever
   drawn in the band a prose panel parked in; the vehicle's ninth correction puts the card back over
   the visual and lets it travel the whole height, so that band was 28% of every frame spent on bare
   ground and is reclaimed. What the card asks instead is that the LEGEND stay out of its centred
   stripe — *which top-left does at 1600, 1280 and 375, and does NOT between about 600px and 826px:
   see "What driving a real browser found", item 6.*
2. **The symbol radius is rooted in ENERGY, not in the magnitude number.** Equal-area on the
   magnitude number would vary the radius by 4% across a 6.5–7.5 window and draw a 7.5 as if it were
   a 6.5; energy goes as `10^(1.5·m)`, so an equal-area encoding of it is `r ∝ 10^(0.75·m)` — a 5.6×
   range, which is what the reader sees. Largest drawn first so no circle buries a smaller one.
3. **One ring per frame, and the ring is what moves.** Ringing both cells in step 4 would leave the
   paragraph's own word "ring" ambiguous, which is the defect logged against `map-quake-density`
   (`B6.16`: a hexagon highlighted with nothing said about it). Here exactly one cell is ringed on
   exactly the frame whose paragraph names it, and the jump between frames IS the argument. **This
   is why the mark layer is split into a SURFACE and an ANNOTATION** (`MapFrames.tsx`): the world
   repeat below draws the surface again in every world copy, and drawing the ring again put a second
   ringed hexagon on screen 1,296px from the first with nothing said about it — the same defect,
   reintroduced by the live map.

## The live basemap (ruling R1, extended to the scrolly by the owner, 2026-08-10)

The owner drove the sibling `mapscrolly-one-map-europe-carbon` and said: *"j'ai l'impression que le
scrolly map n'utilise pas MapTiler correctement, je ne vois aucun canvas dans le DOM. Or il faut
tout le temps utiliser MapTiler."* This page was in the same state — `grep -c
'maplibregl\|api.maptiler.com'` over the delivered file returned **0**, no `<canvas>` in the live
DOM, and the source line below boasted that "the delivered file makes no request and carries no
key". It now carries a live MapTiler map under the marks. **Before → after**, measured: `maplibregl`
0 → 449 occurrences, `api.maptiler.com` 0 → 2, `<canvas>` in the live DOM 0 → **1** at every width.

**THE ARGUMENT FOR THE BAKED PLATE IS KEPT HERE, MARKED OVERTURNED**, because it was a real argument
and not an oversight. It ran: *a scrolly's cameras are authored, a finite set a plate can hold; a
reader mid-scrub can outrun a tile server; and a delivered file that makes no request and carries no
key still reads in ten years, in a CMS that blocks third-party hosts, and on no network at all.* The
ruling overrides the first two clauses. The third is answered rather than dismissed: **the plate
stays underneath, never instead of.** With no script, no key, no network or a MapTiler failure, the
reader gets exactly the picture this beat shipped before the ruling — photographed at
`drive/no-js.png`, against `drive/1600x900-before-baked-plate.png`.

**What fills what.** The live map ELEMENT fills the graphic edge to edge at every width (measured
continuously: canvas box minus graphic box = 0 × 0 at 1600×900, 1280×800, 768×1024 and 375×812).
The MARKS keep the plate's own contain fit, so nothing this beat counts is ever cropped. Between
the two: the plate is 359.8° of the world, so at desktop widths the frame is wider than one world —
about 140px down each side at 1600×900 — and MapLibre fills that with a repeat. **The marks repeat
with it**, which is what MapLibre already does for its own data layers, so no coast is ever drawn
without its events. Vertically the live map shows more world than the plate does, up to Mercator's
own ±85°; the 118 catalogued events poleward of the plate are still not drawn, and the credit line
still says so.

**NO CONTROLS, and that is a deliberate difference from map × web.** The owner, same day: *"Pas de
controls sur le scrolly, le scroll pilote et la map doit prendre toute la largeur."* The map is
constructed `interactive: false` — no drag, no wheel, no double-click zoom, no keyboard pan, no
touch, no `NavigationControl`. On a scrolly the piece owns the camera, and a reader who moved it
would be looking at a world the marks are no longer registered with. R1 requires the controls on a
map × web beat, where the reader's own exploration is the point; `live-map.test.ts` asserts their
ABSENCE here so nobody later "fixes" it back.

**The warm, and what it is worth on THIS beat.** The live layer walks its camera through MapLibre's
own tile cache and waits for `idle` before revealing anything. The camera never moves here, so there
is exactly **one** position to warm — reported on the page as `data-live-warm`, measured **1 camera
in 184 ms (1600×900), 200 ms (1280×800), 228 ms (375×812)** on a boot of 420-500 ms. Run against the
same page with the warm off (`verify-live-tiles.mjs --no-warm`), a scrub at 30, 120 and 400
scrollport-pixels per animation frame produced **0 frames with an outstanding tile either way**, and
settled in 1-2 ms either way. So the warm buys nothing measurable against a fast thumb on this beat
— honestly, because there is nothing for a thumb to outrun — and it is kept for the job it does do:
the live layer is revealed after `idle`, so the reveal is a map appearing rather than a grey grid
filling in. Tile requests for the whole piece: 12 at desktop widths, 5 on a phone.

**Registration is MEASURED, not assumed.** The fit stays declarative (`preserveAspectRatio="xMidYMid
meet"`, one declaration serving the plate layer and the mark layer alike, so a reader with no
JavaScript still gets a correct fit at every width) and `live-scroll-map.mjs`'s `fitCamera` restates
it in numbers for the live camera. The two are reconciled by measurement: the page publishes
`data-fit-drift`, the worst disagreement in frame pixels between the computed camera and the one the
browser resolved on the mark layer's own `getScreenCTM()`, and a disagreement over half a pixel
refuses the live layer and brings the plate back. **Measured 0.000 px at all four widths, on every
one of the 934 driven frames.**

**R1b:** the committed HTML carries `__MAPTILER_KEY__` and never a key; `twin-deliver` substitutes
at delivery. `verify-live-tiles.mjs` and `drive.mjs` both write a keyed copy into a `mkdtemp`
OUTSIDE the tree.

## What driving a real browser found and fixed

Items 1-3 were found by the first round, sampled at 25 scroll positions. Items 4-8 were found by
`drive.mjs`, which is a different instrument: a **continuous** scroll in 30px increments with no
settle wait, both directions, four widths, **one screenshot per increment** — 934 frames — because a
probe that jumps to a position and waits measures the settled state and a reader only ever sees the
transition.

1. **The legend collided with the prose panel at 375px — 36 times.** It was anchored just above the
   prose lane, and at that width a paragraph makes the pinned panel taller than the lane reserved
   for it. Moved to the frame's top-left, which is bare ground at narrow widths and the Bering Sea
   at wide ones. The prose was shortened at the same time, to 226–246 characters a step.
2. **The ramp washed the coastlines out.** At the sibling beat's own `0.14 → 0.82` ends, the
   lightest half of a 156-cell field covering the whole world read as fog rather than as data.
   Lifted to `0.22 → 0.94`, looked at again, kept.
3. **The ring disappeared on dark cells.** Now drawn twice — a ground-coloured halo under the accent
   stroke — so it reads against both ends of the ramp.
4. **`renderWorldCopies: false` silently moved the camera.** It was the tidy answer to the side
   bands and it is a trap: MapLibre will not show anything past the world's edge, so it CONSTRAINS
   the camera to cover the container. The layer asked for zoom 1.340 and the map sat at 1.644; the
   plate's north-west corner projected to (0, −94) while the marks drew it at (153, 0). **150px of
   misregistration that a settled screenshot reads as a perfectly good map**, because every dot is
   still near a coastline. Only the numbers say which one. World copies are ON, and the marks repeat
   with them.
5. **The world repeat drew empty coasts.** With the repeat on and the marks left alone, the bands
   showed a second Japan, Kamchatka, Australia, New Zealand and Americas with not one dot on them,
   beside a paragraph reading "every earthquake … one dot each"
   (`drive/1600x900-worldcopies-bare.png`). Closed by `syncWorldRepeats`, which draws the mark
   SURFACE once per visible world copy — and not the ANNOTATION, because that put a second ring on
   screen (craft decision 3).
6. **The prose card sliced the legend at 768px — 7 frames down, 8 coming back.** This file used to
   claim the top-left legend was outside the card's stripe "at every width"; it is outside at 1600,
   1280 and 375, and inside between about 600px and 826px, where the card's left edge sits at
   `W/2 − 205` and the legend runs 14…208. Closed the vehicle's own way — a thing the card can reach
   belongs wholly outside its stripe or wholly INSIDE it, never straddling an edge — with a media
   query that centres the legend in that band, where a crossing card covers it whole.
7. **The first fix for item 6 pulled the legend off the frame.** A normal declaration in a
   stylesheet loses to a style attribute, so the media query applied its `transform` and not its
   `left`: the legend was dragged half its own width past x=0 and clipped, with "…per hexagon" cut
   mid-word. `!important` is the one thing in the cascade that outranks a normal inline style.
   **`drive.mjs` did not catch this** — the card was not slicing the legend, the frame was — so it
   gained the guard that does, and the guard is what the re-run is green against.
8. **maplibre-gl's own CSS beat the live container's.** `.maplibregl-map { position: relative }` has
   the same specificity as `[data-part=live]` and is inlined after it, so the container computed
   `position: relative; height: 0` and MapLibre fell back to a 300px canvas inside an 806px graphic.
   The container's box is an inline style now.

## Measured, after those fixes

The numbers below are `drive/drive-report.json`, written by `drive.mjs` against a keyed copy of the
delivered file. **8 sweeps, 0 problems**, 934 driven frames photographed.

| sweep | frames | readings reached | world copies | worst fit drift | frames missing a tile | rings | card over the legend | problems |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1600×900 down / up | 126 / 126 | 4 / 4 | 1 each side, world 1,320px | 0.000px | 0 | 0 or 1 | 0 | 0 |
| 1280×800 down / up | 109 / 109 | 4 / 4 | 1 each side, world 1,135px | 0.000px | 0 | 0 or 1 | 0 | 0 |
| 768×1024 down / up | 141 / 141 | 4 / 4 | 0, world 768px | 0.000px | 0 | 0 or 1 | 7 / 8 frames, covered whole | 0 |
| 375×812 down / up | 91 / 91 | 4 / 4 | 0, world 375px | 0.000px | 0 | 0 or 1 | 8 / 8 frames, covered whole | 0 |

- **The map fills the graphic at every driven frame**: canvas box minus graphic box = 0 × 0.
- **Exactly one frame painted at a time**, no horizontal overflow, all four readings reachable in
  both directions, and the four readings' fingerprints are four distinct pictures — a slideshow of
  one map four times would satisfy everything else here.
- **Reduced motion**: 126 positions, all four readings reached, 0 problems.
- **JavaScript disabled**: one server-rendered active frame, the baked plate painted (`opacity 1`,
  inline `data:image/png;base64,`), **0 canvases, 0 world-repeat layers, 0 external requests**, and
  all four steps' prose in the document.
- **Prose panel**: computed `rgb(255,255,255)` on `rgb(0,0,0)` read live off the DOM — **21.00:1**.

## Anti-patterns for this case, and this beat's own limits

- **A scrolly must carry different states, not the same picture four times.** Steps 2 and 4 draw the
  same 156 hexagons, and they are not the same picture: different variable, visibly different
  shading, and the ring in a different place. If they had come out looking alike, step 4 would have
  belonged in a caption.
- **Never let the prose name something the frame does not show.** Each paragraph names only what its
  own map draws; the ringed cell is named on the frame that rings it.
- **The antimeridian is a real limit, stated rather than hidden.** The frame runs −179.9° to 179.9°,
  so the Fiji–Tonga–Kermadec zone is split between the map's left and right edges and no single
  hexagon holds all of it. This affects how the busiest cell reads, not the concentration claim, and
  it is the reason the beat says "off Fiji and Tonga" rather than naming a country. The world repeat
  under the live map does NOT repair it: the bins were computed once, on the plate, and a repeated
  copy is the same 156 cells drawn again — the split cells are split in every copy.
- **A repeated world is a repeated world, and it is not a second dataset.** At desktop widths a
  reader sees part of the Pacific rim twice, once at each edge, with the same dots on both. That is
  what every slippy map does at a world camera; what would be dishonest is showing that coast twice
  with events on only one of them, which is exactly the state the first live render was in.
- **Hexagons are equal on the PLATE, not on the globe.** Binning happens in projected pixels, so a
  cell near the poles covers less ground than one at the equator — the same trade every beat on this
  camera makes.

## Source line

`Earthquakes of magnitude 4.0 and above, worldwide, 2024: USGS Earthquake Catalog (earthquake.usgs.gov). Basemap: live MapTiler dataviz-light tiles, with the 836×520 capture frozen beside this beat as the no-network fallback. © MapTiler © OpenStreetMap contributors. 118 of the 14,175 catalogued events fall poleward of this frame (64°S–80°N) and are not drawn. Colours recorded in PALETTE.md by the newsroom.`
