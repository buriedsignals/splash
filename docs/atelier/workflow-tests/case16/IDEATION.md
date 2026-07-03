# Case 16 — "sans rien": bare topic « Is inflation actually coming down? »

**Input:** a topic string only. No article, no dataset. Rule: never invent data.

## Ideation (honest reasoning)

1. **The literal story is a TIME SERIES** — the trajectory of the inflation rate (CPI
   year-on-year) — which cannot be told without real numbers. The system must NOT
   fabricate a plausible-looking curve; that would be the worst failure (a fake chart
   that reads as fact).
2. **Name the exact data need, don't invent it.** The right source is a public,
   authoritative price index: US CPI-U (BLS, series CPIAUCSL on FRED) or the euro-area
   HICP (Eurostat), monthly, ~2019–present, converted to year-on-year %.
3. **Only then produce.** With that real series in hand → a `d3-lines` chart of YoY
   inflation, annotated at the 2022 peak and the recent level, against the 2% target.

## What was done here

To prove the end-to-end path WITHOUT fabricating, the real series was FETCHED from the
named public source (FRED `CPIAUCSL`, the US CPI-U index) and converted to quarterly
year-on-year inflation. Nothing was invented — every value derives from the official
index. Result: `out/inflation.png` / live embed.

The answer the chart gives: yes — inflation fell from an ~8.5% peak in 2022 to about
3–4%, but it has stalled ABOVE the 2% target rather than returning to it.

## The honest-refusal contract (the point of this case)

Had no real source been reachable, the correct output is NOT a chart — it is this
ideation note naming the data to fetch. A bare topic never licenses invented numbers.
