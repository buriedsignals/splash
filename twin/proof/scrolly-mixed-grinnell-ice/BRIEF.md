# Beat — three media, one glacier: four photographs, a live map, and the record they sit in

**Type:** mixed scrolly (photograph sequence + live map + line chart), all three navigated by one scroll.
**Medium/genre:** image + map + chart / **scrolly**. **Channel:** article web, one self-contained
`render/three-media-one-glacier.html` (2.6 MB — four photographs and MapLibre inlined), **seven
steps**, three media, two handovers.

## What this beat is for

The owner, 2026-08-10: *"Pour le multiple, essaye de mélanger de tout : des charts avec navigations,
des maps avec navigations et des images."* Then, on how it is driven: *"La navigation se fait au
scroll, c'est une sorte de mix de tout."* Then, on how it should be built: *"C'est genre un
assemblage."*

That is **form 2 containing form 1** — ruling R5. Six scrolly beats already exist on disk and none of
them is it. Four swap four encodings of one subject behind a fixed frame with **no navigation inside
any of them**; two navigate properly but carry **one element each**. What was missing is the general
case: several media in one story, with the chart and the map navigated by the scroll while they hold
the screen.

## Why each medium is here, and what it gives that the other two cannot

The vehicle's own rule is that it earns its existence by carrying different media — so a beat that
shows off the mechanism while arguing nothing is worse than no beat. This is the argument, and each
medium carries one leg of it.

| Steps | Medium | What only this can say |
| --- | --- | --- |
| 1–2 | **Four photographs**, Mount Gould, 1938 → 2009 | That the floor of a basin **became a lake**. There is no number for the difference between ice and water in a photograph, and no chart or map states it. A reader who has just looked at 1938 and meets 2009 in the same rectangle does the comparison by memory of the pixel that changed. |
| 3–4 | **A live MapTiler map**, flying from the whole park onto the cirque | **Where this is and how big it is.** The photograph has no scale and no location — it could be any mountain. The chart has no place at all. The map also shows the ridge all four photographs were taken from, 1.2 km from what they show, which is the fact that makes them comparable in the first place. |
| 5–7 | **A chart** of the world's reference glaciers, 1956–2023 | Whether this is one basin having a bad century — and **a rate**, which four photographs, however clear, cannot show. Nothing in the sequence can tell a reader that the last 25 years lost ice 2.9× faster than the first 25. |

Take any one of the three away and a leg of the argument goes with it. That is the test this beat was
built to pass rather than to demonstrate a mechanism.

## The seven readings

| # | Medium | What the reader is asked to see | What the scroll does INSIDE it |
| --- | --- | --- | --- |
| 1 | photograph | 1938: the basin floor is ice, and there is no lake | the time rail sits at the start of 71 years |
| 2 | photograph | 1981, 1998, 2009 — the floor is water with ice floating on it | the sequence DISSOLVES through four frames and the rail cursor travels a **real time axis**, so the reader can see the gaps are 43, 17 and 11 years and not three equal steps |
| 3 | map | Glacier National Park, 91 km across; the basin is one cirque inside it | the camera has been closing since step 2 and arrives on the park |
| 4 | map | the glacier's outline is 1.5 km across — 1.6% of the park's width — and the camera that took every photograph stood 1.2 km away | the camera **flies** from the whole park onto the cirque: 7.6 zoom levels, ~190× |
| 5 | chart | the world's reference glaciers, 1956–2023: 29.7 m of water equivalent gone | both axes **travel in** from a wider frame as the chart appears |
| 6 | chart | the stretch the photographs cover: 1981 → 2009, 11.6 m | the accent **draws itself** backwards along the record from a run of zero length; a mark arrives with it |
| 7 | chart | 1998–2023: 7.15 m per decade against 2.47 over the record's first 25 — 2.9× faster | both domains narrow, and the highlighted run travels with them |

## Every number, computed

Nothing in the title, the credits or any step's prose is typed. `ice-data.ts` derives it, `render.mjs`
interpolates it, `scroll.test.ts` recomputes it, and `claims-grounded-in-data` scans the runner.

