# Survey — size as a dimension of production

Read-only survey against `experiment/doctrine-twin`, 2026-08-10. Answers B2.1 (static and video at
portrait / square / landscape), B3.2 (web genuinely responsive with a mobile version) and the size
half of A5 (size chosen after medium and genre). Nothing was changed; every claim below carries a
`file:line`.

---

## Summary, before the evidence

1. **A beat's size is stated twice and derived nowhere.** In the static genre it is a `FRAME`
   constant inside the component *and* an argument to `renderStill`, which throws if they disagree
   (`skills/chart-beat/scripts/render-still.mjs:202-205`). In the video genre it is a `FRAME`
   constant inside the composition *and* `width`/`height` on the `<Composition>` — with **no guard
   at all** between the two. Not one of the 76 beats under `proof/` renders its component more than
   once (measured: zero scripts contain two `renderStill({` calls).
2. **Today the twin fixes WIDTH and lets HEIGHT follow the content.** Measured across every
   `const FRAME` in `proof/`: static is 900 wide with heights of 560, 620, 720, 760, 800, 820, 860,
   1000; video is 1080 wide with heights of 900, 1080, 1350, 1440. Portrait / square / landscape asks
   for the exact opposite — **both** dimensions pinned, content made to fit. That inversion, not the
   plumbing, is the real work.
3. **What is genuinely size-dependent is small and nameable**: type scale (an editorial decision per
   genre × size, not a pixel ratio), tick counts, grid shapes (a small-multiples column count),
   collision thresholds, and any layout keyed to a *fixed* pixel constant. What already survives a
   size change for free: all the pure geometry, and — the twin's real strength — **every measured
   gutter**, because `measureText` measures the real string at the real font size rather than
   guessing (`render-still.mjs:166-190`).
4. **The fluid web frame already delivers most of B3.2** and the part it does not deliver is named in
   its own doctrine: *"Fitting and filling are two different rules; only the first is settled here"*
   (`skills/chart-web/references/web-discipline.md:245`). A "mobile version" is a **third** rule
   — re-deciding what is shown, not how big it is — and the genre currently has a test that forbids
   the mechanism (`test/seed-fluid-frame.test.ts:119-128`, `:322`, both assert no `@media`).
5. **The original Splash gets the CONTRACT right and the RENDERING half-right.** Its channel table
   and its produce-time `assertRenderedSize` are the right shape and should be copied in spirit. Its
   video answer — one component registered three times with `scale: 1.7` — and its
   `estimateHeaderPx` guess (`CHAR_WIDTH_RATIO = 0.52`) are exactly what the twin should **not**
   copy, because the twin measures text instead of estimating it.

---

## 1. Where a beat's size is decided today

### 1a. Static (`chart-beat`, 37 beats calling `renderStill`)

The frame is a module constant in the component:

