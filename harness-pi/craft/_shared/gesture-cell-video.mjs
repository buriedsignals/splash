// The Cell-grid video scheduler (craft/gestures/GRAMMAR.md §5): three composed gestures placed into the six-event
// timing contract. `establish` (the title card) and `reference` (the grid arriving with its key) are the scheduler's;
// the gestures fill `reveal`, `subject` and `conclusion` in story order; the conclusion shows the whole grid — a filter
// still on is released there, what was shown stays marked — and brings the credit; `hold` repeats it.
//
// A state is a flat record of finite numbers (`assertEventStates`): `title`, `furniture`, `ink` (a reveal's progress
// through the cells in reading order), `release`, `source`, per gesture `g<k>` (its marks arriving), per filter `f<k>`
// (its step back), per row `slot<r>` (a reorder moving rows). The time half — a field's value at a frame — is the bar
// video's (`fieldAt` in ./gesture-video.mjs), so the frame, the runner and the tests read one arithmetic.
// Browser-safe: no Node module, no `#shared` import.
import { GestureRefusal } from "./gesture-core.mjs";
import { EVENTS, fieldAt } from "./gesture-video.mjs";

export { EVENTS, fieldAt };

const WINDOW = {
  establish: { title: [-1, 0] },
  reference: { title: [0, 0.15], furniture: [0.1, 0.45], ink: [0.25, 0.9] },
  gesture: [0.08, 0.88],
  conclusion: { release: [0, 0.3], gesture: [0.28, 0.82], source: [0.82, 0.97] },
};
const VIDEO_EVENTS = ["reveal", "subject", "conclusion"];

/**
 * @param plan, orders  planCells' output (exactly three gestures: the core refuses any other count for video)
 * @param grid          gridOf's output
 * @returns { states, windows, linear, events: [event of gesture k] }
 */
export function scheduleCellVideo({ plan, orders, grid }) {
  if (plan.length !== VIDEO_EVENTS.length)
    throw new GestureRefusal("gestures", `a video takes exactly ${VIDEO_EVENTS.length} gestures; this list has ${plan.length}`, { remove: plan.length - 1 });
  const hasReveal = plan.some((p) => p.do === "reveal");
  const base = { title: 0, furniture: 0, ink: 0, release: 0, source: 0 };
  grid.rows.forEach((_, r) => (base[`slot${r}`] = r));
  plan.forEach((p, k) => {
    base[`g${k}`] = 0;
    if (p.do === "filter") base[`f${k}`] = 0;
  });
  const establish = { ...base, title: 1 };
  const reference = { ...base, furniture: 1, ink: hasReveal ? 0 : 1 };
  const windows = { establish: { ...WINDOW.establish }, reference: { ...WINDOW.reference }, reveal: {}, subject: {}, conclusion: {}, hold: {} };
  const linear = new Set(["ink", ...grid.rows.map((_, r) => `slot${r}`)]);
  const states = [establish, reference];
  let state = reference;
  plan.forEach((p, k) => {
    const event = VIDEO_EVENTS[k];
    const next = { ...state, [`g${k}`]: 1 };
    if (p.do === "reveal") next.ink = 1;
    if (p.do === "filter") next[`f${k}`] = 1;
    if (p.do === "reorder") orders[k].forEach((r, s) => (next[`slot${r}`] = s));
    if (p.do === "pull-back") {
      const filtered = plan.some((q, j) => q.do === "filter" && j < k && state[`f${j}`] > 0);
      if (!filtered && event !== "conclusion")
        throw new GestureRefusal(`gestures[${k}]`, `pull-back has no filter to return from, so the ${event} would change nothing in the picture: drop it`, { remove: k });
      plan.forEach((q, j) => q.do === "filter" && j < k && (next[`f${j}`] = 0));
    }
    const own = event === "conclusion" ? WINDOW.conclusion.gesture : WINDOW.gesture;
    for (const key of Object.keys(next)) if (next[key] !== state[key]) windows[event][key] = own;
    if (event === "conclusion") {
      // THE CONCLUSION SHOWS THE WHOLE GRID (doctrine rule 9): a filter still on returns, its gesture still marked.
      const releases = plan.map((q, j) => (q.do === "filter" && next[`f${j}`] > 0 ? `f${j}` : null)).filter(Boolean);
      for (const key of releases) {
        next[key] = 0;
        windows.conclusion[key] = WINDOW.conclusion.release;
      }
      if (releases.length) {
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
  return { states, windows, linear: [...linear], events: [...VIDEO_EVENTS] };
}

const clamp01 = (t) => (t < 0 ? 0 : t > 1 ? 1 : t);

/**
 * The picture at one frame — pure arithmetic over the build's props, run by the composition in Chrome and by the
 * runner in Bun: row offsets (a reorder), each cell's opacity (a reveal's stagger, a filter's step back), each
 * gesture's marks' opacity, the title card and the credit.
 */
export function cellSceneAt(props, frame) {
  const f = (field) => fieldAt(props, field, frame);
  const ink = f("ink");
  const n = props.cells.length;
  const slots = props.rowLabels.map((_, r) => f(`slot${r}`));
  const filters = props.filters.map((x) => ({ kept: new Set(x.kept), on: f(`f${x.k}`) }));
  const cells = props.cells.map((c) => {
    let back = 0;
    for (const x of filters) if (!x.kept.has(c.id)) back = Math.max(back, x.on);
    const shown = props.hasReveal ? clamp01(ink * n - props.order[c.id]) : clamp01(ink);
    return shown * (1 - 0.72 * back);
  });
  return {
    title: f("title"),
    furniture: f("furniture"),
    source: f("source"),
    slots,
    cells,
    g: props.plan.map((_, k) => clamp01(f(`g${k}`))),
  };
}
