// THE PICTURE AT ONE FRAME — pure arithmetic, run by the composition in Chrome and by the tests in Bun. Browser-safe.
//
// THE ARGUMENT, every length on one scale so a bar keeps its length as it travels:
//   - WORLD: the world's emissions grow as one bar across the top row; the ten largest are marked inside it, end to end.
//   - DROP: the ten fall out of the world into their rows, the largest first, each keeping its length; what stays up is the
//     rest of the world.
//   - CAMERA: the scale closes geometrically from the world's to the first bar's, the rest of the world running out of the
//     frame; every count stands past its bar's end.
//   - STACK: the next five leave their rows one after another and line up end to end under the first, their sum counting.
//   - TENTH: the tenth slides into the gap between the five's end and the first's — and fits.
//   - BACK: every bar returns to its own row — the whole ranking as the last picture — the five bracketed with their sum.

import { EVENT_ORDER, progressOf } from "#shared/chart-video/timing.ts";
import { clamp01, ease } from "../../skills/scrolly/assets/reveal.mjs";

export const WINDOWS = Object.freeze({
  establish: { title: [-1, 0] },
  reference: { title: [0, 0.15], furniture: [0.1, 0.4], world: [0.2, 0.9] },
  reveal: { drop: [0, 0.62], camera: [0.7, 0.98] },
  subject: { stack: [0.05, 0.9] },
  conclusion: { tenth: [0.04, 0.34], back: [0.5, 0.8], source: [0.78, 0.95] },
});
const LINEAR = new Set(["drop", "stack"]);
/** Of the drop, and of the stack, the share one bar's own move takes. */
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

const lerp = (a, b, t) => a + (b - a) * t;

/**
 * @param {{ states: any[], timing: any, left: number, units: { world: number, ten: number }, seam: number,
 *   world: number, worldY: number, pileY: number, gapY: number,
 *   bars: Array<{ value: number, y: number, inWorld: number, stacked: number|null, before: number, tenth: boolean }> }} props
 *   `inWorld`: the values ahead of the bar inside the world bar; `stacked`: its place along the pile or null; `before`: the
 *   values ahead of it along the pile.
 */
export function sceneAt(props, frame) {
  const at = (f) => fieldAt(f, frame, props.states, props.timing);
  const world = at("world");
  const drop = at("drop");
  const camera = at("camera");
  const stack = at("stack");
  const tenth = at("tenth");
  const back = at("back");
  const unit = props.units.world * (props.units.ten / props.units.world) ** camera;
  const n = props.bars.length;
  const piled = props.bars.filter((b) => b.stacked !== null).length;
  const combined = props.bars.filter((b) => b.stacked !== null).reduce((s, b) => s + b.value, 0);
  let landed = 0;
  let sum = 0;
  const bars = props.bars.map((b, i) => {
    const fall = ease(moveOf(drop, i, n));
    // Inside the world bar, a bar shows as far as the world has grown.
    const grown = clamp01((world * props.world - b.inWorld) / b.value);
    let x = props.left + lerp(b.inWorld, 0, fall) * unit;
    let y = lerp(props.worldY, b.y, fall);
    let move = 0;
    if (b.stacked !== null) {
      const raw = moveOf(stack, b.stacked, piled);
      move = ease(raw);
      if (raw >= 1) {
        landed += 1;
        sum += b.value;
      }
      x = lerp(x, props.left + b.before * unit, move);
      y = lerp(y, props.pileY, move);
    }
    let slide = 0;
    if (b.tenth) {
      slide = ease(tenth);
      x = lerp(x, props.left + combined * unit, slide);
      y = lerp(y, props.gapY, slide);
    }
    // Back to its own row: the pile and the gap undone, the length kept.
    if (b.stacked !== null || b.tenth) {
      x = lerp(x, props.left, back);
      y = lerp(y, b.y, back);
    }
    const seam = (b.stacked ? props.seam * move : slide > 0 ? props.seam * slide : 0) * (1 - back);
    return { x: x + seam, y, w: Math.max(0, b.value * unit * (fall > 0 ? 1 : grown) - seam), fall, landed: fall >= 1 ? 1 : 0, move: move * (1 - back), slide: slide * (1 - back) };
  });
  const tenSum = props.bars.reduce((s, b) => s + b.value, 0);
  return {
    title: at("title"),
    furniture: at("furniture"),
    unit,
    camera,
    world: { w: props.world * unit * world, restX: props.left + tenSum * unit, restW: Math.max(0, (props.world * world - tenSum) * unit), shown: world },
    bars,
    stepBack: ease(clamp01(stack / MOVE)),
    landed,
    sum,
    stacking: clamp01(stack / 0.05),
    sumShown: 1 - ease(clamp01(tenth * 4)),
    tenth: tenth * (1 - back),
    back,
    bracket: clamp01((back - 0.8) / 0.2),
    source: at("source"),
  };
}
