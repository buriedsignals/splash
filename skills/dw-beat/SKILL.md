---
name: dw-beat
description: Use to produce a Datawrapper chart beat after the journalist chooses Datawrapper for an eligible storyboard treatment — map the editorial contract onto the Datawrapper v3 API, persist the provider chart ID, and take back an owned PNG or published web artifact. Rendering is delegated; this skill holds no geometry or seed component.
---

# dw-beat — the thin one, because rendering is delegated

## Overview

Datawrapper is a **selected delegated producer**, not the default and not a chart-treatment
candidate. `storyboard` first lets the journalist choose the treatment without regard to platform;
only when that treatment maps faithfully to a pinned Datawrapper type does it ask Datawrapper or
custom. This skill runs when that answer is Datawrapper. It stays thin — no geometry to write, no
furniture to derive, no render ladder to climb. Where
`chart-beat` writes a component and renders it locally, `dw-beat` sends a mapped
`ChartSpec` to `api.datawrapper.de` and gets back either a PNG it downloads and owns (`format:
"static"`) or a published embed URL (`format: "web"`). At the provider boundary only, Splash maps
`web` to Datawrapper's own `interactive` value. There is no third option: this
project pins one format per element, and this skill never builds both.

The production path has four jobs: **validate** the `ChartSpec` (fail loud on anything unrecognised),
**map** it onto Datawrapper's own metadata shape (`scripts/metadata-spec.mjs` — editorial intent in,
Datawrapper field names out, the same code path regardless of chart type), **call** the five real
provider operations in order (`scripts/dw-client.mjs`), and **orchestrate** that sequence into one owned
artifact (`scripts/produce.mjs`). The complete provider inventory and the conservative mapping live
upstream in `storyboard/references/datawrapper-chart-types.json`; this skill receives the persisted
`datawrapperType` as `spec.chartType` and passes it through. If a future need ever grows a
`switch (spec.chartType)` in this skill's own code, that is the signal this skill has stopped being
thin and needs to say so, not quietly become one.

In an Engine-managed installation, the production call is `bsig run splash datawrapper-produce`
with story identity, format, and size in bounded JSON on stdin. Engine verifies the adopted checkout
and injects only the broker-backed `DATAWRAPPER_TOKEN` into `scripts/sealed-produce.mjs`; the model,
MCP app, terminal command, and story files never carry it. Calling `produce(..., {token})` directly
is the implementation and test interface retained underneath that boundary, not the managed
credential workflow.

The one capability worth building this properly for: Datawrapper's line-chart engine carries a
**`range-annotations`** key, separate from `text-annotations` — a drawn reference rule or shaded
band at a fixed value, not just a floating label asserting one. `scripts/metadata-spec.mjs` exposes it
from the start (`buildRangeAnnotation`), because a text annotation can only *say* "the curve comes
back under this level" and a rule *shows* it.

## When to use

- When a chosen candidate in a closed `STORYBOARD.md` has medium `chart`, records
  `producer: datawrapper`, and names the catalogued `datawrapperType` that becomes
  `spec.chartType`.
- To turn the editorial phases' own output directly into a `ChartSpec`: `takeaway` is the confirmed
  takeaway, `limits` is the caveat line, `credit`/`effectiveDate` are the hand-of-the-journalist
  source fields `storyboard` already collects (`HAND` in `storyboard/scripts/
  storyboard.mjs`) — this skill invents no new vocabulary for what a beat already carries.
- To draw a reference line or band a reader must **see**, not just read about: pass
  `rangeAnnotations: [{ value, label }]`.
- For an **ordinary map**, exactly as for an ordinary bar chart: a choropleth
  (`map.choropleth` → `d3-maps-choropleth`), a proportional-symbol map (`map.proportional-symbol` →
  `d3-maps-symbols`) or a locator (`map.locator` → `locator-map`). The pinned inventory carried
  these three the whole time and every layer above used to refuse them, this page included.
- **Not** for a bespoke chart needing a render ladder, video, or rich interaction (`chart-beat` is
  that path), and not for a bespoke map: a chosen camera, a baked basemap plate, a scroll-driven
  reveal or video is `map-beat`'s work. The line is the WORK, not the medium.

## The one gotcha that will waste your day (read first)

