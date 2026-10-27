// The interval family's static scheduler (craft/gestures/GRAMMAR.md §5): the shared keyed scheduler for static
// (gesture-keyed.mjs) bound to the gantt's marks, figures and checks (gesture-family-interval.mjs). Browser-safe.
import { stageKeyedFormat } from "./gesture-keyed.mjs";
import { INTERVAL_SPEC } from "./gesture-family-interval.mjs";

export { INTERVAL_SPEC };

/** @param model the family's model (see gesture-family-interval.mjs) · the rest as stageKeyedFormat takes it. */
export const stageIntervalStatic = (args) => stageKeyedFormat({ ...args, spec: INTERVAL_SPEC, format: "static" });
