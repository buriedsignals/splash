/**
 * The multiples family's still plate, one variant per type ("small-multiples"): the family's scene (`gesture-family-multiples.mjs`), every
 * gesture drawn at once, inside the keyed plate's furniture (`GestureKeyedStatic`).
 */
import { GestureKeyedStatic } from "./GestureKeyedStatic.tsx";
import { MULTIPLES_SPEC } from "./gesture-family-multiples.mjs";

export function GestureMultiplesStatic({ variant = "small-multiples", model, plan, state, format, ...plate }: any) {
  if (!["small-multiples"].includes(variant)) throw new Error(`the multiples family draws small-multiples, not ${variant}`);
  return <GestureKeyedStatic {...plate} state={state} sceneOf={(box, measure, lead) => MULTIPLES_SPEC.scene(model, { plan, box, measure, lead, format, variant })} />;
}
