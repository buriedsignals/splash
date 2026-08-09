# Beat — income and life expectancy, 2022

**Proves:** among the world's richest economies, the United States has one of the lowest life
expectancies — years behind Switzerland, a country at a similar income level. Cuba, at a fraction
of either country's income, comes within a few years of both.

**Medium / genre:** chart / web. **Type:** scatter (both axes measured: GDP per capita on x,
log-scaled; life expectancy at birth on y; one dot per country; no forced zero on either axis).

## Data

- Source: Our World in Data, `life-expectancy-vs-gdp-per-capita` grapher — life expectancy from
  UN World Population Prospects (2024) / OWID, GDP per capita from World Bank / Maddison Project
  Database, via Our World in Data.
- Fetched: `https://ourworldindata.org/grapher/life-expectancy-vs-gdp-per-capita.csv?csvType=filtered`
  — **note:** the `country=` entity filter has no effect on this particular grapher's CSV export
  (verified: filtered and unfiltered requests both return the same 165-country set) — this is NOT
  the silent-200 trap (the trap returns the wrong, much larger scope without saying so; here the
  full scope IS what both requests return, confirmed by comparison, and it is the correct scope for
  a scatter, which wants many points). Do not attempt to re-filter this endpoint by country.
- `data.csv`: 165 rows (164 countries + header), all year **2022**, columns `Entity, Code, Year,
  Life expectancy at birth, GDP per capita, Population, World region according to OWID`.

## Exact values for the three named points — verified 2026-08-08

| Country | GDP per capita | Life expectancy |
| --- | --- | --- |
| Switzerland | $63,323 | 83.2 |
| United States | $58,487 | 78.0 |
| Cuba | $7,649 | 77.6 |

Among the 24 countries in this dataset with GDP per capita above $40,000, the United States (78.0)
ranks 3rd from the bottom — only Saudi Arabia (77.3) and Oman (77.9) are lower, and every other rich
peer (Germany 80.6, Canada 81.2, Switzerland 83.2, …) is higher. Cuba's life expectancy (77.6) sits
within half a year of the United States' despite an income roughly 1/8th as large.

**A data-quality flag, not to be drawn on:** Central African Republic's 2022 row in this dataset
shows life expectancy 18.8 — a value this skill's own cross-check against OWID's standalone
`life-expectancy` series confirms is what OWID itself publishes (18.8 in 2022, sandwiched between
40.3 in 2021 and 57.4 in 2023), but a three-year swing of that size is very likely a modelling
artifact in the underlying source, not a real one-year mortality shock. Leave it undrawn/unlabelled
in the cloud — do not pick it as a named outlier.

## Hierarchy of the proof

1. Switzerland's dot — the subject/reference, accent colour, labelled.
2. The United States' dot — labelled, the point the claim is actually about (low for its income).
3. Cuba's dot — labelled, the counter-example (high for its income).
4. The remaining ~160 dots — unlabelled, page-ink colour, forming the cloud whose overall upward
   shape is what makes 1–3 legible as outliers rather than noise.

## Anti-patterns for this case

- GDP axis must be log-scaled (income is famously skewed; a linear axis crushes every poor country
  into the left edge and makes the relationship's actual shape unreadable) — state this on the axis.
- Neither axis starts at zero — position is the entire encoding here, unlike a bar's length.
- Do not label more than the three named points; the cloud's shape is the argument for everyone else.
- Do not draw or mention Central African Republic's 2022 point (see data-quality flag above).
- Dot colour carries the highlight; point labels stay in page ink, never tinted to match a dot
  (WCAG contrast trap named in `references/types/scatter.md`).

## Source line

`Source: UN World Population Prospects (2024) & World Bank, via Our World in Data · 2022 data`
