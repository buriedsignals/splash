// THE PICTURE AT ONE FRAME — pure arithmetic, run by the composition in Chrome and by the tests in Bun. Browser-safe.
//
// THE ARGUMENT, every length on one scale from zero so a part keeps its length as it travels:
//   - LEVEL + CARRY: the 2015 total grows from zero; a copy slides across to the 2024 slot.
//   - SPLIT + MORPH: seams cut both totals into their members (fossil, nuclear, renewables, bottom to top); the copy's
//     members go to their 2024 lengths, restacking from zero, and its counter is the stack's own height to the tenth.
//   - DETACH: in the order the bridge walks them, the part 2024 gained (the top of the copy's renewables) and the parts 2015
//     lost (the top of each fallen member in the 2015 total) light up, then slide onto the
//     running total in their slot: the steps of the waterfall, carried across, then set onto it. The names ride first.
//   - CLOSE + BRACKET: the seams close, the net change is traced between the two totals.

import { EVENT_ORDER, progressOf } from "#shared/chart-video/timing.ts";
import { clamp01, ease } from "../../skills/scrolly/assets/reveal.mjs";

export const WINDOWS = Object.freeze({
  establish: { title: [-1, 0] },
  reference: { title: [0, 0.12], furniture: [0.05, 0.35], level: [0.12, 0.6], carry: [0.6, 0.95] },
  reveal: { split: [0, 0.3], morph: [0.25, 0.95] },
  subject: { seat: [0, 0.3], detach: [0.08, 0.95] },
  conclusion: { close: [0, 0.5], bracket: [0.1, 0.7], source: [0.3, 0.8] },
});
/** Traversals of the value axis run at the data's pace. */
const LINEAR = new Set(["level", "morph"]);
/** Each part's move is this share of `detach`; the three overlap. */
export const MOVE = 0.5;
/** Within a part's move, the share spent lighting up before it slides. */
export const LIGHT = 0.3;

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
const lerp = (a, b, t) => a + (b - a) * t;

/** The key of a counter's text: the value in tenths. */
export const tenthsKey = (v) => String(Math.round(v * 10));

/**
 * @param {{ states: any[], timing: any, baseline: number, unit: number, barW: number, slots: Array<{ x: number }>,
 *   stack: string[], opening: number,
 *   members: Array<{ key: string, from: number, to: number, change: number, name: { beside: { x: number, y: number }, seat: { x: number, y: number } } }>,
 *   steps: Array<{ key: string, from: number, to: number }> }} props
 */
export function sceneAt(props, frame) {
  const at = (f) => fieldAt(f, frame, props.states, props.timing);
  const yOf = (v) => props.baseline - v * props.unit;
  const level = at("level");
  const carry = at("carry");
  const morph = at("morph");
  const seat = at("seat");
  const detach = at("detach");
  const byKey = Object.fromEntries(props.members.map((m) => [m.key, m]));

  /** A stack's segments from zero, bottom to top, at the given member values. */
  const stackOf = (valueOf) => {
    let base = 0;
    return props.stack.map((key) => {
      const v = valueOf(byKey[key]);
      const seg = { key, base, y: yOf(base + v), h: v * props.unit };
      base += v;
      return seg;
    });
  };
  const s2015 = stackOf((m) => m.from);
  const s2024 = stackOf((m) => lerp(m.from, m.to, morph));
  const height = s2024.reduce((t, seg) => t + seg.h, 0) / props.unit;

  const n = props.steps.length;
  const parts = props.steps.map((step, k) => {
    const m = byKey[step.key];
    const p = moveOf(detach, k, n);
    const light = ease(clamp01(p / LIGHT));
    // The slide is carried across first, at the height the part left, then set down (or up) onto the running total:
    // no part crosses a slot another part or a value already holds.
    const slide = clamp01((p - LIGHT) / (1 - LIGHT));
    const across = ease(clamp01(slide / 0.5));
    const onto = ease(clamp01((slide - 0.5) / 0.5));
    // Where the part is before it moves: the gain on top of 2015's length in the 2024 copy, a loss on top of 2024's
    // length in the 2015 total.
    const rises = m.change > 0;
    const base = (rises ? s2024 : s2015).find((seg) => seg.key === m.key).base;
    const from = { x: props.slots[rises ? 4 : 0].x, lo: base + Math.min(m.from, m.to) };
    const to = { x: props.slots[k + 1].x, lo: Math.min(step.from, step.to) };
    const lo = lerp(from.lo, to.lo, onto);
    const length = Math.abs(m.change);
    return { key: m.key, x: lerp(from.x, to.x, across), y: yOf(lo + length), h: length * props.unit, light, slide, landed: clamp01((slide - 0.85) / 0.15) };
  });

  return {
    title: at("title"),
    furniture: at("furniture"),
    opening: { x: props.slots[0].x, y: yOf(props.opening * level), h: props.opening * level * props.unit, label: clamp01((level - 0.85) / 0.15) },
    copy: { x: lerp(props.slots[0].x, props.slots[4].x, carry), shown: carry > 0 ? 1 : 0, y: yOf(height), h: height * props.unit, segments: s2024 },
    stack2015: s2015,
    split: at("split"),
    seams: at("split") * (1 - at("close")),
    countKey: tenthsKey(height),
    parts,
    names: props.members.map((m) => ({ x: lerp(m.name.beside.x, m.name.seat.x, seat), y: lerp(m.name.beside.y, m.name.seat.y, seat), opacity: at("split") })),
    labels: parts.map((p) => p.landed),
    connectors: parts.map((p) => p.landed),
    bracket: at("bracket"),
    source: at("source"),
  };
}
