// Pure geometry core for the VIOLIN plot — framework-free (D3 = math). Each
// category is a horizontal band; a Gaussian kernel-density estimate (KDE) of its
// values is mirrored around the band centre to form the violin silhouette. Value
// on x (POSITION encoding → not baseline-0, like the boxplot/dot-strip). Each
// violin is normalised to the SAME max half-width (the band) so shapes compare
// even when counts differ — density, not area, is the message. A median tick
// gives the eye a reference. The reveal grows the half-width from 0 in the
// component (pure function of progress) → frame-deterministic video.

import { scaleBand, scaleLinear } from "d3-scale";

export interface ViolinData {
  categories: { label: string; values: number[] }[];
}

export interface ViolinDims {
  width: number;
  height: number;
  padding: { top: number; right: number; bottom: number; left: number };
}

export interface ViolinPoint {
  x: number; // screen x of the sampled value
  halfW: number; // half-width in px at full reveal (≥ 0)
}

export interface ViolinRow {
  index: number;
  label: string;
  y: number; // band centre
  bandH: number; // band thickness (full violin span)
  silhouette: ViolinPoint[]; // left→right across the category's value range
  median: number;
  medianX: number;
  q1: number;
  q3: number;
  q1X: number;
  q3X: number;
  min: number;
  max: number;
  n: number;
}

export interface ViolinLayout {
  innerWidth: number;
  innerHeight: number;
  rows: ViolinRow[];
  valueTicks: { pos: number; label: string }[];
  valueDomain: [number, number];
  bandStep: number;
}

/** Standard-normal pdf — the KDE kernel. */
function gaussian(u: number): number {
  return Math.exp(-0.5 * u * u) / Math.sqrt(2 * Math.PI);
}

/** Sample quantile (linear interpolation) of an already-sorted array. */
function quantileSorted(sorted: number[], q: number): number {
  if (sorted.length === 1) return sorted[0];
  const pos = (sorted.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
}

/**
 * Silverman's rule-of-thumb bandwidth: 0.9·min(σ, IQR/1.349)·n^(−1/5). Falls
 * back to a small positive value when the spread is degenerate (all equal), so
 * the KDE stays defined. Exported for testing.
 */
export function silvermanBandwidth(values: number[]): number {
  const n = values.length;
  if (n < 2) return 1;
  const mean = values.reduce((s, v) => s + v, 0) / n;
  const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / n;
  const sd = Math.sqrt(variance);
  const sorted = [...values].sort((a, b) => a - b);
  const iqr = quantileSorted(sorted, 0.75) - quantileSorted(sorted, 0.25);
  const spread = iqr > 0 ? Math.min(sd, iqr / 1.349) : sd;
  const h = 0.9 * spread * Math.pow(n, -1 / 5);
  return h > 0 ? h : Math.max(1e-6, sd || 1);
}

/**
 * Gaussian KDE evaluated at `x`: (1/(n·h))·Σ K((x−xi)/h). Pure. Exported so the
 * tests can assert symmetry / peak location independently of the layout.
 */
export function gaussianKDE(values: number[], h: number, x: number): number {
  const n = values.length;
  if (n === 0) return 0;
  let sum = 0;
  for (const xi of values) sum += gaussian((x - xi) / h);
  return sum / (n * h);
}

export function computeViolinLayout(
  data: ViolinData,
  dims: ViolinDims,
  samples = 48,
): ViolinLayout {
  if (!data.categories.length)
    throw new Error("computeViolinLayout: no categories");
  for (const c of data.categories) {
    if (!c.values.length)
      throw new Error(
        `computeViolinLayout: category "${c.label}" has no values`,
      );
    if (c.values.some((v) => Number.isNaN(Number(v))))
      throw new Error(`computeViolinLayout: non-numeric value in "${c.label}"`);
  }
  const { width, height, padding } = dims;
  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;
  if (innerWidth <= 0 || innerHeight <= 0)
    throw new Error("computeViolinLayout: padding exceeds dimensions");

  // shared value domain across categories (padded ~6%), position encoding.
  const all = data.categories.flatMap((c) => c.values.map(Number));
  const lo = Math.min(...all);
  const hi = Math.max(...all);
  const pad = (hi - lo) * 0.06 || 1;
  const domain: [number, number] = [lo - pad, hi + pad];

  const x = scaleLinear().domain(domain).range([0, innerWidth]);
  const band = scaleBand<number>()
    .domain(data.categories.map((_, i) => i))
    .range([0, innerHeight])
    .padding(0.3);
  const bw = band.bandwidth();
  const halfBand = bw / 2;

  const rows: ViolinRow[] = data.categories.map((c, i) => {
    const values = c.values.map(Number);
    const sorted = [...values].sort((a, b) => a - b);
    const cMin = sorted[0];
    const cMax = sorted[sorted.length - 1];
    const h = silvermanBandwidth(values);

    // sample the density across THIS category's value range, then normalise to
    // the band half-height so every violin reaches the same max width.
    const densities: { value: number; d: number }[] = [];
    let peak = 0;
    for (let k = 0; k <= samples; k++) {
      const value = cMin + ((cMax - cMin) * k) / samples;
      const d = gaussianKDE(values, h, value);
      if (d > peak) peak = d;
      densities.push({ value, d });
    }
    const norm = peak > 0 ? halfBand / peak : 0;
    const silhouette: ViolinPoint[] = densities.map((p) => ({
      x: x(p.value),
      halfW: p.d * norm,
    }));

    const median = quantileSorted(sorted, 0.5);
    const q1 = quantileSorted(sorted, 0.25);
    const q3 = quantileSorted(sorted, 0.75);
    return {
      index: i,
      label: c.label,
      y: (band(i) ?? 0) + halfBand,
      bandH: bw,
      silhouette,
      median,
      medianX: x(median),
      q1,
      q3,
      q1X: x(q1),
      q3X: x(q3),
      min: cMin,
      max: cMax,
      n: values.length,
    };
  });

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
