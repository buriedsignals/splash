// The Position family's web scheduler (craft/gestures/GRAMMAR.md §5): the gestures that can rest together
// (WEB_RESTING) are drawn at once on the page the reader lands on — the end states the still plate draws — and every
// further gesture becomes ONE reader control: two native radios (the resting picture, and the picture with that
// gesture applied), mapped to the chart-web atom that names it. A control's state is a whole picture: the resting
// state plus that one gesture, never folded from another control.
//
// compare → `toggle-a-comparison` (the other row's span laid on the subject, or the gap between two positions
// bridged); filter → `filter-to-a-subset` (the others leave, the axis does not move); zoom → `zoom-and-pan` (the
// axis fits the zoomed rows, its factor printed); reorder → `sort-or-reorder` (rows of a dumbbell or a box plot).
//
// The interaction declaration renderWeb holds the page against is GENERATED here from the list; the 12B never
// writes it. Nothing here reads the data's shape. Browser-safe: no Node module.
import { GestureRefusal, implicitAccent } from "./gesture-core.mjs";
import { WEB_RESTING } from "./gesture-registry.mjs";
import { createPosition } from "./gesture-family-position.mjs";
import { applyGesture, defaultNote, splitMarks } from "./gesture-position-static.mjs";

export const POSITION_WEB_CONTROLS = {
  compare: { atom: "toggle-a-comparison", mechanism: "level" },
  filter: { atom: "filter-to-a-subset", mechanism: "filter" },
  zoom: { atom: "zoom-and-pan", mechanism: "scale" },
  reorder: { atom: "sort-or-reorder", mechanism: "reorder" },
};

/**
 * A list with no gesture a reader asks for, refused BEFORE the core: the core's own fix adds a bracket, which a
 * Position family refuses (positions do not add up), so following it would never end. This fix adds a compare of
 * the takeaway's subject with its comparison (or the row nearest it), which this family draws.
 */
export function assertWebHasAControl(gestures, model, claim = {}) {
  if (!Array.isArray(gestures) || !gestures.length || gestures.some((g) => !g || !WEB_RESTING.has(g.do))) return;
  const names = model.rows.map((r) => r.name);
  const named = (t) => names.find((n) => String(t ?? "").toLowerCase().includes(n.toLowerCase()));
  const subject = named(claim.entity) ?? named(claim.takeaway) ?? names[0];
  const value = model.rows.find((r) => r.name === subject)?.value;
  const other = named(claim.versus) ?? [...names].filter((n) => n !== subject).sort((a, b) => Math.abs(model.rows.find((r) => r.name === a).value - value) - Math.abs(model.rows.find((r) => r.name === b).value - value))[0];
  throw new GestureRefusal(
    "gestures",
    `a web page needs at least one gesture a reader asks for (compare, filter, zoom${model.spec.orders ? " or reorder" : ""}); every gesture here rests on the page`,
    other === undefined ? { remove: 0 } : { add: { at: gestures.length, gesture: { do: "compare", marks: [subject, other] } } },
  );
}

/** A gesture with no web control on this page, refused naming what the page can do. */
export function assertPositionWebMapping(gestures) {
  gestures.forEach((g, i) => {
    if (WEB_RESTING.has(g.do) || POSITION_WEB_CONTROLS[g.do]) return;
    throw new GestureRefusal(`gestures[${i}].do`, `"${g.do}" has no web control on this page: stage it with ${Object.keys(POSITION_WEB_CONTROLS).join(", ")} (a control) or ${[...WEB_RESTING].join(", ")} (resting)`, { remove: i });
  });
}

/**
 * @param gestures validateGestures' gestures
 * @param model    modelOf()
 * @returns        { resting: { state, notes }, controls: [{ index, do, atom, state, note, legend, chip, question, changes, parameter }] }
 */
