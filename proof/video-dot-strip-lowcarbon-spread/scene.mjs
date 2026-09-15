// THE PICTURE AT ONE FRAME — pure arithmetic, run by the composition in Chrome and by the tests in Bun. Browser-safe.
//
//   - TRAVEL: floor first, in the order of 2000, a copy of each chip leaves its pin and travels to its 2024 seat (two dates:
//     an arrival, eased); its leader is drawn behind it as far as it has gone; its stem arrives as it lands.
//   - FOCUS: the other fourteen step back; Poland's and Sweden's leaders thicken. CHANGES: their two figures arrive.
//   - SPAN: the 2000 span traces along its rail from Poland to Sweden — a measured axis, linear.
//   - DROP: a copy of the span slides down onto the 2024 rail, pinned to Sweden's 2024 share — a translation, so its length
//     never changes. CUT: the part past Poland's 2024 pin turns to the guide tone, its figure over it.
//   - SETTLE: the overhang and its figure fold away; the fourteen come back to full ink.

import { EVENT_ORDER, progressOf } from "#shared/chart-video/timing.ts";
import { clamp01, ease } from "../../skills/scrolly/assets/reveal.mjs";

export const WINDOWS = Object.freeze({
  establish: { title: [-1, 0] },
  reference: { title: [0, 0.2], furniture: [0.05, 0.6] },
  reveal: { travel: [0, 0.95] },
  subject: { focus: [0, 0.2], changes: [0.08, 0.28], span: [0.28, 0.48], drop: [0.5, 0.78], cut: [0.8, 1] },
  conclusion: { settle: [0, 0.6], source: [0.3, 0.75] },
});
const LINEAR = new Set(["travel", "span"]);
/** Of the travel, the share one chip's own move takes. */
export const MOVE = 0.3;
/** How far a stepped-back mark fades. */
export const STEP_BACK = 0.72;

const windowed = (frame, timing, event, [a, b]) => clamp01((progressOf(frame, timing[event]) - a) / (b - a));
export function fieldAt(field, frame, states, timing) {
  let value = 0;
  EVENT_ORDER.forEach((event, i) => {
    const before = i === 0 ? 0 : states[i - 1][field];
    const delta = states[i][field] - before;
    if (delta === 0) return;
    const t = windowed(frame, timing, event, WINDOWS[event]?.[field] ?? [0, 1]);
    value += delta * (LINEAR.has(field) ? t : ease(t));
  });
  return value;
}

export const moveOf = (t, k, n, share = MOVE) => clamp01((t - (n > 1 ? (k / (n - 1)) * (1 - share) : 0)) / share);
/** A move has landed at 1 — floating point leaves the last one a hair short of it. */
const LANDED = 1 - 1e-9;
const landed = (t) => (t >= LANDED ? 1 : t);

/**
 * @param {{ states: any[], timing: any, chipH: number, strips: Array<{ rail: number }>,
 *   spans: { before: { x0: number, x1: number }, dx: number },
 *   marks: Array<{ rank: number, focus: boolean, a: { x: number, chipY: number }, b: { x: number, chipY: number },
 *     leader: { x0: number, y0: number, x1: number, y1: number } }> }} props
 */
export function sceneAt(props, frame) {
  const at = (f) => fieldAt(f, frame, props.states, props.timing);
  const travel = at("travel");
  const focus = at("focus");
  const settle = at("settle");
  const drop = landed(at("drop"));
  const cut = at("cut");
  const n = props.marks.length;
  const marks = props.marks.map((m) => {
    const raw = landed(moveOf(travel, m.rank, n));
    const e = ease(raw);
    const copy = raw === 1 ? { x: m.b.x, y: m.b.chipY, on: 1 } : { x: m.a.x + (m.b.x - m.a.x) * e, y: m.a.chipY + (m.b.chipY - m.a.chipY) * e, on: raw > 0 ? 1 : 0 };
    const { x0, y0, x1, y1 } = m.leader;
    const u = raw === 1 ? 1 : clamp01((copy.y + props.chipH / 2 - y0) / (y1 - y0));
    return {
      copy,
      leaderEnd: { x: x0 + (x1 - x0) * u, y: y0 + (y1 - y0) * u },
      drawn: raw > 0 && u > 0 ? 1 : 0,
      arrived: clamp01((raw - 0.85) / 0.15),
      dim: m.focus ? 0 : STEP_BACK * focus * (1 - settle),
    };
  });
  const [upper, lower] = props.strips;
  const { before, dx } = props.spans;
  const on = drop > 0 ? 1 : 0;
  return {
    title: at("title"),
    furniture: at("furniture"),
    marks,
    emphasis: focus,
    changes: at("changes"),
    span: at("span"),
    copy: { x0: before.x0 + dx * drop, x1: before.x1 + dx * drop, y: drop === 1 ? lower.rail : upper.rail + (lower.rail - upper.rail) * drop, on },
    turn: cut,
    overhang: on * (1 - settle),
    cutLabel: cut * (1 - settle),
    source: at("source"),
  };
}