- `skills/chart-beat/assets/ChartSeed.tsx:25` — `const FRAME = { width: 900, height: 560 };`
- `proof/static-swiss-age-pyramid/SwissAgePyramid.tsx:26` — `{ width: 900, height: 820 }`, with its
  own header (`:11-14`) explaining the taller frame as *"a deliberate per-story choice
  (`static-discipline.md`'s FRAME is a named tuning knob, not a fixed constant)"*.
- `skills/chart-beat/SKILL.md:155` lists it as a tuning knob: `| The frame the seed draws in |
  900 × 560 | FRAME, ChartSeed.tsx |`.

The same numbers are restated in the beat's render script and checked:

```
proof/static-swiss-age-pyramid/render.mjs:77-78     width: 900,  height: 820,
```

```js
// skills/chart-beat/scripts/render-still.mjs:200-206
// The element declares its own frame. Rasterising at another width would silently scale the
// chart — every measured gutter would still be correct, and every font size would be a lie.
const drawn = { width: …, height: … };
if (drawn.width !== width || drawn.height !== height) {
  throw new Error(`asked to render at ${width}x${height}, but the element is drawn at ${drawn.width}x${drawn.height}`);
}
```

**What that throw means for a second size.** It is not an obstacle — it is the seam's own contract,
stated in the negative. It says: *the element decides the size and the rasteriser obeys.* A second
size therefore cannot be produced by asking `renderStill` for different pixels; it can only be
produced by **drawing the element at those pixels**. The comment gives the reason and it is correct:
rasterising a 900×560 element at 1080×1080 keeps the measured gutters numerically right while making
every font size a lie. So `renderStill` needs no change at all for three sizes — the component does.

One further fact the throw hides: **the delivered PNG is already 2× the declared frame**
(`render-still.mjs:215-222`, `fitTo: { mode: "width", value: width * 2 }`). Measured on disk:
`proof/static-carbon-footprint-spread/…-still.png` is 1800×1120 for a 900×560 element;
`static-swiss-age-pyramid` is 1800×1640. So no static artifact in the tree is currently at a
canonical export size, and 900×560 is an aspect of 1.607 — neither 16:9 nor anything a platform
asks for.

### 1b. Video (`chart-video`, 25 beats with a `Root.tsx`)

Stated **twice, with nothing between them**:

- `skills/chart-video/assets/Root.tsx:40-41` — `width={1080} height={1080}` on the
  `<Composition>`.
- `skills/chart-video/assets/EmissionsVideo.tsx:42` — `const FRAME = { width: 1080, height: 1080 };`

And the composition reads Remotion's own config but **throws the size away**:

```
skills/chart-video/assets/EmissionsVideo.tsx:239   const { fps } = useVideoConfig();
skills/chart-video/assets/EmissionsVideo.tsx:240   const { width, height } = FRAME;
```

This is uniform across the corpus: every one of the ~21 video beats destructures only `fps` from
`useVideoConfig()` (measured — `grep -rn useVideoConfig proof` returns `fps` in every instance,
e.g. `proof/vidy-pyramid-niger-population/PyramidVideo.tsx:253`,
`proof/vidz-bump-emitter-rank/BumpVideo.tsx:221`). `useVideoConfig()` already returns `{width,
height}`. **The video genre is one destructuring away from being size-driven** — and it currently
has no guard that the `FRAME` constant and the `<Composition>` agree (no test in
`skills/splash/test/` mentions `Root.tsx` or `Composition`; searched).

The render script names no size at all: `skills/chart-video/scripts/render-video.mjs:92-116`
passes only an entry, a composition id and props.

Sizes already in the video corpus: 1080×1080 (21 beats), 1080×1350 (3 — e.g.
`proof/vidy-pyramid-niger-population/PyramidVideo.tsx:64`), 1080×1440
(`proof/mapvid-dot-population/DotDensityVideo.tsx:36`), 1080×900
(`proof/mapgen-flowmap-video/FlowMapStill.tsx:22`). So the genre **already ships three aspect
ratios** — each one hand-tuned in its own component, none of them selectable.

### 1c. Web (`chart-web` / `map-web`, 23 beats with `render-web.mjs`)

There is no export size. There is a **canonical geometry** whose only job is to fix proportions and
tick density:

```ts
// skills/chart-web/assets/ChartWebSeed.tsx:615-629
export const FRAME: WebFrame = { width: 820, height: 380, xAxisRowPx: 28, … yTickHint: 5, xTickHint: 6, … };
```

`WebFrame.width/height` is documented at `:84-90` as *"NOT a rendered pixel size and NOT a cap"*. The
one thing derived from it is the CSS box's aspect ratio:

```
skills/chart-web/assets/ChartWebSeed.tsx:356-357   totalWidth = yGutterPx + frame.width; totalHeight = frame.height + frame.xAxisRowPx;
skills/chart-web/assets/ChartWebSeed.tsx:428       aspectRatio: `${totalWidth} / ${totalHeight}`
```

Everything else is CSS: `width: 100%` with no `max-width` on the frame
(`scripts/render-web.mjs:216-236`), a fixed inner pad `FRAME_PAD_PX = 24` (`:170`), a window clamp
`max-height: 100dvh` (`:234-235`) and a plot floor `PLOT_FLOOR_PX = 120` (`:181`).

### 1d. Maps

The plate is baked **square, and only square**:

```
skills/map-beat/scripts/bake-plate.mjs:63    const size = Number(flag("--size", "620"));
skills/map-beat/scripts/bake-plate.mjs:158   await page.setViewport({ width: size, height: size, deviceScaleFactor: 2 });
skills/map-beat/scripts/bake-plate.mjs:216   clip: { x: 0, y: 0, width: size, height: size }
skills/map-beat/scripts/bake-plate.mjs:245   const frame = { width: size, height: size };
```

Identically in `skills/map-web/scripts/bake-plate.mjs:69, 134, 197, 216`, with
`PLATE_SIZE = 1000` fixed at `skills/map-web/scripts/render-web.mjs:72`. A single `--size N`
flag cannot express a portrait or landscape camera. This is doctrine, not oversight —
`skills/doctrine/references/geo-discipline.md:204-215`, rule 12: *"the camera is chosen first,
from the geography and the study set, and the layout is built around the plate that comes back —
text beside a square plate, not a plate stretched to fill a frame someone chose before looking."*

**Rule 12 and B2.1 are in direct tension** and someone has to rule on it. Rule 12 says the frame
follows the geography; B2.1 says the frame is the journalist's export choice. Both cannot be true at
once for a map. The resolution I would propose is *the plate's aspect follows the geography; the
FRAME's aspect follows the export size; the plate is placed inside the frame by `fitBox`, never
stretched* — which is exactly the primitive `image-beat` already ships
(`skills/image-beat/scripts/render-still.mjs:254-267`, uniform `Math.min` scale with centring
offsets). Not a decision I can make from a survey.

### 1e. Image, scrolly, Datawrapper — the three that already do it differently

- **`image-beat` derives its height.** `skills/image-beat/assets/ImageBeatSeed.tsx:48-56`
  fixes only `FRAME_WIDTH = 900`; `:158` returns `{ width: FRAME_WIDTH, height, … }` where `height`
  is computed from the blocks. Its own comment at `:89` says the height is derived *"never a fixed
  constant the way the chart genre's `FRAME` is"*.
- **`scrolly` already models size as a RANGE.** `assets/ScrollySeed.tsx:150` declares
  `ASPECT_ENVELOPE = { min: 0.42, max: 2.4 }` (tall phone .. 21:9 ultrawide) and `:164-181`
  `safeBand()` computes, with real arithmetic, the sub-rectangle of a cover-cropped design canvas
  (`FRAME = { width: 640, height: 900 }`, `:197`) guaranteed visible at **every** aspect in that
  envelope. This is the most advanced size thinking in the twin and nothing else reuses it.
- **`dw-beat` is already size-parameterised**, in one call site:
  `scripts/dw-client.mjs:58-60`, `exportChartPng(id, token, fetchFn, { width = 900, height, zoom = 2 })`.
  Datawrapper re-lays out server-side. This genre costs almost nothing.

One more precedent worth naming: `proof/map-quake-density/HexGridStill.tsx:76` exports
`stillFrameHeight({ plateHeight, caveat })` and `:125-128` builds `FRAME` from it — a static beat
whose height is **computed from its content**, including the number of wrapped caveat lines.

### 1f. Where size is decided in the JOURNEY: nowhere

`checkStoryboard` (`skills/storyboard/scripts/storyboard.mjs:105-161`) validates a slot's
`id / proves / medium / genre / candidates / chosen`. `where.mjs`'s independent reading
(`skills/splash/scripts/where.mjs:116-141`) checks the same fields. **Neither knows the word
"size."** `genre-catalog.mjs:21-25` carries three rows — `static`, `web`, `video` — each mapping to a
producer and a delivery flag; no aspect anywhere. `grep -rn "portrait|landscape|square"` over
`skills/` returns only prose in type sheets and the scrolly/image disciplines.

The size **is** recorded today — in prose, in the brief, unchecked by anything:

```
proof/static-carbon-footprint-spread/BRIEF.md:3   **Channel:** article web, 900 x 560.
proof/life-expectancy/BRIEF.md:3-4                **Channel:** `life-expectancy.mp4`, 1080 × 1080, 30 fps …
```

Every chart-static brief in the corpus says "article web". This is the handover's own
*"prose is the unguarded surface"* lesson (`twin/HANDOVER.md:408-415`) arriving in the size axis:
the concept already exists in the document a journalist reads and reaches no code.

---

## 2. What is genuinely size-dependent inside a component

This is the crux. The honest taxonomy has **three** buckets, not two.

### Bucket A — survives a pure scale (needs nothing)

All the **pure geometry**. Every beat separates it, and every one of these functions already takes
`width`/`height`/`padding` as arguments rather than closing over `FRAME`:

- `lineGeometry(data, {width, height, padding})` — `skills/chart-beat/assets/ChartSeed.tsx:113-189`
- `pyramidGeometry(bands, {width, height, padding})` — `proof/static-swiss-age-pyramid/SwissAgePyramid.tsx:63-129`
- `gridGeometry(…)` — `proof/static-small-multiples-solar-eu-six/SolarSmallMultiples.tsx:55+`
- `chartGeometry(data, {width, height})` — `skills/chart-web/assets/ChartWebSeed.tsx:208-224`

A d3 scale ranged onto a different box is correct by construction. This bucket is roughly the whole
of what "geometry first, and pure" (`chart-beat/SKILL.md:91-92`) bought, and it is the reason
the cost estimates below are as low as they are.

### Bucket B — must be RE-DERIVED, and already is (needs only the right inputs)

The twin's measured-gutter discipline means several things that *look* size-dependent are already
correct at any size, **provided the font size and the width are decided before they run**:

- **Wrapped titles.** `wrap(title, width - PAD * 2, TITLE)` — `ChartSeed.tsx:230`,
  `SwissAgePyramid.tsx:161`, `HexGridStill.tsx:128-134`. Line count falls out of the real measured
  string at the real font size. Change `width` and it re-wraps correctly with no other edit.
- **Measured gutters.** `padding.right = PAD + 12 + measureText(endLabel, LABEL)` and
  `padding.left = PAD + 10 + max(measureText(tickLabel, AXIS))` — `ChartSeed.tsx:248-256`. Same for
  the web genre's one measured value, `yGutterPx` (`ChartWebSeed.tsx:343-344`).
- **Header block height feeding `padding.top`.** `sourceBaseline` and friends are computed from the
  wrapped line counts (`ChartSeed.tsx:231-233`, `SwissAgePyramid.tsx:160-170`), so a title that wraps
  to three lines at portrait width pushes the plot down automatically.

This is the single strongest thing the twin has going for it on this axis, and it is worth stating
plainly because the original Splash does **not** have it — see §4.

### Bucket C — must be RE-DECIDED (the actual work)

**C1. Type scale is an editorial decision per (genre × size), not a function of pixels.** The
evidence is decisive: the same chart type, drawn twice at two sizes by the same project.

| | static, 900 × 1000 | video, 1080 × 1350 | ratio |
|---|---|---|---|
| frame width | 900 | 1080 | 1.20× |
| `PAD` | 40 (`DivergingBarChange.tsx:64`) | 72 (`DivergingBarVideo.tsx:53`) | 1.80× |
| title `fontSize` | 24 (`:66`) | 38 (`:56`) | 1.58× |
| axis tick | 13 (`:70`) | 17 (`:60`) | 1.31× |
| value label | 13 (`:72`) | 17 (`:61`) | 1.31× |

Nothing scales at the frame's own 1.20×. The video types larger because a video is watched small on
a phone; the static types smaller because it sits in an article at reading distance. **A single
`scale` number cannot express this** — which is precisely what the original Splash tries to do
(`scale: 1.7`, §4). A size table must therefore carry a *type scale per size*, chosen by eye once,
not derived.

**C2. Tick counts.** `Y_TICK_HINT = 5` / `X_TICK_HINT = 6` (`ChartSeed.tsx:37, 43`), `X_TICK_HINT = 4`
(`SwissAgePyramid.tsx:40`), `TICK_HINT = 6` (`DivergingBarChange.tsx:77`), `frame.yTickHint` /
`xTickHint` (`ChartWebSeed.tsx:103-108`). A hint tuned for an 820-unit-wide plot puts six x labels
into a 9:16 plot that is narrower than its own labels. These neither scale nor stay — they must be a
per-size value.

**C3. Grid shape.** `const COLUMNS = 3` — `proof/static-small-multiples-solar-eu-six/SolarSmallMultiples.tsx:41`,
with `rows = Math.ceil(panels.length / columns)` at `:79`. Six panels at 3×2 is right for landscape
and wrong for 9:16, where 2×3 is right. This is a **re-derivation, not a scale**, and it is the
clearest instance of the owner's *"a chart at 1080×1080 is not a chart at 1920×1080 with the middle
cut out."* Types in this class: small multiples, calendar heatmap, treemap, waffle/pictogram,
marimekko — anything whose layout is a packing.

**C4. Collision thresholds.** `MIN_LABEL_GAP = 16` (`RenewablesShiftSlope.tsx:31`),
`MIN_GRIDLINE_GAP_PX = 24` (`DivergingBarChange.tsx:87`), `BAND_GUTTER = 64`
(`SwissAgePyramid.tsx:39`), `LABEL_HALO = 6` (`DivergingBarChange.tsx:75`), `POINT_INSET = 6`
(`ChartWebSeed.tsx:197`), `frame.minGridlineGapPx` (`ChartWebSeed.tsx:109-111`). These are expressed
in the same units as the type they separate, so they must move with the **type scale**, not with the
frame. Getting this wrong is invisible in a unit test and visible in a render — which is the
project's most-repeated lesson.

**C5. Bespoke collision and placement code.** Several beats carry per-beat label placement logic
(the flip/clamp families, end-label gutters, annotation anchors). None of it is wrong at a new size;
all of it is **unverified** at a new size. This is where the honest cost lives: not in editing, but
in re-rendering and looking, which is exactly what the handover says retrofitting the web genre cost
(`twin/HANDOVER.md:557-559`).

**C6. Structural furniture that only fits one aspect.** A 21-band pyramid needs vertical room; a
27-row diverging bar needs vertical room; a legend laid out as a horizontal strip needs horizontal
room. At 9:16 the first two get it and the last does not; at 1:1 all three are tight. Some types will
need a **different furniture arrangement** per size (legend below vs beside), which is C3's problem
with different clothes.

### The web genre's `aspect-ratio` specifically

`aspectRatio: ${totalWidth} / ${totalHeight}` (`ChartWebSeed.tsx:428`) is derived, not written —
from the canonical geometry plus the **measured** `yGutterPx`. It therefore already re-derives if the
canonical geometry changes. Its one documented cost is at `web-discipline.md:152-160`: the fixed
pixel gutter is a shrinking fraction of a growing frame, so the plot's true proportions drift a few
percent, absorbed by `preserveAspectRatio="none"`.

And there is a size-dependent trap the genre names itself, at `web-discipline.md:247-273`:
**`preserveAspectRatio="none"` is a non-uniform scale, and it distorts any mark whose SHAPE is the
argument** — a scatter dot, a proportional circle. The stated remedy is already in use: move such a
mark out of the stretched `viewBox` into the HTML layer at a fixed size. Any size work in this genre
inherits that rule.

---

## 3. The web genre already fought this — what the fluid frame gives us toward B3.2

`a1fc4d92` replaced two fixed rungs (900px / 360px, swapped by a media query) with one fluid frame.
Read: `skills/chart-web/references/web-discipline.md:82-188` and `:190-245`;
`skills/map-web/references/map-web-discipline.md:11-120`.

### What it already gives

1. **Genuine fill at any width, with type that does not scale.** The `<svg>` carries geometry only —
   zero `<text>` elements — and every word is HTML positioned in percentages over the same grid cell
   at a fixed pixel `font-size` (`web-discipline.md:109-122`, and `ChartWebSeed.tsx:443-446` in the
   markup). Verified at 24px title across 1600 / 1024 / 768 / 375 (`web-discipline.md:513-514`).
   A guard asserts the `<svg>` carries no `<text>` (`test/seed-fluid-frame.test.ts`, per
   `web-discipline.md:538-540`).
2. **No cap anywhere.** `.chart-figure { width: 100% }` with no `max-width` on the chart chain
   (`render-web.mjs:216-219`); only the header block and source line get a 640px reading measure
   (`:240`). Asserted by test (`seed-fluid-frame.test.ts:108-117`).
3. **The window fit.** `max-height: 100vh` then `100dvh` (`render-web.mjs:234-235`), the plot as the
   sole shrinkable item (`:363`, `flex: 0 1 auto`) with `min-height: ${PLOT_FLOOR_PX}px` (`:364`).
   Measured before/after at seven viewports including 3440×900 and 375×812
   (`web-discipline.md:196-232`).
4. **Content is never flush to the edge.** `FRAME_PAD_PX = 24` (`render-web.mjs:170`), measured at
   four widths (`web-discipline.md:171-188`).
5. **A real verifier.** `scripts/verify-web.mjs` drives Chrome at seven viewports (`:62-70`) and
   dispatches real pointer events at two (`:74-77`), with the fractional-coordinate trap documented
   at `web-discipline.md:480-487`. It is mutation-proven (`web-discipline.md:467-478`).
6. **The map genre took the same split, plus a uniform-scale-only rule** —
   `map-web-discipline.md:105-120`: bake generously (`PLATE_SIZE = 1000`) and scale uniformly, never
   distort, because a stretched basemap is a lie about distance.

### What a "mobile version" adds beyond it — three distinct things, only one of which is size

The genre's own last word is the honest one: *"It does not say the beat USES the window it is given.
At 375 × 812 the seed still renders a 153px plot in an 812px window, because height follows width
through `aspect-ratio` and a narrow viewport therefore buys a short chart. Fitting and filling are
two different rules; only the first is settled here."* (`web-discipline.md:242-245`).

So:

- **(i) Filling — a size problem, and the smallest of the three.** On a phone the beat should use the
  vertical room a portrait window has. Mechanically this is a **different `aspect-ratio` below a
  width**, i.e. one CSS rule that changes `--plot-aspect`. It re-uses everything above and changes
  no geometry.
- **(ii) Re-deciding the content — not a size problem at all.** Fewer x ticks, a legend that moves
  from beside to below, an annotation that is dropped, a row list that truncates with "+12 more". At
  375px the tick hint of 6 and the fixed gutters are the wrong *decisions*, not the wrong *pixels*.
  This is bucket C2/C4/C6 from §2, and it is where the actual mobile work is.
- **(iii) Re-deciding the interaction.** Hover is not a phone gesture. The genre already handles this
  better than most — one pointer code path for mouse/pen/touch, resolved by nearest point over a
  whole `.hit-area` rather than a 5px circle (`web-discipline.md:54-58`) — so this is largely
  already paid for. The filter's segmented control is measured at 89 × 26 CSS px against WCAG 2.2 SC
  2.5.8's 24 × 24 (`web-discipline.md:350-352`), also already paid for.

### The mechanical obstacle, stated plainly

Two tests currently assert the genre's stylesheet contains **no `@media` at all**:

```
skills/chart-web/test/seed-fluid-frame.test.ts:119-128   it("should carry no @media breakpoint …")  expect(css).not.toContain("@media");
skills/chart-web/test/seed-fluid-frame.test.ts:322       expect(css).not.toContain("@media");   // inside the @supports test
```

Any mobile form that uses a width breakpoint turns those red. They are **not wrong** — they encode a
correct overturned decision (no fixed rungs). But they are stated too broadly: they forbid the
mechanism rather than the pattern. What they actually mean to forbid is *a second pre-rendered
layout swapped by a query*. A `@media (max-width: …)` that changes one custom property
(`--plot-aspect`) or drops one tick is not that. The assertion wants narrowing to something like
"no `@media` rule may contain `display: none` on a chart layer" — which is the shape that catches
the real defect. **Naming this now matters**, because the alternative is that whoever implements B3.2
deletes the assertion, and a guard deleted is the failure mode the handover documents at
`twin/HANDOVER.md:725-729` (*"a guard a formatter can turn red is a guard someone disables"*).

### And four beats never got the fluid frame at all

Measured: 19 beats carry the fluid `aspectRatio` shape; **4 are still on the old two-rung pattern** —
`proof/more-heatmap-co2-per-capita-decades/render-web.mjs:245, 251-265` (`NARROW_LAYOUT`,
`data-layout`, `max-width: ${desktopCapPx}px`, `@media (max-width: ${breakpointPx}px)`), plus
`proof/mapgen-choropleth-web`, `proof/mapgen-hexgrid-web`, `proof/mapgen-locator-web`
(each `@media (max-width: 480px)` with `.map-figure { max-width: 900px }` at
`mapgen-hexgrid-web/render-web.mjs:144, 185`).

**This is exactly feedback B6.2** ("the heatmap must take the full available width"). B6.2 is not a
heatmap bug — it is *the un-retrofitted beat*. Retrofitting those four closes B6.2 and one third of
B6.12 with no new mechanism at all. Highest leverage-to-cost ratio in this whole survey.

---

## 4. Does the original Splash solve this already?

Read at `skills/` and `lib/` in this same repository (the original; the twin must not import it).

### What it has

**One policy table**, `lib/core/channel-policy.ts:31-73`:

| channel | aspect | mediaSize | allowedFormats | interactiveDefault |
|---|---|---|---|---|
| `social-vertical` | portrait | 1080 × 1920 | static, video | false |
| `social-feed` | square | 1080 × 1080 | static, video | false |
| `article-web` | landscape | 1200 × 675 | static, interactive, video, scrolly | true |
| `print-page` | page | 2480 × 1748 | static | false |

Plus, in the same file: `channelFor(destination, aspect)` (`:111-124`), `aspectOf` (`:141-143`),
`needsAspectChoice(destination)` (`:158-160`), `allowedFormats` / `assertFormatAllowed`
(`:162-186`). And in `skills/splash/src/channel.ts`: `renderSize` (`:45-47`),
`assertRenderedSize(actualW, actualH, channel, tolerancePx = 2)` (`:62-77`), and a free-text alias
table `CHANNEL_KEYWORDS` (`:84-110`) that maps "reel", "stories", "square", "landscape", "print" onto
canonical channels, **failing closed on an unknown value** (`:122-139`).

### What it gets RIGHT — and the twin should take, in spirit

1. **`interactiveAspect: "responsive"` on every row** (`channel-policy.ts:28, 37, 44, 51, 71`). The
   original models the thing this survey keeps running into: **web has no export size — it has a
   range.** That single field settles the A5 ordering question. Size is a real dimension for static
   and video; for web the equivalent dimension is responsiveness. Feedback B2.1 and B3.2 being two
   separate items is the same insight, arrived at from the other end.
2. **A produce-time size assertion that throws.** `assertRenderedSize` (`channel.ts:62-77`) is the
   video genre's missing `renderStill` throw. The twin already has the equivalent for static and
   nothing for video; the original has it for both.
3. **Fail-closed on an unknown channel** (`channel.ts:122-139`, and again defensively in
   `skills/chart-native/vite.config.ts:31-41`). The stated reason is exactly right: `article-web` is
   the most permissive channel, so a silent default **widens** the allowed set — the one direction a
   guard must never fail.
4. **A `tolerancePx` with its reason written down** (`channel.ts:53-61`): article-web's height of 675
   is odd, the static path lays out at `mediaSize / 2` and screenshots at deviceScaleFactor 2, so 676
   is the nearest reachable even pixel size. The twin will hit this the moment it targets an
   odd-dimensioned size through its own 2× rasteriser (`render-still.mjs:219`).
5. **`resolveFrame` is a genuine re-derivation layer, not a scale**
   (`skills/chart-native/src/core/format.ts:32-64`): it takes the real `(width, height)`, scales pad
   and type by `scale`, and — the good part — **pads the plot into a centred band rather than
   stretching it** (`:49-53`), with `boostPlotAspectForTallCanvas` (`:168-178`) raising the plot's
   own aspect on a tall canvas so a 9:16 export is not a small landscape island in a sea of margin.
   The constants carry their measurements (`:132-139`: a straight multiplier fills ~47% of available
   height, the 1.3 headroom factor closes it to ~63%). That is the right *shape* of answer for C1/C6.

### What it gets WRONG — and the twin should not copy

1. **One `scale` number for a whole size.** `skills/chart-native/remotion/src/Root.tsx:50-74`
   registers `LineReveal` three times — `LineReveal` 840×480, `LineSquare` 1080×1080 with
   `defaultProps={{ scale: 1.7 }}`, `LinePortrait` 1080×1920 with the **same** `scale: 1.7`. Square
   and portrait get an identical type scale despite one being 1.8× taller than the other. §2's C1
   table shows the twin's own hand-tuning disagrees with a single factor by a wide margin
   (1.20× frame → 1.58× title → 1.80× pad).
2. **Type layout by ESTIMATE, not measurement.** `estimateHeaderPx`
   (`skills/chart-native/src/core/format.ts:89-117`) computes the wrapped title's height from
   `CHAR_WIDTH_RATIO = 0.52` (`:74`), *"calibrated so that an 840px canvas … gives ~33 chars per
   line"*, plus `const buffer = titleFontPx * TITLE_LINE_HEIGHT * 0.5` (`:114`) as a safety margin
   for *"character-width variation between real browsers and this approximation."* This is the exact
   defect the twin built `measureText` to remove — and its own header says a wrong measurement
   *"clips, silently, in the rendered PNG"* (`render-still.mjs:151-165`). **A calibrated ratio is
   guessing with a decimal point on it.** The twin's answer is already better and must stay better.
3. **The landscape case is exempted from its own assertion.**
   `skills/chart-native/scripts/produce.mjs:352-368`: `assertRenderedSize` is hard-asserted for
   portrait and square only; landscape *"keeps each family's own pre-channel aesthetic dims"* and is
   merely logged. So the contract holds for two of three sizes and the default channel is the
   unenforced one. Whatever the twin builds should hold for all three or for none.
4. **The order is inverted relative to A5.** The original picks a channel at CADRAGE and **derives**
   the allowed format set from it (`allowedFormats`, `assertFormatAllowed`). The owner asks for
   medium → genre → size. Both models are coherent; they differ in which is the free variable. The
   twin should take A5's order (the journalist's), and express the original's constraint as a
   **check** rather than a derivation: after medium + genre + size are chosen, refuse the pairs that
   do not exist — `genreGap` already has exactly that shape (`storyboard/scripts/genre-catalog.mjs:31-41`).

