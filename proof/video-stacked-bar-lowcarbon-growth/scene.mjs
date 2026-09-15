// THE PICTURE AT ONE FRAME — pure arithmetic, run by the composition in Chrome and by the tests in Bun. Browser-safe.
// Every length is in TWh, on the one scale the frame maps; nothing here changes a length, only where it sits.
//
//   - LEVEL: the twelve 2000 levels grow from zero, row after row in their 2000 order, each number past its end.
//   - GROW: row after row the part added by 2024 extends from the level's end, its gain counting; the number gives way.
//   - COPIES: copies of the adder's level lift from its bar onto the incumbent's row and lay end to end from zero.
//   - DETACH: every added part slides off its level to zero keeping its length; the levels step back; the copies leave.
//   - REORDER: every row glides to its slot in the order of gain.
//   - BACK: every added part slides back onto its level, the levels return — the whole stack; then the rings.

import { EVENT_ORDER, progressOf } from "#shared/chart-video/timing.ts";
import { clamp01, ease } from "../../skills/scrolly/assets/reveal.mjs";

export const WINDOWS = Object.freeze({
  establish: { title: [-1, 0] },
  reference: { title: [0, 0.16], furniture: [0.05, 0.4], level: [0.1, 0.95] },
  reveal: { grow: [0, 0.95] },
  subject: { copies: [0, 0.36], detach: [0.4, 0.6], reorder: [0.62, 0.97] },
  conclusion: { back: [0, 0.42], ring: [0.4, 0.75], source: [0.3, 0.75] },
});
const LINEAR = new Set(["level", "grow", "copies"]);
export const MOVE = 0.4;
/** How far a level steps back while its added part stands at zero. */
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

/** A gain's count, and the copies' count. */
export const countText = (v) => `+${v}`;
export const copyText = (n) => `×${n}`;

export const moveOf = (t, k, n) => clamp01((t - (n > 1 ? (k / (n - 1)) * (1 - MOVE) : 0)) / MOVE);

/**
 * @param {{ states: any[], timing: any, before: string[], byGain: string[], adder: string, incumbent: string, copies: number,
 *   rows: Array<{ key: string, level: number, growth: number }> }} props
 */
export function sceneAt(props, frame) {
  const at = (f) => fieldAt(f, frame, props.states, props.timing);
  const n = props.rows.length;
  const levelT = at("level");
  const growT = at("grow");
  const detach = at("detach");
  const back = at("back");
  const reorder = at("reorder");
  const rows = props.rows.map((row) => {
    const k = props.before.indexOf(row.key);
    const lv = ease(moveOf(levelT, k, n));
    const thin = ease(moveOf(growT, k, n));
    // The added part sits on the level's end, at zero while detached, on the level again once back.
    const from = row.level * (1 - detach + back);
    return {
      key: row.key,
      slot: k + (props.byGain.indexOf(row.key) - k) * reorder,
      level: { w: row.level * lv, opacity: 1 - (1 - STEPPED_BACK) * (detach - back) },
      levelText: lv * (1 - clamp01(thin * 6)),
      gain: { from, to: from + row.growth * thin },
      count: thin > 0 ? Math.round(row.growth * thin) : null,
    };
  });

  const adder = props.rows.find((r) => r.key === props.adder);
  const adderSlot = rows.find((r) => r.key === props.adder).slot;
  const incumbentSlot = rows.find((r) => r.key === props.incumbent).slot;
  const copiesT = at("copies");
  const copies = Array.from({ length: props.copies }, (_, k) => {
    const p = ease(moveOf(copiesT, k, props.copies));
    const from = k * adder.level * p;
    return { slot: adderSlot + (incumbentSlot - adderSlot) * p, from, to: from + adder.level, landed: p >= 1 };
  });
  return {
    title: at("title"),
    furniture: at("furniture"),
    rows,
    copies,
    copyCount: copies.filter((c) => c.landed).length,
    copyOpacity: copiesT > 0 ? 1 - clamp01(detach * 4) : 0,
    /** The names and counts give way while the rows cross, and return at their new slots. */
    words: (1 - 2 * reorder) ** 2,
    ring: at("ring"),
    source: at("source"),
  };
}
