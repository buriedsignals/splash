---
size: landscape
type: scatter
---

# Beat — among twenty wealthy countries, the United States has the lowest life expectancy

**Size:** landscape (1920 x 1080). The front matter above is the record that counts — `render.mjs`
reads it with `readPinnedSize`, and `Root.tsx` registers one composition per row of the table. The
prose used to be the only record of gate 2c's decision, checked by nothing, while the component
carried its own `const FRAME` and `Root.tsx` repeated the same two numbers.

**Why landscape, and why the other two refuse by name.** `type-at-size.mjs` carries a NAMED
refusal for a scatter rather than an unmeasured one: rotating it violates conventions of reading
direction (Horak et al. §2.4.2), so it has no twin form, and what a phone frame runs out of budget
on here is DENSITY — twenty labelled points in a cloud — not aspect. Neither has been measured.
Both refuse loudly instead of returning a cloud squeezed into a column with nothing clipped and
nothing colliding. The 1080 x 1080 this beat used to draw at was not a decision, it was a default.

**Proves:** across twenty high-income countries in 2022, the United States has the lowest life
expectancy at birth (78.0 years) of any of them — below every single peer, including several with
lower income — despite having the fifth-highest GDP per capita in the same group.

**Medium / genre:** chart / video. **Type:** scatter — both axes measured (GDP per capita on x,
life expectancy on y), position is the entire encoding, neither axis forced to zero
(`references/types/scatter.md`: "a position chart, the direct opposite of a bar's length
encoding"). One named subject (United States); every other point reads as the shape of the cloud,
muted, per the type's own rule that a scatter's argument is usually the shape, not any one member's
name — except here one member IS the story, so it earns the one accent.

## Data

- Source: Our World in Data, `life-expectancy-vs-gdp-per-capita` grapher (World Bank via Gapminder,
  UN World Population Prospects 2024, via Our World in Data).
- Fetched:
  `https://ourworldindata.org/grapher/life-expectancy-vs-gdp-per-capita.csv?csvType=filtered&country=~USA~CHE~DEU~FRA~GBR~JPN~CAN~AUS~SWE~NOR~NLD~ITA~ESP~KOR~SGP~IRL~DNK~FIN~BEL~AUT`
  — the `country` filter has **no effect** on this particular grapher (confirmed: the fetch returns
  all 165 countries present in its most recent year regardless of the filter — the same class of
  trap `skills/intake/references/ourworldindata-csv-filter-trap.md` documents, except here even
  `csvType=filtered` does not narrow the entity set, only the year). `data.csv` is the raw,
  unfiltered fetch: **165 rows** (166 with header), all one year (**2022**, OWID's latest year with
  complete coverage across this indicator at fetch time), 165 distinct countries — verified by
  counting. The twenty-country peer set this beat actually draws is selected from within that frozen
  165-row file at render time, the same technique the existing `static-income-life-expectancy` beat
  used for its own 165-country cloud.

## Exact values — verified 2026-08-08 (2022, life expectancy / GDP per capita)

| Country | Life expectancy | GDP per capita |
| --- | --- | --- |
| United States | **77.98** (lowest of the twenty) | 58,487 (5th-highest of the twenty) |
| Germany | 80.58 | 46,648 |
| United Kingdom | 81.07 | 38,407 |
| Belgium | 81.16 | 41,872 |
| Canada | 81.25 | 45,530 |
| Finland | 81.24 | 40,701 |
| Austria | 81.30 | 43,793 |
| Denmark | 81.29 | 50,690 |
| Netherlands | 81.91 | 49,670 |
| Ireland | 82.05 | 60,257 |
| Italy | 82.05 | 36,224 |
| France | 82.48 | 39,066 |
| Spain | 82.37 | 34,123 |
| Norway | 82.63 | 88,366 (highest) |
| Australia | 82.77 | 52,049 |
| South Korea | 82.73 | 41,321 |
| Sweden | 83.05 | 47,126 |
| Switzerland | 83.20 | 63,323 |
| Singapore | 82.92 | 80,320 |
| Japan | **84.05** (highest of the twenty) | 38,269 |

Every one of the other nineteen countries has a HIGHER life expectancy than the United States — the
lowest peer value (Germany, 80.58) is still 2.6 years above the US figure. The peer median
(excluding the US) is 82.05 years — the reference level this beat draws.

## The motion problem

Points arrive sorted by GDP per capita, ascending — the x-axis's own order, left to right, which is
`motion-grammar.md`'s "argument's order" rather than an arbitrary one. The United States lands in
its natural position within that cascade (16th of 20 by GDP, not artificially held to last), because
its emphasis is a SEPARATE event, not its place in the reveal. The peer median (82 years) is drawn as
a reference rule before any point appears, so once the cloud lands, the reader can see at a glance
which points sit above it and which sit below — the US is the only point clearly divorced from a
cloud that otherwise sits close to or above the rule, and it is also the point furthest to the
right's near neighbours (Switzerland, Singapore, Norway all sit further right AND higher).

## Anti-patterns for this case

- Neither axis anchored at zero — GDP per capita padding down to 0 would crush the whole cloud into
  a sliver on the right edge of an 88k-wide axis; life expectancy anchored at 0 would flatten a
  6-year spread (77.98–84.05) that is the entire story of this chart.
- Only ONE point is named (`scatter.md`: "label only the few points the story is actually about").
  The other nineteen read as an unlabelled cloud.
- The subject's label sits in page ink, never in the accent hue (`scatter.md`'s own accessibility
  trap: "a dot tinted to the newsroom's house hue can easily fail WCAG contrast as running text").
- Both axes carry a stated label (`scatter.md`: "a bare number axis on a scatter is close to
  unreadable") — "GDP per capita ($)" and "Life expectancy at birth (years)".

## Source line

`Source: World Bank via Gapminder, UN World Population Prospects (2024), via Our World in Data · 2022 data`
