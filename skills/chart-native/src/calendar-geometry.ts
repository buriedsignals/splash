// Pure geometry core for CALENDAR HEATMAPS — framework-free (D3 = math). One cell
// per day: weeks in columns, weekdays (Mon→Sun) in rows; each cell coloured by a
// SEQUENTIAL single-hue ramp (reused from the matrix heatmap — monotonic
// luminance, CVD-safe). The reveal only animates each cell's opacity/scale, so
// positions/colours are fixed and frame N is a pure function of the frame.

import { sampleRamp, BLUES } from "./heatmap-geometry";

export interface CalendarDay {
  date: string; // ISO "YYYY-MM-DD"
  value: number;
}

export interface CalendarData {
  unit: string;
  days: CalendarDay[];
}

export interface CalendarDims {
  width: number;
  height: number;
  padding: { top: number; right: number; bottom: number; left: number };
}

export interface CalendarCell {
  date: string;
  value: number;
  col: number; // week index from the start
  row: number; // 0 = Monday … 6 = Sunday
  order: number; // chronological order (for the staggered reveal)
  x: number;
  y: number;
  w: number;
  h: number;
  color: string;
}

export interface CalendarLayout {
  cells: CalendarCell[];
  monthLabels: { label: string; x: number }[];
  weekdayLabels: { label: string; y: number }[];
  cellW: number;
  cellH: number;
  gridX: number;
  gridY: number;
  nCols: number;
  rampStops: string[];
  ramp: (t: number) => string;
  valueDomain: [number, number];
}

const DAY = 864e5;
const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

// Monday-based weekday: Mon=0 … Sun=6
const mondayIndex = (d: Date) => (d.getUTCDay() + 6) % 7;

export function computeCalendarLayout(
  data: CalendarData,
  dims: CalendarDims,
): CalendarLayout {
  if (data.days.length < 2)
    throw new Error("computeCalendarLayout: need ≥ 2 days");
  const { width, height, padding } = dims;
  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;
  if (innerWidth <= 0 || innerHeight <= 0)
    throw new Error("computeCalendarLayout: padding exceeds dimensions");

  const parsed = data.days
    .map((d) => {
      const ms = Date.parse(d.date);
      if (Number.isNaN(ms))
        throw new Error(`computeCalendarLayout: bad date "${d.date}"`);
      return { date: d.date, value: Number(d.value), ms };
    })
    .sort((a, b) => a.ms - b.ms);

  const firstMs = parsed[0].ms;
  const first = new Date(firstMs);
  // the Monday on/before the first day → column 0 starts there
  const startMs = firstMs - mondayIndex(first) * DAY;

  const lo = Math.min(...parsed.map((p) => p.value));
  const hi = Math.max(...parsed.map((p) => p.value));
  const span = hi - lo || 1;
  const ramp = (t: number) => sampleRamp(BLUES, t);

  const colOf = (ms: number) => Math.floor((ms - startMs) / (7 * DAY));
  const nCols = colOf(parsed[parsed.length - 1].ms) + 1;

  // RECTANGULAR cells that fill the plot area: a year is width-bound (53 weeks),
  // so square cells would leave a thin band — instead the cell HEIGHT fills the
  // 7 rows so the grid uses the available height. The grid is flush top-left.
  const cellW = Math.max(1, innerWidth / nCols);
  const cellH = Math.max(1, innerHeight / 7);
  const gridX = padding.left;
  const gridY = padding.top;
  const gapX = Math.max(1, cellW * 0.08);
  const gapY = Math.max(1, cellH * 0.08);

  const cells: CalendarCell[] = parsed.map((p, i) => {
    const col = colOf(p.ms);
    const row = mondayIndex(new Date(p.ms));
    return {
      date: p.date,
      value: p.value,
      col,
      row,
      order: i,
      x: gridX + col * cellW,
      y: gridY + row * cellH,
      w: cellW - gapX,
      h: cellH - gapY,
      color: ramp((p.value - lo) / span),
    };
  });

  // month labels at the column where each month's 1st falls
  const monthLabels: { label: string; x: number }[] = [];
  let lastMonth = -1;
  for (const p of parsed) {
    const d = new Date(p.ms);
    const m = d.getUTCMonth();
    if (m !== lastMonth) {
      monthLabels.push({
        label: MONTHS[m],
        x: gridX + colOf(p.ms) * cellW,
      });
      lastMonth = m;
    }
  }

  const weekdayLabels = [
    { label: "Mon", y: gridY + 0.5 * cellH },
    { label: "Wed", y: gridY + 2.5 * cellH },
    { label: "Fri", y: gridY + 4.5 * cellH },
    { label: "Sun", y: gridY + 6.5 * cellH },
  ];

  return {
    cells,
    monthLabels,
    weekdayLabels,
    cellW,
    cellH,
    gridX,
    gridY,
    nCols,
    rampStops: BLUES,
    ramp,
    valueDomain: [lo, hi],
  };
}
