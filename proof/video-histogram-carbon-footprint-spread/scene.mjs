// THE PICTURE AT ONE FRAME — pure arithmetic, run by the composition in Chrome and by the tests in Bun. Browser-safe.
//
// THE ARGUMENT, every length on one count scale from zero so a bin keeps its length as it travels:
//   - RUG: a tick per country along the tonnes axis, swept from 0 to 36+ at the data's pace.
//   - FALL: every tick widens into one cell of its bin and stacks, cell j of every bin landing at the same moment — the bins
//     rise at one pace, each stopping at its count. A bin's landed cells are always its bottom ones, drawn as one bar.
//   - STACK: the tail's bins, in order, rise in their slot to the top of the column on the 4–8 bin, then slide across onto
//     it — nothing crosses anything (every bin they pass over is lower than the column). The column's count is its landed
//     height; the count rises ahead of an incoming bin so the bin slides in under it. Played backwards at conclusion.
//   - TENTHS: seams of the ground cut both columns at every tenth of the 213.

import { EVENT_ORDER, progressOf } from "#shared/chart-video/timing.ts";
import { clamp01, ease } from "../../skills/scrolly/assets/reveal.mjs";

export const WINDOWS = Object.freeze({
  establish: { title: [-1, 0] },
  reference: { title: [0, 0.12], furniture: [0.05, 0.4], rug: [0.15, 0.95] },
  reveal: { counts: [0, 0.3], fall: [0.02, 0.97] },
  subject: { rule: [0, 0.15], stack: [0.12, 0.8], tailLabel: [0.12, 0.25], tenths: [0.8, 0.97] },
  conclusion: { tenths: [0, 0.2], tailLabel: [0, 0.2], stack: [0.2, 0.85], source: [0.4, 0.9] },
});
/** Traversals of a measured axis run at the data's pace: the sweep along tonnes, the cells counted up. */
const LINEAR = new Set(["rug", "fall"]);
/** Each cell's fall is this share of `fall`. */
export const FALL = 0.15;
/** Within a cell's fall, the share spent widening from its tick into a cell on the zero line before it rises. */
export const WIDEN = 0.35;
/** Each tail bin's move is this share of `stack`; the moves overlap. */
export const MOVE = 0.4;
/** Within a bin's move, the share spent rising in its slot before it slides across. */
export const RISE = 0.45;
/** The sweep's soft edge, as a share of the axis. */
const EDGE = 0.04;

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

const lerp = (a, b, t) => a + (b - a) * t;
export const moveOf = (t, k, n) => clamp01((t - (n > 1 ? (k / (n - 1)) * (1 - MOVE) : 0)) / MOVE);
/** A cell's fall: the j-th cell of every bin starts at the same moment. */
export const fallOf = (t, j, most) => clamp01((t - (most > 1 ? (j / (most - 1)) * (1 - FALL) : 0)) / FALL);

/**
 * @param {{ states: any[], timing: any, baseline: number, unit: number, barW: number, plot: { left: number, right: number },
 *   rug: { h: number, w: number },
 *   bins: Array<{ x: number, count: number }>,
 *   countries: Array<{ bin: number, j: number, tickX: number }>,
 *   tail: { moving: number[], base: number[] } }} props
 */
export function sceneAt(props, frame) {
  const at = (f) => fieldAt(f, frame, props.states, props.timing);
  const yOf = (v) => props.baseline - v * props.unit;
  const rug = at("rug");
  const fall = at("fall");
  const most = Math.max(...props.bins.map((b) => b.count));
  const span = props.plot.right - props.plot.left;

  const landed = props.bins.map(() => 0);
  const cells = [];
  for (const c of props.countries) {
    const p = fallOf(fall, c.j, most);
    if (p >= 1) {
      landed[c.bin] += 1;
      continue;
    }
    const widen = ease(clamp01(p / WIDEN));
    const rise = ease(clamp01((p - WIDEN) / (1 - WIDEN)));
    const bin = props.bins[c.bin];
    const from = { x: c.tickX - props.rug.w / 2, y: props.baseline - props.rug.h, w: props.rug.w, h: props.rug.h };
    const h = lerp(from.h, props.unit, widen);
    const frac = (c.tickX - props.plot.left) / span;
    cells.push({ x: lerp(from.x, bin.x, widen), y: lerp(props.baseline - h, yOf(c.j + 1), rise), w: lerp(from.w, props.barW, widen), h, opacity: clamp01((rug * (1 + EDGE) - frac) / EDGE) });
  }

  const stack = at("stack");
  const n = props.tail.moving.length;
  const bars = props.bins.map((bin, i) => ({ x: bin.x, y: yOf(landed[i]), h: landed[i] * props.unit, rise: 0, across: 0 }));
  let top = props.tail.base[props.tail.moving[0]];
  let count = top;
  props.tail.moving.forEach((i, k) => {
    const p = moveOf(stack, k, n);
    const rise = ease(clamp01(p / RISE));
    const across = ease(clamp01((p - RISE) / (1 - RISE)));
    const bin = props.bins[i];
    const lo = lerp(0, props.tail.base[i], rise);
    bars[i] = { ...bars[i], x: lerp(bin.x, props.bins[1].x, across), y: yOf(lo + landed[i]), rise, across };
    top += bin.count * rise;
    if (across >= 1) count += bin.count;
  });

  const rule = at("rule");
  return {
    title: at("title"),
    furniture: at("furniture"),
    counts: at("counts"),
    cells,
    bars,
    rule,
    share: clamp01((rule - 0.4) / 0.6),
    tail: { top, key: String(count), opacity: at("tailLabel") },
    tenths: at("tenths"),
    source: at("source"),
  };
}
