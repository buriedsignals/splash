// The profile family's static scheduler (craft/gestures/GRAMMAR.md §5): the shared keyed scheduler for static
// (gesture-keyed.mjs) bound to the radar's and parallel coordinates''s marks, figures and checks (gesture-family-profile.mjs). Browser-safe.
import { stageKeyedFormat } from "./gesture-keyed.mjs";
import { PROFILE_SPEC } from "./gesture-family-profile.mjs";

export { PROFILE_SPEC };

/** @param model the family's model (see gesture-family-profile.mjs) · the rest as stageKeyedFormat takes it. */
export const stageProfileStatic = (args) => stageKeyedFormat({ ...args, spec: PROFILE_SPEC, format: "static" });
