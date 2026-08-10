# Audit — W3, the seven visual mechanisms

Read-only audit of `twin/specs/W3-visual-mechanisms.md` (1051 lines) and everything it governs.
Base: `experiment/doctrine-twin` at **`dd01abf0`**. Every mutation below was run in a copy of the
tree under `/tmp/w3audit/`, never here. Nothing in the tree was edited to produce this file.

**Method.** The spec was read in full, then `PLAN-2026-08-10.md` and `FEEDBACK-2026-08-10.md`
B3.1 / B3.3 / B6.1–B6.19. The tree was then measured rather than read about: the crossfade guard was
re-run against the tree **as it stood immediately before the fix commit** (`git archive 5873c5e0^`),
seven mutations were injected in `/tmp` copies, and eleven delivered artifacts — four extracted mp4
frames and seven committed PNG/SVG — were opened and looked at.

**Headline.** The spec ordered seven mechanisms and eleven guards. **One and a half mechanisms
landed** (§ A in full, § C in two of its three copies, § E's third item), **two of eleven guards were
built**, and of the three mutations the delivered crossfade guard names in its own header as proof,
**one does not reproduce**. Two demonstrated blind spots let the owner's own reported defect through
unchanged. Five of the nine beats § A fixed still ship an mp4 that predates the fix, so a reader
opening them still sees the defect the commit claims to have removed.

---

## 1. Was the spec followed?

### 1.1 What landed

| § | Spec asked | Landed | Commit |
|---|---|---|---|
| A0.1 | ten missing `*-props.json` committed inside their beat | **yes** — 10 files, 3682 lines | `b67a0ff8` |
| A0.2 | SSR a Remotion component at a chosen frame via `mock.module` | **yes**, inlined in the guard rather than shipped as a helper | `5873c5e0` |
| A | thirteen crossfade sites cut, guard written first | **yes**, 9 beats' components | `5873c5e0` |
| A | choropleth title out of the `furniture` group | **yes** — verified on the delivered mp4, frame 0 | `5873c5e0` |
| E3 | the pyramid's spine-clearance mask into the static sibling | **yes** — `SwissAgePyramid.tsx:344-358` draws measured `spineSegments` | `12d2589d` |
| C | `HIT_TARGET_PX` becomes a floor | **2 of 3 copies** — seed + `QuakeSymbolWeb`; `DotDensityWeb.tsx:48` untouched | `20665b2c` |
| — | `measureTextBand` into the four byte-identical `render-still.mjs` copies | yes (not a W3 item; the § B helper it was meant to carry never came) | `7e20ccf5` |

### 1.2 Divergences, each classified

**D1 — assertion 2 was implemented far weaker than specified. Regression against the spec's own
rule, and demonstrated.** The spec (`:229-233`) is absolute: *"Two nodes with an identical geometry
key may never both be painted at effective opacity ≥ 0.02. No slope needed."* The shipped guard adds
three escape hatches — a mid-transition test, a ratio exemption for settled pairs, and a
`handoverReason` filter (`video-handover-is-a-cut.test.ts:` the `handoverReason` function) that only
returns a failure for (a) two painted interiors, (b) **two strokes of the same width**, or (c) an
outline ahead of its fill. Two of the three are justified in the header with real corpus examples
(`mapgen-flowmap-video`'s casing, `HeatmapVideo`'s subject wash). The stroke-width equality test is
not. **Measured:** taking the pre-fix `LollipopVideo.tsx`, which the guard reports with *"two strokes
of the same width (4) dissolve into each other"*, and changing only the accent stem's `strokeWidth`
from 4 to 5 drops that site from the report — 4 sites become 3, and the crossfade is unchanged. A
plain thin stem handing over to a thicker accent stem is invisible to the guard.

**D2 — § C landed in two of three copies. Incomplete, and it is the copy the owner reported.**
B6.14a is the France case: *"hover/tooltip must fire as soon as you enter the country, not only over
its capital."* `proof/mapgen-dot-web/DotDensityWeb.tsx:48` still holds `const HIT_TARGET_PX = 28;`
used as the size, and the delivered `dot-population.html` carries 42 `data-key` attributes, **all on
`<button class="pt">`, none on a drawn SVG element** — so the new edge probe cannot even find a mark
to measure (see § 5.2). The spec's polygon half (*"a real `<path>` hit region on the polygon's own
geometry, with `pointer-events: fill`"*) was not built.

**D3 — the E1 follow-on was not done. Unnoticed drift.** The spec (`:360`) asks that
`skills/twin-chart-web/SKILL.md:15-17` be corrected to the measured counts. It still reads *"Fifteen
beats ship through this skill … every one of them is on the fluid frame this skill now teaches."*
23 `render-web.mjs` files live under `proof/`; four of them are two-rung.

**D4 — B3.3 was settled elsewhere, and the spec's own proposal was never put to the owner.**
The 640 px cap the spec discusses at `:759-779` was already reversed by W2
(`38a0599f`; `skills/twin-chart-web/scripts/render-web.mjs:204` now reads *"no max-width cap"*). The
spec's alternative — `clamp()` on `--title-size` with the cap in `ch` — was neither built nor
presented. **Improvement by another route**, but the spec section is stale.

**D5 — B6.18b was touched from a different chantier.** `7dbc77b0` makes the live MapLibre layer obey
the same CSS filter selection as the labels and hit targets. That is W6's divergence class, not the
editorial rule W3 recorded at `:718-727` (*"a filter must not offer an option that excludes the
subject"*). Neither the rule nor the ban on hiding `.point-label` is enforced anywhere. **Adjacent
work, not this item.**

**D6 — the spec's own measured state is wrong in three places** (recorded, not blamed):
`:48-51` says 24 committed `.svg`; there are **48** (`git ls-files 'twin/proof/**/*.svg' | wc -l`).
`:837` describes `geo-symbol.ts`'s scale as `scaleSqrt().domain([0, maxMag])`; there is no d3 scale
in the tree — it is a hand-written closure at `proof/map-quake-symbol/geo-symbol.ts:120-123`
(arithmetically the same, so the 1.08 ratio stands). `:75-80`'s recount of § A ("13 sites, 8 files")
is itself an undercount — see § 2.1.

---

## 2. What the spec promises that is NOT in the tree

### 2.1 The "37 sites, not 13" claim — verified, and it does not hold

`SESSION-2026-08-09-10.md:71-72` and the guard's own header
(`video-handover-is-a-cut.test.ts:19-28`) state that the guard, written before any fix, *"printed
THIRTY-SEVEN distinct sites across TWELVE beats"*.

**Reproduced.** `git archive 5873c5e0^` into `/tmp/w3audit/pre-fix`, with the guard file taken from
`5873c5e0` itself, then `bun test skills/splash-twin/test/video-handover-is-a-cut.test.ts`:

```
 17 pass · 9 fail · Ran 26 tests
```

| beat | sites reported |
|---|---|
| `mapgen-choropleth-video` | 19 (17 crossfade + 2 frame-0) |
| `vidy-lollipop-renewables-share-europe` | 4 |
| `vidy-boxplot-co2-by-continent` | 3 |
| `video-population-growth-dumbbell` · `vidy-heatmap-…` · `vidy-histogram-…` · `vidy-pyramid-…` | 2 each |
| `map-quake-symbol` · `vidz-bar-column-top-emitters` | 1 each |
| **total** | **36 sites across 9 beats** |

**36, not 37. Nine beats, not twelve.** The 9 beats are exactly the 9 whose components `5873c5e0`
edited, so no beat was fixed by an earlier commit. The header names a *waterfall* among its finds;
`proof/vidy-waterfall-germany-electricity-mix` neither fails the shipped guard nor was touched by the
fix commit. Taking the weaker reading: either the header counts a run of an earlier, stricter draft
of the guard whose extra finds were then excluded by the ratio/`handoverReason` filters rather than
fixed, or it is an overcount. Either way **the number a reader should hold is 36 across 9, and the
guard as shipped cannot produce 37 across 12 against that tree.**

A second correction in the other direction: the comparison "37 vs the spec's 13" is not like for
like. The spec's 13 are **source sites**; the guard's are **rendered findings**, and one source site
(`ChoroplethVideo`'s 41 shapes) generates 17 of them. Counted as source sites, the guard found
**5 the spec missed** — the histogram's accent bar, the lollipop's stem and dot, the heatmap's cell,
the column ranking's bar — in **one beat the spec did not list** (`vidz-bar-column-top-emitters`).
That is a real and useful finding, and it is smaller than the one advertised.

### 2.2 The nineteen per-beat items

Genuinely fixed: **5 of 19** (plus one half). Verified by opening the artifact wherever an artifact
exists.

| item | verdict | evidence |
|---|---|---|
| B6.1 bump, 2020 missing | **untouched** | `BumpWeb.tsx:186` `NARROWEST_VIEWPORT_PX = 375`, `:286-289` `pxAt` divides by `narrowestPlotPx`, `:303-309` the tick filter. Delivered `bump-emitter-rank.html` axis run: 1990 1995 2000 2005 2010 2015 2024 — **no 2020** |
| B6.2 heatmap full width | **untouched** | `more-heatmap-…/render-web.mjs:256` `max-width: ${desktopCapPx}px` (900), `:262` `@media (max-width: 675px)`; both present in delivered `co2-heatmap.html:11,17` |
| B6.3 median over grey bars | **untouched** | committed SVG still `<line … stroke="#0B7A75" stroke-dasharray="6 4">` over `#616161` bars — **1.20 : 1**. Opened the PNG at 100 %: the rule vanishes where it crosses the first bar |
| B6.4 histogram video | **half fixed** | overlap gone — mp4 frame 158 prints the sentence alone. Median legibility untouched: `HistogramVideo.tsx` still strokes it in `muted`, and it reads only because 75.3 happens to land on the accent bar |
| B6.5 pyramid static | **half fixed** | spine mask landed (`12d2589d`); PNG shows `100+`, `95-99`, `85-89` intact. The peak label still sits at `x = plot.left` with a **13.2 px** dashed stub, and it lies across the `#0072B2` bar at **4.05 : 1** — the same class as B6.3, in a beat nobody listed for it |
| B6.6 pyramid web | **untouched** | `SwissAgePyramidWeb.tsx:324` `left:"0%", top:"0%"`; `render-web.mjs:269` still `peakLabel: "the widest band"` — the value the static carries is still dropped |
| B6.7 pyramid video | **fixed** | mp4 frame 268: one label, no ghost |
| B6.8 / B6.9 slope axes | **untouched**, diagnosis confirmed | static SVG holds 18 `<line>`: 6 connectors and 12 dashed label stubs whose longest vertical span is **6.21 px** against a ~292 px plot. Delivered web HTML: 10 `<line>`, all connectors. `slope.md:37` requires two vertical axes by name; `vidx-slope-child-mortality/SlopeVideo.tsx:346-361` draws them — 1 of 3 slope beats honours the sheet |
| B6.9b line hover | **untouched** | `pointer-events: stroke` appears nowhere in the tree outside the spec and survey prose |
| B6.10 Poland label | **untouched** | `bake.mjs:42-47` `label: [20.3, 52.2]` intact; opened `render/static.png` — the label sits in Poland's upper-right lobe |
| B6.11 video starts empty | **fixed** | mp4 frame 0 extracted: title and source only, map field blank |
| B6.13 dot density | **untouched** | `render.mjs:33` `accent:"#0072B2"`, `geo-dot.ts:392` `MIN_DOT_CONTRAST = 3` |
| B6.14a hover on entering | **untouched** | `DotDensityWeb.tsx:48` (see D2) |
| B6.15 flow/route × web | **not built**, and its primitive was not built either |
| B6.16 accent with nothing said | **untouched** | opened `map-quake-density/render/static.png`: one orange hexagon, and the file's 10 `<text>` nodes are all furniture |
| B6.17 symbol sizes | **untouched** | `radiusScale` unchanged; the legend in the delivered mp4 shows M7.8 / M8.5 / M9.1 as three near-identical rings |
| B6.18a hover on entering | **fixed** | `QuakeSymbolWeb.tsx:284-285` `max(HIT_TARGET_PX, …)`; the guard reddens when it is reverted (§ 5.2) |
| B6.18b filter outlives subject | **recorded only** (see D5) |
| B6.19 outlines before fills | **fixed** | mp4 frame 40: no empty rings |
| B3.1 entrance animation | **not built** | `@keyframes` appears in no file under `skills/` or `proof/` |
| B3.3 title width | settled by W2, not by this spec (D4) |

### 2.3 Five beats were fixed in source and never re-rendered

`5873c5e0` updated the mp4 for four beats only — `map-quake-symbol`, `mapgen-choropleth-video`,
`vidy-histogram-life-expectancy`, `vidy-pyramid-niger-population`. The other five components it
edited still ship the artifact a reader opens:

| beat | its mp4's last commit |
|---|---|
| `vidy-lollipop-renewables-share-europe` | `a75aa7ee` |
| `vidy-heatmap-renewables-europe` | `a75aa7ee` |
| `video-population-growth-dumbbell` | `a75aa7ee` |
| `vidy-boxplot-co2-by-continent` | `c3c3298d` |
| `vidz-bar-column-top-emitters` | `0c0e55c3` |

**Looked at.** `ffmpeg` frame 214 of the committed `lollipop.mp4`: the bold `67.8%` sits on top of the
pale `67.8% · 31.2 pts behind Norway`, the shared-prefix double-exposure the spec describes at `:176`.
The spec's own proof step (`:279-290`, *"Re-render … Open all six mp4s end to end once"*) was run for
four beats of the six named and for none of the five others. **The guard is green and the delivered
artifact is wrong** — the exact failure mode `HANDOVER.md` calls "the proof can lie", inverted.

### 2.4 Guards promised versus guards built — 2 of 11

| guard | § | built? |
|---|---|---|
| `video-handover-is-a-cut.test.ts` | A | **yes**, 957 lines |
| edge probe inside `interaction-promises-are-kept.test.ts` | C | **yes** |
| `web-frame-is-fluid.test.ts` | E1 | no |
| `map-web-table-is-a-decision.test.ts` | E2 | no |
| `genre-renderer-options-match.test.ts` | E2 | no |
| `assertAnnotationReadsOverMarks` + `annotation-reads-over-what-it-crosses.test.ts` | B | no |
| `emphasis-is-a-named-mark.test.ts` (+ its slope-axis assertion) | B / G | no |
| on-path probe (`getPointAtLength`) | G | no |
| `fluid-decisions-are-retaken.test.ts` | D | no |
| `an-encoding-separates.test.ts` | F | no |
| `web-entrance-is-an-addition.test.ts` | B3.1 | no |

A filesystem search of the whole tree finds none of the nine names, and greps find them only in
`specs/` and `survey/` prose.

**The § B leverage argument does not hold either.** The spec (`:466-473`) says putting the new
assertion into `render-still.mjs` gets it *"guarded in every copy the moment it lands"* because
`render-still-parity.test.ts` walks all 22. That guard's own header (`:22-26`) says the opposite:
*"A superset and a subset are both fine. What is never fine is two copies of the SAME function whose
bodies disagree."* Measured: `measureTextBand` is in **6 of 22** copies and the guard is green. The
walk keeps bodies identical where a function exists; it never demands the function exist.

### 2.5 E1 and E2 remain exactly as the spec measured them

Four beats still carry a two-rung layout — `mapgen-choropleth-web`, `mapgen-hexgrid-web`,
`mapgen-locator-web`, `more-heatmap-co2-per-capita-decades` — and their four delivered `.html` are
the only ones under `proof/` containing `@media (max-width:` and a px cap on the figure. Three
map-web renderers still render their table with no named option
(`mapgen-choropleth-web/render-web.mjs:151-153`, `mapgen-hexgrid-web:76-84`,
`mapgen-locator-web:71-73`), and `hex-grid.html` still ships **156** `<tbody>` rows. The B5.2 decision
the spec recommends is not recorded anywhere in the tree.

---

## 3. What was built that the spec did not ask for

Little, and most of it is defensible.

1. **The `handoverReason` / ratio-exemption machinery** in assertion 2 (D1). Two of its three
   exemptions are argued from real corpus cases; the stroke-width one is a hole.
2. **The Helvetica AFM advance tables** inside the guard (`:192-…`). Not in the spec. The spec assumed
   SSR would just work; two beats threw their own layout assertions under the fallback metric, and
   supplying real advances is the honest fix. Recorded in the guard's own header. **Improvement.**
3. **`measureTextBand` propagated to four `render-still.mjs` copies** (`7e20ccf5`, `12d2589d`). Needed
   by E3's spine mask; it is the § B *mechanism* (a shared helper walked by the parity guard) built
   for a different item than § B asked for.
4. **`7dbc77b0`** — the live-map filter parity work (D5). W6 scope.
5. **A `beats.length >= 20` discovery assertion** in the crossfade guard. Not specified; a good
   addition, though it would tolerate five beats silently dropping out (a beat missing either a props
   file or a timing file is skipped with no message).

Nothing was built that contradicts the spec's intent.

---

## 4. The holes — the classes, swept, not the instances

The owner reviewed a sample. Each class he named was swept across the whole corpus.

### 4.1 An annotation coloured against the page, not against what it crosses (B6.3's class)

Swept all 48 committed `.svg` with a bounding-box/paint-order scanner, validated against the known
case (it reproduces 1.20 : 1 exactly).

- **Dashed rules that actually cross a mark: 14. Thirteen fail 3 : 1.** The single pass passes only
  because it is black (3.39 : 1), not because anything measured it.
- **Texts sitting inside a filled mark: 85. Eleven fail 4.5 : 1.**
- The 13 failing files collapse to **2 distinct charts** — the carbon histogram (re-rendered at ten
  probe aspects) and the Swiss pyramid — so the honest count is **2 beats, 3 elements**: the
  histogram's median rule (1.20), its `Median: 3.1 t` label (3.39, ~8 % overlap, marginal), and the
  pyramid's `55-59: the widest band (669,962)` at **4.05 : 1 over `#0072B2`, 93 % of its width on the
  bar**. The last is a second, unreported instance of the owner's B6.3 in a different chart family.
- Every one of the 74 passing texts is an in-fill value label clustering just over 4.5 — the
  mechanism exists and works *inside marks*, and reaches the annotation layer nowhere.
- Not measurable this way: map beats, whose true background is a raster plate. `Poland` in accent ink
  over a mid-grey country fill is a candidate nobody has measured.

### 4.2 A label placed by a typed number, not by its shape (B6.10's class)

**8 live sites, in 6 beats and 2 skill seeds**, plus 3 dormant. The owner reported 1; the project's
own survey lists 4.

| site | evidence |
|---|---|
| `mapgen-choropleth-video/bake.mjs:42-47` | baked anchor `(389.2, 277.6)` vs Poland's bbox centre `(379.2, 280.0)` — **10 px east** on an 83.7 px shape; consumed by the still *and* the video |
| **`skills/twin-map-beat/scripts/bake-plate.mjs:46-52`** | the seed every map beat is scaffolded from hand-types both anchors, under a comment claiming *"Data, not a pixel constant"* |
| `static-swiss-age-pyramid` / `weby-population-pyramid-switzerland` | `x = plot.left` / `left:"0%", top:"0%"` — a 13.2 px stub and a label 208 units above its band |
| `web-income-life-expectancy:109-111` | three hand-tuned `dx/dy` pairs |
| `map-quake-symbol` / `mapgen-symbol-web` / `skills/twin-map-web` `geo-symbol.ts` | **three divergent copies** of one margin+`dy` ladder (130/90, `20/-12/5` vs `18/-10/4`), self-flagged `@parity-exempt` |

The derivation the spec asks for **already exists in the tree** — `pointOnFeature` (a documented pole
of inaccessibility) in three flow beats, dot-centroid in two, `bboxCenter` in two — and none of the
eight sites calls it.

### 4.3 A type sheet's named mark that the artifact does not draw (B6.8's class)

42 type sheets exist. **10 could be checked against a rendered artifact; 2 are breached, across
4 beats.** 32 could not be checked, almost all because no beat of that type exists.

- **slope** — 2 of 3 beats breach it (§ 2.2). The video sibling draws both axes.
- **histogram** — `histogram.md:34` requires bars *"edge-to-edge with no gap"*. Measured on the
  committed SVG: pitch **72.442**, width **71.442**, a **1.000 px gap at all nine boundaries**,
  produced by `CarbonFootprintHistogram.tsx:231` `width={Math.max(b.width - 1, 0)}` — sitting under
  a comment at `:224-225` asserting the opposite. `webx-carbon-footprint` renders the same 1 px gap.
  `HistogramVideo.tsx:478` is contiguous. Hairline and ground-coloured; the sheet's wording is
  absolute and the render measurably differs. **Same shape as the slope: the video honours the sheet,
  the static and web do not.**

### 4.4 Emphasis spent with nothing said (B6.16's class)

17 components carry an explicit accent branch. Sweeping all 25 SVG-bearing beats and the 29 delivered
`.html`: **2 clear instances, 1 weaker.**

- `map-quake-density` — 1 of 150 hex paths in accent; **10 `<text>` nodes, every one furniture**.
- `mapgen-hexgrid-web` — 2 of 312 paths in accent; the region name reaches only the accessible
  `<table>`, so a screen-reader user is told and a sighted reader is not.
- `map-quake-symbol` — weaker: the accent text `M9.1` names the mark's *value*, not its identity.

Both hexgrid instances are the same renderer, and **the rule was already written and applied in a
sibling**: `mapscrolly-quakes-three-ways/MapFrames.tsx:26-27` says so in prose. It never travelled.

### 4.5 Two label layers overlapping (B6.4/B6.7's class) outside video

The crossfade guard walks compositions with a frame only — its own blind spot 4. The corpus's only
overlap guard for statics is `skills/twin-chart-beat/test/three-sizes-no-collision.test.ts`, and it
renders **the seed**, at three sizes. **No guard measures label overlap in any of the 25 beat SVGs or
29 delivered HTML.** No instance was found by eye in the beats opened for this audit; the class is
unguarded rather than known-broken.

### 4.6 A video that does not start empty (B6.11's class)

Fully swept and closed: assertion 3 of the new guard runs on all 25 video beats, and the pre-fix run
shows `mapgen-choropleth-video` was the only breach. This is the one class where the correction is
both complete and mechanised — subject to the threshold weakness in § 5.1.

---

## 5. Every guard the spec promises, established RED or not

Seven mutations, each in a copy under `/tmp/w3audit/`.

### 5.1 `video-handover-is-a-cut.test.ts` — 2 of its 3 stated mutations reproduce

| # | mutation | result |
|---|---|---|
| M1 | restore pre-fix `HistogramVideo.tsx` | **RED** — *"frame 155: two texts crossfade on baseline y≈372 — `65` is falling (0.962 → 0.923) while `65 countries, 75–80 years — the most of any span` is rising"*. The header's claim holds (it says frame 156) |
| M3′ | restore pre-fix `LollipopVideo.tsx` | **RED**, 4 sites |
| M2 | re-gate `ChoroplethVideo`'s `titleLines` in `<g opacity={furniture}>` | **GREEN — does not reproduce** |
| M5 | as M3′, then widen the accent stem from 4 to 5 | **GREEN for that site** — 4 sites become 3 |
| M1c | both histogram labels mounted, outgoing held at 1.0 instead of faded | **GREEN** |

**M2 is the header's own third proof and it fails.** With the title re-gated, an effective-opacity
probe of the SSR'd document at frame 0 returns exactly two texts at full opacity — the source line
and its `OpenStreetMap` continuation — so `fullText.length < 2` is satisfied and assertion 3 passes.
A poster frame carrying **no title at all** is green. The threshold "at least two `<text>` nodes"
is met by the source credit alone in this genre.

**M1c is the sharper hole.** Assertion 1 fires only when one text is *falling* and another *rising*.
Mount both nodes and hold the outgoing one at 1.0 and nothing fires. An SSR probe of the mutated
component at frame 170 prints:

```
1.000  "65"
0.943  "65 countries, 75–80 years — the most of any span"
```

— the same baseline, the same superimposed duplicate the owner reported as B6.4, and `26 pass /
0 fail`. The guard's header lists five blind spots; this is not among them.

**M5** demonstrates D1: identical geometry, two strokes, unequal widths, no report.

### 5.2 The edge probe in `interaction-promises-are-kept.test.ts` — reddens, and is vacuous on most of the corpus

**RED, richly.** Reverting `QuakeSymbolWeb.tsx` to a flat 28 px target and re-rendering the beat:

```
proof/mapgen-symbol-web/quake-symbol.html: 3 mark(s) answer at their centre but not inside
their own drawn edges — the hit target is smaller than the mark a reader is pointing at:
  "M7.8 · 69 km WSW of Kirakira, Solomon Islands · 2016-12-08" — drawn 49px across, target 28px,
   silent at left, top, bottom
  …
```

**But it covers 4 of 23 artifacts.** Instrumenting the guard's own roster in the `/tmp` copy:

```
mapgen-choropleth-web  edges 1/1 · no-drawn-mark 2
mapgen-hexgrid-web     edges 3/3
mapgen-locator-web     edges 3/3
mapgen-symbol-web      edges 3/3
mapgen-dot-web                  no-drawn-mark 3
…15 further artifacts:          no-drawn-mark 3
```

`report.edgesUnderivable` is counted, printed, and **never asserted** — the assertion body iterates
`report.edges`, which is empty, so the test passes vacuously. `mapgen-dot-web` — the beat of B6.14a —
is one of the fifteen: 42 `data-key` attributes, all on buttons, none on a drawn element. **The one
beat the owner reported for this mechanism is both unfixed and unreachable by the guard that was
extended to catch it.**

### 5.3 `render-still-parity.test.ts` — the historic inert bug is fixed

The project shipped this comparing signatures instead of bodies, so it was inert for every function
with a destructured parameter. Two mutations:

- semantic drift inside `measureTextBand` in the `twin-map-beat` copy → **RED**, naming
  `measureTextBand`;
- semantic drift inside `readPalette(dir, { stopAt } = {})` — the destructured-signature case that
  used to be invisible — in the `twin-chart-web` copy → **RED**, naming `readPalette`.

It compares bodies now. A comment-only change is normalised away, which is correct.
Its remaining hole is architectural, not a bug: § 2.4's superset/subset rule.

### 5.4 The nine unbuilt guards

Cannot go red. There is nothing to mutate.

### 5.5 Suite baseline

`bun test skills/splash-twin/test/` on a clean `dd01abf0` copy: **1037 pass · 1 skip · 1 fail**. The
failure is `claims-grounded-in-data.test.ts:751` — 22 `proof/portrait-aspect-probe/*.png` with no
producing script in their ancestry, from `e457813e`. Not a W3 regression; recorded because a red
suite is where a green guard hides.

---

## 6. What this audit does not close

- **The video corpus was sampled, not watched.** Four mp4 frames were extracted at the frames the
  spec names. No mp4 was watched end to end, which is what § A's own proof step asks for and which is
  the only way to judge whether a cut lands at a good moment.
- **Map annotation contrast is unmeasured.** The SVG scanner cannot read a raster basemap, so every
  map label's contrast against the fill under it — including `Poland` — is unknown in both directions.
- **32 of 42 type sheets were not checked** against a render, almost all because no beat of that type
  exists. The class in § 4.3 is a floor, not a total.
- **Web artifacts were not driven at 375 / 1400 / 3440.** E1's and D's proofs are stated from the
  delivered CSS and DOM, not from a browser at four widths.
- **Three files are owned by concurrent agents** (`twin-scrolly`, `installer`, `newsroom.mjs`,
  `portrait-aspect-probe`) and were read but not measured; anything the scrolly does with these
  mechanisms is outside this audit.
- **The `/tmp` mutations prove a guard reacts; they do not prove the fix is right.** M1 shows the
  guard sees the crossfade return. It says nothing about whether the nine cut components read well,
  which is § 2.3's point and needs a person and an mp4.
