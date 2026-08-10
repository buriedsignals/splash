# The camera at every scale — what was produced, and what each rung showed

B4.1: *"la production doit fonctionner pour N'IMPORTE QUELLE zone de cadrage — la planète entière,
plusieurs continents ou pays, un continent, un pays, une région, une ville."*
B4.2: *"une zone plus large demande un rendu différent"* — so everything stays visible and reachable
inside the map.

Produced by `bun skills/twin-map-beat/scripts/extent-range.mjs --data proof/map-quake-density/quakes-density.csv --size 900`
on 2026-08-11. Real MapTiler `dataviz-light`, real `fitBounds`, the same capture gate the bakes use.
One frozen catalogue — USGS M4+ for 2024, the 14 175 rows `proof/map-quake-density` already carries —
and six cameras derived from where that catalogue's own density puts them. Every number below is read
off `range.json`, which the same run wrote.

**This is a probe, not a beat.** It has no claim, no BRIEF and no data of its own. It exists because
a camera that has never been run at a scale is a camera nobody has tested, and the tree's sixteen
committed cameras had a **138× hole** in the middle of their range with nothing in it.

## The hole this closes, measured before it was closed

Every committed `plate/geometry.json`, by the ground its frame actually covers:

| rung | ground width | beats in the tree, before this |
|---|---|---|
| planet | ≥ 10 019 km | 4 — the quake hex family, 39 600–39 693 km |
| hemisphere | 2 505–10 019 km | 6 — the quake symbols and the Europe family, 4 125–8 839 km |
| continent | 626–2 505 km | 3 — the Danube corridor, 1 821–1 873 km |
| **country** | **156–626 km** | **0** |
| **region** | **39–156 km** | **0** |
| city | < 39 km | 3 — the Geneva locator, 11–13 km |

The two rungs a local newsroom asks for most had never been produced. The rung boundaries are powers
of four of the Earth's own equatorial circumference, so each is exactly two zoom levels wide and the
ladder has one anchor and no free parameter (`assets/geo.ts`, `extentBand`).

## What the six cameras showed

| rung | ground | zoom | lon span | rows in frame | admitted lon / lat | Mercator area bias | median mark gap | mark radius | metres per pixel |
|---|---|---|---|---|---|---|---|---|---|
| planet | 40 053 km | 0.815 | 359.8° | 14 094 | ×1.00 / ×1.35 | **×131.7** | 0.45 px | 1.5 px (floor) | 44 503 |
| hemisphere | 5 023 km | 3.786 | 45.9° | 4 165 | ×1.00 / ×1.00 | ×1.40 | 1.49 px | 1.5 px (floor) | 5 581 |
| continent | 1 253 km | 5.721 | 12.0° | 1 317 | ×1.46 / ×1.01 | ×1.16 | 4.63 px | 2.31 px | 1 392 |
| country | 313 km | 7.681 | 3.08° | 446 | ×1.01 / ×1.04 | ×1.05 | 3.61 px | 1.80 px | 348 |
| region | 78 km | 9.684 | 0.769° | 365 | ×1.07 / ×1.01 | ×1.01 | 13.22 px | 6.61 px | 87 |
| city | 20 km | 11.403 | 0.234° | 108 | ×1.03 / ×1.01 | ×1.01 | 38.24 px | 19.12 px | 21.7 |

Captures: `basemap-<rung>.png` (the ground alone) and `marks-<rung>.png` (the same camera with the
events drawn at the radius this camera implies). Opened and looked at, all twelve.

**The full measured range is 2 047× in metres per pixel — 40 053 km of ground down to 20 km — through
one `fitBounds`, one style, one capture gate and one set of derivations.** Nothing in the machinery is
per-rung. What changes is what the numbers say, and what the numbers say changes the render.

## What changes as the extent grows, and what was measured to decide it

### 1. The mark size, by a factor of 12.7

`markRadiusCeilingPx` derives the biggest mark from the plate's own **median** nearest-neighbour
distance — not its minimum, because one pathological pair (`map-geneva-locator` has two
organisations **0.57 px apart**, in the same building) would otherwise shrink every mark on the map
to nothing. At the median gap the typical pair exactly touches.

