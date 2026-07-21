// map-dw's producer manifest — self-registers with the shared registry on import.
// An IN-PROCESS (hosted-DW) producer: dispatch imports + awaits produceMap. The inProcess
// slot is a typed placeholder wired in Task 8 (the uniform produce path); adapters.ts still
// calls produceMap directly for now, keeping the exact single-format gate + behaviour.
// validate delegates to the engine's EXISTING validateMapSpec (errors-only projection).
import { registerProducer } from "../../../lib/core/registry";
import { validateMapSpec } from "./map-spec";

registerProducer({
  name: "map-dw",
  // Animated maps are map-native's — map-dw builds only static / interactive.
  formats: ["static", "interactive"],
  validate: (spec) => {
    const r = validateMapSpec(spec);
    return r.ok ? [] : r.errors;
  },
  execution: "in-process",
  inProcess: async () => {
    throw new Error("map-dw inProcess is wired in Task 8");
  },
});
