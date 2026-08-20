/**
 * The pure core of the flat-inspections beat: data to coordinates, and the number formatting that
 * labels them. No colour, no font, no React — the same split `proof/web-co2-ranking/bar-geometry.ts`
 * keeps for its own beat, copied here rather than imported (a story workspace is not a skill; see
 * that file's own header for why this project duplicates rather than links across a skill/story
 * boundary).
 */

import { scaleLinear } from "d3-scale";

export type Row = { name: string; value: number };

/** English, one decimal — this beat's title, caveat and source are all English
 *  (`source/article.md`), and `render-web.mjs` ships the page as `<html lang="en">`. */
export function en(value: number, decimals = 0): string {
  return new Intl.NumberFormat("en-GB", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

export type PositionedRow = Row & {
  x0: number;
  x1: number;
  barWidth: number;
  top: number;
  height: number;
  centerY: number;
};

/**
 * Data to coordinates for a horizontal bar chart, ONE row per region, a shared zero baseline.
 *
 * The domain here is `[0, maxValue]`, never `[min, max]` — a bar's length is the whole encoding
 * (`bar-and-column.md`: zero baseline, non-negotiable), so this geometry never asks d3 to fit a
 * scale to the SPREAD of the series. That is what keeps this file safe on a completely flat input:
 * with every reading equal to 7, `maxValue` is still 7, not 0, and `scaleLinear().domain([0, 7])`
 * is an ordinary, non-degenerate scale — checked directly, not assumed (see this beat's own
 * `render-web.mjs`, which prints the result of probing the DEGENERATE alternative,
 * `domain([7, 7])`, before drawing anything, so the beat records what was checked rather than
 * asserting it from memory).
 */
export function rankingGeometry(
  rows: Row[],
  {
    width,
    height,
    padding,
    rowHeight,
    gapRatio,
  }: {
    width: number;
    height: number;
    padding: { top: number; right: number; bottom: number; left: number };
    rowHeight: number;
    gapRatio: number;
  },
) {
  if (rows.length === 0) throw new Error("a flat-inspections beat needs at least one row, got 0");
  const plot = {
    left: padding.left,
    top: padding.top,
    right: width - padding.right,
    bottom: height - padding.bottom,
  };
  const maxValue = Math.max(...rows.map((r) => r.value));
  const x = scaleLinear().domain([0, maxValue]).range([plot.left, plot.right]);
  const barHeight = rowHeight * (1 - gapRatio);
  const positioned: PositionedRow[] = rows.map((r, i) => {
    const bandTop = plot.top + i * rowHeight;
    const top = bandTop + (rowHeight - barHeight) / 2;
    return {
      ...r,
      x0: x(0),
      x1: x(r.value),
      barWidth: x(r.value) - x(0),
      top,
      height: barHeight,
      centerY: top + barHeight / 2,
    };
  });
  return { plot, rows: positioned, x, maxValue };
}
