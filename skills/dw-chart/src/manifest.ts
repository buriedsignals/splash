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

registerProducer({
  name: "dw-chart",
  // dw-chart has no video/scrolly renderer (those require chart-native's D3 core).
  formats: ["static", "interactive"],
  types: CHART_TYPES.map((id) => ({ id })),
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
