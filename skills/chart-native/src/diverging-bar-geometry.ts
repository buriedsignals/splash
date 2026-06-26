// Pure geometry core for DIVERGING bar charts — framework-free (D3 = math).
// Sibling of bar-geometry.ts, specialised for SIGNED values around a centred zero.
// The value domain ALWAYS includes 0 (baseline rule) and is padded outward so the
// outer value labels have room (never run into the category gutter or the edge).
// Bars grow from the zero line outward — a pure function of a per-bar progress.

import { scaleBand, scaleLinear } from "d3-scale";

export interface DivergingData {
  catField: string;
  valField: string;
  rows: Record<string, string | number>[];
}

export interface DivergingDims {
  width: number;
  height: number;
  padding: { top: number; right: number; bottom: number; left: number };
}

export interface DivergingBar {
  index: number;
  rawCat: string;
  value: number;
  sign: 1 | -1 | 0;
  y: number; // band top
  h: number; // band height
  /** screen x of the bar's zero-side edge (= the zero line) */
  xZero: number;
  /** screen x of the bar's value tip */
  xTip: number;
  x: number; // rect left
  w: number; // rect width
}

export interface DivergingLayout {
  innerWidth: number;
  innerHeight: number;
  zeroX: number; // screen x of value 0
  bars: DivergingBar[];
  valueDomain: [number, number];
}

export function computeDivergingLayout(
  data: DivergingData,
  dims: DivergingDims,
  sort: "desc" | "none" = "desc",
  // px reserved at each end for the outer signed value labels, so they never run
  // off the edge or into the category gutter (a fixed pixel need, not a %).
  labelInset = 0,
): DivergingLayout {
  if (!data.rows.length)
    throw new Error("computeDivergingLayout: data.rows is empty");
  const { width, height, padding } = dims;
  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;
  if (innerWidth <= 0 || innerHeight <= 0)
    throw new Error("computeDivergingLayout: padding exceeds dimensions");

  const parsed = data.rows.map((r) => {
    const value = Number(r[data.valField]);
    if (Number.isNaN(value))
      throw new Error(`invalid diverging value: ${r[data.valField]}`);
    return { rawCat: String(r[data.catField]), value };
  });
  if (sort === "desc") parsed.sort((a, b) => b.value - a.value);

  const vMin = Math.min(0, ...parsed.map((d) => d.value));
  const vMax = Math.max(0, ...parsed.map((d) => d.value));
  const domain: [number, number] = [vMin, vMax];

  // inset the pixel range (not the value domain) so the labels always fit.
  const inset = Math.min(labelInset, innerWidth / 2 - 1);
  const x = scaleLinear()
    .domain(domain)
    .range([inset, innerWidth - inset]);
  const band = scaleBand<number>()
    .domain(parsed.map((_, i) => i))
    .range([0, innerHeight])
    .padding(0.34);
  const zeroX = x(0);
  const bw = band.bandwidth();

  const bars: DivergingBar[] = parsed.map((d, i) => {
    const xTip = x(d.value);
    const sign: 1 | -1 | 0 = d.value > 0 ? 1 : d.value < 0 ? -1 : 0;
    const left = Math.min(zeroX, xTip);
    const w = Math.abs(xTip - zeroX);
    return {
      index: i,
      rawCat: d.rawCat,
      value: d.value,
      sign,
      y: band(i) ?? 0,
      h: bw,
      xZero: zeroX,
      xTip,
      x: left,
      w,
    };
  });

  return { innerWidth, innerHeight, zeroX, bars, valueDomain: domain };
}

/**
 * Grow a diverging bar from the zero line outward to `progress` (pure function).
 * The zero-side edge stays fixed; the tip extends toward its value.
 */
export function growDivBar(
  bar: DivergingBar,
  progress: number,
): { x: number; y: number; w: number; h: number } {
  const p = progress < 0 ? 0 : progress > 1 ? 1 : progress;
  const w = bar.w * p;
  // positive bars extend right from zero; negative extend left.
  const x = bar.sign < 0 ? bar.xZero - w : bar.xZero;
  return { x, y: bar.y, w, h: bar.h };
}
