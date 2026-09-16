---
size: landscape
type: boxplot
---

# Beat — CO₂ emissions per capita vary widely within every continent, and the Americas hide the widest outliers

**Size:** landscape (1920 x 1080). The front matter above is the record that counts — `render.mjs`
reads it with `readPinnedSize`, and `Root.tsx` registers one composition per row of the table. The
prose used to be the only record of gate 2c's decision, checked by nothing, while the component
carried its own `const FRAME` and `Root.tsx` repeated the same two numbers.

**Why landscape, and why the other two refuse.** A box plot's argument is the SHAPE of each group
— the box, the whiskers, and where the outliers sit relative to them. It has no twin form, and no
aspect range has ever been MEASURED for it at a tall or square frame, so `type-at-size.mjs`
refuses by default and names the measurement that is missing. That is this beat's own class of
finding turned on itself: the portrait probe destroyed a distribution while every clipping and
collision counter stayed at zero. The 1080 x 1080 this beat used to draw at was not a decision, it
was a default.

**Proves:** within every continent, per-country CO₂ emissions per capita span a wide range — and in
the Americas specifically, the United States and Canada each emit more than 4× the region's own
median, well outside the ordinary spread the rest of the group sits in.

**Medium / format:** chart / video. **Type:** box plot — one box-and-whiskers per continent, computed
from a real per-country five-number summary (not a single pre-aggregated number per group).
Position-encoded (no forced zero — the value axis shows the actual spread of the data, per the type
doctrine).

## Data

- Source: Our World in Data, `co-emissions-per-capita` grapher (Global Carbon Budget, via Our World
  in Data).
- Fetched:
  `https://ourworldindata.org/grapher/co-emissions-per-capita.csv?csvType=filtered&country=~CHE~DEU~FRA~ITA~ESP~GBR~POL~SWE~NOR~AUT~NLD~BEL~PRT~GRC~CZE~CHN~JPN~IND~IDN~SAU~KOR~THA~VNM~PAK~BGD~IRN~ISR~MYS~PHL~ZAF~NGA~EGY~KEN~ETH~GHA~MAR~DZA~TUN~CIV~SEN~TZA~USA~CAN~BRA~MEX~ARG~COL~CHL~PER~VEN~CUB~ECU~BOL`
  — verified effective: 7694 rows, **53 distinct entities** (matches the 53 ISO-3 codes requested,
  none dropped, no extra country leaked in — the OWID CSV filter trap
  (`intake/references/ourworldindata-csv-filter-trap.md`) checked and avoided).
- `data.csv`: the raw, unedited fetch — every year OWID has for these 53 countries (1750–2024, same
  freeze-the-full-range convention `video-population-growth-dumbbell/BRIEF.md` used for its
  -10000–2023 export). The beat draws only **2023**, the latest year with a value for all 53
  countries (2024 also has full coverage but is more likely to see later revision; 2023 is the safer
  "latest settled year" to assert a finding against). Filtered to 2023 at render time, never
  re-fetched.

## Groups (continent, chosen country lists — 12–15 countries each, across 4 continents)

- **Europe** (n=15): CHE DEU FRA ITA ESP GBR POL SWE NOR AUT NLD BEL PRT GRC CZE
- **Asia** (n=14): CHN JPN IND IDN SAU KOR THA VNM PAK BGD IRN ISR MYS PHL
- **Africa** (n=12): ZAF NGA EGY KEN ETH GHA MAR DZA TUN CIV SEN TZA
- **Americas** (n=12): USA CAN BRA MEX ARG COL CHL PER VEN CUB ECU BOL

Oceania was left out: OWID's per-capita series for the handful of Pacific-island states beyond
Australia/New Zealand is too sparse to build a fifth honest box from, and two countries is not a
distribution.

## Exact five-number summaries — computed 2026-08-08, year 2023, linear (R-7) quantile method (same
method d3-array's `quantile` uses), whisker rule Tukey 1.5×IQR

All values t CO₂ per person per year.

