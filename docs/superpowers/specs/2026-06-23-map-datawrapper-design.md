# Map skill (Datawrapper) — first cut: choropleth — design

> Status: design approved (self-authored). Build on `feat/map-datawrapper` from `main`.
> Reuses the proven dw-chart seam (`Spec → mapper → client → produce`). Generic for any small
> newsroom (world / europe / country basemaps), not Annemasse-specific.

## Why

Splash's visual grid covers maps as a first-class family. The dw-chart seam already proved the
shape `Spec → spec-to-metadata → datawrapper client → produce → {publicUrl, png}`. A Datawrapper
**choropleth** is the cheapest correct map: same client, same orchestration, a different metadata
mapper and a geo-aware contract. This cut delivers choropleth end-to-end (published + owned PNG),
mirroring the dw-chart skill and the suggest-* eval-harness pattern.

## Scope

- **In (first cut):** `d3-maps-choropleth`. A `MapSpec` contract, a `spec-to-map-metadata` mapper,
  reuse of the dw-chart `datawrapper.ts` client + a `produceMap` orchestrator, and an eval
  (`scoreMapSpec`) mirroring `suggest-chart/eval/score.ts`.
- **Deferred (stated, not built):** `d3-maps-symbols` (symbol/bubble) and `locator-map`. They share
  the client but need different bindings (symbols: lat/lon or region + size scale; locator: marker
  list, no data join). Add only if they fall out cheaply from the choropleth mapper; otherwise defer.

## The load-bearing detail — choropleth colour scale (RESOLVED via live PNG spike)

The spike found the correct DW field **and the black-render trap**, proven by exported PNGs:

- **Correct field:** `metadata.visualize.colorscale.colors` = an array of `{ color, position }`
  stops (`position` in `0..1`), with `mode: "continuous"` and `interpolation: "equidistant"`.
  This renders a proper light→dark gradient on regions **and** legend.
