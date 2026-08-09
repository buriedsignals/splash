# Beat — Switzerland's population grew fastest of ten European countries since 2000

**Proves:** since 2000, Switzerland's population has grown faster than any of nine other European
countries' — while Germany's and Poland's have barely moved.

**Medium / genre:** chart / video. **Type:** dumbbell (range plot) — one row per country, two dots
(2000 index = 100, fixed for every row; 2023 index, the actual finding) joined by a connector whose
LENGTH is the point, rows sorted by gap size descending. Position-encoded (no forced zero — the
story is the gap between the two dots, not their distance from an origin).

## Data

- Source: Our World in Data, `population` grapher (HYDE / Gapminder / UN, via Our World in Data),
  filtered to 10 countries.
- Fetched: `https://ourworldindata.org/grapher/population.csv?csvType=filtered&country=~CHE~DEU~FRA~ITA~AUT~SWE~NOR~ESP~GBR~POL`
  — verified effective (10 entities only). This particular series runs from year **-10000** (10,000
  BCE, HYDE's pre-modern estimates) to 2023 for every entity — the beat draws only the **2000** and
  **2023** rows per country (freeze the raw full-range export as `data.csv`, same convention as
  `co2-suisse`'s frozen full-range file; filter to the two years at render time, never re-fetch).
- `data.csv`: 2610 rows total, 10 countries. **2023 is the latest year present for all ten
  countries** — none has a 2024 row in this export; the beat's claim is "since 2000," end-dated
  2023, not 2024.

## Exact values — verified 2026-08-08 (population, then index with 2000 = 100)

| Country | 2000 | 2023 | Index (2000=100) | Gap |
| --- | --- | --- | --- | --- |
| Switzerland | 7,184,003 | 8,870,564 | **123.5** | **23.5** (largest) |
| Norway | 4,490,864 | 5,519,167 | 122.9 | 22.9 |
| Sweden | 8,872,099 | 10,551,493 | 118.9 | 18.9 |
| Spain | 41,019,772 | 47,911,583 | 116.8 | 16.8 |
| United Kingdom | 59,057,333 | 68,682,965 | 116.3 | 16.3 |
| Austria | 8,012,929 | 9,130,434 | 113.9 | 13.9 |
| France | 59,483,716 | 66,438,828 | 111.7 | 11.7 |
| Italy | 57,272,200 | 59,499,452 | 103.9 | 3.9 |
| Germany | 81,797,255 | 84,548,233 | 103.4 | 3.4 |
| Poland | 38,258,077 | 38,762,847 | 101.3 | **1.3** (smallest) |

Switzerland's gap (23.5 points) is the largest in the set; Poland's (1.3) and Germany's (3.4) are the
smallest — "barely moved" is accurate for those two specifically (both under 4 points of growth in
23 years), not for the whole group (Italy at 3.9 is close but not named in the claim).

## The motion problem

Every row shares the SAME left dot (index 100 — that is what indexing to a common base year
achieves) and a DIFFERENT right dot. The reveal should establish all ten left dots together first
(the shared starting line, literally a vertical rule at 100), then bring in each row's right dot and
connector in gap-size order (largest gap first, matching the sort), so the reader watches the ranking
build in the same order the rows are sorted — the last (smallest) connectors to arrive are also the
shortest, which reads as "and here's the bottom of the ranking," not as an afterthought. Switzerland,
the subject, gets the emphasis treatment once its own connector has landed, not before.

## Anti-patterns for this case

- Legend naming which dot is which year (2000 vs 2023) is load-bearing here — a dumbbell has no
  positional convention (unlike a slope chart's left-is-earlier reading) once the two series aren't
  read left-to-right by construction; state it explicitly.
- Category (country) labels need a gutter sized to the widest name actually present ("United
  Kingdom"), measured, not guessed.
- Two-hue cap: one colour per series (2000-dot, 2023-dot), reused identically on every row.
- Value/connector-length is NOT a raw population difference here (that would just track country
  size) — it is the INDEX gap, and the chart must say "population, indexed to 2000 = 100" somewhere
  legible, or the two dots' meaning is not stated.
- Value labels in page ink, never in either dot's own hue.

## Source line

`Source: HYDE, Gapminder & UN, via Our World in Data · 2000 & 2023 data, indexed to 2000 = 100`