| Continent | n | min | Q1 | median | Q3 | max | IQR | whisker-lo | whisker-hi | outliers (beyond 1.5×IQR) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Africa | 12 | 0.14 | 0.43 | 0.69 | 2.29 | 6.91 | 1.86 | 0.14 | 4.39 | South Africa 6.91 |
| Americas | 12 | 1.72 | 2.10 | 3.01 | 4.02 | 14.32 | 1.92 | 1.72 | 4.23 | Canada 13.88, United States 14.32 |
| Asia | 14 | 0.61 | 2.28 | 4.84 | 8.40 | 20.37 | 6.13 | 0.61 | 11.39 | Saudi Arabia 20.37 |
| Europe | 15 | 3.48 | 4.27 | 5.25 | 7.03 | 7.70 | 2.76 | 3.48 | 7.70 | none |

Whisker rule stated explicitly: a whisker reaches the furthest observation still within 1.5× the
interquartile range of its nearest quartile; anything beyond that fence is drawn as an individual
outlier dot, never absorbed into a longer whisker (`chart-beat/references/types/boxplot.md`).
Every group here has 12–15 real countries feeding its box — thin enough that `n` is printed under
every category label, per the type doctrine's "show the n, or the box plot lies about confidence."

Global reference: the median of all 53 countries' 2023 values (not the mean of the four group
medians) is **3.69 t/person** — Thailand's own value, coincidentally, since it happens to sit at the
53-country median rank.

Americas median (3.01) vs. its two outliers: United States 14.32 = **4.76×** the Americas median;
Canada 13.88 = **4.62×** — both comfortably support the claim's "more than 4×."

## The motion problem — honest judgement

A box plot is a *summary* of a distribution, already compressed to five numbers per group before any
drawing happens — there is no time-ordered process inside a single box the way a line has a
chronological draw or a dumbbell has two dated points. Cascading a box's own five marks in as five
separate timed events (whisker-min, then Q1, then median, then Q3, then whisker-max, one after
another) would invent motion the data does not contain: none of those five numbers "happens before"
another one in any sense a reader could follow, so a five-part cascade per box would be
`anti-patterns.md`'s "ornament that encodes nothing, moving," wearing a data-viz costume.

What genuinely benefits from an order in time here is the group-level comparison: with four
categories, arriving **one continent at a time, sorted by median ascending** (the same "sort tells
the story" discipline `boxplot.md` recommends for a static box plot's category order, carried into
this beat's reveal order) lets the reader build the ranking the same way the dumbbell beat did — each
continent's own five marks (box + whiskers + outlier dots) drawing in together as ONE event, not
staggered within the box. The Americas box then gets a distinct emphasis event once every continent
has landed: not because it is the *lowest or highest* box (Africa is lower, Europe and Asia are
higher on the median), but because its own **outliers** are the actual finding — a group with a
modest median hiding two countries running at 4.6–4.8× that median, which the reader cannot see from
the box alone until the outlier dots and their values are called out.

This is not a case of "a build adds nothing" — the group-by-group ordered reveal genuinely serves the
argument (context builds before the surprising group), so the simplest honest reveal is the one
described above, not a static box plot exported to video, and not an invented five-part cascade
inside each box.

## Anti-patterns for this case

- No whisker stretched to an extreme point without the Tukey check — Saudi Arabia, South Africa,
  Canada and the United States are ALL drawn as individual outlier dots, never absorbed into a longer
  whisker (`boxplot.md`'s "one thing that goes wrong").
- Outlier count per group is small (1–2), so each outlier gets its own value label next to its dot,
  in page ink — not the box's own hue (`boxplot.md`'s accessibility trap, same one the dumbbell
  brief names for value labels).
- Value axis is NOT padded to zero — the story is the actual spread (0.14 to 20.37 across the whole
  set), and zero-padding a range that already starts near zero for some groups would flatten the
  real differences between Africa's box and Europe's.
- Axis is labelled with its unit ("t CO₂ per person") — without it a reader cannot tell what the
  numbers mean.
- `n` printed under every category label — a box built from 12 countries and a box built from 15
  draw at visibly different confidence if the reader is told the count; neither is claimed as "every
  country on the continent."

## Source line

`Source: Global Carbon Budget, via Our World in Data · 2023 data · whiskers = 1.5× IQR (Tukey)`
