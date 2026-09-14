// THE PICTURE AT ONE FRAME — pure arithmetic, run by the composition in Chrome and by the tests in Bun.
//
// `contour-drive.mjs`'s painting (the scrolly) as a function of the frame, the camera still: the sweep's level in km,
// each line appearing as the front passes it and its number just after, the count read off the field's own
// `within` table. Browser-safe.

import { EVENT_ORDER, progressOf } from "#shared/chart-video/timing.ts";
import { clamp01, ease } from "../../skills/scrolly/assets/reveal.mjs";

export const WINDOWS = Object.freeze({
  // The title card is up from frame 0: its window closes before the first frame.
  establish: { title: [-1, 0] },
  reference: { title: [0, 0.25], furniture: [0.25, 0.7] },
  reveal: { tint: [0, 0.08], level: [0.05, 0.8], median: [0.82, 0.94] },
  subject: { level: [0, 0.85], summit: [0.86, 0.96] },
  conclusion: { tint: [0, 0.4], source: [0.3, 0.7] },
});
/** A measured axis is traversed linearly; everything that arrives eases. */
const LINEAR = new Set(["level"]);
/** A line fades in over this many km past the front, its number over the next. */
export const LINE_FADE_KM = 10;
export const LABEL_DELAY_KM = 14;

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

/** The count at a level: the share of the land within it, and the distance, never past the farthest point. */
export function countAt(level, within, deepest) {
  const km = Math.min(Math.round(level), Math.round(deepest));
  const p = level >= deepest ? 100 : Math.round(within[Math.min(km, within.length - 1)]);
  return { p, km };
}

/** The share of the land within `km` of the sea, between the two whole kilometres around it; all of it past the farthest point. */
export function shareWithin(km, within, deepest) {
  if (km >= deepest) return 100;
  const lo = Math.floor(km);
  const at = (i) => (i >= within.length ? 100 : within[i]);
  return at(lo) + (at(lo + 1) - at(lo)) * (km - lo);
}

/** @param {{ states: any[], timing: any, levels: Array<{ level: number }>, medianLevel: number, within: number[], deepest: number,
 *   chart: { plot: { left: number, right: number, top: number, bottom: number }, maxKm: number } }} props */
export function sceneAt(props, frame) {
  const at = (f) => fieldAt(f, frame, props.states, props.timing);
  const level = at("level");
  const lines = {};
  const labels = {};
  const median = at("median");
  for (const { level: L } of props.levels) {
    // A line is whole the moment the front reaches it; its number follows once the front has moved on — except
    // the median's, which lands with its own gesture while the front stands on it.
    // A line within 50 km of the median gives way to it as the median lands.
    const yielded = props.yielding?.includes(L) ? 1 - median : 1;
    lines[L] = clamp01((level - L + LINE_FADE_KM) / LINE_FADE_KM) * yielded;
    labels[L] = L === props.medianLevel ? median : ease(clamp01((level - L - LABEL_DELAY_KM) / LINE_FADE_KM)) * yielded;
  }
  return {
    title: at("title"),
    furniture: at("furniture"),
    level,
    tint: at("tint"),
    median,
    summit: at("summit"),
    source: at("source"),
    lines,
    labels,
    count: countAt(level, props.within, props.deepest),
    /** THE CURVE: traced to the sweep's front — the share of the land the fill has covered, at the distance it has reached. */
    chart: (() => {
      const { plot, maxKm } = props.chart;
      const km = Math.min(level, maxKm);
      const head = { x: plot.left + ((plot.right - plot.left) * km) / maxKm, y: plot.bottom - ((plot.bottom - plot.top) * (level >= props.deepest ? 100 : shareWithin(km, props.within, props.deepest))) / 100 };
      return { head, shown: level > 0 ? 1 : 0, guides: median };
    })(),
  };
}
