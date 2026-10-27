// The Time-series video scheduler (craft/gestures/GRAMMAR.md §5): three composed gestures placed into the six-event
// timing contract. `establish` (the title card) and `reference` (the axes, then the chart arriving on its scale) are
// the scheduler's; the gestures fill `reveal`, `subject` and `conclusion` in story order; the conclusion shows the
// whole chart — a zoom or a filter still active is released, a series not yet drawn is drawn to its end, what was
// shown stays marked — and brings the credit; `hold` repeats it.
//
// A state is a flat record of finite numbers (assertEventStates):
//   title, furniture, grown (the series' ink arriving), release, source
//   play   how far in time every series is drawn, 0..1 of the whole span (a reveal draws it)
//   lead   how far the traced series are drawn (a trace draws it) — both LINEAR in time, never eased
//          (no-ease-traversal-measured)
//   x0, x1 the time window on screen (a zoom narrows it; its factor is printed)
//   accent<i>, ring<i>, back<i> per drawn series; g<k> per gesture (its marks and words arriving)
//
// Refusals here are the grammar's "change" checks the core cannot make without the scheduled states: a reveal with
// everything already drawn, a trace that draws nothing new, an early pull-back with nothing to return from.
// Nothing here reads the data's shape. Browser-safe: no Node module.
import { GestureRefusal } from "./gesture-core.mjs";
import { VIDEO_EVENTS } from "./gesture-registry.mjs";
import { EVENTS } from "./gesture-video.mjs";

export { EVENTS };

/** Gestures whose own field draws along time or along a measured line (linear); every other arrives (eased). */
const LINEAR = new Set(["trace", "reveal", "compare", "bracket", "reference"]);

const WINDOW = {
  establish: { title: [-1, 0] },
  reference: { title: [0, 0.15], furniture: [0.1, 0.45], grown: [0.3, 0.9] },
  gesture: [0.08, 0.88],
  conclusion: { release: [0, 0.3], gesture: [0.28, 0.82], source: [0.82, 0.97] },
};

/**
 * @param items   pictureOf(model, valid).items — exactly three
 * @param accent  pictureOf's accent series
 * @param series  the drawn series, in the order the props carry them
 * @param t0, t1  the time span
 * @returns       { states, windows, linear, plan }
 */
export function scheduleTimeVideo({ items, accent, series, t0, t1 }) {
  if (items.length !== VIDEO_EVENTS.length)
    throw new GestureRefusal("gestures", `a video takes exactly ${VIDEO_EVENTS.length} gestures; this list has ${items.length}`, { remove: items.length - 1 });
  const at = new Map(series.map((s, i) => [s, i]));
  const hasReveal = items.some((it) => it.do === "reveal");
  const hasTrace = items.some((it) => it.do === "trace");
  const traced = [...new Set(items.filter((it) => it.do === "trace").flatMap((it) => it.traced ?? []))];
  const frac = (t) => (t1 === t0 ? 1 : Math.max(0, Math.min(1, (t - t0) / (t1 - t0))));

  const base = { title: 0, furniture: 0, grown: 0, release: 0, source: 0, play: hasReveal ? 0 : 1, lead: hasReveal || hasTrace ? 0 : 1, x0: t0, x1: t1 };
  series.forEach((_, i) => Object.assign(base, { [`accent${i}`]: 0, [`ring${i}`]: 0, [`back${i}`]: 0 }));
  items.forEach((_, k) => (base[`g${k}`] = 0));
  if (at.has(accent)) base[`accent${at.get(accent)}`] = 1;

  const establish = { ...base, title: 1 };
  const reference = { ...establish, title: 0, furniture: 1, grown: 1 };
  const windows = { establish: { ...WINDOW.establish }, reference: { ...WINDOW.reference }, reveal: {}, subject: {}, conclusion: {}, hold: {} };
  const linear = new Set(["play", "lead", "x0", "x1"]);
  const states = [establish, reference];
  const plan = [];
  let state = reference;

  items.forEach((it, k) => {
    const event = VIDEO_EVENTS[k];
    const field = `g${k}`;
    const next = { ...state, [field]: 1 };
    const unchanged = (what) => {
      if (event === "conclusion") return;
      throw new GestureRefusal(`gestures[${k}]`, `${it.do} ${what}, so the ${event} would change nothing in the picture: drop it`, { remove: k });
    };
    if (LINEAR.has(it.do)) linear.add(field);
    const item = { index: k, do: it.do, event, field };
    switch (it.do) {
      case "highlight":
        for (const s of it.accent ?? []) next[`accent${at.get(s)}`] = 1;
        for (const s of it.ring ?? []) next[`ring${at.get(s)}`] = 1;
        break;
      case "filter":
        series.forEach((s, i) => (next[`back${i}`] = (it.back ?? []).includes(s) ? 1 : 0));
        break;
      case "zoom":
        [next.x0, next.x1] = it.window;
        item.factor = it.factor;
        break;
      case "reveal":
        if (state.play >= 1) unchanged("finds every series already drawn");
        next.play = 1;
        if (!hasTrace) next.lead = 1;
        break;
      case "trace": {
        const to = frac(it.to);
        if (to <= state.lead + 1e-9) unchanged(`draws nothing past what is drawn (to ${it.to})`);
        next.lead = Math.max(state.lead, to);
        item.to = it.to;
        break;
      }
      case "pull-back": {
        const zoomed = state.x0 !== t0 || state.x1 !== t1;
        const filtered = series.some((_, i) => state[`back${i}`] > 0);
        if (!zoomed && !filtered) unchanged("has no zoom or filter to return from");
        next.x0 = t0;
        next.x1 = t1;
        series.forEach((_, i) => (next[`back${i}`] = 0));
        if (zoomed || filtered) next.release = 1;
        break;
      }
      default:
        // name, annotate, compare, bracket, reference: their marks and words arrive with g<k>.
        break;
    }
    const changed = Object.keys(next).filter((key) => next[key] !== state[key]);
    const own = event === "conclusion" ? WINDOW.conclusion.gesture : WINDOW.gesture;
    for (const key of changed) windows[event][key] = own;

    if (event === "conclusion") {
      // THE CONCLUSION SHOWS THE WHOLE CHART: the window returns, the stepped-back series return, every series is
      // drawn to its end; what the gestures marked stays marked.
      const releases = [];
      if (next.x0 !== t0 || next.x1 !== t1) {
        next.x0 = t0;
        next.x1 = t1;
        releases.push("x0", "x1");
      }
      series.forEach((_, i) => {
        if (next[`back${i}`] > 0) {
          next[`back${i}`] = 0;
          releases.push(`back${i}`);
        }
      });
      for (const f of ["play", "lead"]) if (next[f] < 1) (next[f] = 1), releases.push(f);
      if (releases.some((r) => r !== "play" && r !== "lead")) (next.release = 1), releases.push("release");
      for (const key of releases) windows.conclusion[key] ??= WINDOW.conclusion.release;
      next.source = 1;
      windows.conclusion.source = WINDOW.conclusion.source;
    }
    plan.push(item);
    states.push(next);
    state = next;
  });
  states.push({ ...state });
  return { states, windows, linear: [...linear], plan };
}