### The architectural translation, stated against the branch's rule

The original can hold one `channel-policy.ts` because `lib/core/` is importable by everything. The
twin forbids that (`skills/splash/test/no-cross-skill-imports.test.ts:1-12` — *"NO import may
leave it. Not 'may not re-enter another skill' — may not leave at all"*).

**I do not think size needs a shared home, and here is the argument rather than the assumption.**

- The size table is **tiny and closed**: three or four rows of `{name, width, height}` plus a type
  scale. It is not an algorithm; it is a fact, of the same kind and size as
  `genre-catalog.mjs:21-25` (`GENRE_CATALOG`, three rows), which this project **already** duplicates
  deliberately between `storyboard` and `deliver` and cross-checks by test
  (`genre-catalog.mjs:8-20` states the reasoning; `skills/splash/test/genre-shippability.test.ts`
  is the drift test, in both directions).
- The precedent is therefore not merely available, it is the **exact same shape of fact** and the
  exact same guard.
- The copies are cheap to guard **now** in a way they were not a week ago:
  `render-still-parity.test.ts` and `video-helper-parity.test.ts` **walk the tree** and compare
  function-by-function, so a new copy is guarded the moment it lands (`render-still-parity.test.ts:11-14`,
  `video-helper-parity.test.ts:18-20`). A size *table* is data, not a function, so neither walker
  covers it as written — a third walker of the same shape is needed (§5).
- The cautionary tale points the same way: `helper-parity.test.ts`'s hand-written list turned red for
  a correct change and kept a dead export alive (`video-helper-parity.test.ts:10-20`;
  `ChartWebSeed.tsx:63-70` documents an export kept solely to satisfy it). **Whatever guards the size
  copies must walk, never list.**

The one place I would flag genuine risk: the table's **type scale per size** is a judgement that will
be re-tuned after looking at renders. A judgement that drifts across eight copies is worse than a
constant that drifts, because a wrong scale is not wrong-looking in any single copy. A walking parity
test on the literal table text closes it, but it must exist from the first copy, not the third.

---

## 5. The seam — the smallest change that makes one beat produce at three sizes

### The shape, in one sentence

**Give each craft skill an identical, tiny `SIZES` table and make the beat's frame a function of a
chosen size rather than a module constant** — then let `renderStill`'s existing throw (static) and a
new equivalent (video) hold the contract. Nothing is imported; one walking parity test proves the
copies agree.

### The table, identically in each craft skill

```js
// carried, not imported — one copy per craft skill, guarded by a walking parity test
export const SIZES = {
  landscape: { width: …, height: …, typeScale: … },
  square:    { width: …, height: …, typeScale: … },
  portrait:  { width: …, height: …, typeScale: … },
};
```

Two deliberate departures from the original:

1. **`typeScale` is per size AND per genre** — the pixel dimensions may be shared between static and
   video, the type scale may not (§2, C1). That is why the table is carried per skill rather than
   being one identical set of numbers: `chart-beat`'s square row and `chart-video`'s square
   row will legitimately carry the same `width`/`height` and different `typeScale`. **The parity
   guard must therefore compare the dimensions across copies and NOT the scale** — a subtlety worth
   getting right before the first copy, or the guard is wrong from birth.
2. **No `allowedFormats`.** In the twin, "which genres exist" is already `genre-catalog.mjs`'s job.
   Size must not learn a second question — that is how the original ended up with a table that both
   sizes and gates.

### Per craft skill: the smallest change, the guard, and the honest cost

| skill | smallest change | guard | cost |
|---|---|---|---|
| **`chart-beat`** | Seed: `FRAME` becomes `sizeFor(name)`; the component takes `size` as a prop and derives `PAD` / type tokens from `SIZES[name].typeScale`. `renderStill` **unchanged** — its throw already enforces the contract. Beat render scripts pass the chosen size instead of two literals. | existing `renderStill` throw (`render-still.mjs:202-205`); new walking `size-table-parity.test.ts` | **Medium-high.** ~15 static types × (edit + render + look) at 3 sizes. The edit is small; the looking is not. Bucket C3/C5 types (small multiples, calendar, treemap, waffle) need a real second layout, not a scale. |
| **`chart-video`** | Delete the `FRAME` constant; `const { fps, width, height } = useVideoConfig()`. `Root.tsx` registers three `<Composition>`s from `SIZES`, passing `typeScale` in `defaultProps`. | **New**: a test asserting no video composition declares its own `FRAME` (the constant is the drift risk, and there is no guard today). Plus `video-first-frame-not-empty.test.ts` already re-runs per artifact. | **Lowest of the three.** The genre is one destructuring from being size-driven, and Remotion registers extra compositions for free. Real cost is re-rendering 3× the mp4s and extracting frames — the handover's own lesson that a still does not prove a video (`HANDOVER.md:676-681`). |
| **`chart-web`** | **No size table.** Instead: `WebFrame` gains a narrow-form `aspect-ratio` and the per-size tick hints; the stylesheet gains ONE `@media` that switches custom properties. | Narrow `seed-fluid-frame.test.ts:119-128` and `:322` from "no `@media` at all" to "no `@media` may hide a chart layer". `verify-web.mjs` already drives seven viewports (`:62-70`). | **Low mechanically, medium editorially.** The fluid frame did the hard part. The work is C2/C6 decisions per type at phone width, verified by driving. **Plus the 4 un-retrofitted beats — do those first.** |
| **`map-beat`** | `bake-plate.mjs` accepts `--width`/`--height` instead of one `--size` (four lines: `:63, 158, 216, 245`). The still composes plate-into-frame via a `fitBox`-shaped uniform scale. | `render-preview.mjs --check`; a test that the plate's declared frame equals its own screenshot clip. | **Highest.** Requires ruling on geo rule 12 (`geo-discipline.md:204-215`) first, and re-baking every plate. This is also where B4.1 lands, so it should be surveyed as one piece with the map axis, not twice. |
| **`map-web`** | Same four-line bake change (`:69, 134, 197, 216`) plus `PLATE_SIZE` (`render-web.mjs:72`) becoming a pair. | `map-web-discipline.md:105-120`'s uniform-scale rule is already the invariant; `verify-interaction.mjs`. | **Medium.** But 3 of its beats are still two-rung — retrofit before resizing. |
| **`image-beat`** | Already derives its height (`ImageBeatSeed.tsx:48-56, 158`). Needs only `FRAME_WIDTH` → `SIZES[name].width`, and `BOX_HEIGHT` derived from the size rather than fixed at 420 (`:56`). `fitBox` (`render-still.mjs:254-267`) already does the uniform placement. | existing `render-still-parity.test.ts` walker covers `fitBox`. | **Lowest of all.** A photograph does not care about aspect; the box does, and the box is already computed. |
| **`scrolly`** | Arguably none. It already models size as an **envelope** (`ScrollySeed.tsx:150`) with derived safe areas (`:164-181`). If anything, the other genres should learn from it. | `seed-tracks.test.ts`, `render-scrolly.test.ts` | **Near zero for B2.1** (a scrolly has no export size). Its size problem is B5.1 (fit the window), a different axis. |
| **`dw-beat`** | One call site: `exportChartPng(…, { width, height })` (`dw-client.mjs:58-60`). | existing `test/` | **Near zero.** Datawrapper re-lays out server-side. |

### The journey change (A5's size half)

Three edits, all small, all in the shape the codebase already uses:

1. `STORYBOARD.md`'s slot gains `size:` beside `medium:` and `genre:`
   (`storyboard/scripts/storyboard.mjs:121-160`).
2. `checkStoryboard` refuses a size the chosen genre cannot carry — mirroring the existing
   `if (slot.genre) { const gap = genreGap(slot.genre); … }` at `:147-150` exactly. The rule that
   makes A5's ordering work: **`genre: web` takes no size** (the original's
   `interactiveAspect: "responsive"` insight, §4); `static` and `video` require one.
