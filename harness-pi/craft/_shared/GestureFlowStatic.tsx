/**
 * The flow family's still plate, one variant per type ("sankey"): the family's scene (`gesture-family-flow.mjs`), every
 * gesture drawn at once, inside the keyed plate's furniture (`GestureKeyedStatic`).
 */
import { GestureKeyedStatic } from "./GestureKeyedStatic.tsx";
import { FLOW_SPEC } from "./gesture-family-flow.mjs";

export function GestureFlowStatic({ variant = "sankey", model, plan, state, format, ...plate }: any) {
  if (!["sankey"].includes(variant)) throw new Error(`the flow family draws sankey, not ${variant}`);
  return <GestureKeyedStatic {...plate} state={state} sceneOf={(box, measure, lead) => FLOW_SPEC.scene(model, { plan, box, measure, lead, format, variant })} />;
}
