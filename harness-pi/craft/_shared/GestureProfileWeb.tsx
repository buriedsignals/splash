/** The profile family's interactive page ("radar-spider" | "parallel-coordinates"): the shared keyed page over the family's scene. */
import { GestureKeyedWeb } from "./GestureKeyedWeb.tsx";

export function GestureProfileWeb({ variant = "radar-spider", ...props }: any) {
  if (!["radar-spider", "parallel-coordinates"].includes(variant)) throw new Error(`the profile family draws radar-spider or parallel-coordinates, not ${variant}`);
  return <GestureKeyedWeb {...props} />;
}
