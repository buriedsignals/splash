// THE PICTURE AT ONE FRAME — pure arithmetic, run by the composition in Chrome and by the tests in Bun. Browser-safe.
//
// THE ARGUMENT: a heatmap row is one country's whole production cut into its sources.
//   - GROW is linear in share (it traverses a measured axis): row after row, a bar of 100 % grows across the grid's width W,
//     each source a segment `share × W` long, in column order. The count is the bars whose low-carbon part has passed the
//     94 % line.
//   - SPLIT: row after row, every segment slides to its source's column and folds into its cell — its left edge and width
//     travel from the segment's to the cell's — while its colour turns from the two-tone bar to its class's.
//   - SWAP / PART: the seven reorder by route (each row travels from its rank slot to its route slot) and the routes part by a
//     gap: the first route rises by it, the last and the rows under it fall by it — so the whole block stays inside the grid.
//   - ROUTES: the one bracket over the seven gives way to one bracket a route, and the nuclear column of the seven is ringed.

import { EVENT_ORDER, progressOf } from "#shared/chart-video/timing.ts";
import { clamp01, ease } from "../../skills/scrolly/assets/reveal.mjs";

export const WINDOWS = Object.freeze({
  establish: { title: [-1, 0] },
  reference: { title: [0, 0.1], grow: [0.06, 0.94], floor: [0, 0.2] },
  reveal: { floor: [0, 0.25], split: [0.04, 0.84], grid: [0.45, 0.95] },
  subject: { filter: [0, 0.2], swap: [0.1, 0.4], part: [0.35, 0.65], routes: [0.55, 0.85] },
  conclusion: { routes: [0, 0.25], part: [0.15, 0.45], swap: [0.3, 0.6], filter: [0.45, 0.8], source: [0.3, 0.8] },
});
const LINEAR = new Set(["grow", "split"]);
/** Of a staggered move, the share one row's own move takes. */
export const ROW_MOVE = 0.3;
/** How far a stepped-back row's words fade. */
export const STEPPED_WORDS = 0.65;

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

export const moveOf = (t, k, n, move = ROW_MOVE) => clamp01((t - (n > 1 ? (k / (n - 1)) * (1 - move) : 0)) / move);
const lerp = (a, b, t) => a + (b - a) * t;

/**
 * @param {{ states: any[], timing: any, gapRows: number, floor: number,
 *   grid: { left: number, right: number, top: number, pitch: number, gapH: number, cellW: number, gap: number },
 *   sources: Array<{ lowCarbon: boolean }>,
 *   rows: Array<{ lowCarbon: number, route: number | null, routeSlot: number, shares: number[] }>,
 *   counter: { near: number }, bracket: { labelX: number } }} props
 */
export function sceneAt(props, frame) {
  const at = (f) => fieldAt(f, frame, props.states, props.timing);
  const { grid } = props;
  const W = grid.right - grid.left;
  const n = props.rows.length;
  const grow = at("grow");
  const split = at("split");
  const swap = clamp01(at("swap"));
  const part = clamp01(at("part"));
  const filter = clamp01(at("filter"));
  const routes = clamp01(at("routes"));
  const floorX = (props.floor / 100) * W;
  const lastRoute = Math.max(...props.rows.map((r) => r.route ?? 0));

  let count = 0;
  const rows = props.rows.map((row, r) => {
    const grown = moveOf(grow, r, n);
    const front = grown * W;
    const folded = ease(moveOf(split, r, n));
    const offset = row.route === null ? 1 : row.route === 0 ? -1 : row.route === lastRoute ? 1 : 0;
    const y = grid.top + grid.gapH + lerp(r, row.routeSlot, swap) * grid.pitch + offset * part * grid.gapH;
    let cum = 0;
    let low = 0;
    const cells = row.shares.map((share, j) => {
      const segX = cum;
      const segW = (share / 100) * W;
      cum += segW;
      const visible = Math.max(0, Math.min(segW, front - segX));
      if (props.sources[j].lowCarbon) low += visible;
      return { x: grid.left + lerp(segX, j * grid.cellW, folded), w: lerp(segW, grid.cellW, folded), visible, folded };
    });
    if (low >= floorX - 1e-6 && row.lowCarbon > props.floor) count += 1;
    return { y, grown, folded, cells, stepped: row.route === null ? filter : 0 };
  });

  const span = (pick) => {
    const ys = rows.filter((_, r) => pick(props.rows[r])).map((row) => row.y);
    return { top: Math.min(...ys), bottom: Math.max(...ys) + grid.pitch - grid.gap };
  };
  const seven = span((row) => row.route !== null);
  const drawn = grow > 0 ? 1 : 0;
  return {
    title: at("title"),
    floor: at("floor"),
    grid: at("grid"),
    source: at("source"),
    routes,
    rows,
    count,
    counting: drawn * (1 - routes),
    /** The count stands by the bars' end, and moves out to its bracket as the share column comes in. */
    counterX: lerp(props.counter.near, props.bracket.labelX, at("grid")),
    whole: { ...seven, opacity: at("grid") * (1 - routes) },
    brackets: Array.from({ length: lastRoute + 1 }, (_, g) => ({ ...span((row) => row.route === g), opacity: routes })),
    ring: { ...seven, opacity: routes },
  };
}
