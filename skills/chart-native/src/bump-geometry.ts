// Pure geometry core for BUMP charts — framework-free (D3 = math). A ranking-
// over-time layout: each item is a line through its rank (1 = top) at every
// ordered period; the read is the crossings. x = period (even points), y = rank
// (even points, 1 at top). The reveal draws each line left → right — a pure
// function of a per-line progress computed in the component.

import { scalePoint, scaleLinear } from "d3-scale";
import { BUMP_ACCENT_COLORS } from "./core/tokens";

/**
 * Resolve the accent colours for a bump chart's HIGHLIGHTED lines, in highlight
 * order — the SINGLE colour-resolution path shared by BumpChart (which paints them)
 * and produce-conformance (which validates them), so the two never drift and the
 * subject-fit colour the journalist approved in the spec reaches the bump chart like
 * every other chart-native type.
 *
 *   - a SINGLE highlighted line (or none — bump-geometry marks every line highlighted
 *     when `highlight` is empty, so they share one accent) uses `baseColor` (the
 *     subject-fit hue), falling back to `seriesColors[0]`, then the brand-profile
 *     story `accent` (editorial emphasis), then the BUMP_ACCENT_COLORS default.
 *   - MULTIPLE highlighted lines use `seriesColors` in highlight order (baseColor is,
 *     by definition, a single primary hue — several distinct lines need seriesColors);
 *     uncoloured slots fall back straight to BUMP_ACCENT_COLORS, cycled by index —
 *     `accent` does not apply here, so per-slot cycling is untouched.
 *
 * The result has one entry per highlighted line; with no highlight it has a single
 * entry — the accent every line shares. Non-highlighted lines are neutral COLORS.muted
 * context (never in this array), exempt from palette membership like a gridline.
 */
export function resolveBumpAccents(
  highlight: readonly string[] | undefined,
  colors: {
    baseColor?: string;
    seriesColors?: readonly string[];
    /** editorial-emphasis hue (brand-profile story accent). Only the SHARED/PEAK
     *  accent slot — the single-highlight case — reads it; multi-highlight
     *  per-slot BUMP_ACCENT_COLORS cycling is untouched. Absent → byte-identical. */
    accent?: string;
  } = {},
): string[] {
  const clean = (v: unknown): string | undefined =>
    typeof v === "string" && v.trim() ? v : undefined;
  const base = clean(colors.baseColor);
  const accent = clean(colors.accent);
  const series = (colors.seriesColors ?? [])
    .map(clean)
    .filter((c): c is string => c !== undefined);
  const count = Math.max(1, highlight?.length ?? 0);
  const fallback = (i: number) =>
    BUMP_ACCENT_COLORS[i % BUMP_ACCENT_COLORS.length];
  if (count === 1) return [base ?? series[0] ?? accent ?? fallback(0)];
  return Array.from({ length: count }, (_, i) => series[i] ?? fallback(i));
}

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
