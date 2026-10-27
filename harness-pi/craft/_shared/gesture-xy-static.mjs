// The XY static scheduler (craft/gestures/GRAMMAR.md §5): every gesture's state composed onto ONE plate. A temporal
// gesture (reveal, trace, pull-back) draws its end state: every point, every path whole. A still shows every gesture
// at once, so a pull-back does not undo a filter here (what was shown stays marked), and a mark carries one note
// (the later is dropped, the gesture stays). Zoom is not admissible on a still (gesture-registry NOT_IN).
// Browser-safe: no Node module.
import { invariants, pictureAt, planXY } from "./gesture-family-xy.mjs";

/**
 * @param gestures validateGestures' list (family "xy", format "static")
 * @param xy       the adapter (createXY)
 * @returns        { plan, picture, accentMark, ruleAccent, keep } — `ruleAccent`: no mark is the subject, so the
 *                 argument's rule (the first reference or threshold) carries the accent
 */
export function composeStaticXY({ gestures, xy }) {
  const { plan, accentMark } = planXY({ gestures, xy, oneNote: true });
  const still = plan.map((p) => (p.do === "pull-back" ? { ...p, release: false } : p));
  const on = Object.fromEntries(still.map((p) => [p.k, 1]));
  const picture = pictureAt({ plan: still, accentMark, xy, on });
  invariants([picture], xy);
  const ruleAccent = accentMark === null && picture.rules.length > 0;
  return { plan: still, picture, accentMark, ruleAccent, keep: [...new Set(plan.flatMap((p) => p.reach))] };
}
