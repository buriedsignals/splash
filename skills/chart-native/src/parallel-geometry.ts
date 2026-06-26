// Pure geometry core for PARALLEL COORDINATES — framework-free (D3 = math:
// d3-scale). Several variables on parallel vertical axes, each with its OWN
// min–max scale; each item is a polyline crossing every axis at its value. The
// reveal is a left→right clip of the static lines, so geometry is fixed and frame
// N is a pure function of the frame.

import { scaleLinear, scalePoint } from "d3-scale";

export interface ParallelDimension {
  key: string;
  label: string;
}

export interface ParallelData {
  dimensions: ParallelDimension[];
  items: Record<string, string | number>[]; // each has a `label` + a value per dim key
  labelField?: string; // defaults to "label"
  highlight?: string[]; // item labels to accent
}

export interface ParallelDims {
  width: number;
  height: number;
  padding: { top: number; right: number; bottom: number; left: number };
}

export interface ParallelAxis {
  key: string;
  label: string;
  x: number;
  minVal: number;
  maxVal: number;
  yTop: number; // screen y of the max
  yBottom: number; // screen y of the min
}

export interface ParallelLine {
  index: number;
  label: string;
  highlighted: boolean;
  points: { x: number; y: number }[];
}

export interface ParallelLayout {
  innerWidth: number;
  innerHeight: number;
  axes: ParallelAxis[];
  lines: ParallelLine[];
}

export function computeParallelLayout(
  data: ParallelData,
  dims: ParallelDims,
): ParallelLayout {
  const D = data.dimensions.length;
  if (D < 2) throw new Error("computeParallelLayout: need ≥ 2 dimensions");
  if (!data.items.length) throw new Error("computeParallelLayout: no items");
  const { width, height, padding } = dims;
  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;
  if (innerWidth <= 0 || innerHeight <= 0)
    throw new Error("computeParallelLayout: padding exceeds dimensions");

  const labelField = data.labelField ?? "label";
  const x = scalePoint<string>()
    .domain(data.dimensions.map((d) => d.key))
    .range([0, innerWidth]);

  // one independent scale per dimension (its own min–max)
  const scales = new Map<string, ReturnType<typeof scaleLinear<number>>>();
  const axes: ParallelAxis[] = data.dimensions.map((d) => {
    const vals = data.items.map((it) => Number(it[d.key]));
    if (vals.some((v) => Number.isNaN(v)))
      throw new Error(`computeParallelLayout: non-numeric value on "${d.key}"`);
    const minVal = Math.min(...vals);
    const maxVal = Math.max(...vals);
    const pad = (maxVal - minVal) * 0.05 || 1;
    const sc = scaleLinear()
      .domain([minVal - pad, maxVal + pad])
      .range([innerHeight, 0]);
    scales.set(d.key, sc);
    return {
      key: d.key,
      label: d.label,
      x: x(d.key) ?? 0,
      minVal,
      maxVal,
      yTop: sc(maxVal),
      yBottom: sc(minVal),
    };
  });

  const highlight = new Set(data.highlight ?? []);
  const lines: ParallelLine[] = data.items.map((it, i) => ({
    index: i,
    label: String(it[labelField]),
    highlighted:
      highlight.size === 0 ? true : highlight.has(String(it[labelField])),
    points: data.dimensions.map((d) => ({
      x: x(d.key) ?? 0,
      y: scales.get(d.key)!(Number(it[d.key])),
    })),
  }));

  return { innerWidth, innerHeight, axes, lines };
}
