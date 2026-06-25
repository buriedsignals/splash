// Pure geometry core for STACKED bar/column charts — framework-free (D3 = math).
// Sibling of bar-geometry.ts. Each category holds several series summed into one
// column; segment length = value, whole column = total. The value axis ALWAYS
// includes 0 (inherited baseline rule, stacked-bar.md). The reveal is the whole
// stack rising from the zero baseline — a pure function of a per-column progress,
// computed in the component, so it stays frame-deterministic for video.

import { scaleBand, scaleLinear } from "d3-scale";
import { formatNumber } from "./core/math";

export interface StackedData {
  catField: string;
  seriesFields: string[]; // stacking order, bottom → top
  rows: Record<string, string | number>[];
}

export interface StackedDims {
  width: number;
  height: number;
  padding: { top: number; right: number; bottom: number; left: number };
}

export interface StackSegment {
  seriesIndex: number;
  seriesKey: string;
  value: number;
  /** full rect at progress=1, inner coords (origin = padding corner) */
  x: number;
  y: number; // top edge (smaller y = higher up)
  w: number;
  h: number;
}

export interface StackedColumn {
  rawCat: string | number;
  total: number;
  bandX: number; // left edge of the band
  bandW: number; // band width
  segments: StackSegment[];
}

export interface StackedLayout {
  innerWidth: number;
  innerHeight: number;
  base: number; // screen y of value 0 — stacks grow FROM here (bottom)
  columns: StackedColumn[];
  valueTicks: { pos: number; label: string }[];
  /** [0, max] of the value domain actually used (always includes 0) */
  valueDomain: [number, number];
}

export function computeStackedLayout(
  data: StackedData,
  dims: StackedDims,
): StackedLayout {
  if (!data.rows.length)
    throw new Error("computeStackedLayout: data.rows is empty");
  if (!data.seriesFields.length)
    throw new Error("computeStackedLayout: seriesFields is empty");
  const { width, height, padding } = dims;
  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;
  if (innerWidth <= 0 || innerHeight <= 0)
    throw new Error("computeStackedLayout: padding exceeds dimensions");

  // parse + validate: every series value must be a finite, non-negative number
  // (a stack of negatives is not meaningful — out of scope).
  const parsed = data.rows.map((r) => {
    const values = data.seriesFields.map((k) => {
      const v = Number(r[k]);
      if (Number.isNaN(v) || v < 0)
        throw new Error(`invalid stacked value for "${k}": ${r[k]}`);
      return v;
    });
    return { rawCat: r[data.catField], values };
  });

  const totals = parsed.map((d) => d.values.reduce((s, v) => s + v, 0));
  const vMax = Math.max(0, ...totals);

  const band = scaleBand<string | number>()
    .domain(parsed.map((d) => d.rawCat))
    .range([0, innerWidth])
    .padding(0.28); // discrete columns, ~28% gap (bar.md rule 3)

  // vertical value scale: screen y grows downward → range [innerHeight, 0].
  const value = scaleLinear().domain([0, vMax]).nice().range([innerHeight, 0]);

  const niceDomain = value.domain() as [number, number];
  const base = value(0); // bottom anchor

  const bw = band.bandwidth();
  const columns: StackedColumn[] = parsed.map((d, ci) => {
    const bandX = band(d.rawCat) ?? 0;
    let cum = 0; // cumulative value from the baseline up
    const segments: StackSegment[] = d.values.map((v, si) => {
      const y0 = value(cum); // screen y of segment bottom
      const y1 = value(cum + v); // screen y of segment top (higher → smaller y)
      cum += v;
      return {
        seriesIndex: si,
        seriesKey: data.seriesFields[si],
        value: v,
        x: bandX,
        y: y1,
        w: bw,
        h: y0 - y1,
      };
    });
    return { rawCat: d.rawCat, total: totals[ci], bandX, bandW: bw, segments };
  });

  const valueTicks = value
    .ticks(5)
    .map((t) => ({ pos: value(t), label: formatNumber(t) }));

  return {
    innerWidth,
    innerHeight,
    base,
    columns,
    valueTicks,
    valueDomain: niceDomain,
  };
}

/**
 * The drawn rect for ONE segment while its column rises from the zero baseline
 * to `progress` (0→1). The whole stack grows together: the visible top edge is
 * `base - totalScreenHeight * p`; a segment is clipped to whatever of it lies
 * below that edge. So the baseline segment appears first and the stack assembles
 * upward. Pure function → reproducible video frames. Returns null when the
 * rising edge has not yet reached the segment (nothing to draw).
 */
export function growSegment(
  seg: StackSegment,
  column: StackedColumn,
  base: number,
  progress: number,
): { x: number; y: number; w: number; h: number } | null {
  const p = progress < 0 ? 0 : progress > 1 ? 1 : progress;
  const totalH = column.segments.reduce((s, g) => s + g.h, 0);
  const risingTop = base - totalH * p; // current top edge of the whole stack
  const segBottom = seg.y + seg.h;
  const visibleTop = Math.max(seg.y, risingTop);
  if (visibleTop >= segBottom - 0.01) return null; // not revealed yet
  return { x: seg.x, y: visibleTop, w: seg.w, h: segBottom - visibleTop };
}

/** Fraction of a column revealed at `progress` (for fading its total label). */
export function columnProgress(progress: number): number {
  return progress < 0 ? 0 : progress > 1 ? 1 : progress;
}
