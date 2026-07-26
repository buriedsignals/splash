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
// will build. The proposal brain's KB only curates NINE of them as the ONE chosen dw-chart
// render key of a sheet (bar.md → d3-bars, line.md → d3-lines, …). The other thirteen are
// each either the classic (non-d3) counterpart of an already-curated concept, a small-
// multiples/style twin (d3-donuts vs pie.md's d3-pies), or a DW-only visualization
// (election-donut-chart, tables) that no sheet models as a distinct type. They remain fully
// producible — validateChartSpec/produceChart accept them unconditionally if asked for by
// name — `deferred` only tells the proposal brain "not offered through the KB today", the
// same convention chart-native already uses for its Family-B types (sankey, radar, …). See
// DRIFT 2 in lib/brain/typology-drift.test.ts, which is what caught this gap.
const NOT_KB_MODELED: Record<string, string> = {
  "column-chart":
    "classic (non-d3) column chart — the same concept as bar.md's chosen d3-bars key",
  "grouped-column-chart":
    "classic (non-d3) grouped column chart — the same concept as grouped-bar.md's chosen d3-bars-grouped key",
  "stacked-column-chart":
    "classic (non-d3) stacked column chart — the same concept as stacked-bar.md's chosen d3-bars-stacked key",
  "multiple-columns":
    "classic (non-d3) multi-series column chart — no distinct KB sheet beyond bar.md/grouped-bar.md",
  "multiple-lines":
    "classic (non-d3) multi-series line chart — the same concept as line.md's chosen d3-lines key",
  "d3-area":
    "filled area chart — no KB sheet models area as a type distinct from line.md",
  "d3-donuts":
    "donut is a style twin of pie.md's chosen d3-pies key, not a separate KB type",
  "election-donut-chart":
    "parliament/seat-allocation chart — no KB sheet models this concept",
  tables: "a data table, not a chart type in the KB's typology",
  "d3-bars-split": "DW-only bar variant — no distinct KB sheet",
  "d3-multiple-pies":
    "small-multiples twin of pie.md's concept — no distinct KB sheet",
  "d3-multiple-donuts":
    "small-multiples twin of pie.md's concept — no distinct KB sheet",
  "d3-arrow-plot":
    "DW-only before/after arrow plot — no distinct KB sheet beyond dumbbell.md's chosen d3-range-plot key",
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
