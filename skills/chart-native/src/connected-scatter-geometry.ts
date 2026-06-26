// Pure geometry core for CONNECTED SCATTER — framework-free (D3 = math). Two
// continuous axes (position encoding, no forced 0) with the points joined in TIME
// order. The reveal traces the path by CUMULATIVE LENGTH (exactly like the line
// chart's draw-on), so the trajectory draws out and dots pop as the head passes —
// a pure function of progress, reproducible for video.

import { scaleLinear } from "d3-scale";

export interface ConnectedScatterData {
  labelField: string; // the time key (e.g. year) — defines order
  xField: string;
  yField: string;
  rows: Record<string, string | number>[];
}

export interface ConnectedScatterDims {
  width: number;
  height: number;
  padding: { top: number; right: number; bottom: number; left: number };
}

export interface ScatterPoint {
  index: number;
  label: string;
  xVal: number;
  yVal: number;
  cx: number;
  cy: number;
  /** cumulative path length from the first point to this one */
  cum: number;
}

export interface ConnectedScatterLayout {
  innerWidth: number;
  innerHeight: number;
  points: ScatterPoint[];
  totalLen: number;
  xTicks: { pos: number; label: string }[];
  yTicks: { pos: number; label: string }[];
}

export function computeConnectedScatterLayout(
  data: ConnectedScatterData,
  dims: ConnectedScatterDims,
): ConnectedScatterLayout {
  if (data.rows.length < 2)
    throw new Error("computeConnectedScatterLayout: need ≥ 2 points");
  const { width, height, padding } = dims;
  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;
  if (innerWidth <= 0 || innerHeight <= 0)
    throw new Error(
      "computeConnectedScatterLayout: padding exceeds dimensions",
    );

  const parsed = data.rows.map((r) => {
    const xVal = Number(r[data.xField]);
    const yVal = Number(r[data.yField]);
    if (Number.isNaN(xVal) || Number.isNaN(yVal))
      throw new Error(`invalid point: ${r[data.xField]} / ${r[data.yField]}`);
    return { label: String(r[data.labelField]), xVal, yVal };
  });

  // position encoding: domains are the data range padded ~6%, NOT forced to 0.
  const xs = parsed.map((d) => d.xVal);
  const ys = parsed.map((d) => d.yVal);
  const xPad = (Math.max(...xs) - Math.min(...xs)) * 0.06 || 1;
  const yPad = (Math.max(...ys) - Math.min(...ys)) * 0.06 || 1;
  const x = scaleLinear()
    .domain([Math.min(...xs) - xPad, Math.max(...xs) + xPad])
    .range([0, innerWidth]);
  const y = scaleLinear()
    .domain([Math.min(...ys) - yPad, Math.max(...ys) + yPad])
    .range([innerHeight, 0]);

  let cum = 0;
  const points: ScatterPoint[] = parsed.map((d, i) => {
    const cx = x(d.xVal);
    const cy = y(d.yVal);
    if (i > 0) {
      const prev = parsed[i - 1];
      const dx = cx - x(prev.xVal);
      const dy = cy - y(prev.yVal);
      cum += Math.sqrt(dx * dx + dy * dy);
    }
    return {
      index: i,
      label: d.label,
      xVal: d.xVal,
      yVal: d.yVal,
      cx,
      cy,
      cum,
    };
  });
  const totalLen = points[points.length - 1].cum;

  const xTicks = x.ticks(5).map((t) => ({ pos: x(t), label: String(t) }));
  const yTicks = y.ticks(5).map((t) => ({ pos: y(t), label: String(t) }));

  return { innerWidth, innerHeight, points, totalLen, xTicks, yTicks };
}

/**
 * The path drawn up to `progress` along the trajectory's cumulative length, plus
 * the head position and how many points have been passed. Pure function — the
 * draw-head interpolates within the current segment so it moves smoothly.
 */
export function revealPath(
  layout: ConnectedScatterLayout,
  progress: number,
): { path: string; head: { x: number; y: number }; passed: number } {
  const p = progress < 0 ? 0 : progress > 1 ? 1 : progress;
  const { points, totalLen } = layout;
  const target = totalLen * p;
  if (p <= 0)
    return { path: "", head: { x: points[0].cx, y: points[0].cy }, passed: 1 };

  let path = `M${points[0].cx},${points[0].cy}`;
  let passed = 1;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1];
    const b = points[i];
    if (b.cum <= target) {
      path += `L${b.cx},${b.cy}`;
      passed = i + 1;
    } else {
      // interpolate within segment [a,b]
      const segLen = b.cum - a.cum;
      const into = segLen > 0 ? (target - a.cum) / segLen : 0;
      const hx = a.cx + (b.cx - a.cx) * into;
      const hy = a.cy + (b.cy - a.cy) * into;
      path += `L${hx},${hy}`;
      return { path, head: { x: hx, y: hy }, passed };
    }
  }
  const last = points[points.length - 1];
  return { path, head: { x: last.cx, y: last.cy }, passed: points.length };
}
