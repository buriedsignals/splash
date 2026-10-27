/**
 * The interval family's interactive page (variant "gantt"): the shared keyed page (`GestureKeyedWeb`) over the gantt's
 * scene — the resting plate and one plate per reader control (filter steps the other rows back; compare lays the
 * other row's years as a copy under the subject's bar). The scene is laid out by the runner (`intervalScene`).
 */
import { GestureKeyedWeb } from "./GestureKeyedWeb.tsx";

export function GestureIntervalWeb({ variant = "gantt", ...props }: any) {
  if (variant !== "gantt") throw new Error(`the interval family draws the gantt variant, not ${variant}`);
  return <GestureKeyedWeb {...props} />;
}
