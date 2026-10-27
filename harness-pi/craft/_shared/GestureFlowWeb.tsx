/** The flow family's interactive page ("sankey"): the shared keyed page over the family's scene. */
import { GestureKeyedWeb } from "./GestureKeyedWeb.tsx";

export function GestureFlowWeb({ variant = "sankey", ...props }: any) {
  if (!["sankey"].includes(variant)) throw new Error(`the flow family draws sankey, not ${variant}`);
  return <GestureKeyedWeb {...props} />;
}
