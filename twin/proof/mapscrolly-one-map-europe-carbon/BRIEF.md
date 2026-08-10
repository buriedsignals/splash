# One map, four readings — CO₂ per person across 41 European countries, 2023

**Type:** choropleth, carried by the scroll vehicle. **Medium/genre:** map / **scrolly**.
**Channel:** article web, one self-contained `render/one-map-four-readings.html`, **four steps**,
one map and four cameras.

A scroll-driven interactive. **One map. The scroll drives the camera** — it flies, zooms and settles
once per step. Nothing is redrawn and nothing is re-projected: it is the same 41 shapes throughout,
over one live MapTiler basemap, seen from four places.

*(The `**Type:**` line above was missing until 2026-08-10, which is why this beat was invisible to
`MATRIX.md`'s coverage tables — recorded as a gap under B8.3 in `FEEDBACK-2026-08-10.md`.)*

Sibling beat, deliberately the OTHER form: `mapscrolly-quakes-three-ways` shows one subject through
four ENCODINGS and the comparison is its argument. This one navigates inside a single map.

## The four readings, and why one frame cannot hold them

| # | Where the camera is | What the reader is asked to see |
| --- | --- | --- |
| 1 | the whole plate, contained | 41 countries, one shade each: 1.6 (Albania) to 13.0 (Faeroe Is.), a factor of 8.3, median 5.1 |
| 2 | flies east, into central Europe | the darkest block is not one thing: Czechia 7.7 beside Hungary 4.2, 3.5 tonnes across one border |
| 3 | flies west, into the Low Countries | Luxembourg emits 10.3 — the **second-highest** figure here — on a shape **1.3% of the map's width** |
| 4 | pulls back to the opening camera | the 13 of 41 within a tonne of the median: 30.8% of the painted land, spanning 1.5 t of an 11.5 t range |

**The argument, with a measurement rather than an opinion.** Reading 3's subject is **27 of the
plate's 2000 units** across. At reading 1's camera that is a smudge a reader cannot resolve, let
alone label. At reading 3's camera it is a shape with a name on it — and the second-highest figure on
the continent turns out to be sitting on it. That is not a different map; it is the same map, closer.

Reading 4 is the other half: it returns the reader to **reading 1's exact frame** and lifts something
out of it they could not see the first time. Putting readings 2, 3 and 4 on one frame at once means a
continental map carrying eight labels over four-pixel countries and a highlight competing with a
choropleth — the cluttered picture the vehicle exists to avoid. And a video cannot do reading 4
either: counting a band of thirteen countries is a thing the reader has to be allowed to take their
own time over.

## Live MapTiler tiles, and the baked plate underneath them — OVERTURNED 2026-08-10 by the owner

**This beat used to keep the baked plate and argue for it.** The owner drove the page and reported
the fact: *"j'ai l'impression que le scrolly map n'utilise pas MapTiler correctement, je ne vois
aucun canvas dans le DOM. Or il faut tout le temps utiliser MapTiler."* He was right about the fact —
`grep maplibregl` over the delivered file returned 0 — and he has now ruled twice that maps are
always MapTiler. **The basemap is live.**

### The position that was overturned, kept verbatim

> **This beat keeps the baked plate.** `doctrine/references/geo-discipline.md` rule 2 is written
> for exactly this case: a moving camera needs a FIXED plate, and moves *within* it, because
> re-rendering tiles per camera position resamples the basemap slightly differently every time and the
> picture shimmers. That rule was written about a video's camera; a scroll-driven camera is the same
> camera with the reader's thumb on the timeline.
>
> **Ruling R1 put map × WEB on live MapTiler tiles, and it does not reach here, because the two are
> not the same problem.** A free-pan map's set of camera positions is INFINITE — the reader chooses
> it — and no bake can hold an infinite set, which is exactly why R1 is right about that genre. A
> scrolly's camera is **authored**: four positions, known at build time, on one continuous path
> between them. A finite, known set is precisely what a plate can hold. Three consequences decided it:
>
> 1. **The reader is mid-gesture.** They can scrub back and forth as fast as a trackpad allows. Live
>    tiles would be fetching continuously through that gesture, and reading 3 would arrive as grey
>    squares at the exact moment its own sentence names what to look at. The camera path is the one
>    thing in this beat that must never wait on a network.
> 2. **The delivered file carries no key.** Measured on the delivered HTML with JavaScript disabled:
>    41 shapes present, the plate inline as a `data:` URI, and **0 external requests** of any kind.
> 3. **The set is finite, so the cost is finite** — and it is one number rather than a risk.

### What replaced it, and how the risk in point 1 was answered rather than ignored

**The cameras being authored is exactly what makes them WARMABLE.** `live-scroll-map.mjs`'s
`warmCameras` walks every authored camera **and the positions between them** — where the reader
spends most of the piece, at zooms no authored state has — through MapLibre's own tile cache, and
the live layer is not revealed until it has. That is deliberately not a hand-rolled tile enumerator:
guessing which z/x/y MapLibre will ask for is a second opinion about the same thing, and this
project has been bitten twice by two opinions of one number.

Measured on a keyed copy written outside the tree, 1600×900, against the real `api.maptiler.com`:

| | warmed | control, warm removed |
| --- | --- | --- |
| warm cost | **10 cameras, 367–567 ms**, 24 requests | 0 |
| reading-speed scrub (30px/frame, 126 frames): frames with a tile outstanding | **13** | **34** |
| 120px/frame, 32 frames | 1 | 4 |
| flick (400px/frame, 10 frames) | **0** | 1 |
| new requests during the reading-speed scrub | 14 | 25 |
| settle after the gesture | 1–4 ms | 1–19 ms |

**No scrub speed was found at which the tiles could not keep up**, and the honest caveat is that this
is one localhost hop to a fast network. What a newsroom on a slow one gets is the second half of the
answer:

**The baked plate stays UNDERNEATH the live tiles, never instead of them.** Same DOM it always had,
under the map container, moved by the same camera transform — so a rotated key, a spending limit at
which MapTiler invalidates every key on the account, a CMS that refuses `api.maptiler.com`, no
network, or no JavaScript leaves the reader exactly the picture this beat shipped before the ruling.
`MAX_SCALE` still clamps the camera, because the plate under a failed tile request must not be a
blur; the live tiles themselves have no such ceiling.

**No controls, and the reader cannot move this camera.** The owner, same day: *"Pas de controls sur
le scrolly, le scroll pilote et la map doit prendre toute la largeur."* The map is constructed
`interactive: false` — no drag, no wheel, no double-click zoom, no keyboard pan, no
`NavigationControl`. This is a deliberate DIFFERENCE from map × web, where R1 requires the controls
because there the reader IS the camera; here the scroll is, and a reader-moved camera would be taken
back by the next step. Recorded as a distinction between the two genres in
`scrolly/references/scrolly-discipline.md`, so it is not later "fixed".

**The map takes the whole frame.** Live tiles fill the container edge to edge, which is what makes
that instruction free: the 41 shapes stay at the plate's own fitted scale under the same transform,
so nothing this beat counts is cropped, while the ground under them reaches every edge. **One thing
broke on the way, and it is worth copying:** the veil — the "everything else recedes" rectangle —
was the size of the PLATE and inside the camera, which was right while the plate was the basemap.
Over live tiles it drew its own two vertical edges: measured at reading 4, 1600×900, the Atlantic
was visibly lighter inside the plate's band than outside it. The veil is a frame-level layer now.

**The delivered file still carries no key.** R1b: the committed artifact holds the placeholder
`__MAPTILER_KEY__` and `deliver` substitutes at delivery, so a proof page never spends a
newsroom's tile quota and no key survives in this repository's history.

**What it costs, stated rather than discovered.** maplibre-gl is INLINED — a `<script src>` would
trade payload for a SECOND third-party host, and the honest reading of the ruling is one host. The
delivered file went from 1.0 MB to 2.0 MB: ~803 KB of JS and ~65 KB of CSS on top of the plate this
page already carried.

**What the plate still costs, unchanged.** `MAX_SCALE = 2`: the bake writes at `deviceScaleFactor:
2`, so a 2000-unit camera frame is a 4000 px raster and there are exactly two raster pixels per plate
unit. The camera is **clamped** there rather than allowed past it, so a beat can ask for a deeper
zoom than it paid for and get a shallower one — never a blurred one. Measured at the deepest camera:
**1.00 raster px per delivered px at 1600×900 and at 1280×800, 1.86 at 375×812.** This now bounds the
FALLBACK's sharpness rather than the picture's, and the reading that wanted to dive onto the Faroe
Islands is still not built, for the same reason it never was.

## How the scroll drives the camera

`map-drive.mjs` is **one implementation used twice**: `MapFrame.tsx` imports it in node to SSR the
opening camera; `render.mjs` inlines the same file into the page to drive the rest.

- **The camera is one CSS transform**, written to THREE boxes on every frame — the baked plate, this
  beat's own shapes, and (through `viewForCamera`) the live MapTiler map. One resolved camera, three
  consumers: a plate coordinate becomes a place by the same Mercator the bake used, and the live
  zoom is the bake's own plus `log2(scale)`, so the tiles and the vector overlay cannot disagree
  about where the camera is. Two derivations of one camera is the defect class this project has
  already paid for twice.
- **The span interpolates in LOG space** (`logSpanX`/`logSpanY` are the state's fields), so a lerp in
  state space is a constant-rate zoom in what the eye sees rather than a flight that races at the
  start and crawls at the end.
- **`fit` is a field of the state, interpolated like any other.** Europe is near-square once
  projected; the band above the prose lane is roughly 3:1. Cover a whole-continent camera into that
  band and half the continent is cropped — measured on the first build, where the opening frame cut
  Iceland, the Faroes, Spain and Italy while the sentence over it named the Faroes as the map's
  highest figure. Contain a close camera into it and a TALL subject zooms OUT: the Low Countries box
  is 502 units tall against a 525 px band, and contain resolved to a shallower scale than the step
  before it. So an overview carries `fit: 0` (contained in the whole frame, its lower third under the
  prose lane, which is what a map's sea is for) and a close reading carries `fit: 1` (covering, and
  centred in the content band so its subject is above the panel). The scale and the vertical centre
  both travel with it.
- **Highlighting is four opacity writes, not 41 fill rewrites**: one veil rectangle of the ground
  over the whole plate, and three groups of re-drawn paths above it that come back to full strength.
- **Progress is READ, never re-derived.** `scrolly` publishes `data-progress` on its own root on
  every scroll — the fractional index of the panel on the lane's centre line, interpolated between the
  two card centres that bracket it — and this driver reads it. It used to derive its own from panel
  overlaps against a band at the bottom `data-prose-lane`% of the scrollport, which was right while a
  panel PARKED there and became meaningless the moment the vehicle's eighth correction moved the
  prose into its own travelling column. **Measured on the delivered file at 1600×900 before the
  repair: the scaffold's `data-progress` ran a clean 0 → 3 while this beat's `data-position` read
  0.000 at seven probes of eleven and a whole integer at the other four.** Four stills and a fade.
  The repair is having one opinion instead of two; `data-prose-lane` is deliberately no longer read,
  because bending that number to make a consumer's sums work would be corrupting a value to fit its
  reader.
- **The camera is therefore always in motion.** With a continuous 0 → 3 the centre travels, the span
  changes geometrically, the fit interpolates and the veil and the three highlight groups cross-fade,
  every animation frame. Driven at three widths in both directions, **every frame on which the signal
  moved and the step did not moved the camera's own transform** — 92/92, 81/81, 27/27.
- **Nothing depends on the document scrolling**, or on the layout at all: the one number this beat
  needs is on an ancestor element, so the vehicle can rearrange its own boxes without this driver
  noticing — which is exactly what it failed to survive last time.
- **A resize invalidates the camera**, which reading rather than deriving made necessary: the derived
  number always changed when the scrollport did, and a published progress can be bit-identical across
  a resize while the frame it resolves against is a different shape.

## Reduced motion

A camera that flies is precisely what `prefers-reduced-motion` exists for. Under it `stateAt` snaps
to the nearer step: the reader is still taken to all four places — the camera arrives, the highlight
arrives, the words match the picture — but there is no flight, only a cut. Measured over 126
continuous positions at 1600×900: **4 distinct states, no fifth**.

## Every number, computed

`carbon-map.ts` joins the frozen CSV to the baked shapes and throws if any shape is unmatched (a
silent join failure draws as no-data, which is itself a claim). Every figure in the title and in every
step's prose is derived from that join or from the projected rings:

| Figure | Where it comes from |
| --- | --- |
| 41 countries, 1.6 → 13.0, ×8.3, median 5.1 | the joined values, sorted |
| Czechia 7.7 / Hungary 4.2 | the highest and lowest of the six named central countries — the region is an editorial choice, which country is which is not |
| Luxembourg 10.3, rank 2 | the join; `render.mjs` throws if it is not rank 2 |
| 1.3% of the map's width | its projected bounding box over the plate's own width |
| 13 of 41, 30.8% of the painted land, 1.5 t of 11.5 t | the median band, and the shoelace area of every ring |

"Painted land" is deliberately the area of the picture, not real land area: Mercator inflates the
north, and what the sentence is about is how much of the MAP a reader's eye is spending on countries
that are all the same colour.

## What was driven, and what it found

`drive.mjs` scrolls the real file in real Chrome at 1600×900, 1280×800 and 375×812, **down and back
up**, in 30 px increments with **no settle wait**. At each increment it records the scaffold's
published progress, this beat's echo of it, the camera read off the element (centre, span, scale,
whether the clamp bit, raster px per delivered px), which step is painted, **a fingerprint of
everything the driver wrote into the DOM**, and every label's box.

**The fingerprint is the assertion whose absence let a slideshow ship.** Every guard here used to be
about ARRIVAL — the right camera, the right panel, no collision — and a camera that jumps between
four positions satisfies all of them, because they only look at a settled state. `scroll-report.mjs`'s
`fluidity` asks the other question: on the frames where the ACTIVE STEP does not change and the
signal does, does the picture? Two fingerprints are taken, one over everything positional (the
camera transform, each label's offset, the leader path) and one over that plus every opacity, so a
step that merely cross-fades shows up as a gap between them rather than passing as motion. Frames
where the signal itself is CLAMPED — the head and tail of the piece — are counted and exempted, and
a held signal anywhere else is its own problem.

Final run, on the delivered file at three widths in both directions, **0 problems**:

| | 1600×900 | 1280×800 | 375×812 |
| --- | --- | --- | --- |
| samples per sweep | 126 | 109 | 91 |
| progress span | 0 → 3 / 3 → 0 | 0 → 3 / 3 → 0 | 0 → 3 / 3 → 0 |
| intra-step frames where the CAMERA moved | 113 / 113 | 97 / 97 | 81 / 81 |
| frames where only an opacity moved | 0 | 0 | 0 |
| clamped frames, exempted | 9 | 8 | 6 |
| beat's position vs scaffold's progress, worst | 0.0005 | 0.0005 | 0.0005 |
| painted step vs progress, worst | 0.58 | 0.56 | 0.56 |
| tallest panel, as a fraction of the scrollport | 0.161 | 0.187 | 0.268 |

The plate's own budget, over all **652 driven frames** rather than over the four authored cameras —
because between two readings the camera passes through scales no authored state has: **1.00 raster
pixels per delivered pixel at the deepest**, with the `MAX_SCALE` clamp biting on 158 of them. Since
the live layer landed that number bounds the FALLBACK's sharpness rather than the picture's. That
field used to read `Math.min(...[].concat(...[]))`, which is `Infinity` and serialises as `null` —
a measurement that measured nothing.

What it found, in order:

1. **The opening camera cropped half the continent** while the prose over it named the Faroe Islands.
   Fixed by making `fit` part of the state (above) — not by moving the camera.
2. **Two labels left the viewport at 375×812**, and one pinned at the top guard had its own top edge
   at −6 px. The pure placement clamps against the frame; it cannot know the label's own width. The
   driver now clamps against the measured box and draws a leader when it does.
3. **The credit went illegible at reading 2** — muted ink straight onto a dark choropleth fill; the
   second half of it disappeared into Germany. Legend and credit ride an opaque chip of the ground.
4. **The credit moved into the prose lane twice, in opposite directions**, while the header was being
   shortened — because it was positioned by a `top` percentage of a frame whose height changes with
   the header's own wrap. Anchored from the BOTTOM now.
5. **The camera froze, and every guard stayed green.** The vehicle's eighth correction moved the
   prose out of the graphic's box; this beat kept measuring panel overlaps against a band inside it,
   found nothing there for most of every step, and published position 0. Measured above. Closed by
   reading `data-progress`, and by an assertion that the beat's own published position and the
   scaffold's differ by no more than rounding.
6. **The credit sat in the middle of the map** — anchored above a prose lane nothing goes into any
   more. At 1600×900 the box floated 235 px above the frame's floor, over the Atlantic; at 375×812
   it covered the "Belgium 7.2" label outright and clipped "Luxembourg 10.3", **17 label-under-credit
   collisions per sweep**. It is at the floor now, and `scroll-report.mjs` asserts on every frame
   that nothing the frame annotates sits under it.

Screenshots in `drive/`: four settled cameras at each width, plus a **mid-flight** frame at position
2.5, which is where the camera is actually in motion and where a sampled probe never looks.

## Which vehicle these artifacts were built against — read this before re-rendering

`render/one-map-four-readings.html` and every number above were produced against the **committed**
`scrolly` at **`6dcb5243`, the NINTH correction**, where the prose card is centred, opaque, and
travels OVER the graphic. The previous round of this beat was built against the eighth and said so
here; that round's own warning has now been discharged, and this is what it found:

- **The signal survived the change**, as predicted: the ninth writes `data-progress` on the same root
  at the same four decimals, and the fluidity is **113/113, 97/97 and 81/81** intra-step frames
  moving the camera, 0 frames where only an opacity changed, position-vs-progress disagreement
  0.0005, span a full 0 → 3, both directions.
- **`scroll-report.mjs`'s collision assertion did NOT survive, and it was REPLACED rather than
  widened.** The eighth guaranteed a card could never reach a label; the ninth trades that guarantee
  away deliberately and states its successor in its own discipline file — a label *covered whole* is
  what a card over a picture means and is allowed, a label *sliced down its side* by one of the
  card's vertical edges is broken text and is not. That is what this beat now asserts, on every
  frame, for everything the frame annotates.
- **It found two real defects on the first run, both fixed**: the credit ran into the card's left
  edge and was sliced on 76 frames per sweep at 1280×800 (its width is capped to the card's own
  gutter now, by a media query, because an inline style cannot ask which of the card's two width
  regimes is in force), and "Hungary 4.2" straddled the same edge on 4 frames per sweep in both
  directions (`avoidStripe` moves a straddling label to the nearer whole side, and `stripeOf`
  measures the card rather than re-deriving the vehicle's `min(46ch, 100%)` and its 600px
  breakpoint). **6 of 6 sweeps, 0 problems.**

## The dead lane — RECLAIMED

The previous round measured this band and left it, naming both reasons: every beat carries its own
copy of the constant, and the vehicle's `proseLane` was validated `0 < x < 0.6` and could not express
"none". The ninth's `renderScrolly` accepts 0, and its own discipline file settles the argument —
the card crosses every row of the frame equally often, and at the moment a step's sentence is on the
lane's centre line the card is dead centre, so a band at the bottom protected the one place the card
never dwells. **`PROSE_LANE` is 0.** The 36% of the frame it held is the map's again, which is also
what *"la map doit prendre toute la largeur"* means about the other axis.

Two residues the previous round named at 375×812 are gone with it: the three Low Countries labels no
longer stack in a 225px content band, and "Belgium 7.2" is no longer squeezed out from under
"Luxembourg 10.3" — 6 of 6 sweeps report 0 problems at that width. The legend is still fixed at the
top-left and label placement still does not know it is there; that one is label-placement work on a
short frame and is unchanged.

## JavaScript disabled

The map is SSR'd at its opening camera inside the frame the scaffold marks active by default, so with
no script a reader gets the whole continent, all 41 shades, the legend, the credit and every step's
prose. Measured on the delivered file with JavaScript off: visual present, **41 shapes**, plate inline
as `data:`, **0 external requests**, 4 paragraphs, wrapper opacity 1. That is still true after the
live layer landed, and it is the point of the two-layer shape rather than a leftover: nothing
requests `api.maptiler.com` until a script boots, so a no-JS reader gets the baked plate — the whole
opening camera, every shade, the legend and the credit.

## Colours

`PALETTE.md` beside this beat, read through `readPalette`. The ramp IS the quantity and is derived
`ground → ink`, so no hue is picked for a class; the accent is spent only on the outline of whatever
a reading is about (geo-discipline rule 8). Water and no-data are basemap doctrine constants from
`geo-choropleth.ts`, not palette choices — stated in that file with the measurements.

## Credits

At the **bottom of the visual** — the frame's own floor, 8 px up, anchored from the bottom, on an
opaque chip. Full provenance — indicator, shapes, basemap, capture size, and that the file makes no
request — is in the header, which under the fixed-page model never scrolls away.

## What the vehicle is missing — reported, not patched around

Same finding as the sibling chart beat: `scrolly`'s contract is N pictures with exactly one
painted, and a beat whose visual is ONE persistent element has no way to declare it. The driver moves
its own node out of the per-step stack on load and the scaffold gets empty wrappers for steps 2–4. It
degrades correctly with no JavaScript, and it is a workaround for a missing mode.

## Files

- `co2-per-capita-2023.csv` — the frozen values, 41 European countries, 2023.
- `countries.geojson` — Natural Earth 1:50m shapes, keyed on `ADM0_A3`.
- `geo-choropleth.ts` — this beat's own copy of the join, the classes, the ramp and the ring
  arithmetic. A beat carries its own copy; nothing is imported across beats or out of a skill.
- `bake.mjs` — the ONE capture, now the FALLBACK layer's own picture. Run once; the key is read at bake time and never reaches the output.
- `plate/plate.png`, `plate/geometry.json` — the frozen plate (4000 × 4000) and the projected rings.
- `carbon-map.ts` — the reading layer and the cameras, derived from the projected shapes.
- `map-drive.mjs` — the camera and the scroll driver, one implementation, used at SSR and inlined.
- `MapFrame.tsx` — the one map, SSR'd at its opening camera.
- `render.mjs` — the runner: the four cameras, the four steps, the resolution budget it prints.
- `PALETTE.md` — the recorded colour answer and the reasoning behind it.
- `live-scroll-map.mjs` — the live MapTiler layer: the projection, the camera, and the warm.
- `verify-live-tiles.mjs` — the browser probe that measures whether the tiles keep up with a
  thumb, against a keyed copy written outside the tree. Opt-in: it needs a real key and a real
  network, and the committed artifact must never spend a newsroom's quota.
- `render/one-map-four-readings.html` — the delivered file. Self-contained apart from the one host
  the ruling accepts, `api.maptiler.com`, and carrying the placeholder rather than a key.
- `drive.mjs`, `drive/` — the browser run and what it saw, including `drive-report.json`.
- `scroll-report.mjs` — the pure half of the driving: what a swept sample sequence MEANS.
- `scroll.test.ts` — the guards on that, and on `readProgress`, each with the mutation that reddens
  it pasted into the file's own header.
