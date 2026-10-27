// The multiples family's static scheduler (craft/gestures/GRAMMAR.md §5): the shared keyed scheduler for static
// (gesture-keyed.mjs) bound to the small multiples's marks, figures and checks (gesture-family-multiples.mjs). Browser-safe.
import { stageKeyedFormat } from "./gesture-keyed.mjs";
import { MULTIPLES_SPEC } from "./gesture-family-multiples.mjs";

export { MULTIPLES_SPEC };

/** @param model the family's model (see gesture-family-multiples.mjs) · the rest as stageKeyedFormat takes it. */
export const stageMultiplesStatic = (args) => stageKeyedFormat({ ...args, spec: MULTIPLES_SPEC, format: "static" });