**A `range-annotations` entry has no field for its own text — Datawrapper's own `RangeAnnotation`
TypeScript type has no `text`, `label`, `caption` or `displayText` key, confirmed straight from
`chartTypes.ts` in Datawrapper's own public repository (`references/range-annotation-shape.md`).**
A rule with nothing paired to it renders as a line with no caption — exactly the defect that shows up
on a real published chart if you send only the rule. `buildRangeAnnotation` in `metadata-spec.mjs` always
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
corrects on the native path** (`chart-beat/references/static-discipline.md`: "zero is a rule
about bars, not about lines"). Anchoring at zero flattens the very change a line exists to show.
`buildChartPayload` sets `visualize["custom-range-y"]` to the data's own fitted min/max (padded,
widened to keep any y-axis range annotation's value inside the plot) for every chart type except
the bar/column family (`isBarEncoded` — a bar's mark *does* need zero in view, because it encodes by
length, not position). Confirmed live: `["7", "49"]` on a 10-46 data series visibly removed both the
zero baseline and its bold axis line.

Fourth, measured live against published chart `1u88u`: **`custom-colors` does nothing for a
single-series bar/column chart — Datawrapper paints those bars from `visualize["base-color"]`.**
`custom-colors` was sent and stored (`GET /v3/charts/1u88u` echoed it back verbatim) and the
published embed's bars still rendered in Datawrapper's own default blue. Isolated live by PATCHing
`base-color` and `custom-colors` to two different hex values on the same chart and reading the
exported PNG's own pixels back: `base-color` wins, every time. `buildChartPayload` now sets
`visualize["base-color"]` for every `isBarEncoded` chart type, alongside `custom-colors` (harmless,
and what a genuinely multi-series bar chart would need). This is not the plan-gated attribution
limitation below — nothing here is account-tier-gated, it was a field this producer never sent.

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
| Mapping | `scripts/metadata-spec.mjs` | `buildChartPayload`, `buildTextAnnotation`, `buildRangeAnnotation` — editorial `ChartSpec` in, Datawrapper `metadata.describe`/`metadata.visualize` out. The one file that knows Datawrapper's own field names |
| Data | `scripts/csv.mjs` | `toCsv(rows)` — the one shape `PUT /v3/charts/{id}/data` accepts |
| API client | `scripts/dw-client.mjs` | `createChart`, `setChartData`, `patchChart`/`patchMetadata`, `publishChart`, `exportChartPng`, `getChart` — thin real HTTP calls with hard request and response-body deadlines; `fetchFn` is injectable for deterministic contract tests and the credential-gated checks use the real network |
| Orchestrator | `scripts/produce.mjs` | `produce(spec, {storiesRoot, storyId, outputId, name, size, token, fetchFn})` — resolve the canonical beat, serialize same-beat revisions, validate → write `spec.json` → create or reuse the chart ID in `DATAWRAPPER.json` (persisting `state: prepared` before follow-up calls) → set data → patch title/type/language/metadata → publish → write `renders/<name>.html` for web or export and verify `renders/<name>.png` for static → advance the receipt to `state: local-complete`. `{outDir}` remains only as the legacy one-shot compatibility shape |
| Owned-artefact guard | `scripts/verify-owned.mjs` | `assertExportedSurface(bytes, beatDir)` — called by `produce.mjs` on both branches, before the artefact is delivered; `pageLanguageMatchesStory(html, recorded)` — called by `produce.mjs` before the web branch's iframe page is written |
| Live pin | `scripts/verify-range-annotation.mjs` | The round-trip that confirms the candidate range-annotation shape by rendering it — run for real, live-confirmed (`references/range-annotation-shape.md` §2) |
| Proof | `scripts/prove-co2.mjs` | The real case: Swiss territorial CO₂, 1950-2024, a range annotation at the 1967 level |

## The guards a delegated producer still carries

**Everything you can check here, you have to read off the bytes or the markup that came back.**
Three things are read, all before the artefact is delivered, so a refusal leaves nothing behind to
deliver by mistake:

- `assertExportedSize` — the static export is the size that was asked for. A wrong SHAPE is loud.
- `assertExportedSurface` — the export is on the same luminance side as the ground the story
  declared in its `PALETTE.md`. A wrong SIDE is silent: the PNG is valid, the chart is correct, the
  accent is the house one, and it lands in the article as a white rectangle in a dark column.
- `pageLanguageMatchesStory` — the web branch's delivered iframe page's own `<html lang>` matches
  `spec.language`, the story's own recorded answer.

**`assertExportedSurface` runs on BOTH branches, not just `format: "static"`** (FINDING 5,
round-three stress: it used to return before the check even existed for `format: "interactive"`,
and the white-on-dark mismatch refused on `stress-i-median-wages` shipped silently the very next day
on `stress-n-chomage-cantons`, recorded `state: "local-complete"`). The web branch owns no bytes of
its own — it delivers a published embed, not an owned PNG — so it measures a throwaway PNG exported
through the same `exportChartPng` call the static branch already makes; that export is never written
to disk, only the iframe page is.

The decision is `plateFollowsGround`, copied byte for byte from `scrolly`, `map-beat` and `map-web`
and walked by `splash/test/guard-copies-parity.test.ts`. Only the measurement is this skill's own:
the surface is an exported PNG rather than a baked plate, and the decision cannot tell them apart.
No ground declared anywhere above the beat means nothing to compare, so nothing is decoded and
nothing is refused — `null`, never a default.

**`pageLanguageMatchesStory` is now called too** (FINDING 7, round-three stress: it was exported and
unit-tested and nothing in this producer ever called it, so the delivered page's own `<html lang>`
was only ever checked by hand). It reads the ARTEFACT `produce.mjs` is about to write, never
re-derives it, which is what lets it catch a future `iframePage` that stops honouring
`spec.language` — the exact shape of the historical bug that hard-coded `lang="fr"` regardless of
what a beat actually said.

**The surface is now ASKED FOR, and asked before anything exists** (FINDING Y2, round-five stress:
the run that earned this created the chart, uploaded 186 rows, PUBLISHED it, exported the PNG, and
only then refused it — the refusal was right and its placement was the defect; `runPreflight` said
`datawrapper {available: true}`, the producer gate never mentioned a surface, and `palette` offers
that newsroom only dark grounds, so no answer the journalist could record would have been honoured).

`planExportSurface` runs on the beat's own declared ground BEFORE `createChart` — before a row is
uploaded, before anything exists on the account — and does one of three things:

- names the surface the export must be requested on, and the static branch asks for it;
- returns `null` when no ground was declared, or when the ground sits in the mid-grey band
  `plateFollowsGround` has no opinion about — the two must agree, or a plan this made and a check
  that then refused it would be worse than no plan;
- throws for the one case that cannot be asked at all — a dark-ground story on `format: "web"` —
  with nothing yet created to undo.

MEASURED against the live API, not assumed, on chart `cc6eK`: `GET /export/png` comes back on a
`#ffffff` plate (mean luminance 0.991) and the same call with `dark=true` on `#252525` (0.018). The
published EMBED is the one artefact no request steers — it follows the READER's own colour scheme
and defaults to light (`<meta name="color-scheme" content="light dark">` on that same published
page, unchanged by a `?dark=true` query), which is why the web branch's probe still asks for no
surface and measures what a reader actually receives. Proved end to end on chart `NJPlK`: a story
declaring `ground: "#16191B"` was delivered a PNG at mean luminance 0.022, and
`assertExportedSurface` passed rather than refused.

`splash`'s own `runPreflight` now carries the same answer one phase earlier — its `datawrapper`
capability row has a `surface` field derived from `NEWSROOM.md`'s ground by the same two decisions,
copied byte for byte — so a newsroom hears which Datawrapper forms its ground can carry in phase 0
rather than after publication. `surfaceGap(capabilities)` is the seam that says it in words.

The rest of the catalogue is not weak here, it is unreachable — no marks of ours to carry a dash, no
reveal to arrive anywhere, nothing baked. Each of those cells carries its reason in
`doctrine/references/guard-catalogue.json`, rendered into `GUARDS.md`, so nobody re-opens it.

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
   `metadata.publish["force-attribution"]: false`, and — when `isBarEncoded(spec.chartType)` —
   `visualize["base-color"]` too (`custom-colors` alone does nothing for a single-series bar/column
   chart, measured live — see the gotcha above), or otherwise a `visualize["custom-range-y"]` fitted
   to the data instead of the zero-anchored default.
3. **One real chart, then the same chart on revision.** The first run calls
   `POST /v3/charts` (create) → `PUT .../data` (the CSV) →
   `PATCH /v3/charts/{id}` (the mapped metadata) → `POST .../publish` (always — `format:
   "web"` needs the URL this returns, and `format: "static"`'s export needs a published
   chart too) → `GET .../export/png` on BOTH branches (the delivered PNG for `format: "static"`; a
   throwaway measurement PNG for `format: "web"`, read by `assertExportedSurface` and never written
   to disk). With `beatDir`, the run writes `spec.json`, `DATAWRAPPER.json`, and `renders/<name>.*`.
   A later run in that same directory reads the receipt, skips chart creation, updates and
   republishes the same chart ID, and refreshes the render. Editor feedback therefore changes the
   existing published visual instead of creating an orphaned replacement. The receipt is written in
   `state: prepared` immediately after a successful create response, before data upload or
   publication, so a later failure can reuse that ID. A timeout or connection loss on the initial
   create response remains provider-ambiguous because no chart ID is available locally; do not claim
   that case has been reconciled.
4. **One format, never both.** `format: "web"` returns the published `publicUrl` and never writes a
   PNG to disk; `format: "static"` writes the PNG and never returns a bare embed. Both now export a
   PNG through the same API call — only one of them keeps the bytes. This mirrors the rest of this
   project's single-format-per-element rule (`STORYBOARD.md`'s `chosen` slot), not a
   Datawrapper-specific idea.
