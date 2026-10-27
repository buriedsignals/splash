// The Cell-grid static scheduler (craft/gestures/GRAMMAR.md §5): every gesture's state composed on ONE plate. A temporal
// gesture (reveal, pull-back) draws its end state: the whole grid, what was shown still marked — so a pull-back after a
// filter returns the stepped-back cells. Every note is written on a caption line above the grid, prefixed with the
// row, column or month it is about when its words do not name it; the outline it belongs to is drawn on the grid.
// Browser-safe: no Node module.
import { GestureRefusal } from "./gesture-core.mjs";
import { implicitOutline, noteLine, pictureOf } from "./gesture-family-cell.mjs";

/**
 * @param plan, orders  planCells' output (gesture-family-cell.mjs)
 * @param grid          gridOf's output
 * @param format        how a value is printed
 * @returns the plate: { order, outlines, back, cutoffs, compares, notes: [{ index, do, text, accent }], revealed }
 */
export function composeCellStatic({ plan, orders, grid, format = String }) {
  const pic = pictureOf({ plan, orders, grid, on: plan.map(() => true) });
  const implicit = implicitOutline(plan);
  if (implicit) pic.outlines.unshift(implicit);
  const notes = [];
  const said = new Map();
  plan.forEach((p, k) => {
    const text = noteLine(p, format);
    if (!text) return;
    // Every note is drawn at once on a still plate: two identical lines are one, and two notes on one group collide.
    const key = `${p.label}|${p.cells.join(",")}`;
    if (said.has(key) && ["name", "annotate"].includes(p.do) && ["name", "annotate"].includes(plan[said.get(key)].do))
      throw new GestureRefusal(`gestures[${k}].note`, `${p.label} already carries a note, and every note is drawn at once on a still plate: drop this note (the gesture stays)`, { set: { index: k, field: "note", value: undefined } });
    said.set(key, k);
    if (notes.some((n) => n.text === text)) return;
    notes.push({ index: k, do: p.do, text, accent: p.do === "highlight" || (implicit && implicit.index === k) });
  });
  return { ...pic, notes };
}
