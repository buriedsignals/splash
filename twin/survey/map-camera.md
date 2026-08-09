# Survey — the map camera

**Axis:** B4.1 / B4.2 / B5.1 / B5.3, plus the per-beat items B6.10, B6.14, B6.17, B6.18.
**Status:** read-only survey. Nothing in this survey changed a file other than this one.
**Method:** every claim below is either a file:line citation or a measurement taken from a committed
`geometry.json`. Where I could not establish something without running a bake (which needs a network
round trip to MapTiler and would write a plate), I say so instead of guessing. Two figures the brief
handed me turned out to be slightly different when measured; both are flagged in §7.

---

## 0. The one-paragraph answer

The camera is not decided once, anywhere. It is decided **sixteen times**, by sixteen hand-written
`BEAT` literals in sixteen bake scripts, and each one is then compensated for by hand-tuned pixel
constants scattered through that beat's own component. The tree already spans the full range B4.1
asks for — zoom **0.707** (the planet) to **11.398** (four Geneva blocks), a linear scale factor of
about **1,660×** — so the machinery demonstrably *can* hold a city and a planet. What it cannot do is
hold them **with the same code**: at every one of the sixteen cameras a different set of constants was
re-tuned by eye, and nothing compares those constants to each other. The two beats that did derive a
camera invariant rather than tune one (`map-quake-density`, `mapvid-hexgrid-quakes`) carry it as a
hand-copied pair, and the third beat of the same type at the same extent
(`mapgen-hexgrid-web`) **does not have it and says in a comment that it does**.

So the axis is not "make maps work at other scales". It is: **the facts about the camera that a
renderer needs are computed during the bake and then thrown away**, so every downstream decision has
to re-guess them as a pixel constant. Put those facts in `geometry.json` and derive the constants from
them, identically in each map skill, and most of B4.1/B4.2 falls out. §5 gives the smallest step.

---

## 1. How the camera is decided today

### 1.1 The chain, end to end

Every map beat runs the same five-stage chain. Taking `mapgen-choropleth-video` as the worked example
(it is the beat `geo-discipline.md` rules 8–12 were written against):

| Stage | Where | What it fixes |
|---|---|---|
| 1. Camera literal | `proof/mapgen-choropleth-video/bake.mjs:32-52` — `BEAT = { bounds, style, anchors }` | The geography, hand-typed |
| 2. Drawn size | `bake.mjs:59` — `--size`, default `620`; the header at `bake.mjs:8-10` insists it is called at the exact size the still (496) or the video (620) draws | The plate's pixel dimensions |
| 3. Fit | `bake.mjs:143-189`, `new maplibregl.Map({ bounds, fitBoundsOptions: { padding: 0, animate: false } })` | MapLibre chooses zoom + centre |
| 4. Projection | `bake.mjs:210-218` (`map.project()` for anchors) and the shapes loop | Pixel rings + projected anchors |
| 5. `geometry.json` | `bake.mjs:249-258` | The handoff to both genres |

`geometry.json` is the entire contract between the camera and everything downstream. Measured on the
committed files, it carries: `frame {width,height}`, `bounds`, `style`, `gatedBy`, `zoom`, then a
type-specific payload (`shapes` / `points` / `route` + `crossings` + `territories`) and, for
polygon types, `anchors`.

The component then reads it and re-scales:

```
proof/mapgen-choropleth-video/ChoroplethStill.tsx:114
  const scale = MAP / geometry.frame.width;
```

and draws the plate and the rings under that one uniform transform
(`ChoroplethStill.tsx:207`, `<g transform={scale(${scale})}>`).

### 1.2 What is per-beat and what is shared

**Per-beat (all sixteen):** the whole of stages 1–4. Every beat owns a physical copy of the bake
script (`bake.mjs` in 12 beats, `bake-plate.mjs` in 4) and a physical copy of the geometry core
(`geo-choropleth.ts`, `geo-symbol.ts`, `geo-hex.ts`, `geo-dot.ts`, `geo-flow.ts`, `geo-locator.ts`).

**Shared:** nothing, at runtime. And nothing at test time either. Measured:

- No two `geo-*.ts` files in the tree are byte-identical — sixteen files, sixteen distinct md5s.
- `skills/splash-twin/test/render-still-parity.test.ts` walks the tree, but only for files
  **named `render-still.mjs`**. Its own header names the hole at line 48-51: *"Anything about a
  helper duplicated in a file NOT named `render-still.mjs` … stays that way until someone does this
  same walk for them."*
- `skills/splash-twin/test/helper-parity.test.ts` imports a hand-written list
  (`helper-parity.test.ts:61-124`): `measureText`, `deriveFurniture`, `contrast`, `parsePalette`,
  `wrap`, and the video timing vocabulary. **Not one `geo-*` or `bake*` function appears in it.**
- `skills/twin-map-beat/test/geo.test.ts:2-20` imports only `../assets/geo` — the skill's own copy.
  The sixteen `proof/` copies are exercised by nothing and compared to nothing.

So: **the map camera and every geometry helper that depends on it are the largest unguarded
duplication family in the tree.** That is the single most important structural fact in this survey,
and §5 is written around it.

### 1.3 The sixteen cameras, measured

