// THE PICTURE AT ONE FRAME — pure arithmetic, run by the composition in Chrome and by the tests in Bun. Browser-safe.
//
//   - TRAVEL: row by row, top to bottom in the order of 2000, each dot travels to 2023 (two dates: an arrival, eased), the
//     gain drawn behind it; the rises are counted as the dots land.
//   - REORDER: the rows glide from the order of their 2000 level to the order of their gains (eased, all together); every
//     other name dims while they cross, Poland's does not.
//   - DETACH: one after another in the order of the gains, a copy of each gain slides left onto the common start — a
//     translation, so its length never changes; its dumbbell steps back as it leaves; its gain is written as it lands.
//   - RING: Poland's row ringed.
//   - SETTLE: in the same order, the copies slide back onto their dumbbells, which return to full ink as each lands.

import { EVENT_ORDER, progressOf } from "#shared/chart-video/timing.ts";
import { clamp01, ease } from "../../skills/scrolly/assets/reveal.mjs";

export const WINDOWS = Object.freeze({
  establish: { title: [-1, 0] },
  reference: { title: [0, 0.2], furniture: [0.05, 0.6] },
  reveal: { travel: [0, 0.95] },
  subject: { reorder: [0, 0.28], detach: [0.3, 0.84], ring: [0.82, 1] },
  conclusion: { settle: [0, 0.6], source: [0.3, 0.75] },
});
const LINEAR = new Set(["travel", "detach", "settle"]);
/** Of the travel, the share one dot's own move takes; of the detach and the settle, one copy's. */
export const MOVE = 0.3;
export const SLIDE = 0.28;

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
 * @param {{ states: any[], timing: any, slots: number[], start: number,
 *   rows: Array<{ key: string, subject: boolean, levelRank: number, gainRank: number, a: { x: number }, b: { x: number } }> }} props
 *   `slots`: the rows' centres, top to bottom; `start`: the x every copy lands on.
 */
export function sceneAt(props, frame) {
  const at = (f) => fieldAt(f, frame, props.states, props.timing);
  const travel = at("travel");
  const reorder = at("reorder");
  const detach = at("detach");
  const settle = at("settle");
  const n = props.rows.length;
  let rose = 0;
  const rows = props.rows.map((r) => {
    const raw = landed(moveOf(travel, r.levelRank, n));
    if (raw === 1) rose += 1;
    const out = landed(moveOf(detach, r.gainRank, n, SLIDE));
    const back = landed(moveOf(settle, r.gainRank, n, SLIDE));
    const shift = (props.start - r.a.x) * (ease(out) - ease(back));
    const from = props.slots[r.levelRank];
    const to = props.slots[r.gainRank];
    return {
      y: from * (1 - reorder) + to * reorder,
      dotX: raw === 1 ? r.b.x : r.a.x + (r.b.x - r.a.x) * ease(raw),
      travelled: raw > 0 ? 1 : 0,
      arrived: clamp01((raw - 0.85) / 0.15),
      copy: { x0: r.a.x + shift, x1: r.b.x + shift, on: out > 0 && back < 1 ? 1 : 0 },
      stepBack: ease(clamp01(out / 0.3)) * (1 - ease(back)),
      gainShown: out === 1 ? 1 : clamp01((out - 0.8) / 0.2),
      // While the rows cross, the other names dim so Poland's, climbing through them, is the one read.
      nameDim: !r.subject && reorder < 1 ? 0.8 * Math.sin(Math.PI * reorder) : 0,
    };
  });
  return {
    title: at("title"),
    furniture: at("furniture"),
    rows,
    rose,
    counter: travel > 0 ? 1 - reorder : 0,
    later: clamp01(travel / 0.1),
    guide: ease(clamp01(detach / 0.1)) * (1 - ease(clamp01(settle / 0.4))),
    ring: at("ring"),
    source: at("source"),
  };
}