3. `where.mjs`'s `missingForGate2` (`skills/splash/scripts/where.mjs:116-141`) learns the same
   rule independently — **and this is where A14 bites.** The two gates already diverged once on
   grounding (`twin/FEEDBACK-2026-08-10.md:38`). A new field is a new chance to diverge. Whoever adds
   `size` must add it to both readings **in the same commit** and extend the parity test in the same
   commit, or this survey has handed the project its next A14.

### One thing NOT to do

Do not add a `size` prop to the seeds and call it done. `ChartSeed.tsx:1-11` says *"REPLACE ME. Do
not parameterise me"*, and `references/seed-anatomy.md` defends it. The seed should **demonstrate**
reading a size from the table and deriving its frame from it — the same way its Quick start now
demonstrates `readPalette` instead of naming a hex (`chart-beat/SKILL.md:113-131`). The palette
threading is the exact precedent to copy, including its failure mode: `readPalette` **throws naming
every directory it searched** rather than defaulting (`render-still.mjs:98-123`). A beat with no size
recorded should throw the same way, for the same reason — a chart silently produced at a size nobody
chose looks deliberate.

---

## 6. Ranked by leverage across the types × genres

| # | Work | Types × genres it reaches | Cost | Why it ranks here |
|---|---|---|---|---|
| 1 | **Retrofit the 4 un-retrofitted web beats onto the fluid frame** (`more-heatmap-co2-per-capita-decades`, `mapgen-choropleth-web`, `mapgen-hexgrid-web`, `mapgen-locator-web`) | 4 beats, but closes B6.2 outright and part of B6.12 | Low — the mechanism exists and 19 beats already use it | Highest ratio in the survey. No new concept, no new guard, a named feedback item closed. |
| 2 | **Video: `useVideoConfig()` instead of `FRAME`, three `<Composition>`s from one table** | ~17 types × video | Low mechanically; 3× render time | One destructuring per beat. Also closes a real unguarded drift (the `FRAME`-vs-`<Composition>` pair has no test today). Delivers B2.1's video half almost entirely. |
| 3 | **The `SIZES` table + walking parity test, landed in one skill first** | foundation for everything below | Low | Must exist before the second copy, not after. Get the "compare dimensions, not `typeScale`" rule right here. |
| 4 | **Static: `FRAME` becomes `sizeFor(name)`, type tokens derive from `typeScale`** | ~15 types × static | Medium-high — the looking, not the editing | Delivers B2.1's static half. Buckets A and B mean most types need only the plumbing; C3/C5 types need a real second layout. |
| 5 | **Narrow the two `no @media` assertions, then the web mobile form (`--plot-aspect` + per-size tick hints)** | ~15 types × web | Medium | Delivers B3.2's remaining third. Do the assertion narrowing as its own commit with its reasoning, or it reads as a guard being deleted. |
| 6 | **`size` in the storyboard slot + both gate readings + parity test, same commit** | the journey | Low | Cheap, and it is what makes size a *decision* rather than a constant. A14 risk if split across commits. |
| 7 | **Maps: rectangular plates** | 6-8 map types × 3 genres | High | Requires ruling on geo rule 12 first and re-baking every plate. Overlaps B4.1 entirely — survey and spec as one piece with the map axis. |
| 8 | **`dw-beat`, `image-beat`** | 2 skills | Near zero | Almost free; do them alongside whichever wave is running. |

