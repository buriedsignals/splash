// THE PICTURE AT ONE FRAME — pure arithmetic, run by the composition in Chrome and by the tests in Bun. Browser-safe.
//
//   - THE HUNDRED: circle k (largest first) arrives when the rank reveal passes k, easing its own arrival; the count is
//     the circles arrived — the composition picks the text Bun measured for that many.
//   - THE REST: every other station at once, faint.

import { EVENT_ORDER, progressOf } from "#shared/chart-video/timing.ts";
import { clamp01, ease } from "../../skills/scrolly/assets/reveal.mjs";

export const WINDOWS = Object.freeze({
  establish: { title: [-1, 0] },
  reference: { title: [0, 0.2], furniture: [0.25, 0.7] },
  reveal: { top: [0.02, 0.9] },
  subject: { rest: [0, 0.45] },
  conclusion: { source: [0, 0.4] },
});
const LINEAR = new Set(["top"]);

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

/** @param {{ states: any[], timing: any, top: Array<unknown> }} props */
export function sceneAt(props, frame) {
  const at = (f) => fieldAt(f, frame, props.states, props.timing);
  const top = at("top");
  const n = props.top.length;
  // Each circle's arrival takes two ranks' worth of the reveal, and the last has fully arrived when the reveal ends.
  const circles = Array.from({ length: n }, (_, k) => ease(clamp01((top * (n + 2) - k - 2) / 2)));
  const arrived = circles.filter((t) => t >= 1).length;
  return { title: at("title"), furniture: at("furniture"), circles, arrived: top >= 1 ? n : arrived, rest: at("rest"), source: at("source") };
}
