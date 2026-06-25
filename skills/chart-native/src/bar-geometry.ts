// Pure geometry core for bar/column charts — framework-free (D3 = math only).
// Sibling of chart-geometry.ts (line). Reuses the shared pure helpers from it
// (formatNumber, clamp01); the bar-specific part is the band+linear projection
// with a value axis that ALWAYS includes 0 (bars encode length → baseline 0,
// per knowledge/references/chart/types/bar.md). Growth from the baseline is a
// pure function of a per-bar progress, computed in the component.

import { scaleBand, scaleLinear } from "d3-scale";
import { formatNumber } from "./core/math";

export type Orientation = "vertical" | "horizontal";
export type Sort = "desc" | "asc" | "none";

export interface BarData {
  catField: string;
  valField: string;
  rows: Record<string, string | number>[];
}

export interface BarDims {
  width: number;
  height: number;
  padding: { top: number; right: number; bottom: number; left: number };
}

export interface BarOptions {
  orientation: Orientation;
  sort?: Sort; // default "none"
}

export interface Bar {
  /** full rect at progress=1, in inner coordinates (origin = padding corner) */
  x: number;
  y: number;
  w: number;
  h: number;
  /** the value-axis screen coord of value 0 — bars grow FROM here */
  base: number;
  rawCat: string | number;
  rawVal: number;
}

export interface BarLayout {
  innerWidth: number;
  innerHeight: number;
  orientation: Orientation;
  bars: Bar[];
  /** value-axis ticks: pos = screen coord along the value axis */
  valueTicks: { pos: number; label: string }[];
  /** category ticks: pos = band centre along the category axis */
  catTicks: { pos: number; label: string }[];
  /** [min, max] of the value domain actually used (always includes 0) */
  valueDomain: [number, number];
}

export function computeBarLayout(
  data: BarData,
  dims: BarDims,
  options: BarOptions,
): BarLayout {
  if (!data.rows.length) {
    throw new Error("computeBarLayout: data.rows is empty");
  }
  const { width, height, padding } = dims;
  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;
  if (innerWidth <= 0 || innerHeight <= 0) {
    throw new Error("computeBarLayout: padding exceeds dimensions");
  }

  // parse + validate
  const parsed = data.rows.map((r) => {
    const rawVal = Number(r[data.valField]);
    if (Number.isNaN(rawVal))
      throw new Error(`invalid value: ${r[data.valField]}`);
    return { rawCat: r[data.catField], rawVal };
  });

  // order
  const sort = options.sort ?? "none";
  if (sort === "desc") parsed.sort((a, b) => b.rawVal - a.rawVal);
  else if (sort === "asc") parsed.sort((a, b) => a.rawVal - b.rawVal);

  // value domain ALWAYS includes 0 (baseline rule). For all-positive data this
  // is [0, max]; negatives extend it below 0.
  const vals = parsed.map((d) => d.rawVal);
  const vMax = Math.max(0, ...vals);
  const vMin = Math.min(0, ...vals);

  const vertical = options.orientation === "vertical";
  const catRange = vertical ? innerWidth : innerHeight;
  const valRange = vertical ? innerHeight : innerWidth;

  const band = scaleBand<string | number>()
    .domain(parsed.map((d) => d.rawCat))
    .range([0, catRange])
    .padding(0.28); // discrete bars, ~28% gap (bar.md rule 3)

  // value scale: vertical → screen y grows downward, so range is [valRange, 0];
  // horizontal → screen x grows rightward, range [0, valRange].
  const value = scaleLinear()
    .domain([vMin, vMax])
    .nice()
    .range(vertical ? [valRange, 0] : [0, valRange]);

  const niceDomain = value.domain() as [number, number];
  const base = value(0); // value-axis coord of zero — the growth anchor

  const bw = band.bandwidth();
  const bars: Bar[] = parsed.map((d) => {
    const bandPos = band(d.rawCat) ?? 0;
    const vPos = value(d.rawVal);
    if (vertical) {
      // rect spans from base (y of 0) to vPos
      const y = Math.min(base, vPos);
      const h = Math.abs(base - vPos);
      return {
        x: bandPos,
        y,
        w: bw,
        h,
        base,
        rawCat: d.rawCat,
        rawVal: d.rawVal,
      };
    }
    const x = Math.min(base, vPos);
    const w = Math.abs(vPos - base);
    return {
      x,
      y: bandPos,
      w,
      h: bw,
      base,
      rawCat: d.rawCat,
      rawVal: d.rawVal,
    };
  });

  const valueTicks = value
    .ticks(5)
    .map((t) => ({ pos: value(t), label: formatNumber(t) }));
  const catTicks = parsed.map((d) => ({
    pos: (band(d.rawCat) ?? 0) + bw / 2,
    label: String(d.rawCat),
  }));

  return {
    innerWidth,
    innerHeight,
    orientation: options.orientation,
    bars,
    valueTicks,
    catTicks,
    valueDomain: niceDomain,
  };
}

/**
 * The drawn rect for a bar at a given growth `progress` (0→1), anchored at the
 * zero baseline (bars grow FROM 0, never from the middle/top). Pure function.
 * `orientation` is taken from the layout so there is no fragile auto-detection.
 */
export function growBar(
  bar: Bar,
  progress: number,
  orientation: Orientation,
): { x: number; y: number; w: number; h: number } {
  const p = progress < 0 ? 0 : progress > 1 ? 1 : progress;
  if (orientation === "vertical") {
    // grow height; keep the edge that sits on the baseline fixed.
    const h = bar.h * p;
    const growsUp = bar.y + bar.h >= bar.base - 0.5; // bar is above the baseline
    const y = growsUp ? bar.y + bar.h - h : bar.y;
    return { x: bar.x, y, w: bar.w, h };
  }
  // horizontal: grow width; keep the baseline edge fixed.
  const w = bar.w * p;
  const growsRight = bar.x >= bar.base - 0.5; // bar extends right of the baseline
  const x = growsRight ? bar.x : bar.x + (bar.w - w);
  return { x, y: bar.y, w, h: bar.h };
}
