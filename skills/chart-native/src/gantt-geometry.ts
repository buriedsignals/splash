// Pure geometry core for GANTT / timeline charts — framework-free (D3 = math:
// d3-scale time scale). Each item is a horizontal bar spanning start → end on a
// shared, to-scale time axis; rows are stacked top→bottom in start order. The
// reveal grows each bar from its START along time, so geometry is fixed and frame
// N is a pure function of the frame.

import { scaleBand, scaleTime } from "d3-scale";
import { timeFormat } from "d3-time-format";

export interface GanttItem {
  label: string;
  start: string; // ISO date ("2023", "2023-04", "2023-04-01")
  end: string;
  category?: string;
}

export interface GanttData {
  items: GanttItem[];
}

export interface GanttDims {
  width: number;
  height: number;
  padding: { top: number; right: number; bottom: number; left: number };
}

export interface GanttBar {
  index: number; // original index
  order: number; // row order (by start)
  label: string;
  category?: string;
  startMs: number;
  endMs: number;
  y: number; // band centre
  h: number; // bar thickness
  x0: number; // screen x of start
  x1: number; // screen x of end
  durationDays: number;
}

export interface GanttLayout {
  innerWidth: number;
  innerHeight: number;
  bars: GanttBar[];
  timeTicks: { pos: number; label: string }[];
  domainMs: [number, number];
}

const parse = (s: string): number => {
  // accept a bare year, "YYYY-MM", or full ISO; Date.parse is deterministic.
  const t = Date.parse(/^\d{4}$/.test(s) ? `${s}-01-01` : s);
  if (Number.isNaN(t)) throw new Error(`computeGanttLayout: bad date "${s}"`);
  return t;
};

export function computeGanttLayout(
  data: GanttData,
  dims: GanttDims,
): GanttLayout {
  if (!data.items.length) throw new Error("computeGanttLayout: no items");
  const { width, height, padding } = dims;
  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;
  if (innerWidth <= 0 || innerHeight <= 0)
    throw new Error("computeGanttLayout: padding exceeds dimensions");

  const parsed = data.items.map((it, i) => {
    const startMs = parse(it.start);
    const endMs = parse(it.end);
    if (endMs < startMs)
      throw new Error(
        `computeGanttLayout: "${it.label}" ends before it starts`,
      );
    return { it, i, startMs, endMs };
  });
  // rows ordered by start (then by end), top → bottom.
  parsed.sort((a, b) => a.startMs - b.startMs || a.endMs - b.endMs);

  const minMs = Math.min(...parsed.map((p) => p.startMs));
  const maxMs = Math.max(...parsed.map((p) => p.endMs));
  const x = scaleTime()
    .domain([new Date(minMs), new Date(maxMs)])
    .range([0, innerWidth]);
  const band = scaleBand<number>()
    .domain(parsed.map((_, i) => i))
    .range([0, innerHeight])
    .padding(0.35);
  const bw = band.bandwidth();

  const fmt = timeFormat(maxMs - minMs > 3 * 365 * 864e5 ? "%Y" : "%b %Y");

  const bars: GanttBar[] = parsed.map((p, row) => ({
    index: p.i,
    order: row,
    label: p.it.label,
    category: p.it.category,
    startMs: p.startMs,
    endMs: p.endMs,
    y: (band(row) ?? 0) + bw / 2,
    h: bw,
    x0: x(new Date(p.startMs)),
    x1: x(new Date(p.endMs)),
    durationDays: Math.round((p.endMs - p.startMs) / 864e5),
  }));

  const timeTicks = x.ticks(6).map((d) => ({ pos: x(d), label: fmt(d) }));

  return {
    innerWidth,
    innerHeight,
    bars,
    timeTicks,
    domainMs: [minMs, maxMs],
  };
}

/** A bar's end x as it grows from its start at `progress`. Pure — at progress 0
 *  the bar has zero width (nothing drawn). */
export function growGanttBar(bar: GanttBar, progress: number): number {
  const p = progress < 0 ? 0 : progress > 1 ? 1 : progress;
  return bar.x0 + (bar.x1 - bar.x0) * p;
}
