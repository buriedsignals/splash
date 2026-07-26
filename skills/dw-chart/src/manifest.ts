// dw-chart's producer manifest — self-registers with the shared registry on import.
// An IN-PROCESS (hosted-DW) producer: the unified dispatcher (Task 8) awaits `inProcess`, which
// calls the engine's produceChart and returns a DeliveredArtifact. The spine owns the outDir
// lifecycle + canonical-channel injection + the format gate (rejects video/scrolly off
// manifest.formats BEFORE this runs); inProcess owns ONLY the engine call — no orchestrator
// logic leaks into the engine. validate delegates to the engine's EXISTING validateChartSpec.
import { join } from "node:path";
import { registerProducer } from "../../../lib/core/registry";
import type { DeliveredArtifact } from "../../../lib/core/contract";
import { validateChartSpec, CHART_TYPES, type ChartSpec } from "./chart-spec";
import { produceChart, type DwChartFormat } from "./produce";

// CHART_TYPES is validateChartSpec's full API surface — every visualization slug Datawrapper
// will build. Per spec §5.1, a sheet's `engines[dw-chart]` may name SEVERAL of them (the
// horizontal/vertical pair bar.md claims as `[d3-bars, column-chart]`, etc. — see bar.md,
// grouped-bar.md, stacked-bar.md). The remaining ten are each a DW visualization no sheet
// claims at all — verified below against this file's own `value-label-safety.ts` /
// `chart-spec.ts` groupings, not guessed. They remain fully producible —
// validateChartSpec/produceChart accept them unconditionally if asked for by name —
// `deferred` only states a fact about the ENGINE surface the KB does not curate, never a
// missing KB sheet as such (spec §5.1's own distinction). See DRIFT 2 in
// lib/brain/typology-drift.test.ts, which is what caught this gap.
const NOT_KB_MODELED: Record<string, string> = {
  tables:
    "a data table (validateChartSpec's TABLE_TYPES), not a chart type in the KB's typology",
  "d3-area":
    "Datawrapper's SINGLE-series filled area chart (chart-spec.ts's own 'single-series' CHART_TYPES grouping; absent from MULTI_SERIES_TYPES) — considered for stacked-area.md, but that sheet is a multi-series composition (≤5 stacked bands, part-to-whole intent) a single-series area cannot render; no KB sheet models a single-series area distinct from line.md's line rendering",
  "election-donut-chart":
    "Datawrapper's dedicated parliament/seat-allocation donut (PART_TO_WHOLE_TYPES, chart-spec.ts) — a distinct chart type for seat counts, no KB sheet models it",
  "d3-donuts":
    "the donut-hole style variant of pie.md's chosen d3-pies key (both PART_TO_WHOLE_TYPES) — a rendering style, not a separate KB concept",
  "multiple-columns":
    "Datawrapper's small-multiples column chart (one mini chart per series; MULTI_SERIES_TYPES, chart-spec.ts) — distinct from grouped-column-chart's single combined chart; no KB sheet models the small-multiples layout",
  "multiple-lines":
    "Datawrapper's small-multiples line chart (one mini chart per series; MULTI_SERIES_TYPES, chart-spec.ts) — line.md's chosen d3-lines key already covers multi-series in ONE chart (limits.maxSeries: 5); no KB sheet models the small-multiples layout separately",
  "d3-multiple-pies":
    "Datawrapper's small-multiples pie chart (one mini pie per series; MULTI_SERIES_TYPES, chart-spec.ts) — no KB sheet models small multiples as distinct from pie.md's chosen d3-pies key",
  "d3-multiple-donuts":
    "Datawrapper's small-multiples donut chart (one mini donut per series; MULTI_SERIES_TYPES, chart-spec.ts) — no KB sheet models small multiples as distinct from pie.md's chosen d3-pies key",
  "d3-bars-split":
    "a horizontal multi-series bar variant in the d3-bars family (HORIZONTAL_BAR_TYPES + MULTI_SERIES_TYPES, value-label-safety.ts/chart-spec.ts) — no KB sheet models this layout; its exact visual distinction from d3-bars-grouped could not be verified beyond that family membership, flagged for the reviewer rather than guessed",
  "d3-arrow-plot":
    "Datawrapper's arrow-plot variant of the row-driven, category-y/value-x family (ROW_DRIVEN_TYPES alongside d3-range-plot/d3-dot-plot, chart-spec.ts) — dumbbell.md's chosen key is d3-range-plot, not this; no KB sheet models the arrow-specific variant",
};

registerProducer({
  name: "dw-chart",
  // dw-chart has no video/scrolly renderer (those require chart-native's D3 core).
  formats: ["static", "interactive"],
  types: CHART_TYPES.map((id) =>
    NOT_KB_MODELED[id] ? { id, deferred: NOT_KB_MODELED[id] } : { id },
  ),
  validate: (spec) => {
    const r = validateChartSpec(spec);
    return r.ok ? [] : r.errors;
  },
  execution: "in-process",
  inProcess: async (spec, ctx): Promise<DeliveredArtifact> => {
    // The channel is already injected onto `spec` by the spine (withProposalChannel), so
    // produceChart sizes against the canonical channel. The format gate upstream guarantees
    // ctx.format ∈ {static, interactive}. `result.pngPath` is present only for "static" (the
    // owned PNG export); "interactive" delivers the hosted embed alone (form=hosted, no media).
    const pngPath = join(ctx.outDir, `${ctx.id}.png`);
    const result = await produceChart(spec as ChartSpec, pngPath, {
      format: ctx.format as DwChartFormat,
    });
    return {
      format: ctx.format,
      form: result.pngPath ? "file" : "hosted",
      files: result.pngPath ? [result.pngPath] : [],
      publicUrl: result.publicUrl,
      report: { chartId: result.chartId, embed: result.embed },
    };
  },
});
