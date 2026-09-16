// THE PICTURE AT ONE FRAME — pure arithmetic, run by the composition in Chrome and by the tests in Bun. Browser-safe.
//
// THE FILL is linear in years: the outline is every reading up to the last whole year plus the point interpolated
// toward the next, closed down to zero. The counter shows the population at the last whole year.
//
// THE STACK is linear in value: the unit (the 1800 reading, on the plot's own scale) is copy one; `stack` carries the
// column from one copy to `multiple` copies, so its top meets the 2023 reading exactly and every frame's height is a
// true multiple of the 1800 level. The count names only the copies already complete, then the multiple itself.
//
// THE CAMERA is one similarity: a plot point p lands at lerp(F, T, z) + s·(p − F), s = S^z — the focus F (the middle of
// the crossing and the last reading) travels to the target T while the scale grows geometrically, so the zoom reads as
// even. The words the close-up adds are placed through the same map, at their measured size.

import { EVENT_ORDER, progressOf } from "#shared/chart-video/timing.ts";
import { clamp01, ease } from "../../skills/scrolly/assets/reveal.mjs";

export const WINDOWS = Object.freeze({
  establish: { title: [-1, 0] },
  reference: { title: [0, 0.2], furniture: [0.1, 0.8] },
  reveal: { fill: [0.02, 0.97] },
  subject: { tint: [0, 0.07], unit: [0.03, 0.1], stack: [0.1, 0.55], level: [0.56, 0.66], zoom: [0.68, 0.84], named: [0.82, 0.94] },
  conclusion: { zoom: [0, 0.7], named: [0, 0.3], tint: [0, 0.6], source: [0.3, 0.9] },
});
const LINEAR = new Set(["fill", "stack", "level"]);

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

const r2 = (v) => Math.round(v * 100) / 100;
const lerp = (a, b, t) => a + (b - a) * t;

/** @param {{ states: any[], timing: any, camera: any, ring: { x: number, y: number }, points: Array<{ year: number, x: number, y: number }>, baseY: number, multiple: number, unitHeight: number, level: { x0: number, x1: number, y: number } }} props */
export function sceneAt(props, frame) {
  const at = (f) => fieldAt(f, frame, props.states, props.timing);
  const fill = at("fill");
  const pts = props.points;
  const reach = fill * (pts.length - 1);
  const whole = Math.min(Math.floor(reach), pts.length - 1);
  const f = reach - whole;
  let surface = "";
  if (fill > 0) {
    const top = pts.slice(0, whole + 1).map((p) => [p.x, p.y]);
    if (whole + 1 < pts.length && f > 0) top.push([lerp(pts[whole].x, pts[whole + 1].x, f), lerp(pts[whole].y, pts[whole + 1].y, f)]);
    if (top.length > 1) surface = `M${r2(top[0][0])} ${r2(props.baseY)}${top.map((p) => `L${r2(p[0])} ${r2(p[1])}`).join("")}L${r2(top.at(-1)[0])} ${r2(props.baseY)}Z`;
  }

  const stack = at("stack");
  const copies = lerp(1, props.multiple, stack);
  const blocks = [];
  for (let i = 0; i < Math.ceil(copies - 1e-9); i++) {
    const h = props.unitHeight * Math.min(1, copies - i);
    blocks.push({ bottom: props.baseY - i * props.unitHeight, height: h });
  }
  const level = at("level");
  const zoom = at("zoom");
  const { focus: F, target: T, scale: S } = props.camera;
  const s = Math.pow(S, zoom);
  const cx = lerp(F.x, T.x, zoom);
  const cy = lerp(F.y, T.y, zoom);
  const toScreen = (p) => ({ x: cx + s * (p.x - F.x), y: cy + s * (p.y - F.y) });
  return {
    zoom,
    scale: s,
    transform: `translate(${cx} ${cy}) scale(${s}) translate(${-F.x} ${-F.y})`,
    ring: toScreen(props.ring),
    end: toScreen({ x: props.level.x1, y: props.level.y }),
    gridline: toScreen({ x: 0, y: props.ring.y }).y,
    title: at("title"),
    furniture: at("furniture"),
    fill,
    surface,
    year: pts[whole].year,
    counterShown: fill > 0 ? 1 - at("unit") : 0,
    tint: at("tint"),
    unit: at("unit"),
    stack,
    copies,
    blocks,
    count: stack >= 1 ? "final" : String(Math.floor(copies + 1e-9)),
    stackTop: props.baseY - copies * props.unitHeight,
    level,
    levelX: lerp(props.level.x0, props.level.x1, level),
    named: at("named"),
    source: at("source"),
  };
}