- **The black trap (root cause of the spike's failure):** including `colorscale.stops: "equidistant"`
  (a *string*) alongside `colors` makes the renderer paint every region and the legend **black**.
  The earlier guess (`visualize.gradient = {colors:[…]}`) is also ignored/black.
- **Fix:** emit `colorscale` WITHOUT the `stops` string. Minimal working form:
  `colorscale: { mode: "continuous", interpolation: "equidistant", colors: [{color,position}…] }`.
- **Default behaviour:** if no `colorscale` is sent, DW auto-derives a CVD-safe green→blue gradient
  from the numeric value column. We override to a **single-hue light→`#0072B2` blue** sequential
  (colorblind-safe, matches Splash's Okabe-Ito anchor).

This was verified by creating real charts, patching candidates, publishing, exporting PNG, and
LOOKING: `gradient`/`stops`-string → black; `colors` without `stops` → light→blue gradient.

## Contract — `MapSpec`

```ts
export interface MapSpec {
  mapType: "choropleth";          // first cut; symbols/locator deferred
  basemap: string;                // DW basemap id, e.g. "world-2019", "europe", "us-states"
  mapKeyAttr: string;             // the basemap join key, e.g. "DW_STATE_CODE" (ISO-3) / "DW_NAME"
  regionKey: string;              // data column holding region codes → metadata.axes.keys
  valueColumn: string;            // data column holding values → metadata.axes.values
  data: string;                   // CSV text (region code column + value column)
  title: string;                  // the insight, sentence case (NOT a label like "GDP by country")
  intro?: string;                 // subtitle / insight elaboration
  colorScale?: GradientStop[];    // sequential light→dark stops; defaults to light→#0072B2
  numberFormat?: string;          // DW number-format token
  source?: { name: string; url?: string };
  altInsight: string;             // WCAG: alt = the insight, not the structure
}
export interface GradientStop { color: string; position: number; } // position 0..1
```

### Validation (`validateMapSpec`) — fail loud, generic

- `mapType` must be `"choropleth"` (others rejected until built).
- `basemap`, `mapKeyAttr`, `regionKey`, `valueColumn`, `title`, `altInsight` required non-empty.
- `data` must be CSV containing both `regionKey` and `valueColumn` as columns (key-bound check).
- `colorScale` (if present): ≥2 stops, each a valid hex, `position` in `0..1`, ascending; the
  darkest stop should be a colorblind-safe hue (default end `#0072B2`).
- Insight guard (warning, mirrors chart-spec): a `title` that is just a column name / bare range is
  flagged "looks like a label, not an insight".

## Mapper — `specToMapMetadata`

`MapSpec → { type, metadata }` for the existing `patchChart`:

```
type: "d3-maps-choropleth"
metadata.axes   = { keys: regionKey, values: valueColumn }
metadata.visualize = {
  basemap,
  "map-key-attr": mapKeyAttr,
  colorscale: { mode: "continuous", interpolation: "equidistant",
                colors: colorScale ?? DEFAULT_BLUE },   // NO `stops` string
  tooltip: { enabled: true, body: "%REGION_VALUE%", title: "%REGION_NAME%" },
}
metadata.describe = { intro, "source-name", "source-url",
                      "aria-description": altInsight, "number-format" }
```

`DEFAULT_BLUE = [{color:"#deebf7",position:0},{color:"#0072B2",position:1}]` (light→Okabe-Ito blue).

## Client reuse — DO NOT rewrite

Import `createChart`, `setData`, `patchChart`, `publishChart`, `exportPng`, `deleteChart` from
`../../dw-chart/src/datawrapper` (generic REST client). No changes to dw-chart.

## Orchestrator — `produceMap`

Mirrors `produceChart`:

```
validateMapSpec → throw on error
const patch = specToMapMetadata(spec)
id = createChart(title, "d3-maps-choropleth")
setData(id, data)
patchChart(id, { type, metadata })
publicUrl = publishChart(id)
exportPng(id, pngPath)
return { chartId, embed, pngPath, publicUrl }
```

Owned-PNG fallback (no archive rot) preserved, same as dw-chart.

## Eval — `scoreMapSpec` (mirrors suggest-chart/eval)

Deterministic gate over a map spec; lives under `skills/map-dw/eval/` (measures the producer's
conformance, like suggest-chart measures ②). `scoreMapSpec(spec, expect)`:

- `validates`: `validateMapSpec(spec).ok`.
- `basemapKnown`: `expect.basemap` is in a small known-basemap allowlist (world-2019, europe,
  us-states, …) — the eval does not hit the network; a live basemap-existence check is a separate
  integration test (`GET /v3/basemaps/{id}`).
- `keyBound`: the `regionKey` and `valueColumn` are real columns of `data` (data↔map binding holds).
- `conformanceOk`: warnings ≤ `maxWarnings` (insight-title guard, default-blue used or CVD-safe).
- `pass` = all of the above. Pure, unit-tested with `bun:test`, no network.

Eval corpus = generic small-newsroom cases (e.g. EU country values, US-state rates), authored by us
and grounded in best-practice. **Caveat (assumed):** self-referential — we write the cases and the
gold, the producer and any judge are agents; the harness is an instrument of *relative* improvement,
not absolute truth (same stance as suggest-chart / suggest-article).

## Live e2e (build gate)

Produce ONE real published choropleth from a generic example, export the PNG, and LOOK: data bound,
proper light→blue gradient (NOT black). Save proof + `publicUrl` under `output-proof/`. Leave this
e2e chart published for human review. A passing unit test does NOT prove the map looks right — the
exported PNG is the gate.

## Files (target)

```
skills/map-dw/
  SKILL.md                         # canon 8-section skill doc (choropleth; symbol/locator deferred)
  src/map-spec.ts                  # MapSpec + validateMapSpec
  src/spec-to-map-metadata.ts      # specToMapMetadata (the colorscale-without-stops fix lives here)
  src/produce.ts                   # produceMap (reuses dw-chart datawrapper client)
  src/tests/*.test.ts              # unit tests (validate + mapper, pure) + live e2e (real API)
  eval/
    score.ts                       # scoreMapSpec (pure)
    basemaps.ts                    # known-basemap allowlist
    cases/*.json                   # generic small-newsroom map specs
    tests/score.test.ts
    package.json
  output-proof/                    # real PNG + publicUrl + result of the live choropleth
```

## Constraints

Bun; `bun:test`; TDD; English only; no Claude/Anthropic mention; no tiers. Reuse the dw-chart client
and the eval pattern; do not modify dw-chart / suggest-chart / suggest-article. Keep main's 46 tests
green. Token from `/splash/.env`.

## Open / honest gaps

- Eval is self-referential (stated above).
- Symbol + locator deferred unless trivially cheap from the choropleth mapper.
- `basemapKnown` in the pure eval is an allowlist, not a live check; live existence is an integration
  test only (keeps the unit eval network-free).
</content>
</invoke>
