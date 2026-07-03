# Case 1 — re-run under the fixed Gate 5

## ② Decision

**Element** · sorted bar chart (`d3-bars`, `sort:"desc"`)
**Format** · static (Gate 1 default — no escalation trigger fires)
**Producer** · dw-chart

**One-line why (ranking rule):** the data is geographic (country + iso3), but the article's finding is
a RANKING — "Hungary tops the continent", "swings from 27.3% to 5.8%", an explicit leaders-vs-laggards
spread. Under the fixed Gate 5, ranking-framing prose is a BAR signal, not a licence for a map, and the
word "map" in the headline does not make the spatial pattern the story (Spain/Netherlands next in rank
explicitly breaks any latitude pattern). Gate 5 condition 1 (spatial pattern IS the story) fails →
sorted bar. Format Gates 1–4: single annotatable claim, cross-channel, ≤15 rows → STATIC → dw-chart.

## Confirmation

This is now a **SORTED BAR (not a map)**. The previous routing to a choropleth is fixed: the
ranking-framing rule in `format-selection.md` (Gate 5) and `suggest-chart/SKILL.md` step 3 now
correctly deny the map and drop into the sorted-bar tie-breaker.

## Outputs

- **Live published URL:** https://datawrapper.dwcdn.net/V5smR/1/
- **Static PNG:** /tmp/wf-case1-bar.png
- **Chart ID:** V5smR
- **Spec:** docs/atelier/workflow-tests/case1/spec-bar.json

## Data fidelity

Every bar value comes straight from `data.csv`, sorted descending — Hungary 27.3 (top) → Spain 21.9 →
Netherlands 21.1 → Greece 19.8 → Lithuania 18.8 → Bulgaria 18.2 → Germany 17.9 → Portugal 17.3 →
Italy 16.9 → Belgium 15.6 → Austria 14.1 → Denmark 13.4 → Poland 11.3 → Romania 9.8 → Czechia 5.8
(bottom). No values invented.

The value column header was renamed via `seriesLabels`
(`solar_share_2024_pct` → "Solar share of electricity (%)") so no raw column name leaks; `numberFormat`
`"0.0"` sets the bar labels and `valueFormat` `"0.0'%'"` reads the axis as a percentage.
