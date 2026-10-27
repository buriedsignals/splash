/** The multiples family's interactive page ("small-multiples"): the shared keyed page over the family's scene. */
import { GestureKeyedWeb } from "./GestureKeyedWeb.tsx";

export function GestureMultiplesWeb({ variant = "small-multiples", ...props }: any) {
  if (!["small-multiples"].includes(variant)) throw new Error(`the multiples family draws small-multiples, not ${variant}`);
  return <GestureKeyedWeb {...props} />;
}
