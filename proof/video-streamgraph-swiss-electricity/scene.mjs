// THE PICTURE AT ONE FRAME — pure arithmetic, run by the composition in Chrome and by the tests in Bun. Browser-safe.
//
// THE FLOW is linear in years: the stream is revealed up to the x of the fractional year reached; solar's label rides at
// that x, on the middle of solar's band interpolated between the two years around it, and names the rank of the last
// whole year reached.

import { EVENT_ORDER, progressOf } from "#shared/chart-video/timing.ts";
import { clamp01, ease } from "../../skills/scrolly/assets/reveal.mjs";

export const WINDOWS = Object.freeze({
  establish: { title: [-1, 0] },
  reference: { title: [0, 0.3], furniture: [0.3, 0.8] },
  reveal: { flow: [0.02, 0.94] },
  subject: { focus: [0, 0.4], mark: [0.3, 0.7] },
  conclusion: { focus: [0, 0.4], source: [0.3, 0.8] },
});
const LINEAR = new Set(["flow"]);

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

/** @param {{ states: any[], timing: any, years: Array<{ year: number, x: number, solarY: number, rank: number }>, bandNames: Array<{ key: string, revealAt: number }> }} props */
export function sceneAt(props, frame) {
  const at = (f) => fieldAt(f, frame, props.states, props.timing);
  const flow = at("flow");
  const ys = props.years;
  const reach = flow * (ys.length - 1);
  const whole = Math.floor(reach);
  const f = reach - whole;
  const a = ys[whole];
  const b = ys[Math.min(whole + 1, ys.length - 1)];
  const front = { x: a.x + (b.x - a.x) * f, y: a.solarY + (b.solarY - a.solarY) * f };
  const names = Object.fromEntries(props.bandNames.map((n) => [n.key, clamp01((front.x - n.revealAt) / 40)]));
  return { title: at("title"), furniture: at("furniture"), flow, front, rank: a.rank, labelShown: flow > 0 ? 1 : 0, names, focus: at("focus"), mark: at("mark"), source: at("source") };
}
