// The video scheduler of the Part-to-whole family (craft/gestures/GRAMMAR.md §5): three composed gestures placed into
// the six-event timing contract. `establish` (the title card) and `reference` (the parts arriving in their layout) are
// the scheduler's; the gestures fill `reveal`, `subject` and `conclusion` in story order; the conclusion shows the
// whole — a filter still active is released there, what was shown stays marked — and brings the credit; `hold`
// repeats it. A state is a flat record of finite numbers, as `assertEventStates` reads it: per drawn part i its accent
// `a<i>`, ring `r<i>` and step-back `b<i>`; per gesture its own field `g<k>` (a bracket's outline drawing in, a
// compare's copy growing at the plate's one area or angle per unit, a count climbing); `grown` and `ink` (the parts
// arriving; a reveal draws them largest first); `title`, `furniture`, `release`, `source`.
//
// THE LAYOUT NEVER MOVES BETWEEN EVENTS: one whole, one area (or angle) per unit, every bracket's set laid together
// from the first frame (no-move-cell-conserving, no-change-arc-angle). Only a copy grows, and it grows at that measure.
//
// The time half (`fieldAt`, `progressOf`, `landedOf`) is the Length video's (./gesture-video.mjs), read over this
// family's states; the scene (`partSceneAt`) is pure arithmetic over build's props, run in Chrome and in Bun.
// Browser-safe: no Node module, no `#shared` import.
import { GestureRefusal } from "./gesture-core.mjs";
import { copyShape, foldPart, groupsOf, selectParts } from "./gesture-family-part.mjs";
import { VIDEO_EVENTS } from "./gesture-registry.mjs";
import { EVENTS, fieldAt, landedOf, moveOf } from "./gesture-video.mjs";

export { EVENTS, fieldAt };

/** Windows inside each event, as shares of its duration (the Length video's). */
const WINDOW = {
  establish: { title: [-1, 0] },
  reference: { title: [0, 0.15], furniture: [0.1, 0.45], grown: [0.25, 0.9], ink: [0.25, 0.9] },
  gesture: [0.08, 0.88],
  conclusion: { release: [0, 0.3], gesture: [0.28, 0.82], source: [0.82, 0.97] },
};
/** Gestures whose own field is an arrival (eased); a bracket, a compare and a count move along a measure (linear). */
const ARRIVES = new Set(["highlight", "name", "annotate", "filter", "pull-back", "reveal"]);

const prefixSums = (values) => {
  let s = 0;
  return values.map((v) => (s += v));
};

/**
 * @param variant  treemap | marimekko-mosaic-plot | pie-and-donut
 * @param gestures validatePart's `valid` (exactly three: the core refuses any other count for video)
 * @param marks    every mark (the whole)
 * @param capacity how many parts the frame draws beside the named ones (selectParts)
 * Returns        (parts, rest, groups, states, windows, linear, plan, whole )
 */
