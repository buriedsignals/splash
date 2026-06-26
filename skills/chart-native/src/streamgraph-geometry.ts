// Pure geometry core for STREAMGRAPHS — framework-free (D3 = math: d3-shape stack
// with the wiggle offset + inside-out order, d3-scale). A stacked area with NO
// fixed baseline: bands flow around a centred wiggling axis, thickness ∝ value.
// The geometry returns each band's screen points (x, y0, y1) per step; the reveal
// grows each band from its own centre-line, so silhouettes are fixed and frame N
// is a pure function of the frame.

import { scaleLinear, scalePoint } from "d3-scale";
import { stack, stackOffsetWiggle, stackOrderInsideOut } from "d3-shape";

export interface StreamgraphData {
  xField: string;
  seriesFields: string[];
  rows: Record<string, string | number>[];
}

export interface StreamgraphDims {
  width: number;
  height: number;
  padding: { top: number; right: number; bottom: number; left: number };
}

export interface StreamPoint {
  x: number;
  y0: number; // screen y of the lower edge
  y1: number; // screen y of the upper edge
}

export interface StreamBand {
  seriesIndex: number; // index into the ORIGINAL seriesFields
  seriesKey: string;
  points: StreamPoint[];
  /** the band's thickest step — where a direct label sits */
  labelX: number;
  labelY: number;
  labelThickness: number; // px thickness at the label step
  maxValue: number;
}

export interface StreamgraphLayout {
  innerWidth: number;
  innerHeight: number;
  bands: StreamBand[];
  xTicks: { pos: number; label: string }[];
}

export function computeStreamgraphLayout(
  data: StreamgraphData,
  dims: StreamgraphDims,
): StreamgraphLayout {
  if (data.rows.length < 2)
    throw new Error("computeStreamgraphLayout: need ≥ 2 time steps");
  if (!data.seriesFields.length)
    throw new Error("computeStreamgraphLayout: no series");
  const { width, height, padding } = dims;
  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;
  if (innerWidth <= 0 || innerHeight <= 0)
    throw new Error("computeStreamgraphLayout: padding exceeds dimensions");

  const series = stack<Record<string, string | number>>()
    .keys(data.seriesFields)
    .offset(stackOffsetWiggle)
    .order(stackOrderInsideOut)(data.rows);

  // domain across every stacked edge (the wiggle baseline can go negative).
  let lo = Infinity;
  let hi = -Infinity;
  for (const s of series)
    for (const p of s) {
      lo = Math.min(lo, p[0], p[1]);
      hi = Math.max(hi, p[0], p[1]);
    }
  const x = scalePoint<number>()
    .domain(data.rows.map((_, i) => i))
    .range([0, innerWidth]);
  const y = scaleLinear().domain([lo, hi]).range([innerHeight, 0]);

  const keyIndex = new Map(data.seriesFields.map((k, i) => [k, i]));

  const bands: StreamBand[] = series.map((s) => {
    const points: StreamPoint[] = s.map((p, i) => ({
      x: x(i) ?? 0,
      y0: y(p[0]),
      y1: y(p[1]),
    }));
    // the band's true peak thickness (for the tooltip), and the thickest
    // INTERIOR step for the label anchor — a label on an end step would overflow
    // the plot edge, so we keep it off the endpoints when there are ≥ 3 steps.
    const lastI = s.length - 1;
    let maxValue = -Infinity;
    s.forEach((p) => {
      maxValue = Math.max(maxValue, p[1] - p[0]);
    });
    let li = 0;
    let liThick = -Infinity;
    s.forEach((p, i) => {
      if (s.length >= 3 && (i === 0 || i === lastI)) return;
      const t = p[1] - p[0];
      if (t > liThick) {
        liThick = t;
        li = i;
      }
    });
    return {
      seriesIndex: keyIndex.get(s.key) ?? 0,
      seriesKey: s.key,
      points,
      labelX: points[li].x,
      labelY: (points[li].y0 + points[li].y1) / 2,
      labelThickness: Math.abs(points[li].y1 - points[li].y0),
      maxValue,
    };
  });

  const xTicks = data.rows.map((r, i) => ({
    pos: x(i) ?? 0,
    label: String(r[data.xField]),
  }));

  return { innerWidth, innerHeight, bands, xTicks };
}

/** A band's points as it grows from its own centre-line at `progress`. Pure —
 *  at progress 0 every step collapses to its mid-line (zero thickness). */
export function growStream(band: StreamBand, progress: number): StreamPoint[] {
  const p = progress < 0 ? 0 : progress > 1 ? 1 : progress;
  return band.points.map((pt) => {
    const mid = (pt.y0 + pt.y1) / 2;
    return {
      x: pt.x,
      y0: mid + (pt.y0 - mid) * p,
      y1: mid + (pt.y1 - mid) * p,
    };
  });
}
