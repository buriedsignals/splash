// The flow family's static scheduler (craft/gestures/GRAMMAR.md §5): the shared keyed scheduler for static
// (gesture-keyed.mjs) bound to the sankey's marks, figures and checks (gesture-family-flow.mjs). Browser-safe.
import { stageKeyedFormat } from "./gesture-keyed.mjs";
import { FLOW_SPEC } from "./gesture-family-flow.mjs";

export { FLOW_SPEC };

/** @param model the family's model (see gesture-family-flow.mjs) · the rest as stageKeyedFormat takes it. */
export const stageFlowStatic = (args) => stageKeyedFormat({ ...args, spec: FLOW_SPEC, format: "static" });
