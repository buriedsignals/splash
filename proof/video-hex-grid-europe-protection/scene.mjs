// THE PICTURE AT ONE FRAME — pure arithmetic, run by the composition in Chrome and by the tests in Bun. Browser-safe.
//
//   - COUNT: a cell takes its count class when the class reveal reaches it, lowest first.
//   - RATE: every cell's fill travels from its count class's colour to its rate class's; the key's bornes cross-fade.

import { EVENT_ORDER, progressOf } from "#shared/chart-video/timing.ts";
import { clamp01, ease } from "../../skills/scrolly/assets/reveal.mjs";

export const WINDOWS = Object.freeze({
  establish: { title: [-1, 0] },
  reference: { title: [0, 0.2], furniture: [0.2, 0.7] },
  reveal: { count: [0, 0.7], largest: [0.72, 0.9] },
  subject: { rate: [0.05, 0.6], leader: [0.62, 0.8] },
  conclusion: { source: [0, 0.4] },
});
const LINEAR = new Set(["count"]);

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

export function blend(a, b, t) {
  const pa = [1, 3, 5].map((i) => Number.parseInt(a.slice(i, i + 2), 16));
  const pb = [1, 3, 5].map((i) => Number.parseInt(b.slice(i, i + 2), 16));
  return `#${pa.map((v, i) => Math.round(v + (pb[i] - v) * t).toString(16).padStart(2, "0")).join("")}`;
}

/** @param {{ states: any[], timing: any, cells: Array<{ code: string, origin: boolean, countClass: number|null, rateClass: number|null }>, colours: { neutral: string, origin: string, classFills: string[] } }} props */
export function sceneAt(props, frame) {
  const at = (f) => fieldAt(f, frame, props.states, props.timing);
  const count = at("count");
  const rate = at("rate");
  const n = props.colours.classFills.length;
  const fills = {};
  /** Which stage each cell's code ink is at: the neutral's, the count class's, or the rate class's. */
  const inkStage = {};
  for (const c of props.cells) {
    if (c.origin) {
      fills[c.code] = props.colours.origin;
      inkStage[c.code] = "neutral";
      continue;
    }
    const reached = ease(clamp01(count * n - c.countClass));
    const byCount = blend(props.colours.neutral, props.colours.classFills[c.countClass], reached);
    fills[c.code] = blend(byCount, props.colours.classFills[c.rateClass], rate);
    inkStage[c.code] = rate >= 0.5 ? "rate" : reached >= 0.5 ? "count" : "neutral";
  }
  return {
    title: at("title"),
    furniture: at("furniture"),
    fills,
    inkStage,
    /** Each key swatch lands with its class during the count reveal. */
    swatches: Array.from({ length: n }, (_, i) => ease(clamp01(count * n - i))),
    rate,
    largest: at("largest"),
    leader: at("leader"),
    source: at("source"),
  };
}
