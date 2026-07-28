# Splash V2 — Capability Matrix (measured)

Measured on the read-only worktree `splash-audit`, detached at `d7044400`, on 2026-07-28.
Every number below was produced by CALLING the code named beside it — `lib/core/registry.ts`,
`lib/loop/buildable.ts` / `lib/loop/assemble/index.ts`, `lib/brain/typology.ts` (`renderableSheets`),
`lib/brain/eligibility.ts` (`eligible`), `lib/brain/offer.ts` (`buildOffer`), `lib/brain/beats.ts`
(`suggestBeats`), `skills/scrolly/src/scrolly-types.ts`. Nothing here is read off a list and reasoned about.

---

## 1. The headline numbers

### 1a. What the ENGINES declare, and what the LOOP can assemble

The producer registry is populated by `skills/splash/src/register-producers.ts` (six manifests).
`allProducers()` returns:

| engine | declared formats | declared types | of which `deferred` |
|---|---|---|---|
| chart-native | static, interactive, video | 41 | 14 |
| map-native | static, interactive, video | 7 | 0 |
| scrolly | scrolly | 0 (hosts another engine's track) | — |
| image-native | scrolly | 1 | 0 |
| dw-chart | static, interactive | 22 | 10 |
| map-dw | static, interactive | 3 | 1 |

**The arithmetic, engine side.** `engine.formats × engine.types`:

```
chart-native   41 types x 3 formats = 123
map-native      7 types x 3 formats =  21
image-native    1 type  x 1 format  =   1
dw-chart       22 types x 2 formats =  44
map-dw          3 types x 2 formats =   6
scrolly         0 types             =   0
                                     ----
declared triples                      195
  minus registry-`deferred`           -64   (14x3 chart-native, 10x2 dw-chart, 1x2 map-dw)
  minus assembler `supports` declines  -2   (map-dw locator, static + interactive)
                                     ----
loop-buildable, engine-declared       129   <- isLoopBuildable() answered true 129 times
```

**Plus the scrolly overlay.** `scrolly` is not in any host engine's `formats`; `producerForFormat`
routes it to `skills/scrolly`. Measured over the host engines' non-deferred types:

```
non-deferred host types routed to the scrolly host   48
  isLoopBuildable() says buildable                   48   <- the scrolly ASSEMBLER entry has no `supports`
  actually hosted by the scrolly DISPATCH            11   <- CHART_SCROLLY_TYPES + MAP_SCROLLY_TYPES
```

So the honest engine-side total is **129 + 11 = 140 buildable (engine, type, format) triples** —
and the loop's own `isLoopBuildable` over-claims by 37 on the scrolly axis (gap G4 below).

### 1b. What a JOURNALIST can be offered

The brain offers from KB sheets, not engine catalogues. `loadTypology()` finds **46 sheets on disk**
(38 chart, 7 map, 1 image). `renderableSheets()` — the join that drops a sheet whose every engine key
is `deferred` — returns **46 (sheet, engine) pairs over 35 distinct sheet ids**. **11 sheets never
enter the candidate set at all.**

`eligible()` was then run per pair, on each channel, with facts SYNTHESIZED FROM THAT SHEET'S OWN
declared `limits` — so a data limit can never produce a false negative:

| channel | offerable rows | unmarked | distinct sheets | distinct sheets unmarked |
|---|---|---|---|---|
| social-vertical | 79 | 78 | 34 | 34 |
| social-feed | 79 | 78 | 34 | 34 |
| **article-web** | **139** | **122** | **35** | **34** |
| print-page | 34 | 34 | 34 | 34 |

**The arithmetic, journalist side (article-web, the widest channel):**

```
chart-native   27 sheets x 3 formats (static/interactive/video) =  81  clean
dw-chart        9 sheets x 2 formats (static/interactive)       =  18  clean
map-native      7 sheets x 3 formats                            =  21  clean
map-dw          1 sheet  x 2 formats (choropleth only)          =   2  clean
                                                                 ----
unmarked offerable rows                                           122
map-dw locator x 2 formats                                          2  MARKED unbuildable
every scrolly row (10 sheets, 15 sheet-engine pairs)               15  MARKED article-branch
                                                                 ----
total offerable rows                                              139
```

Collapsed to what a journalist actually sees — **distinct (sheet, format), across all four channels**:

```
offerable                112
offerable UNMARKED       102   = 34 sheets x 3 formats (static, interactive, video)
  static       34 sheets (34 unmarked)
  interactive  34 sheets (34 unmarked)
  video        34 sheets (34 unmarked)
  scrolly      10 sheets ( 0 unmarked)   <- the whole narrative branch is offered MARKED
```

A live `buildOffer({channel:"article-web", intents:["compare"], facts:{rows:6,points:3}})` returned
`bar/chart-native/interactive, lollipop/chart-native/interactive, bump/chart-native/video` — three
rows because `DEFAULT_MAX` is 3, not because three forms work.

### 1c. The three numbers side by side

| question | answer | measured by |
|---|---|---|
| (engine, type, format) triples declared at all | **195** (+48 scrolly overlay) | `allProducers()` × `engineTypes()` |
| triples the loop can build | **140** (129 declared + 11 hosted scrolly) | `isLoopBuildable` / `assemblerFor`, corrected against the scrolly dispatch |
| distinct (sheet, format) a journalist can be offered unmarked | **102** | `renderableSheets()` → `eligible()` |

---

## 2. The tables

### Table A — the engine catalogue (registry × loop assembler table)

`build` = the loop's `assemblerFor` composes a spec for this (type, format). `deferred` = declared by the engine, flagged `deferred` in its manifest — declared-but-not-producible. `decline` = the assembler table's `supports` refuses it. `—` = the engine does not declare this format. `via scrolly` = the format is hosted by `skills/scrolly`, not by the engine itself.

### chart-native — 41 declared types

| type | static | interactive | video | scrolly |
|---|---|---|---|---|
| line | build | build | build | via scrolly |
| bar | build | build | build | via scrolly |
| scatter | build | build | build | via scrolly |
| pie | build | build | build | via scrolly (NOT hosted by the dispatch) |
| grouped | build | build | build | via scrolly (NOT hosted by the dispatch) |
| stacked | build | build | build | via scrolly (NOT hosted by the dispatch) |
| stacked-area | build | build | build | via scrolly (NOT hosted by the dispatch) |
| slope | build | build | build | via scrolly (NOT hosted by the dispatch) |
| dumbbell | build | build | build | via scrolly (NOT hosted by the dispatch) |
| histogram | build | build | build | via scrolly (NOT hosted by the dispatch) |
| diverging | build | build | build | via scrolly (NOT hosted by the dispatch) |
| waterfall | build | build | build | via scrolly (NOT hosted by the dispatch) |
| lollipop | build | build | build | via scrolly (NOT hosted by the dispatch) |
| pyramid | build | build | build | via scrolly (NOT hosted by the dispatch) |
| bullet | build | build | build | via scrolly (NOT hosted by the dispatch) |
| connected-scatter | build | build | build | via scrolly (NOT hosted by the dispatch) |
| boxplot | build | build | build | via scrolly (NOT hosted by the dispatch) |
| bump | build | build | build | via scrolly (NOT hosted by the dispatch) |
| beeswarm | build | build | build | via scrolly (NOT hosted by the dispatch) |
| treemap | build | build | build | via scrolly (NOT hosted by the dispatch) |
| diverging-stacked | build | build | build | via scrolly (NOT hosted by the dispatch) |
| waffle | build | build | build | via scrolly (NOT hosted by the dispatch) |
| fan | build | build | build | via scrolly (NOT hosted by the dispatch) |
| dot-strip | build | build | build | via scrolly (NOT hosted by the dispatch) |
| violin | build | build | build | via scrolly (NOT hosted by the dispatch) |
| radial-bar | build | build | build | via scrolly (NOT hosted by the dispatch) |
| heatmap | build | build | build | via scrolly (NOT hosted by the dispatch) |
| marimekko | deferred | deferred | deferred | deferred |
| radar | deferred | deferred | deferred | deferred |
| sankey | deferred | deferred | deferred | deferred |
| streamgraph | deferred | deferred | deferred | deferred |
| gantt | deferred | deferred | deferred | deferred |
| calendar | deferred | deferred | deferred | deferred |
| lorenz | deferred | deferred | deferred | deferred |
| candlestick | deferred | deferred | deferred | deferred |
| chord | deferred | deferred | deferred | deferred |
| sunburst | deferred | deferred | deferred | deferred |
| parallel | deferred | deferred | deferred | deferred |
| arc | deferred | deferred | deferred | deferred |
| combo | deferred | deferred | deferred | deferred |
| pictogram | deferred | deferred | deferred | deferred |

### map-native — 7 declared types

| type | static | interactive | video | scrolly |
|---|---|---|---|---|
| choropleth | build | build | build | via scrolly |
| symbol | build | build | build | via scrolly |
| route | build | build | build | via scrolly (NOT hosted by the dispatch) |
| locator | build | build | build | via scrolly |
| dot-density | build | build | build | via scrolly |
| hex-grid | build | build | build | via scrolly |
| cartogram | build | build | build | via scrolly |

### scrolly

Owns no type of its own (formats: scrolly). It hosts another engine's track.

### image-native — 1 declared types

| type | static | interactive | video | scrolly |
|---|---|---|---|---|
| image-scrolly | — | — | — | build |

### dw-chart — 22 declared types

| type | static | interactive | video | scrolly |
|---|---|---|---|---|
| column-chart | build | build | — | via scrolly (NOT hosted by the dispatch) |
| d3-bars | build | build | — | via scrolly (NOT hosted by the dispatch) |
| d3-lines | build | build | — | via scrolly (NOT hosted by the dispatch) |
| d3-area | deferred | deferred | — | deferred |
| d3-pies | build | build | — | via scrolly (NOT hosted by the dispatch) |
| d3-donuts | deferred | deferred | — | deferred |
| election-donut-chart | deferred | deferred | — | deferred |
| d3-dot-plot | build | build | — | via scrolly (NOT hosted by the dispatch) |
| tables | deferred | deferred | — | deferred |
| grouped-column-chart | build | build | — | via scrolly (NOT hosted by the dispatch) |
| stacked-column-chart | build | build | — | via scrolly (NOT hosted by the dispatch) |
| multiple-columns | deferred | deferred | — | deferred |
| d3-bars-grouped | build | build | — | via scrolly (NOT hosted by the dispatch) |
| d3-bars-stacked | build | build | — | via scrolly (NOT hosted by the dispatch) |
| d3-bars-split | deferred | deferred | — | deferred |
| multiple-lines | deferred | deferred | — | deferred |
| d3-multiple-pies | deferred | deferred | — | deferred |
| d3-multiple-donuts | deferred | deferred | — | deferred |
| d3-scatter-plot | build | build | — | via scrolly (NOT hosted by the dispatch) |
| d3-range-plot | build | build | — | via scrolly (NOT hosted by the dispatch) |
| d3-arrow-plot | deferred | deferred | — | deferred |
| d3-bars-bullet | build | build | — | via scrolly (NOT hosted by the dispatch) |

### map-dw — 3 declared types

| type | static | interactive | video | scrolly |
|---|---|---|---|---|
| choropleth | build | build | — | via scrolly |
| symbol | deferred | deferred | — | deferred |
| locator | decline | decline | — | via scrolly |

### Table B — what a journalist can be offered (lib/brain, article-web)

One row per KB sheet, per engine that renders it. `clean` = offered unmarked. `MARKED` = offered with a mark naming why it is a dead end (spec §8: marked, never silently removed). `—` = the sheet does not declare that format, or the format's producer cannot build it. Facts are synthesized FROM each sheet's own declared `limits`, so a data limit can never cause a false negative here.

| sheet | engine | render key | static | interactive | video | scrolly |
|---|---|---|---|---|---|---|
| bump | chart-native | bump | clean | clean | clean | — |
| scatter | chart-native | scatter | clean | clean | clean | MARKED article-branch |
| scatter | dw-chart | d3-scatter-plot | clean | clean | — | MARKED article-branch |
| bar | chart-native | bar | clean | clean | clean | MARKED article-branch |
| bar | dw-chart | d3-bars | clean | clean | — | MARKED article-branch |
| waterfall | chart-native | waterfall | clean | clean | clean | — |
| stacked-bar | chart-native | stacked | clean | clean | clean | — |
| stacked-bar | dw-chart | d3-bars-stacked | clean | clean | — | — |
| dot-strip | chart-native | dot-strip | clean | clean | clean | — |
| diverging-bar | chart-native | diverging | clean | clean | clean | — |
| bullet | chart-native | bullet | clean | clean | clean | — |
| bullet | dw-chart | d3-bars-bullet | clean | clean | — | — |
| dumbbell | chart-native | dumbbell | clean | clean | clean | — |
| dumbbell | dw-chart | d3-range-plot | clean | clean | — | — |
| violin | chart-native | violin | clean | clean | clean | — |
| boxplot | chart-native | boxplot | clean | clean | clean | — |
| fan | chart-native | fan | clean | clean | clean | — |
| grouped-bar | chart-native | grouped | clean | clean | clean | — |
| grouped-bar | dw-chart | d3-bars-grouped | clean | clean | — | — |
| diverging-stacked | chart-native | diverging-stacked | clean | clean | clean | — |
| waffle | chart-native | waffle | clean | clean | clean | — |
| heatmap | chart-native | heatmap | clean | clean | clean | — |
| stacked-area | chart-native | stacked-area | clean | clean | clean | — |
| population-pyramid | chart-native | pyramid | clean | clean | clean | — |
| pie | chart-native | pie | clean | clean | clean | — |
| pie | dw-chart | d3-pies | clean | clean | — | — |
| radial-bar | chart-native | radial-bar | clean | clean | clean | — |
| beeswarm | chart-native | beeswarm | clean | clean | clean | — |
| treemap | chart-native | treemap | clean | clean | clean | — |
| histogram | chart-native | histogram | clean | clean | clean | — |
| lollipop | chart-native | lollipop | clean | clean | clean | — |
| lollipop | dw-chart | d3-dot-plot | clean | clean | — | — |
| slope | chart-native | slope | clean | clean | clean | — |
| connected-scatter | chart-native | connected-scatter | clean | clean | clean | — |
| line | chart-native | line | clean | clean | clean | MARKED article-branch |
| line | dw-chart | d3-lines | clean | clean | — | MARKED article-branch |
| hex-grid | map-native | hex-grid | clean | clean | clean | MARKED article-branch |
| dot-density | map-native | dot-density | clean | clean | clean | MARKED article-branch |
| choropleth | map-native | choropleth | clean | clean | clean | MARKED article-branch |
| choropleth | map-dw | choropleth | clean | clean | — | MARKED article-branch |
| cartogram | map-native | cartogram | clean | clean | clean | MARKED article-branch |
| locator | map-native | locator | clean | clean | clean | MARKED article-branch |
| locator | map-dw | locator | MARKED unbuildable | MARKED unbuildable | — | MARKED article-branch |
| route | map-native | route | clean | clean | clean | — |
| proportional-symbol | map-native | symbol | clean | clean | clean | MARKED article-branch |
| image-scrolly | image-native | image-scrolly | — | — | — | MARKED article-branch |

#### Table B totals (article-web)
- offerable rows = **139**, of which unmarked = **122**

#### Offerability per channel

| channel | offerable rows | unmarked | distinct sheets | distinct sheets unmarked |
|---|---|---|---|---|
| social-vertical | 79 | 78 | 34 | 34 |
| social-feed | 79 | 78 | 34 | 34 |
| article-web | 139 | 122 | 35 | 34 |
| print-page | 34 | 34 | 34 | 34 |

### Table C — scrolly: hosted ≠ authorable

`hosted` = the type has a branch in the scrolly dispatch (`CHART_SCROLLY_TYPES` / `MAP_SCROLLY_TYPES`). `authorable` = `lib/brain/beats.ts` will draft a beat plan the journalist can rewrite (`BEAT_TYPES`); everything else derives its own walk from the data, and the map track refuses an authored plan loud.

| render key | declared by KB sheet | hosted by the scrolly dispatch | walk authorable |
|---|---|---|---|
| bar | bar/chart-native | yes | yes |
| cartogram | cartogram/map-native | yes | no |
| choropleth | choropleth/map-native, choropleth/map-dw | yes | no |
| column-chart | bar/dw-chart | **no** | no |
| d3-bars | bar/dw-chart | **no** | no |
| d3-lines | line/dw-chart | **no** | no |
| d3-scatter-plot | scatter/dw-chart | **no** | no |
| dot-density | dot-density/map-native | yes | no |
| hex-grid | hex-grid/map-native | yes | no |
| image-scrolly | image-scrolly/image-native | **no** | no |
| line | line/chart-native | yes | yes |
| locator | locator/map-native, locator/map-dw | yes | no |
| scatter | scatter/chart-native | yes | no |
| symbol | proportional-symbol/map-native | yes | no |

Two footnotes on that table. **`image-scrolly`'s "no" is correct but not a defect**: `image-native`
declares `scrolly` in its OWN `formats`, so `producerForFormat` routes it straight to `image-native`
and it never passes through the scrolly dispatch — it has no business being in
`CHART_SCROLLY_TYPES`/`MAP_SCROLLY_TYPES`. **The four dw-chart keys' "no" IS the defect** (G4):
`column-chart`, `d3-bars`, `d3-lines`, `d3-scatter-plot` are routed to `skills/scrolly`, which sends
any non-`MAP_TYPES` key to `assembleChartNative` — a chart-native assembler handed a Datawrapper
render key. And `hosted ≠ authorable` is the headline of this table: **11 types hosted, 2 authorable.**

---

## 3. The gaps, named — and whether anybody could have wired them

### G1 — 11 KB sheets whose only engine key is `deferred` (an ENGINE gap, not a KB gap)

`renderableSheets()` drops these because `isRenderable("chart-native", key)` is false. The KB sheet
EXISTS and is well-formed; chart-native declares the type and flags it `deferred` in
`skills/chart-native/src/native-types.ts` (family B). Measured, with each engine's own reason:

| sheet | engine key | registry reason |
|---|---|---|
| candlestick | chart-native:candlestick | family-B: needs OHLC |
| calendar | chart-native:calendar | family-B: needs a dense date grid |
| marimekko | chart-native:marimekko | family-B: 2D width×height encoding |
| sunburst | chart-native:sunburst | family-B: needs a hierarchy |
| sankey | chart-native:sankey | family-B: needs nodes+links |
| parallel | chart-native:parallel | family-B: rare in a small newsroom |
| chord | chart-native:chord | family-B: needs a flow matrix |
| lorenz | chart-native:lorenz | family-B: specialist inequality curve |
| streamgraph | chart-native:streamgraph | family-B: rare in a small newsroom |
| radar | chart-native:radar | family-B: rare in a small newsroom |
| gantt | chart-native:gantt | family-B: needs start/end intervals |

Each declares `formats: [static, interactive, video]`, so this is **33 (sheet, format) offers that do
not exist**. Verdict: *nobody wired it*, deliberately and with a reason recorded per type. Not "it
cannot work" — these are ordinary D3 charts; family B was scoped out because the CSV shapes an
article yields rarely fit them.

### G2 — 10 dw-chart engine types no KB sheet models (a KB gap, self-declared)

`d3-area`, `d3-donuts`, `election-donut-chart`, `tables`, `multiple-columns`, `d3-bars-split`,
`multiple-lines`, `d3-multiple-pies`, `d3-multiple-donuts`, `d3-arrow-plot`. Datawrapper renders all
ten (`validateChartSpec` accepts them unconditionally); `NOT_KB_MODELED` in
`skills/dw-chart/src/manifest.ts` flags them `deferred` with a per-type sentence explaining that the
KB does not curate them. **20 triples (10 × static/interactive).** Verdict: *nobody wired it* — this
is the one gap that is purely a missing KB sheet, and the manifest says so in its own words.

### G3 — 3 dw-chart types that are non-deferred and STILL unreachable (a BRAIN narrowing)

Measured: dw-chart declares 12 non-deferred types; `renderableSheets()` selects only 9 of them.
The missing three are `column-chart`, `grouped-column-chart`, `stacked-column-chart` — the VERTICAL
siblings named as second keys by `bar.md`, `grouped-bar.md`, `stacked-bar.md`. `renderableSheets()`
takes `keys.find(isRenderable)` — **the first renderable key wins and the sibling is never offered**.
So the KB models orientation as a two-key list and the brain can only ever pick the horizontal one.
**6 triples (3 × static/interactive).** Verdict: *nobody wired it* — orientation has no representation
in the offer, only in the sheet.

### G4 — the loop's `scrolly` entry has no `supports`, and over-claims by 37

`ASSEMBLERS.scrolly` (`lib/loop/assemble/index.ts:53`) declares no `supports`, so
`isLoopBuildable("scrolly", anyType, "scrolly")` answers **true for all 48** host-engine non-deferred
types. The scrolly DISPATCH hosts 11 (`CHART_SCROLLY_TYPES` = line, bar, scatter;
`MAP_SCROLLY_TYPES` = symbol, hex-grid, dot-density, locator, cartogram, choropleth — via map-native
and, for choropleth/locator, map-dw). Directly probed:

```
assembleScrolly({nativeType: "route"})           -> ok   (route has NO scrolly branch)
assembleScrolly({nativeType: "d3-scatter-plot"}) -> ok   (a dw-chart render key, sent to assembleChartNative)
```

What keeps this from firing today is a KB discipline, not a loop guard: only 10 sheets declare the
`scrolly` format, and `route.md` is not one of them. But **three dw-chart render keys DO reach it
through the offer** — `d3-bars`, `d3-lines` and `d3-scatter-plot`, the chosen keys of `bar.md`,
`line.md` and `scatter.md`, all three of which declare the `scrolly` format. (`column-chart` is named
by `bar.md` too but is never chosen — G3.) Those rows survive `eligible()` today only
because the article-branch mark masks them (G5). Verdict: *a loop `supports` narrowing that was never
written*. The moment the article branch ships, a dw-chart-keyed scrolly is a live dead end.

### G5 — the whole narrative branch is offered MARKED, never clean

`ARTICLE_BRANCH_ENGINES` (`lib/brain/eligibility.ts:60`) + `c.format === "scrolly"` puts a
`missing` mark on every scrolly candidate: *"this is the whole-article branch — it is not built yet,
and it changes what gets delivered"*. Measured: **15 of 15 scrolly rows on article-web carry it, and
0 are clean** — including `image-scrolly`, which is `image-native`'s ONLY format, making that engine
the one engine a journalist can never be offered unmarked. Verdict: *nobody wired it* — the scrolly
engine has an assembler, a registry entry and a render proof; what is missing is the loop branch that
delivers a page rather than an embeddable element.

### G6 — map-dw `locator`: declined by the loop, with the wrong sentence

`supportsMapDwType` (`lib/loop/assemble/map-dw.ts:73`) returns true for `choropleth` alone, so
`locator` — declared and NOT deferred in the manifest — is declined. It is the only non-deferred
engine-declared pairing the assembler table refuses (**2 triples**). `map-dw.ts` HAS a written refusal
for it (`typeRefusal`: *"map-dw can host a locator map, but the loop composes only its choropleth
today"*), but the `ASSEMBLERS["map-dw"]` entry declares no `declines`, so `unbuildableEngineReason`
falls through to the generic sentence — measured verbatim:

> `nothing can build a map-dw form yet — production is wired for chart-native, map-native, scrolly, image-native, map-dw, dw-chart only`

...which names `map-dw` in its own list of what IS wired. `buildable.ts:88-90` warns about exactly
this self-contradiction for dw-chart and the fix was not applied to map-dw. Verdict: *nobody wired it*
— one `declines` line away from correct.

### G7 — `isLoopBuildable` does not stop a registry-`deferred` chart-native type

Measured: `isLoopBuildable("chart-native", "sankey", "static")` → **true**, while
`isRenderable("chart-native", "sankey")` → **false**. `ASSEMBLERS["chart-native"]` has no `supports`,
so the loop's arbiter accepts all 14 deferred family-B types. The ONLY thing that stops them is the
`renderableSheets()` join in the brain. A caller that is not the brain — a hand-authored manifest, a
fixture, a resumed run predating the brain (`isLoopBuildable` explicitly returns `true` for
`engine === undefined`) — passes the gate and dead-ends inside the engine. Verdict: *a structural
narrowing that is missing*, and the same class as G4.

---

## 4. The three limits the branch already states about itself, and where each one bites

### L1 — only two basemaps ship: `world` and `us-states`

`BASEMAPS` (`skills/map-native/src/basemaps.ts`) has exactly 2 entries; `DW_BASEMAPS`
(`lib/loop/assemble/map-dw.ts:46`) has exactly 2. **Where it bites:** it removes no cell from the
matrix — it makes every map cell CONDITIONAL on the data's geography resolving to one of two
basemaps. That is **23 unmarked rows** (map-native 7 sheets × 3 formats = 21, plus map-dw choropleth
× 2) plus 8 marked scrolly rows: every map form Splash can offer is a form it can only actually build
for world countries or US states. A Swiss cantonal choropleth — the pilot's own subject, Annemasse —
is not in the matrix at all, and this limit is why. This is the single largest gap between "the
matrix says yes" and "a newsroom gets a picture", and it is invisible in every count above because
geography is a fact of the data, not a coordinate of the grid.

### L2 — dot-density is bounded to `world`

`lib/loop/assemble/map-native.ts:200` refuses any non-`world` basemap for `dot-density`, because
`DotDensityMap.tsx` hard-imports `world.geojson` and hard-codes `iso_a3` — a `us-states` dot-density
would clear `validate-config` and render silently WRONG. **Where it bites:** the `dot-density` sheet's
3 unmarked rows (static/interactive/video) + 1 marked scrolly row lose their us-states half. It is the
one place the codebase chose a loud refusal over a plausible-looking wrong render, and it is
correctly a loop-level guard rather than an engine one.

### L3 — a hosted artifact is recorded, but `preview` / `approve` / `deliver` refuse to act on one

The run manifest records a hosted delivery as the URL it is (`ArtifactRecordSchema`), so
`isLoopBuildable` no longer restricts dw-chart by format. But `preview` writes none
(`previewCovers` is false for every hosted artifact), `approve` refuses by name (*"an approval is a
record over the artifact's own bytes, and the newsroom owns none of it"*, `lib/loop/approve.ts:126`),
and `deliver` refuses by name (*"it is already published and the newsroom owns no file of it"*,
`lib/loop/deliver.ts:96`). **Where it bites:** the **10 unmarked `interactive` rows produced as
`form: "hosted"`** — dw-chart × 9 sheets (`scatter, bar, stacked-bar, bullet, dumbbell, grouped-bar,
pie, lollipop, line`) and map-dw × `choropleth`. Those ten cells are offerable, choosable and
producible, and then stop: the run ends at a Datawrapper URL that cannot be previewed, signed off, or
handed to a publisher. They are counted as "buildable" and "offerable unmarked" everywhere above,
which is honest about production and silent about hand-over.

---

## 5. Verdict on the owner's question

**"If only 3 work, something is badly missing."** The three are `line`, `bar`, `scatter` — that is
`CHART_SCROLLY_TYPES`, the host list of the narrowest sub-format in the system. It is not the grid.
Measured, the grid is:

- **27 chart-native types × 3 formats = 81 clean offers**, and chart-native's non-deferred type count
  (27) matches its renderable-sheet count (27) exactly — every chart type the engine ships has a KB
  sheet, and every one of them is offerable unmarked in all three formats.
- **7 map-native types × 3 formats = 21 clean offers** — the whole map catalogue, static, interactive
  and video, no exceptions.
- **102 distinct (sheet, format) offers a journalist can be handed with no mark at all.**

So: **no, there is no "only 3" problem in the engines.** Static, interactive and video are broad and
even. The missing pieces are real but they are not where the question assumed, and they are in three
different places:

1. **In the LOOP's wiring — and this is the big one.** The entire `page` deliverable kind is
   offered marked "not built yet" (G5): 15 of 15 scrolly rows, 0 clean, and with it the only format
   `image-native` has. Every other piece of that branch exists — a registered producer, an assembler,
   a render proof, a hosted-type list, a beat drafter. What does not exist is the loop branch that
   delivers a narrative page. This is one branch of wiring standing between the matrix and a whole
   third of the promise (`chart-scrolly live · map-scrolly live` is on the public page).
   Within it, a second-order limit: of the 11 hosted scrolly types, only **2** (`line`, `bar`) have a
   walk the journalist can AUTHOR — `BEAT_TYPES` in `lib/brain/beats.ts`. The other 9 derive their
   own walk from the data, and the map track refuses an authored plan loud. *Hosted ≠ authorable:
   11 vs 2.*
2. **In the ENGINES.** 14 chart-native family-B types are `deferred` by design, costing 33 offers
   (G1). This is a scoping decision with a written reason per type, not a defect — but it is the
   honest answer to "why is my sankey not on the menu".
3. **NOT in the KB.** The KB is the strongest layer measured. 46 sheets on disk, 35 with a renderable
   engine, chart-native at 100% coverage of its own shipped catalogue, and the only genuine
   KB-sheet-missing gap is the 10 Datawrapper types the manifest itself declares out of scope (G2).
   The KB is not the bottleneck; it is ahead of the engines (11 sheets are waiting on family B).

**The one thing I would flag that the question did not ask about:** the real ceiling on maps is not
the type count (7/7 work) but L1 — two basemaps. Every map cell in this matrix is conditional on the
data joining to world countries or US states. The matrix cannot express that, so it reads far
healthier for maps than a Swiss or French newsroom would find it. If the arithmetic above says
anything is "badly missing", it is that — and it is invisible to every count in this document.

---

## Measurement notes / what I could NOT measure

- Everything above is a STATIC capability measurement: registry data, assembler-table admission, KB
  join, and `eligible()`/`buildOffer()` over synthesized facts. It answers "will the loop compose a
  spec for this and offer it", not "does the render come out correct".
- **I did not render anything.** No `produce.mjs` was invoked, no Datawrapper API call was made, no
  browser was launched. A cell marked `build` here means `assemblerFor` returns an assembler and
  `eligible()` returns the row unmarked — it is not a claim that the pixels are right. The branch's
  own render proofs (`bun run proofs`) are the artifact that would answer that, and running them was
  out of scope for a read-only, no-network measurement.
- **Data limits are approximated per sheet.** `eligible()` checks `limits` against `Facts`; I
  synthesized facts FROM each sheet's own declared limits so no sheet is excluded for data reasons.
  That measures "can this ever be offered", not "will it be offered for a given CSV". The
  full-corpus run with one generic dataset (rows=6, points=3) returned 113 eligible / 98 unmarked
  rows and 6 excluded ids on article-web — the shape-dependent number, reported for contrast.
- **G4's 37-row over-claim is measured but not exercised end-to-end.** I proved `assembleScrolly`
  returns `ok` for `route` and `d3-scatter-plot`; I did not run the scrolly build to observe what a
  spec with an unhosted `nativeType` actually renders. The dispatch's own comment
  (`scrolly-types.ts:14-16`) says an unhosted type was previously drawn as a choropleth — a wrong
  render, silently — which is the failure mode this predicts.
