// Pure geometry core for LORENZ CURVES — framework-free (D3 = math: d3-scale).
// Cumulative income share (y) vs cumulative population share (x), both 0→1, with
// the 45° line of equality; the gap = inequality, summarised by the Gini. The
// reveal is a left→right clip of the static curves, so geometry is fixed and
// frame N is a pure function of the frame.

import { scaleLinear } from "d3-scale";

export interface LorenzPoint {
  x: number; // cumulative population share 0..1
  y: number; // cumulative value share 0..1
}

export interface LorenzData {
  xLabel: string;
  yLabel: string;
  series: { label: string; points: LorenzPoint[] }[];
}

export interface LorenzDims {
  width: number;
  height: number;
  padding: { top: number; right: number; bottom: number; left: number };
}

export interface LorenzSeries {
  index: number;
  label: string;
  gini: number;
  points: { x: number; y: number }[]; // screen coords
}

export interface LorenzLayout {
  innerWidth: number;
  innerHeight: number;
  series: LorenzSeries[];
  equality: { x0: number; y0: number; x1: number; y1: number };
  xTicks: { pos: number; label: string }[];
  yTicks: { pos: number; label: string }[];
}

/** Gini = 1 − 2∫L dp, by the trapezoid rule over the (sorted) Lorenz points. */
export function giniOf(points: LorenzPoint[]): number {
  let area = 0;
  for (let i = 1; i < points.length; i++) {
    const dp = points[i].x - points[i - 1].x;
    area += (dp * (points[i].y + points[i - 1].y)) / 2;
  }
  return Math.max(0, Math.min(1, 1 - 2 * area));
}

export function computeLorenzLayout(
  data: LorenzData,
  dims: LorenzDims,
): LorenzLayout {
  if (!data.series.length) throw new Error("computeLorenzLayout: no series");
  for (const s of data.series) {
    if (s.points.length < 2)
      throw new Error(`computeLorenzLayout: "${s.label}" needs ≥ 2 points`);
    const a = s.points[0];
    const b = s.points[s.points.length - 1];
    if (Math.abs(a.x) > 1e-6 || Math.abs(a.y) > 1e-6)
      throw new Error(`computeLorenzLayout: "${s.label}" must start at (0,0)`);
    if (Math.abs(b.x - 1) > 1e-6 || Math.abs(b.y - 1) > 1e-6)
      throw new Error(`computeLorenzLayout: "${s.label}" must end at (1,1)`);
  }

  const { width, height, padding } = dims;
  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;
  if (innerWidth <= 0 || innerHeight <= 0)
    throw new Error("computeLorenzLayout: padding exceeds dimensions");

  const x = scaleLinear().domain([0, 1]).range([0, innerWidth]);
  const y = scaleLinear().domain([0, 1]).range([innerHeight, 0]);

  const series: LorenzSeries[] = data.series.map((s, i) => ({
    index: i,
    label: s.label,
    gini: giniOf(s.points),
    points: s.points.map((p) => ({ x: x(p.x), y: y(p.y) })),
  }));

  const ticks = [0, 0.25, 0.5, 0.75, 1];
  const xTicks = ticks.map((t) => ({ pos: x(t), label: `${t * 100}%` }));
  const yTicks = ticks.map((t) => ({ pos: y(t), label: `${t * 100}%` }));

  return {
    innerWidth,
    innerHeight,
    series,
    equality: { x0: x(0), y0: y(0), x1: x(1), y1: y(1) },
    xTicks,
    yTicks,
  };
}
