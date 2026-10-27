/** The multiples family's scrolly visual ("small-multiples"): the shared keyed visual over the family's scene. */
import { GestureKeyedScrolly } from "./GestureKeyedScrolly.tsx";

export function GestureMultiplesScrolly({ variant = "small-multiples", ...props }: any) {
  if (!["small-multiples"].includes(variant)) throw new Error(`the multiples family draws small-multiples, not ${variant}`);
  return <GestureKeyedScrolly {...props} />;
}
