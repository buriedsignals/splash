---
name: twin-dw-beat
description: Use to produce a Datawrapper chart beat — the default, thin producer for an ordinary static chart — by mapping the editorial phases' output (confirmed takeaway, hand-of-the-journalist fields, house colour, data, annotations) straight onto the Datawrapper v3 API and taking back an owned PNG or a published embed URL. Rendering is delegated; this skill holds no geometry, no seed component, and no chart-type registry.
---

# twin-dw-beat — the thin one, because rendering is delegated

## Overview

Under this project's producer matrix, Datawrapper is the **default** path for a static chart: a
newsroom without an equipped team hits this producer far more often than a bespoke one, precisely
because it is thin — no geometry to write, no furniture to derive, no render ladder to climb. Where
`twin-chart-beat` writes a component and renders it locally, `twin-dw-beat` sends a mapped
`ChartSpec` to `api.datawrapper.de` and gets back either a PNG it downloads and owns (`format:
"static"`) or a published embed URL (`format: "interactive"`). There is no third option: this
project pins one format per element, and this skill never builds both.

The skill is exactly four scripts: **validate** the `ChartSpec` (fail loud on anything unrecognised),
**map** it onto Datawrapper's own metadata shape (`scripts/map-spec.mjs` — editorial intent in,
Datawrapper field names out, the same code path regardless of chart type), **call** the five real
API endpoints in order (`scripts/dw-client.mjs`), and **orchestrate** that sequence into one owned
artifact (`scripts/produce.mjs`). Nothing here holds a chart-type registry — `spec.chartType` is
whatever Datawrapper type id the editorial phase already chose (`"d3-lines"`, `"d3-bars"`, ...),
passed straight through. If a future need ever grows a `switch (spec.chartType)` in this skill's own
code, that is the signal this skill has stopped being thin and needs to say so, not quietly become
one.

The one capability worth building this properly for: Datawrapper's line-chart engine carries a
**`range-annotations`** key, separate from `text-annotations` — a drawn reference rule or shaded
band at a fixed value, not just a floating label asserting one. `scripts/map-spec.mjs` exposes it
from the start (`buildRangeAnnotation`), because a text annotation can only *say* "the curve comes
back under this level" and a rule *shows* it.

## When to use

- When a chosen candidate in a closed `STORYBOARD.md` has medium `chart` and the journalist wants
  the default, delegated rendering path rather than a bespoke component — the ordinary case.
- To turn the editorial phases' own output directly into a `ChartSpec`: `takeaway` is the confirmed
  takeaway, `limits` is the caveat line, `credit`/`effectiveDate` are the hand-of-the-journalist
  source fields `twin-storyboard` already collects (`HAND` in `twin-storyboard/scripts/
  storyboard.mjs`) — this skill invents no new vocabulary for what a beat already carries.
- To draw a reference line or band a reader must **see**, not just read about: pass
  `rangeAnnotations: [{ value, label }]`.
- **Not** for a bespoke chart needing a render ladder, video, or rich interaction (`twin-chart-beat`
  is that path), and **not** for a map.

## The one gotcha that will waste your day (read first)

**A `range-annotations` entry has no field for its own text — Datawrapper's own `RangeAnnotation`
TypeScript type has no `text`, `label`, `caption` or `displayText` key, confirmed straight from
`chartTypes.ts` in Datawrapper's own public repository (`references/range-annotation-shape.md`).**
A rule with nothing paired to it renders as a line with no caption — exactly the defect that shows up
on a real published chart if you send only the rule. `buildRangeAnnotation` in `map-spec.mjs` always
returns **two** objects from one editorial entry — the rule (`range-annotations`) and a paired
`text-annotations` entry positioned at the rule's far edge — and `validateChartSpec` refuses a
`rangeAnnotations` entry with no `label` before either is ever built. If you ever find yourself
writing a range annotation without a matching text annotation, stop: the rule you are about to send
will draw silently and mean nothing to a reader.

The second trap, one layer down, and now closed: **Datawrapper reads a line's direct label straight
off the CSV column header.** Send a column called `co2Mt` and `co2Mt` is exactly what prints at the
end of the line, in front of a reader — a raw field name leaking into a published newsroom graphic.
`buildChartPayload` never uses the bare column name; it always goes through `resolveSeriesLabel`
(an explicit `spec.seriesLabel`, or a humanised fallback), and `produce.mjs` renames the CSV's own
value column (`renameValueColumn`) to match before upload, so the chart's colour key and its
direct label can never disagree about what the raw column was called. `validateChartSpec` accepts
`seriesLabel` as one more optional field, nothing more.

