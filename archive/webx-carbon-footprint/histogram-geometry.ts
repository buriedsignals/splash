/**
 * The pure core of the "carbon footprint spread" web beat: data to coordinates. No colour, no
 * font, no React.
 */

import { scaleLinear } from "d3-scale";

export type Bin = { lo: number; hi: number; count: number; entities: string[] };

/** Bins one continuous variable into contiguous, equal-width intervals — the same "value range
 *  divided into about ten roughly-round bins" default `references/types/histogram.md` names, and
 *  the exact bin edges the static sibling verified render a legible shape with. Keeps each bin's
 *  own member country names, never printed on the static frame's bars (only their count is), so
 *  this format's hover/tap/keyboard-focus layer has something real to answer with. */
export function makeBins(
  rows: { entity: string; value: number }[],
  { lo, hi, width }: { lo: number; hi: number; width: number },
): Bin[] {
  const n = Math.round((hi - lo) / width);
  const bins: Bin[] = Array.from({ length: n }, (_, i) => ({
    lo: lo + i * width,
    hi: lo + (i + 1) * width,
    count: 0,
    entities: [],
  }));
  for (const row of rows) {
    const idx = Math.min(
      n - 1,
      Math.max(0, Math.floor((row.value - lo) / width)),
    );
    bins[idx].count += 1;
    bins[idx].entities.push(row.entity);
  }
  for (const bin of bins) bin.entities.sort();
  return bins;
}

/** Data to coordinates: bins to bar rectangles, edge-to-edge on the variable's own real unit
 *  (never bin index), height a zero-anchored count (`references/types/histogram.md`). */
export function histogramGeometry(
  bins: Bin[],
  {
    width,
    height,
    padding,
  }: {
    width: number;
    height: number;
    padding: { top: number; right: number; bottom: number; left: number };
  },
) {
  const plot = {
    left: padding.left,
    top: padding.top,
    right: width - padding.right,
    bottom: height - padding.bottom,
  };
  const x = scaleLinear()
    .domain([bins[0].lo, bins[bins.length - 1].hi])
    .range([plot.left, plot.right]);
  const y = scaleLinear()
    .domain([0, Math.max(...bins.map((b) => b.count))])
    .nice()
    .range([plot.bottom, plot.top]);

  const bars = bins.map((b) => ({
    lo: b.lo,
    hi: b.hi,
    count: b.count,
    entities: b.entities,
    x: x(b.lo),
    width: x(b.hi) - x(b.lo),
    y: y(b.count),
    height: y(0) - y(b.count),
  }));

  return {
    plot,
    bars,
    x,
    y,
    ticksY: y.ticks(5).map((v) => ({ value: v, y: y(v) })),
  };
}