5. **No token, no run.** The managed path receives the token only from Engine's credential broker.
   The underlying `produce` API still throws before making a single network call if its internally
   supplied token is falsy — never a silent fallback to an unrendered stand-in.

## Managed production

Write the reviewed specification to
`<storiesRoot>/<storyId>/beats/<outputId>/spec.json`, then invoke the closed operation. For example:

```bash
printf '%s\n' '{"storyId":"swiss-co2","outputId":"1-co2-line","parameters":{"format":"static","size":"landscape"}}' \
  | bsig run splash datawrapper-produce
```

The command contains no credential. `scripts/prove-co2.mjs` and the direct `produce` CLI remain
maintainer proof and compatibility surfaces; they are not new-install instructions.

## Tuning knobs

| Want | Knob | Where |
| --- | --- | --- |
| How many real API calls one `produce` run makes | First run: `5` for either format (both now export a measurement or delivered PNG); a resumed beat makes one fewer because it reuses `DATAWRAPPER.json`'s chart ID instead of creating another chart | `produce.mjs` |
| Default reference-line weight | `2` px (`strokeWidth`) | `buildRangeAnnotation`, `metadata-spec.mjs` |
| Default reference-line style | `"solid"` (`strokeType`) | `buildRangeAnnotation` |
| Opacity for a drawn line vs a shaded band | `100` / `20` | `buildRangeAnnotation` |
| How far a range annotation's label sits above its line | `6` px (`dy: -6`, y-axis rules only) | `buildRangeAnnotation` |
| Default text-annotation font size | `14` px | `buildTextAnnotation` |
| The three export sizes a static may be produced at | `SIZES` (landscape 1920×1080, square 1080×1080, portrait 1080×1920), at `zoom: 1` — the row IS the delivered pixel size | `sizes.mjs` |
| Static export width / zoom, when `exportChartPng` is called directly | `900` px / `2`× | `exportChartPng` default, `dw-client.mjs` |
| Which data column a rule/colour reads as "the value series" | the data's 2nd column (`columns()`) | `metadata-spec.mjs` |
| How much the fitted y-range pads beyond the data's own min/max | `0.08` (8%) | `Y_RANGE_PAD`, `metadata-spec.mjs` |
| Which chart types keep a zero-anchored axis instead of a fitted one | `/bars\|column/i` on `chartType` | `isBarEncoded`, `metadata-spec.mjs` |
| Whether a chart requests removal of forced Datawrapper attribution | always `false` (plan-gated on a free token — §gotcha) | `buildChartPayload`, `metadata-spec.mjs` |

