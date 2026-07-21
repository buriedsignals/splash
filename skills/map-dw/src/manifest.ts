// map-dw's producer manifest — self-registers with the shared registry on import.
// An IN-PROCESS (hosted-DW) producer: the unified dispatcher (Task 8) awaits `inProcess`, which
// calls the engine's produceMap and returns a DeliveredArtifact. The spine owns the outDir
// lifecycle + canonical-channel injection + the format gate (rejects video/scrolly off
// manifest.formats BEFORE this runs — animated maps are map-native's); inProcess owns ONLY the
// engine call. validate delegates to the engine's EXISTING validateMapSpec (errors-only).
import { join } from "node:path";
import { registerProducer } from "../../../lib/core/registry";
import type { DeliveredArtifact } from "../../../lib/core/contract";
import { validateMapSpec, type MapSpec } from "./map-spec";
import { produceMap, type DwMapFormat } from "./produce";

registerProducer({
  name: "map-dw",
  // Animated maps are map-native's — map-dw builds only static / interactive.
  formats: ["static", "interactive"],
  validate: (spec) => {
    const r = validateMapSpec(spec);
    return r.ok ? [] : r.errors;
  },
  execution: "in-process",
  inProcess: async (spec, ctx): Promise<DeliveredArtifact> => {
    // The channel is already injected onto `spec` by the spine (withProposalChannel), so
    // produceMap sizes AND render-size-verifies against the canonical channel. The format gate
    // upstream guarantees ctx.format ∈ {static, interactive}. `result.pngPath` is present only
    // for "static" (the owned PNG at the channel box); "interactive" delivers the hosted embed
    // alone (form=hosted, no owned media).
    const pngPath = join(ctx.outDir, `${ctx.id}.png`);
    const result = await produceMap(spec as MapSpec, pngPath, {
      format: ctx.format as DwMapFormat,
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
