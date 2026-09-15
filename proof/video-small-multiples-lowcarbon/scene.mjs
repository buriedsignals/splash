// THE PICTURE AT ONE FRAME — pure arithmetic, run by the composition in Chrome and by the tests in Bun. Browser-safe.
// Every height is a share in %, on the one 0–100 % scale every panel is drawn against; nothing here changes a height,
// only where it sits.
//
//   - LEVEL: sixteen 2000 bars grow side by side in one row, on one baseline, in the grid's first order.
//   - CUT: each bar travels, keeping its height, from its seat in the row to its own panel; its name arrives.
//   - GROW: panel after panel a copy of the 2000 bar slides out beside it, then rises to 2024; the gain counts.
//   - DETACH: every part added since 2000 drops to the baseline keeping its length; the rest of the 2024 bar steps away.
//   - REORDER: every panel glides at once to its cell in the order of the 2000 start — panels moving one after another
//     landed on cells not yet left; the words give way while they cross.
//   - BACK: every added part climbs back onto its level, the 2024 bars whole again; then the rings.

import { EVENT_ORDER, progressOf } from "#shared/chart-video/timing.ts";
import { clamp01, ease } from "../../skills/scrolly/assets/reveal.mjs";

export const WINDOWS = Object.freeze({
  establish: { title: [-1, 0] },
  reference: { title: [0, 0.16], furniture: [0.05, 0.4], level: [0.06, 0.48], cut: [0.5, 0.98] },
  reveal: { grow: [0, 0.95] },
  subject: { detach: [0, 0.3], reorder: [0.34, 0.95] },
  conclusion: { back: [0, 0.4], ring: [0.38, 0.72], source: [0.3, 0.72] },
});
const LINEAR = new Set(["level", "cut", "grow"]);
export const MOVE = 0.4;
/** Of a panel's grow, the share spent sliding the copy out beside its 2000 bar before it rises. */
export const SLIDE = 0.35;

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

/** A gain's count. */
export const countText = (v) => `+${v}`;

export const moveOf = (t, k, n) => clamp01((t - (n > 1 ? (k / (n - 1)) * (1 - MOVE) : 0)) / MOVE);
const lerp = (a, b, t) => a + (b - a) * t;

/**
 * @param {{ states: any[], timing: any, before: string[], byStart: string[],
 *   cells: Array<{ x: number, top: number }>, seats: Array<{ x: number, top: number }>,
 *   rows: Array<{ key: string, from: number, to: number, delta: number }> }} props
 */
export function sceneAt(props, frame) {
  const at = (f) => fieldAt(f, frame, props.states, props.timing);
  const n = props.rows.length;
  const levelT = at("level");
  const cutT = at("cut");
  const growT = at("grow");
  const detach = at("detach");
  const back = at("back");
  const reorder = at("reorder");
  const words = (1 - 2 * reorder) ** 2;
  const rows = props.rows.map((row) => {
    const k = props.before.indexOf(row.key);
    const s = props.byStart.indexOf(row.key);
    const cut = ease(moveOf(cutT, k, n));
    const gridX = lerp(props.cells[k].x, props.cells[s].x, reorder);
    const gridTop = lerp(props.cells[k].top, props.cells[s].top, reorder);
    const g = moveOf(growT, k, n);
    const rise = ease(clamp01((g - SLIDE) / (1 - SLIDE)));
    // The added part sits on the level, at the baseline while detached, on the level again once back.
    const on = 1 - detach + back;
    return {
      key: row.key,
      x: lerp(props.seats[k].x, gridX, cut),
      top: lerp(props.seats[k].top, gridTop, cut),
      cut,
      level: row.from * ease(moveOf(levelT, k, n)),
      copy:
        g > 0
          ? {
              slide: ease(clamp01(g / SLIDE)),
              lower: { h: row.from, opacity: clamp01(1 - 2 * (detach - back)) },
              gain: { from: row.from * on, to: row.from * on + row.delta * rise },
            }
          : null,
      count: g > 0 ? Math.round(row.delta * rise) : null,
      name: clamp01((cut - 0.6) / 0.4) * words,
      words,
    };
  });
  return {
    title: at("title"),
    furniture: at("furniture"),
    rows,
    ring: at("ring"),
    source: at("source"),
  };
}
