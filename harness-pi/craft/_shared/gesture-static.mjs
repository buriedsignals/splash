// The static scheduler (craft/gestures/GRAMMAR.md §5, §6.1, §9): every gesture's state composed onto ONE plate.
// It folds the validated list into Length states in story order, holds the family's locks over them, and returns
// what the plate draws: which rows take the accent, a ring or step back, the order, the brackets, the copies a
// compare lays, the reference rules, every note with the rows it is written on, the rows the row-dropping ladder
// must keep, and the treatment that judges each drawn gesture (shared/chart-beat/treatments.mjs). A temporal
// gesture (reveal, count, pull-back, rescale) draws its end state. Browser-safe: no Node module.
import { GestureRefusal, implicitAccent } from "./gesture-core.mjs";
import { createLength } from "./gesture-length.mjs";

/** The static treatment each gesture is judged by (GRAMMAR.md §9); null draws nothing a treatment governs. */
export const STATIC_TREATMENT = {
  highlight: "accent-marks-the-thread",
  name: "value-on-the-mark",
  annotate: "value-on-the-mark",
  count: "value-on-the-mark",
  zoom: "value-on-the-mark",
  bracket: "the-set-a-claim-adds-up-is-drawn-as-a-set",
  // A compare lays a copy of the compared length (one row's, or a set's sum) at the subject's scale: no run of
  // rows is needed, so it is judged as neutral context at the subject's scale, never by the set's contiguity.
  compare: "context-in-neutral-at-the-subject-scale",
  reference: "the-target-is-named-on-the-line-that-draws-it",
  reorder: "order-is-chosen-from-the-answer",
  filter: "context-in-neutral-at-the-subject-scale",
  reveal: null,
  rescale: null,
  "pull-back": null,
};

/**
 * @param gestures the `gestures` validateGestures returned (marks resolved, figures derived)
 * @param rows     the rows the beat draws: [{ name, value }]
 * @param format   the beat's value format: a note that only repeats a row's printed value is not a second note
 * @returns        the plate: { order, accent, rings, stepBack, notes, brackets, copies, references, top, keep, treatments }
 */
