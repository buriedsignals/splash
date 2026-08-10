# Beat — Switzerland's per-capita CO2 emissions among ten European economies

**Proves:** in 2024, Switzerland's per-capita CO2 emissions are the second-lowest of ten major
European economies — essentially level with Sweden, and little more than half of Poland's, the
highest of the group.

**Medium / genre:** chart / web. **Type:** bar-and-column (ranking, vertical or horizontal columns,
zero baseline, one bar per country, sorted descending by value).

## Data

- Source: Our World in Data, `co-emissions-per-capita` grapher, indicator "Global Carbon Budget
  (2025) — with major processing by Our World in Data" (CO2 per capita, tonnes).
- Fetched: `https://ourworldindata.org/grapher/co-emissions-per-capita.csv?csvType=filtered&country=~CHE~DEU~FRA~ITA~AUT~SWE~NOR~ESP~GBR~POL`
  (10-country filter — verified effective: `data.csv` contains exactly these 10 entities, not the
  full ~200-country dataset the CSV-filter trap would otherwise silently return).
- `data.csv`: 2048 rows, 1807–2024, 10 countries (raw, unedited OWID export). The beat draws only
  the **2024** row per country (10 points) — filter at render time, never re-fetch.

## Exact 2024 values (tonnes CO2 per capita), sorted descending — verified 2026-08-08

| Country | 2024 |
| --- | --- |
| Poland | 7.0801 |
| Germany | 6.7688 |
| Norway | 6.6676 |
| Austria | 6.1801 |
| Italy | 5.0879 |
| Spain | 4.5990 |
| United Kingdom | 4.5258 |
| France | 3.9694 |
| Switzerland | 3.5947 |
| Sweden | 3.5917 |

Switzerland (3.5947) and Sweden (3.5917) are 0.003 t apart — read as "essentially level," never as
"lowest" (Sweden is a hair lower). Switzerland is roughly half of Poland's value (3.5947 × 2 =
7.1894, just above Poland's 7.0801) — "little more than half," not "less than half."

## Hierarchy of the proof

1. Switzerland's bar — the subject, accent colour, value label printed outside the bar.
2. Sweden's bar, immediately adjacent in the ranking — muted, but its near-equal value is what
   "essentially level" rests on.
3. Poland's bar, at the top of the ranking — muted, the group's ceiling the "little more than half"
   comparison is made against.
4. The other seven bars — muted context establishing the full ranking.

## Anti-patterns for this case

- Switzerland is highlighted for an editorial reason (the home-country subject of this claim), not
  because it is the tallest bar — it is in fact second from the *bottom*. Never highlight a bar
  simply because it is the extreme value.
- Zero baseline, non-negotiable (bar length is the whole encoding).
- Sort by value (ranking is the story), not by whatever order the source rows arrived in.
- No claim that Switzerland is "the lowest" — it is not, Sweden is, by a margin the data cannot
  actually distinguish from noise. State "essentially level with Sweden."

## Source line

`Source: Global Carbon Budget (2025), via Our World in Data · 2024 data`
