/** The interval family's scrolly visual (variant "gantt"): the shared keyed visual over the gantt's scene. */
import { GestureKeyedScrolly } from "./GestureKeyedScrolly.tsx";

export function GestureIntervalScrolly({ variant = "gantt", ...props }: any) {
  if (variant !== "gantt") throw new Error(`the interval family draws the gantt variant, not ${variant}`);
  return <GestureKeyedScrolly {...props} />;
}
