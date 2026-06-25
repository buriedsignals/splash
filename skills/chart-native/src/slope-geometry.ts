// Pure geometry core for SLOPE charts (slopegraph) — framework-free (D3 = math).
// Each category has ONE value at two periods; the connecting line's slope is the
// message. POSITION encoding → the y-axis need NOT include 0 (the explicit
// opposite of the bar baseline rule, slope.md rule 1). The reveal extends each
// line from its left point to its right point — a pure function of a per-line
// progress computed in the component, so it stays frame-deterministic for video.

import { scaleLinear } from "d3-scale";

export interface SlopeData {
  labelField: string;
  leftField: string; // value at the left period
  rightField: string; // value at the right period
  rows: Record<string, string | number>[];
}

export interface SlopeDims {
  width: number;
  height: number;
  padding: { top: number; right: number; bottom: number; left: number };
}

export interface SlopeLine {
  index: number;
  rawLabel: string;
  leftVal: number;
  rightVal: number;
  x1: number; // left period x
  y1: number; // left value y
  x2: number; // right period x
  y2: number; // right value y
  direction: "up" | "down" | "flat";
}

export interface SlopeLayout {
  innerWidth: number;
  innerHeight: number;
  leftX: number;
  rightX: number;
  lines: SlopeLine[];
  /** y of a few value ticks (light axis) */
  valueTicks: { pos: number; label: string }[];
  valueDomain: [number, number];
}

export function computeSlopeLayout(
  data: SlopeData,
  dims: SlopeDims,
): SlopeLayout {
  if (!data.rows.length)
    throw new Error("computeSlopeLayout: data.rows is empty");
  const { width, height, padding } = dims;
  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;
  if (innerWidth <= 0 || innerHeight <= 0)
    throw new Error("computeSlopeLayout: padding exceeds dimensions");

  const parsed = data.rows.map((r) => {
    const leftVal = Number(r[data.leftField]);
    const rightVal = Number(r[data.rightField]);
    if (Number.isNaN(leftVal) || Number.isNaN(rightVal))
      throw new Error(
        `invalid slope value: ${r[data.leftField]} / ${r[data.rightField]}`,
      );
    return { rawLabel: String(r[data.labelField]), leftVal, rightVal };
  });

  // position encoding → domain is the data range padded ~8%, NOT forced to 0.
  const all = parsed.flatMap((d) => [d.leftVal, d.rightVal]);
  const lo = Math.min(...all);
  const hi = Math.max(...all);
  const pad = (hi - lo) * 0.08 || 1;
  const domain: [number, number] = [lo - pad, hi + pad];

  const y = scaleLinear().domain(domain).range([innerHeight, 0]);
  const leftX = 0;
  const rightX = innerWidth;

  const lines: SlopeLine[] = parsed.map((d, i) => {
    const dir =
      d.rightVal > d.leftVal ? "up" : d.rightVal < d.leftVal ? "down" : "flat";
    return {
      index: i,
      rawLabel: d.rawLabel,
      leftVal: d.leftVal,
      rightVal: d.rightVal,
      x1: leftX,
      y1: y(d.leftVal),
      x2: rightX,
      y2: y(d.rightVal),
      direction: dir,
    };
  });

  const valueTicks = y.ticks(5).map((t) => ({ pos: y(t), label: String(t) }));

  return {
    innerWidth,
    innerHeight,
    leftX,
    rightX,
    lines,
    valueTicks,
    valueDomain: domain,
  };
}

/**
 * The end point of a line as it extends from its left point to `progress` (0→1).
 * Pure function → reproducible video frames. progress=0 → still at the left
 * point; progress=1 → the full right point.
 */
export function extendLine(
  line: SlopeLine,
  progress: number,
): { x: number; y: number } {
  const p = progress < 0 ? 0 : progress > 1 ? 1 : progress;
  return {
    x: line.x1 + (line.x2 - line.x1) * p,
    y: line.y1 + (line.y2 - line.y1) * p,
  };
}

/**
 * De-collide labels that share an x edge: given the desired y of each label
 * (sorted input order preserved via index), nudge them apart by at least
 * `minGap` while staying inside [0, innerHeight]. A simple one-pass push used at
 * both the left and right gutters. Returns y per input index.
 */
export function spreadLabels(
  ys: { index: number; y: number }[],
  minGap: number,
  maxY: number,
): Map<number, number> {
  const sorted = [...ys].sort((a, b) => a.y - b.y);
  let prev = -Infinity;
  for (const it of sorted) {
    let y = it.y;
    if (y - prev < minGap) y = prev + minGap;
    it.y = y;
    prev = y;
  }
  // if we pushed past the bottom, shift the whole stack up
  const overflow = sorted.length ? sorted[sorted.length - 1].y - maxY : 0;
  if (overflow > 0) for (const it of sorted) it.y -= overflow;
  const out = new Map<number, number>();
  for (const it of sorted) out.set(it.index, it.y);
  return out;
}
