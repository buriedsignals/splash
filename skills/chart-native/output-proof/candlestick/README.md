# candlestick (OHLC) — render proofs

All artifacts come from ONE spec, produced through the real chain
(`NativeSpec → specToNativeConfig → produce.mjs <format>`), with every produce-time guard
armed. The deliverable is in **German**, deliberately: this type's accessible name was the worst
i18n leak in the engine — four English words wrapped around four unlocalized digit strings,
sitting underneath a correctly localized `altInsight`.

| artifact | format | what it proves |
|---|---|---|
| `static.png` | static | The **direction legend that did not exist**: `Anstieg` / `Rückgang` plus the gloss `Anstieg = Schluss ≥ Eröffnung · Rückgang = Schluss < Eröffnung`, so a reader needs no market convention at all. Also the **price-axis label** (`Indexstand`), which the config had always declared and the component had never drawn, and German month names + `5.200` grouping. `snap-contrast` 13 labels clear their floor, i18n furniture OK for `lang "de"`; `snap-label-fit` 17 nodes, 0.00px; 1200×676 = article-web. |
| `interactive-a11y.png` | interactive | Keyboard focus alone opens the tooltip on the March candle, and the candle's accessible name reads `Mär. 2024: Eröffnung 5.010, Hoch 5.040, Tief 4.760, Schluss 4.800` — German prose AND German separators, on the only content a screen-reader user gets from this chart. 12 focusable candles, real source link. `snap-tooltip-contrast` 36 nodes across 12 marks ≥ 4.5:1. |
| `landscape.mp4` | video | `snap-video`: animates (9.6 mean diff), no blank frames, frame 140 matches the reviewed still (0.43 %), final frame matches the rendered final still (0.45 %). |
| `video-landscape-midreveal.png` | video | **Extracted from `landscape.mp4` itself** (frame 100): candles appearing left → right in time order, the eighth mid-grow, the legend and its gloss already in. |
| `square.mp4` | video | `social-feed` → `CandlestickSquare`, 1080×1080 asserted against the channel. |
| `portrait.mp4` | video | `social-vertical` → `CandlestickPortrait`, 1080×1920. |

## What the renders changed

1. **Two date labels collided.** With 12 monthly periods and a step of 2, keeping "every 2nd"
   AND "always the last" put ticks at index 10 and 11 — adjacent. `snap-contrast` failed at 1:1
   because `Nov. 2024` was sampling `Dez. 2024` as its own background. The last tick now wins and
   any stepped tick within one step of it is dropped.
2. **The direction gloss overran a phone.** At 360px it ran 76px past the card and
   `snap-label-fit` failed the interactive produce. It is not a line that may be dropped on a
   phone — it is what makes the two hues mean anything — so it WRAPS, measured at the same inner
   width the svg draws at, and the reserved height follows the measured line count.
3. **The price-axis label overflowed left** when first drawn end-anchored above the axis; it is
   start-anchored at the plot's left edge now.
