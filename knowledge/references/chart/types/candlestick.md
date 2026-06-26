# Candlestick / OHLC — per-type best practice (L2)

> Sources: FT Visual Vocabulary (the canon) — "change over time" candlestick/OHLC · the market-data
> convention (open-high-low-close) · data-to-viz.com. credited.
> Inherits: `global/dataviz.md` (L0). A per-period range + open/close layout.

A candlestick shows, for each period, four numbers — **open, high, low, close** — as a thin wick (the
high–low range) with a body (open→close). It answers **"how did each period move — the range and the
direction"**: rising periods one colour, falling periods another. Built for prices, but any OHLC range
(temperatures, rates) works.

## When to use / when NOT — read the caveats first

- **Use** for: a market/price-like series where the within-period RANGE and the open→close DIRECTION
  both matter — indices, FX, commodities over days/weeks/months.
- **Not** for: a single value per period — that's a line/bar; don't fake OHLC.
- **Not** for: hundreds of periods on a small chart — bodies vanish; aggregate or use a line.
- **Not** for: a non-expert audience who only needs the trend — a line is clearer; reserve candles for
  finance-literate readers.

## Correctness "de base" (candlestick-specific)

1. **Valid OHLC**: high ≥ max(open, close) and low ≤ min(open, close) every period. → `checkCandlestickConformance`.
2. **Two colours by direction** — up (close ≥ open) vs down — both Okabe-Ito, CVD-safe (NOT red/green
   alone); a one-line note says which is which.
3. **A price axis** (labelled, need NOT start at 0 — position/range encoding) and dated periods.
4. **Wick centred on the body**; bodies a consistent width with a thin gap.

## data-to-viz caveats (credited)

- Candlesticks are dense and finance-coded — most readers misread them. If the story is just "it went
  up", use a line. Use candles only when the range/open/close detail is the point, and label the colours.

## Motion grammar (how it *builds*)

See `formats/video.md`; the gesture:

- the price axis wipes in first (chrome);
- candles appear **left → right** in time order — the wick draws then the body grows from the open price,
  staggered; the colour note fades in with the chrome.
A candle's geometry is fixed by the layout; only its draw/scale animates, so frame N is a pure function
of the frame.