---

## 7. What I did not verify, and where I am uncertain

- **I did not render anything.** Every claim about layout behaviour at a second size is reasoning from
  the source, not from a picture. Given this project's own record (the heatmap that rendered as a
  flat grey slab with every assertion passing, `HANDOVER.md:668-681`), **treat §2's bucket
  assignments as a hypothesis to be checked by rendering one type at three sizes before any spec is
  written.** The cheapest disproof: take `proof/static-carbon-footprint-spread` (a simple histogram,
  bucket A+B only), draw it at 1080×1080 and 1080×1920 with a hand-picked type scale, and look. If
  that needs more than the table's `typeScale`, my cost estimates are all too low.
- **I did not measure the type × genre matrix myself.** I counted beats (37 static render scripts, 25
  video `Root.tsx`, 23 `render-web.mjs`) and took the type counts from `HANDOVER.md:655-667` (static
  15, web 15, video 17), which that same section records as having been **wrong once** before being
  re-measured. The feedback's "23 types" and those numbers do not obviously reconcile; I did not try
  to.
- **I have not established what a "size" should be named or valued.** Whether portrait is 9:16 or 4:5,
  whether landscape keeps 900×560's 1.607 or moves to 16:9, and what the static square's type scale
  is — all editorial, all requiring a render to settle. The original's 1080×1920 / 1080×1080 /
  1200×675 (`lib/core/channel-policy.ts:34, 41, 48`) are a reasonable starting proposal and nothing
  more.
- **The geo rule 12 tension (§1d) is a ruling I flagged but could not make.** It is the one place
  where B2.1 contradicts existing written doctrine rather than merely extending it.
- **`scrolly`'s `safeBand` may be the better model for all of this**, and I have not thought it
  through far enough to say. It treats size as a range with a proven-visible sub-rectangle, which is
  a strictly stronger statement than "three sizes". If a spec author has time for one exploration,
  that is the one I would spend it on.
