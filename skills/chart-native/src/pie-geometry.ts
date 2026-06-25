// Pure geometry core for pie / donut — framework-free (D3 = math: d3-shape arc).
// NON-cartesian: no scales/axes. Slices are cumulative angles from 12 o'clock,
// clockwise, sorted by size. The reveal is an angle SWEEP — a pure function of
// progress — so it stays frame-deterministic for video.

import { arc } from "d3-shape";

export interface PieData {
  labelField: string;
  valueField: string;
  rows: Record<string, string | number>[];
}

export interface PieDims {
  width: number;
  height: number;
  padding: { top: number; right: number; bottom: number; left: number };
}

export interface PieOptions {
  donut?: boolean; // hole in the middle
  innerRatio?: number; // donut hole radius / outer radius (default 0.58)
  sort?: "desc" | "none"; // default "desc"
  labelGap?: number; // distance of the label anchor outside the arc
}

export interface PieSlice {
  index: number;
  rawLabel: string;
  value: number;
  share: number; // value / total (0..1)
  startAngle: number; // radians, 0 = 12 o'clock, clockwise
  endAngle: number;
  midAngle: number;
  /** label anchor just OUTSIDE the arc at the mid-angle, relative to the centre */
  labelX: number;
  labelY: number;
  /** which side of the circle the slice's mid-angle points to */
  side: "left" | "right";
}

export interface PieLayout {
  cx: number;
  cy: number;
  radius: number;
  innerRadius: number;
  total: number;
  slices: PieSlice[];
}

export function computePieLayout(
  data: PieData,
  dims: PieDims,
  options: PieOptions = {},
): PieLayout {
  if (!data.rows.length)
    throw new Error("computePieLayout: data.rows is empty");
  const { width, height, padding } = dims;
  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;
  if (innerWidth <= 0 || innerHeight <= 0)
    throw new Error("computePieLayout: padding exceeds dimensions");

  const {
    donut = false,
    innerRatio = 0.58,
    sort = "desc",
    labelGap = 14,
  } = options;

  const parsed = data.rows.map((r) => {
    const value = Number(r[data.valueField]);
    if (Number.isNaN(value) || value < 0)
      throw new Error(`invalid slice value: ${r[data.valueField]}`);
    return { rawLabel: String(r[data.labelField]), value };
  });
  if (sort === "desc") parsed.sort((a, b) => b.value - a.value);

  const total = parsed.reduce((s, d) => s + d.value, 0);
  if (total <= 0) throw new Error("computePieLayout: total must be > 0");

  // reserve room for outside labels: radius fits inside the inner box
  const radius = Math.min(innerWidth, innerHeight) / 2;
  const innerRadius = donut ? radius * innerRatio : 0;
  const cx = padding.left + innerWidth / 2;
  const cy = padding.top + innerHeight / 2;

  const TAU = Math.PI * 2;
  let a0 = 0;
  const slices: PieSlice[] = parsed.map((d, i) => {
    const a1 = a0 + (d.value / total) * TAU;
    const mid = (a0 + a1) / 2;
    // angle 0 = up (12 o'clock), clockwise: x = sin, y = -cos
    const lx = Math.sin(mid) * (radius + labelGap);
    const ly = -Math.cos(mid) * (radius + labelGap);
    const slice: PieSlice = {
      index: i,
      rawLabel: d.rawLabel,
      value: d.value,
      share: d.value / total,
      startAngle: a0,
      endAngle: a1,
      midAngle: mid,
      labelX: lx,
      labelY: ly,
      side: Math.sin(mid) >= 0 ? "right" : "left",
    };
    a0 = a1;
    return slice;
  });

  return { cx, cy, radius, innerRadius, total, slices };
}

/**
 * The wedge path for a slice swept to `progress` (0→1 maps to a master angle
 * 0→2π across all slices). Empty until the sweep reaches the slice; partial
 * while inside it; full once past. Pure function → reproducible video frames.
 */
export function sweepArc(
  slice: PieSlice,
  progress: number,
  radius: number,
  innerRadius: number,
): string {
  const p = progress < 0 ? 0 : progress > 1 ? 1 : progress;
  const master = p * Math.PI * 2;
  const end = Math.max(slice.startAngle, Math.min(slice.endAngle, master));
  if (end <= slice.startAngle + 1e-6) return "";
  const gen = arc()
    .innerRadius(innerRadius)
    .outerRadius(radius)
    .startAngle(slice.startAngle)
    .endAngle(end);
  return gen(null as never) ?? "";
}

/** Fraction of a slice that is revealed at `progress` (for fading its label). */
export function sliceProgress(slice: PieSlice, progress: number): number {
  const master = (progress < 0 ? 0 : progress > 1 ? 1 : progress) * Math.PI * 2;
  const span = slice.endAngle - slice.startAngle;
  if (span <= 0) return 1;
  return Math.max(0, Math.min(1, (master - slice.startAngle) / span));
}