Read out of the committed `geometry.json` files (`bounds`, `frame`, `zoom`):

| Plate | zoom | frame | aspect | lon span | lat span |
|---|---|---|---|---|---|
| `map-quake-density` | 0.707 | 836×480 | 1.742 | 360° | 138° |
| `mapgen-hexgrid-web` | 0.708 | 836×520 | 1.608 | 359.8° | 138° |
| `mapvid-hexgrid-quakes` | 0.877 | 940×540 | 1.741 | 360° | 138° |
| `map-quake-symbol/plate-496` | 2.071 | 496×496 | 1.0 | 83° | 72° |
| `map-quake-symbol/plate-620` | 2.393 | 620×620 | 1.0 | 83° | 72° |
| `mapgen-choropleth-video/plate-496` | 2.563 | 496×496 | 1.0 | 59° | 31° |
| `mapgen-choropleth-web` | 2.563 | 496×496 | 1.0 | 59° | 31° |
| `mapgen-choropleth-video/plate-620` | 2.885 | 620×620 | 1.0 | 59° | 31° |
| `mapgen-symbol-web` | 3.083 | 1000×1000 | 1.0 | 83° | 72° |
| `mapmore-dot-population` | 3.345 | 860×760 | 1.132 | 59° | 31° |
| `mapgen-dot-web` | 3.388 | 1000×1000 | 1.0 | 66° | 37° |
| `mapvid-dot-population` | 3.467 | 936×827 | 1.132 | 59° | 31° |
| `mapmore-flow-danube` | 4.739 | 900×420 | 2.143 | 23.7° | 7.5° |
| `mapmore-scrolly-danube` | 4.739 | 900×420 | 2.143 | 23.7° | 7.5° |
| `mapgen-flowmap-video` | 4.761 | 940×420 | 2.238 | 23.7° | 7.5° |
| `mapgen-locator-web` | 11.071 | 420×420 | 1.0 | 0.135° | 0.095° |
| `map-geneva-locator` | 11.311 | 496×496 | 1.0 | 0.135° | 0.095° |
| `mapvid-locator-geneva` | 11.398 | 660×660 | 1.0 | 0.171° | 0.119° |

**Two things this table establishes.**

1. **Against B4.1's own list, two rungs are entirely untested.** The list is: the whole planet ·
   several continents/countries · one continent · one country · a region · a city. The tree holds
   planet (360°), several-continents (83°), continent (59–66°), a multi-country corridor (23.7°) and
   a city (0.135°). Between 23.7° and 0.135° there is **nothing** — a factor of 175 with no beat in
   it. **One country and one region — the two extents a local newsroom will ask for most — have never
   been produced by this tree at all.** That is not a defect in existing beats; it is a gap in the
   evidence, and it is where a first scale-general test should be pointed.
2. **Aspect ratio is already a free variable and is already chosen per beat** (1.0 → 2.238). Rule 12
   is being obeyed: `mapmore-flow-danube` is 900×420 because the Danube corridor is wide and short.
   That is the correct instinct and it is the thing B2.1 (produce at portrait/square/landscape) will
   collide with — see §2.7.

---

## 2. What is genuinely extent-dependent, per type

This is the substance of the brief. For each of the six types: what is tuned to its own extent, and
what would have to be **derived** instead.

### 2.1 Choropleth — the label anchor is hand-typed; nothing else is

`proof/mapgen-choropleth-video/bake.mjs:42-47`:

```js
anchors: {
  subject: [8.23, 46.8],
  // Inside Poland's own landmass (centroid ~19.1, 51.4), nudged east and north so the
  // right-anchored label text ("Poland", drawn growing LEFT from this point) lands centred over
  label: [20.3, 52.2],
},
```

**This is B6.10, exactly and completely.** The label position is a lon/lat that was nudged **by eye**
from Poland's centroid, to compensate for `textAnchor="end"`
(`ChoroplethStill.tsx:241`). It is not a country centre; it is a country centre plus half a
measured string, expressed in degrees. It is wrong the moment anything changes: a different camera,
a different frame width, a longer country name, a different typeface (B1.3), a different plate size.

Everything else in the choropleth is already derived:

- `const scale = MAP / geometry.frame.width` (`ChoroplethStill.tsx:114`) — genuinely general.
- `keepRing(ring, frame, margin = 40)` (`geo-choropleth.ts:318`) — cull by projected box, a pixel
  margin against a pixel frame, correct at any extent.
- `simplifyRing(ring, minGap)` at `minGap = 0.6` px — a drawn-pixel tolerance, correct at any extent.
- The ramp is derived from ground toward ink (`sequentialRamp`, `geo-choropleth.ts:262-263`).

**Must be derived from the extent:** the label anchor, and only the label anchor. And the derivation
already exists in this repository — see §4.

### 2.2 Proportional symbol — the radius cap and the hit target are the extent problem

Three different answers to "how big is the biggest circle", in three copies:

| Copy | Value | file:line |
|---|---|---|
| static | `MAX_RADIUS = 30` (absolute px) | `map-quake-symbol/QuakeSymbolStill.tsx:25` |
| video | `MAX_RADIUS = 46` (absolute px) | `map-quake-symbol/QuakeSymbolVideo.tsx:39` |
| web | `MARK_MAX_RADIUS_FRACTION = 0.045` of frame width | `mapgen-symbol-web/QuakeSymbolWeb.tsx:59` |
| web seed | `MARK_MAX_RADIUS_FRACTION = 0.062` | `skills/twin-map-web/assets/MapWebSeed.tsx:78` |

