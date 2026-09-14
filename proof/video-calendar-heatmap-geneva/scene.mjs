// THE PICTURE AT ONE FRAME — pure arithmetic, run by the composition in Chrome and by the tests in Bun. Browser-safe.
//
// THE ARGUMENT: a calendar is a temperature curve rolled up.
//   - CURVE is linear in days (a time axis): the year is drawn as its daily temperature, a dot a day over the 20 °C line;
//     the warm count is the number of drawn days at or above it.
//   - DROP: every day falls from its place on the curve into its calendar cell, one after another, growing into the cell
//     and taking its bin's colour; the curve's line and its 20 °C line go; the calendar's furniture comes in (GRID).
//   - FILTER: every day under the threshold steps back to a neutral; UNFILTER brings the colours back.
//   - TRACE is linear in days: the outline runs along the streak a day at a time; the count is the days outlined.

import { EVENT_ORDER, progressOf } from "#shared/chart-video/timing.ts";
import { clamp01, ease } from "../../skills/scrolly/assets/reveal.mjs";

export const WINDOWS = Object.freeze({
  establish: { title: [-1, 0] },
  reference: { title: [0, 0.12], curve: [0.06, 0.96] },
  reveal: { drop: [0, 0.85], grid: [0.5, 0.95] },
  subject: { filter: [0, 0.18], trace: [0.2, 0.9] },
  conclusion: { unfilter: [0, 0.5], source: [0.2, 0.7] },
});
const LINEAR = new Set(["curve", "trace", "drop"]);
/** Of the drop, the share one day's own fall takes. */
export const FALL = 0.2;

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

export const moveOf = (t, k, n, share = FALL) => clamp01((t - (n > 1 ? (k / (n - 1)) * (1 - share) : 0)) / share);
const lerp = (a, b, t) => a + (b - a) * t;

/** @param {{ states: any[], timing: any, threshold: number, streakLength: number, dot: number,
 *   days: Array<{ value: number, x: number, y: number, w: number, h: number, cx: number, cy: number }> }} props */
export function sceneAt(props, frame) {
  const at = (f) => fieldAt(f, frame, props.states, props.timing);
  const n = props.days.length;
  const drawn = at("curve") * n;
  const drop = at("drop");
  const stepped = clamp01(at("filter") - at("unfilter"));
  const reach = at("trace") * props.streakLength;
  let warm = 0;
  let last = -1;
  const cells = props.days.map((d, i) => {
    const shown = clamp01(drawn - i);
    if (shown >= 1) last = i;
    if (shown >= 1 && d.value >= props.threshold) warm += 1;
    const fall = ease(moveOf(drop, i, n));
    return {
      shown,
      fall,
      x: lerp(d.cx - props.dot, d.x, fall),
      y: lerp(d.cy - props.dot, d.y, fall),
      w: lerp(2 * props.dot, d.w, fall),
      h: lerp(2 * props.dot, d.h, fall),
      stepped: d.value >= props.threshold ? 0 : stepped,
    };
  });
  return {
    title: at("title"),
    cells,
    /** The curve's line runs through the drawn days and goes as they fall. */
    line: { through: last, opacity: 1 - clamp01(drop * 4) },
    curveFurniture: at("curve") > 0 ? 1 - at("grid") : 0,
    grid: at("grid"),
    warm,
    counting: drawn > 0 ? 1 : 0,
    reach,
    run: Math.min(props.streakLength, Math.floor(reach + 1e-9)),
    running: clamp01(reach * 4),
    source: at("source"),
  };
}
