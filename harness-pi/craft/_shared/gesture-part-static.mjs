// The static scheduler of the Part-to-whole family (craft/gestures/GRAMMAR.md §5, §6): every gesture's state composed
// onto ONE plate. It folds the validated list into the family's picture in story order (gesture-family-part.mjs
// foldPart) and returns what the plate draws: the parts in the accent, ringed or stepped back, every note with the
// parts it is written on, the brackets (a set laid together, its sum and share printed), the copies a compare lays
// (area or angle kept), the figure a count ends on. A temporal gesture (reveal, count, pull-back) draws its end state.
// A still draws every note at once, so a part carries one note and one compare's copy: the later is refused, with a
// fix. Nothing here reads the data's shape. Browser-safe: no Node module.
import { GestureRefusal } from "./gesture-core.mjs";
import { foldPart, groupsOf, namedMarks } from "./gesture-family-part.mjs";

/**
 * @param variant  treemap | marimekko-mosaic-plot | pie-and-donut
 * @param gestures validatePart's `valid` (marks resolved, figures derived)
 * @param marks    every mark (the whole): [{ name, value, key?, series? }]
 * @param format   how a value is printed
 * @returns        the plate: { accent, rings, stepBack, notes, brackets, copies, count, reveal, groups, keep }
 */
export function composePartStatic({ variant, gestures, marks, format = (v) => String(v) }) {
  const copied = new Map();
  gestures.forEach((g, i) => {
    if (g.do !== "compare") return;
    if (copied.has(g.marks[0]))
      throw new GestureRefusal(`gestures[${i}]`, `${g.marks[0]} already carries the copy of gestures[${copied.get(g.marks[0])}], and a second copy on one part cannot be read on a still plate: drop it`, { remove: i });
    copied.set(g.marks[0], i);
  });
  const plate = foldPart({ variant, gestures, marks, format, oneNote: true });
  return { ...plate, groups: groupsOf(plate), keep: namedMarks(gestures) };
}