export function scheduleWebPosition({ gestures, model, format = String, delta, domain, entities = [] }) {
  const position = createPosition({ model, domain });
  const fallback = defaultNote(model, format, delta ?? ((v) => format(v)));
  let resting = position.rest();
  const implicit = implicitAccent(gestures);
  if (model.rows.some((r) => r.name === implicit)) resting = position.with(resting, { accent: [implicit] });
  const notes = [];
  // Resting first, in story order: every control's picture stands on the resting state.
  gestures.forEach((g, i) => {
    if (!WEB_RESTING.has(g.do)) return;
    const { state, note } = applyGesture({ position, state: resting, g, i, model, entities, mode: "hide", fallback });
    resting = state;
    if (note?.text) notes.push(note);
  });
  const controls = [];
  gestures.forEach((g, i) => {
    if (WEB_RESTING.has(g.do)) return;
    const { own } = splitMarks(g);
    const { state, note } = applyGesture({ position, state: resting, g, i, model, entities, mode: "hide", fallback });
    if (g.do === "zoom") {
      // The printed factor is the zoom's own (no-let-camera-magnification), at the note's precision.
      const stated = String(g.note ?? "").match(/(\d+(?:[.,]\d+)?)/);
      const decimals = stated?.[1].split(/[.,]/)[1]?.length ?? 1;
      const written = stated ? Number(stated[1].replace(",", ".")) : NaN;
      if (!(Math.abs(written - state.factor) <= 0.5 * 10 ** -decimals + 1e-9)) {
        const fixed = state.factor.toFixed(decimals).replace(".", /,/.test(stated?.[1] ?? "") ? "," : ".");
        const value = stated ? String(g.note).replace(stated[1], fixed) : `×${fixed}`;
        throw new GestureRefusal(`gestures[${i}].note`, `prints the factor ${stated?.[1] ?? "nothing"}, but zooming onto ${own.join(", ")} enlarges the scale ×${state.factor.toFixed(2)}: write "${value}"`, { set: { index: i, field: "note", value } });
      }
    }
    const kept = model.rows.map((r) => r.name).filter((n) => !state.hidden.includes(n));
    const short = (list) => (list.length <= 3 ? list.join(" + ") : `${list[0]} + ${list.length - 1}`);
    const words = {
      compare: { legend: `${own[0]} / ${g.marks.find((m) => m !== own[0])}`, chip: `${own[0]} / ${g.marks.find((m) => m !== own[0])}`, question: `How does ${own[0]} stand against ${g.marks.find((m) => m !== own[0])}?`, changes: `The other row's span is laid on ${own[0]}'s, on the same axis.` },
      filter: { legend: short(kept), chip: `${kept.length} / ${model.rows.length}`, question: `What do ${kept.join(", ")} look like without the others?`, changes: "The other marks leave the plot; the axis and every remaining mark stay exactly where they were." },
      zoom: { legend: short(own), chip: `× ${state.factor.toFixed(1)}`, question: `What do ${own.join(", ")} look like with the axis enlarged onto them?`, changes: `The value axis enlarges ×${state.factor.toFixed(1)} onto ${own.join(", ")}; the factor is printed.` },
      reorder: { legend: `${state.order[0]} - ${state.order.at(-1)}`, chip: `${state.order[0]} - ${state.order.at(-1)}`, question: `What does the field look like with ${state.order[0]} first?`, changes: "The same rows move into the new order, names with them; every position and the axis stay as they were." },
    }[g.do];
    controls.push({
      index: i,
      do: g.do,
      ...POSITION_WEB_CONTROLS[g.do],
      state,
      note: note?.text,
      label: g.label === undefined ? undefined : String(g.label),
      ...words,
      parameter: `whether gestures[${i}] (${g.do}) is drawn`,
    });
  });
  return { resting: { state: resting, notes }, controls, position };
}

/** The interaction declaration renderWeb holds the page against: every mark answers, then one control per gesture. */
export function interactionPlanPosition({ controls, model, subject }) {
  const HELD = [".chart-header", ".chart-source"];
  const ask = {
    question: "What is this mark's reading, and where does it rank?",
    gesture: "ask-a-mark",
    changes: "The mark steps toward the ink and the answer prints its reading and its rank.",
    parameter: "which mark is asked about",
    authorPicked: subject ?? model.rows[0].name,
    readerPicks: "every mark",
    heldStill: HELD,
  };
  return {
    earns:
      `A still of these ${model.rows.length} rows must draw every gesture at once on one plate. Here the reader lands on the resting picture and asks for each further gesture in turn — ${controls.map((c) => `${c.do} (${c.atom})`).join(", ")} — and every mark answers with its own reading and rank.`,
    controls: [ask, ...controls.map((c) => ({ question: c.question, gesture: c.atom, changes: c.changes, parameter: c.parameter, authorPicked: "on", readerPicks: ["rest", "on"], heldStill: HELD }))],
  };
}
