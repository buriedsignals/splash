# Beat — following the Danube in four scroll steps, the map only ever gaining ground

**Type:** flow / route map, carried by the scroll vehicle. **Medium/genre:** map / scrolly.
**Channel:** article web, one self-contained `render/danube-scrolly.html` (1 092 022 bytes — the
plate and maplibre-gl both inlined; 177 109 without the live layer, which is the measured price of
the ruling), **four steps**, **one fixed camera** on a **LIVE MapTiler basemap**, with
the beat's own 900 × 420 capture frozen underneath as the fallback.

## The basemap is LIVE MapTiler (2026-08-10) — and what that overturned

The owner drove this page and said: *"j'ai l'impression que le scrolly map n'utilise pas MapTiler
correctement, je ne vois aucun canvas dans le DOM. Or il faut tout le temps utiliser MapTiler."* He
was right about the fact. `grep -c 'maplibregl\|api.maptiler.com'` over the delivered file returned
**0**, and the live DOM held **0** `<canvas>`: this page was a baked SVG plate and nothing else.
After: **449** occurrences of `maplibregl`, **3** of `api.maptiler.com` (one style URL, two in a
doc-comment), and **1** `<canvas>` in the live DOM once a key is substituted.

**The argument that kept the plate, kept and marked overturned.** It was not an oversight. A
scrolly's camera is authored and finite; this beat's camera does not move at all, so one capture can
hold *everything the reader will ever see*, and a tile server is then a live dependency taken on for
no new picture. That is a real argument. It was answered rather than accepted:

- **The camera is warmed before the live layer is revealed** — and the measurement says the warm
  buys this beat almost nothing, which is worth writing down rather than quietly claiming a saving.
  `warmCameras` walks the camera through MapLibre's own machinery and waits for `idle`. Measured
  (`verify-live-tiles.mjs`, real key, real network): **1 camera, 17–34 ms at 1600 × 900 and 166 ms
  at 375 × 812, 10 and 8 tile requests**. A scrub at 30 / 120 / 400 px per animation frame then
  issued **0 new requests**, met **0 frames with an outstanding tile**, and settled in **1–3 ms**.
  **The `--no-warm` control measures the same thing**: 10 requests, 0 / 0 / 0 missing frames, settle
  1–6 ms. That is not the warm failing; it is the consequence of having ONE camera. The map is
  constructed already pointing at it, so MapLibre's own `load` already means those tiles arrived,
  and all the warm adds is the stricter `idle`. It is kept because a reveal that waits for quiet is
  the right shape and because the cost is a third of a frame — not because it saves a reader from
  grey squares here. On a beat whose camera flies, it does; this one is the degenerate case, and
  saying so is cheaper than a future reader re-measuring it.
- **The baked plate stays underneath, never instead of.** A rotated key, a spending limit, a CMS
  that blocks `api.maptiler.com` or no network at all leaves the reader exactly the picture this
  beat shipped before the ruling — measured: with the committed placeholder in place the driven page
  reports **0 canvases** and every scroll guard still passes.
- **No controls, and it is a deliberate difference from map × web.** The owner, same day: *"Pas de
  controls sur le scrolly, le scroll pilote et la map doit prendre toute la largeur."* The map is
  `interactive: false` — no drag, no wheel, no double-click zoom, no keyboard pan, no touch, no
  `NavigationControl`. Where R1 *requires* the controls on a map × web beat, here the scroll is the
  only thing that drives the piece, and a reader-moved camera would be taken back on the next scroll
  event. `verify-live-tiles.mjs` asserts **0** control buttons on the live DOM. Do not "fix" this.

## What fills what

- **The LIVE TILES fill the frame, edge to edge and top to bottom** — the container is `inset: 0`
  and a MapLibre canvas fills its container. That is *"la map doit prendre toute la largeur"*, and
  its height with it.
- **The plate and the marks are drawn at the CONTAIN fit** — computed by `route-drive.mjs`'s
  `containCamera`, not left to `preserveAspectRatio`, because live tiles under an implicit fit land
  wherever they land. The plate is 2.14 : 1 and every frame this beat is verified at is narrower
  than that per unit of height, so the **width binds** and the marks also span the frame edge to
  edge; what letterboxes is the top and bottom, and where the plate ends the live tiles keep
  painting. Measured fits: **1.778× at 1600 × 820, 1.422× at 1280 × 720, 0.417× at 375 × 617**,
  i.e. live zooms 5.569 / 5.247 / 3.476 on one unchanging centre (18.150 E, 46.479 N).
