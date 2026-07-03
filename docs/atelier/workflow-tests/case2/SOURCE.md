# Sources — Case 2: US median home sale price (post-pandemic surge and cooldown)

## Dataset

`data.csv` is a quarterly-anchor series of the US median sales price of houses sold,
series MSPUS (U.S. Census Bureau and U.S. Department of Housing and Urban Development),
distributed via the Federal Reserve Bank of St. Louis (FRED). Values are nominal
(current-dollar), not seasonally adjusted.

Columns: period (year-quarter), year, median_home_price_usd.

## Per-figure provenance

Primary series page:
- FRED — MSPUS, Median Sales Price of Houses Sold for the United States:
  https://fred.stlouisfed.org/series/MSPUS
- Underlying data table: https://fred.stlouisfed.org/data/MSPUS

| Row | Value (USD) | Verification |
|---|---|---|
| 2014-Q1 | 275,200 | Series all-time low (Jan 2014), stated on the MSPUS series description / mirrors |
| 2020-Q1 | 322,600 | Confirmed via FRED MSPUS |
| 2021-Q1 | 355,000 | Confirmed via FRED MSPUS |
| 2022-Q1 | 433,100 | Confirmed via FRED MSPUS |
| 2022-Q4 | 442,600 | Series all-time peak (Oct 2022), stated on MSPUS series / mirrors |
| 2023-Q1 | 429,000 | Confirmed via FRED MSPUS |
| 2024-Q1 | 420,800 | Confirmed via FRED MSPUS |
| 2026-Q1 | 403,200 | Latest value (Q1 2026), confirmed via FRED MSPUS mirror (govspending.org/series/MSPUS) |

Secondary confirmations of the peak/low and latest value:
- https://govspending.org/series/MSPUS/ (mirror of FRED MSPUS; Q1 2026 = 403,200; peak Q4 2022 = 442,600)

## Reporting that inspired the article

- General US housing-market coverage of the 2020–2022 price surge, the late-2022 peak,
  and the subsequent high-mortgage-rate cooldown (e.g. reporting drawing on Census/HUD
  new-home and existing-home median price releases). Figures in the article are taken
  strictly from the MSPUS series above, not from any secondary estimate.

## Notes

- Every quantified claim in `article.md` maps to a row in `data.csv`:
  $403,200 (2026-Q1), $442,600 peak (2022-Q4), ~9% decline from peak
  (442,600 → 403,200 = −8.9%), $322,600 (2020-Q1), $355,000 (2021-Q1),
  $433,100 (2022-Q1), "more than a third" 2020→2022 (322,600 → 433,100 = +34%),
  $429,000 (2023-Q1), $420,800 (2024-Q1), ~a quarter above 2020
  (403,200 / 322,600 = +25%), $275,200 (2014-Q1), +$128,000 / +47% since 2014
  (403,200 − 275,200 = 128,000; /275,200 = 46.5%).
- The article deliberately uses only nominal MSPUS values so every figure traces to
  a single official series, keeping claim-to-data binding unambiguous.
- Not independently re-verified here: Q1 2019 and Q1 2025 values were NOT used, because
  their exact figures could not be confirmed from a citable snippet during sourcing.
