// THE PICTURE AT ONE FRAME — pure arithmetic, run by the composition in Chrome and by the tests in Bun. Browser-safe.
//
// THE ARGUMENT IN THREE MOVES. Widths are TWh on one scale (`u` px a TWh), heights a share of the plot's 100 % on one scale, so
// a cell's area is TWh and every move keeps it:
//   - SPLIT: one whole block, the columns abutting, parts into six as the gaps open; no width changes.
//   - FILL: column after column the nine bands grow up from the foot, coal first. Linear: it traverses a measured axis.
//   - POUR: each coal cell drops out of its column and reshapes into its slot of one strip under the plot, its height eased
//     from the cell's to the strip's and its width always area ÷ height — so the area it carries never changes in flight. The
//     conclusion plays it backwards.

import { EVENT_ORDER, progressOf } from "#shared/chart-video/timing.ts";
import { clamp01, ease } from "../../skills/scrolly/assets/reveal.mjs";

export const WINDOWS = Object.freeze({
  establish: { title: [-1, 0] },
  reference: { title: [0, 0.1], split: [0.3, 0.8], furniture: [0.35, 0.8] },
  reveal: { fill: [0.02, 0.9], key: [0.45, 0.85] },
  subject: { focus: [0, 0.18], pour: [0.12, 0.74], label: [0.74, 0.92] },
  conclusion: { label: [0, 0.12], pour: [0.06, 0.52], focus: [0.3, 0.6], ring: [0.5, 0.85], source: [0.35, 0.8] },
});
const LINEAR = new Set(["fill"]);
/** A column's share of a staggered move. */
export const MOVE = 0.3;
export const POUR_MOVE = 0.6;
/** How far a stepped-back band fades. */
export const DIMMED = 0.2;

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

export const moveOf = (t, k, n, move = MOVE) => clamp01((t - (n > 1 ? (k / (n - 1)) * (1 - move) : 0)) / move);

/** A share's text: one decimal, a French comma, a no-break space before the sign. */
export const percentText = (share) => `${(share * 100).toFixed(1).replace(".", ",")}\u00A0%`;

const lerp = (a, b, t) => a + (b - a) * t;

/**
 * @param {{ states: any[], timing: any, tracked: string, plotLeft: number, plotBottom: number, H: number, u: number,
 *   colGap: number, strip: { top: number, h: number, pieces: Array<{ x: number, w: number }> },
 *   columns: Array<{ total: number, cum: number, bands: Array<{ key: string, share: number }> }> }} props
 */
export function sceneAt(props, frame) {
  const at = (f) => fieldAt(f, frame, props.states, props.timing);
  const title = at("title");
  const split = clamp01(at("split"));
  const fill = at("fill");
  const focus = clamp01(at("focus"));
  const pour = clamp01(at("pour"));
  const furniture = at("furniture");
  const { u, H, plotBottom, strip } = props;
  const n = props.columns.length;
  const poured = props.columns.map((c, i) => (c.bands.find((b) => b.key === props.tracked).share > 0 ? i : -1)).filter((i) => i >= 0);
  const totals = furniture * clamp01((split - 0.5) / 0.5) * (1 - clamp01(pour * 4));

  const columns = props.columns.map((c, i) => {
    const x = props.plotLeft + c.cum * u + i * props.colGap * split;
    const w = c.total * u;
    const grown = moveOf(fill, i, n) * H;
    let foot = 0;
    const cells = c.bands.map((band) => {
      const h = band.share * H;
      const y0 = foot;
      foot += h;
      const shown = Math.max(0, Math.min(h, grown - y0));
      const cell = { key: band.key, x, y: plotBottom - y0 - shown, w, h: shown, dim: band.key === props.tracked ? 0 : focus };
      if (band.key !== props.tracked) return cell;
      const j = poured.indexOf(i);
      const p = j === -1 ? pour : ease(moveOf(pour, j, poured.length, POUR_MOVE));
      if (p === 0) return cell;
      const piece = strip.pieces[i];
      const bottom = lerp(plotBottom, strip.top + strip.h, p);
      const hh = lerp(h, strip.h, p);
      if (!(h > 0)) return { ...cell, x: lerp(x, piece.x, p), y: bottom - hh, w: 0, h: hh };
      const ww = (w * h) / hh;
      const cx = lerp(x + w / 2, piece.x + piece.w / 2, p);
      return { ...cell, x: cx - ww / 2, y: bottom - hh, w: ww, h: hh };
    });
    return { x, w, base: { y: plotBottom - H, h: H - Math.min(grown, H) }, totals, cells };
  });

  return {
    title,
    furniture,
    wholeLabel: (1 - title) * (1 - clamp01(split * 4)),
    key: at("key"),
    focus,
    columns,
    label: at("label"),
    ring: at("ring"),
    source: at("source"),
  };
}
