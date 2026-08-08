// Pure geometry core for CANDLESTICK / OHLC charts — framework-free (D3 = math).
// Each period is open/high/low/close: a wick (high→low) + a body (open→close),
// coloured up (close ≥ open) or down. POSITION/range encoding → the price axis
// need NOT include 0. The reveal grows each body from its OPEN, staggered, so
// geometry is fixed and frame N is a pure function of the frame.

import { scaleBand, scaleLinear } from "d3-scale";
import {
  formatAtGrain,
  parseIsoDate,
  spanGrain,
  formatTick,
} from "../../../lib/core/date-locale";
import { localizeValueLabel, type Lang } from "./core/locale";

export interface Candle {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
}

export interface CandlestickData {
  periods: Candle[];
}

export interface CandlestickOpts {
  /** deliverable language — decides the date labels' month NAMES and the price ticks'
   *  separators. */
  lang?: Lang;
}

export interface CandlestickDims {
  width: number;
  height: number;
  padding: { top: number; right: number; bottom: number; left: number };
}

export interface CandleBar {
  index: number;
  date: string;
  up: boolean;
  cx: number; // wick centre x
  bodyX: number; // body left
  bodyW: number;
  highY: number;
  lowY: number;
  openY: number;
  closeY: number;
  bodyTop: number; // y of max(open,close)
  bodyBottom: number; // y of min(open,close)
}

export interface CandlestickLayout {
  innerWidth: number;
  innerHeight: number;
  candles: CandleBar[];
  priceTicks: { pos: number; label: string }[];
  dateTicks: { pos: number; label: string }[];
  priceDomain: [number, number];
}

export function computeCandlestickLayout(
  data: CandlestickData,
  dims: CandlestickDims,
  opts?: CandlestickOpts,
): CandlestickLayout {
  if (data.periods.length < 2)
    throw new Error("computeCandlestickLayout: need ≥ 2 periods");
  for (const c of data.periods) {
    if (c.high < Math.max(c.open, c.close) || c.low > Math.min(c.open, c.close))
      throw new Error(
        `computeCandlestickLayout: "${c.date}" has invalid OHLC (high<max or low>min)`,
      );
  }
  const { width, height, padding } = dims;
  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;
  if (innerWidth <= 0 || innerHeight <= 0)
    throw new Error("computeCandlestickLayout: padding exceeds dimensions");

  const lo = Math.min(...data.periods.map((c) => c.low));
  const hi = Math.max(...data.periods.map((c) => c.high));
  const pad = (hi - lo) * 0.05 || 1;
  const y = scaleLinear()
    .domain([lo - pad, hi + pad])
    .range([innerHeight, 0]);
  const band = scaleBand<number>()
    .domain(data.periods.map((_, i) => i))
    .range([0, innerWidth])
    .padding(0.3);
  const bw = band.bandwidth();

  const candles: CandleBar[] = data.periods.map((c, i) => {
    const x0 = band(i) ?? 0;
    const up = c.close >= c.open;
    return {
      index: i,
      date: c.date,
      up,
      cx: x0 + bw / 2,
      bodyX: x0,
      bodyW: bw,
      highY: y(c.high),
      lowY: y(c.low),
      openY: y(c.open),
      closeY: y(c.close),
      bodyTop: y(Math.max(c.open, c.close)),
      bodyBottom: y(Math.min(c.open, c.close)),
    };
  });

  // A PRICE tick prints the figure, not an approximation of it: `formatNumber`'s
  // abbreviation (5230 → "5,2k") collapses exactly the resolution a candlestick exists to
  // show — a series whose whole story is a 4 % swing would render as five identical "5k"s.
  const priceTicks = y
    .ticks(5)
    .map((t) => ({ pos: y(t), label: localizeValueLabel(t, opts?.lang) }));
  // Dates are LABELS chosen from the periods' own strings, written with the month as a NAME
  // in the deliverable's language — a numeric "03/04" is two different days across the four
  // languages splash ships. A period whose date is not a big-endian date (a bare "Q1", a
  // week number) is passed through verbatim: the mapper is what refuses those, and a
  // geometry that threw here would break the sample data the type has always carried.
  const parsedDates = data.periods.map((c) => parseIsoDate(c.date));
  const known = parsedDates.filter((d): d is NonNullable<typeof d> => d !== null);
  const grain =
    known.length === data.periods.length && known.length > 1
      ? spanGrain(known[0].ms, known[known.length - 1].ms)
      : null;
  const labelOf = (i: number): string => {
    const d = parsedDates[i];
    if (!d) return data.periods[i].date;
    return grain ? formatTick(d.ms, grain, opts?.lang) : formatAtGrain(d, opts?.lang);
  };
  // A readable subset of date labels: every `step`-th period, plus the LAST one — the series'
  // end is the one period a reader always wants dated.
  //
  // Found by rendering: keeping both unconditionally puts the last label right beside the
  // previous stepped one whenever the count is not a multiple of the step (12 monthly periods,
  // step 2 → ticks at …, 10, 11), and `snap-contrast` failed on it, reading 1:1 because
  // "Nov. 2024" was sampling "Dez. 2024" as its own background. The last tick wins and any
  // stepped tick inside one step of it is dropped, so the survivors stay at least a step apart.
  const n = data.periods.length;
  const step = Math.ceil(n / 8);
  const last = n - 1;
  const tickIdx = data.periods
    .map((_, i) => i)
    .filter((i) => i === last || (i % step === 0 && i <= last - step));
  const dateTicks = tickIdx.map((i) => ({
    pos: (band(i) ?? 0) + bw / 2,
    label: labelOf(i),
  }));

  return {
    innerWidth,
    innerHeight,
    candles,
    priceTicks,
    dateTicks,
    priceDomain: [lo, hi],
  };
}

/** A candle body's [top,bottom] as it grows from the OPEN price at `progress`. */
export function growCandleBody(
  c: CandleBar,
  progress: number,
): { top: number; bottom: number } {
  const p = progress < 0 ? 0 : progress > 1 ? 1 : progress;
  // grow from the open toward the close
  const closeEdge = c.up ? c.bodyTop : c.bodyBottom; // close is the far edge
  const grown = c.openY + (closeEdge - c.openY) * p;
  return c.up
    ? { top: grown, bottom: c.openY }
    : { top: c.openY, bottom: grown };
}
