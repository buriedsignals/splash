// Pure geometry core for DIVERGING STACKED BARS / Likert — framework-free (D3 =
// math). An ordered-categorical stacked layout centred at 0: negative responses
// extend LEFT, positive extend RIGHT, an optional neutral straddles the centre.
// Horizontal (item rows) so labels fit a left gutter. The reveal grows each
// segment from the centre outward — a pure function of a per-row progress.

import { scaleBand, scaleLinear } from "d3-scale";

export interface DivergingStackedData {
  responses: string[]; // ordered negative → positive
  neutralIndex?: number; // a response that straddles the centre (half each side)
  items: { label: string; values: number[] }[]; // % per response (sum ≈ 100)
}

export interface DivergingStackedDims {
  width: number;
  height: number;
  padding: { top: number; right: number; bottom: number; left: number };
}

export interface DSSegment {
  responseIndex: number;
  value: number; // percentage
  side: "left" | "right" | "neutral";
  /** percent-space edges relative to the centre (0); left edges are negative */
  pctLo: number;
  pctHi: number;
  x0: number; // screen x of the inner edge
  x1: number; // screen x of the outer edge
}

export interface DSRow {
  index: number;
  label: string;
  y: number; // band centre
  h: number;
  segments: DSSegment[];
}

export interface DivergingStackedLayout {
  innerWidth: number;
  innerHeight: number;
  centerX: number;
  rows: DSRow[];
  pctTicks: { pos: number; label: string }[];
  maxReach: number; // largest |percent| reached on either side
}

export function computeDivergingStackedLayout(
  data: DivergingStackedData,
  dims: DivergingStackedDims,
): DivergingStackedLayout {
  const R = data.responses.length;
  if (R < 2)
    throw new Error("computeDivergingStackedLayout: need ≥ 2 responses");
  if (!data.items.length)
    throw new Error("computeDivergingStackedLayout: no items");
  for (const it of data.items)
    if (it.values.length !== R)
      throw new Error(
        `item "${it.label}" has ${it.values.length} values, expected ${R}`,
      );

  const { width, height, padding } = dims;
  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;
  if (innerWidth <= 0 || innerHeight <= 0)
    throw new Error(
      "computeDivergingStackedLayout: padding exceeds dimensions",
    );

  const neutral = data.neutralIndex;
  const leftEnd = neutral ?? Math.floor(R / 2); // responses [0, leftEnd) go left
  const rightStart = neutral != null ? neutral + 1 : leftEnd; // [rightStart, R) right

  // first pass: percent-space edges per row, to find the max reach on each side.
  type RawSeg = {
    responseIndex: number;
    value: number;
    side: DSSegment["side"];
    pctLo: number;
    pctHi: number;
  };
  const rowsRaw: RawSeg[][] = data.items.map((it) => {
    const segs: RawSeg[] = [];
    const nv = neutral != null ? it.values[neutral] : 0;
    // neutral straddles the centre
    if (neutral != null && nv > 0)
      segs.push({
        responseIndex: neutral,
        value: nv,
        side: "neutral",
        pctLo: -nv / 2,
        pctHi: nv / 2,
      });
    // left segments: from the neutral's left edge outward (closest response first)
    let cursor = neutral != null ? -nv / 2 : 0;
    for (let i = leftEnd - 1; i >= 0; i--) {
      const v = it.values[i];
      segs.push({
        responseIndex: i,
        value: v,
        side: "left",
        pctLo: cursor - v,
        pctHi: cursor,
      });
      cursor -= v;
    }
    // right segments: from the neutral's right edge outward
    cursor = neutral != null ? nv / 2 : 0;
    for (let i = rightStart; i < R; i++) {
      const v = it.values[i];
      segs.push({
        responseIndex: i,
        value: v,
        side: "right",
        pctLo: cursor,
        pctHi: cursor + v,
      });
      cursor += v;
    }
    return segs;
  });

  const maxReach =
    Math.max(
      1,
      ...rowsRaw.flatMap((segs) =>
        segs.flatMap((s) => [Math.abs(s.pctLo), Math.abs(s.pctHi)]),
      ),
    ) * 1.02;

  const centerX = innerWidth / 2;
  const pct = scaleLinear()
    .domain([-maxReach, maxReach])
    .range([0, innerWidth]);
  const band = scaleBand<number>()
    .domain(data.items.map((_, i) => i))
    .range([0, innerHeight])
    .padding(0.4);
  const bw = band.bandwidth();

  const rows: DSRow[] = data.items.map((it, i) => ({
    index: i,
    label: it.label,
    y: (band(i) ?? 0) + bw / 2,
    h: bw,
    segments: rowsRaw[i].map((s) => ({
      ...s,
      x0: pct(s.pctLo < 0 ? s.pctHi : s.pctLo), // inner edge (toward centre)
      x1: pct(s.pctLo < 0 ? s.pctLo : s.pctHi), // outer edge
    })),
  }));

  // symmetric percent ticks — widen the step until adjacent ticks clear ~44px,
  // so the labels never crowd on a narrow phone.
  let step = maxReach > 60 ? 25 : maxReach > 30 ? 20 : 10;
  const pxPerUnit = innerWidth / (2 * maxReach);
  while (pxPerUnit * step < 44 && step < maxReach) step *= 2;
  const ticks: { pos: number; label: string }[] = [];
  for (let t = 0; t <= maxReach; t += step) {
    ticks.push({ pos: pct(t), label: `${t}%` });
    if (t > 0) ticks.unshift({ pos: pct(-t), label: `${t}%` });
  }

  return { innerWidth, innerHeight, centerX, rows, pctTicks: ticks, maxReach };
}

/** A segment's [x0,x1] as it grows from the centre at `progress`. Pure — at
 *  progress 0 both edges collapse to the centre (zero width, invisible). */
export function growSegment(
  seg: DSSegment,
  centerX: number,
  progress: number,
): { x0: number; x1: number } {
  const p = progress < 0 ? 0 : progress > 1 ? 1 : progress;
  return {
    x0: centerX + (seg.x0 - centerX) * p,
    x1: centerX + (seg.x1 - centerX) * p,
  };
}