| Figure | Where it comes from |
| --- | --- |
| 4 photographs, 1938–2009, 71 years, gaps of 43/17/11 | `photographs.csv` |
| 1956–2023, 68 annual readings, −29.7 m | `reference-glaciers.csv` |
| 1981 → 2009 = −11.6 m | the two photograph years the measured series covers, looked up in it |
| −7.15 vs −2.47 m/decade, 2.9× | the first and last 25 years of the record |
| park 91 km across, glacier 1.5 km, 1.6% | the bounding boxes of the two frozen OSM outlines |
| 1.2 km from the ridge | great-circle distance, Mount Gould summit to the glacier's centre |

Three assertions in `render.mjs` stop the run if a re-freeze moves a claim: the last quarter-century
must be losing faster than the first, the glacier must be smaller than the park, and the first
photograph must be older than the record. **What is deliberately NOT claimed**: no ice is measured
from a photograph. Four pictures are not a survey; every figure the photograph track states is a fact
about the SEQUENCE. And the reference-glacier record is a global series, never described as a
measurement of Grinnell — the beat says out loud that the first photograph is 18 years older than the
record.

## How one scroll drives all of it

**There is no state machine for "which medium" and no second interpolation for "where inside it."**
There is one composition state whose fields happen to belong to three media —
`photoAt`, `photoOpacity`, `mapLon`/`mapMercY`/`mapLogSpan*`/`mapFit`/`mapOpacity`, the chart's two
domains and its highlighted run, `chartOpacity` — and `stateAt` interpolates it field by field at the
reader's own fractional position. A medium's PRESENCE is a field of the same record as the chart's x
domain, so **the handover is not a mechanism; it is the same lerp, on three more numbers.** At any
fractional position the whole composition is defined, and nothing can arrive half a step from its own
sentence.

- **Progress is READ, never re-derived.** `scrolly` publishes `data-progress` on its own root on
  every scroll and this driver reads it. Both single-visual beats once derived their own from panel
  overlaps and froze when the vehicle moved the prose; the repair was having ONE opinion, and this
  beat starts from the repaired shape. Measured disagreement with the scaffold: **0.0005** at all
  three widths, which is the 4 decimals the scaffold writes against this driver's 3-decimal echo.
- **The outgoing medium is still moving as it leaves, and the incoming one is already moving as it
  arrives.** The map camera starts closing during the photograph steps and pulls back as the chart
  fades in; the chart's axes travel in from a wider frame while its opacity comes up. This is why the
  handover reads as one gesture rather than a cut with a fade, and why 59 of 59 handover frames per
  sweep move geometry rather than only an alpha.

## An assembly, not a new mechanism

Almost nothing here is invented. The parts are the two single-visual beats' own, **copied** (a beat's
inputs and outputs live in its own folder; nothing imports across a beat or skill boundary), and
`scroll.test.ts` holds a **parity check** on every copied function rather than a comment claiming
they are the same:

- the interpolation core, the progress reader and the re-parent are byte-identical to BOTH
  `scrolly-one-chart-swiss-life-expectancy/chart-drive.mjs` and
  `mapscrolly-one-map-europe-carbon/map-drive.mjs`;
- `niceStep` / `ticksFor` / `valueAt` are the chart beat's;
- `avoidStripe` / `stripeOf` are the map beat's;
- `live-scroll-map.mjs` is the map beat's, minus the three functions that only a baked plate needs.

**Three divergences, declared rather than left to be found:**

1. **`toFrame` / `annotationPlacement` take the frame.** The chart's floor is reserved in PIXELS here
   (see "What the driving found", 3). Asserted as a divergence: the test reconstructs one copy from
   the other, so a change in either beat still fails.
2. **No baked plate, so no `MAX_SCALE`.** The map beat inverts its camera out of plate units and
   clamps the zoom so a plate is never magnified past its own raster. This beat's flight covers
   **7.6 zoom levels — about 190×** — which no single plate can hold, so the camera is authored
   directly in longitude / mercator-y / extent and the clamp is gone with the plate it protected.
3. **The photograph track has no ancestor at all.** Neither single-visual beat carries a photograph,
   and the image beat that does hands the vehicle one frame per step with no signal inside it.

## The live MapTiler layer — and how to open a working copy

Ruling R1, extended to the scrolly by the owner: *"il faut tout le temps utiliser MapTiler"*, plus
*"Pas de controls sur le scrolly, le scroll pilote et la map doit prendre toute la largeur."* All
three hold, driven rather than asserted (`verify-live-tiles.mjs`, 2026-08-10):