Across the six rungs that is **1.5 px to 19.1 px on an identical 900 px frame**, from an identical
catalogue. Today no map beat derives it: four typed answers to "how big is the biggest circle" ship
in the symbol family alone (`MAX_RADIUS = 30`, `= 46`, `STILL_MAX_RADIUS = 30`,
`MARK_MAX_RADIUS_FRACTION = 0.045` / `0.062`), each tuned by eye against its own beat's extent.
Applied to `mapgen-symbol-web`'s committed plate, whose median gap is 26.06 px, the ceiling is
**13.0 px against the 30 px it draws — today's marks are 2.3× the size at which the typical pair
stops overlapping.**

**And the derivation reproduces, from the numbers alone, a type choice the beats made by hand.** At
planet and hemisphere the median gap is 0.45 px and 1.49 px, so the ceiling falls under the 1.5 px
floor at which a circle stops being a circle: **a catalogue this dense cannot be drawn as separable
marks above the continent rung at all.** That is exactly why every planet beat in this tree is a hex
grid and not a symbol map, and it is the first time the tree can say so with a number.

Note the non-monotonicity, which is real and not noise: `country` has a smaller median gap (3.61 px)
than `continent` (4.63 px), because that camera lands on a dense aftershock sequence. **Mark size is
driven by local density, not by extent alone** — which is why it is measured on the plate rather than
derived from the frame width, and why a rule of the form "radius = fraction of frame" is wrong at
every rung by a different amount.

### 2. Whether the projection is lying, by a factor of 131

`mercatorAreaBias` is how much more ground one drawn pixel covers at the frame's most-distorted edge
than at its least-distorted one. Measured here: **×1.01 at city, ×131.7 at planet.** It reproduces
the two figures the W5 audit worked out by hand — ×6.75 for `mapgen-dot-web`'s 34.5–71.5°N band and
×24.0 for `map-quake-density`'s frame — from the committed corners.

For an **area encoding** — a dot standing for a fixed number of people in a fixed piece of ground, a
hex cell counting events per cell — that number is not decoration. `binsCrossedByProjection` asks how
many of the beat's **own legend bins** the projection alone can move a cell, so the budget is the
beat's own scale and nothing is typed. On `map-quake-density`'s published breaks (1–13 / 14–51 /
52–284 / 285–663 / 664+) the smallest adjacent step is ×2.33, and a bias of ×24.0 is **three bins**.
Two cells of identical ground density, one polar and one equatorial, are painted three classes apart
and the legend compares them as equals.

So `assertAreaEncodingIsHonest` refuses an area encoding whose caveat mentions neither Mercator, the
projection nor latitude, once the bias can move a cell one bin. It costs nothing at the continent
rung and below (×1.16 → zero bins). **It is a disclosure rule, not a correction rule**: at planet
extent nothing can be undistorted, and the reader is the one who has to be told.

### 3. How much geography the fit admitted that the sentence is not about

`admittedLonRatio` / `admittedLatRatio` — specified as W5's T12 and never built. Above 1 is ground
the reader is shown that the story did not ask for; below 1 is ground the story is about that the
reader is not shown. Measured against each beat's **own study set**, not against its hand-typed
`BEAT.bounds` box — which reports ~1.00 at 11 of 11 beats because it was tuned by eye until it
matched:

| beat | admitted lon | admitted lat |
|---|---|---|
| `mapvid-locator-geneva` | **×2.46** | **×2.86** |
| `map-geneva-locator`, `mapgen-locator-web` | ×1.97 | ×2.28 |
| `mapgen-symbol-web` | ×1.20 | ×1.27 |
| `mapmore-flow-danube` | ×1.15 | ×1.42 |
| `map-quake-density` | ×1.00 | **×0.72** — a crop, its 104 poleward events |

The city rung is the worst offender in the tree and nobody had noticed: **a beat whose title is
"All 11 of these international organisations sit inside 4.4 km" shows two and a half times the city
its claim is about.** In this probe the same number stays between ×1.00 and ×1.46 at every rung,
because the camera was derived from the study set rather than typed around it.

