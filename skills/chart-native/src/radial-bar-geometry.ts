// Pure geometry core for the RADIAL BAR / radial column — framework-free (D3 =
// math). Categories sit around a circle (best for CYCLICAL data: hours, months,
// compass points); each bar runs radially from a baseline circle outward, its
// LENGTH ∝ value. The radial scale starts at 0 on the inner circle (baseline-0,
// like the cartesian bar — a radial bar that didn't start at 0 would lie). Angle
// encodes the category, NOT magnitude. The reveal grows each bar outward from the
// baseline in the component (pure function of progress) → frame-deterministic.

import { scaleLinear } from "d3-scale";

export interface RadialBarData {
  categoryField: string;
  valueField: string;
  rows: Record<string, string | number>[];
}

export interface RadialBarDims {
  width: number;
  height: number;
  padding: { top: number; right: number; bottom: number; left: number };
  innerRadiusRatio?: number; // hole size as a fraction of the outer radius
  anglePad?: number; // gap between bars, in radians
  labelMargin?: number; // px reserved OUTSIDE the bars for rim (category) labels
}

export interface RadialBar {
  index: number;
  category: string;
  value: number;
  a0: number; // start angle (radians, 0 = top, clockwise)
  a1: number; // end angle
  aMid: number;
  rValue: number; // outer radius at full value
}

export interface RadialTick {
  value: number;
  r: number;
  label: string;
}

export interface RadialBarLayout {
  cx: number;
  cy: number;
  innerR: number;
  outerR: number;
  bars: RadialBar[];
  ticks: RadialTick[];
  valueMax: number;
}

/** Polar (0 = top, clockwise) → cartesian, relative to a centre. */
export function polar(
  cx: number,
  cy: number,
  r: number,
  theta: number,
): { x: number; y: number } {
  return { x: cx + r * Math.sin(theta), y: cy - r * Math.cos(theta) };
}

function niceMax(v: number): number {
  if (v <= 0) return 1;
  const pow = Math.pow(10, Math.floor(Math.log10(v)));
  const n = v / pow;
  const step = n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10;
  return step * pow;
}

export function computeRadialBarLayout(
  data: RadialBarData,
  dims: RadialBarDims,
): RadialBarLayout {
  if (!data.rows.length)
    throw new Error("computeRadialBarLayout: data.rows is empty");
  const { width, height, padding } = dims;
  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;
  if (innerWidth <= 0 || innerHeight <= 0)
    throw new Error("computeRadialBarLayout: padding exceeds dimensions");

  const innerRatio = dims.innerRadiusRatio ?? 0.32;
  const anglePad = dims.anglePad ?? 0.012;

  const parsed = data.rows.map((r) => {
    const value = Number(r[data.valueField]);
    if (Number.isNaN(value))
      throw new Error(`invalid radial-bar value: ${r[data.valueField]}`);
    if (value < 0)
      throw new Error("radial bar cannot encode a negative value as length");
    return { category: String(r[data.categoryField]), value };
  });

  const n = parsed.length;
  const cx = innerWidth / 2;
  const cy = innerHeight / 2;
  const labelMargin = dims.labelMargin ?? 0;
  const outerR = Math.max(
    1,
    Math.min(innerWidth, innerHeight) / 2 - labelMargin,
  );
  const innerR = outerR * innerRatio;

  const valueMax = niceMax(Math.max(...parsed.map((d) => d.value)));
  const rScale = scaleLinear().domain([0, valueMax]).range([innerR, outerR]);

  const slice = (2 * Math.PI) / n;
  const bars: RadialBar[] = parsed.map((d, i) => {
    const a0 = i * slice + anglePad / 2;
    const a1 = (i + 1) * slice - anglePad / 2;
    return {
      index: i,
      category: d.category,
      value: d.value,
      a0,
      a1,
      aMid: (a0 + a1) / 2,
      rValue: rScale(d.value),
    };
  });

  // radial gridline circles at nice value ticks (skip 0 = the baseline circle)
  const ticks: RadialTick[] = rScale
    .ticks(4)
    .filter((t) => t > 0)
    .map((t) => ({ value: t, r: rScale(t), label: String(t) }));

  return { cx, cy, innerR, outerR, bars, ticks, valueMax };
}

/**
 * SVG path for one radial bar as an annular sector from `innerR` to `rOuter`
 * between angles a0..a1. `progress` (0→1) grows the bar outward from the baseline
 * — pure function → reproducible video frames.
 */
export function radialBarPath(
  bar: RadialBar,
  cx: number,
  cy: number,
  innerR: number,
  progress = 1,
): string {
  const p = progress < 0 ? 0 : progress > 1 ? 1 : progress;
  const rOuter = innerR + (bar.rValue - innerR) * p;
  const p0 = polar(cx, cy, innerR, bar.a0);
  const p1 = polar(cx, cy, innerR, bar.a1);
  const p2 = polar(cx, cy, rOuter, bar.a1);
  const p3 = polar(cx, cy, rOuter, bar.a0);
  const large = 0; // bars are thin slices, never > 180°
  // inner arc (a0→a1), radial side out, outer arc (a1→a0), radial side back
  return [
    `M ${p0.x} ${p0.y}`,
    `A ${innerR} ${innerR} 0 ${large} 1 ${p1.x} ${p1.y}`,
    `L ${p2.x} ${p2.y}`,
    `A ${rOuter} ${rOuter} 0 ${large} 0 ${p3.x} ${p3.y}`,
    "Z",
  ].join(" ");
}
