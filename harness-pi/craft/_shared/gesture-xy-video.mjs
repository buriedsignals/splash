// The XY video scheduler (craft/gestures/GRAMMAR.md §5): three composed gestures placed into the six-event timing
// contract. `establish` (the title card) and `reference` (the plot arriving on its two axes, the points appearing)
// are the scheduler's; the gestures fill `reveal`, `subject` and `conclusion` in story order; the conclusion shows the
// whole chart — a zoom or filter still active is released there, what was shown stays marked — and brings the credit;
// `hold` repeats it. A state is a flat record of finite numbers (`assertEventStates`): title, furniture, grown, ink
// (a reveal's progress), release, source, and g0…g2 (each gesture's own progress). What a gesture DOES at a given
// progress is the family's `pictureAt` over the plan, so the frame, the runner and the tests read one arithmetic.
//
// Motion along a measured axis (a zoom's window, a trace along its path, a reveal) is linear; arrivals (a colour, a
// ring, a note) are eased. Browser-safe: the Remotion bundle imports it (with ./gesture-family-xy.mjs beside it).
import { GestureRefusal } from "./gesture-core.mjs";
import { VIDEO_EVENTS } from "./gesture-registry.mjs";
import { createXY, pictureAt, planXY } from "./gesture-family-xy.mjs";

export const EVENTS = ["establish", "reference", "reveal", "subject", "conclusion", "hold"];
const clamp01 = (t) => (t < 0 ? 0 : t > 1 ? 1 : t);
const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);
const LINEAR = new Set(["zoom", "trace", "reveal"]);
const WINDOW = {
  reference: { furniture: [0.05, 0.4], grown: [0.25, 0.9] },
  gesture: [0.08, 0.88],
  conclusion: { release: [0, 0.3], gesture: [0.28, 0.82], source: [0.82, 0.97] },
};

/**
 * @param gestures validateGestures' list (family "xy", format "video": exactly three)
 * @param xy       the adapter
 * @returns        { plan, accentMark, states, windows, linear }
 */
export function scheduleVideoXY({ gestures, xy }) {
  if (gestures.length !== VIDEO_EVENTS.length)
    throw new GestureRefusal("gestures", `a video takes exactly ${VIDEO_EVENTS.length} gestures; this list has ${gestures.length}`, { remove: gestures.length - 1 });
  const { plan, accentMark } = planXY({ gestures, xy });
  plan.forEach((p, k) => {
    const event = VIDEO_EVENTS[k];
    // A pull-back before the conclusion with nothing to return from changes nothing (the conclusion always returns).
    if (p.do === "pull-back" && !p.release && event !== "conclusion")
      throw new GestureRefusal(`gestures[${k}]`, `pull-back has no zoom or filter to return from, so the ${event} would change nothing: drop it, or move it to the conclusion`, { remove: k });
  });
  const hasReveal = plan.some((p) => p.do === "reveal");
  const base = { title: 0, furniture: 0, grown: 0, ink: hasReveal ? 0 : 1, release: 0, source: 0, g0: 0, g1: 0, g2: 0 };
  const establish = { ...base, title: 1 };
  const reference = { ...establish, title: 0, furniture: 1, grown: 1 };
  const windows = { establish: {}, reference: { ...WINDOW.reference, title: [0, 0.15] }, reveal: {}, subject: {}, conclusion: {}, hold: {} };
  const linear = new Set(["ink"]);
  const states = [establish, reference];
  let state = reference;
  plan.forEach((p, k) => {
    const event = VIDEO_EVENTS[k];
    const next = { ...state, [`g${k}`]: 1 };
    if (p.do === "reveal") next.ink = 1;
    if (LINEAR.has(p.do)) linear.add(`g${k}`);
    const own = event === "conclusion" ? WINDOW.conclusion.gesture : WINDOW.gesture;
    windows[event][`g${k}`] = own;
    if (p.do === "reveal") windows[event].ink = own;
    if (event === "conclusion") {
      // THE CONCLUSION SHOWS THE WHOLE CHART (doctrine rule 9): what is still zoomed or filtered returns, marked.
      const before = pictureAt({ plan, accentMark, xy, on: { 0: 1, 1: 1, 2: 1 } });
      const off = before.dom.x[0] !== xy.full.x[0] || before.dom.x[1] !== xy.full.x[1] || before.dom.y[0] !== xy.full.y[0] || before.dom.y[1] !== xy.full.y[1] || [...before.back.values()].some((t) => t > 0);
      if (off) {
        next.release = 1;
        windows.conclusion.release = WINDOW.conclusion.release;
      }
      next.source = 1;
      windows.conclusion.source = WINDOW.conclusion.source;
    }
    states.push(next);
    state = next;
  });
  states.push({ ...state });
  return { plan, accentMark, states, windows, linear: [...linear] };
}

// ── time ──────────────────────────────────────────────────────────────────────────────────────────

export function progressOf(frame, event) {
  if (event.duration <= 0) return frame >= event.start ? 1 : 0;
  return Math.max(0, Math.min(1, (frame - event.start) / event.duration));
}

/** A field's value at a frame: each event's change, moved over its window, linear or eased. */
export function fieldAt(props, field, frame) {
  const { states, windows, timing } = props;
  const straight = props.linear.includes(field);
  let value = states[0][field];
  for (let i = 1; i < EVENTS.length; i++) {
    const delta = states[i][field] - states[i - 1][field];
    if (delta === 0) continue;
    const [a, b] = windows[EVENTS[i]]?.[field] ?? [0, 1];
    const t = clamp01((progressOf(frame, timing[EVENTS[i]]) - a) / (b - a));
    value += delta * (straight ? t : ease(t));
  }
  return value;
}

/** The adapter the frame draws with, rebuilt from the props (functions do not travel through JSON). */
const adapters = new WeakMap();
export function adapterOf(props) {
  if (!adapters.has(props.marks)) adapters.set(props.marks, createXY({ marks: props.marks, variant: props.variant, xLog: props.xLog, extra: props.extra }));
  return adapters.get(props.marks);
}

/**
 * The picture at one frame, for the frame component and the runner: the family picture at the gestures' progress
 * (zoom and release blended), each mark's visibility (a reveal, the points' arrival), the traced paths' progress.
 */
export function sceneAt(props, frame) {
  const xy = adapterOf(props);
  const f = (field) => fieldAt(props, field, frame);
  const on = { 0: f("g0"), 1: f("g1"), 2: f("g2") };
  const picture = pictureAt({ plan: props.plan, accentMark: props.accentMark, xy, on, release: f("release") });
  const ink = f("ink");
  const grown = f("grown");
  const order = props.revealOrder;
  const n = order.length;
  // A reveal shows the entities one by one in their natural order (x for a cloud, the paths' heads for a connected
  // scatter); without one, every point arrives with the plot.
  const shownOf = new Map(order.map((name, i) => [name, props.hasReveal ? clamp01((ink * n - i) / 1) : grown]));
  return {
    title: f("title"),
    furniture: f("furniture"),
    source: f("source"),
    grown,
    picture,
    shown: (name) => shownOf.get(xy.pathOf(name).at(-1)) ?? grown,
    traced: picture.traced,
    xy,
  };
}
