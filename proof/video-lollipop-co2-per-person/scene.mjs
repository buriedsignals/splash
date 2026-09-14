// THE PICTURE AT ONE FRAME — pure arithmetic, run by the composition in Chrome and by the tests in Bun. Browser-safe.
//
//   - RISE: both stems of a pair rise from zero to the 2000 level, pair after pair, each eased and counting.
//   - TRAVEL: every pair's second stem travels from its 2000 level to its 2023 level, all together and eased (two dates and
//     nothing between them: an arrival, not a time axis); the first stem stays at 2000 in its tint. The ratio is the
//     American head over the Chinese head at the frame, so it counts down with the stems.
//   - FOCUS: every pair but China's and the United States' steps back; China's 2023 head is ringed.

import { EVENT_ORDER, progressOf } from "#shared/chart-video/timing.ts";
import { clamp01, ease } from "../../skills/scrolly/assets/reveal.mjs";

export const WINDOWS = Object.freeze({
  establish: { title: [-1, 0] },
  reference: { title: [0, 0.2], furniture: [0.25, 0.8] },
  reveal: { rise: [0.02, 0.9] },
  subject: { travel: [0.05, 0.8] },
  conclusion: { focus: [0, 0.45], source: [0.4, 0.9] },
});
const LINEAR = new Set(["rise"]);
export const MOVE = 0.4;

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

export const moveOf = (t, k, n) => clamp01((t - (n > 1 ? (k / (n - 1)) * (1 - MOVE) : 0)) / MOVE);

/** A value's text: one decimal, a French comma. */
export const oneText = (v) => v.toFixed(1).replace(".", ",");

/** @param {{ states: any[], timing: any, subject: string, other: string, pairs: Array<{ code: string, before: number, after: number }> }} props */
export function sceneAt(props, frame) {
  const at = (f) => fieldAt(f, frame, props.states, props.timing);
  const rise = at("rise");
  const travel = at("travel");
  const focus = at("focus");
  const n = props.pairs.length;
  const pairs = props.pairs.map((p, i) => {
    const up = ease(moveOf(rise, i, n));
    const past = p.before * up;
    const present = (p.before + (p.after - p.before) * travel) * up;
    return { past, present, up, stepBack: p.code === props.subject || p.code === props.other ? 0 : focus };
  });
  const head = (code) => pairs[props.pairs.findIndex((p) => p.code === code)].present;
  return {
    title: at("title"),
    furniture: at("furniture"),
    pairs,
    travel,
    ratio: head(props.other) / Math.max(head(props.subject), 1e-9),
    /** The ratio shows once both its heads have landed at 2000 — before that it would count the rise, not the change. */
    ratioShown: [props.subject, props.other].every((code) => moveOf(rise, props.pairs.findIndex((p) => p.code === code), n) >= 1) ? 1 : 0,
    ring: clamp01((focus - 0.4) / 0.6),
    source: at("source"),
  };
}
