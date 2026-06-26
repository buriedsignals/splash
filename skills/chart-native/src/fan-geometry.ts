// Pure geometry core for FAN CHARTS — framework-free (D3 = math: d3-scale). A
// time series split into a solid HISTORY line and a forecast FAN: a central line
// plus nested confidence bands (lo{level}/hi{level}) that widen from "now". The
// reveal is a left→right clip wipe of the whole static shape, so geometry is
// fixed and frame N is a pure function of the frame.

import { scaleLinear } from "d3-scale";

export interface FanData {
  xField: string;
  levels: number[]; // confidence levels, e.g. [50, 80, 95]
  rows: Record<string, number>[]; // xField + `actual` (history) and/or `central`+`lo{level}`/`hi{level}`
}

export interface FanDims {
  width: number;
  height: number;
  padding: { top: number; right: number; bottom: number; left: number };
}

export interface FanPoint {
  x: number;
  y: number;
}
export interface FanBandPoint {
  x: number;
  loY: number;
  hiY: number;
}
export interface FanBand {
  level: number;
  points: FanBandPoint[];
}

export interface FanLayout {
  innerWidth: number;
  innerHeight: number;
  history: FanPoint[];
  central: FanPoint[];
  bands: FanBand[]; // ascending level (50, 80, 95)
  nowX: number; // screen x where the forecast begins
  xTicks: { pos: number; label: string }[];
  yTicks: { pos: number; label: string }[];
  valueDomain: [number, number];
}

export function computeFanLayout(data: FanData, dims: FanDims): FanLayout {
  if (data.rows.length < 2) throw new Error("computeFanLayout: need ≥ 2 rows");
  if (!data.levels.length) throw new Error("computeFanLayout: no levels");
  const { width, height, padding } = dims;
  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;
  if (innerWidth <= 0 || innerHeight <= 0)
    throw new Error("computeFanLayout: padding exceeds dimensions");

  const xf = data.xField;
  const levels = [...data.levels].sort((a, b) => a - b);

  const xs = data.rows.map((r) => Number(r[xf]));
  // every drawn y value (history, central, all band bounds) → domain
  const ys: number[] = [];
  for (const r of data.rows) {
    if (r.actual != null) ys.push(Number(r.actual));
    if (r.central != null) ys.push(Number(r.central));
    for (const lv of levels) {
      if (r[`lo${lv}`] != null) ys.push(Number(r[`lo${lv}`]));
      if (r[`hi${lv}`] != null) ys.push(Number(r[`hi${lv}`]));
    }
  }
  const yLo = Math.min(...ys);
  const yHi = Math.max(...ys);
  const yPad = (yHi - yLo) * 0.06 || 1;

  const x = scaleLinear()
    .domain([Math.min(...xs), Math.max(...xs)])
    .range([0, innerWidth]);
  const y = scaleLinear()
    .domain([yLo - yPad, yHi + yPad])
    .range([innerHeight, 0]);

  const history: FanPoint[] = data.rows
    .filter((r) => r.actual != null)
    .map((r) => ({ x: x(Number(r[xf])), y: y(Number(r.actual)) }));

  const forecastRows = data.rows.filter((r) => r.central != null);
  const central: FanPoint[] = forecastRows.map((r) => ({
    x: x(Number(r[xf])),
    y: y(Number(r.central)),
  }));

  const bands: FanBand[] = levels.map((lv) => ({
    level: lv,
    points: forecastRows.map((r) => ({
      x: x(Number(r[xf])),
      loY: y(Number(r[`lo${lv}`] ?? r.central)),
      hiY: y(Number(r[`hi${lv}`] ?? r.central)),
    })),
  }));

  // "now" = the first forecast row's x (zero-width band start)
  const nowX = forecastRows.length
    ? x(Number(forecastRows[0][xf]))
    : innerWidth;

  const xTicks = data.rows.map((r) => ({
    pos: x(Number(r[xf])),
    label: String(r[xf]),
  }));
  const yTicks = y.ticks(5).map((t) => ({ pos: y(t), label: String(t) }));

  return {
    innerWidth,
    innerHeight,
    history,
    central,
    bands,
    nowX,
    xTicks,
    yTicks,
    valueDomain: [yLo, yHi],
  };
}
