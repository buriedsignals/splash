// Pure geometry core for GANTT / timeline charts — framework-free (D3 = math: d3-scale time
// scale). Each item is a horizontal bar spanning start → end on a shared, to-scale time
// axis; rows are stacked top→bottom in start order. The reveal grows each bar from its START
// along time, so geometry is fixed and frame N is a pure function of the frame.
//
// ★ DATES COME FROM core/date-locale, NOT FROM Date.parse.
// The previous parser was `Date.parse(/^\d{4}$/.test(s) ? `${s}-01-01` : s)`, which accepts
// whatever the host runtime accepts — including "03/04/2024", which is the 3rd of April to a
// French, German or Italian reader and the 4th of March to an American one. A gantt is made
// ENTIRELY of dates, so that ambiguity is not a corner: it is the chart. The shared parser
// refuses those shapes by name (see lib/core/date-locale.ts) and the axis labels its ticks
// with the month as a NAME, in the deliverable's language, for the same reason.
//
// ★ AN END DATE CLOSES THE PERIOD IT NAMES.
// "Feasibility survey, 2023-01 → 2023-06" is six months of work; a bar that stops at the
// first instant of June is a month short, and a one-month phase whose start and end name the
// same month was drawn zero-wide — invisible. `endOfGrain` closes the span at the first
// instant AFTER the named period, which is what a reader means by "to June".

import { scaleBand, scaleTime } from "d3-scale";
import {
  endOfGrain,
  formatTick,
  requireIsoDate,
  spanGrain,
} from "../../../lib/core/date-locale";
import type { Lang } from "./core/locale";

export interface GanttItem {
  label: string;
  start: string; // big-endian ISO ("2023", "2023-04", "2023-04-01")
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

export interface GanttOpts {
  /** deliverable language — decides the month NAMES on the time axis. */
  lang?: Lang;
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

export function computeGanttLayout(
  data: GanttData,
  dims: GanttDims,
  opts?: GanttOpts,
): GanttLayout {
  if (!data.items.length) throw new Error("computeGanttLayout: no items");
  const { width, height, padding } = dims;
  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;
  if (innerWidth <= 0 || innerHeight <= 0)
    throw new Error("computeGanttLayout: padding exceeds dimensions");

  const parsed = data.items.map((it, i) => {
    // The refusal names the ROW and the FIELD: a gantt CSV is a wall of dates, and "bad
    // date" without a row sends the journalist reading it line by line.
    const startMs = requireIsoDate(it.start, `the start of "${it.label}"`).ms;
    const endMs = endOfGrain(
      requireIsoDate(it.end, `the end of "${it.label}"`),
    );
    if (endMs < startMs)
      throw new Error(
        `computeGanttLayout: "${it.label}" ends before it starts ` +
          `(${it.start} → ${it.end})`,
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

  // The axis grain follows the SPAN (years for a decade, months for a year, days for a
  // fortnight) and the label writes the month by name — so a tick can never be read as a
  // different day in a different language.
  const grain = spanGrain(minMs, maxMs);
  const timeTicks = x
    .ticks(6)
    .map((d) => ({
      pos: x(d),
      label: formatTick(d.getTime(), grain, opts?.lang),
    }))
    .filter((t, i, a) => i === 0 || t.label !== a[i - 1].label);

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
