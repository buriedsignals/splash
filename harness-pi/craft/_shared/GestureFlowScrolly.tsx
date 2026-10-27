/** The flow family's scrolly visual ("sankey"): the shared keyed visual over the family's scene. */
import { GestureKeyedScrolly } from "./GestureKeyedScrolly.tsx";

export function GestureFlowScrolly({ variant = "sankey", ...props }: any) {
  if (!["sankey"].includes(variant)) throw new Error(`the flow family draws sankey, not ${variant}`);
  return <GestureKeyedScrolly {...props} />;
}