### 4. The basemap's own detail level — measured, and deliberately not switched

Compare `basemap-planet.png`, `basemap-country.png` and `basemap-city.png`: the same style URL, the
same request, and the provider's vector tiles carry coastline at the planet rung, motorways and
regional boundaries at the country rung, and individual tracks at the city rung. **No style
switching is needed and none is done** — a second style would be a second cartography, and a beat
whose static plate and live map disagreed about the ground would break the swap the web genre depends
on. This was the cheapest question of the four and it is answered by looking.

### 5. Which furniture survives — the leftover height IS the furniture

See below: what letterboxing frees is exactly what a caption, a legend and a source line need.

## The world map in portrait — the decision, and the picture

**A planet-extent beat cannot be given the whole height of a portrait frame.** Web Mercator's world
is a SQUARE: showing 360° across a frame `width` px wide draws the world `S = 360 × width / lonSpan`
px on a side, and that same S is its height. MapLibre will not zoom out past `S = frameHeight`,
because under it the canvas would show ground that does not exist. So a frame taller than S never
gets the longitude it asked for, whatever `fitBounds` is told. It is not the fit's arithmetic and it
cannot be patched in the fit.

Measured against the delivered artifact before anything was built: `proof/mapgen-hexgrid-web` at
375×812 draws into a 343×461 canvas and shows **266° of its 359.8°** — a quarter of the world
missing, with `maxBounds` then stopping the reader panning to it. The model says the world clamps at
S = 461 px and the frame shows 360 × 343 / 461 = **267.8°**; the 1.8° difference is the fit's own
padding.

Driven here at the export size, both ways, and the prediction is exact:

| | stage | longitude shown | zoom |
|---|---|---|---|
| the whole frame height, as ships today | 1080×1920 | **202.5°** | 1.907 |
| the model's prediction for that frame | — | **202.5°** | — |
| letterboxed to the stage the geography can fill | 1080×1080 | **359.8°** | 1.078 |

`portrait-forced-planet.png` and `portrait-letterboxed-planet.png`. Open them side by side: the
forced one has lost the entire western Pacific — Japan, the Philippines, Indonesia, New Zealand and
the Tonga trench, which is where **the story's own headline cell is**.

**THE RULE, decided and implemented:**

> A map is never given more stage height than its own geography can fill. Where a frame is taller
> than the geography admits, the map takes the height the geography demands and the leftover goes to
> **furniture** — never to a wider camera, and never to a crop.

At 1080×1920 that is a 1080×1080 stage and **840 px of furniture**: enough for a title, a legend, a
caveat and a source line at the portrait row's own 36 px type floor. `stageBoxFor` returns it,
`assertStageServesGeography` refuses the frame that ignores it and names both honest options —
letterbox, or narrow the study set and say what was left out. Stretching is not one of them; the
genre would rather draw a smaller true map than a larger false one.

**The rule costs nothing anywhere else.** It bites only where the frame's aspect exceeds
360 / lonSpan — at 1080×1920 that is any study set wider than **202.5°**. Europe (59°), the Danube
(23.7°) and Geneva (0.137°) are untouched at all three export sizes, verified in `geo.test.ts`.

## What this probe does NOT close

- **The two empty rungs still have no BEAT.** Six cameras were produced and looked at; a beat needs a
  claim, a BRIEF and its own frozen data, and inventing one to fill a table is the failure this tree
  has already been burnt by. `country` and `region` remain zero in the beat census.
- **The label layer.** How many labels an extent can carry is the other half of B4.2 and it is not
  derived here: `map-geneva-locator` still draws 5 labels for 11 markers and nothing counts it.
- **The typed constants stay typed.** `markRadiusCeilingPx` exists and is proved against the
  committed plates; wiring it into `QuakeSymbolStill.tsx` / `QuakeSymbolVideo.tsx` /
  `QuakeSymbolWeb.tsx` touches components another chantier holds.
- **The dot type's own collision with zoom.** A ground-constant field must keep its ground area, so
  its screen radius halves per zoom level — the opposite rule to a proportional symbol's. The
  derivation for that is stated in the doctrine and is not implemented here.
