// Pure geometry core for LOLLIPOP / dot plots — framework-free (D3 = math).
// A ranking/magnitude chart: one value per category as a stem from the zero
// baseline to a dot. The value axis ALWAYS includes 0 (baseline rule). The range
// is inset on the right so the value label at the dot always fits. The reveal
// extends the stem from 0 to the dot — a pure function of a per-row progress.

import { scaleBand, scaleLinear } from "d3-scale";

export interface LollipopData {
  catField: string;
  valField: string;
  rows: Record<string, string | number>[];
}

export interface LollipopDims {
  width: number;
  height: number;
  padding: { top: number; right: number; bottom: number; left: number };
}

export interface LollipopRow {
  index: number;
  rawCat: string;
  value: number;
  y: number; // band centre
  baseX: number; // screen x of value 0 (stem start)
  dotX: number; // screen x of the value (dot)
}

export interface LollipopLayout {
  innerWidth: number;
  innerHeight: number;
  rows: LollipopRow[];
  valueTicks: { pos: number; label: string }[];
  valueDomain: [number, number];
}

export function computeLollipopLayout(
  data: LollipopData,
  dims: LollipopDims,
  sort: "desc" | "asc" | "none" = "desc",
  // px reserved at the right for the value label at the rightmost dot.
  labelInset = 0,
): LollipopLayout {
  if (!data.rows.length)
    throw new Error("computeLollipopLayout: data.rows is empty");
  const { width, height, padding } = dims;
  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;
  if (innerWidth <= 0 || innerHeight <= 0)
    throw new Error("computeLollipopLayout: padding exceeds dimensions");

  const parsed = data.rows.map((r) => {
    const value = Number(r[data.valField]);
    if (Number.isNaN(value))
      throw new Error(`invalid value: ${r[data.valField]}`);
    return { rawCat: String(r[data.catField]), value };
  });
  if (sort === "desc") parsed.sort((a, b) => b.value - a.value);
  else if (sort === "asc") parsed.sort((a, b) => a.value - b.value);

  // value domain ALWAYS includes 0 (baseline rule); all-positive → [0, max].
  const vMax = Math.max(0, ...parsed.map((d) => d.value));
  const vMin = Math.min(0, ...parsed.map((d) => d.value));
  const domain: [number, number] = [vMin, vMax];

  const inset = Math.min(labelInset, innerWidth / 2 - 1);
  const x = scaleLinear()
    .domain(domain)
    .range([0, innerWidth - inset]);
  const band = scaleBand<number>()
    .domain(parsed.map((_, i) => i))
    .range([0, innerHeight])
    .padding(0.45);
  const bw = band.bandwidth();
  const baseX = x(0);

  const rows: LollipopRow[] = parsed.map((d, i) => ({
    index: i,
    rawCat: d.rawCat,
    value: d.value,
    y: (band(i) ?? 0) + bw / 2,
    baseX,
    dotX: x(d.value),
  }));

  const valueTicks = x.ticks(5).map((t) => ({ pos: x(t), label: String(t) }));

  return {
    innerWidth,
    innerHeight,
    rows,
    valueTicks,
    valueDomain: domain,
  };
}

/** Stem end x as it grows from the baseline to the dot at `progress`. Pure. */
export function growStem(row: LollipopRow, progress: number): number {
  const p = progress < 0 ? 0 : progress > 1 ? 1 : progress;
  return row.baseX + (row.dotX - row.baseX) * p;
}
