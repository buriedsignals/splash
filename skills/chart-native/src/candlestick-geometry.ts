// Pure geometry core for CANDLESTICK / OHLC charts — framework-free (D3 = math).
// Each period is open/high/low/close: a wick (high→low) + a body (open→close),
// coloured up (close ≥ open) or down. POSITION/range encoding → the price axis
// need NOT include 0. The reveal grows each body from its OPEN, staggered, so
// geometry is fixed and frame N is a pure function of the frame.

import { scaleBand, scaleLinear } from "d3-scale";

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

  const priceTicks = y.ticks(5).map((t) => ({ pos: y(t), label: String(t) }));
  // a readable subset of date labels
  const step = Math.ceil(data.periods.length / 8);
  const dateTicks = data.periods
    .map((c, i) => ({ i, c }))
    .filter(({ i }) => i % step === 0 || i === data.periods.length - 1)
    .map(({ i, c }) => ({ pos: (band(i) ?? 0) + bw / 2, label: c.date }));

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
