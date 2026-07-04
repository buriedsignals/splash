# Our World in Data — Electricity Mix
Source: https://ourworldindata.org/electricity-mix

## Extracted figures (verbatim from article text)

| Figure | Verbatim quote | Approximate? | Data provenance |
|---|---|---|---|
| Low-carbon share of global electricity | "more than a third" | YES — no exact % | Prose only |
| Hydropower share of global electricity | "around one-sixth" | YES — no exact % | Prose only |
| Low-carbon share of total energy mix | "only about one-fifth" | YES — different metric (total energy, not electricity) | Prose only |
| France nuclear share | "around three-quarters" | YES — no exact % | Prose only |
| Countries at 90%+ low-carbon | Sweden, Norway, France, Paraguay, Iceland, Nepal named | Categorical list, no per-country values | Prose only |
| UK coal share, late 1980s | "more than half" | YES — no exact % | Prose only |
| UK coal share, current | "just a mere couple of percent" | YES — no exact % | Prose only |
| Nuclear vs renewables trajectory | "nuclear declined almost as much as renewables gained" | Qualitative only — no figures | Prose only |

**Note:** The article contains NO literal numeric percentages (e.g. `36%`, `22%`) in its body text. All figures are approximate qualitative prose. The precise data lives in the article's interactive charts, which reference Our World in Data's database (sourced from BP Statistical Review and Ember).

## Provenance assessment

All figures: **prose-approximate**. None meet the prose extraction rule (which requires ≥2 literal numeric values with explicit dimension labels). No data fabrication permitted.

## Strongest visual opportunity (data-conditional)

**Global electricity mix by source** — a part-to-whole composition for the latest year available.

This is the article's spine and the most honest representation of its argument. However, the journalist must fetch the underlying dataset before any chart can be produced.

**Data to fetch:** https://ourworldindata.org/grapher/electricity-mix
Filter to: latest available year, global aggregate, share of electricity (%).
Expected columns: `source`, `share_pct` (~7–8 rows: Coal, Gas, Hydro, Nuclear, Wind, Solar, Oil, Other renewables).

## Routing decision

- **Chart family:** Part-to-whole (composition of one whole across 7–8 categories)
- **Pie rejected:** 7–8 slices exceeds ≤5-slice guardrail; differences between adjacent slices not visually clear in a pie
- **Type chosen:** `d3-bars` (horizontal bars, sorted descending) — honest default for part-to-whole with many categories
- **Format:** Static (Gate 1 default) — no motion, no exploration hook, no sequential guided narrative
- **Producer:** `dw-chart`
- **Colour:** `#E69F00` (amber — energy/solar/gold subject, per palette-freedom rule)

## Gates applied

| Gate | Question | Answer |
|---|---|---|
| Gate 5 | Is the spatial pattern the story? | No — global aggregate, not geographic distribution |
| Gate 3 | Irreducibly sequential guided narrative? | No |
| Gate 2 | Exploration hook / "find my country"? | No |
| Gate 4 | Temporal/spatial diffusion? | No |
| Gate 1 | Static default | YES |

## Concerns

1. **No data in the article text.** The pipeline cannot produce a chart without the journalist supplying the dataset. The spec is conditional.
2. **Approximate figures only.** "More than a third" and "around one-sixth" are not chartable without the underlying data.
3. **If a multi-year view is wanted** (composition over time), `stacked-column-chart` with `transpose: true` is the correct type — but requires a time-series CSV, not a single-year snapshot.
4. **France + 90%+ countries** could be a secondary chart (ranked bar of country low-carbon shares), but again requires the per-country dataset, not just the prose list.