**1 `<canvas>`, 1600px wide inside a 1600px frame · 586 requests to `api.maptiler.com` · 0
navigation controls · `dragPan`, `scrollZoom` and `keyboard` all disabled · 13 cameras warmed in
2.1 s before the live layer is revealed.**

**⚠️ The committed file is NOT the thing to judge the map on.** R1b: it carries the delivery
PLACEHOLDER, so no map is constructed, no tile is fetched and no quota is spent — opening
`render/three-media-one-glacier.html` straight from the repository shows the **fallback**: the beat's
own drawn geography (the park's outline and the glacier's, real OSM shapes moved by the same camera),
the two marked places, and the scale bar, with no basemap under them. To see the real thing:

```sh
bun proof/scrolly-mixed-grinnell-ice/verify-live-tiles.mjs
```

It writes a keyed copy into a `mkdtemp` OUTSIDE the repository, drives it, prints the measurements
above, and leaves two keyed screenshots in `drive/live-step-3.png` and `drive/live-step-4.png` — the
live picture, in the proof folder, even though the live file never is.

**What the plate would have bought, and what replaces it.** The sibling keeps its baked plate
underneath the tiles, so a blocked host or a rotated key leaves the reader the picture it shipped
before the ruling. This beat cannot — see divergence 2 — so the fallback is its own drawn geography
instead. That is weaker than a basemap and it is named as such rather than glossed.

**Do the tiles keep up with a thumb?** Driven at 30 / 120 / 400 scrollport px per animation frame,
the share of map frames with **every tile for that camera already in hand** was **0.57 / 0.56 /
0.63**; on the rest MapLibre shows the previous camera's tiles stretched, never a blank container.
Two caveats on that number, both honest: it is measured under headless software GL, which is slower
than any real machine; and `map.loaded()` — the other question, whether the map has finished ALL its
internal work — is false on **every** frame of a scrub by construction, because the driver calls
`jumpTo` on each one. Reporting `loaded()` alone would have said "0% ready at every speed" about a
map whose tiles were all there, and the first version of this probe did exactly that.

## What was driven, and what it found

`drive.mjs` scrolls the real file in real Chrome at 1600×900, 1280×800 and 375×812, **down and back
up**, in 30px increments with **no settle wait**, with a `requestAnimationFrame` recorder installed
BEFORE the scroll is touched.

**What this harness adds to its two siblings', and it is the reason a mixed beat needs its own: the
fingerprint only covers layers a reader can SEE.** A three-layer composition can move an invisible
camera and satisfy any fluidity measurement taken over the whole element. Measured, in a `/tmp` copy
with the visible tracks frozen: with the filter, 579 problems; without it, 382 — **45 frames per
sweep and 197 problems** hidden by a camera nobody can see, signing the fingerprint for a picture
standing still.

Final run, on the delivered file, **0 problems in all six sweeps**:

| | 1600×900 | 1280×800 | 375×812 |
| --- | --- | --- | --- |
| samples per sweep | 241 | 207 | 168 |
| progress span | 0 → 6 / 6 → 0 | 0 → 6 / 6 → 0 | 0 → 6 / 6 → 0 |
| media that reached full strength | photo, map, chart | photo, map, chart | photo, map, chart |
| intra-step frames where the GEOMETRY moved | 222/225 · 223/225 | 191/193 · 191/193 | 154/156 · 153/156 |
| — of them, on the photograph track | 53/56 · 55/57 | 47/49 · 47/49 | 37/39 · 36/39 |
| — on the map track | 75/75 · 74/74 | 63/63 · 64/64 | 52/52 · 52/52 |
| — on the chart track | 94/94 | 81/81 · 80/80 | 65/65 |
| — **across a medium HANDOVER** | **59/59 · 60/60** | **52/52** | **41/41** |
| frames where only an opacity moved | **0** | **0** | **0** |
| — exempt edge frames (below) | 3 · 2 | 2 · 2 | 2 · 3 |
| clamped signal frames, exempted | 9 | 7 | 5 |
| beat's position vs scaffold's progress, worst | 0.0005 | 0.0005 | 0.0005 |
| painted step vs progress, worst | 0.581 · 0.585 | 0.563 · 0.565 | 0.542 · 0.536 |
| tallest panel, as a fraction of the scrollport | 0.192 | 0.223 | 0.320 |

