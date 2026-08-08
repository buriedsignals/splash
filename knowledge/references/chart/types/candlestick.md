---
id: candlestick
engines:
  chart-native: candlestick
intent: [change-over-time]
shape: structural
limits: { minPoints: 2, maxPoints: 60 }
formats: [static, interactive, video]
bestFor:
  - "a market/price-like series where the within-period range and the open-to-close direction both matter"
notFor:
  - "a single value per period — that's a line/bar; don't fake OHLC"
  - "hundreds of periods on a small chart — bodies vanish; aggregate or use a line"
  - "a non-expert audience who only needs the trend — a line is clearer; reserve candles for finance-literate readers"
---

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

## The CSV, and the refusal

`date,open,high,low,close` — one row per period. The four numeric columns after the date are read
**in the acronym's own order** (that is what "OHLC" names), and that reading is then **checked**
against the invariant every real period satisfies: high ≥ max(open, close), low ≤ min(open, close).
A CSV in some other order fails on its first row, *named*, instead of inverting every candle in
silence. `ohlc` names the four columns for another order; `priceLabel` is **required** (the axis
does not start at zero, so an unlabelled one gives no scale at all).

**Data that is not OHLC is refused by name.** One value per period is a line or a bar chart — the
mapper says so rather than faking a body from a single number. Note also what is deliberately NOT
derived: `high` and `low` *can* be told from the data (the row's maximum and minimum), but `open`
and `close` cannot — they are two interior values, and swapping them flips every candle's
direction while the chart still looks perfectly well-formed.

## ★ The colour convention — and why this chart refuses it

This is the one type in the engine whose colours carry a convention **the reader brings with
them**, and that convention is **inverted between markets**. In Western markets green is a rising
period and red a falling one. In **China, Taiwan, Japan and South Korea, red is RISING and green is
falling** — the Japanese hand-drawn originals used red for the up day, which is where both
conventions descend from. A red/green candlestick therefore says the opposite thing to two
different readers, and nothing on the chart tells either of them which one they are looking at.

> Sources: the Japanese origin of the form and its red-for-up convention (Nison, *Japanese
> Candlestick Charting Techniques*); the surviving East-Asian red-up/green-down convention in
> CN/TW/JP/KR market data; W3C WCAG 2.2 SC 1.4.1 (Use of Color).

So splash **does not use red/green at all**. Candles take the Okabe-Ito **blue (up) / orange
(down)** pair, which is CVD-safe (red/green is the canonical pair a deuteranope cannot separate —
a second, independent reason) and, decisively, carries **no market meaning in either convention**,
so it cannot be misread as one. The price of leaving the convention is that the colours no longer
explain themselves — so the type **always draws a legend** naming both directions *and* glossing
what "up" means (`close ≥ open`), in the deliverable's language. That legend is not optional
furniture; it is what makes the hue choice honest.

## Correctness "de base" (candlestick-specific)

1. **Valid OHLC**: high ≥ max(open, close) and low ≤ min(open, close) every period, and the
   failing period is **named**. → `checkCandlestickConformance`.
2. **Two colours by direction** — up (close ≥ open) vs down — both Okabe-Ito, CVD-safe, never
   red/green (see above); the **legend always states which is which**, and the note gloss means a
   reader needs no market convention at all.
3. **A price axis** (labelled, need NOT start at 0 — position/range encoding) and dated periods.
4. **Wick centred on the body**; bodies a consistent width with a thin gap.

## data-to-viz caveats (credited)

- Dates are written with the month as a **NAME** (`3 avr.`, `3. Apr.`, `3 apr`), never as digits: a
  numeric `03/04` is the 3rd of April to a French, German or Italian reader and the 4th of March to
  an American one. And a **price label prints the figure**, never an abbreviation of it — "5,2k"
  for 5 230 hides the very movement the form is drawn to show.
- Candlesticks are dense and finance-coded — most readers misread them. If the story is just "it went
  up", use a line. Use candles only when the range/open/close detail is the point, and label the colours.

## Motion grammar (how it *builds*)

See `formats/video.md`; the gesture:

- the price axis wipes in first (chrome);
- candles appear **left → right** in time order — the wick draws then the body grows from the open price,
  staggered; the colour note fades in with the chrome.
A candle's geometry is fixed by the layout; only its draw/scale animates, so frame N is a pure function
of the frame.
