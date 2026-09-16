// THE PICTURE AT ONE FRAME — pure arithmetic, run by the composition in Chrome and by the tests in Bun. Browser-safe.
//
// THE CLOCK is linear in years: every track is drawn through the points it holds up to the fractional year reached, a
// segment only between two consecutive years it is in the top ten; India's label rides its tip with the rank of the last
// whole year; a pass is ringed once the clock reaches its year; the 2024 names land as the clock arrives.

import { EVENT_ORDER, progressOf } from "#shared/chart-video/timing.ts";
import { clamp01, ease } from "../../skills/scrolly/assets/reveal.mjs";

export const WINDOWS = Object.freeze({
  establish: { title: [-1, 0] },
  reference: { title: [0, 0.2], furniture: [0.25, 0.75] },
  reveal: { zoom: [0, 0.08], clock: [0.04, 0.96] },
  subject: { back: [0, 0.5], focus: [0.35, 0.9] },
  conclusion: { release: [0, 0.6], source: [0.2, 0.7] },
});
const LINEAR = new Set(["clock"]);

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

/** The camera's closest scale, and where it holds India's tip in the frame (shares of the stage). */
export const CLOSE = 1.7;
export const HOLD_AT = Object.freeze({ x: 0.58, y: 0.5 });

/** @param {{ states: any[], timing: any, xs: number[], tracks: Array<{ key: string, ys: Array<number|null> }>, subject: string, passes: Array<{ index: number }>, frame: { width: number, height: number } }} props */
export function sceneAt(props, frame) {
  const at = (f) => fieldAt(f, frame, props.states, props.timing);
  const clock = at("clock");
  const n = props.xs.length;
  const reach = clock * (n - 1);
  const whole = Math.floor(reach);
  const f = reach - whole;
  const paths = {};
  const tips = {};
  let tip = null;
  for (const t of props.tracks) {
    let d = "";
    for (let i = 0; i < whole && i + 1 < n; i++) if (t.ys[i] !== null && t.ys[i + 1] !== null) d += `M${r1(props.xs[i])} ${r1(t.ys[i])}L${r1(props.xs[i + 1])} ${r1(t.ys[i + 1])}`;
    if (whole + 1 < n && f > 0 && t.ys[whole] !== null && t.ys[whole + 1] !== null) {
      const x = props.xs[whole] + (props.xs[whole + 1] - props.xs[whole]) * f;
      const y = t.ys[whole] + (t.ys[whole + 1] - t.ys[whole]) * f;
      d += `M${r1(props.xs[whole])} ${r1(t.ys[whole])}L${r1(x)} ${r1(y)}`;
      if (t.key === props.subject) tip = { x, y };
      tips[t.key] = { x, y };
    } else if (t.ys[whole] !== null && (whole + 1 >= n || f === 0)) tips[t.key] = { x: props.xs[whole], y: t.ys[whole] };
    if (t.key === props.subject && !tip && t.ys[whole] !== null) tip = { x: props.xs[whole], y: t.ys[whole] };
    paths[t.key] = d;
  }
  // THE CAMERA: a scale about India's tip, holding the tip at HOLD_AT while it tracks; 1 is the whole chart.
  const camera = clamp01(at("zoom") - at("back"));
  const scale = 1 + (CLOSE - 1) * camera;
  const focusAt = tip ?? { x: props.xs[0], y: props.tracks.find((t) => t.key === props.subject).ys[0] };
  const target = { x: HOLD_AT.x * props.frame.width, y: HOLD_AT.y * props.frame.height };
  const offset = { x: camera * (target.x - focusAt.x * scale), y: camera * (target.y - focusAt.y * scale) };
  return {
    camera,
    transform: `translate(${r1(offset.x)} ${r1(offset.y)}) scale(${scale})`,
    tips,
    title: at("title"),
    furniture: at("furniture"),
    clock,
    paths,
    tip,
    tipIndex: whole,
    tipShown: clamp01(Math.min(clock * 20, (1 - clock) * 20)),
    passes: props.passes.map((p) => clamp01((reach - p.index + 0.2) * 3)),
    arrived: clamp01((clock - 0.97) / 0.03),
    focus: clamp01(at("focus") - at("release")),
    source: at("source"),
  };
}
