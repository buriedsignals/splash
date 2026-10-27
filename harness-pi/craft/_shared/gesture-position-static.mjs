// The Position family's static scheduler (craft/gestures/GRAMMAR.md §5, §6): every gesture's state composed onto ONE
// plate. It folds the validated list into Position states in story order, holds the family's locks over them, and
// returns the plate's state (accent, rings, stepped-back rows, the order, the compares' copies, the reference rules)
// and every note with the rows it is written on. A temporal gesture (reveal, pull-back) draws its end state: the
// whole field. A still has no zoom (the registry removes it). Browser-safe: no Node module.
import { GestureRefusal, implicitAccent } from "./gesture-core.mjs";
import { createPosition } from "./gesture-family-position.mjs";

/** Splits validateGestures' marks into the gesture's own rows and its `of` rows. */
export const splitMarks = (g) => {
  const own = g.marks.length - (Array.isArray(g.of) ? g.of.length : 0);
  return { own: g.marks.slice(0, own), of: g.marks.slice(own) };
};

/** What a note with no words prints for a row: its change (paired), its median (groups) or its value. */
export const defaultNote = (model, format, delta) => (name) => {
  const row = model.rows.find((r) => r.name === name);
  if (!row) return name;
  if (row.from !== undefined) return `${name} ${delta(row.change)}`;
  return `${name} ${format(row.value)}`;
};

/**
 * Applies ONE gesture to a state: the definition every format shares. Returns the next state and the note it adds.
 * `mode` is the format's own reading of a filter: "back" (static, video, scrolly: the others step back) or "hide"
 * (web: the others leave the plot).
 */
export function applyGesture({ position, state, g, i, model, entities = [], mode = "back", fallback }) {
  const { own, of } = splitMarks(g);
  const others = [...own, ...of];
  const note = g.note === undefined || !String(g.note).trim() ? undefined : String(g.note);
  const names = model.rows.map((r) => r.name);
  let next = state;
  let written = null;
  const unchanged = (what) => {
    throw new GestureRefusal(`gestures[${i}]`, `${g.do} ${what}, so it would change nothing in the picture: drop it`, { remove: i });
  };
  switch (g.do) {
    case "highlight": {
      const accent = own.filter((m) => g.subject === undefined || m === g.subject);
      const rings = own.filter((m) => !accent.includes(m));
      next = position.with(state, { accent: [...new Set([...state.accent, ...accent])], rings: [...new Set([...state.rings, ...rings])] });
      if (note) written = { index: i, marks: own, text: note };
      break;
    }
    case "name":
      next = position.with(state, { rings: [...new Set([...state.rings, own[0]])] });
      written = { index: i, marks: own, text: note ?? fallback(own[0]), value: note === undefined };
      break;
    case "annotate":
      written = { index: i, marks: own, text: note ?? fallback(own[0]), value: note === undefined };
      break;
    case "compare": {
      const other = others.find((m) => m !== own[0]);
      if (other === undefined) unchanged(`has no second row`);
      next = position.with(state, { compares: [...state.compares, { index: i, subject: own[0], other }] });
      if (note) written = { index: i, marks: [own[0]], text: note };
      break;
    }
    case "reference": {
      const value = Number(g.value);
      if (!Number.isFinite(value))
        throw new GestureRefusal(`gestures[${i}].value`, `a reference needs the value its rule sits at, as a number`, { remove: i });
      // A rule outside the scale widens it: the rule is drawn, never dropped (the plate adapts).
      const domain = [Math.min(state.domain[0], value), Math.max(state.domain[1], value)];
      next = position.with(state, { domain, references: [...state.references, { index: i, value }] });
      if (note) written = { index: i, marks: [], text: note, at: value };
      break;
    }
    case "filter": {
      const kept = own.length ? own : entities.filter((e) => names.includes(e));
      if (!kept.length)
        throw new GestureRefusal(`gestures[${i}].marks`, `a filter keeps the rows the claim is about: name them`, { set: { index: i, field: "marks", value: [names[0]] } });
      if (kept.length === names.length) unchanged(`keeps every drawn row`);
      const rest = names.filter((n) => !kept.includes(n));
      next = position.with(state, mode === "hide" ? { hidden: rest } : { back: rest });
      if (note) written = { index: i, marks: [kept[0]], text: note };
      break;
    }
    case "reorder": {
      const how = g.value === "ascending" || g.value === "descending" ? g.value : own.length ? own : "descending";
      next = position.order(state, how);
      if (next.order.every((n, k) => n === state.order[k])) unchanged(`asks for the order the rows already hold (${state.order.join(", ")})`);
      break;
    }
    case "zoom": {
      const zoomed = position.window(state, own, state.references.map((r) => r.value));
      if (!(zoomed.factor > 1.0001)) unchanged(`onto ${own.join(", ")} keeps the scale it had`);
      next = position.with(zoomed, { factorPrinted: true });
      written = { index: i, marks: [], text: note, zoom: true };
      break;
    }
    case "reveal":
      next = position.with(state, { reveal: 1 });
      if (note) written = { index: i, marks: [], text: note };
      break;
    case "pull-back":
      // The whole field returns, on its first scale; what was shown stays marked.
      next = position.with(state, { domain: [...position.rest().domain].map((v, k) => (k ? Math.max(v, ...state.references.map((r) => r.value)) : Math.min(v, ...state.references.map((r) => r.value)))), window: null, factor: 1, back: [], hidden: [] });
      if (note) written = { index: i, marks: [], text: note };
      break;
    default:
      throw new GestureRefusal(`gestures[${i}].do`, `"${g.do}" has no Position staging`, { remove: i });
  }
  return { state: next, note: written };
}

