// Pure geometry core for HISTOGRAMS — framework-free (D3 = math: d3-array bin +
// d3-scale). Bins ONE continuous variable into contiguous intervals; each bar's
// height is the COUNT in that bin. Bars TOUCH (no gap) — the defining histogram
// rule (histogram.md rule 2). The count axis includes 0 (length encoding). Growth
// from the baseline is a pure function of a per-bar progress in the component.

import { scaleLinear } from "d3-scale";
import { bin as d3bin, max as d3max, quantileSorted } from "d3-array";

export interface HistogramData {
  valueField: string;
  rows: Record<string, string | number>[];
}

export interface HistogramDims {
  width: number;
  height: number;
  padding: { top: number; right: number; bottom: number; left: number };
}

export interface HistogramOptions {
  binWidth?: number; // explicit bin width; else ~range/10 rounded
}

export interface HistBar {
  index: number;
  x0: number; // bin lower edge (value)
  x1: number; // bin upper edge (value)
  count: number;
  /** full rect at progress=1, inner coords */
  x: number;
  y: number;
  w: number;
  h: number;
  base: number; // screen y of count 0
}

export interface HistogramLayout {
  innerWidth: number;
  innerHeight: number;
  base: number;
  bars: HistBar[];
  /** count-axis ticks */
  countTicks: { pos: number; label: string }[];
  /** value-axis ticks at the bin EDGES */
  edgeTicks: { pos: number; label: string }[];
  countDomain: [number, number];
  median: number;
  medianX: number; // screen x of the median value
}

function niceBinWidth(range: number): number {
  const raw = range / 10;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const norm = raw / mag;
  const step = norm >= 5 ? 5 : norm >= 2 ? 2 : 1;
  return step * mag;
}

export function computeHistogramLayout(
  data: HistogramData,
  dims: HistogramDims,
  options: HistogramOptions = {},
): HistogramLayout {
  if (!data.rows.length)
    throw new Error("computeHistogramLayout: data.rows is empty");
  const { width, height, padding } = dims;
  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;
  if (innerWidth <= 0 || innerHeight <= 0)
    throw new Error("computeHistogramLayout: padding exceeds dimensions");

  const values = data.rows.map((r) => {
    const v = Number(r[data.valueField]);
    if (Number.isNaN(v))
      throw new Error(`invalid value: ${r[data.valueField]}`);
    return v;
  });
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  const binWidth = options.binWidth ?? niceBinWidth(hi - lo || 1);

  // contiguous edges from a rounded-down floor to above the max
  const start = Math.floor(lo / binWidth) * binWidth;
  const end = Math.ceil((hi + 1e-9) / binWidth) * binWidth;
  const edges: number[] = [];
  for (let e = start; e <= end + 1e-9; e += binWidth) edges.push(e);

  const binner = d3bin<number, number>()
    .domain([start, end])
    .thresholds(edges.slice(1, -1));
  const bins = binner(values);

  const maxCount = d3max(bins, (b) => b.length) ?? 0;

  const xScale = scaleLinear().domain([start, end]).range([0, innerWidth]);
  const yScale = scaleLinear()
    .domain([0, maxCount])
    .nice()
    .range([innerHeight, 0]);
  const niceCount = yScale.domain() as [number, number];
  const base = yScale(0);

  const bars: HistBar[] = bins.map((b, i) => {
    const x0 = b.x0 ?? start;
    const x1 = b.x1 ?? end;
    const xLeft = xScale(x0);
    const xRight = xScale(x1);
    const yTop = yScale(b.length);
    return {
      index: i,
      x0,
      x1,
      count: b.length,
      x: xLeft,
      y: yTop,
      w: xRight - xLeft,
      h: base - yTop,
      base,
    };
  });

  const sorted = [...values].sort((a, b) => a - b);
  const median = quantileSorted(sorted, 0.5) ?? sorted[0];

  const countTicks = yScale
    .ticks(5)
    .map((t) => ({ pos: yScale(t), label: String(t) }));
  const edgeTicks = edges.map((e) => ({ pos: xScale(e), label: String(e) }));

  return {
    innerWidth,
    innerHeight,
    base,
    bars,
    countTicks,
    edgeTicks,
    countDomain: niceCount,
    median,
    medianX: xScale(median),
  };
}

/** Grow a histogram bar from the zero baseline to `progress` (pure function). */
export function growHistBar(
  bar: HistBar,
  progress: number,
): { x: number; y: number; w: number; h: number } {
  const p = progress < 0 ? 0 : progress > 1 ? 1 : progress;
  const h = bar.h * p;
  return { x: bar.x, y: bar.base - h, w: bar.w, h };
}
