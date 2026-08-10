# One map, four readings — CO₂ per person across 41 European countries, 2023

A scroll-driven interactive. **One map. The scroll drives the camera** — it flies, zooms and settles
once per step. Nothing is redrawn, nothing is re-projected, no second picture is loaded: it is the
same baked plate and the same 41 shapes throughout, seen from four places.

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

## Baked plate versus live tiles — the decision, argued

**This beat keeps the baked plate.** `twin-doctrine/references/geo-discipline.md` rule 2 is written
for exactly this case: a moving camera needs a FIXED plate, and moves *within* it, because
re-rendering tiles per camera position resamples the basemap slightly differently every time and the
picture shimmers. That rule was written about a video's camera; a scroll-driven camera is the same
camera with the reader's thumb on the timeline.

**Ruling R1 put map × WEB on live MapTiler tiles, and it does not reach here, because the two are not
the same problem.** A free-pan map's set of camera positions is INFINITE — the reader chooses it —
and no bake can hold an infinite set, which is exactly why R1 is right about that genre. A scrolly's
camera is **authored**: four positions, known at build time, on one continuous path between them. A
finite, known set is precisely what a plate can hold. Three consequences decided it:

1. **The reader is mid-gesture.** They can scrub back and forth as fast as a trackpad allows. Live
   tiles would be fetching continuously through that gesture, and reading 3 would arrive as grey
   squares at the exact moment its own sentence names what to look at. The camera path is the one
   thing in this beat that must never wait on a network.
2. **The delivered file carries no key.** Measured on the delivered HTML with JavaScript disabled:
   41 shapes present, the plate inline as a `data:` URI, and **0 external requests** of any kind.
3. **The set is finite, so the cost is finite** — and it is one number rather than a risk.

**What the plate costs, stated rather than hidden.** `MAX_SCALE = 2`: the bake writes at
`deviceScaleFactor: 2`, so a 2000-unit camera frame is a 4000 px raster and there are exactly two
raster pixels per plate unit. The camera is **clamped** there rather than allowed past it, so a beat
can ask for a deeper zoom than it paid for and get a shallower one — never a blurred one. Measured at
the deepest camera: **1.00 raster px per delivered px at 1600×900 and at 1280×800, 1.86 at 375×812.**
The story was written to that budget. The reading that wanted to dive onto the Faroe Islands — the
single highest figure on the map, and a shape smaller still than Luxembourg — **was not built**,
because at the depth it needs the plate is being magnified past its own resolution and the honest
options were a soft basemap or a second bake. It is named in reading 1's own prose and left where the
reader can see it is small.

The alternative I did **not** take: **one baked view per step**. It is legitimate and keeps the file
self-contained, and at four sharp cameras it would have allowed the Faroes dive. It was refused
because the transition between two independently-baked views can only be a CROSSFADE, and this beat's
whole claim is that the reader is looking at ONE map the whole time. A crossfade between two plates
is exactly the "swap pictures" shape the owner ruled out.

## How the scroll drives the camera

`map-drive.mjs` is **one implementation used twice**: `MapFrame.tsx` imports it in node to SSR the
opening camera; `render.mjs` inlines the same file into the page to drive the rest.

- **The camera is one CSS transform** on a box the size of the plate, with the basemap `<img>` and
  the shapes `<svg>` both inside it at the plate's own pixel size — so they cannot fall out of
  register however far it flies.
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
- **Progress is the SAME fact the scaffold uses** — lane occupancy, with `t = 2·next/(active+next)`
  reaching 1 exactly when the argmax flips. The camera finishes arriving on the frame the sentence
  changes.
- **Nothing depends on the document scrolling.** The scrollport is found by measurement.

## Reduced motion

A camera that flies is precisely what `prefers-reduced-motion` exists for. Under it `stateAt` snaps
to the nearer step: the reader is still taken to all four places — the camera arrives, the highlight
arrives, the words match the picture — but there is no flight, only a cut. Measured over 99
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
up**, in 30 px increments with **no settle wait**. At each increment it records the driven position,
the camera read off the element (centre, span, scale, whether the clamp bit, raster px per delivered
px), which panel is painted, and every label's box.

Final run: **clean at all three widths in both directions**, position spanning the full 0 → 3 and
3 → 0, one panel at a time, no label under a panel or off the frame, the document never scrolling.

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

Screenshots in `drive/`: four settled cameras at each width, plus a **mid-flight** frame at position
2.5, which is where the camera is actually in motion and where a sampled probe never looks.

## JavaScript disabled

The map is SSR'd at its opening camera inside the frame the scaffold marks active by default, so with
no script a reader gets the whole continent, all 41 shades, the legend, the credit and every step's
prose. Measured on the delivered file with JavaScript off: visual present, **41 shapes**, plate inline
as `data:`, **0 external requests**, 4 paragraphs, wrapper opacity 1.

## Colours

`PALETTE.md` beside this beat, read through `readPalette`. The ramp IS the quantity and is derived
`ground → ink`, so no hue is picked for a class; the accent is spent only on the outline of whatever
a reading is about (geo-discipline rule 8). Water and no-data are basemap doctrine constants from
`geo-choropleth.ts`, not palette choices — stated in that file with the measurements.

## Credits

At the **bottom of the visual**, above the prose lane, anchored from the bottom, on an opaque chip.
Full provenance — indicator, shapes, basemap, capture size, and that the file makes no request — is in
the header, which under the fixed-page model never scrolls away.

## What the vehicle is missing — reported, not patched around

Same finding as the sibling chart beat: `twin-scrolly`'s contract is N pictures with exactly one
painted, and a beat whose visual is ONE persistent element has no way to declare it. The driver moves
its own node out of the per-step stack on load and the scaffold gets empty wrappers for steps 2–4. It
degrades correctly with no JavaScript, and it is a workaround for a missing mode.

## Files

- `co2-per-capita-2023.csv` — the frozen values, 41 European countries, 2023.
- `countries.geojson` — Natural Earth 1:50m shapes, keyed on `ADM0_A3`.
- `geo-choropleth.ts` — this beat's own copy of the join, the classes, the ramp and the ring
  arithmetic. A beat carries its own copy; nothing is imported across beats or out of a skill.
- `bake.mjs` — the ONE capture. Run once; the key is read at bake time and never reaches the output.
- `plate/plate.png`, `plate/geometry.json` — the frozen plate (4000 × 4000) and the projected rings.
- `carbon-map.ts` — the reading layer and the cameras, derived from the projected shapes.
- `map-drive.mjs` — the camera and the scroll driver, one implementation, used at SSR and inlined.
- `MapFrame.tsx` — the one map, SSR'd at its opening camera.
- `render.mjs` — the runner: the four cameras, the four steps, the resolution budget it prints.
- `PALETTE.md` — the recorded colour answer and the reasoning behind it.
- `render/one-map-four-readings.html` — the delivered file, self-contained, no key, no request.
- `drive.mjs`, `drive/` — the browser run and what it saw, including `drive-report.json`.
