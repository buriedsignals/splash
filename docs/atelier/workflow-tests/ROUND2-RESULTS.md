# Workflow end-to-end test — round 2 (diverse producers, incl. a no-data article)

Four real articles chosen to span the output space and exercise producers the first
round under-stressed. Each ran the full workflow: article (+ data) → suggest-article
(claims) → suggest-chart (Gate 5 map/chart, Gates 1–4 format) → producer → render-verify.

## Cases + deliverables

| # | Article | Data? | Routing decision | Producer / format | Deliverable |
|---|---------|-------|------------------|-------------------|-------------|
| 5 | Strait of Hormuz oil chokepoint | **No** | No tabular data → not a chart; geographic explainer with specific places → locator map | **map-native locator** (static + interactive) | `case5/out/hormuz-locator.png` |
| 6 | Southern Europe's tropical nights, 2024 | Yes | Gate 5 = **map** (spatial N–S pattern is the story; Malta tiny-but-highest proves it's not a population map; 16 legible regions) | **map-native choropleth** (static + interactive) | `case6/out/heatwave-choropleth.png` |
| 7 | Arctic summer sea-ice minimum 1979–2025 | Yes | Gate 4 = **video** (motion is the encoding — the decline drawing on over time) | **chart-native line-reveal** (mp4) | `case7/out/arctic-reveal.mp4` |
| 8 | Streaming overtook cable ~2022 | Yes | Gate 3 **declines scrolly** (a crossover is one chart visible at once, not 4+ irreducibly-sequential states → "simple comparison" → static) | **dw-chart d3-lines** (shared-axis crossover) | `case8` → https://datawrapper.dwcdn.net/2ltet/1/ |

All four render cleanly and were verified visually (maps at multiple widths; the chart
at 340/600/1200 px via the responsive guardrail; the video still + full mp4).

## Findings (each a system defect the round surfaced)

Fixed this round, each with a guardrail test:

- **F1 — invalid palette name = silent 30–60 s timeout.** `palette:"amber"` (a semantic
  name ② naturally picks) wasn't a registry key, so `resolvePalette` threw *inside the
  headless render* → the map layer never mounted → the snap timed out with no clear
  reason. Fix: semantic aliases (amber/heat/red→oranges, teal→greens, …) + a clear,
  listable error for a truly unknown name. Guard: `palette.test.ts`.
- **F3 — chart-native line crashed on a bare 4-digit year.** `looksTemporal` admits
  "1979" but the layout parser was `timeParse("%Y-%m-%d")` → `invalid date: 1979` → the
  chart didn't render. Fix: a tolerant multi-format `parseFlexibleDate` (year /
  year-month / full date / slash variants) that agrees with the classifier. Guard:
  `chart-geometry.test.ts`.
- **F5 — dw-chart multi-series guardrail false-positive.** On `d3-lines`/`multiple-lines`,
  a y-tick is emitted twice (SVG `<text>` + `export-text` span at the same spot) → the
  guardrail flagged `"0" intersects "0"` and blocked EVERY multi-series chart. Fix:
  `isDuplicateRender` (identical text + high IoU) is a duplicate, not a collision. Guard:
  `label-safety.test.ts`.
- **F7 — a crossover story needs a shared axis.** `multiple-lines` renders as small
  multiples (separate panels/axes), which hides the crossing — the whole point of an
  "overtook" story. `d3-lines` plots both series on one axis so they visibly cross. The
  KB **already mandates this** (`knowledge/references/chart-selection.md:21`: use
  `d3-lines` for several series; `multiple-lines` = deliberate small multiples; "a spec
  can be valid yet still wrong this way"). The round confirmed the rule bites — case 8's
  first spec used `multiple-lines` and rendered small multiples that hid the crossover,
  fixed by switching to `d3-lines`.

Logged for a follow-up (real, not blocking a clean deliverable):

- **F4 — chart-native static/interactive snap serves a default build.** `snap-proof`
  renders the committed sample instead of the injected CONFIG (map-native solved this
  with tagged build dirs + `SERVE_DIR`; chart-native didn't). The VIDEO path is
  unaffected — case 7 was delivered through it. Static/interactive chart-native PNGs are
  currently unreliable until the snap harness threads CONFIG like map-native.
- **F6 — multi-series annotation placement considers only one series.** `placeAnnotation`
  clears the annotation's own line but can sit on the *other* series or the right-edge
  direct labels. Case 8 ships without a mid-chart callout (a 2-series crossover is
  self-evident); a robust fix passes ALL series' polylines + the direct-label rects as
  obstacles.
- **Gap — chart scrolly not wired.** The `scrolly` engine is map-only ("chart-native
  next"); `chart-native` ships static/interactive/video but no scrolly format. A true
  *chart* scrollytelling piece is not yet producible.
