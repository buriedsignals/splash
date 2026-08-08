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

The second trap, one layer down: **the entry shape in this skill was pinned from Datawrapper's own
public source, not from this skill's own live render** — no working `DATAWRAPPER_TOKEN` was
available while it was built. `scripts/verify-range-annotation.mjs` is the live round-trip that
would close this (create a chart, PATCH the candidate, GET it back, export the PNG, look at it) and
it has simply never run against a real key. Read `references/range-annotation-shape.md` §3 before
trusting this shape on a real story, and run that script the moment a token exists.

## Architecture

| Layer | File | Role |
| --- | --- | --- |
| Validation | `scripts/validate-spec.mjs` | `validateChartSpec(spec)` — fails loud, listing every problem at once, on an unknown top-level field, a missing required one, or a malformed annotation entry |
| Mapping | `scripts/map-spec.mjs` | `buildChartPayload`, `buildTextAnnotation`, `buildRangeAnnotation` — editorial `ChartSpec` in, Datawrapper `metadata.describe`/`metadata.visualize` out. The one file that knows Datawrapper's own field names |
| Data | `scripts/csv.mjs` | `toCsv(rows)` — the one shape `PUT /v3/charts/{id}/data` accepts |
| API client | `scripts/dw-client.mjs` | `createChart`, `setChartData`, `patchMetadata`, `publishChart`, `exportChartPng`, `getChart` — five thin, real HTTP calls, `fetchFn` injectable for tests, never mocked in the one place that actually runs against the network |
| Orchestrator | `scripts/produce.mjs` | `produce(spec, {outDir, token, fetchFn})` — validate → map → create → set data → patch metadata → publish → (static: export + write PNG) |
| Live pin | `scripts/verify-range-annotation.mjs` | The round-trip that would confirm the candidate shape by rendering it — written, never yet run for real (the one gap this skill's report names) |
| Proof | `scripts/prove-co2.mjs` | The real case: Swiss territorial CO₂, 1950-2024, a range annotation at the 1967 level |

## How it works (the shape)

1. **Validate first, before any network call.** `validateChartSpec` throws on an unknown field or a
   missing required one — a caveat or a house colour that silently didn't make it into the request
   is a worse failure than one that stops the run.
2. **Map, deterministically.** `buildChartPayload` reads `spec.takeaway` → `title`, `spec.limits` →
   `describe.intro`, `spec.credit`+`spec.effectiveDate` → `describe["source-name"]`, `spec.color` →
   `visualize["custom-colors"]` keyed by the data's own value column, `spec.chartType` → `type`
   unchanged. `spec.rangeAnnotations` and `spec.textAnnotations` become
   `visualize["range-annotations"]` / `visualize["text-annotations"]`, always run through the same
   two functions no matter what `chartType` is.
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
| Static export width / zoom | `900` px / `2`× | `exportChartPng` default, `dw-client.mjs` |
| Which data column a rule/colour reads as "the value series" | the data's 2nd column (`columns()`) | `map-spec.mjs` |

## Files

- `scripts/validate-spec.mjs` — `validateChartSpec`.
- `scripts/map-spec.mjs` — `buildChartPayload`, `buildTextAnnotation`, `buildRangeAnnotation`. Reads
  Datawrapper's own field names from `references/range-annotation-shape.md`'s sources, never
  invents one.
- `scripts/csv.mjs` — `toCsv`.
- `scripts/dw-client.mjs` — the five real HTTP calls.
- `scripts/produce.mjs` — `produce`, the orchestrator; also runnable as
  `bun run scripts/produce.mjs <spec.json> <outDir> [static|interactive]`.
- `scripts/verify-range-annotation.mjs` — the live shape-pinning round-trip; not yet run for real
  (`references/range-annotation-shape.md` §3).
- `scripts/prove-co2.mjs` — the real Swiss CO₂ proof case, fetching Our World in Data directly.
- `references/range-annotation-shape.md` — exactly which files (Datawrapper's own public
  `chartTypes.ts` and `JsonCRDT.benchmark.ts`, cross-checked against two independent third-party
  re-implementations) pinned the `range-annotations` and `text-annotations` shapes, and what is
  still genuinely unverified.
- `test/{validate-spec,map-spec,csv,dw-client,produce,verify-range-annotation,prove-co2}.test.ts` —
  `bun:test` coverage. Every real-network assertion follows `splash-twin/test/keys.test.ts`'s own
  `it.skipIf(!token)` convention: skipped, never faked, when `DATAWRAPPER_TOKEN` is absent from the
  environment; the actual proof the moment it is present.
