// Pure geometry core — framework-free (D3 = math only, no React/DOM).
// Ported from the chart-annotated pilot and extended with a deterministic,
// frame-driven line-reveal (revealLine) so ONE component can serve static,
// interactive and video from the same layout.

import { scaleLinear, scaleTime } from "d3-scale";
import { extent } from "d3-array";
import { timeParse, timeFormat } from "d3-time-format";
import { formatNumber, clamp01 } from "./core/math";
import type { Lang } from "./core/locale";

export interface ChartData {
  xField: string;
  yField: string;
  xType: "time" | "linear";
  points: Record<string, string | number>[];
}

export interface Dims {
  width: number;
  height: number;
  padding: { top: number; right: number; bottom: number; left: number };
}

export interface ScreenPoint {
  x: number; // screen px
  y: number; // screen px
  rawX: string | number;
  rawY: number;
}

export interface Layout {
  innerWidth: number;
  innerHeight: number;
  points: ScreenPoint[];
  /** cumulative polyline length up to each point (length === points.length) */
  cumLength: number[];
  totalLength: number;
  xTicks: { x: number; label: string }[];
  yTicks: { y: number; label: string }[];
}

// Accept every temporal shape that `looksTemporal` (spec-to-config) admits — a bare
// year "1979", a year-month "2024-03", a full date, and the slash variants — not just
// "%Y-%m-%d". The classifier and the parser MUST agree, or a spec the classifier calls
// temporal throws "invalid date" at render (bug: a 4-digit-year line crashed the chart).
const DATE_PARSERS = [
  timeParse("%Y-%m-%d"),
  timeParse("%Y/%m/%d"),
  timeParse("%Y-%m"),
  timeParse("%Y/%m"),
  timeParse("%Y"),
];
export function parseFlexibleDate(v: string): Date | null {
  for (const p of DATE_PARSERS) {
    const d = p(v);
    if (d) return d;
  }
  return null;
}
const fmtYear = timeFormat("%Y");

export function computeChartLayout(
  data: ChartData,
  dims: Dims,
  xTickCount = 6,
  lang?: Lang,
): Layout {
  if (!data.points.length) {
    throw new Error("computeChartLayout: data.points is empty");
  }
  const { width, height, padding } = dims;
  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;
  if (innerWidth <= 0 || innerHeight <= 0) {
    throw new Error("computeChartLayout: padding exceeds dimensions");
  }
  const isTime = data.xType === "time";

  const px = (v: string | number): number | Date => {
    if (isTime) {
      const d = parseFlexibleDate(String(v));
      if (!d) throw new Error(`invalid date: ${v}`);
      return d;
    }
    const n = Number(v);
    if (Number.isNaN(n)) throw new Error(`invalid x: ${v}`);
    return n;
  };

  const parsed = data.points.map((p) => {
    const rawY = Number(p[data.yField]);
    if (Number.isNaN(rawY)) throw new Error(`invalid y: ${p[data.yField]}`);
    return {
      px: px(p[data.xField]) as number | Date,
      rawX: p[data.xField],
      rawY,
    };
  });

  const xDomain = extent(parsed, (d) => d.px) as
    [number, number] | [Date, Date];
  const yDomain = extent(parsed, (d) => d.rawY) as [number, number];

  const xScale = isTime
    ? scaleTime()
        .domain(xDomain as [Date, Date])
        .range([0, innerWidth])
    : scaleLinear()
        .domain(xDomain as [number, number])
        .range([0, innerWidth]);
  const yScale = scaleLinear().domain(yDomain).range([innerHeight, 0]).nice();

  const points: ScreenPoint[] = parsed.map((d) => ({
    x: (xScale as (v: number | Date) => number)(d.px),
    y: yScale(d.rawY),
    rawX: d.rawX,
    rawY: d.rawY,
  }));

  // cumulative polyline length (for the deterministic reveal)
  const cumLength: number[] = [0];
  for (let i = 1; i < points.length; i++) {
    const dx = points[i].x - points[i - 1].x;
    const dy = points[i].y - points[i - 1].y;
    cumLength.push(cumLength[i - 1] + Math.hypot(dx, dy));
  }
  const totalLength = cumLength[cumLength.length - 1];

  // On wide layouts a high tick count makes scaleTime emit sub-year ticks; with
  // a %Y label that renders the same year several times. Drop consecutive ticks
  // that carry the same label so each year appears once.
  const xTicks = (xScale.ticks(xTickCount) as (number | Date)[])
    .map((t) => ({
      x: (xScale as (v: number | Date) => number)(t),
      label: isTime ? fmtYear(t as Date) : String(t),
    }))
    .filter((t, i, a) => i === 0 || t.label !== a[i - 1].label);
  const yTicks = yScale
    .ticks(5)
    .map((t) => ({ y: yScale(t), label: formatNumber(t, lang) }));

  return {
    innerWidth,
    innerHeight,
    points,
    cumLength,
    totalLength,
    xTicks,
    yTicks,
  };
}

/** Full polyline as an SVG path string. */
export function linePath(points: ScreenPoint[]): string {
  if (!points.length) return "";
  return points
    .map((p, i) => `${i === 0 ? "M" : "L"}${round(p.x)},${round(p.y)}`)
    .join(" ");
}

/**
 * Deterministic frame-driven reveal: returns the polyline drawn up to
 * `progress` (0 -> nothing, 1 -> full line), interpolating WITHIN the final
 * segment so the draw-head moves smoothly. Pure function of (layout, progress)
 * — no DOM, no clock, no randomness. This is what makes the video frames
 * reproducible per Tom's discipline.
 */
export function revealLine(layout: Layout, progress: number): string {
  const { points, cumLength, totalLength } = layout;
  if (points.length === 0) return "";
  const p = clamp01(progress);
  if (p <= 0) return "";
  if (totalLength === 0) {
    // degenerate (all points same x/y): just the first point once revealed
    return `M${round(points[0].x)},${round(points[0].y)}`;
  }
  const target = p * totalLength;

  const out: ScreenPoint[] = [points[0]];
  for (let i = 1; i < points.length; i++) {
    if (cumLength[i] <= target) {
      out.push(points[i]);
      continue;
    }
    // target falls inside segment (i-1 -> i): interpolate the head
    const segStart = cumLength[i - 1];
    const segLen = cumLength[i] - segStart;
    const frac = segLen === 0 ? 0 : (target - segStart) / segLen;
    const a = points[i - 1];
    const b = points[i];
    out.push({
      x: a.x + (b.x - a.x) * frac,
      y: a.y + (b.y - a.y) * frac,
      rawX: b.rawX,
      rawY: b.rawY,
    });
    break;
  }
  return linePath(out);
}

/** The draw-head point (tip of the revealed line) at a given progress. */
export function revealHead(layout: Layout, progress: number): ScreenPoint {
  const { points, cumLength, totalLength } = layout;
  const p = clamp01(progress);
  if (totalLength === 0 || p <= 0) return points[0];
  const target = p * totalLength;
  for (let i = 1; i < points.length; i++) {
    if (cumLength[i] >= target) {
      const segStart = cumLength[i - 1];
      const segLen = cumLength[i] - segStart;
      const frac = segLen === 0 ? 0 : (target - segStart) / segLen;
      const a = points[i - 1];
      const b = points[i];
      return {
        x: a.x + (b.x - a.x) * frac,
        y: a.y + (b.y - a.y) * frac,
        rawX: b.rawX,
        rawY: b.rawY,
      };
    }
  }
  return points[points.length - 1];
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}