## Files

- `scripts/validate-spec.mjs` — `validateChartSpec`.
- `scripts/metadata-spec.mjs` — `buildChartPayload`, `buildTextAnnotation`, `buildRangeAnnotation`,
  `resolveSeriesLabel`, `humanizeColumnName`, `renameValueColumn`, `isBarEncoded`, `computeYRange`.
  Reads Datawrapper's own field names from `references/range-annotation-shape.md`'s sources, never
  invents one.
- `scripts/csv.mjs` — `toCsv`.
- `scripts/dw-client.mjs` — the five real HTTP calls.
- `scripts/sizes.mjs` — `SIZES` and `sizeFor`. The three export sizes ruling R2 names, carried (not
  imported), kept in step with every other craft skill's copy by
  `splash/test/size-table-parity.test.ts`. This copy carries **no `typeScale`**, and that
  absence is the point: Datawrapper lays out its type server-side, so there is no local number for a
  scale to multiply — the parity guard is written present-and-valid-or-absent for exactly this.
- `scripts/produce.mjs` — `produce`, the canonical beat orchestrator and persisted
  `spec.json`/`DATAWRAPPER.json` contract. The revision-safe CLI is
  `bun run scripts/produce.mjs <storiesRoot> <storyId> <outputId> [static|web] [size] --story-output`;
  it derives the beat path, loads, and reuses the beat receipt. Without `--story-output`, the
  legacy one-shot `<spec.json> <outDir>` shape remains
  available but is not a published-chart revision path. Managed production enters through
  `scripts/sealed-produce.mjs` and Engine's `datawrapper-produce` operation instead.
