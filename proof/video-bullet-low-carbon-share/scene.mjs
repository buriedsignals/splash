// THE PICTURE AT ONE FRAME — pure arithmetic, run by the composition in Chrome and by the tests in Bun. Browser-safe.
//
//   - BEFORE: the thick pale 2015 bars extend from zero, row after row, eased.
//   - AFTER: the thin saturated 2024 bars appear at the 2015 end and extend on to 2024, row after row, each gain counting.
//   - REORDER: the insertion `subject.mjs` computed, step by step: in each step one row climbs to its slot while the rows it
//     passes step down one slot together; the step's travel is eased, the steps follow one another.
//   - HALF: the 50 % line dropped; every row but the one that moved furthest steps back.

import { EVENT_ORDER, progressOf } from "#shared/chart-video/timing.ts";
import { clamp01, ease } from "../../skills/scrolly/assets/reveal.mjs";

export const WINDOWS = Object.freeze({
  establish: { title: [-1, 0] },
  reference: { title: [0, 0.2], furniture: [0.25, 0.8] },
  reveal: { before: [0.02, 0.45], after: [0.5, 0.95] },
  subject: { reorder: [0.05, 0.95] },
  conclusion: { half: [0, 0.45], source: [0.4, 0.9] },
});
const LINEAR = new Set(["before", "after", "reorder"]);
export const MOVE = 0.4;

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

export const moveOf = (t, k, n) => clamp01((t - (n > 1 ? (k / (n - 1)) * (1 - MOVE) : 0)) / MOVE);

/** A gain's text: a sign, one decimal, a French comma. */
export const gainText = (v) => `+${v.toFixed(1).replace(".", ",")}`;

/**
 * @param {{ states: any[], timing: any, moved: string, steps: string[][],
 *   rows: Array<{ key: string, before: number, after: number }> }} props
 */
export function sceneAt(props, frame) {
  const at = (f) => fieldAt(f, frame, props.states, props.timing);
  const beforeT = at("before");
  const afterT = at("after");
  const moves = props.steps.length - 1;
  const r = at("reorder") * moves;
  const step = Math.min(moves - 1, Math.floor(r));
  const within = moves > 0 ? ease(clamp01(r - step)) : 0;
  const half = at("half");
  const first = props.steps[0];
  /** The row a step is about: the one that climbs past others. It is drawn over the rows it passes. */
  const climber = moves > 0 && within > 0 && within < 1 ? props.steps[step].reduce((best, key) => (props.steps[step].indexOf(key) - props.steps[step + 1].indexOf(key) > props.steps[step].indexOf(best) - props.steps[step + 1].indexOf(best) ? key : best)) : null;
  const rows = props.rows.map((row) => {
    const k = first.indexOf(row.key);
    const pale = ease(moveOf(beforeT, k, props.rows.length));
    const thin = ease(moveOf(afterT, k, props.rows.length));
    const from = moves > 0 ? props.steps[step].indexOf(row.key) : k;
    const to = moves > 0 ? props.steps[step + 1].indexOf(row.key) : k;
    return {
      slot: from + (to - from) * within,
      pale: row.before * pale,
      thin: thin > 0 ? row.before + (row.after - row.before) * thin : 0,
      gain: (row.after - row.before) * thin,
      shown: thin > 0 ? 1 : 0,
      stepBack: row.key === props.moved ? 0 : half,
      climbing: row.key === climber,
    };
  });
  return { title: at("title"), furniture: at("furniture"), rows, half, source: at("source") };
}
