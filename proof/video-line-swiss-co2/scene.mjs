// THE PICTURE AT ONE FRAME — pure arithmetic, run by the composition in Chrome and by the tests in Bun. Browser-safe.
//
// THE TRACE is linear in years: at `trace` the line reaches the fractional year `first + trace × span`; the drawn path is
// every reading up to the last whole year plus the point interpolated toward the next, so the tip moves smoothly. The tip
// label names the last whole year reached — the composition picks the text Bun measured for it.

import { EVENT_ORDER, progressOf } from "#shared/chart-video/timing.ts";
import { clamp01, ease } from "../../skills/scrolly/assets/reveal.mjs";

export const WINDOWS = Object.freeze({
  establish: { title: [-1, 0] },
  reference: { title: [0, 0.2], furniture: [0.25, 0.7] },
  reveal: { trace: [0.02, 0.94] },
  subject: { subject: [0, 0.5] },
  conclusion: { source: [0, 0.4] },
});
const LINEAR = new Set(["trace"]);

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

/** @param {{ states: any[], timing: any, points: Array<{ year: number, x: number, y: number }>, peakYear: number }} props */
export function sceneAt(props, frame) {
  const at = (f) => fieldAt(f, frame, props.states, props.timing);
  const trace = at("trace");
  const pts = props.points;
  const reach = trace * (pts.length - 1);
  const whole = Math.floor(reach);
  const f = reach - whole;
  const drawn = pts.slice(0, whole + 1).map((p) => [p.x, p.y]);
  const next = pts[Math.min(whole + 1, pts.length - 1)];
  const tip = whole + 1 < pts.length && f > 0 ? [pts[whole].x + (next.x - pts[whole].x) * f, pts[whole].y + (next.y - pts[whole].y) * f] : [pts[whole].x, pts[whole].y];
  if (whole + 1 < pts.length && f > 0) drawn.push(tip);
  const peakIndex = pts.findIndex((p) => p.year === props.peakYear);
  return {
    title: at("title"),
    furniture: at("furniture"),
    trace,
    path: drawn.length > 1 ? `M${drawn.map((p) => `${Math.round(p[0] * 10) / 10} ${Math.round(p[1] * 10) / 10}`).join("L")}` : "",
    tip: { x: tip[0], y: tip[1], year: pts[whole].year, shown: trace > 0 ? 1 : 0 },
    peak: clamp01((reach - peakIndex) / 3),
    subject: at("subject"),
    source: at("source"),
  };
}
