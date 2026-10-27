// The Position family's scrolly scheduler (craft/gestures/GRAMMAR.md §5): one card per composed gesture, the reader's
// scroll interpolating continuously from one card's picture to the next, then a closing card carrying the limits on
// which the whole field returns (what was zoomed or filtered comes back, what was shown stays marked).
//
// Every card's picture is the family's scene (`sceneOf`) of its state, laid out ONCE PER STAGE SHAPE (wide, middle,
// narrow — the page's stage is measured on each paint and the nearest shape is drawn, its viewBox fitted, so words
// keep their size). A state is a flat record of finite numbers: per shape and per primitive its numeric attributes
// (`L<shape>_<primitive>_<attr>`), and `note` (which card's note the header reads). The scrolly skill interpolates two
// records; the drive only writes their numbers into the SVG.
//
// Each card's prose is its gesture's `card`; every number in it is checked by the core as the gesture's own note is
// (the card is validated as that gesture's note): a figure the gesture does not draw is refused, naming
// `gestures[i].card` and a value that works. The drive (`applyPositionState`) is ONE self-contained function.
// Browser-safe: no Node module.
import { GestureRefusal, implicitAccent, validateGestures } from "./gesture-core.mjs";
import { createPosition, sceneOf } from "./gesture-family-position.mjs";
import { applyGesture, defaultNote } from "./gesture-position-static.mjs";

export const APPLY = "applyPositionState";

/** The stage shapes a page is laid out for, in viewBox units ≈ CSS px at that shape. */
export const SHAPES = [
  { w: 1400, h: 640 },
  { w: 900, h: 620 },
  { w: 360, h: 560 },
];

const ATTRS = { line: ["x1", "y1", "x2", "y2", "o"], circle: ["cx", "cy", "r", "o"], rect: ["x", "y", "width", "height", "o"], text: ["x", "y", "o"] };

/**
 * The cards' logical states: card k is the picture after gestures 0..k (accumulated, as the story tells it); the
 * closing card returns the whole field on its first scale with every mark kept.
 */
export function scheduleScrollyPosition({ gestures, model, format = String, delta, domain, entities = [] }) {
  const position = createPosition({ model, domain });
  const fallback = defaultNote(model, format, delta ?? ((v) => format(v)));
  let state = position.rest();
  const implicit = implicitAccent(gestures);
  if (model.rows.some((r) => r.name === implicit)) state = position.with(state, { accent: [implicit] });
  const cards = [];
  const notes = [];
  gestures.forEach((g, i) => {
    const { state: next, note } = applyGesture({ position, state, g, i, model, entities, mode: "back", fallback });
    if (position.equal(next, state) && !note)
      throw new GestureRefusal(`gestures[${i}]`, `${g.do} changes nothing in card ${i + 1}'s picture: drop it`, { remove: i });
    state = next;
    cards.push(state);
    notes.push(note?.text ?? "");
  });
  for (let k = 1; k <= cards.length; k++)
    try {
      position.invariants([position.rest(), ...cards.slice(0, k)]);
    } catch (error) {
      throw new GestureRefusal(`gestures[${k - 1}]`, `${error.message}: drop it`, { remove: k - 1 });
    }
  const closing = position.with(state, { domain: [...position.rest().domain].map((v, k) => (k ? Math.max(v, ...state.references.map((r) => r.value)) : Math.min(v, ...state.references.map((r) => r.value)))), window: null, factor: 1, back: [], hidden: [] });
  return { cards: [...cards, closing], notes, position };
}

/**
 * Every card's prose, checked by the core as that gesture's note: present, every number a figure the gesture draws.
 * Returns the paragraphs per card; throws a refusal naming `gestures[i].card` with a fix.
 */
export function checkCardsPosition({ gestures, list, model, claim, hooks, fallback }) {
  return gestures.map((g, i) => {
    const raw = list[i]?.card;
    const paragraphs = [raw].flat().filter((p) => typeof p === "string");
    if (!paragraphs.length || paragraphs.some((p) => !p.trim()))
      throw new GestureRefusal(`gestures[${i}].card`, `card ${i + 1} (${g.do}) has no prose: give the gesture a card, the sentence the reader reads while it plays, in the story's language`, {
        set: { index: i, field: "card", value: g.note ?? fallback(g.marks[0] ?? model.rows[0].name) },
      });
    const own = { ...list[i], note: paragraphs.join(" ") };
    delete own.card;
    try {
      validateGestures({ gestures: [own], rows: model.core, family: "position", format: "scrolly", claim, hooks });
    } catch (error) {
      if (!(error instanceof GestureRefusal) || !error.field.endsWith(".note")) throw error;
      const message = error.message.slice(error.field.length + 2);
      const fixed = error.fix?.set?.value;
      throw new GestureRefusal(`gestures[${i}].card`, `card ${i + 1}: ${message.replace(/^states/, "states")}`, {
        set: { index: i, field: "card", value: typeof fixed === "string" ? fixed : g.note ?? fallback(g.marks[0] ?? model.rows[0].name) },
      });
    }
    return { id: `card-${i + 1}-${g.do}`, prose: paragraphs };
  });
}

