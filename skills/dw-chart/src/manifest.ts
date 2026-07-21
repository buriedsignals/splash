// dw-chart's producer manifest — self-registers with the shared registry on import.
// An IN-PROCESS (hosted-DW) producer: dispatch imports + awaits produceChart. The inProcess
// slot is a typed placeholder wired in Task 8 (the uniform produce path); adapters.ts still
// calls produceChart directly for now, keeping the exact single-format gate + behaviour.
// validate delegates to the engine's EXISTING validateChartSpec (errors-only projection).
import { registerProducer } from "../../../lib/core/registry";
import { validateChartSpec } from "./chart-spec";

registerProducer({
  name: "dw-chart",
  // dw-chart has no video/scrolly renderer (those require chart-native's D3 core).
  formats: ["static", "interactive"],
  validate: (spec) => {
    const r = validateChartSpec(spec);
    return r.ok ? [] : r.errors;
  },
  execution: "in-process",
  inProcess: async () => {
    throw new Error("dw-chart inProcess is wired in Task 8");
  },
});
