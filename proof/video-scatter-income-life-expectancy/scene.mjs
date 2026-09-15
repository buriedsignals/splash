// THE PICTURE AT ONE FRAME — pure arithmetic, run by the composition in Chrome and by the tests in Bun. Browser-safe.
//
//   - SPLIT: poorest first, each dot leaves its seat in the column and flies horizontally to its income (an arrival,
//     eased); its height, its age, never changes; the countries are counted as they land.
//   - FOLD / UNFOLD: every dot slides horizontally between its seat and its seat in the column on its side of the break.
//   - BARS: a bar grows up from the low end of each side's span to its high end, on the age scale.
//   - STACK: one after another, a copy of the short bar flies from its place onto the long bar, the k-th landing k copies
//     up from the long bar's low end.

import { EVENT_ORDER, progressOf } from "#shared/chart-video/timing.ts";
import { clamp01, ease } from "../../skills/scrolly/assets/reveal.mjs";

export const WINDOWS = Object.freeze({
  establish: { title: [-1, 0] },
  reference: { title: [0, 0.2], furniture: [0.05, 0.6] },
  reveal: { split: [0, 0.95] },
  subject: { rule: [0, 0.14], fold: [0.1, 0.36], bars: [0.34, 0.48], stack: [0.48, 0.86], times: [0.84, 1] },
  conclusion: { unfold: [0, 0.6], source: [0.3, 0.75] },
});
const LINEAR = new Set(["split", "stack"]);
/** Of the split, the share one dot's own flight takes; of the stack, one copy's. */
export const MOVE = 0.3;
export const SLIDE = 0.4;

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

export const moveOf = (t, k, n, share = MOVE) => clamp01((t - (n > 1 ? (k / (n - 1)) * (1 - share) : 0)) / share);
/** A move has landed at 1 — floating point leaves the last one a hair short of it. */
const LANDED = 1 - 1e-9;
const landed = (t) => (t >= LANDED ? 1 : t);
const lerp = (a, b, t) => a * (1 - t) + b * t;

/**
 * @param {{ states: any[], timing: any,
 *   members: Array<{ x: number, y: number, column: number, strip: number, order: number }>,
 *   bars: { long: { x: number, top: number, bottom: number }, short: { x: number, top: number, bottom: number } },
 *   copies: Array<{ x: number, top: number, bottom: number }> }} props
 *   `column`: the dot's x in the one column; `strip`: its x in the column on its side of the break; `order`: the rank it
 *   leaves the column in (poorest first). Every bar and copy is a vertical span in pixels.
 */
export function sceneAt(props, frame) {
  const at = (f) => fieldAt(f, frame, props.states, props.timing);
  const split = at("split");
  const fold = at("fold");
  const unfold = at("unfold");
  const stack = at("stack");
  const n = props.members.length;
  const folded = fold - unfold;

  let counted = 0;
  const members = props.members.map((m) => {
    const mv = landed(moveOf(split, m.order, n));
    if (mv === 1) counted += 1;
    const seat = lerp(m.column, m.x, ease(mv));
    return { x: lerp(seat, m.strip, folded), y: m.y, landed: mv === 1 ? 1 : 0 };
  });

  const bars = at("bars");
  const { short } = props.bars;
  const gone = 1 - ease(clamp01(unfold / 0.4));
  const copies = props.copies.map((c, k) => {
    const t = ease(landed(moveOf(stack, k, props.copies.length, SLIDE)));
    return {
      x: lerp(short.x, c.x, t),
      top: lerp(short.top, c.top, t),
      bottom: lerp(short.bottom, c.bottom, t),
      on: t > 0 ? gone : 0,
      landed: t === 1 ? 1 : 0,
    };
  });

  const grown = (b) => ({ x: b.x, top: lerp(b.bottom, b.top, bars), bottom: b.bottom });
  const rule = at("rule");
  return {
    title: at("title"),
    furniture: at("furniture"),
    members,
    counted,
    // Folded, a dot's x no longer reads as its income: the income ticks step back while the cloud is folded.
    incomeTicks: 1 - 0.8 * folded,
    counter: split > 0 ? 1 - rule : 0,
    rule,
    bars: { long: grown(props.bars.long), short: grown(short), values: bars },
    copies,
    times: at("times") * gone,
    source: at("source"),
  };
}