/**
 * @param gestures validateGestures' gestures
 * @param model    modelOf()
 * @param domain   the beat's optional fixed scale ([0, 100] for a share)
 * @returns        { state, notes, keep }
 */
export function composeStaticPosition({ gestures, model, format = String, delta, domain, entities = [] }) {
  const position = createPosition({ model, domain });
  let state = position.rest();
  const implicit = implicitAccent(gestures);
  if (model.rows.some((r) => r.name === implicit)) state = position.with(state, { accent: [implicit] });
  const states = [state];
  const notes = [];
  const noted = new Set();
  const copied = new Set();
  const fallback = defaultNote(model, format, delta ?? ((v) => format(v)));
  gestures.forEach((g, i) => {
    if (g.do === "compare") {
      if (copied.has(g.marks[0]))
        throw new GestureRefusal(`gestures[${i}]`, `${g.marks[0]} already carries a compare's copy, and a second copy on its row cannot be read on a still plate: drop it`, { remove: i });
      copied.add(g.marks[0]);
    }
    const { state: next, note } = applyGesture({ position, state, g, i, model, entities, mode: "back", fallback });
    if (note) {
      const row = note.marks[0];
      // One note per row on a still plate: every note is drawn at once.
      if (row !== undefined && noted.has(row))
        throw new GestureRefusal(`gestures[${i}].note`, `${row} already carries a note, and every note is drawn at once on a still plate: drop this note (the gesture stays)`, { set: { index: i, field: "note", value: undefined } });
      if (row !== undefined) noted.add(row);
      // A note that only repeats the value printed on its row is drawn once.
      if (!(note.marks.length === 1 && String(note.text).trim() === format(model.rows.find((r) => r.name === row)?.value))) notes.push(note);
    }
    state = next;
    states.push(state);
  });
  for (let k = 1; k < states.length; k++)
    try {
      position.invariants(states.slice(0, k + 1));
    } catch (error) {
      throw new GestureRefusal(`gestures[${k - 1}]`, `${error.message}: drop it`, { remove: k - 1 });
    }
  return { state, notes, keep: [...new Set(gestures.flatMap((g) => g.marks))], position };
}