export function schedulePartVideo({ variant, gestures, marks, capacity = undefined }) {
  if (gestures.length !== VIDEO_EVENTS.length)
    throw new GestureRefusal("gestures", `a video takes exactly ${VIDEO_EVENTS.length} gestures; this list has ${gestures.length}`, { remove: gestures.length - 1 });
  const { parts, rest } = selectParts({ variant, marks, gestures, capacity });
  const valueOf = new Map(marks.map((m) => [m.name, m.value]));
  const whole = marks.reduce((s, m) => s + m.value, 0);
  const sum = (list) => list.reduce((s, n) => s + (valueOf.get(n) ?? 0), 0);
  const groups = groupsOf(foldPart({ variant, gestures, marks }));
  const encode = (pic, into) => {
    parts.forEach((p, i) => {
      into[`a${i}`] = pic.accent.includes(p.name) ? 1 : 0;
      into[`r${i}`] = pic.rings.includes(p.name) ? 1 : 0;
      into[`b${i}`] = pic.stepBack.includes(p.name) || (p.rest && pic.stepBack.length) ? 1 : 0;
    });
    return into;
  };
  const hasReveal = gestures.some((g) => g.do === "reveal");
  const base = encode(foldPart({ variant, gestures, marks, upto: 0 }), { title: 0, furniture: 0, grown: 0, ink: 0, release: 0, source: 0 });
  gestures.forEach((_, k) => (base[`g${k}`] = 0));
  const establish = { ...base, title: 1 };
  const reference = { ...establish, title: 0, furniture: 1, grown: 1, ink: hasReveal ? 0 : 1 };
  const windows = { establish: { ...WINDOW.establish }, reference: { ...WINDOW.reference }, reveal: {}, subject: {}, conclusion: {}, hold: {} };
  const linear = new Set(["ink"]);
  const states = [establish, reference];
  const plan = [];
  let state = reference;

  gestures.forEach((g, k) => {
    const event = VIDEO_EVENTS[k];
    const own = g.marks.slice(0, g.marks.length - (Array.isArray(g.of) ? g.of.length : 0));
    const of = g.marks.slice(own.length);
    const field = `g${k}`;
    const next = encode(foldPart({ variant, gestures, marks, upto: k + 1 }), { ...state, [field]: 1 });
    if (g.do === "reveal") next.ink = 1;
    if (!ARRIVES.has(g.do)) linear.add(field);
    const item = { index: k, do: g.do, event, field, marks: own, of, note: g.note === undefined ? undefined : String(g.note) };
    if (g.do === "bracket") {
      const s = sum(own);
      item.members = own;
      item.steps = prefixSums(own.map((n) => valueOf.get(n)));
      item.share = s / (g.of === "whole" ? whole : s + sum(of));
    }
    if (g.do === "compare") {
      item.onto = own[0];
      item.value = own.length > 1 ? sum(own.slice(1)) : g.of === "whole" ? whole : sum(of);
    }
    if (g.do === "count") {
      const counted = own.length ? own : marks.map((m) => m.name);
      item.steps = prefixSums([...counted].sort((x, y) => valueOf.get(y) - valueOf.get(x)).map((n) => valueOf.get(n)));
    }
    // A pull-back before the conclusion with nothing to return from changes nothing in its event.
    if (g.do === "pull-back" && event !== "conclusion" && !parts.some((_, i) => state[`b${i}`] > 0))
      throw new GestureRefusal(`gestures[${k}]`, `pull-back has no filter to return from, so the ${event} would change nothing in the picture: drop it`, { remove: k });
    const changed = Object.keys(next).filter((key) => next[key] !== state[key]);
    const window = event === "conclusion" ? WINDOW.conclusion.gesture : WINDOW.gesture;
    for (const key of changed) windows[event][key] = window;
    if (event === "conclusion") {
      // THE CONCLUSION SHOWS THE WHOLE (doctrine rule 9): what is filtered returns, marked.
      const releases = [];
      parts.forEach((_, i) => {
        if (next[`b${i}`] > 0) {
          next[`b${i}`] = 0;
          releases.push(`b${i}`);
        }
      });
      if (releases.length) {
        next.release = 1;
        releases.push("release");
      }
      for (const key of releases) windows.conclusion[key] = WINDOW.conclusion.release;
      next.source = 1;
      windows.conclusion.source = WINDOW.conclusion.source;
    }
    plan.push(item);
    states.push(next);
    state = next;
  });
  states.push({ ...state });
  return { parts, rest, groups, states, windows, linear: [...linear], plan, whole };
}

/** A note's opacity: an arrival's note arrives with it; a measure's note lands by a cut once its motion has ended. */
const noteShown = (item, g) => (ARRIVES.has(item.do) ? g : g >= 1 ? 1 : 0);

/**
 * THE PICTURE AT ONE FRAME — pure arithmetic over build's props. Every part's shape is fixed (props.parts[i].shape);
 * what moves is its opacity (arrival, reveal, step-back), its accent and ring, each bracket's outline, each copy's
 * size (at the plate's one measure per unit), each caption's figure and note.
 */
export function partSceneAt(props, frame) {
  const f = (field) => fieldAt(props, field, frame);
  const grown = f("grown");
  const ink = f("ink");
  const n = props.parts.length;
  const g = props.plan.map((p) => f(p.field));
  const parts = props.parts.map((p, i) => {
    const shown = grown * (props.hasReveal ? moveOf(ink, p.rank, n) : 1);
    const back = f(`b${i}`);
    return { alpha: shown * (1 - 0.7 * back), shown, accent: f(`a${i}`), ring: f(`r${i}`), back };
  });
  const shapes = new Map(props.parts.map((p) => [p.name, p.shape]));
  const copies = props.plan
    .filter((p) => p.do === "compare" && g[p.index] > 0)
    .map((p) => {
      const onto = props.parts.find((x) => x.name === p.onto);
      return { index: p.index, shape: copyShape({ variant: props.variant, shapes, onto: p.onto, value: p.value * g[p.index], ontoValue: onto?.value ?? 0, box: props.box }) };
    })
    .filter((c) => c.shape);
  const outlines = props.outlines.map((o) => ({ ...o, opacity: g[o.item] }));
  const captions = props.captions.map((c) => {
    const item = props.plan[c.item];
    const progress = g[c.item];
    if (item.steps && item.stepTexts && (item.do === "count" || item.do === "bracket")) {
      const landed = landedOf(item, progress);
      const noted = progress >= 1;
      return { ...c, figure: !noted && landed > 0 ? item.stepTexts[landed - 1] : null, opacity: noted ? 1 : 0 };
    }
    return { ...c, figure: null, opacity: noteShown(item, progress) };
  });
  return { title: f("title"), furniture: f("furniture"), source: f("source"), parts, copies, outlines, captions };
}

/** Every text a climbing figure shows, for the runner to measure before anything is drawn. */
export const climbingTexts = (plan) => [...new Set(plan.flatMap((p) => p.stepTexts ?? []))];
