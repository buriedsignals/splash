// The paired family's static scheduler (craft/gestures/GRAMMAR.md §5, §6): every gesture's state composed onto ONE
// plate. It folds the validated list into paired states in story order (gesture-family-paired.mjs `foldAll`), holds
// the family's locks over them, and returns what the plate draws: the order, which marks take the accent or a ring,
// the keys that step back, every note with the keys it is written on, the copies a compare lays, the brackets, the
// reference rules, and the keys the row ladder must keep. A temporal gesture (reveal, pull-back) draws its end state:
// a still plate is already the whole chart. Browser-safe: no Node module.
import { foldAll, splitMarks } from "./gesture-family-paired.mjs";

/**
 * @param gestures the `gestures` validateGestures returned (marks resolved, figures derived)
 * @param keys / marks / series / variant   from marksOf
 * @param format   how a value is printed: a note that only repeats a mark's printed value is not drawn twice
 * @param claim    the claim (pairedClaim): its subject key carries the accent when no gesture highlights
 * @returns        { order, accent, rings, stepBack, notes, copies, brackets, references, keep, subject }
 */
export function composePairedStatic({ gestures, keys, marks, series, variant, format = String, claim = {} }) {
  const { states, subject } = foldAll({ gestures, keys, marks, series, variant, format, claim });
  const end = states.at(-1);
  const byName = new Map(marks.map((m) => [m.name, m]));
  const keep = new Set();
  for (const g of gestures) {
    const { own } = splitMarks(g);
    for (const n of g.marks) if (byName.has(n)) keep.add(byName.get(n).key);
    if (g.do === "filter") for (const n of own) keep.add(byName.get(n)?.key);
  }
  if (subject !== undefined) keep.add(subject);
  keep.delete(undefined);
  const printed = (n) => n.marks.length === 1 && String(n.text).trim() === String(format(byName.get(n.marks[0])?.value));
  return {
    order: end.order,
    accent: Object.entries(end.emphasis).filter(([, r]) => r === "accent").map(([m]) => m),
    rings: Object.entries(end.emphasis).filter(([, r]) => r === "ring").map(([m]) => m),
    stepBack: end.stepBack,
    notes: end.notes.filter((n) => !printed(n)),
    copies: end.copies,
    brackets: end.brackets,
    references: end.references,
    keep: [...keep],
    subject,
    states,
  };
}