- `scripts/verify-owned.mjs` — `assertExportedSurface` and the guard behind it, `plateFollowsGround`,
  copied byte for byte from the three skills that bake a plate and walked by
  `splash/test/guard-copies-parity.test.ts`; `pageLanguageMatchesStory`, also copied byte for byte.
  `produce.mjs` calls both, on the web branch as well as the static one — a decision nothing calls is
  a decision that does not run.
- `scripts/compare-png.mjs` — the tree's own PNG decoder, carried (not imported) like every other
  copy of it, so the surface an export came back on can be read without a browser.
- `scripts/verify-range-annotation.mjs` — the live shape-pinning round-trip; run for real, confirmed
  (`references/range-annotation-shape.md` §2).
- `scripts/prove-co2.mjs` — the real Swiss CO₂ proof case, fetching Our World in Data directly.
- `references/range-annotation-shape.md` — the `range-annotations` shape, now confirmed by a live
  round-trip (chart `jUDCp`) after first being pinned from Datawrapper's own public `chartTypes.ts`
  and `JsonCRDT.benchmark.ts`, cross-checked against two independent third-party re-implementations;
  also records the live-tested findings on vendor attribution (plan-gated, not fixable from code)
  and the fitted y-axis (confirmed working).
- `test/{validate-spec,metadata-spec,csv,dw-client,produce,map-treatments,verify-owned,verify-range-annotation,prove-co2}.test.ts` —
  `bun:test` coverage. Every real-network assertion follows `splash/test/keys.test.ts`'s own
  `it.skipIf(!token)` convention: skipped, never faked, when `DATAWRAPPER_TOKEN` is absent from the
  environment; the actual proof the moment it is present.

## A declared guard is wired to run

`guard-wired-to-run` (`skills/doctrine/references/guard-catalogue.json`): a guard this skill
declares in its own `verify-*.mjs` `GUARDS` array is wired to actually run against what ships —
called from this skill's own producer/render script when the check reads static output, or from a
real DRIVER (a script that drives a live rendered page, e.g. via Puppeteer, or a CLI that walks
real delivered files) when the check needs one — never left reachable only from its own
`*.test.ts`. Measured 2026-08-21 across all eight producing skills: 26 of 40 guard-kind decisions
were declared and unit-tested but never called outside their own test file —
`pageLanguageMatchesStory` on chart-web/map-web/scrolly (the defect that named this discipline) was
three of the twenty-six, not all of them. Too large a population to close in one wave, so it was
written down rather than mechanically enforced.

ROUND SIX ENDED THAT. `fills-its-frame` was distributed to all eight producing skills and called by
none of them four hours later, and a discipline that cannot observe its own violation is theatre.
This is a GUARD now: `declarationsWithoutACaller` (`scripts/detect-guard-wiring.mjs`) reads every
name this skill declares and finds what calls it; `bun skills/<skill>/scripts/check-guard-wiring.mjs`
prints the answer, and `doctrine/test/guard-wiring.test.ts` refuses any name that is unwired and not
recorded. The debt this skill is still carrying is listed BY NAME in that file's `RECORDED_UNWIRED`.
A name may leave that list; adding one is how the defect would recur. A guard written from here on
is wired at the moment it is written, not left for the next stress round to find idle.