- **Never COVER.** A cover fit crops, and this beat has already paid for that once: it took the
  plate's right edge away and badge 9 — Ukraine, the delta — never rendered at all, in the step
  whose own sentence is about the delta. `scroll.test.ts` M7 is that mutation.
- **Consequence, stated rather than discovered:** at 375 px the marks are a 175 px band in a 617 px
  graphic. Before the live layer that band sat in bare white; now the rest of the frame is real
  basemap, which is the difference between a stranded strip and a wide map on a narrow screen.

## The reveal is continuous (2026-08-10)

The vehicle was handed FOUR SSR'd pictures and swapped which one was painted, so between two steps
nothing happened at all — the same shape the sibling beat's owner named as *"faut que ce soit fluide
et que l'élément évolue au fur et à mesure du temps."* It is now handed ONE picture: the line's
length and each territory's opacity are functions of the scaffold's published `data-progress`. The
four authored states are unchanged — the interpolation passes exactly through them, because each
territory's arrival threshold is its own first route index and each step's cutoff is the next
territory's.

Driven continuously, both directions, three widths (`drive.mjs`, 30 px per increment, no settle
wait): **0 problems on 6 of 6 sweeps**; intra-step frames where the signal moved and the picture had
to move with it **113 / 113 / 99 / 99 / 84 / 84**, of which the *geometry* moved on **112 / 113 / 99
/ 98 / 84 / 84** — `fractionMoving` 0.99–1.00, against 0 for the swap-a-picture build. The revealed
share of the route's own length spans **0.361 → 1.000** on every sweep with **0 backtrack**. The
beat's own position agrees with the scaffold's progress to **0.0005**, and the painted step is never
more than **0.58** from the published progress (the vehicle's own crossover ceiling is 0.6).

## Claim

The Danube touches ten countries and nine of them can be drawn; scrolled, they arrive in the order
the river reaches them, and the map never loses ground it has gained. Each step adds territories and
extends the line; nothing already revealed is taken away.

## Data

- Source: river course — Natural Earth 1:10m Rivers + Lake Centerlines; territory shapes — Natural
  Earth 1:50m Admin 0 Countries.
- `danube-route.csv`: **911 points**, `seq` 0 → 910, strictly consecutive. Byte-identical (same md5)
  to `proof/mapmore-flow-danube` and `proof/mapgen-flowmap-video`.
- `countries.geojson`: 16 territories, Moldova included.

## Exact values — computed 2026-08-09, and every number in the prose is derived, not typed

The step prose is a FUNCTION of the computed facts, not a literal string — this beat had three false
statements in an earlier literal version, so the numbers now come from the route:

- **"two countries before Vienna"** (step 1). Recomputed: the nearest route sample to Vienna
  (16.3738, 48.2082) is **index 342**, 3.9 km from the city. First entry indices are Germany 0,
  Austria 249, **Slovakia 355** — so exactly **two** countries are touched by index 342. Slovakia's
  first entry comes *after* Vienna, which is why the earlier "three" was wrong.
- **"close to 440 km"** for the Romania–Bulgaria border zigzag (step 3). Recomputed: Bulgaria is the
  rarer label along the route (51 points against Romania's 174), first at index 722, last at index
  810; the great-circle distance along the route between them is **438.1 km**, which rounds to 440.
- **The Iron Gate is named in step 3, not step 2.** The gorge's nearest route sample is **index
  682**; step 2 ("plain") stops revealing at index 639, so naming it there described a stretch the
  graphic had not yet drawn. Step 3 reveals through index 898, well past it.
- The dropped superlative was right to drop: Germany's own opening run measures **534 km**, longer
  than the 438 km Romania–Bulgaria stretch, so "the longest single stretch of the whole journey" was
  false.
- **Moldova: 0 of 911 points** — the reason only nine of ten appear.
- Crossing order, derived: Germany → Austria → Slovakia → Hungary → Croatia → Serbia → Romania →
  Bulgaria → Ukraine.

## Subject and accent

One accent, `#E69F00`, on the route alone; territories take a separate categorical cycle that
excludes it. Numbered badges carry order.

## Step order — cumulative, never subtractive

| Step | Adds | Line revealed through |
| --- | --- | --- |
| `source` | Germany, Austria, Slovakia | Hungary's own first index |
| `plain` | Hungary, Croatia, Serbia | Romania's own first index |
| `border-run` | Romania, Bulgaria | Ukraine's own first index |
| `delta` | Ukraine | end of route |

Each step's territory set is its own countries PLUS every earlier step's, so the map only ever gains
ground — which is what "the map advances" has to mean for a route. The line is revealed through the
NEXT territory's first index rather than the current one's, so it visibly reaches the badge it is
about to introduce instead of stopping short of it.

## Anti-patterns for this case

- **A scrolly must carry different states, not the same picture four times.** The test this beat has
  to pass is whether each step shows something the previous one did not; here each adds territories
  and extends the line, and if it did not, this should have been an animated beat instead.
- **And "different states" is not enough either.** Four states satisfied every guard this beat had
  while a reader who scrolled between two of them saw nothing move for the whole of a step. The
  question a route beat has to answer is whether the LINE advances with the reader; `drive.mjs` and
  `scroll-report.mjs`'s `revealSpan` measure it, and a fluidity number is not a substitute — a page
  whose badges jitter by a pixel while the river runs backwards passes fluidity perfectly.
- **Never let the prose name something the graphic has not drawn yet.** The Iron Gate case is the
  worked example: index 682 named in a step that stops at 639. Any place named in a step's prose has
  to sit at or before that step's own reveal cutoff, and the cutoff is a number, so it can be
  checked.
- Derive every count and distance in the prose from the route. All three of this beat's earlier
  defects were hand-typed values: a count, a superlative and a place.
- "Crossed" is not "flowed through" — the river IS the border for long stretches, and the closing
  step carries Moldova's exclusion rather than quietly rounding ten down to nine.
- One camera, and it still is one — the scroll adds territories and extends the line, it never flies
  anywhere (geo-discipline rule 2, "move within the plate"). Re-baking or re-pointing per step would
  move the ground under the reader while the line is moving.
  **Corrected 2026-08-10:** this line used to read *"the plate is baked once and shared with the
  static sibling."* Half of that is no longer true and the other half never was after `bake.mjs` was
  copied in — the capture is this beat's OWN, frozen in `plate/` beside it, precisely so the beat
  does not depend on another beat's scratch directory. And it is no longer the basemap at all: it is
  the FALLBACK under a live MapTiler layer. What survives is the part that matters — one camera,
  captured once, never re-pointed per step.
- The badges are HTML at a fixed pixel size, not SVG text inside the camera. Text inside the camera
  scales with it: at 375 px the contain fit is 0.417, which drew a 12 px numeral at 5 px. Moving
  them out is also what lets `avoidStripe` keep them off the prose card's vertical edges — and on
  this beat that matters more than on one with a flying camera, because a badge that straddles a
  card edge here straddles it at *every* scroll position.

## Source line

`River course: Natural Earth 1:10m Rivers + Lake Centerlines. Territory shapes: Natural Earth 1:50m Admin 0 Countries. Basemap: LIVE MapTiler dataviz-light tiles, one fixed camera the scroll never moves; the 900×420 capture frozen beside this beat stays underneath as the fallback.`

Kept SHORT deliberately. Under the fixed-page model the header never scrolls away, so every word
costs graphic height at *every* scroll position: the first draft of this line repeated the ©
attribution the on-map credit already carries, wrapped to eight lines at 375 × 812 and took 215 px
of 812 away from the map. Trimmed, the graphic gets 617 px instead of 590.

## Credit on the map

`Basemap © MapTiler © OpenStreetMap`, anchored to the frame's own floor. It is not decoration:
`attributionControl: false` removes MapLibre's own credit from the canvas, so the obligation lands
on the beat. `scroll-report.mjs` asserts on every driven frame that nothing this frame annotates
sits under it.
