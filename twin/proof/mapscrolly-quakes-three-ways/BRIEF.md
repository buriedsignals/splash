# Beat — the same 14,057 earthquakes, four maps, four different answers

**Type:** dot density, hex grid, proportional symbol — three map types plus a second reading of the
hex grid, carried by the scroll vehicle. **Medium/genre:** map / **scrolly**. **Channel:** article
web, one self-contained `render/quakes-four-maps.html` (764 KB, plate inlined), **four steps**, ONE
baked camera reused by every step.

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
  No key, no tile request, nothing fetched at render time or at read time. The bake also carries the
  projected pixel and the CSV row index of every on-frame event, which is what lets a hexagon be
  asked what it holds.
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

1. **The map is FITTED into the frame, not COVER-cropped.** `scrolly-discipline.md` files a basemap
   under scenery and crops it; that is right for a locator and wrong for a plate carrying 14,057
   marks from Chile to Kamchatka — COVER at a phone's aspect would show about a quarter of the
   world's width. It used to be fitted into the top `1 − PROSE_LANE` so that nothing was ever drawn
   in the band a prose panel parked in; the vehicle's ninth correction puts the card back over the
   visual and lets it travel the whole height, so that band was 28% of every frame spent on bare
   ground and is reclaimed. What the card asks instead is that the LEGEND stay out of its centred
   stripe, which top-left already does.
2. **The symbol radius is rooted in ENERGY, not in the magnitude number.** Equal-area on the
   magnitude number would vary the radius by 4% across a 6.5–7.5 window and draw a 7.5 as if it were
   a 6.5; energy goes as `10^(1.5·m)`, so an equal-area encoding of it is `r ∝ 10^(0.75·m)` — a 5.6×
   range, which is what the reader sees. Largest drawn first so no circle buries a smaller one.
3. **One ring per frame, and the ring is what moves.** Ringing both cells in step 4 would leave the
   paragraph's own word "ring" ambiguous, which is the defect logged against `map-quake-density`
   (`B6.16`: a hexagon highlighted with nothing said about it). Here exactly one cell is ringed on
   exactly the frame whose paragraph names it, and the jump between frames IS the argument.

## What driving a real browser found and fixed

Rendered, then opened in Chrome and sampled at **25 scroll positions across the full track at
1600×900, 1280×800 and 375×812**.

1. **The legend collided with the prose panel at 375px — 36 times.** It was anchored just above the
   prose lane, and at that width a paragraph makes the pinned panel taller than the lane reserved
   for it. Moved to the frame's top-left, which is bare ground at narrow widths and the Bering Sea
   at wide ones. The prose was shortened at the same time, to 226–246 characters a step.
2. **The ramp washed the coastlines out.** At the sibling beat's own `0.14 → 0.82` ends, the
   lightest half of a 156-cell field covering the whole world read as fog rather than as data.
   Lifted to `0.22 → 0.94`, looked at again, kept.
3. **The ring disappeared on dark cells.** Now drawn twice — a ground-coloured halo under the accent
   stroke — so it reads against both ends of the ramp.

## Measured, after those fixes

- **Collisions between the map's own annotations and the pinned panel: 0**, at all three widths,
  every sample, PINNED AND PRE-PIN alike — the fitted-into-the-band design leaves nothing to collide
  with. **Off screen: 0.** Exactly one panel painted at a time. The sticky graphic measured full
  viewport width and height at every pinned sample; no horizontal overflow.
- **Reduced motion**: 12 positions, 0 intermediate opacities, computed `transition-duration: 0s`,
  and the active frame still advanced through all four steps.
- **JavaScript disabled**: one server-rendered active frame and all four steps' prose in full
  (246 / 226 / 224 / 243 characters).
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
  it is the reason the beat says "off Fiji and Tonga" rather than naming a country.
- **Hexagons are equal on the PLATE, not on the globe.** Binning happens in projected pixels, so a
  cell near the poles covers less ground than one at the equator — the same trade every beat on this
  camera makes.

## Source line

`Earthquakes of magnitude 4.0 and above, worldwide, 2024: USGS Earthquake Catalog (earthquake.usgs.gov). Basemap © MapTiler © OpenStreetMap contributors, baked once at 836×520 and embedded — the delivered file makes no request and carries no key. 118 of the 14,175 catalogued events fall poleward of this frame (64°S–80°N) and are not drawn. Colours recorded in PALETTE.md by the newsroom.`
