// Pure geometry core for STACKED AREA charts — framework-free (D3 = math:
// d3-shape area + d3-scale). The continuous sibling of the stacked bar: several
// series stacked on a CONTINUOUS x (time). The value axis ALWAYS includes 0
// (inherited baseline rule, stacked-area.md). The reveal is a left→right wipe of
// the whole stack (handled in the component via a growing clip), so the band
// paths here are the full, static shapes — frame-deterministic for video.

import { scaleLinear } from "d3-scale";
import { area, line } from "d3-shape";
import { formatNumber } from "./core/math";

export interface StackedAreaData {
  xField: string;
  seriesFields: string[]; // stacking order, bottom → top
  rows: Record<string, string | number>[];
}

export interface StackedAreaDims {
  width: number;
  height: number;
  padding: { top: number; right: number; bottom: number; left: number };
}

export interface AreaBand {
  seriesIndex: number;
  seriesKey: string;
  /** full filled-area SVG path (static; the reveal clips it left→right) */
  path: string;
  /** the band's TOP edge as a polyline path — drawn as a thin separator stroke
   *  so adjacent opaque bands read as distinct layers, not one solid mass */
  topLine: string;
  /** screen y of the band's mid-point at the LAST x (for the right-edge label) */
  labelY: number;
  /** the band's value at the last x */
  lastValue: number;
}

export interface StackedAreaLayout {
  innerWidth: number;
  innerHeight: number;
  bands: AreaBand[];
  xTicks: { pos: number; label: string }[];
  valueTicks: { pos: number; label: string }[];
  valueDomain: [number, number];
}

export function computeStackedAreaLayout(
  data: StackedAreaData,
  dims: StackedAreaDims,
  // how many x (time) ticks to aim for — fewer on narrow plots so the year
  // labels never collide (caught at 360px).
  xTickHint = 6,
): StackedAreaLayout {
  if (!data.rows.length)
    throw new Error("computeStackedAreaLayout: data.rows is empty");
  if (!data.seriesFields.length)
    throw new Error("computeStackedAreaLayout: seriesFields is empty");
  const { width, height, padding } = dims;
  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;
  if (innerWidth <= 0 || innerHeight <= 0)
    throw new Error("computeStackedAreaLayout: padding exceeds dimensions");

  const parsed = data.rows.map((r) => {
    const x = Number(r[data.xField]);
    if (Number.isNaN(x)) throw new Error(`invalid x value: ${r[data.xField]}`);
    const values = data.seriesFields.map((k) => {
      const v = Number(r[k]);
      if (Number.isNaN(v) || v < 0)
        throw new Error(`invalid stacked-area value for "${k}": ${r[k]}`);
      return v;
    });
    return { x, values };
  });
  parsed.sort((a, b) => a.x - b.x);

  const totals = parsed.map((d) => d.values.reduce((s, v) => s + v, 0));
  const yMax = Math.max(0, ...totals);
  const xs = parsed.map((d) => d.x);

  const xScale = scaleLinear()
    .domain([Math.min(...xs), Math.max(...xs)])
    .range([0, innerWidth]);
  const yScale = scaleLinear().domain([0, yMax]).nice().range([innerHeight, 0]);
  const niceDomain = yScale.domain() as [number, number];

  // cumulative stack: for each point, running sum bottom → top.
  const areaGen = area<{ x: number; y0: number; y1: number }>()
    .x((d) => d.x)
    .y0((d) => d.y0)
    .y1((d) => d.y1);
  const lineGen = line<{ x: number; y1: number }>()
    .x((d) => d.x)
    .y((d) => d.y1);

  const bands: AreaBand[] = data.seriesFields.map((key, si) => {
    const pts = parsed.map((d) => {
      let cum = 0;
      for (let k = 0; k < si; k++) cum += d.values[k];
      const bottom = cum;
      const top = cum + d.values[si];
      return {
        x: xScale(d.x),
        y0: yScale(bottom),
        y1: yScale(top),
      };
    });
    const last = pts[pts.length - 1];
    return {
      seriesIndex: si,
      seriesKey: key,
      path: areaGen(pts) ?? "",
      topLine: lineGen(pts) ?? "",
      labelY: (last.y0 + last.y1) / 2,
      lastValue: parsed[parsed.length - 1].values[si],
    };
  });

  const xTicks = xScale
    .ticks(Math.max(2, xTickHint))
    .map((t) => ({ pos: xScale(t), label: String(Math.round(t)) }));
  const valueTicks = yScale
    .ticks(5)
    .map((t) => ({ pos: yScale(t), label: formatNumber(t) }));

  return {
    innerWidth,
    innerHeight,
    bands,
    xTicks,
    valueTicks,
    valueDomain: niceDomain,
  };
}
