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
  size: number;
  color: string;
}

export interface CalendarLayout {
  cells: CalendarCell[];
  monthLabels: { label: string; x: number }[];
  weekdayLabels: { label: string; y: number }[];
  cellSize: number;
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

  // square cells sized to fit both the column count and the 7 rows; centre the grid.
  const cellSize = Math.max(1, Math.min(innerWidth / nCols, innerHeight / 7));
  const gridW = cellSize * nCols;
  const gridH = cellSize * 7;
  const gridX = padding.left + (innerWidth - gridW) / 2;
  const gridY = padding.top + (innerHeight - gridH) / 2;
  const gap = Math.max(1, cellSize * 0.08);

  const cells: CalendarCell[] = parsed.map((p, i) => {
    const col = colOf(p.ms);
    const row = mondayIndex(new Date(p.ms));
    return {
      date: p.date,
      value: p.value,
      col,
      row,
      order: i,
      x: gridX + col * cellSize,
      y: gridY + row * cellSize,
      size: cellSize - gap,
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
        x: gridX + colOf(p.ms) * cellSize,
      });
      lastMonth = m;
    }
  }

  const weekdayLabels = [
    { label: "Mon", y: gridY + 0.5 * cellSize },
    { label: "Wed", y: gridY + 2.5 * cellSize },
    { label: "Fri", y: gridY + 4.5 * cellSize },
    { label: "Sun", y: gridY + 6.5 * cellSize },
  ];

  return {
    cells,
    monthLabels,
    weekdayLabels,
    cellSize,
    gridX,
    gridY,
    nCols,
    rampStops: BLUES,
    ramp,
    valueDomain: [lo, hi],
  };
}
