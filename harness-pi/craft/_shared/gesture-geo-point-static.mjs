// The static scheduler of the point / line / field maps (craft/gestures/GRAMMAR.md §5, §6): every gesture's state
// composed onto ONE plate. It folds the validated list into the family's states in story order, holds the family's
// locks over them, and returns the declaration the plate draws: the accent, the rings, the step-back, the named
// marks, every note with the marks it is written on, the reference isolines. A temporal gesture (reveal, pull-back)
// draws its end state: every mark. A still has no camera move (the registry refuses zoom for static).
// Browser-safe: no Node module.
import { GestureRefusal, implicitAccent } from "./gesture-core.mjs";

/**
 * @param gestures validateGestures' gestures (marks resolved)
 * @param adapter  createGeoPoint(…)
 * @param format   how a value is printed (a name with no note prints its mark's value)
 * @param label    how a mark is named on the plate (a symbol's "site 3" is printed by its place, or not at all)
 * @returns        { accent, rings, stepBack, named, notes, lines, kept }
 */
export function composeGeoPointStatic({ gestures, adapter, format = String, label = (m) => m }) {
  const states = adapter.fold(gestures);
  for (let k = 0; k < states.length; k++)
    try {
      adapter.invariants(states.slice(0, k + 1));
    } catch (error) {
      throw new GestureRefusal(`gestures[${k}]`, `${error.message}: drop it`, { remove: k });
    }
  const end = states.at(-1) ?? adapter.rest();

  // One plate draws every note at once: a mark carries one note; the earlier gesture's wins.
  const noted = new Map();
  for (const n of end.notes) {
    if (n.kind === "set") continue;
    for (const m of n.marks.slice(0, 1)) {
      if (noted.has(m))
        throw new GestureRefusal(`gestures[${n.index}].note`, `${m} already carries the note of gestures[${noted.get(m)}], and every note is drawn at once on a still plate: drop this note (the gesture stays)`, {
          set: { index: n.index, field: "note", value: undefined },
        });
      noted.set(m, n.index);
    }
  }
  // The subject carries the accent even when no gesture highlights it (doctrine's one accent).
  const implicit = implicitAccent(gestures);
  const accent = end.accent.length ? end.accent : implicit !== undefined ? [implicit] : [];
  const kept = end.kept;
  const stepBack = kept ? adapter.names.filter((n) => !kept.includes(n) && !accent.includes(n)) : [];
  // A name with no note prints the mark's value as the plate prints it.
  const notes = end.notes.map((n) => ({ ...n }));
  for (const m of end.named)
    if (!notes.some((n) => n.marks[0] === m && n.kind !== "set")) notes.push({ index: -1, do: "name", marks: [m], text: `${label(m)} ${format(adapter.valueOf(m))}`.trim(), kind: "mark", value: true });
  return { accent, rings: end.rings.filter((r) => !accent.includes(r)), stepBack, named: end.named, notes, lines: end.lines, kept };
}
