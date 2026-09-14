// THE PICTURE AT ONE FRAME — pure arithmetic, run by the composition in Chrome and by the tests in Bun. Browser-safe.
//
//   - FILL is linear in days (a time axis): each day's cell takes its bin's colour over its own day of the fill, 1 January
//     to 31 December; the warm count is the number of warm days whose cell has filled.
//   - FILTER: every day under the threshold steps back to the neutral; UNFILTER brings the colours back.
//   - TRACE is linear in days too: the outline runs along the streak a day at a time; the count is the days outlined.

import { EVENT_ORDER, progressOf } from "#shared/chart-video/timing.ts";
import { clamp01, ease } from "../../skills/scrolly/assets/reveal.mjs";

export const WINDOWS = Object.freeze({
  establish: { title: [-1, 0] },
  reference: { title: [0, 0.2], furniture: [0.25, 0.8] },
  reveal: { fill: [0.02, 0.95] },
  subject: { filter: [0, 0.2], trace: [0.25, 0.9] },
  conclusion: { unfilter: [0, 0.5], source: [0.3, 0.8] },
});
const LINEAR = new Set(["fill", "trace"]);

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

/** @param {{ states: any[], timing: any, threshold: number, streakLength: number, days: Array<{ value: number }> }} props */
export function sceneAt(props, frame) {
  const at = (f) => fieldAt(f, frame, props.states, props.timing);
  const n = props.days.length;
  const reached = at("fill") * n;
  const stepped = clamp01(at("filter") - at("unfilter"));
  const reach = at("trace") * props.streakLength;
  let warm = 0;
  const cells = props.days.map((d, i) => {
    const shown = clamp01(reached - i);
    if (shown >= 1 && d.value >= props.threshold) warm += 1;
    return { shown, stepped: d.value >= props.threshold ? 0 : stepped };
  });
  return {
    title: at("title"),
    furniture: at("furniture"),
    cells,
    warm,
    counting: reached > 0 ? 1 : 0,
    /** How many of the streak's days the outline has run along, fractional. */
    reach,
    run: Math.min(props.streakLength, Math.floor(reach + 1e-9)),
    running: clamp01(reach * 4),
    source: at("source"),
  };
}