**The one shortfall, with its number.** 2–3 frames per sweep are exempted as `alphaAtHandoverEdge`,
and the map and chart tracks contribute none of them. `ease` is `easeInOutQuad`, whose derivative is
ZERO at both ends of a leg, so for the first few frames after a boundary every field is very nearly
still. That is invisible on a camera or an axis — a transform written to four decimals still changes
— and visible on a photograph track whose only positional element is a time cursor that has already
reached the last frame of its sequence. The honest description of those frames is *a still
photograph, that has just begun to fade*, and the same exemption covers the clamped head and tail of
the piece where the signal itself has nowhere to go. **Everywhere else: 0 alpha-only frames.** A
photograph's native motion is a dissolve; what stops that from being the whole story here is that the
rail measures real time and moves on every frame of it.

### The four defects the driving found, that no screenshot and no unit test would have

1. **The credit was cut down the middle by the prose card's edge**, on 32 of 237 frames at 1600×900,
   32 of 207 at 1280×800, in both directions and on every sweep. It ran `left: 2%` to `right: 2%`, so
   the card's vertical edge was always inside it. It is now centred and **narrower than the card** —
   380px against the card's 409px above the 600px breakpoint, edge to edge below it — which makes it
   a horizontal subset of the card at every width, so the only two things that can happen to it are
   "hidden whole" and "not touched". Both sibling beats still carry the full-width version; their own
   BRIEFs warn that the vehicle's ninth correction gave up the guarantee that would have protected it.
2. **One x-tick label in nine was sliced by the same edge** at 1280×800 (13 frames a sweep on "2010",
   1 on "2000"). A y tick lives in the frame's left gutter, outside the stripe at every width; an x
   tick has to sit under its own value and cannot move. There are nine of them and the axis reads
   perfectly with eight, so the one under the edge is switched off — the vehicle's own answer for a
   label a travelling card meets. The hide margin runs 1.5px OUTWARD while the guard's own test runs
   0.5px inward, so the fix is strictly more conservative than the check; at equal thresholds one
   label per sweep still slipped through on sub-pixel rounding.
3. **At 375×812 all seven x-tick labels sat on the credit, on 72 of 139 frames.** The plot's floor
   was a flat fraction, `0.88`. But the tick strip and the credit are stacks of TYPE at a fixed pixel
   size, and reserving room for them as a fraction reserves the wrong number at every height but one:
   68px of clear air at 1600×900 and a collision at 375×812, where the header wraps and the graphic
   is barely 400px tall. `plotBox(frame)` reserves it in pixels now, and a shorter frame gives up
   plot rather than giving up furniture.
4. **The park's outline drew as a dotted hairline** — found by opening the render, not by any
   assertion. `vector-effect="non-scaling-stroke"` compensates for transforms INSIDE an SVG; this
   camera is a CSS transform on an ancestor `<div>`, which scales the rasterised result and the
   stroke with it. At the park camera the scale is 0.044, so a 2px outline was drawn at **0.09px**;
   at the cirque camera the scale is 1.57 and the glacier's 3px outline came out at 4.7px. One
   outline too faint to see and one too heavy, from the same missing division. The driver divides the
   stroke by the camera's own scale on every frame now. **And the basemap's own administrative
   boundary ran as a black rule across the top of the park camera**, competing with the outline this
   beat draws itself — hidden with the place labels, same rule, same reason.

Screenshots in `drive/`: seven settled steps at each width, plus both **handovers** at position 1.5
and 3.5 — the moments a sampled probe never looks at and the ones this beat is actually about.

### What the handovers look like, said rather than measured — including the one that reads worse

