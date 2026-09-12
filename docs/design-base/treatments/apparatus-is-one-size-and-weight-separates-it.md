# apparatus-is-one-size-and-weight-separates-it

- kind: imported
- name: An apparatus label and what is subordinate to it share a size; weight separates them
- applies: the beat declares an apparatus label that has a subordinate part
- draws: axis
- priority: 3
- evidence: ourworldindata-org-grapher-life-expectancy-vs-gdp-per-capita
- evidence: abc-net-au-news-2019-08-13-rich-school-poor-school-australias-great-ed
- evidence: informationisbeautiful-net-visualizations-hollywood-2023-hits-flops
- detect: within one apparatus block, the name run and its subordinate run share a font-size to
  within 0.5 px and differ by at least 200 in font-weight

## The rule

An axis title and its unit, a key caption and its qualifier, a row label and its value — one size,
with **weight** marking which is the name and which is subordinate to it.

## The evidence, all measured

- **Our World in Data**, on the axis: `Lato 12 / 700` sets `GDP per capita` and `Lato 12 / 400` sets
  `(international-$ in 2011 prices; plotted on a logarithmic axis)` — same size, same ink
  `rgb(91, 91, 91)`, weight alone separating them. On the key: `Lato 10 / 400` `Circles sized by`
  against `Lato 11 / 700` `Population`.
- **ABC**, in the callout card: `ABCSans 13 / 700` sets the label and `ABCSans 13 / 400` its value,
  both `rgb(34, 34, 34)`, on every row — `Income $98.1m`, `Cap. exp. $103.5m`.
- **Information is Beautiful**, *Hollywood hits and flops*: the channel pills, `13 / 600` against
  `13 / 400`.

Three publications, three continents of practice, one decision.

## What it replaces

An axis title set as one run — `GDP per capita (log scale)` in a single weight — which makes the
qualifier look like part of the variable's name. The qualifier is a caveat about the axis, not a
second half of what it measures, and the corpus separates the two without spending a size on it.

## What limits it

**It says nothing about which weights.** The corpus shows 700 against 400 and 600 against 400; the
gap of at least 200 is what the detect asks for, because a smaller gap is not a separation a reader
resolves at apparatus sizes.

**And it is about apparatus, not about the argument.** A title and a subtitle are not this: they are
different registers, and a direction sets their sizes apart deliberately.
