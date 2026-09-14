// THE PICTURE AT ONE FRAME — pure arithmetic, run by the composition in Chrome and by the tests in Bun. Browser-safe.
//
//   - WIND: the first series rises across the six, left to right, each bar eased (an arrival) and counting its share.
//   - SOLAR: the second series rises beside it one group after another; as each lands, the lead is counted if it landed
//     under wind.
//   - FOCUS: every group but the exception steps back.

import { EVENT_ORDER, progressOf } from "#shared/chart-video/timing.ts";
import { clamp01, ease } from "../../skills/scrolly/assets/reveal.mjs";

export const WINDOWS = Object.freeze({
  establish: { title: [-1, 0] },
  reference: { title: [0, 0.2], furniture: [0.25, 0.8] },
  reveal: { wind: [0.02, 0.38], solar: [0.44, 0.95] },
  subject: { focus: [0, 0.5] },
  conclusion: { source: [0, 0.6] },
});
const LINEAR = new Set(["wind", "solar"]);
/** Of a series' rise, the share one bar's own move takes. */
export const MOVE = 0.35;

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

/** A share's text: one decimal, a French comma. */
export const shareText = (v) => v.toFixed(1).replace(".", ",");

/** @param {{ states: any[], timing: any, subject: string, groups: Array<{ name: string, wind: number, solar: number }> }} props */
export function sceneAt(props, frame) {
  const at = (f) => fieldAt(f, frame, props.states, props.timing);
  const wind = at("wind");
  const solar = at("solar");
  const focus = at("focus");
  const n = props.groups.length;
  let lead = 0;
  const groups = props.groups.map((g, i) => {
    const w = ease(moveOf(wind, i, n));
    const rawSolar = moveOf(solar, i, n);
    if (rawSolar >= 1 && g.solar < g.wind) lead += 1;
    return { wind: w, solar: ease(rawSolar), stepBack: g.name === props.subject ? 0 : focus };
  });
  return { title: at("title"), furniture: at("furniture"), groups, lead, counting: solar > 0 ? 1 : 0, focus, source: at("source") };
}
