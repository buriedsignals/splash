// THE PICTURE AT ONE FRAME — pure arithmetic, run by the composition in Chrome and by the tests in Bun. Browser-safe.
//
//   - THE TRACE: the bands, largest first, each drawing itself over its own slice of the reveal (a dash offset along
//     its measured length), eased; its host's name lands just after the band has arrived. The count is the people of
//     the bands that have arrived.
//   - THE FOCUS: every band but the top two steps back; the top two's share climbs, in whole percents, then exact.

import { EVENT_ORDER, progressOf } from "#shared/chart-video/timing.ts";
import { clamp01, ease } from "../../skills/scrolly/assets/reveal.mjs";

export const WINDOWS = Object.freeze({
  establish: { title: [-1, 0] },
  reference: { title: [0, 0.2], furniture: [0.2, 0.7] },
  reveal: { trace: [0.02, 0.88] },
  subject: { focus: [0, 0.3], share: [0.25, 0.75] },
  conclusion: { focus: [0, 0.4], source: [0.3, 0.7] },
});
const LINEAR = new Set(["trace", "share"]);
/** Each band's slice overlaps the next by this share of a slice, so the fan reads as one gesture. */
export const OVERLAP = 0.6;
/** A stepped-back band keeps this much of its ink. */
export const STEPPED_BACK = 0.22;

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

/** How far band `i` of `n` has drawn at `trace`. */
export function bandAt(trace, i, n) {
  const slot = 1 / (n - (n - 1) * OVERLAP);
  const start = i * slot * (1 - OVERLAP);
  return ease(clamp01((trace - start) / slot));
}

/** @param {{ states: any[], timing: any, bands: Array<{ code: string, people: number, top: boolean }>, topTwoShare: number }} props */
export function sceneAt(props, frame) {
  const at = (f) => fieldAt(f, frame, props.states, props.timing);
  const trace = at("trace");
  const focus = at("focus");
  const share = at("share");
  const n = props.bands.length;
  const bands = {};
  let arrived = 0;
  let people = 0;
  props.bands.forEach((b, i) => {
    const t = bandAt(trace, i, n);
    if (t >= 1) {
      arrived++;
      people += b.people;
    }
    bands[b.code] = { drawn: t, name: clamp01((t - 0.85) / 0.15), opacity: b.top ? 1 : 1 - (1 - STEPPED_BACK) * focus };
  });
  return {
    title: at("title"),
    furniture: at("furniture"),
    bands,
    /** The count: the number of bands arrived — the key picks its measured text by it. */
    arrived,
    people,
    countShown: clamp01(trace * 10),
    share: share >= 1 ? props.topTwoShare : Math.floor(props.topTwoShare * share),
    shareShown: clamp01(share * 6),
    source: at("source"),
  };
}