export function composeStatic({ gestures, rows, format = String }) {
  const length = createLength({ rows, frame: { x: 0, y: 0, width: 1, height: 1 } });
  const valueOf = new Map(rows.map((r) => [r.name, r.value]));
  const all = rows.map((r) => r.name);
  const whole = rows.reduce((s, r) => s + r.value, 0);
  const sum = (names) => names.reduce((s, n) => s + valueOf.get(n), 0);

  let state = length.rest();
  const states = [state];
  const plate = { accent: [], rings: [], stepBack: [], notes: [], brackets: [], copies: [], references: [], top: null };
  const implicit = implicitAccent(gestures);
  if (valueOf.has(implicit)) plate.accent.push(implicit);
  const keep = new Set();
  const judged = [];
  // One plate draws every gesture at once: a row carries one note and one compare's copy. A 12B Polish beat named
  // Mazowieckie and compared it twice, and three notes ran along its one line while two copies crowded its band.
  const noted = new Set();
  const copied = new Set();
  const oneNote = (row, i, text) => {
    if (text !== undefined && text.trim() === format(valueOf.get(row))) return;
    if (noted.has(row))
      throw new GestureRefusal(`gestures[${i}].note`, `${row} already carries a note, and every note is drawn at once on a still plate: drop this note (the gesture stays)`, { set: { index: i, field: "note", value: undefined } });
    noted.add(row);
  };

  gestures.forEach((g, i) => {
    // validateGestures merged `of` rows into `marks`: the gesture's own rows come first.
    const own = g.marks.length - (Array.isArray(g.of) ? g.of.length : 0);
    const marks = g.marks.slice(0, own);
    const of = g.marks.slice(own);
    const note = g.note === undefined ? undefined : String(g.note);
    const write = (anchor, on) => plate.notes.push({ index: i, do: g.do, anchor, marks: on, text: note });
    const judge = (facts, id = STATIC_TREATMENT[g.do]) => judged.push({ index: i, do: g.do, id, facts });
    marks.forEach((m) => keep.add(m));

    switch (g.do) {
      case "highlight":
        state = length.with(state, { emphasis: Object.fromEntries(marks.map((m) => [m, "accent"])) });
        plate.accent.push(...marks.filter((m) => !plate.accent.includes(m)));
        judge({ subject: marks[0] });
        if (note !== undefined && marks.length === 1) oneNote(marks[0], i, note);
        if (note !== undefined) write("mark", marks);
        break;
      case "name":
        oneNote(marks[0], i, note);
        state = length.with(state, { emphasis: { [marks[0]]: "ring" } });
        plate.rings.push(marks[0]);
        plate.notes.push({ index: i, do: g.do, anchor: "mark", marks, text: note ?? `${marks[0]} ${valueOf.get(marks[0])}`, value: note === undefined });
        judge({});
        break;
      case "annotate":
        oneNote(marks[0], i, note);
        // An annotate with no words writes the row's value: the plate adapts rather than refusing.
        plate.notes.push({ index: i, do: g.do, anchor: "mark", marks, text: note?.trim() ? note : String(valueOf.get(marks[0])), value: !note?.trim() });
        judge({});
        break;
      case "filter": {
        const others = all.filter((n) => !marks.includes(n));
        state = length.with(state, { emphasis: Object.fromEntries(others.map((n) => [n, "stepBack"])) });
        plate.stepBack = others;
        judge({ comparisonSet: marks });
        if (note !== undefined) write("span", marks);
        break;
      }
      case "bracket": {
        // One row of the whole: the bracket spans every DRAWN row (`whole`), so the whole it measures against
        // is drawn; the row ladder may still drop rows, and the plate then states the remainder.
        const whole = marks.length === 1 && g.of === "whole";
        const span = whole ? all : marks;
        state = length.with(state, { bracket: span });
        plate.brackets.push({ index: i, span, whole, of: g.of === "whole" ? "whole" : of, note });
        judge({ comparisonSet: span });
        break;
      }
      case "compare": {
        const subject = marks[0];
        if (copied.has(subject))
          throw new GestureRefusal(`gestures[${i}]`, `${subject} already carries a compare's copy, and a second copy in its band cannot be read on a still plate: drop it`, { remove: i });
        copied.add(subject);
        if (note !== undefined) oneNote(subject, i, note);
        const others = marks.length > 1 ? marks.slice(1) : g.of === "whole" ? all.filter((n) => n !== subject) : of;
        others.forEach((m) => keep.add(m));
        const value = marks.length > 1 ? sum(marks.slice(1)) : g.of === "whole" ? whole : sum(of);
        state = length.with(state, { compare: [subject, ...others] });
        plate.copies.push({ index: i, onto: subject, value, of: others });
        judge({ subject, comparisonSet: others });
        if (note !== undefined) write("mark", [subject]);
        break;
      }
      case "reference": {
        const value = Number(g.value);
        state = length.with(state, { reference: value });
        plate.references.push({ index: i, value, note });
        judge({ markers: [{ value }] });
        break;
      }
      case "reorder": {
        const how = g.value === "ascending" || g.value === "descending" ? g.value : marks.length ? [...marks, ...state.order.filter((n) => !marks.includes(n))] : "descending";
        state = length.order(state, how);
        judge({});
        break;
      }
      case "rescale": {
        // The end state's top, never below the tallest bar: a still plate draws every bar whole.
        const top = Math.max(Number(g.value) || 0, ...rows.map((r) => r.value));
        state = length.with(state, { domain: [state.domain[0], top] });
        plate.top = top;
        break;
      }
      case "zoom":
        state = length.with(length.window(state, marks), { factorPrinted: true });
        write("span", marks);
        judge({});
        break;
      case "count": {
        const on = marks.length ? marks : all;
        plate.notes.push({ index: i, do: g.do, anchor: "span", marks: on, text: note ?? String(sum(on)), value: note === undefined });
        judge({});
        break;
      }
      default:
        // reveal and pull-back: their end state is the whole chart, which a static plate already is.
        if (note !== undefined) write("span", all);
    }
    states.push(state);
  });

  // The family's locks, held state by state so the refusal names the gesture that broke one (state k is gesture k-1).
  for (let k = 1; k < states.length; k++)
    try {
      length.invariants(states.slice(0, k + 1));
    } catch (error) {
      throw new GestureRefusal(`gestures[${k - 1}]`, `${error.message}: drop it`, { remove: k - 1 });
    }

  return {
    ...plate,
    order: state.order,
    stepBack: plate.stepBack.filter((n) => !plate.accent.includes(n)),
    keep: [...keep],
    treatments: judged.map(({ index, do: d, id, facts }) => ({ index, do: d, id, facts })),
  };
}
