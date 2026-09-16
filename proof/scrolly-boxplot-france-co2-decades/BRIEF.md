---
format: scrolly
type: boxplot
medium: chart
grounding: supported
---

# Beat — Les émissions de CO₂ par Français ont culminé dans les années 1970 (scrolly)

**Type:** box plot. **Medium/format:** chart / **scrolly**. **Frame:** the whole graphic, from a phone to a wide
desktop.

The `box plot` type in the scrolly format, drawn once per filed direction from the same frozen France series, decades,
whisker rule (1.5 × IQR) and claim as `more-boxplot-france-co2-decades`. That beat is set in English; this one is set in
French through the filed directions — see `PALETTE.md`.

## The choreography

A box plot summarises many readings into five numbers; the scroll shows the readings first, then lets them close into
the summary, so the reader knows what a box is made of (`skills/scrolly/references/directed-type-choreography.md`):

| card | what the card says | gesture | what the reader sees move |
| --- | --- | --- | --- |
| 1 | a French person's CO₂, every year 1950–2024; up to 10.4 t in 1973, then down | **reveal** | 75 points in time, the 1973 peak named |
| 2 | every year into its decade | **regroup** | the points travel into eight columns |
| 3 | each decade becomes a box; 1980, at 9.5 t, stays a point of its own | **summarise** | quartiles, median and whiskers close around each column, the points step back but the outlier |
| 4 | the medians: 5.41 t in the 1950s, 9.96 t at the top in the 1970s, then lower every decade to 4.27 t | **connect** | the medians joined and written |
| 5 | the 1980s spread widest, 6.9 to 9.5 t; the last box counts only 5 years | **filter** | those two boxes kept with their extents written, the rest stepping back |
| 6 | the reading line and the whisker rule | **pull back** | the static plate, the rule written on it |

## Precision

- **Laid out in the reader's pixels**: one fitted value scale for every picture (a position encoding, not anchored at
  zero); in a column each year keeps a small offset so the years stay apart.
- **Summaries computed in node** with d3's quantile and a 1.5 × IQR fence, the same rule as the static component.
- **Every sentence is asserted**: only France in the file, every year from 1950 present, the median peaking in the
  1970s and falling every decade since, only the last decade partial, 1973 the highest year, 1980 the one outlier the
  fence finds, the 1980s the widest extent.

## Directions

`creme`, `nocturne`, `rapport` — `renders/<id>.html`, from `render-directions-scrolly.mjs`.
