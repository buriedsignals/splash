// Pure geometry core for the LINE + COLUMN combo (dual-axis) — framework-free
// (D3 = math). Columns encode one series against the LEFT axis (length → the axis
// MUST include 0, like any bar); a line encodes a second series against an
// INDEPENDENT right axis (a rate/ratio → not forced to 0). Shared x. A dual axis
// can mislead, so the honest discipline is enforced elsewhere: both axes labelled,
// each series coloured to its own axis (checkComboConformance). The reveal grows
// the columns and draws the line in the component (pure fn of progress).

import { scaleBand, scaleLinear } from "d3-scale";
import { formatNumber } from "./core/math";

export interface ComboData {
  categoryField: string;
  columnField: string; // left-axis series
  lineField: string; // right-axis series
  rows: Record<string, string | number>[];
}

export interface ComboDims {
  width: number;
  height: number;
  padding: { top: number; right: number; bottom: number; left: number };
}

export interface ComboColumn {
  index: number;
  category: string;
  value: number;
  x: number; // left edge of the band-padded column
  w: number;
  y: number; // top of the column at full value
  h: number; // height at full value
}

export interface ComboLinePoint {
  index: number;
  category: string;
  value: number;
  cx: number; // band centre
  cy: number; // y on the right axis
}

export interface ComboLayout {
  innerWidth: number;
  innerHeight: number;
  columns: ComboColumn[];
  linePoints: ComboLinePoint[];
  leftTicks: { value: number; y: number; label: string }[];
  rightTicks: { value: number; y: number; label: string }[];
  leftDomain: [number, number];
  rightDomain: [number, number];
}

function niceMax(v: number): number {
  if (v <= 0) return 1;
  const pow = Math.pow(10, Math.floor(Math.log10(v)));
  const n = v / pow;
  const step = n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10;
  return step * pow;
}

/** A "nice" [min,max] for the right (rate) axis — NOT forced to 0. */
function niceExtent(lo: number, hi: number): [number, number] {
  if (lo === hi) return [lo - 1, hi + 1];
  const span = hi - lo;
  const pad = span * 0.1;
  return [lo - pad, hi + pad];
}

export function computeComboLayout(
  data: ComboData,
  dims: ComboDims,
): ComboLayout {
  if (!data.rows.length)
    throw new Error("computeComboLayout: data.rows is empty");
  const { width, height, padding } = dims;
  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;
  if (innerWidth <= 0 || innerHeight <= 0)
    throw new Error("computeComboLayout: padding exceeds dimensions");

  const parsed = data.rows.map((r) => {
    const colV = Number(r[data.columnField]);
    const lineV = Number(r[data.lineField]);
    if (Number.isNaN(colV))
      throw new Error(`invalid column value: ${r[data.columnField]}`);
    if (Number.isNaN(lineV))
      throw new Error(`invalid line value: ${r[data.lineField]}`);
    if (colV < 0)
      throw new Error("combo column cannot encode a negative value as length");
    return { category: String(r[data.categoryField]), colV, lineV };
  });

  const band = scaleBand<number>()
    .domain(parsed.map((_, i) => i))
    .range([0, innerWidth])
    .padding(0.3);

  // LEFT axis: columns → must include 0 (length encoding).
  const leftMax = niceMax(Math.max(...parsed.map((d) => d.colV)));
  const left = scaleLinear().domain([0, leftMax]).range([innerHeight, 0]);

  // RIGHT axis: line (a rate) → independent, nice extent, not forced to 0.
  const lineLo = Math.min(...parsed.map((d) => d.lineV));
  const lineHi = Math.max(...parsed.map((d) => d.lineV));
  const rightDomain = niceExtent(lineLo, lineHi);
  const right = scaleLinear().domain(rightDomain).range([innerHeight, 0]);

  const bw = band.bandwidth();
  const columns: ComboColumn[] = parsed.map((d, i) => {
    const y = left(d.colV);
    return {
      index: i,
      category: d.category,
      value: d.colV,
      x: band(i) ?? 0,
      w: bw,
      y,
      h: innerHeight - y,
    };
  });

  const linePoints: ComboLinePoint[] = parsed.map((d, i) => ({
    index: i,
    category: d.category,
    value: d.lineV,
    cx: (band(i) ?? 0) + bw / 2, // exactly the column band centre
    cy: right(d.lineV),
  }));

  // compact tick labels (1000000 → "1M") so wide axes never overflow the gutter
  const leftTicks = left
    .ticks(5)
    .map((t) => ({ value: t, y: left(t), label: formatNumber(t) }));
  const rightTicks = right
    .ticks(5)
    .map((t) => ({ value: t, y: right(t), label: formatNumber(t) }));

  return {
    innerWidth,
    innerHeight,
    columns,
    linePoints,
    leftTicks,
    rightTicks,
    leftDomain: [0, leftMax],
    rightDomain,
  };
}
