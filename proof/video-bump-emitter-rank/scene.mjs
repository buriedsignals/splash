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
  reveal: { clock: [0.02, 0.82] },
  subject: { focus: [0, 0.5] },
  conclusion: { source: [0, 0.6] },
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

/** @param {{ states: any[], timing: any, xs: number[], tracks: Array<{ key: string, ys: Array<number|null> }>, subject: string, passes: Array<{ index: number }> }} props */
export function sceneAt(props, frame) {
  const at = (f) => fieldAt(f, frame, props.states, props.timing);
  const clock = at("clock");
  const n = props.xs.length;
  const reach = clock * (n - 1);
  const whole = Math.floor(reach);
  const f = reach - whole;
  const paths = {};
  let tip = null;
  for (const t of props.tracks) {
    let d = "";
    for (let i = 0; i < whole && i + 1 < n; i++) if (t.ys[i] !== null && t.ys[i + 1] !== null) d += `M${r1(props.xs[i])} ${r1(t.ys[i])}L${r1(props.xs[i + 1])} ${r1(t.ys[i + 1])}`;
    if (whole + 1 < n && f > 0 && t.ys[whole] !== null && t.ys[whole + 1] !== null) {
      const x = props.xs[whole] + (props.xs[whole + 1] - props.xs[whole]) * f;
      const y = t.ys[whole] + (t.ys[whole + 1] - t.ys[whole]) * f;
      d += `M${r1(props.xs[whole])} ${r1(t.ys[whole])}L${r1(x)} ${r1(y)}`;
      if (t.key === props.subject) tip = { x, y };
    }
    if (t.key === props.subject && !tip && t.ys[whole] !== null) tip = { x: props.xs[whole], y: t.ys[whole] };
    paths[t.key] = d;
  }
  return {
    title: at("title"),
    furniture: at("furniture"),
    clock,
    paths,
    tip,
    tipIndex: whole,
    tipShown: clamp01(Math.min(clock * 20, (1 - clock) * 20)),
    passes: props.passes.map((p) => clamp01((reach - p.index + 0.2) * 3)),
    arrived: clamp01((clock - 0.97) / 0.03),
    focus: at("focus"),
    source: at("source"),
  };
}
