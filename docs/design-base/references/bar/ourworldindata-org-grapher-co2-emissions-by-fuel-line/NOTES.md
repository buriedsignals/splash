# Our World in Data — "CO₂ emissions by fuel or industry", World, 2024

- url: https://ourworldindata.org/grapher/co2-emissions-by-fuel-line?tab=discrete-bar
- archive: url-list
- type: horizontal bar chart, one bar per category, single year
- export: web (a grapher view; the same chart is served as a static image)
- readAs: the chart's own SVG, photographed as the element (`graphic.png`), plus the page around it
  read by the style route. Nothing here is read off a promotional card or a `<meta>` image.

## What it is

Six categories of the world's 2024 CO₂ emissions — coal, oil, gas, cement, other industry, flaring
— drawn as one horizontal bar each, sorted from the largest down.

## What it does with information

**Every bar carries its number, and so the chart draws no value axis at all.** There is no x scale,
no ticks and no gridlines; there is a hairline zero rule, the six bars, and beside each bar's end its
own value. The reader never travels to an axis, because the axis's only job — "how much is this one"
— has been answered on the bar.

**The unit word follows the magnitude.** The same chart writes `15.8 billion t` on the top bar and
`424 million t` on the fifth. A single unit would have forced either `0.424 billion t` or
`15,800 million t` onto a reader; changing the word per bar costs nothing and keeps every number at
three significant figures — 15.8, 12.5, 8.01, 1.47, 424, 416.

**The category is set heavier than the value.** Measured by the style route: `Coal` is Lato 12 / 700
and `15.8 billion t` is Lato 12 / 400, both in `rgb(91, 91, 91)`. Same size, same ink, different
weight — the name of the thing is the entry point and the number is the answer, and the chart says
which is which with weight alone rather than with a second colour.

**Sorted by the quantity being compared.** Coal, oil, gas, cement, other industry, flaring is the
value order, so the chart's shape and the chart's ranking are the same statement.

## What it does with style

Pixel route on the chart element: ground `#FFFFFF` at **78.7 %** coverage, one chromatic cluster
`#7088B0` at **19.2 %**, palette read as **monochrome**. One muted slate blue for every bar — no
category colours, because the categories are not in competition, they are parts of a total.

Style route on the page: the title `CO₂ emissions by fuel or industry` is **Playfair Display 25 /
600** in `rgb(45, 46, 45)`; the subject-and-date that follows it, `World, 2024`, is **Lato 18 / 700**
in `rgb(118, 118, 118)` — one line, two registers, the what in a serif and the when in a lighter
grey sans. Below the plot, `Data source:` in Lato 13 / 700 opens a provenance line that is part of
the chart rather than a footnote to it.

## What is transferable

- **A bar chart that prints every value draws no value axis.** Keep the zero rule and the category
  names; drop ticks, gridlines and the scale.
- **Let the unit word change with the magnitude** so every number can stay at the same precision.
- **Weight, not colour, separates the category name from its value** at the same size and ink.
- **Sort by the quantity being compared** unless the categories carry an order of their own.
- **The subject and the date belong beside the title, in a quieter register** rather than in a
  separate standfirst.

## What is this piece's own

The Playfair/Lato pairing, the grapher chrome (Table / Line / Bar tabs, the 1750–2024 time slider)
and the specific slate blue.

## What was not verified

Whether the value labels reflow or are dropped at narrow widths; the contrast of `#7088B0` against
`#FFFFFF` was not measured against any floor. The cookie banner sat at the foot of the page and did
**not** overlay the chart, but no attempt was made to dismiss it, so the page-level style tuples
include its type.
