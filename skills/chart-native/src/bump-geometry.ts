// Pure geometry core for BUMP charts — framework-free (D3 = math). A ranking-
// over-time layout: each item is a line through its rank (1 = top) at every
// ordered period; the read is the crossings. x = period (even points), y = rank
// (even points, 1 at top). The reveal draws each line left → right — a pure
// function of a per-line progress computed in the component.

import { scalePoint, scaleLinear } from "d3-scale";

export interface BumpData {
  periods: string[]; // ordered time captions
  items: { label: string; ranks: number[] }[]; // rank per period (1 = top)
  highlight?: string[]; // item labels to accent (others are greyed context)
}

export interface BumpDims {
  width: number;
  height: number;
  padding: { top: number; right: number; bottom: number; left: number };
}

export interface BumpPoint {
  periodIndex: number;
  rank: number;
  x: number;
  y: number;
}

export interface BumpLine {
  index: number;
  label: string;
  highlighted: boolean;
  points: BumpPoint[];
  startRank: number;
  endRank: number;
}

export interface BumpLayout {
  innerWidth: number;
  innerHeight: number;
  periodsX: { label: string; x: number }[];
  rankAxis: { rank: number; y: number }[];
  lines: BumpLine[];
  maxRank: number;
}

export function computeBumpLayout(data: BumpData, dims: BumpDims): BumpLayout {
  const nP = data.periods.length;
  if (nP < 2) throw new Error("computeBumpLayout: need ≥ 2 periods");
  if (!data.items.length) throw new Error("computeBumpLayout: no items");
  const { width, height, padding } = dims;
  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;
  if (innerWidth <= 0 || innerHeight <= 0)
    throw new Error("computeBumpLayout: padding exceeds dimensions");

  for (const it of data.items)
    if (it.ranks.length !== nP)
      throw new Error(
        `item "${it.label}" has ${it.ranks.length} ranks, expected ${nP}`,
      );

  const maxRank = Math.max(...data.items.flatMap((it) => it.ranks));

  const x = scalePoint<number>()
    .domain(data.periods.map((_, i) => i))
    .range([0, innerWidth]);
  // rank 1 at the TOP (y = 0); rank maxRank at the bottom.
  const y = scaleLinear().domain([1, maxRank]).range([0, innerHeight]);

  const highlight = new Set(data.highlight ?? []);

  const lines: BumpLine[] = data.items.map((it, i) => ({
    index: i,
    label: it.label,
    highlighted: highlight.size === 0 ? true : highlight.has(it.label),
    startRank: it.ranks[0],
    endRank: it.ranks[nP - 1],
    points: it.ranks.map((r, pi) => ({
      periodIndex: pi,
      rank: r,
      x: x(pi) ?? 0,
      y: y(r),
    })),
  }));

  return {
    innerWidth,
    innerHeight,
    periodsX: data.periods.map((label, i) => ({ label, x: x(i) ?? 0 })),
    rankAxis: Array.from({ length: maxRank }, (_, k) => ({
      rank: k + 1,
      y: y(k + 1),
    })),
    lines,
    maxRank,
  };
}

/** The visible sub-path of a line as it draws left → right at `progress`. Pure —
 * at progress 0 it is empty (nothing drawn); at 1 it is the whole line. */
export function drawBumpPath(
  points: BumpPoint[],
  progress: number,
): { x: number; y: number }[] {
  const p = progress < 0 ? 0 : progress > 1 ? 1 : progress;
  if (p <= 0 || points.length === 0) return [];
  const xMin = points[0].x;
  const xMax = points[points.length - 1].x;
  const headX = xMin + (xMax - xMin) * p;
  const out: { x: number; y: number }[] = [];
  for (let i = 0; i < points.length; i++) {
    if (points[i].x <= headX) {
      out.push({ x: points[i].x, y: points[i].y });
    } else {
      const a = points[i - 1];
      const b = points[i];
      const t = (headX - a.x) / (b.x - a.x);
      out.push({ x: headX, y: a.y + (b.y - a.y) * t });
      break;
    }
  }
  return out;
}
