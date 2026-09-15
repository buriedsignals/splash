// THE PICTURE AT ONE FRAME — pure arithmetic, run by the composition in Chrome and by the tests in Bun. Browser-safe.
// Every area is in px² of the one box the treemap fills, one megawatt the same area everywhere; nothing here changes a
// cell's area, only where it sits and what shape it takes.
//
//   - WHOLE: one block grows from the box's left edge, its width the running total, the total counting.
//   - SPLIT: seams of the ground cut the block into its cells, largest first; each cell's words arrive with its seam.
//   - FILL: in every cell the wind-and-solar part rises from the floor to its share of the cell, a midline across each.
//   - FLOOD: the cells past the middle fill to the top, one after the other, the count of countries climbing; the
//     others drain.
//   - GATHER: the flooded cells slide onto the largest cell and pack into its lower part, each keeping its area — the
//     centre travels, the aspect ratio turns on a logarithmic scale, the width and height follow from the area.
//   - BACK: the same move reversed; then the ring.

import { EVENT_ORDER, progressOf } from "#shared/chart-video/timing.ts";
import { clamp01, ease } from "../../skills/scrolly/assets/reveal.mjs";

export const WINDOWS = Object.freeze({
  establish: { title: [-1, 0] },
  reference: { title: [0, 0.2], whole: [0.12, 0.95] },
  reveal: { split: [0, 0.95] },
  subject: { fill: [0, 0.26], flood: [0.3, 0.5], gather: [0.54, 0.92] },
  conclusion: { back: [0, 0.45], ring: [0.4, 0.8], source: [0.3, 0.75] },
});
const LINEAR = new Set(["whole", "fill"]);
/** Of a staggered window, how much one cell's move takes. */
export const MOVE = { split: 0.3, flood: 0.45, gather: 0.55 };

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

export const gwText = (v) => `${v}\u00A0GW`;
export const paysText = (n) => `${n}\u00A0pays`;

export const moveOf = (t, k, n, move) => clamp01((t - (n > 1 ? (k / (n - 1)) * (1 - move) : 0)) / move);

/** A rectangle carried from `a` to `b`, keeping the area it has at both ends at every step. */
export function morph(a, b, t) {
  const area = a.w * a.h;
  const cx = a.x + a.w / 2 + (b.x + b.w / 2 - (a.x + a.w / 2)) * t;
  const cy = a.y + a.h / 2 + (b.y + b.h / 2 - (a.y + a.h / 2)) * t;
  const ratio = Math.exp(Math.log(a.w / a.h) + (Math.log(b.w / b.h) - Math.log(a.w / a.h)) * t);
  const w = Math.sqrt(area * ratio);
  const h = area / w;
  return { x: cx - w / 2, y: cy - h / 2, w, h };
}

/**
 * @param {{ states: any[], timing: any, box: { x: number, y: number, w: number, h: number }, totalGw: number,
 *   cells: Array<{ key: string, rect: any, target: any, share: number, tipped: boolean, countries: number,
 *   values: Array<{ mid: number }>, names: Array<{ mid: number }> }> }} props
 *   `cells` sorted by area, largest first; `target` is where a tipped cell packs, null for the others.
 */
export function sceneAt(props, frame) {
  const at = (f) => fieldAt(f, frame, props.states, props.timing);
  const whole = at("whole");
  const split = at("split");
  const fill = at("fill");
  const flood = at("flood");
  const gather = at("gather");
  const back = at("back");
  const n = props.cells.length;
  const thread = props.cells.filter((c) => c.tipped).map((c) => c.key);
  const m = thread.length;
  let tipped = 0;
  const cells = props.cells.map((c, k) => {
    const seam = ease(moveOf(split, k, n, MOVE.split));
    const j = thread.indexOf(c.key);
    const flooded = j === -1 ? ease(flood) : ease(moveOf(flood, j, m, MOVE.flood));
    if (j !== -1 && flooded >= 1) tipped += c.countries;
    const level = c.share * fill + ((c.tipped ? 1 : 0) - c.share) * flooded;
    const g = j === -1 ? 0 : ease(moveOf(gather, j, m, MOVE.gather)) - ease(moveOf(back, j, m, MOVE.gather));
    return {
      key: c.key,
      rect: g === 0 ? c.rect : morph(c.rect, c.target, g),
      moved: g,
      seam,
      level,
      /** Each word (values, then names) on the wind and solar once the fill has passed its middle. */
      covered: [...c.values, ...c.names].map((l) => l.mid > c.rect.h * (1 - clamp01(level))),
      midline: fill * (1 - clamp01(flood * 2)),
      words: seam * (1 - clamp01(g * 3)),
    };
  });
  const lastLanded = m ? cells.find((c) => c.key === thread[m - 1]).moved : 0;
  return {
    title: at("title"),
    split,
    whole: { w: props.box.w * whole, count: Math.round(props.totalGw * whole), opacity: whole > 0 ? 1 - clamp01(split * 6) : 0 },
    cells,
    key: fill,
    tipped,
    sum: clamp01(lastLanded * 5 - 4) * (1 - clamp01(back * 6)),
    ring: at("ring"),
    source: at("source"),
  };
}
