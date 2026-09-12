# IEA — Change in total population in Southeast Asia, 2024 and 2050

- url: https://www.iea.org/data-and-statistics/charts/change-in-total-population-in-southeast-asia-2024-and-2050
- archive: url-list (drawn from the IEA chart library's FORM filter, `?type=waterfall`)
- readAs: the published chart page at 1440×900. `style.graphic` is an `svg` 1162×500 at
  `documentTop: 521`, `nearTheTop: true`; `routes.pixel.measuredFrom: "graphic.png"`.

## What it is

A four-bar bridge from a 2024 population of ~693 million to a 2050 population of ~770 million,
through two steps: `Urban` (up) and `Rural` (down). Every one of the four bars is stacked by
country.

## What it does with information

**The stack is the same in all four bars, and that is the point.** The two totals are stacks of
member countries; the two steps are stacks of the *same* countries' contributions to urban growth
and rural decline. The reader can therefore compare one country's slice across the level and the
change without a second chart.

**And the sign of a step is carried by geometry alone.** Urban and rural steps use the identical
country palette; nothing in the colour says one adds and the other subtracts. That works here
because there are only two steps and their vertical direction is unmissable; it would not survive
eight.

**Both ends are full bars from zero** (axis 0 → 900), so the two steps read as the small quantities
they are: ~150 million of movement inside a 700-million total.

## What it does with style

Ground `#FFFFFF` at **79.30 %** — the lowest white share of the five IEA records here, because two
of the four bars are full-height stacks. Palette read as **categorical**: `#49D3FF` 7.531 %,
`#3E7AD3` 3.112 %, `#68F394` 2.548 %, `#00ADA1` 1.623 %, `#FFF45A` 1.353 %, `#FFB743` 0.902 %,
`#FF754B` 0.383 %, `#B187EF` 0.338 %. Furniture `#E6E6E6` 1.341 %, `#000000` 0.230 %.

Type `Graphik` 12/400 for ticks and the axis title (`million people`), 12/500 for category and
legend labels (sample `Indonesia`).

Four category labels only — `2024`, `Urban`, `Rural`, `2050` — set horizontally and centred under
each bar, with no rotation and no wrap needed. The bridge's whole vocabulary of two dates and two
causes fits in four words.

## What is transferable

- **Stack the totals and the steps with the same key** when the reader's question is "who moved".
- **Two steps is the count at which geometry alone can carry the sign.** Past that, the direction
  needs a role colour.

## What was not verified

The country legend is below the photographed rectangle and was not read, so the mapping from hue to
country is inferred from the 12/500 type sample (`Indonesia`) and not confirmed slice by slice.
Exact values (no data labels). One publication.
