// Pure geometry core for scatter / bubble charts — framework-free (D3 = math).
// Third cartesian type (after line + bar): two LINEAR axes, neither forced to 0
// (scatter encodes position, not length — the opposite of the bar's baseline-0).
// Optional bubble size mapped to AREA via scaleSqrt (r ∝ √value),
// never radius. Reuses the shared pure helpers from core/math.

import { scaleLinear, scaleSqrt } from "d3-scale";
import { extent, max } from "d3-array";
import { formatNumber } from "./core/math";

export interface ScatterData {
  xField: string;
  yField: string;
  sizeField?: string; // optional → bubble
  labelField?: string; // optional → point labels
  rows: Record<string, string | number>[];
}

export interface ScatterDims {
  width: number;
  height: number;
  padding: { top: number; right: number; bottom: number; left: number };
}

export interface ScatterPoint {
  x: number; // screen px
  y: number; // screen px
  r: number; // radius px (area-scaled if sizeField)
  rawX: number;
  rawY: number;
  rawSize?: number;
  label?: string;
}

export interface ScatterLayout {
  innerWidth: number;
  innerHeight: number;
  points: ScatterPoint[];
  xTicks: { pos: number; label: string }[]; // pos = screen x
  yTicks: { pos: number; label: string }[]; // pos = screen y
  xDomain: [number, number];
  yDomain: [number, number];
}

export interface ScatterOptions {
  minR?: number; // smallest dot radius
  maxR?: number; // largest bubble radius
  dotR?: number; // fixed radius when there is no sizeField
}

export function computeScatterLayout(
  data: ScatterData,
  dims: ScatterDims,
  options: ScatterOptions = {},
): ScatterLayout {
  if (!data.rows.length) {
    throw new Error("computeScatterLayout: data.rows is empty");
  }
  const { width, height, padding } = dims;
  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;
  if (innerWidth <= 0 || innerHeight <= 0) {
    throw new Error("computeScatterLayout: padding exceeds dimensions");
  }
  const { minR = 5, maxR = 22, dotR = 6 } = options;

  const parsed = data.rows.map((row) => {
    const rawX = Number(row[data.xField]);
    const rawY = Number(row[data.yField]);
    if (Number.isNaN(rawX)) throw new Error(`invalid x: ${row[data.xField]}`);
    if (Number.isNaN(rawY)) throw new Error(`invalid y: ${row[data.yField]}`);
    const rawSize = data.sizeField ? Number(row[data.sizeField]) : undefined;
    const label = data.labelField ? String(row[data.labelField]) : undefined;
    return { rawX, rawY, rawSize, label };
  });

  // axes: nice extent, NOT forced to 0 (position encoding).
  const xDomain = extent(parsed, (d) => d.rawX) as [number, number];
  const yDomain = extent(parsed, (d) => d.rawY) as [number, number];
  const xScale = scaleLinear().domain(xDomain).range([0, innerWidth]).nice();
  const yScale = scaleLinear().domain(yDomain).range([innerHeight, 0]).nice();

  // bubble size → AREA (scaleSqrt: r ∝ √value), domain starts at 0 so area is
  // proportional to the value. Constant radius when there is no size field.
  const sizeScale = data.sizeField
    ? scaleSqrt()
        .domain([0, max(parsed, (d) => d.rawSize ?? 0) ?? 1])
        .range([minR, maxR])
    : null;

  const points: ScatterPoint[] = parsed.map((d) => ({
    x: xScale(d.rawX),
    y: yScale(d.rawY),
    r: sizeScale && d.rawSize !== undefined ? sizeScale(d.rawSize) : dotR,
    rawX: d.rawX,
    rawY: d.rawY,
    rawSize: d.rawSize,
    label: d.label,
  }));

  const xTicks = xScale
    .ticks(6)
    .map((t) => ({ pos: xScale(t), label: formatNumber(t) }));
  const yTicks = yScale
    .ticks(5)
    .map((t) => ({ pos: yScale(t), label: formatNumber(t) }));

  return {
    innerWidth,
    innerHeight,
    points,
    xTicks,
    yTicks,
    xDomain: xScale.domain() as [number, number],
    yDomain: yScale.domain() as [number, number],
  };
}

/**
 * Per-point pop-in for the motion build: dots appear in place (scale 0→1), never
 * fly in — the spatial position is the encoding. Pure function of a per-point
 * progress; the slight overshoot (a bubble "bloom") is applied in the component.
 */
export function popScale(progress: number): number {
  const p = progress < 0 ? 0 : progress > 1 ? 1 : progress;
  return p;
}
