# Beat — who cut per-capita CO2 emissions furthest since 1990

**Proves:** Germany's per-capita CO2 emissions fell further between 1990 and 2024 than any of nine
other Western European countries' — more than the United Kingdom's much-discussed decarbonisation,
and every one of the ten fell.

**Medium / genre:** chart / web. **Type:** slope (slopegraph) — two vertical axes (1990, 2024), one
line per country from its 1990 value to its 2024 value, position-encoded (no forced zero), one
accent line (Germany), the other nine muted.

## Data

- Source: Our World in Data, `co-emissions-per-capita` grapher (same series as `web-co2-ranking`,
  fetched and frozen independently into THIS beat's own folder, per the rule that every beat reads
  its own copy, never another beat's or `/tmp`).
- Fetched: `https://ourworldindata.org/grapher/co-emissions-per-capita.csv?csvType=filtered&country=~CHE~DEU~FRA~ITA~AUT~SWE~NOR~ESP~GBR~POL`
  — verified effective (10 entities only, not the full ~200-country set).
- `data.csv`: 2048 rows, 1807–2024, 10 countries. The beat draws only the **1990** and **2024** rows
  per country (20 points, 10 lines) — filter at render time.

## Exact values (tonnes CO2 per capita) — verified 2026-08-08

| Country | 1990 | 2024 | Δ (2024 − 1990) |
| --- | --- | --- | --- |
| Germany | 13.23 | 6.77 | **−6.46** (largest fall) |
| United Kingdom | 10.49 | 4.53 | −5.97 |
| Sweden | 6.71 | 3.59 | −3.12 |
| Switzerland | 6.58 | 3.59 | −2.98 |
| France | 6.93 | 3.97 | −2.96 |
| Poland | 9.89 | 7.08 | −2.81 |
| Italy | 7.68 | 5.09 | −2.60 |
| Austria | 8.10 | 6.18 | −1.92 |
| Norway | 8.25 | 6.67 | −1.59 |
| Spain | 5.87 | 4.60 | −1.27 |

Every one of the ten countries fell — there is no rising line in this set. Germany's fall (−6.46) is
the largest in absolute terms, ahead of the UK's (−5.97).

## Hierarchy of the proof

1. Germany's line — the subject, accent colour, both end values labelled.
2. The United Kingdom's line — muted but the comparison the claim is explicitly made against ("more
   than the UK's"); consider a light secondary emphasis (e.g. a slightly heavier stroke than the
   other eight) if the doctrine allows a second tier — otherwise keep it plain muted and let the end
   labels carry the comparison.
3. The other eight lines — muted context, establishing that the fall is universal in this set.
4. The two period captions ("1990", "2024") — without them the chart has no stated "from when to
   when."

## Anti-patterns for this case

- No forced zero on the value axis — position, not length, is the encoding here.
- At most one accent hue (Germany); everything else stays neutral.
- Every line needs a real end label with its actual country name — measure the widest label
  ("United Kingdom") and size the side gutters to it; do not truncate ("Germany" being for it is not
  the risk here, but do not repeat the "Interm." mutilation the doctrine names for a *different*
  beat's crowded gutter).
- Value labels stay in page ink, never in the accent hue, even on Germany's own line.

## Source line

`Source: Global Carbon Budget (2025), via Our World in Data · 1990 & 2024 data`
