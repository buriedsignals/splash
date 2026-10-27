// The Stack family's static scheduler (craft/gestures/GRAMMAR.md §5): every gesture's state composed onto ONE
// plate. It folds the validated list into Stack states in story order (gesture-family-stack.mjs `apply`), holds the
// family's locks, and returns what the plate draws: the accent and rings, the stepped-back bars, the order, the
// brackets, the copies a compare lays, the reference rules, the count, every note with the segments it is written
// on. A temporal gesture (reveal, count, pull-back) draws its end state. Browser-safe: no Node module.
import { GestureRefusal } from "./gesture-core.mjs";
import { foldStack } from "./gesture-family-stack.mjs";

/**
 * @param gestures the list validateStack returned
 * @param stack    the family model (stackFromBeat)
 * @param subject  the bar the takeaway is about (validateStack's `subject`), always in the accent
 * @returns        the plate: the end state plus `keep` (bars a row-dropping ladder must keep)
 * @param {{ gestures: any[], stack: any, format?: (v: number) => string, subject?: string | null }} input
 * @returns {any}
 */
export function composeStackStatic({ gestures, stack, format = String, subject = null }) {
  // One plate draws every gesture at once: a bar carries one note and one compare's copy.
  const noted = new Map();
  const copied = new Set();
  gestures.forEach((g, i) => {
    const bars = [...new Set(g.marks.slice(0, g.marks.length - (Array.isArray(g.of) ? g.of.length : 0)).map(stack.barOf))];
    const at = g.do === "compare" ? [...new Set((g.subjectSegs ?? [g.marks[0]]).map(stack.barOf))] : bars;
    if (g.do === "compare") {
      const key = at.join("|");
      if (copied.has(key))
        throw new GestureRefusal(`gestures[${i}]`, `${at.join(", ")} already carries a compare's copy, and a second copy on one bar cannot be read on a still plate: drop it`, { remove: i });
      copied.add(key);
    }
    if (g.note === undefined || !["highlight", "name", "annotate", "compare"].includes(g.do) || at.length !== 1) return;
    const value = stack.unit(g.subjectSegs ?? g.marks).value;
    if (String(g.note).trim() === format(value)) return;
    if (noted.has(at[0]))
      throw new GestureRefusal(`gestures[${i}].note`, `${at[0]} already carries a note (gestures[${noted.get(at[0])}]), and every note is drawn at once on a still plate: drop this note (the gesture stays)`, {
        set: { index: i, field: "note", value: undefined },
      });
    noted.set(at[0], i);
  });
  const states = foldStack(stack, gestures, { format, subject });
  const plate = states.at(-1);
  const keep = new Set(gestures.flatMap((g) => g.marks.map(stack.barOf)));
  if (subject) keep.add(subject);
  return { ...plate, stepBack: plate.stepBack.filter((b) => !plate.accent.includes(b)), keep: [...keep].filter(Boolean) };
}
