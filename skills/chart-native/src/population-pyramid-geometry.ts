// Pure geometry core for POPULATION PYRAMIDS — framework-free (D3 = math).
// Two back-to-back bars per ordered band sharing a central axis: left group
// extends LEFT, right group RIGHT, both from the central zero on the SAME
// magnitude scale (so the groups are comparable). A reserved centre gutter holds
// the band labels. Bars grow from the centre outward — a pure function of a
// per-band progress computed in the component.

import { scaleBand, scaleLinear } from "d3-scale";

export interface PyramidData {
  bandField: string;
  leftField: string; // group A (drawn left)
  rightField: string; // group B (drawn right)
  rows: Record<string, string | number>[];
}

export interface PyramidDims {
  width: number;
  height: number;
  padding: { top: number; right: number; bottom: number; left: number };
}

export interface PyramidOptions {
  centerGap?: number; // px reserved in the centre for band labels (default 56)
}

export interface PyramidBand {
  index: number;
  bandLabel: string;
  leftVal: number;
  rightVal: number;
  y: number; // band top
  h: number; // band height
  /** left bar: tip (outer) → centre edge */
  leftX: number;
  leftW: number;
  /** right bar: centre edge → tip */
  rightX: number;
  rightW: number;
}

export interface PyramidLayout {
  innerWidth: number;
  innerHeight: number;
  centerX: number; // mid line of the central gutter
  leftEdge: number; // inner (centre) edge of the left half
  rightEdge: number; // inner (centre) edge of the right half
  half: number; // usable half-width per side
  bands: PyramidBand[];
  /** magnitude ticks (positive); mirror them on each side in the component */
  magTicks: { mag: number; leftPos: number; rightPos: number }[];
  maxMag: number;
}

export function computePyramidLayout(
  data: PyramidData,
  dims: PyramidDims,
  options: PyramidOptions = {},
): PyramidLayout {
  if (!data.rows.length)
    throw new Error("computePyramidLayout: data.rows is empty");
  const { width, height, padding } = dims;
  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;
  if (innerWidth <= 0 || innerHeight <= 0)
    throw new Error("computePyramidLayout: padding exceeds dimensions");

  const centerGap = options.centerGap ?? 56;
  const half = (innerWidth - centerGap) / 2;
  if (half <= 0) throw new Error("computePyramidLayout: centre gap too wide");

  const parsed = data.rows.map((r) => {
    const leftVal = Number(r[data.leftField]);
    const rightVal = Number(r[data.rightField]);
    if (
      Number.isNaN(leftVal) ||
      Number.isNaN(rightVal) ||
      leftVal < 0 ||
      rightVal < 0
    )
      throw new Error(
        `invalid pyramid value: ${r[data.leftField]} / ${r[data.rightField]}`,
      );
    return { bandLabel: String(r[data.bandField]), leftVal, rightVal };
  });

  // shared magnitude scale (same on both sides → comparable).
  const maxMag = Math.max(...parsed.flatMap((d) => [d.leftVal, d.rightVal]), 1);
  const mag = scaleLinear().domain([0, maxMag]).nice().range([0, half]);
  const niceMax = mag.domain()[1] as number;

  const centerX = innerWidth / 2;
  const leftEdge = centerX - centerGap / 2; // inner edge of left half
  const rightEdge = centerX + centerGap / 2; // inner edge of right half

  const band = scaleBand<number>()
    .domain(parsed.map((_, i) => i))
    .range([0, innerHeight])
    .padding(0.3);
  const bw = band.bandwidth();

  const bands: PyramidBand[] = parsed.map((d, i) => {
    const lw = mag(d.leftVal);
    const rw = mag(d.rightVal);
    return {
      index: i,
      bandLabel: d.bandLabel,
      leftVal: d.leftVal,
      rightVal: d.rightVal,
      y: band(i) ?? 0,
      h: bw,
      leftX: leftEdge - lw,
      leftW: lw,
      rightX: rightEdge,
      rightW: rw,
    };
  });

  const magTicks = mag.ticks(4).map((t) => ({
    mag: t,
    leftPos: leftEdge - mag(t),
    rightPos: rightEdge + mag(t),
  }));

  return {
    innerWidth,
    innerHeight,
    centerX,
    leftEdge,
    rightEdge,
    half,
    bands,
    magTicks,
    maxMag: niceMax,
  };
}

/**
 * Grow a band's bar from the central zero outward to `progress`. `side` picks
 * which bar; the centre edge stays fixed, the tip extends. Pure function.
 */
export function growPyramidBar(
  bar: PyramidBand,
  side: "left" | "right",
  progress: number,
): { x: number; y: number; w: number; h: number } {
  const p = progress < 0 ? 0 : progress > 1 ? 1 : progress;
  if (side === "left") {
    const w = bar.leftW * p;
    // left bar's centre edge is fixed (leftX + leftW); it grows leftward.
    return { x: bar.leftX + bar.leftW - w, y: bar.y, w, h: bar.h };
  }
  const w = bar.rightW * p;
  return { x: bar.rightX, y: bar.y, w, h: bar.h };
}
