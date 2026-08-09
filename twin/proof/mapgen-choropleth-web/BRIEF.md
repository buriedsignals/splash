# Beat — the Faroe Islands emit 8.3× as much CO₂ per person as Albania (web)

**Type:** choropleth. **Medium/genre:** map / web. **Channel:** article web, one self-contained
`render/choropleth.html` (438 KB, plate inlined as a data URI), two SSR'd layouts over one 496 px
baked plate, plus an always-rendered table of all 41 readings.

## Claim

Across the 41 European countries on this map, 2023 territorial CO₂ emissions per person span a
factor of more than eight: the **Faroe Islands at 13.04 t** are the highest, **Albania at 1.57 t**
the lowest. The map states a ranking, not a cause.

## Data

- Source: Global Carbon Budget 2025, via Our World in Data — 2023 data. Shapes: Natural Earth 1:50m
  Admin 0 Countries.
- `co2-per-capita-2023.csv`: **41 rows**, `Code, Entity, Year, value`, every row Year = 2023, no
  duplicate codes. Value-for-value identical to
  `proof/mapgen-choropleth-video/co2-per-capita-2023.csv` (verified: 41 of 41 codes match, zero
  numeric differences) — the same readings, a different claim and a different genre.
- Kosovo is deliberately absent from the declared study set (Natural Earth `KOS` vs OWID
  `OWID_KOS`); aliasing it through to make a join pass would be the dishonest move.

## Exact values — computed 2026-08-09 (tonnes of CO₂ per person, 2023)

| Rank | Country | t/person |
| --- | --- | --- |
| 1 | Faroe Islands | 13.037725 |
| 2 | Luxembourg | 10.285255 |
| 3 | Iceland | 9.052132 |
| 4 | Czechia | 7.699759 |
| 5 | Poland | 7.307086 |
| … | | |
| 39 | Liechtenstein | 3.311822 |
| 40 | Moldova | 1.737587 |
| 41 | Albania | 1.571077 |

- **13.037725 / 1.5710765 = 8.2985** — "more than eight times" is exact, and eight is the largest
  whole multiple the data supports.
- Mean 5.385, median 5.077. Class breaks `[2, 4, 6, 8, 10]`, six classes: Faroe Islands sits alone
  with Luxembourg in the top class (≥ 10), Albania with Moldova in the bottom class (< 2).
- The committed HTML's own table carries **41 data rows** (counted in the file), sorted descending,
  and its first three and last three read 13.0 / 10.3 / 9.1 and 3.3 / 1.7 / 1.6 — the same ranking.

## Subject and accent

One sequential ramp, and **one** accent, `#B2182B`, spent on the Faroe Islands' outline alone.
Albania, the other end of the claim, is outlined in ink rather than in a second accent: a range has
two ends but only one subject, and two accents on one map is two arguments.

## Interaction

The frame carries the whole claim before any interaction: title, legend with its six classes,
caveat, source, every shaded country, and both outlined extremes are in the SSR'd SVG, so the beat
survives with JavaScript off.

The table is the non-visual route — a map is spatial and a screen reader has no spatial access — and
it is a real, visible table, one row per country, **named**, largest first, captioned "Every reading
behind the map above". Every reading that shading encodes to about one class is available there to
one decimal.

## Anti-patterns for this case

- Per capita is a rate, which is what makes a choropleth legitimate here. Total national emissions
  on the same map would be a lie of area.
- **A small denominator swings a per-capita figure.** The Faroe Islands' population is under 55,000;
  the caveat states plainly that a small-population country can rank far above or below its
  neighbours on a small absolute change, and that the map states the ranking, not a cause. Without
  that sentence the top of this map reads as an accusation.
- Six classes, not a continuous ramp a reader must interpolate by eye; and the class boundaries are
  round numbers in the data's own unit, not quantiles that shift when a row changes.
- Do not gate the extremes behind hover. Both ends of the claim are outlined in the static frame.

## One thing worth noting

The Faroe Islands are a self-governing territory of Denmark, and Denmark is also on this map with
its own value — so the map's top-ranked "country" is a constituent part of another shape in the same
frame. The data supports the number; the word "countries" in the title and alt is doing slightly
more work than the source does.

## Source line

`Global Carbon Budget 2025, via Our World in Data — 2023 data · shapes: Natural Earth 1:50m Admin 0 Countries · basemap © MapTiler, © OpenStreetMap`
