// THE PICTURE AT ONE FRAME — pure arithmetic, run by the composition in Chrome and by the tests in Bun. Browser-safe.
//
// Every line travels from its left point toward its right point together, eased (the arrival of a mark, not the traversal
// of a time axis: the chart has two dates and nothing between them); its 2024 value lands as the line arrives.

import { EVENT_ORDER, progressOf } from "#shared/chart-video/timing.ts";
import { clamp01, ease } from "../../skills/scrolly/assets/reveal.mjs";

export const WINDOWS = Object.freeze({
  establish: { title: [-1, 0] },
  reference: { title: [0, 0.2], furniture: [0.25, 0.75] },
  reveal: { travel: [0, 0.85] },
  subject: { focus: [0, 0.5] },
  conclusion: { source: [0, 0.6] },
});

const windowed = (frame, timing, event, [a, b]) => clamp01((progressOf(frame, timing[event]) - a) / (b - a));
export function fieldAt(field, frame, states, timing) {
  let value = 0;
  EVENT_ORDER.forEach((event, i) => {
    const before = i === 0 ? 0 : states[i - 1][field];
    const delta = states[i][field] - before;
    if (delta === 0) return;
    value += delta * ease(windowed(frame, timing, event, WINDOWS[event]?.[field] ?? [0, 1]));
  });
  return value;
}

export function sceneAt(props, frame) {
  const at = (f) => fieldAt(f, frame, props.states, props.timing);
  const travel = at("travel");
  return { title: at("title"), furniture: at("furniture"), travel, arrived: clamp01((travel - 0.85) / 0.15), focus: at("focus"), source: at("source") };
}
