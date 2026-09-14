// THE PICTURE AT ONE FRAME — pure arithmetic, run by the composition in Chrome and by the tests in Bun. Browser-safe.
//
// THE FILL is linear in years: at `fill` the surface reaches the fractional year `first + fill × span`; its outline is
// every reading up to the last whole year plus the point interpolated toward the next, closed down to zero. The stock
// is the cumulative total at the last whole year — the composition picks the text Bun measured for it.

import { EVENT_ORDER, progressOf } from "#shared/chart-video/timing.ts";
import { clamp01, ease } from "../../skills/scrolly/assets/reveal.mjs";

export const WINDOWS = Object.freeze({
  establish: { title: [-1, 0] },
  reference: { title: [0, 0.2], furniture: [0.25, 0.7] },
  reveal: { fill: [0.02, 0.94] },
  subject: { split: [0, 0.55] },
  conclusion: { source: [0, 0.6] },
});
const LINEAR = new Set(["fill"]);

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

const r1 = (v) => Math.round(v * 10) / 10;

/** @param {{ states: any[], timing: any, points: Array<{ year: number, x: number, y: number }>, baseY: number }} props */
export function sceneAt(props, frame) {
  const at = (f) => fieldAt(f, frame, props.states, props.timing);
  const fill = at("fill");
  const pts = props.points;
  const reach = fill * (pts.length - 1);
  const whole = Math.floor(reach);
  const f = reach - whole;
  const top = pts.slice(0, whole + 1).map((p) => [p.x, p.y]);
  if (whole + 1 < pts.length && f > 0) top.push([pts[whole].x + (pts[whole + 1].x - pts[whole].x) * f, pts[whole].y + (pts[whole + 1].y - pts[whole].y) * f]);
  const surface = fill > 0 && top.length > 1 ? `M${r1(top[0][0])} ${r1(props.baseY)}${top.map((p) => `L${r1(p[0])} ${r1(p[1])}`).join("")}L${r1(top.at(-1)[0])} ${r1(props.baseY)}Z` : "";
  return { title: at("title"), furniture: at("furniture"), fill, surface, year: pts[whole].year, stockShown: fill > 0 ? 1 : 0, split: at("split"), source: at("source") };
}
