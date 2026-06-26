// Pure geometry core for the DOT STRIP plot — framework-free (D3 = math). Each
// category is a horizontal strip; every raw observation is a dot placed by VALUE
// on a shared x axis (position encoding → the value axis need NOT include 0, like
// the dumbbell/slope, the opposite of the bar). Overlapping dots are shown by
// transparency in the component — NO dodge (that is the beeswarm's job); a dot
// strip keeps every dot on the category's own line so the spread reads honestly.
// A summary marker (the category mean) is a vertical tick. The reveal is a pure
// left→right wipe computed in the component, so frames stay deterministic.

import { scaleBand, scaleLinear } from "d3-scale";

export interface DotStripData {
  categoryField: string; // groups the observations into strips
  valueField: string; // the numeric observation
  rows: Record<string, string | number>[]; // one row per observation
}

export interface DotStripDims {
  width: number;
  height: number;
  padding: { top: number; right: number; bottom: number; left: number };
}

export type DotStripSort = "spread-desc" | "mean-desc" | "none";

export interface DotStripDot {
  value: number;
  x: number; // screen x of the value
}

export interface DotStripRow {
  index: number;
  category: string;
  y: number; // band centre
  bandH: number; // band thickness (dot line + jitter room)
  dots: DotStripDot[];
  mean: number;
  meanX: number; // screen x of the mean tick
  min: number;
  max: number;
  spread: number; // max - min
}

export interface DotStripLayout {
  innerWidth: number;
  innerHeight: number;
  rows: DotStripRow[];
  valueTicks: { pos: number; label: string }[];
  valueDomain: [number, number];
  bandStep: number;
}

export function computeDotStripLayout(
  data: DotStripData,
  dims: DotStripDims,
  sort: DotStripSort = "spread-desc",
): DotStripLayout {
  if (!data.rows.length)
    throw new Error("computeDotStripLayout: data.rows is empty");
  const { width, height, padding } = dims;
  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;
  if (innerWidth <= 0 || innerHeight <= 0)
    throw new Error("computeDotStripLayout: padding exceeds dimensions");

  // group observations by category, preserving first-seen order
  const order: string[] = [];
  const byCat = new Map<string, number[]>();
  for (const r of data.rows) {
    const cat = String(r[data.categoryField]);
    const value = Number(r[data.valueField]);
    if (Number.isNaN(value))
      throw new Error(`invalid dot-strip value: ${r[data.valueField]}`);
    if (!byCat.has(cat)) {
      byCat.set(cat, []);
      order.push(cat);
    }
    byCat.get(cat)!.push(value);
  }

  let groups = order.map((category) => {
    const values = byCat.get(category)!;
    const min = Math.min(...values);
    const max = Math.max(...values);
    const mean = values.reduce((s, v) => s + v, 0) / values.length;
    return { category, values, min, max, mean, spread: max - min };
  });

  if (sort === "spread-desc") groups.sort((a, b) => b.spread - a.spread);
  else if (sort === "mean-desc") groups.sort((a, b) => b.mean - a.mean);

  // position encoding → x domain is the data range padded ~6%, NOT forced to 0.
  const all = data.rows.map((r) => Number(r[data.valueField]));
  const lo = Math.min(...all);
  const hi = Math.max(...all);
  const pad = (hi - lo) * 0.06 || 1;
  const domain: [number, number] = [lo - pad, hi + pad];

  const x = scaleLinear().domain(domain).range([0, innerWidth]);
  const band = scaleBand<number>()
    .domain(groups.map((_, i) => i))
    .range([0, innerHeight])
    .padding(0.35);
  const bw = band.bandwidth();

  const rows: DotStripRow[] = groups.map((g, i) => ({
    index: i,
    category: g.category,
    y: (band(i) ?? 0) + bw / 2,
    bandH: bw,
    dots: g.values.map((value) => ({ value, x: x(value) })),
    mean: g.mean,
    meanX: x(g.mean),
    min: g.min,
    max: g.max,
    spread: g.spread,
  }));

  const valueTicks = x.ticks(5).map((t) => ({ pos: x(t), label: String(t) }));

  return {
    innerWidth,
    innerHeight,
    rows,
    valueTicks,
    valueDomain: domain,
    bandStep: band.step(),
  };
}

/**
 * Deterministic vertical offset for a dot within its band — a tiny, value-seeded
 * jitter so coincident values do not stack into a single opaque blob. Pure (no
 * RNG) → identical every render, so video frames stay reproducible.
 */
export function dotJitter(
  value: number,
  dotIndex: number,
  bandH: number,
): number {
  // hash the value+index into [-1, 1], then scale to ±40% of the half-band
  const seed = Math.sin(value * 12.9898 + dotIndex * 78.233) * 43758.5453;
  const frac = seed - Math.floor(seed); // [0,1)
  return (frac * 2 - 1) * (bandH * 0.2);
}
