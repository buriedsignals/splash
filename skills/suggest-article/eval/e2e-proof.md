# Live e2e proof — the whole new loop runs end to end

> Run date: 2026-06-23. Branch `feat/suggester-article-reading`. Real Datawrapper API
> (token from `/splash/.env`). The test chart was published, confirmed live, then **deleted**.

This proves the full new loop the cut introduces:

```
article + data
  → [ ② suggest-article ]  ProposalSet
  → (journalist accepts one proposal)  (proposal.data, proposal.intent)
  → [ ② suggest-chart ]  ChartSpec   (UNCHANGED prior cut)
  → [ dw-chart produceChart ]  real published chart + owned PNG
```

## 1. The accepted proposal (from the `clinic-waits` eval case)

② emitted this proposal reading the `clinic-waits` article + data (baseline run). We accept it:

- **claim:** "The average wait for a first clinic appointment nearly tripled, from 11 days in 2019 to 31 in 2024"
- **intent:** `How has the average wait for a first appointment changed since 2019?`
- **data (CSV subset):** `year,wait_days\n2019,11\n2020,14\n2021,19\n2022,24\n2023,28\n2024,31`
- **dataSource:** `waits.csv` columns `["year","wait_days"]` (provenance-clean)

`(proposal.data, proposal.intent)` is **byte-for-byte** the prior cut's input — no transformation at the seam.

## 2. The prior cut chooses the chart (suggest-chart, unchanged)

Acting as `suggest-chart` on `(data, intent)`: a change-over-time intent over a continuous yearly series →
`d3-lines`. The emitted `ChartSpec` passed `validateChartSpec` with **zero warnings**:

```json
{
  "type": "d3-lines",
  "title": "The wait for a first clinic appointment nearly tripled since 2019",
  "intro": "Average days to a first appointment at the regional clinic, 2019-2024",
  "data": "year,wait_days\n2019,11\n2020,14\n2021,19\n2022,24\n2023,28\n2024,31",
  "baseColor": "#0072B2",
  "numberFormat": "0",
  "source": { "name": "Regional clinic (sample data)" },
  "altInsight": "The average wait for a first clinic appointment rose every year from 11 days in 2019 to 31 days in 2024",
  "annotations": [{ "text": "2024: 31 days", "x": "2024", "y": 31 }]
}
```

## 3. dw-chart produced a real chart

`produceChart(spec, pngPath)` against the live Datawrapper API returned:

- **chartId:** `B7irP`
- **publicUrl:** `https://datawrapper.dwcdn.net/B7irP/1/`
- **embed:** `<iframe title="The wait for a first clinic appointment nearly tripled since 2019" src="https://datawrapper.dwcdn.net/B7irP/1/" ...>`
- **owned PNG:** written, **64 656 bytes** (non-empty)

## 4. Confirmed, then cleaned up

- `curl -sI https://datawrapper.dwcdn.net/B7irP/1/` → **HTTP/2 200** (chart published and reachable).
- PNG fallback on disk, 64 656 bytes (the local owned export the architecture mandates).
- `DELETE /v3/charts/B7irP` → **HTTP 204** (test chart removed; no residue left on the account).

The new article-reading loop is proven end-to-end against the real producer, reusing the prior cut and
`dw-chart` unchanged.
