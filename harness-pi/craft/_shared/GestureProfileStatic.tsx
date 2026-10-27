/**
 * The profile family's still plate, one variant per type ("radar-spider" | "parallel-coordinates"): the family's scene (`gesture-family-profile.mjs`), every
 * gesture drawn at once, inside the keyed plate's furniture (`GestureKeyedStatic`).
 */
import { GestureKeyedStatic } from "./GestureKeyedStatic.tsx";
import { PROFILE_SPEC } from "./gesture-family-profile.mjs";

export function GestureProfileStatic({ variant = "radar-spider", model, plan, state, format, ...plate }: any) {
  if (!["radar-spider", "parallel-coordinates"].includes(variant)) throw new Error(`the profile family draws radar-spider or parallel-coordinates, not ${variant}`);
  return <GestureKeyedStatic {...plate} state={state} sceneOf={(box, measure, lead) => PROFILE_SPEC.scene(model, { plan, box, measure, lead, format, variant })} />;
}