Third: **Datawrapper anchors a line chart's y-axis at zero by default — the exact rule this project
corrects on the native path** (`twin-chart-beat/references/static-discipline.md`: "zero is a rule
about bars, not about lines"). Anchoring at zero flattens the very change a line exists to show.
`buildChartPayload` sets `visualize["custom-range-y"]` to the data's own fitted min/max (padded,
widened to keep any y-axis range annotation's value inside the plot) for every chart type except
the bar/column family (`isBarEncoded` — a bar's mark *does* need zero in view, because it encodes by
length, not position). Confirmed live: `["7", "49"]` on a 10-46 data series visibly removed both the
zero baseline and its bold axis line.

The one thing still true and unresolved: **on a free/personal Datawrapper token, "Créé avec
Datawrapper" cannot be removed from an exported PNG.** `metadata.publish["force-attribution"]` is a
real API field (`chartTypes.ts`) and this skill sets it `false` on every chart — but re-rendering
with it set left the credit line unchanged. Datawrapper's own pricing page confirms attribution
removal is a paid Pro/Business/Enterprise feature. This is a plan limitation this skill's code
cannot route around; see `references/range-annotation-shape.md` §3 for the exact live test that
established it.

## Architecture

| Layer | File | Role |
| --- | --- | --- |
| Validation | `scripts/validate-spec.mjs` | `validateChartSpec(spec)` — fails loud, listing every problem at once, on an unknown top-level field, a missing required one, or a malformed annotation entry |
| Mapping | `scripts/map-spec.mjs` | `buildChartPayload`, `buildTextAnnotation`, `buildRangeAnnotation` — editorial `ChartSpec` in, Datawrapper `metadata.describe`/`metadata.visualize` out. The one file that knows Datawrapper's own field names |
| Data | `scripts/csv.mjs` | `toCsv(rows)` — the one shape `PUT /v3/charts/{id}/data` accepts |
| API client | `scripts/dw-client.mjs` | `createChart`, `setChartData`, `patchMetadata`, `publishChart`, `exportChartPng`, `getChart` — five thin, real HTTP calls, `fetchFn` injectable for tests, never mocked in the one place that actually runs against the network |
| Orchestrator | `scripts/produce.mjs` | `produce(spec, {outDir, size, token, fetchFn})` — validate → map → create → set data → patch metadata → publish → (static: export at the chosen size + check the returned PNG's own IHDR against it + write) |
| Live pin | `scripts/verify-range-annotation.mjs` | The round-trip that confirms the candidate range-annotation shape by rendering it — run for real, live-confirmed (`references/range-annotation-shape.md` §2) |
| Proof | `scripts/prove-co2.mjs` | The real case: Swiss territorial CO₂, 1950-2024, a range annotation at the 1967 level |

## How it works (the shape)

1. **Validate first, before any network call.** `validateChartSpec` throws on an unknown field or a
   missing required one — a caveat or a house colour that silently didn't make it into the request
   is a worse failure than one that stops the run.
2. **Map, deterministically.** `buildChartPayload` reads `spec.takeaway` → `title`, `spec.limits` →
   `describe.intro`, `spec.credit`+`spec.effectiveDate` → `describe["source-name"]`, `spec.color` →
   `visualize["custom-colors"]` keyed by the **resolved series label** (`resolveSeriesLabel` — never
   the raw data column), `spec.chartType` → `type` unchanged. `spec.rangeAnnotations` and
   `spec.textAnnotations` become `visualize["range-annotations"]` / `visualize["text-annotations"]`,
   always run through the same two functions no matter what `chartType` is. Every chart also gets
   `metadata.publish["force-attribution"]: false`, and — unless `isBarEncoded(spec.chartType)` — a
   `visualize["custom-range-y"]` fitted to the data instead of the zero-anchored default.
3. **One real chart, five calls, in order:** `POST /v3/charts` (create) → `PUT .../data` (the CSV) →
   `PATCH /v3/charts/{id}` (the mapped metadata) → `POST .../publish` (always — `format:
   "interactive"` needs the URL this returns, and `format: "static"`'s export needs a published
   chart too) → for `format: "static"` only, `GET .../export/png`, written to `<outDir>/<name>.png`.
4. **One format, never both.** `format: "interactive"` returns the published `publicUrl` and never
   calls export; `format: "static"` writes the PNG and never returns a bare embed. This mirrors the
   rest of this project's single-format-per-element rule (`STORYBOARD.md`'s `chosen` slot), not a
   Datawrapper-specific idea.
5. **No token, no run.** `produce` throws before making a single network call if `token` is falsy —
   never a silent fallback to an unrendered stand-in.

## Quick start

```js
import { produce } from "./scripts/produce.mjs";

const spec = {
  takeaway: "En 2024, la Suisse a émis moins de CO₂ sur son territoire qu'en 1967.",
  limits: "Émissions territoriales uniquement.",
  credit: "Global Carbon Budget 2025, via Our World in Data",
  effectiveDate: "données 2024",
  language: "fr-FR",
  color: "#0B7A75",
  chartType: "d3-lines",
  format: "static",
  seriesLabel: "Émissions de CO₂ (Mt)", // never the raw "co2Mt" column name
  data: swissCo2Since1950, // [{ year, co2Mt }, ...]
  rangeAnnotations: [{ value: 32.5, label: "Niveau de 1967 (32,5 Mt)" }],
};

const result = await produce(spec, {
  outDir: "/tmp/dw-beat",
  name: "co2",
  token: process.env.DATAWRAPPER_TOKEN,
  fetchFn: fetch,
});
// result.pngPath — open it and look at it. Did the rule draw at 32.5, with its label?
```

`scripts/prove-co2.mjs` is exactly this, wired to a real Our World in Data fetch:
`bun run scripts/prove-co2.mjs`.

## Tuning knobs

| Want | Knob | Where |
| --- | --- | --- |
| How many real API calls one `produce` run makes | `4` (`interactive`) or `5` (`static`, adds export) | `produce.mjs` |
| Default reference-line weight | `2` px (`strokeWidth`) | `buildRangeAnnotation`, `map-spec.mjs` |
| Default reference-line style | `"solid"` (`strokeType`) | `buildRangeAnnotation` |
| Opacity for a drawn line vs a shaded band | `100` / `20` | `buildRangeAnnotation` |
| How far a range annotation's label sits above its line | `6` px (`dy: -6`, y-axis rules only) | `buildRangeAnnotation` |
| Default text-annotation font size | `14` px | `buildTextAnnotation` |
| The three export sizes a static may be produced at | `SIZES` (landscape 1920×1080, square 1080×1080, portrait 1080×1920), at `zoom: 1` — the row IS the delivered pixel size | `sizes.mjs` |
| Static export width / zoom, when `exportChartPng` is called directly | `900` px / `2`× | `exportChartPng` default, `dw-client.mjs` |
| Which data column a rule/colour reads as "the value series" | the data's 2nd column (`columns()`) | `map-spec.mjs` |
| How much the fitted y-range pads beyond the data's own min/max | `0.08` (8%) | `Y_RANGE_PAD`, `map-spec.mjs` |
| Which chart types keep a zero-anchored axis instead of a fitted one | `/bars\|column/i` on `chartType` | `isBarEncoded`, `map-spec.mjs` |
| Whether a chart requests removal of forced Datawrapper attribution | always `false` (plan-gated on a free token — §gotcha) | `buildChartPayload`, `map-spec.mjs` |

## Files

- `scripts/validate-spec.mjs` — `validateChartSpec`.
- `scripts/map-spec.mjs` — `buildChartPayload`, `buildTextAnnotation`, `buildRangeAnnotation`,
  `resolveSeriesLabel`, `humanizeColumnName`, `renameValueColumn`, `isBarEncoded`, `computeYRange`.
  Reads Datawrapper's own field names from `references/range-annotation-shape.md`'s sources, never
  invents one.
- `scripts/csv.mjs` — `toCsv`.
- `scripts/dw-client.mjs` — the five real HTTP calls.
- `scripts/sizes.mjs` — `SIZES` and `sizeFor`. The three export sizes ruling R2 names, carried (not
  imported), kept in step with every other craft skill's copy by
  `splash-twin/test/size-table-parity.test.ts`. This copy carries **no `typeScale`**, and that
  absence is the point: Datawrapper lays out its type server-side, so there is no local number for a
  scale to multiply — the parity guard is written present-and-valid-or-absent for exactly this.
- `scripts/produce.mjs` — `produce`, the orchestrator; also runnable as
  `bun run scripts/produce.mjs <spec.json> <outDir> [static|interactive]`.
- `scripts/verify-range-annotation.mjs` — the live shape-pinning round-trip; run for real, confirmed
  (`references/range-annotation-shape.md` §2).
- `scripts/prove-co2.mjs` — the real Swiss CO₂ proof case, fetching Our World in Data directly.
- `references/range-annotation-shape.md` — the `range-annotations` shape, now confirmed by a live
  round-trip (chart `jUDCp`) after first being pinned from Datawrapper's own public `chartTypes.ts`
  and `JsonCRDT.benchmark.ts`, cross-checked against two independent third-party re-implementations;
  also records the live-tested findings on vendor attribution (plan-gated, not fixable from code)
  and the fitted y-axis (confirmed working).
- `test/{validate-spec,map-spec,csv,dw-client,produce,verify-range-annotation,prove-co2}.test.ts` —
  `bun:test` coverage. Every real-network assertion follows `splash-twin/test/keys.test.ts`'s own
  `it.skipIf(!token)` convention: skipped, never faked, when `DATAWRAPPER_TOKEN` is absent from the
  environment; the actual proof the moment it is present.
