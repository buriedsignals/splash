// THE PICTURE AT ONE FRAME — pure arithmetic, run by the composition in Chrome and by the tests in Bun. Browser-safe.
//
// THE ARGUMENT IN FOUR MOVES, every length on one scale so a part keeps its length as it travels:
//   - LEVEL: each country's 1990 level grows from the zero line at the left of its column, row after row.
//   - SHRINK: each level goes to its 2024 level, the largest fall first; the part lost stays, pale, where it was; the count
//     is the falls landed. (Croatia's level grows a sliver instead.)
//   - FLIP: the level bars go, and every part lost slides across to the zero line at the right of its column, becoming the
//     change drawn from zero — the diverging bar.
//   - ZOOM: the camera closes onto the zero line: the scale multiplies by up to ×250 (geometric, so the move reads at an even
//     pace) and the zero line travels to the middle of the column; every fall runs out of the frame, Croatia's +0,03 t
//     becomes a length. BACK undoes it.

import { EVENT_ORDER, progressOf } from "#shared/chart-video/timing.ts";
import { clamp01, ease } from "../../skills/scrolly/assets/reveal.mjs";

export const WINDOWS = Object.freeze({
  establish: { title: [-1, 0] },
  reference: { title: [0, 0.12], furniture: [0.1, 0.35], level: [0.3, 0.95] },
  reveal: { shrink: [0.02, 0.9] },
  subject: { flip: [0, 0.35], zoom: [0.45, 0.8] },
  conclusion: { back: [0, 0.3], focus: [0.35, 0.6], source: [0.5, 0.85] },
});
const LINEAR = new Set(["level", "shrink"]);
export const MOVE = 0.15;

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

/** A change's text: its sign (a true minus), two decimals, a French comma. */
export const changeText = (v) => `${v < 0 ? "−" : "+"}${Math.abs(v).toFixed(2).replace(".", ",")}`;

const lerp = (a, b, t) => a + (b - a) * t;

/**
 * @param {{ states: any[], timing: any, subject: string, unit: number, zoomBy: number,
 *   columns: Array<{ start: number, end: number, zero: number, middle: number }>,
 *   rows: Array<{ key: string, from: number, to: number, change: number, column: number }> }} props
 */
export function sceneAt(props, frame) {
  const at = (f) => fieldAt(f, frame, props.states, props.timing);
  const level = at("level");
  const shrink = at("shrink");
  const flip = at("flip");
  const camera = clamp01(at("zoom") - at("back"));
  const focus = at("focus");
  const scale = props.zoomBy ** camera;
  const n = props.rows.length;
  // The shrinks from the largest fall (the last row) to the rise (the first).
  const order = props.rows.map((_, i) => n - 1 - i);
  let landed = 0;
  const rows = props.rows.map((r, i) => {
    const c = props.columns[r.column];
    const zero = lerp(c.zero, c.middle, camera);
    const grown = ease(moveOf(level, i, n));
    const raw = moveOf(shrink, order.indexOf(i), n);
    if (raw >= 1 && r.change < 0) landed += 1;
    const gone = ease(raw);
    const now = lerp(r.from, r.to, gone) * grown;
    // The part that changed: where it is on the level bar — the pale part lost past the 2024 end, or the sliver gained —
    // then as a change from the zero line on the right.
    const atLevel = r.change < 0 ? { x: c.start + now * props.unit, w: Math.max(0, r.from * grown - now) * props.unit } : { x: c.start + r.from * props.unit, w: r.change * props.unit * gone };
    const asChange = { x: zero + Math.min(r.change, 0) * props.unit * scale, w: Math.abs(r.change) * props.unit * scale };
    return {
      level: { x: c.start, w: (r.change < 0 ? now : Math.min(now, r.from * grown)) * props.unit, opacity: 1 - flip },
      part: { x: lerp(atLevel.x, asChange.x, flip), w: lerp(atLevel.w, asChange.w, flip), shown: gone > 0 ? 1 : 0 },
      zero,
      tip: zero + r.change * props.unit * scale,
      stepBack: r.key === props.subject ? 0 : focus,
    };
  });
  return {
    title: at("title"),
    furniture: at("furniture"),
    rows,
    landed,
    counting: shrink > 0 ? 1 : 0,
    flip,
    camera,
    scale,
    ring: focus,
    source: at("source"),
  };
}