/**
 * The flat states the scrolly skill interpolates, and the primitives the page draws once: for every stage shape, the
 * scene of every card; a primitive one card lacks is kept at its nearest card's place with opacity 0.
 */
export function flatStates({ model, cards, notes, text, shapes = SHAPES, pad = 4 }) {
  const scenes = shapes.map((s) => cards.map((state) => sceneOf({ model, state, frame: { x: pad, y: pad, width: s.w - 2 * pad, height: s.h - 2 * pad }, text })));
  const ids = [];
  const first = new Map();
  for (const per of scenes) for (const sc of per) for (const p of sc.prims) if (!first.has(p.id)) (first.set(p.id, p), ids.push(p.id));
  const states = cards.map((_, k) => {
    const rec = { note: k };
    shapes.forEach((_, l) => {
      const per = scenes[l];
      ids.forEach((id, i) => {
        const at = per[k].prims.find((p) => p.id === id);
        const near = at ?? per.map((sc) => sc.prims.find((p) => p.id === id)).find(Boolean) ?? first.get(id);
        for (const a of ATTRS[near.kind] ?? []) rec[`L${l}_${i}_${a}`] = a === "o" ? (at ? at.o : 0) : Number(near[a] ?? 0);
      });
    });
    return rec;
  });
  const prims = ids.map((id, i) => ({ i, ...first.get(id), attrs: ATTRS[first.get(id).kind] ?? [] }));
  return { states, prims, notes };
}

/** The drive's source, as renderScrolly inlines it: this one function, nothing around it. */
export const driveSource = () => applyPositionState.toString();

/**
 * Paints one state. SELF-CONTAINED: its source is inlined into the page alone. Measures the stage, picks the stage
 * shape nearest its proportions, fits the SVG's viewBox to that shape and writes every primitive's numbers.
 */
export function applyPositionState(root, state, context) {
  const carrier = root.querySelector("[data-gpos]");
  if (!carrier) return;
  if (context.resized || !root.__gpos) {
    const data = root.__gposData || (root.__gposData = JSON.parse(carrier.getAttribute("data-gpos")));
    const stage = root.querySelector('[data-part="stage"]');
    root.__gpos = {
      data,
      stage,
      svg: stage.querySelector("svg"),
      els: data.prims.map((p) => stage.querySelector(`[data-p="${p.i}"]`)),
      notes: Array.from(root.querySelectorAll("[data-note]")),
    };
  }
  const c = root.__gpos;
  const SW = c.stage.clientWidth;
  const SH = c.stage.clientHeight;
  if (!(SW > 0 && SH > 0)) return;
  let L = 0;
  let best = Infinity;
  c.data.shapes.forEach((s, l) => {
    const d = Math.abs(Math.log(s.w / s.h) - Math.log(SW / SH)) + Math.abs(Math.log(s.w / SW)) * 0.5;
    if (d < best) {
      best = d;
      L = l;
    }
  });
  const shape = c.data.shapes[L];
  c.svg.setAttribute("viewBox", `0 0 ${shape.w} ${shape.h}`);
  c.data.prims.forEach((p, k) => {
    const el = c.els[k];
    if (!el) return;
    for (const a of p.attrs) {
      const v = state[`L${L}_${p.i}_${a}`];
      if (typeof v !== "number") continue;
      if (a === "o") el.setAttribute("opacity", String(v < 0 ? 0 : v > 1 ? 1 : v));
      else el.setAttribute(a, String(a === "r" || a === "width" || a === "height" ? Math.max(0, v) : v));
    }
  });
  c.notes.forEach((node) => {
    const k = Number(node.getAttribute("data-note"));
    const t = 1 - 2 * Math.abs(state.note - k);
    node.style.opacity = String(t < 0 ? 0 : t > 1 ? 1 : t);
  });
}
