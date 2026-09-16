// THE PICTURE AT ONE FRAME — pure arithmetic, run by the composition in Chrome and by the tests in Bun. Browser-safe.
//
// THE FILL is linear in years: at `fill` the surface reaches the fractional year `first + fill × span`; its outline is
// every reading up to the last whole year plus the point interpolated toward the next, closed down to zero. The stock
// is the cumulative total at the last whole year — the composition picks the text Bun measured for it.
//
// THE SWEEP is linear in years too: the rule travels from the right edge of 2024 back to the right edge of the midpoint,
// and the gauge's recent share is every reading's year-wide slice the rule has passed, over the stock.
//
// THE FLATTEN moves each top point straight toward its half's mean height. A polygon's surface is linear in its points'
// heights, so every intermediate outline holds the same surface as the curve — the motion itself is honest. The
// outline carries two points at the rule, one per half, which coincide while the curve is whole.

import { EVENT_ORDER, progressOf } from "#shared/chart-video/timing.ts";
import { clamp01, ease } from "../../skills/scrolly/assets/reveal.mjs";

export const WINDOWS = Object.freeze({
  establish: { title: [-1, 0] },
  reference: { title: [0, 0.2], furniture: [0.1, 0.8] },
  reveal: { fill: [0.02, 0.96] },
  subject: { gauge: [0, 0.12], sweep: [0.1, 0.56], flatten: [0.62, 0.95], named: [0.72, 0.95] },
  conclusion: { flatten: [0, 0.55], source: [0.25, 0.8] },
});
const LINEAR = new Set(["fill", "sweep"]);

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
const lerp = (a, b, t) => a + (b - a) * t;

/** The outline of the whole surface, each half's top moved `flatten` of the way to its mean. */
function wholeOutline(props, flatten) {
  const { points, midpoint, ruleX, means, baseY } = props;
  const cut = points.findIndex((p) => p.year > midpoint);
  const atRule = (points[cut - 1].y + points[cut].y) / 2;
  const top = [
    ...points.slice(0, cut).map((p) => [p.x, lerp(p.y, means[0], flatten)]),
    [ruleX, lerp(atRule, means[0], flatten)],
    [ruleX, lerp(atRule, means[1], flatten)],
    ...points.slice(cut).map((p) => [p.x, lerp(p.y, means[1], flatten)]),
  ];
  return `M${r1(top[0][0])} ${r1(baseY)}${top.map((p) => `L${r1(p[0])} ${r1(p[1])}`).join("")}L${r1(top.at(-1)[0])} ${r1(baseY)}Z`;
}

/** @param {{ states: any[], timing: any, points: Array<{ year: number, x: number, y: number, mt: number }>, baseY: number, plot: any, ruleX: number, midpoint: number, means: number[], total: number }} props */
export function sceneAt(props, frame) {
  const at = (f) => fieldAt(f, frame, props.states, props.timing);
  const fill = at("fill");
  const flatten = at("flatten");
  const pts = props.points;
  const reach = fill * (pts.length - 1);
  const whole = Math.min(Math.floor(reach), pts.length - 1);
  const f = reach - whole;
  let surface = "";
  if (fill >= 1) surface = wholeOutline(props, flatten);
  else if (fill > 0) {
    const top = pts.slice(0, whole + 1).map((p) => [p.x, p.y]);
    if (whole + 1 < pts.length && f > 0) top.push([lerp(pts[whole].x, pts[whole + 1].x, f), lerp(pts[whole].y, pts[whole + 1].y, f)]);
    if (top.length > 1) surface = `M${r1(top[0][0])} ${r1(props.baseY)}${top.map((p) => `L${r1(p[0])} ${r1(p[1])}`).join("")}L${r1(top.at(-1)[0])} ${r1(props.baseY)}Z`;
  }

  const first = pts[0].year;
  const last = pts.at(-1).year;
  const pos = lerp(last + 0.5, props.midpoint + 0.5, at("sweep"));
  const xOf = (year) => props.plot.left + ((year - first) / (last - first)) * (props.plot.right - props.plot.left);
  const passed = pts.reduce((s, p) => s + p.mt * clamp01(p.year + 0.5 - pos), 0);

  return {
    title: at("title"),
    furniture: at("furniture"),
    fill,
    surface,
    year: pts[whole].year,
    stockShown: fill > 0 ? 1 : 0,
    gauge: at("gauge"),
    ruleX: Math.min(xOf(pos), props.plot.right),
    ruleYear: Math.floor(pos),
    share: passed / props.total,
    flatten,
    named: at("named"),
    source: at("source"),
  };
}
