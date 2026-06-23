# Worked example — unemployment trend

**Intent:** "Show how unemployment changed 2018-2023."
**Data profile:** columns `year` (ordinal time, 6 rows), `value` (numeric %). One series.

**Decision:** intent = *change over time*, one series, few points → `d3-lines` (per chart-selection).

**Emitted ChartSpec:**
```json
{
  "type": "d3-lines",
  "title": "Unemployment is at a five-year low",
  "intro": "After peaking in 2021, the rate fell sharply",
  "data": "year,value\n2018,5.1\n2019,4.8\n2020,5.4\n2021,5.6\n2022,4.2\n2023,3.7",
  "baseColor": "#0072B2",
  "valueLabels": true,
  "numberFormat": "0.[0]",
  "source": { "name": "Sample data", "url": "https://example.org" },
  "altInsight": "Unemployment rose to 5.6% in 2021 then fell to a five-year low of 3.7% in 2023"
}
```
This is the same spec as `dw-chart/assets/sample-data/sample.spec.json` — it validates and produces.
