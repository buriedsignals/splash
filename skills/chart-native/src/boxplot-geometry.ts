// Pure geometry core for BOX PLOTS — framework-free (D3 = math). A distribution-
// per-category layout: each category's raw values become a five-number summary
// (min, Q1, median, Q3, max) with Tukey whiskers (1.5·IQR) and individual
// outliers. Horizontal boxes (category rows, value on x) so long category labels
// fit a left gutter. POSITION encoding → the value axis need NOT include 0. The
// reveal grows each box from its MEDIAN outward — a pure function of a per-row
// progress computed in the component.

import { scaleBand, scaleLinear } from "d3-scale";
import { ascending, quantileSorted } from "d3-array";

export interface BoxplotData {
  categories: { label: string; values: number[] }[];
  valueLabel: string; // axis caption / units
}

export interface BoxplotDims {
  width: number;
  height: number;
  padding: { top: number; right: number; bottom: number; left: number };
}

export interface BoxStats {
  min: number;
  q1: number;
  median: number;
  q3: number;
  max: number;
  iqr: number;
  whiskerLo: number; // furthest point within the lower fence
  whiskerHi: number; // furthest point within the upper fence
  outliers: number[]; // points beyond 1.5·IQR
}

export interface BoxplotRow {
  index: number;
  label: string;
  y: number; // band centre
  h: number; // box thickness
  stats: BoxStats;
  // screen x positions
  q1x: number;
  q3x: number;
  medianX: number;
  whiskerLoX: number;
  whiskerHiX: number;
  outliers: { x: number; value: number }[];
}

export interface BoxplotLayout {
  innerWidth: number;
  innerHeight: number;
  rows: BoxplotRow[];
  valueTicks: { pos: number; label: string }[];
  valueDomain: [number, number];
}

/** Five-number summary + Tukey whiskers + outliers for one sample. */
export function computeBoxStats(raw: number[]): BoxStats {
  const values = raw
    .map(Number)
    .filter((v) => !Number.isNaN(v))
    .sort(ascending);
  if (!values.length) throw new Error("computeBoxStats: empty sample");
  const q1 = quantileSorted(values, 0.25)!;
  const median = quantileSorted(values, 0.5)!;
  const q3 = quantileSorted(values, 0.75)!;
  const iqr = q3 - q1;
  const loFence = q1 - 1.5 * iqr;
  const hiFence = q3 + 1.5 * iqr;
  const inFence = values.filter((v) => v >= loFence && v <= hiFence);
  const whiskerLo = inFence.length ? inFence[0] : q1;
  const whiskerHi = inFence.length ? inFence[inFence.length - 1] : q3;
  const outliers = values.filter((v) => v < loFence || v > hiFence);
  return {
    min: values[0],
    q1,
    median,
    q3,
    max: values[values.length - 1],
    iqr,
    whiskerLo,
    whiskerHi,
    outliers,
  };
}

export function computeBoxplotLayout(
  data: BoxplotData,
  dims: BoxplotDims,
): BoxplotLayout {
  if (!data.categories.length)
    throw new Error("computeBoxplotLayout: no categories");
  const { width, height, padding } = dims;
  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;
  if (innerWidth <= 0 || innerHeight <= 0)
    throw new Error("computeBoxplotLayout: padding exceeds dimensions");

  const stats = data.categories.map((c) => computeBoxStats(c.values));

  // value domain spans every drawn mark (whiskers AND outliers), padded a touch.
  // POSITION encoding — it does NOT need to include 0.
  const lo = Math.min(
    ...stats.map((s) => Math.min(s.whiskerLo, ...s.outliers)),
  );
  const hi = Math.max(
    ...stats.map((s) => Math.max(s.whiskerHi, ...s.outliers)),
  );
  const span = hi - lo || 1;
  const domain: [number, number] = [lo - span * 0.05, hi + span * 0.05];

  const x = scaleLinear().domain(domain).range([0, innerWidth]);
  const band = scaleBand<number>()
    .domain(data.categories.map((_, i) => i))
    .range([0, innerHeight])
    .padding(0.4);
  const bw = band.bandwidth();

  const rows: BoxplotRow[] = data.categories.map((c, i) => {
    const s = stats[i];
    return {
      index: i,
      label: c.label,
      y: (band(i) ?? 0) + bw / 2,
      h: bw,
      stats: s,
      q1x: x(s.q1),
      q3x: x(s.q3),
      medianX: x(s.median),
      whiskerLoX: x(s.whiskerLo),
      whiskerHiX: x(s.whiskerHi),
      outliers: s.outliers.map((v) => ({ x: x(v), value: v })),
    };
  });

  const valueTicks = x.ticks(5).map((t) => ({ pos: x(t), label: String(t) }));

  return { innerWidth, innerHeight, rows, valueTicks, valueDomain: domain };
}

export interface GrownBox {
  q1x: number;
  q3x: number;
  whiskerLoX: number;
  whiskerHiX: number;
  outliers: { x: number; value: number }[];
}

/** A box's marks as they grow from the MEDIAN outward at `progress`. Pure —
 * at progress 0 every mark collapses to the median (zero-width, invisible). */
export function growBox(row: BoxplotRow, progress: number): GrownBox {
  const p = progress < 0 ? 0 : progress > 1 ? 1 : progress;
  const m = row.medianX;
  const lerp = (a: number) => m + (a - m) * p;
  return {
    q1x: lerp(row.q1x),
    q3x: lerp(row.q3x),
    whiskerLoX: lerp(row.whiskerLoX),
    whiskerHiX: lerp(row.whiskerHiX),
    outliers: row.outliers.map((o) => ({ x: lerp(o.x), value: o.value })),
  };
}
