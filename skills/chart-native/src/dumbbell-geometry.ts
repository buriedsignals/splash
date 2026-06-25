// Pure geometry core for DUMBBELL / range plots — framework-free (D3 = math).
// Each category is a row: two dots (two values) joined by a connector whose
// length IS the gap. POSITION encoding on x → the value axis need NOT include 0
// (like the slope, the opposite of bar; dumbbell.md rule 1). The reveal extends
// the connector from the first dot to the second — a pure function of a per-row
// progress computed in the component, so it stays frame-deterministic for video.

import { scaleBand, scaleLinear } from "d3-scale";

export interface DumbbellData {
  labelField: string;
  leftField: string; // value of series A
  rightField: string; // value of series B
  rows: Record<string, string | number>[];
}

export interface DumbbellDims {
  width: number;
  height: number;
  padding: { top: number; right: number; bottom: number; left: number };
}

export type DumbbellSort = "gap-desc" | "gap-asc" | "none";

export interface DumbbellRow {
  index: number;
  rawLabel: string;
  leftVal: number;
  rightVal: number;
  xLeft: number; // screen x of the left value
  xRight: number; // screen x of the right value
  y: number; // band centre
  gap: number; // rightVal - leftVal (signed)
}

export interface DumbbellLayout {
  innerWidth: number;
  innerHeight: number;
  rows: DumbbellRow[];
  valueTicks: { pos: number; label: string }[];
  valueDomain: [number, number];
  bandStep: number;
}

export function computeDumbbellLayout(
  data: DumbbellData,
  dims: DumbbellDims,
  sort: DumbbellSort = "gap-desc",
  // px to keep the dots away from each plot edge so the OUTER value labels fit
  // (otherwise the min/max dot's label collides with the category / the edge).
  labelInset = 0,
): DumbbellLayout {
  if (!data.rows.length)
    throw new Error("computeDumbbellLayout: data.rows is empty");
  const { width, height, padding } = dims;
  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;
  if (innerWidth <= 0 || innerHeight <= 0)
    throw new Error("computeDumbbellLayout: padding exceeds dimensions");

  const parsed = data.rows.map((r) => {
    const leftVal = Number(r[data.leftField]);
    const rightVal = Number(r[data.rightField]);
    if (Number.isNaN(leftVal) || Number.isNaN(rightVal))
      throw new Error(
        `invalid dumbbell value: ${r[data.leftField]} / ${r[data.rightField]}`,
      );
    return { rawLabel: String(r[data.labelField]), leftVal, rightVal };
  });

  if (sort === "gap-desc")
    parsed.sort((a, b) => b.rightVal - b.leftVal - (a.rightVal - a.leftVal));
  else if (sort === "gap-asc")
    parsed.sort((a, b) => a.rightVal - a.leftVal - (b.rightVal - b.leftVal));

  // position encoding → x domain is the data range padded ~8%, NOT forced to 0.
  const all = parsed.flatMap((d) => [d.leftVal, d.rightVal]);
  const lo = Math.min(...all);
  const hi = Math.max(...all);
  const pad = (hi - lo) * 0.08 || 1;
  const domain: [number, number] = [lo - pad, hi + pad];

  const inset = Math.min(labelInset, innerWidth / 2 - 1);
  const x = scaleLinear()
    .domain(domain)
    .range([inset, innerWidth - inset]);
  const band = scaleBand<number>()
    .domain(parsed.map((_, i) => i))
    .range([0, innerHeight])
    .padding(0.4);
  const bw = band.bandwidth();

  const rows: DumbbellRow[] = parsed.map((d, i) => ({
    index: i,
    rawLabel: d.rawLabel,
    leftVal: d.leftVal,
    rightVal: d.rightVal,
    xLeft: x(d.leftVal),
    xRight: x(d.rightVal),
    y: (band(i) ?? 0) + bw / 2,
    gap: d.rightVal - d.leftVal,
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
 * The current end x of a row's connector as it extends from the first dot to
 * `progress` (0→1). Pure function → reproducible video frames.
 */
export function extendConnector(row: DumbbellRow, progress: number): number {
  const p = progress < 0 ? 0 : progress > 1 ? 1 : progress;
  return row.xLeft + (row.xRight - row.xLeft) * p;
}
