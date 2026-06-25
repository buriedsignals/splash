// Pure geometry core for GROUPED bar/column charts — framework-free (D3 = math).
// Sibling of bar-geometry.ts + stacked-bar-geometry.ts: several series sit SIDE
// BY SIDE within each category (not stacked). Two nested band scales — an outer
// band per category, an inner band per series — project the bars; the value axis
// ALWAYS includes 0 (inherited baseline rule, grouped-bar.md). Growth reuses the
// shared `growBar` from bar-geometry (a grouped bar IS a bar), so the rise-from-
// baseline motion is identical and frame-deterministic.

import { scaleBand, scaleLinear } from "d3-scale";
import { formatNumber } from "./core/math";
import type { Bar } from "./bar-geometry";

export interface GroupedData {
  catField: string;
  seriesFields: string[];
  rows: Record<string, string | number>[];
}

export interface GroupedDims {
  width: number;
  height: number;
  padding: { top: number; right: number; bottom: number; left: number };
}

export interface GroupedBar extends Bar {
  catIndex: number;
  seriesIndex: number;
  seriesKey: string;
}

export interface GroupedColumn {
  rawCat: string | number;
  /** band centre along the category axis (for the category tick label) */
  center: number;
}

export interface GroupedLayout {
  innerWidth: number;
  innerHeight: number;
  base: number;
  bars: GroupedBar[];
  columns: GroupedColumn[];
  valueTicks: { pos: number; label: string }[];
  valueDomain: [number, number];
}

export function computeGroupedLayout(
  data: GroupedData,
  dims: GroupedDims,
): GroupedLayout {
  if (!data.rows.length)
    throw new Error("computeGroupedLayout: data.rows is empty");
  if (!data.seriesFields.length)
    throw new Error("computeGroupedLayout: seriesFields is empty");
  const { width, height, padding } = dims;
  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;
  if (innerWidth <= 0 || innerHeight <= 0)
    throw new Error("computeGroupedLayout: padding exceeds dimensions");

  const parsed = data.rows.map((r) => {
    const values = data.seriesFields.map((k) => {
      const v = Number(r[k]);
      if (Number.isNaN(v))
        throw new Error(`invalid grouped value for "${k}": ${r[k]}`);
      return v;
    });
    return { rawCat: r[data.catField], values };
  });

  // value domain ALWAYS includes 0 (baseline rule).
  const allVals = parsed.flatMap((d) => d.values);
  const vMax = Math.max(0, ...allVals);
  const vMin = Math.min(0, ...allVals);

  // outer band per category (bigger gap), inner band per series (small gap).
  const outer = scaleBand<number>()
    .domain(parsed.map((_, i) => i))
    .range([0, innerWidth])
    .padding(0.28); // between groups (grouped-bar.md rule 3)
  const inner = scaleBand<number>()
    .domain(data.seriesFields.map((_, i) => i))
    .range([0, outer.bandwidth()])
    .padding(0.12); // within a group

  const value = scaleLinear()
    .domain([vMin, vMax])
    .nice()
    .range([innerHeight, 0]);
  const niceDomain = value.domain() as [number, number];
  const base = value(0);
  const bw = inner.bandwidth();

  const bars: GroupedBar[] = [];
  parsed.forEach((d, ci) => {
    const gx = outer(ci) ?? 0;
    d.values.forEach((v, si) => {
      const ix = gx + (inner(si) ?? 0);
      const vPos = value(v);
      const y = Math.min(base, vPos);
      const h = Math.abs(base - vPos);
      bars.push({
        x: ix,
        y,
        w: bw,
        h,
        base,
        rawCat: d.rawCat,
        rawVal: v,
        catIndex: ci,
        seriesIndex: si,
        seriesKey: data.seriesFields[si],
      });
    });
  });

  const columns: GroupedColumn[] = parsed.map((d, ci) => ({
    rawCat: d.rawCat,
    center: (outer(ci) ?? 0) + outer.bandwidth() / 2,
  }));

  const valueTicks = value
    .ticks(5)
    .map((t) => ({ pos: value(t), label: formatNumber(t) }));

  return {
    innerWidth,
    innerHeight,
    base,
    bars,
    columns,
    valueTicks,
    valueDomain: niceDomain,
  };
}
