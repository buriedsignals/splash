# Our World in Data — Life expectancy vs GDP per capita

- url: https://ourworldindata.org/grapher/life-expectancy-vs-gdp-per-capita
- archive: url-list
- type: bubble scatter — two quantitative axes, size and colour channels
- export: web
- readAs: the chart element itself, photographed by the pixel route as `graphic.png`, at rest in its
  default state

**Provenance caveat, stated because the record's own `archive` field cannot say it.** This url is
**not** in `~/Downloads/infoviz-source-urls-alive.txt` — `grep -ic ourworldindata` returns 0. It was
drawn deliberately, because the url list is indexed by subject and not by form (`METHOD.md`,
correction 2) and returned no scatter at all. `ARCHIVES` in `harvest.mjs` has no value for a
deliberate draw, so it is recorded as `url-list`, which is the same thing the line family's own
Our World in Data record does. The corpus should know that "url-list" means "a newsroom page" and
not "verified present in the list".

## What it is

Every country as a circle: **x = GDP per capita** (log), **y = life expectancy at birth**, **area =
population**, **fill = continent**. No time axis — the year (2022) is fixed and named in the page
title above the plate.

## What it does with information

**The axis title is one line in two weights: the variable in bold, everything qualifying it in
regular at the same size.** Measured by the style route: `Lato 12 / 700` sets `GDP per capita`
(3 runs) and `Lato 12 / 400` sets `(international-$ in 2011 prices; plotted on a logarithmic axis)`
(24 runs), both `rgb(91, 91, 91)`. Same size, same colour, weight alone separating the name from
its conditions.

**The axis says out loud that it is logarithmic.** Not a superscript, not a footnote — the words
"plotted on a logarithmic axis" sit inside the axis title where the reader meets the scale.

**The unit rides every tick.** y reads `20 years … 80 years`; x reads `$1,000 … $100,000`. The same
thing the line family's Our World in Data record does, on both axes here.

**The point label's own type size is part of the size encoding.** The style route read one type
tuple per named country, and the sizes are not uniform: `India 14.3`, `United States 12.6`,
`Indonesia 12.5`, `Pakistan 12.4`, `Nigeria 12.3`, `Russia 12.1`, `DR Congo 11.9`,
`South Africa 11.7`, `Kenya 11.6`, `Angola 11.5`, `Mali 11.4`, `Central African Republic 11.2`,
`Lesotho 11.1` — a 9.4 px to 14.3 px range across the plate, rank-ordering with population, which
is the channel the circle's area already carries. A big country is named in big type. The size key
does it to itself: `Circles sized by` at `Lato 10 / 400`, `Population` at `Lato 11 / 700`, and its
two specimen values at `1.4B` = `Lato 11` and `600M` = `Lato 9.4` — each number set at the size of
the circle it labels.

**Selective labelling.** Roughly two dozen of the several hundred circles are named; the rest are
drawn and left silent. Nothing marks the unnamed ones as lesser — they are simply the cloud the
named ones sit in.

**Two keys, stacked at the right, each stating its own channel.** A colour key (six continent
swatches with their names) above a size key (two concentric circles sharing a lower tangent,
labelled `1.4B` and `600M`, captioned `Circles sized by Population`). The size key names its
variable rather than only demonstrating a ramp.

## What it does with style

Ground `#FFFFFF` at **91.7 %** coverage (pixel route, on `graphic.png`). The palette reads
**categorical**; the four largest chromatic buckets are `#339D98` (177°, 0.46 %), `#B577B0`
(305°, 0.18 %), `#EA8B7B` (9°, 0.10 %) and `#7088B0` (218°, 0.07 %) — a categorical set for
entities that have no order, at very low coverage because the plate is mostly paper. Type is
`Lato` throughout, one family, weights 400 and 700, one tracked-uppercase run in the page chrome
and none inside the chart. Gridlines dotted, no axis spines.

## What is transferable

- **Axis title = bold variable + regular qualifier, one line, one size.**
- **Name the scale transform in the axis title, in words.**
- **Unit on every tick, both axes.**
- **Scale the point label's type with the size channel**, and scale the size key's own numbers the
  same way, so the legend is a specimen of the encoding rather than a description of it.
- **A size key states its variable by name** ("Circles sized by Population"), not just a ramp.
- **Label a chosen subset and leave the cloud unnamed.**

## What is this piece's own

Grapher's furniture, `Lato`, and OWID's continent hues.

## What was not verified

- The functional form linking label size to population. The **rank order** was checked against the
  measured tuples on this chart and on `ourworldindata-org-grapher-co2-emissions-vs-gdp`; whether it
  is linear, √area or something else was **not** measured, and nothing above depends on it.
- The **colours** the style route reports for the point-label tuples (`rgb(91, 91, 91)`) disagree
  with the pixels, which show each label in its continent's hue. The likely cause is that the route
  reads the CSS `color` property while an SVG `<text>` is painted by its `fill` attribute. The
  pixels win. No colour claim above rests on a style-route tuple.
- The chart is interactive — countries can be added, the year can be moved, the axes can be
  switched. Only the default resting state was read.