The two are not equally good, and the difference is instructive. **Photograph → map (1.5) reads
well**: a photograph and a basemap are both continuous-tone pictures, so one dissolving into the
other is a transition a reader has seen a thousand times, and at the midpoint the 2009 frame — the
basin as a lake — sits under the park's outline, which is very nearly the sentence the next step is
about. **Map → chart (3.5) is the weakest moment in the piece**: for the ~0.2 of a step where both
are near half strength, the glacier's outline and its two labels are superimposed on the chart's line
and grid, and two line drawings at 50% over one another read as noise rather than as one thing
becoming another. It is short, it is legible on either side of it, the guard measures 59/59 of those
frames moving geometry, and it is still the shot in `drive/1600x900-handover-3-5.png` I would want to
improve first. The honest options are a shorter crossfade window for that one leg, or the outgoing
map fading through a wipe rather than an alpha — neither of which is a small change to a beat whose
whole claim is that ONE lerp drives everything, which is why this round names it instead of
special-casing it.

## Reduced motion

`prefers-reduced-motion: reduce` makes `stateAt` snap to the nearer step. The reader is still taken
to all seven readings — the medium changes, the camera arrives, the axes arrive — with no flight and
no dissolve. Measured over 241 continuous positions at 1600×900: **7 distinct states, no eighth, and
0 frames with a blended layer.**

## JavaScript disabled

The composition is SSR'd in its first state inside the frame the scaffold marks active by default, so
with no script a reader gets the whole of reading 1: the 1938 photograph at full strength, its credit,
and all seven steps' prose in ordinary document flow. Measured: visual present, 4 photographs in the
DOM with the first at opacity 1, photo layer at 1 and the map and chart layers at 0, 68-point
polyline present, 2 outlines present, 7 paragraphs, credit `T. J. Hileman · Glacier National Park
Archives, 1938`.

## Colours

`PALETTE.md` beside this beat, read through `readPalette`. No hex in `render.mjs` or `MixedFrame.tsx`.
The accent is spent on ONE idea across all three media — the ice this story is about, and the
reader's own position in its record — because an accent that means one thing on the chart and
something else on the map is two vocabularies in one piece, and a reader crossing a handover has no
way to know they changed.

## Credits

One credit, at the bottom of the visual, whose TEXT names the source of whatever medium is on the
screen — the photographer for each photograph, OpenStreetMap and MapTiler for the map, WGMS via the
US EPA for the chart. Three credit lines stacked at the floor would collide through every handover.
Full provenance, including each original photograph's URL and sha256, is in the header, which under
the fixed-page model never scrolls away.

## What a journalist's own material would replace

The same two things the sibling image beat names — `frames/*.jpg` and `photographs.csv` — plus, for a
different place, `geography.geojson` (any outlines and a viewpoint) and `reference-glaciers.csv` (any
annual series). The photographs here are the U.S. Geological Survey's repeat-photography record, all
four public domain, credited frame by frame; **they are not a newsroom's own**, which the sibling beat
states first and this one repeats.

## Files

- `photographs.csv`, `frames/*.jpg` — the four frames and their full provenance, copied from
  `scrolly-image-grinnell-glacier` so this beat's inputs live in this beat's folder.
- `reference-glaciers.csv` — mean cumulative mass balance of the world's reference glaciers,
  1956–2023, WGMS via the US EPA (ODC-PDDL-1.0), frozen 2026-08-10.
- `geography.geojson` — the park's and the glacier's outlines (OpenStreetMap `relation/1242641` and
  `way/82797068`, ODbL) and the Mount Gould summit, frozen from Nominatim 2026-08-10.
- `ice-data.ts` — the reading layer for all three: the sequence, the series, the shapes.
- `compose.mjs` — the assembly: the interpolation core, the chart geometry, the camera, the
  photograph track and the one driver. One implementation, used at SSR and inlined.
- `live-scroll-map.mjs` — the live MapTiler layer, no controls, warmed, placeholder key.
- `MixedFrame.tsx` — the whole composition, SSR'd in its first state.
- `render.mjs` — the runner: the seven states, the seven steps, the live plan, the inlined driver.
- `PALETTE.md` — the recorded colour answer and the reasoning behind it.
- `render/three-media-one-glacier.html` — the delivered file, self-contained, no key.
- `drive.mjs`, `drive/` — the browser run and what it saw, including `drive-report.json` and the two
  keyed live screenshots.
- `scroll-report.mjs` — the pure half of the driving: what a swept sample sequence MEANS.
- `verify-live-tiles.mjs` — the keyed probe, run outside the tree.
- `scroll.test.ts` — the guards, each with the mutation that reddens it, and the parity checks on
  every function copied from the two sibling beats.
