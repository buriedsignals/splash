// Pure geometry core for RADAR / spider charts — framework-free. A POLAR multi-
// axis layout: N axes from the centre (angle 0 = 12 o'clock, clockwise), one
// shared radial scale from the centre (= 0). Each series is a polygon of its
// values. The reveal interpolates every vertex from the centre outward — a pure
// function of a per-series progress computed in the component.

import { scaleLinear } from "d3-scale";

export interface RadarData {
  axes: string[]; // dimension labels, in order
  max: number; // common radial max (centre = 0)
  series: { label: string; values: number[] }[];
}

export interface RadarDims {
  width: number;
  height: number;
  padding: { top: number; right: number; bottom: number; left: number };
}

export interface RadarVertex {
  axisIndex: number;
  value: number;
  /** full position at progress=1, relative to the centre */
  x: number;
  y: number;
}

export interface RadarSeries {
  index: number;
  label: string;
  vertices: RadarVertex[];
}

export interface RadarAxis {
  index: number;
  label: string;
  angle: number; // radians, 0 = up, clockwise
  /** spoke end (at the outer radius), relative to centre */
  ex: number;
  ey: number;
  side: "left" | "right" | "center";
}

export interface RadarLayout {
  cx: number;
  cy: number;
  radius: number;
  axes: RadarAxis[];
  series: RadarSeries[];
  /** ring radii (gridlines) with their scale value */
  rings: { r: number; value: number }[];
  max: number;
}

export function computeRadarLayout(
  data: RadarData,
  dims: RadarDims,
): RadarLayout {
  if (data.axes.length < 3)
    throw new Error("computeRadarLayout: need ≥ 3 axes");
  if (!data.series.length) throw new Error("computeRadarLayout: no series");
  const { width, height, padding } = dims;
  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;
  if (innerWidth <= 0 || innerHeight <= 0)
    throw new Error("computeRadarLayout: padding exceeds dimensions");

  const cx = padding.left + innerWidth / 2;
  const cy = padding.top + innerHeight / 2;
  const radius = Math.min(innerWidth, innerHeight) / 2;
  const max = data.max > 0 ? data.max : 1;
  const r = scaleLinear().domain([0, max]).range([0, radius]);

  const N = data.axes.length;
  const angleOf = (i: number) => -Math.PI / 2 + (i / N) * Math.PI * 2;

  const axes: RadarAxis[] = data.axes.map((label, i) => {
    const a = angleOf(i);
    // a label's horizontal anchor follows the x-component (cos): a spoke at the
    // top/bottom (cos≈0) is centred, one on the right (cos>0) anchors start, one
    // on the left (cos<0) anchors end. (sin is the vertical component — wrong axis.)
    const cos = Math.cos(a);
    const side: "left" | "right" | "center" =
      Math.abs(cos) < 0.2 ? "center" : cos > 0 ? "right" : "left";
    return {
      index: i,
      label,
      angle: a,
      ex: Math.cos(a) * radius,
      ey: Math.sin(a) * radius,
      side,
    };
  });

  const series: RadarSeries[] = data.series.map((s, si) => {
    if (s.values.length !== N)
      throw new Error(
        `series "${s.label}" has ${s.values.length} values, expected ${N}`,
      );
    return {
      index: si,
      label: s.label,
      vertices: s.values.map((v, i) => {
        const a = angleOf(i);
        const rad = r(v);
        return {
          axisIndex: i,
          value: v,
          x: Math.cos(a) * rad,
          y: Math.sin(a) * rad,
        };
      }),
    };
  });

  const rings = r
    .ticks(4)
    .filter((t) => t > 0)
    .map((t) => ({ r: r(t), value: t }));

  return { cx, cy, radius, axes, series, rings, max };
}

/** A series' polygon points at `progress` (every vertex grows from the centre). */
export function growRadar(
  s: RadarSeries,
  progress: number,
): { x: number; y: number }[] {
  const p = progress < 0 ? 0 : progress > 1 ? 1 : progress;
  return s.vertices.map((v) => ({ x: v.x * p, y: v.y * p }));
}
