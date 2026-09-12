# IEA — Year-on-year change in natural gas demand across key markets, 2026 vs 2025

- url: https://www.iea.org/data-and-statistics/charts/year-on-year-change-in-natural-gas-demand-across-key-markets-2026-versus-2025
- archive: url-list (drawn from the IEA chart library's FORM filter, `?type=waterfall`)
- readAs: the published chart page at 1440×900. `style.graphic` is an `svg` 1162×500 at
  `documentTop: 521`, `nearTheTop: true`; `routes.pixel.measuredFrom: "graphic.png"`.

## What it is

A contributions bridge with no opening total: seven regional steps, all negative, walking from zero
down to a `Total change` of about −21 bcm. The axis runs 0 at the top to −50 at the bottom, so the
whole chart hangs below its own baseline.

## What it does with information

**A bridge can start at zero and end at a total.** There is no "2025" bar. The first bar is the
first step, drawn from the zero line, and the last bar is the sum drawn back to it. This is the
part-to-whole variant of the form — the totals bar exists so the reader can see that the parts add
up to something they have already been told.

**And this is where the categorical palette costs it something.** `#3E7AD3` at 4.363 % is *both*
the first step (Middle East) and the `Total change` bar. Hue is assigned by series index, so the
total is not distinguishable from a step by colour — only by its label and its position. Read
against the household-prices chart from the same library, where one blue means "level" throughout,
this is the same house making the opposite choice on the same template.

**A zero step disappears completely.** `North America` has a category label, a tick and a gap where
its bar would be — the value is zero, so nothing is drawn, and the row reads as missing data rather
than as no change. This is the defect that the ONS records in this family answer with an explicit
zero marker.

## What it does with style

Ground `#FFFFFF` at **88.87 %**; palette read as **categorical**. `#3E7AD3` 4.363 %, `#B187EF`
1.891 %, `#49D3FF` 1.231 %, `#00ADA1` 0.850 %, `#FFB743` 0.403 %, `#68F394` 0.145 % — one hue per
region, sizes tracking the bars' own areas. Furniture `#E6E6E6` 0.868 % (gridlines), `#000000`
0.424 % (ink, heavier here because the zero rule is drawn solid across the top).

Type `Graphik` 12/400 for ticks and the axis title (`bcm`), 12/500 for category labels
(`United States`); `Central and South / America` wraps to two lines rather than rotating.

## What is transferable

- **The part-to-whole bridge**: no opening total, steps from zero, a summing total at the end.
- **Draw the reference line the bridge hangs from** — here the solid rule at 0, which is what makes
  an all-negative chart readable at a glance.
- **A step of zero must still be drawn as something**, or the row reads as a hole in the data. This
  chart is the evidence that leaving it out fails.

## What was not verified

The exact values (no data labels; tooltip not read); the `Total change` reading is taken off the
axis by eye at about −21 bcm. Whether `North America` is genuinely 0.0 or a rounded-to-zero value.
One publication.
