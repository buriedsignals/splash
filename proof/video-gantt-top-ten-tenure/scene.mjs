// THE PICTURE AT ONE FRAME — pure arithmetic, run by the composition in Chrome and by the tests in Bun. Browser-safe.
//
// THE CLOCK is linear in years: a year's stretch of a bar is drawn as the clock crosses it, so a bar grows while its
// country holds a place and stops where it leaves; the count is how many of the 1990 ten have held every year the clock
// has fully crossed. A country of the 1990 ten is counted out — its name muted — as the clock crosses the first year it
// was out, the moment the count drops; a country that was not among the ten is never counted.

import { EVENT_ORDER, progressOf } from "#shared/chart-video/timing.ts";
import { clamp01, ease } from "../../skills/scrolly/assets/reveal.mjs";

export const WINDOWS = Object.freeze({
  establish: { title: [-1, 0] },
  reference: { title: [0, 0.2], furniture: [0.25, 0.75] },
  reveal: { clock: [0.02, 0.9] },
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

/**
 * @param {{ states: any[], timing: any, first: number, last: number, neverLeft: number[],
 *   rows: Array<{ member: boolean, leftAt: number|null, runs: Array<{ from: number, to: number }> }> }} props
 */
export function sceneAt(props, frame) {
  const at = (f) => fieldAt(f, frame, props.states, props.timing);
  const clock = at("clock");
  /** The clock's reach, in years: the first year's start at 0, the last year's end at 1. */
  const reach = props.first + clock * (props.last + 1 - props.first);
  const crossed = Math.floor(reach + 1e-9) - props.first;
  const bars = props.rows.map((row) => row.runs.map((run) => ({ from: run.from, to: Math.max(run.from, Math.min(run.to + 1, reach)) })).filter((b) => b.to > b.from));
  return {
    title: at("title"),
    furniture: at("furniture"),
    clock,
    reach,
    bars,
    /** For each row, how far its name has been counted out: 0 while it counts, 1 once it does not. */
    out: props.rows.map((row) => (!row.member ? 1 : row.leftAt === null ? 0 : clamp01(reach - row.leftAt))),
    neverLeft: props.neverLeft[Math.max(0, Math.min(props.neverLeft.length - 1, crossed - 1))],
    counting: clock > 0 ? 1 : 0,
    focus: at("focus"),
    source: at("source"),
  };
}
