// THE PICTURE AT ONE FRAME — pure arithmetic, run by the composition in Chrome and by the tests in Bun. Browser-safe.
//
//   - RISE: the bars from the tenth to the second grow one after another, each eased (an arrival), its value counting with
//     its length; the first grows last, on its own field.
//   - STACK: the next five leave their rows one after another, the largest first, and line up end to end along the second
//     row, each block landing after the one before; their sum counts the blocks landed; the bars after them step back.

import { EVENT_ORDER, progressOf } from "#shared/chart-video/timing.ts";
import { clamp01, ease } from "../../skills/scrolly/assets/reveal.mjs";

export const WINDOWS = Object.freeze({
  establish: { title: [-1, 0] },
  reference: { title: [0, 0.2], furniture: [0.25, 0.8] },
  reveal: { rise: [0.02, 0.68], first: [0.72, 0.95] },
  subject: { stack: [0.05, 0.9] },
  conclusion: { source: [0, 0.6] },
});
const LINEAR = new Set(["rise", "stack"]);
/** Of the rise, and of the stack, the share one column's own move takes. */
export const MOVE = 0.3;

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

/** How far the `k`-th of `n` staggered moves has gone when the whole is at `t`. */
export const moveOf = (t, k, n) => clamp01((t - (n > 1 ? (k / (n - 1)) * (1 - MOVE) : 0)) / MOVE);

/** A count's text at `v`: one decimal from 1, two under — at one decimal the ninth and tenth would both print 0,6. */
export const valueText = (v) => (v >= 0.995 ? v.toFixed(1) : v.toFixed(2)).replace(".", ",");

/**
 * @param {{ states: any[], timing: any, left: number, unit: number, seam: number, pileY: number,
 *   bars: Array<{ value: number, y: number, stacked: number|null, before: number }> }} props
 *   `stacked`: the bar's place along the pile (0 first) or null; `before`: the values ahead of it along the pile.
 */
export function sceneAt(props, frame) {
  const at = (f) => fieldAt(f, frame, props.states, props.timing);
  const rise = at("rise");
  const first = at("first");
  const stack = at("stack");
  const n = props.bars.length;
  const piled = props.bars.filter((b) => b.stacked !== null).length;
  let landed = 0;
  let sum = 0;
  const bars = props.bars.map((b, i) => {
    // The first bar grows on its own field; the others from the last to the second.
    const up = ease(i === 0 ? first : moveOf(rise, n - 1 - i, n - 1));
    const w = b.value * props.unit * up;
    let x = props.left;
    let y = b.y;
    let move = 0;
    if (b.stacked !== null) {
      const raw = moveOf(stack, b.stacked, piled);
      move = ease(raw);
      if (raw >= 1) {
        landed += 1;
        sum += b.value;
      }
      x = props.left + b.before * props.unit * move;
      y = b.y + (props.pileY - b.y) * move;
    }
    /** A block after the first along the pile gives its start a seam of the ground, so the pile reads as five countries
     *  and still ends exactly at their sum. */
    const seam = b.stacked ? props.seam * move : 0;
    return { x: x + seam, y, w: Math.max(0, w - seam), count: b.value * up, up, move };
  });
  return {
    title: at("title"),
    furniture: at("furniture"),
    bars,
    /** The bars after the pile step back as the first block leaves. */
    stepBack: ease(clamp01(stack / MOVE)),
    landed,
    sum,
    stacking: clamp01(stack / 0.05),
    source: at("source"),
  };
}
