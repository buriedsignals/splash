// Pure geometry core for WATERFALL / bridge charts — framework-free (D3 = math).
// A starting total bridges to an ending total through signed steps; each step is a
// FLOATING bar that begins where the previous ended. The count axis includes 0
// (baseline rule). The reveal grows each bar from its START level — a pure function
// of a per-bar progress computed in the component.

import { scaleBand, scaleLinear } from "d3-scale";

export interface WaterfallRow {
  label: string;
  value: number;
  /** true = an absolute TOTAL drawn from zero (first/last); else a signed delta */
  total?: boolean;
}

export interface WaterfallData {
  rows: WaterfallRow[];
}

export interface WaterfallDims {
  width: number;
  height: number;
  padding: { top: number; right: number; bottom: number; left: number };
}

export interface WaterfallBar {
  index: number;
  label: string;
  value: number; // the step's signed value (delta) or absolute (total)
  isTotal: boolean;
  sign: 1 | -1;
  startVal: number; // running level the bar starts at (0 for totals)
  endVal: number; // running level the bar ends at
  x: number; // band left
  w: number; // band width
  startY: number; // screen y of startVal
  endY: number; // screen y of endVal
  /** y of the connector that leaves this bar toward the next (= endY) */
  connectorY: number;
}

export interface WaterfallLayout {
  innerWidth: number;
  innerHeight: number;
  base: number; // screen y of 0
  bars: WaterfallBar[];
  countTicks: { pos: number; label: string }[];
  countDomain: [number, number];
}

export function computeWaterfallLayout(
  data: WaterfallData,
  dims: WaterfallDims,
): WaterfallLayout {
  if (!data.rows.length)
    throw new Error("computeWaterfallLayout: data.rows is empty");
  const { width, height, padding } = dims;
  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;
  if (innerWidth <= 0 || innerHeight <= 0)
    throw new Error("computeWaterfallLayout: padding exceeds dimensions");

  // running cumulative; totals reset to their absolute value
  let running = 0;
  const steps = data.rows.map((r) => {
    const value = Number(r.value);
    if (Number.isNaN(value))
      throw new Error(`invalid waterfall value: ${r.value}`);
    let startVal: number;
    let endVal: number;
    if (r.total) {
      startVal = 0;
      endVal = value;
      running = value;
    } else {
      startVal = running;
      endVal = running + value;
      running = endVal;
    }
    return {
      label: r.label,
      value,
      isTotal: !!r.total,
      sign: (value >= 0 ? 1 : -1) as 1 | -1,
      startVal,
      endVal,
    };
  });

  const maxLevel = Math.max(0, ...steps.flatMap((s) => [s.startVal, s.endVal]));

  const yScale = scaleLinear()
    .domain([0, maxLevel])
    .nice()
    .range([innerHeight, 0]);
  const niceDomain = yScale.domain() as [number, number];
  const base = yScale(0);

  const band = scaleBand<number>()
    .domain(steps.map((_, i) => i))
    .range([0, innerWidth])
    .padding(0.34);
  const bw = band.bandwidth();

  const bars: WaterfallBar[] = steps.map((s, i) => {
    const startY = yScale(s.startVal);
    const endY = yScale(s.endVal);
    return {
      index: i,
      label: s.label,
      value: s.value,
      isTotal: s.isTotal,
      sign: s.sign,
      startVal: s.startVal,
      endVal: s.endVal,
      x: band(i) ?? 0,
      w: bw,
      startY,
      endY,
      connectorY: endY,
    };
  });

  const countTicks = yScale
    .ticks(5)
    .map((t) => ({ pos: yScale(t), label: String(t) }));

  return {
    innerWidth,
    innerHeight,
    base,
    bars,
    countTicks,
    countDomain: niceDomain,
  };
}

/**
 * Grow a waterfall bar from its START level toward its END at `progress`. The
 * start edge is fixed; the other edge moves. `minBarPx` enforces a minimum DRAWN
 * height for a non-zero step, so a tiny delta (e.g. +2 on a 0–2000 scale) never
 * collapses to a sub-pixel sliver and vanishes — best practice for waterfalls.
 * The connectors still anchor to the TRUE level, so the visual nudge is ≤ minBarPx.
 * Pure function → reproducible frames.
 */
export function growWaterfallBar(
  bar: WaterfallBar,
  progress: number,
  minBarPx = 0,
): { x: number; y: number; w: number; h: number } {
  const p = progress < 0 ? 0 : progress > 1 ? 1 : progress;
  const fullH = Math.abs(bar.endY - bar.startY);
  const dir = bar.endY >= bar.startY ? 1 : -1; // down (larger y) vs up
  // a non-zero step draws at least minBarPx; a true zero step stays zero.
  const drawFull = fullH > 0 && fullH < minBarPx ? minBarPx : fullH;
  const curH = drawFull * p;
  const y = dir > 0 ? bar.startY : bar.startY - curH;
  return { x: bar.x, y, w: bar.w, h: curH };
}
