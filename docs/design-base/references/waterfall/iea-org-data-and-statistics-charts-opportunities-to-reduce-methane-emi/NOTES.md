# IEA — Opportunities to reduce methane emissions from energy, 2025

- url: https://www.iea.org/data-and-statistics/charts/opportunities-to-reduce-methane-emissions-from-energy-2025
- archive: url-list (drawn from the IEA chart library's FORM filter, `?type=waterfall`)
- readAs: the published chart page at 1440×900. `style.graphic` is an `svg` 1162×500 at
  `documentTop: 521`, `nearTheTop: true`; `routes.pixel.measuredFrom: "graphic.png"`.

## What it is

A five-bar abatement bridge: total energy-sector methane (~148 Mt), then three sector steps — oil
and gas, coal, bioenergy — walking down to `Remaining emissions` (~46 Mt).

## What it does with information

**Each step is itself a stack.** The oil-and-gas step is not one block but six, stacked inside the
step's own vertical extent — the measures that make up that sector's abatement. So the chart answers
two questions at once: how much does this sector contribute to the fall, and of what is that
contribution made. The coal step has three segments, bioenergy two.

**The two totals share one hue and the steps share none of it.** `#49D3FF` at 9.596 % is the two end
bars and nothing else; the stacked segments run through the rest of the library's ramp (`#FFF45A`
0.831 %, `#FFB743` 0.777 %, `#3E7AD3` 0.777 %, `#FF754B` 0.687 %, `#68F394` 0.416 %, `#00ADA1`
0.325 %, `#B187EF` 0.127 %). Same house, same template as the natural-gas chart, opposite decision:
here the total is a role and there it was a series.

**A pale segment sits at the base of every step.** Each stacked step carries one near-neutral band
at its lower edge; against the record's neutral list (`#E6E6E6` at 1.614 %) it cannot be separated
from the gridlines by measurement alone, and its meaning is only recoverable from the legend, which
is outside the photographed graphic.

**Zero baseline, full-height totals.** The axis runs 0 → 160, so the abatement steps read correctly
as fractions of the total they come out of.

## What it does with style

Ground `#FFFFFF` at **83.69 %**; palette read as **diverging** (the reading is dominated by one
strong cyan against a long categorical tail, which is what the classifier sees). Furniture `#E6E6E6`
1.614 %, `#000101` 0.297 %.

Type `Graphik` 12/400 for ticks and the axis title (`emissions (Mt)`), 12/500 for category labels
(sample `Other measures` — a legend entry, so the legend is in the page and simply below the
photographed rectangle).

## What is transferable

- **A step of a bridge can be a stack**, when the reader needs the composition of the contribution
  as well as its size. The running total still works because the stack's total extent is the step.
- **One hue for every absolute total** makes the bridge legible even when the steps carry a full
  categorical ramp.

## What was not verified

What the pale band at the base of each step encodes — the legend sits outside the measured graphic
and was not read. Exact values (no data labels). Whether the stack ordering inside each step is
constant across steps. One publication.
