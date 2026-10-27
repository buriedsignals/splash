/** The profile family's scrolly visual ("radar-spider" | "parallel-coordinates"): the shared keyed visual over the family's scene. */
import { GestureKeyedScrolly } from "./GestureKeyedScrolly.tsx";

export function GestureProfileScrolly({ variant = "radar-spider", ...props }: any) {
  if (!["radar-spider", "parallel-coordinates"].includes(variant)) throw new Error(`the profile family draws radar-spider or parallel-coordinates, not ${variant}`);
  return <GestureKeyedScrolly {...props} />;
}