All four are **frame-relative at best, and never data-relative**. `radiusScale(maxMag, maxRadiusPx)`
(`geo-symbol.ts:117-120`) maps the largest value to that cap regardless of how close together the
points land on the plate. **That is B6.17.** Overlap is a function of (nearest-neighbour distance in
plate pixels) versus (radius), and the nearest-neighbour distance is entirely a property of the
camera: the same 17 quakes at world extent sit 20 px apart and at Pacific extent 200 px apart. Nothing
anywhere measures it. The static beat's own answer to overlap was to **drop labels**
(`geo-symbol.ts:216-246`, `declutterLabels`), not to shrink circles.

**B6.18 (hover fires at the centre, not on entering the symbol) is the same number seen from the
other side.** The hit target is `HIT_TARGET_PX = 28` — a fixed CSS-pixel `<button>`
(`QuakeSymbolWeb.tsx:66`, `MapWebSeed.tsx:87`), and the discipline defends the fixed size
explicitly (`MapWebSeed.tsx:83-86`: a frame-unit target "would shrink to a few physical pixels at
375px"). The defence is right for a *small* mark and wrong for a large one: at a 1000 px frame the
largest drawn circle has radius `1000 × 0.045 = 45 px` — a **90 px** disc under a **28 px** button.
A reader entering the circle is 31 px from firing anything. The rule that is missing is not "fixed
or fluid" but **`hitDiameter = clamp(2 × drawnRadius, 28, …)`** — a floor for touch, never a ceiling
below the mark.

**Must be derived from the extent:** `maxRadiusPx` (from the plate's own nearest-neighbour distance,
not from the frame width), and the hit target (from the drawn radius, with the 28 px touch floor kept
as a minimum).

### 2.3 Dot density — the dot value is data-derived; the dot *area* is not

`chooseDotValue(totalPopulation, { targetDots: 3000, maxDots: 6000 })`
(`mapmore-dot-population/geo-dot.ts:71-82`, called at `render.mjs:108`) picks people-per-dot from the
**total**, so it is already independent of the camera — good.

What is not: the dot's drawn size (`DOT_RADIUS_FRACTION = 0.002` of frame width,
`mapgen-dot-web/DotDensityWeb.tsx:45,124`) and, crucially, the relationship between the dot budget
and the **drawn area available to hold it**. The beat already measures that relationship —
`fillTightness` returns dots per 1,000 drawn pixels (`geo-dot.ts:256-271`) — but only for the alt
text, never as a constraint. At a country extent the same 3,000 dots have one country's worth of
plate to spread over and would render as a solid slab; at planet extent the same country holds four
dots. **There is no guard on either end.**

`geo-dot.ts:250-254` states the deeper extent problem in its own words: *"Mercator inflates area with
latitude, so this ranking is not identical to a people-per-km² one — it is the ranking of the thing
actually drawn."* At continent extent that is a footnote. At planet extent it is a lie the map tells
loudly, and nothing scales with it.

**Must be derived from the extent:** dot radius and dot value **jointly**, against measured fill
tightness with a stated ceiling (a "no region exceeds N dots per 1,000 px²" guard), and — at wide
extents — an explicit refusal or a latitude correction, because equal-area dots on Mercator are not
a rendering choice at planet scale, they are a false statement.

### 2.4 Hex grid — the closest type to scale-general already, and the one with the seam problem

`chooseHexSize(points, frame, { targetCells: 220, maxCells: 400 })`
(`map-quake-density/geo-hex.ts:182-198`) derives the cell size from the frame's own area and then
**verifies against the actual binned count**, growing by 1.15× until the cap is met. This is the one
type where the brief's question ("a hex grid at city scale and at planet scale are not the same
picture") already has a coded answer: the *picture* is the same — ~220 cells across the frame — at
every extent. The type sheet says the same thing
(`skills/twin-map-beat/references/types/hex-grid.md:44-51`).

Two residuals, both real:

1. **Mercator again.** The beat's own brief states it (`map-quake-density/BRIEF.md:63-65`): *"every
   cell is the same size on the projection, but a Mercator cell near 60°N covers far less ground
   than one at the equator — the frame is held to 60°S–78°N for exactly that reason."* The mitigation
   is a hand-picked latitude clip in the camera literal. At a different extent nobody re-picks it.
2. **The seam.** `normaliseLon` (`map-quake-density/bake.mjs:109-111`) normalises every longitude into
   `[west, west+360)` so a Pacific-centred camera works at all. It exists in **exactly two files**
   (`map-quake-density/bake.mjs`, `mapvid-hexgrid-quakes/bake.mjs`) and nowhere else.

**Must be derived from the extent:** the pole clip (from the data's own latitude distribution against
a stated distortion budget) and the seam longitude (from where the data's own densest cluster sits).
Both are currently editorial hand-picks recorded in prose.

### 2.5 Locator — the type built for one extent, and honest about it

`locator.md:28` states the type's own invariant: markers are **uniform, fixed radius, never
value-scaled**. So there is no size problem. The extent problem lives entirely in the labels
(§4) and in one place the camera is validated:
`mapvid-locator-geneva/bake.mjs:238-243` asserts the search ring does not leave the frame and tells
you to widen `BEAT.bounds` if it does. That is the only bake in the tree that checks the camera
against the *subject's own footprint* rather than against a typed bounds box — and it is the right
shape for a general rule.

`separateOverlappingMarkers(points, minSeparation)` (`geo-locator.ts:137-162`) nudges markers apart
in plate pixels. `minSeparation` is passed by the caller and, being pixels, is extent-correct as
written — but it changes the map's meaning (two organisations 13 m apart are drawn apart), and there
is no rule about when that becomes dishonest. At a wider extent, "13 m apart" becomes "two cities
apart", and the same nudge would be a lie. Nothing checks.

**Must be derived from the extent:** the camera (from the marker set's own footprint plus the
subject's declared catchment, the way `mapvid-locator-geneva` does it and the other two locator beats
do not) and a ceiling on `minSeparation` expressed in ground units, not pixels.

### 2.6 Flow / route — the type with the machinery the others need

`geo-flow.ts` is the largest core (515–573 lines) and is the only one that solves the anchor problem
properly:

- `clipToBBox(ring, box)` (`mapmore-flow-danube/geo-flow.ts:145-172`) — Sutherland–Hodgman clip of a
  territory ring to the camera box, *"so a territory's own label anchor is computed against the part
  of the shape that is actually IN the camera"*.
- `pointOnFeature(geometry, bbox?)` (`geo-flow.ts:189-…`) — approximate pole of inaccessibility over
  the largest **clipped** ring, i.e. the point deepest inside the visible part of the shape.

That pair is **camera-derived label placement**, already written, already tested by eye on a shipped
beat, and present in only three files (`mapmore-flow-danube`, `mapgen-flowmap-video`,
`mapmore-scrolly-danube`). See §5.

Note also **B6.15: flow/route × web does not exist.** There is no `mapgen-flow-web` or equivalent —
`mapmore-scrolly-danube` is the scrolly assembly, not the web genre. So the type with the best
camera-derived machinery is missing from the genre where B5.1/B5.3 apply.

### 2.7 The cross-cutting one: aspect ratio, and its collision with B2.1

`geo-discipline.md:204-213` (rule 12) says: *"the camera is chosen first, from the geography and the
study set, and the layout is built around the plate that comes back."* The tree obeys it — the video
compositions vary to fit their plates: 1080×1080 (`mapgen-choropleth-video/Root.tsx:52-53`,
`map-quake-symbol/Root.tsx:31-32`, `mapvid-hexgrid-quakes/Root.tsx:50-51`,
`mapgen-flowmap-video/Root.tsx:38-39`), 1080×1350 (`mapvid-locator-geneva/Root.tsx:54-55`),
1080×1440 (`mapvid-dot-population/Root.tsx:47-48`).

**B2.1 asks for the opposite.** "Produce at the different export sizes (portrait, square, landscape)"
fixes the output frame and asks the picture to fit it. For a chart that is a layout problem. For a
map it is a **camera** problem: the only honest ways to put a 2.24:1 Danube corridor into a 9:16
portrait are to widen the camera (add geography the story did not ask for) or to letterbox (waste
half the frame). Stretching is ruled out in writing
(`map-web-discipline.md:88-92`: *"a non-uniform scale is a lie about distance and shape … this genre
would rather draw a smaller true map than a larger false one"*).

**This is worth stating plainly to the owner as a real editorial choice, not a bug:** B4.2 ("a wider
area needs a different render") and B2.1 ("produce at portrait/square/landscape") together mean the
camera must be a **function of (geography, study set, target aspect)** — three inputs, not one — and
the third input did not exist when rule 12 was written. That is the single largest conceptual change
this axis implies.

---

## 3. The recorded failures: which are camera-generality, which were one-off

| # | Failure | Verdict |
|---|---|---|
| 1 | Plate baked 900×560, drawn into an 836×330 box, no scale correction — every hex cell offset from its coastline | **One-off, and already structurally closed.** The correct pattern is `const scale = MAP / geometry.frame.width` (`ChoroplethStill.tsx:114`) or draw 1:1. `HexGridStill.tsx:16,69,147` now draws the plate at `geometry.frame.width` and derives the frame *height* from the plate. `mapgen-choropleth-web` does the general case correctly (plate 992 → 420, `scale(0.84677)`, verified in `AUDIT-2026-08-09.md:549`). **But nothing tests it.** The class is closed by convention, not by a guard. |
| 2 | World drawn 1.58×, `renderWorldCopies` filling the remainder with empty continents | **Camera-generality, squarely.** It is `fitBounds` being height-limited on a frame whose aspect does not match the bounds' aspect — which is the *general* failure mode of "pick a frame, then ask for bounds". `map-quake-density/BRIEF.md:80-94` and `bake.mjs:26-41` document it fully. It will recur at any extent whose aspect nobody checked. |
| 3 | `renderWorldCopies: false` measured as NOT the fix — it clamps the camera and drops 1,057 of 14,175 events | **Camera-generality, and the most valuable single measurement in the tree.** It establishes that there are **two** invariants and either alone can be satisfied by a plate that lies: *the world must fill the frame's width* AND *the frame must reach the bounds that were asked for*. Both are asserted at `map-quake-density/bake.mjs:192-211` — and in exactly one other file. |
| 4 | The antimeridian splitting the densest cluster (1,451 visible vs 1,724 whole) | **Camera-generality.** Any global or trans-Pacific extent hits it. The fix (`normaliseLon`, `bake.mjs:109-111`, plus a Pacific-centred bounds) exists in two files. **The third beat of the same type, at the same extent, does not have it:** `mapgen-hexgrid-web/bake-plate.mjs:30-39` uses `[-179.9,-60] → [179.9,78]` — Greenwich-centred — under a comment reading *"The SAME real, world-spanning camera `proof/map-quake-density/bake.mjs` uses"*. **The comment is false.** The cost is measured in the sibling's own brief (`map-quake-density/BRIEF.md:66-71`): the web sibling gets 1,374 in the Fiji–Tonga cell against 1,724, with a rival cell three events behind. |

**The pattern across all four:** each was found by *looking at one render*, fixed *in that beat*, and
in three of four cases the fix reached one or two of the sixteen copies. That is the shape of the
problem, and it is a duplication-hygiene problem before it is a cartography problem.

**One more, not in the brief but the same class.** `map-quake-density/bake.mjs:210` prints
`Math.ceil(width * 0.5685)` as the minimum height for the asked latitude range. `0.5685` is a magic
constant hand-derived for `[-60°, 78°]` — it is `(mercY(78°) − mercY(−60°)) / 2π`, which I compute as
**0.56816**, matching. So the constant is *correct* and *derivable in three lines of arithmetic*, and
it was written down as a number instead. Change the latitude range and the assertion's advice becomes
wrong while the assertion itself stays right — the error message would name a height that does not
fix it. That is the whole camera-generality problem in one line of code.

---

## 4. Label placement

### 4.1 What exists, per type

There are **four incompatible answers** to "where does this feature's label go", one per type family,
none shared, none compared:

| Type | Mechanism | file:line |
|---|---|---|
| choropleth | a hand-typed lon/lat, nudged by eye for `textAnchor="end"` | `mapgen-choropleth-video/bake.mjs:46`; drawn at `ChoroplethStill.tsx:239-252` |
| flow / route | `pointOnFeature(geometry, bbox)` — pole of inaccessibility over the **camera-clipped** ring | `mapmore-flow-danube/geo-flow.ts:189`, `clipToBBox` at `:145` |
| dot density | `shapeAnchor(parts)` (largest landmass centre) then snap to the nearest real dot | `mapgen-dot-web/geo-dot.ts:270-303` |
| symbol / locator | one candidate position, side flipped by an edge test, then **drop on collision** | `geo-symbol.ts:187-196` + `:226-246`; `geo-locator.ts:115-121` + `:172-192` |

### 4.2 The dropped labels, measured

`map-geneva-locator/BRIEF.md:70` records *"The static frame labelled **5 of the 11 markers**"*, and
`:93` names the five that survive (WHO, ILO, WEF, WIPO, ICDO). I confirmed this against the committed
render: `map-geneva-locator/render/static.svg` contains drawn label text for exactly those five
organisation names. So **six of eleven are dropped, not seven** — see §7.1.

The brief's framing is right regardless: *"at another scale that answer changes."* And the beat
already proves it, twice over. `mapgen-locator-web/BRIEF.md:52-53` says the web genre's whole
justification is that it *fixes* the static sibling's gap — because it can afford a table row per
organisation. And `map-geneva-locator/BRIEF.md:97-101` records a rejected fix: letting a dropped label
try one line up or down recovered a sixth label but pushed *"United Nations Office at Geneva"* far
enough from its own marker to read as naming a different one. **At a wider camera the same nudge is
harmless; at a tighter one it is worse.** The right answer is a candidate-position search whose
acceptable displacement is expressed as a fraction of the marker spacing on *this* plate — which
nothing measures.

### 4.3 The divergence nobody guards

The "how near the edge before I flip" margin, same idea, four values, four files:

```
proof/map-geneva-locator/geo-locator.ts:118        margin = 170   (labelSide, right-edge only)
proof/mapgen-locator-web/geo-locator.ts:133        margin = 170
proof/mapvid-locator-geneva/geo-locator.ts:118     margin = 170
proof/map-quake-symbol/geo-symbol.ts:191           margin = 130   (labelPlacement)
proof/mapgen-symbol-web/geo-symbol.ts:187          margin = 130
skills/twin-map-web/assets/geo-symbol.ts:73        margin = 90
```

None is derived from anything. A label's box is measurable (`measureText` exists and is
parity-guarded); the margin that should clear it is not measured but typed. And the coordinator's
note is confirmed at the source: `labelSide` (`geo-locator.ts:115-121`) tests **only the right
edge** —

```ts
return px > frameWidth - margin ? "left" : "right";
```

— so a marker near the **left** edge is given a right-hand label that is correct by luck, and a
marker in a frame where labels can legitimately flip left has no path to "flip right". It is a
one-edge check wearing a two-sided name. `geo-symbol.ts:187-196` adds a vertical nudge
(`dy`) but keeps the same one-sided horizontal test.

**Also diverged, for the same reason:** `sequentialRamp`'s span is `FROM 0.1 / TO 0.78` in the three
choropleth copies (`geo-choropleth.ts:262-263`, `skills/twin-map-beat/assets/geo.ts:291-292`) and
`FROM 0.14 / TO 0.82` in the three hex copies (`geo-hex.ts:254-255`). Same function name, same
docstring (*"Same construction as the choropleth's ramp"* — `geo-hex.ts:247`), different numbers. I
**cannot establish** whether that is deliberate per-type tuning or drift; the comment claims sameness
while the code differs, which is exactly the ambiguity a parity test would have forced someone to
resolve in writing. Flagged, not asserted.

---

## 5. The seam — the smallest change per map skill, made identically, and what guards it

The brief's original phrasing (a shared layer) is not available on this branch and I am not proposing
it. The twin's rule is that a skill stays copy-pasteable, so helpers are duplicated and kept in step
by a **walking** parity test — the pattern `render-still-parity.test.ts` already demonstrates. So the
question is: *what is the smallest identical change to `twin-map-beat`, `twin-map-web` and the
map-video path, and what walk guards it?*

I do **not** believe any part of this needs a different home. Everything below is arithmetic over
`geometry.json` plus pure functions over projected coordinates — no I/O, no shared state, no
cross-skill anything. It duplicates cleanly. Argued rather than assumed: the one candidate for a
shared home would be the bake itself (it is 250 lines and it talks to a browser and a network), but
the bake is *precisely* the thing each beat must be able to re-run alone, and the branch has already
paid for sixteen copies of it. Duplicating three more small functions into it is cheaper than the
first cross-skill import.

### Step 1 (the smallest thing that is worth doing) — the bake records what it knows

Today the bake computes the camera's true facts and discards all but `zoom`. **One beat already keeps
them** (`map-quake-density/bake.mjs:165-183`): `frameCorners` from `map.unproject([0,0])` and
`map.unproject([width,height])`, and `worldWidthPx = 512 * 2 ** zoom`. Verified present in that
beat's committed `geometry.json` and in `mapvid-hexgrid-quakes`; absent from the other fourteen.

**The change, identical in every bake:** after the gate, before the screenshot, add to the emitted
`geometry.json`:

- `frameCorners { west, north, east, south }` — the extent actually shown, which is **not**
  `BEAT.bounds` (`fitBounds` preserves the frame's aspect, so it zooms out; `mapgen-hexgrid-web/
  bake-plate.mjs:167-170` says so in its own comment)
- `worldWidthPx`
- `degreesPerPixel` and `metresPerPixel` at the frame's centre latitude — the two numbers every
  downstream "is this big enough / too big / too close together" decision actually needs

That is ~10 lines per bake and it changes no render. It is the enabling step for everything else, and
it is the only step I would do before writing a spec.

### Step 2 — the two camera invariants, asserted everywhere

Duplicate `map-quake-density/bake.mjs:192-211` into every bake, with the one fix that matters: replace
the typed `0.5685` with the derivation

```
minHeight = width × (mercY(north) − mercY(south)) / (2π)
```

so the assertion's error message is correct for any latitude range, not just this one. Both invariants
travel together, because — as the recorded measurement proves — either alone can be satisfied by a
plate that lies.

### Step 3 — one label-anchor mechanism, the one that is already right

Duplicate `clipToBBox` + `pointOnFeature` (`mapmore-flow-danube/geo-flow.ts:145-172, 189-…`) into
`geo-choropleth.ts` and `geo-dot.ts`, and delete the hand-typed `anchors.label`. **That closes B6.10
by construction** and removes the last hand-nudged coordinate from the choropleth. It is a copy of
code that already ships, into two files, with no new idea in it.

The `textAnchor="end"` half of B6.10 goes with it: with a derived interior anchor, the label centres
on the anchor (`textAnchor="middle"`) and there is nothing left to compensate for by eye.

### Step 4 — derive the two numbers that produce B6.17 and B6.18

Both are one expression each, duplicated into the three symbol copies:

- `maxRadiusPx` from the plate's own **nearest-neighbour distance** between drawn points, not from
  the frame width — with the existing constant kept as the ceiling so nothing gets *bigger*.
- `hitDiameter = max(28, 2 × drawnRadius)` — the fixed 28 px becomes a floor rather than the value.
  The `MapWebSeed.tsx:83-86` reasoning for a fixed target survives intact; only the "never larger"
  reading of it goes.

### What guards it — the walk that does not exist yet

`render-still-parity.test.ts` walks for one filename. **Two more walks are needed, and they are the
same file with a different `basename` and a different canonical copy:**

1. **`bake-parity.test.ts`** — walk for `bake.mjs` **and** `bake-plate.mjs` (the tree uses both names;
   a walk keyed on one would miss four files, which is the identical mistake to the hand-written
   import list). Compare function by function against a canonical copy. It would have caught the
   `normaliseLon`-in-two-of-sixteen split, the `worldWidthPx` assertion in two of sixteen, and the
   false "SAME camera" comment in `mapgen-hexgrid-web` — because the code would have been forced to
   agree even where the prose lied.
   **Legitimate divergence it must allow, and this is the hard part:** `BEAT` is per-beat *by design*
   — the camera literal is the journalist's frame. So the walk must compare **functions**, never
   module-level constants, and must tolerate a superset (a point bake has no polygon join). That is
   exactly the superset/subset rule `render-still-parity.test.ts:20-25` already argues for.
2. **`geo-parity.test.ts`** — walk for `geo-*.ts` and compare the functions that appear in more than
   one copy: `keepRing`, `simplifyRing`, `sequentialRamp`, `declutterLabels`, `labelSide` /
   `labelPlacement`, `pointInRing` / `pointInRings`, `mixHex`, `labOf`, `deltaE76`. Sixteen files,
   currently guarded by nothing. This is the walk the coordinator's note asks for, and it is where
   the `labelSide` one-edge defect would surface as a *decision* rather than as a local workaround.

**One honest caveat about the second walk:** it will go red on `sequentialRamp` immediately (§4.3),
and somebody will have to decide whether 0.10/0.78 and 0.14/0.82 are two functions or one that
drifted. That is a feature — it is the guard doing its job on day one — but it should be expected, not
discovered.

### The type-by-type verdict the brief asked for

**Closest to scale-general:**

1. **Hex grid** — cell size is already derived from frame area and verified against the real bin count
   (`geo-hex.ts:182-198`). Residuals are the seam and the Mercator pole clip, both camera-level and
   both addressed by steps 1–2.
2. **Choropleth** — everything derived except the label anchor; step 3 closes it. The `scale =
   MAP / frame.width` pattern is the model the whole tree should copy.
3. **Flow / route** — the anchor machinery is the best in the tree. Its gap is a missing genre
   (B6.15), not a missing derivation.

**Furthest:**

4. **Proportional symbol** — two extent-dependent numbers (`maxRadiusPx`, hit target), four copies,
   four values, zero derivation, and both of the owner's per-beat complaints (B6.17, B6.18) fall out
   of them.
5. **Dot density** — dot value is data-derived but dot *density on the plate* is unbounded in both
   directions, and Mercator area distortion is acknowledged in a comment and corrected nowhere.
6. **Locator** — the type most tied to one extent by construction, and the one whose label answer
   (drop on collision, one candidate) degrades worst as the camera changes. It is also the only type
   with a bake that validates the camera against the subject's footprint
   (`mapvid-locator-geneva/bake.mjs:238-243`) — so it holds both the worst label machinery and the
   best camera check.

### And the two web items, because they are not camera work

**B5.1 is mostly already written and only two of five beats have it.** `map-web-discipline.md:51-100`
("Fit the window") specifies exactly what B5.1 asks for: `height: calc(100svh − padding)`,
`container-type: size`, `width: min(100cqw, 100cqh × aspect)`, and it records the measured defect it
closes (a 2275 px page at 1600×900, the claim 800 px below the fold). Measured on the shipped beats:
`mapgen-dot-web` and `mapgen-symbol-web` carry `100svh` / `container-type: size` / `100cqw`;
**`mapgen-choropleth-web`, `mapgen-hexgrid-web` and `mapgen-locator-web` carry none of it** and are
still on the old two-rung `layouts` API (`mapgen-choropleth-web/render-web.mjs:144`,
`mapgen-hexgrid-web/render-web.mjs:69`, `mapgen-locator-web/render-web.mjs:45,60`), with plates baked
to a fixed desktop size (496, 836×520, 420 — confirmed in their `geometry.json` frames). That is
retrofit work, not camera work, and it is the cheapest visible win in this whole survey.

One genuine conflict to put to the owner: B5.1 says *"the map takes the full available width"*, and
`map-web-discipline.md:88-92` deliberately refuses that when the plate's aspect does not match the
window's, drawing a smaller true map flush left rather than a stretched false one. **The only way to
honour B5.1 literally is to bake the plate at the container's aspect** — i.e. the camera becomes a
function of the target aspect (§2.7). It is the same decision as B2.1, arriving from the web side.

**B5.3 (MapTiler's own zoom and pan controls) contradicts a written, reasoned decision.**
`map-web-discipline.md:357-381`: live tiles were considered and **rejected in writing**, because they
break self-containment and would ship a MapTiler key inside the delivered HTML. What ships instead is
a single bounded CSS zoom step over the baked plate (`ZOOM_SCALE = 1.4`, `MapWebSeed.tsx:91`) — which
is exactly the out-of-map control the owner asks to remove in B6.14. So B5.3 is not a bug to fix but a
**decision to re-open**: real MapTiler controls mean live tiles mean a key in the file. The middle
path — bake generously and allow more than one bounded zoom step over the plate, with the pan bounds
clamped to the subject's own footprint — is available and would need a bigger `PLATE_SIZE`, and it is
camera work in the sense that "the subject's area" has to be a measured extent rather than a typed
one.

---

## 6. What `geo-discipline.md` — including rule 7a — already settles

Reading `twin/skills/twin-doctrine/references/geo-discipline.md` against this axis:

**Settled, and I found no gap:**

- **Rule 1** (bounded frame gating) — universal, extent-independent, implemented identically in all
  sixteen bakes. Not a camera-generality concern.
- **Rule 2** (a moving camera needs a fixed plate) — the reason the whole bake exists. Extent-neutral.
- **Rule 3** (bake ordered geometry) — extent-neutral.
- **Rule 4** (labels are overlays positioned by `map.project()`) — this is what makes derived label
  anchors *possible* at all, and it is why step 3 above is cheap: the anchor is data, so it follows
  the camera automatically once it stops being hand-typed.
- **Rule 5** (joins fail loud) — extent-neutral.
- **Rule 6** (capture plumbing) — extent-neutral.
- **Rule 11** (cull rings by projected box; distrust one wider than the frame) — **this is genuinely
  scale-general as written**, because it is expressed in projected pixels against the frame, not in
  degrees. The antimeridian clause is the same insight the hex beat's `normaliseLon` implements from
  the other end (rule 11 drops the streak; `normaliseLon` prevents it). Worth noting the two have
  never been reconciled in one place.

**Rule 12 is the axis, and it is half-written.** *"The camera is decided by the geography; the layout
adapts to it"* is correct and is obeyed. What it does not say — because nothing had asked yet — is
what happens when the layout **cannot** adapt, because a channel fixed it (B2.1, B5.1). Rule 12 needs
a second clause: the camera is a function of geography **and** the target aspect, and when the two
disagree the resolution is stated in the beat rather than absorbed silently by `fitBounds`. That
silent absorption is precisely failure #2 in §3.

**Rule 7a settles more of this axis than its title suggests.** It is written about colour, but its
mechanism is the one this axis needs everywhere:

- It replaces *"read as a different kind of thing at a glance"* with **a measured number with no free
  parameter** — the bar is the plate's own land-to-water separation, ΔE76 23.77 (`:110-119`). That is
  the exact move steps 2 and 4 make for geometry: replace a typed constant with a quantity derived
  from the plate itself.
- Its stated reason is that *"the failures are invisible to the author and obvious to nobody until
  someone measures"* (`:107-109`) — which is a precise description of every one of the four recorded
  camera failures in §3.
- Consequence 3 (*"a numeral on a swatch takes the pole that measures higher against that swatch …
  never the beat's ground colour by default"*, `:144-146`) is the same shape as the hit-target and
  radius rules: derive per instance, do not default globally.
- **What it settles for maps specifically:** any *new* mark this axis introduces — a bigger symbol, a
  denser dot field, a hex cell at a new size — is already covered. It must clear the plate's own
  land/water separation or carry a 3:1 stroke. So a scale-general renderer does **not** need a new
  colour rule; it inherits one that already has a number.
- **And its own open problem is on this axis.** The closing section (`:218-230`) — a
  proportional-symbol legend box sized from the widest circle diameter alone, clipping a word-length
  unit ("8 magnitud…") — is named as *"the same failure class as a fixed label gutter (a reserved
  space sized against one dimension of the content while another dimension of the same content grows
  past it)"*. That is the generic statement of §2.2 and §4.3. The doctrine has already named the
  class and left it open; this axis is where it gets closed, and closing it for the legend and for
  the label margin is one piece of work, not two.

---

## 7. Uncertainty — stated rather than resolved

1. **"7 of 11 markers"** — I measured **6 of 11 dropped** (5 labelled), from
   `map-geneva-locator/BRIEF.md:70,93` and confirmed against the committed
   `render/static.svg`. Either the brief's figure came from an earlier render, or from the video
   sibling, which I did not count. The argument is unaffected.
2. **`sequentialRamp` 0.10/0.78 vs 0.14/0.82** (§4.3) — I cannot establish from the code or the
   comments whether this is deliberate per-type tuning or drift, and I did not want to assert either.
3. **I did not run a bake.** Every camera number in §1.3 comes from a committed `geometry.json`.
   Whether a *new* extent (one country, one region — the two untested rungs) actually behaves as this
   analysis predicts is unverified, and it is the first thing a spec should prove rather than assume.
4. **`0.5685` = 0.56816** — I derived this from the Mercator formula, not by running the bake. The
   match is close enough that I am confident of the derivation; I have not executed it against
   MapLibre's own projection to confirm they agree to the pixel.
5. **B6.11 and B6.19** (the video not starting empty; symbol outlines arriving before their fills) I
   traced far enough to classify: both are reveal-ordering in the Remotion components
   (`ChoroplethVideo.tsx:240-253`, the plate gated on `furniture` opacity), **not** camera work. I did
   not diagnose them further — they belong to whoever has the motion axis.
6. **B6.16** (a highlighted hexagon with nothing said about it) is a furniture/editorial item, not
   camera. Noted and not investigated.
7. **The map-video path has no skill of its own.** `twin-map-beat` holds both static and video seeds
   (`SKILL.md:20-23`, deliberately — *"they must not drift apart on the camera"*). So "the map-video
   path" in §5 means `twin-map-beat/assets/Co2MapVideo.tsx` plus the six `proof/` video beats, and
   every step lands there as one more copy under the same walk. I believe that is right, but it means
   a `bake-parity` walk must cover `proof/` as well as `skills/` — which
   `render-still-parity.test.ts` already does, so the precedent exists.
