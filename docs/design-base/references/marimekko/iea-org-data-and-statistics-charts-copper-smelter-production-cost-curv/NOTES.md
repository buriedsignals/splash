# IEA — *Copper smelter production cost curve, 2025*

- url: `https://www.iea.org/data-and-statistics/charts/copper-smelter-production-cost-curve-2025`
- archive: `search` (IEA chart library, `?type=variwide`) · harvested 2026-09-08, browser, both routes `ok`
- artifact actually read: the chart itself, an inline `svg 1162 × 500` at `documentTop 441`,
  `routes.pixel.measuredFrom = "graphic.png"`.

## What it is

A **production cost curve**: one variable-width bar per smelter, height = direct cash cost (c/lb),
width = copper produced, cumulative x axis running 0 → ~15 600 kt. Bars are sorted by cost, so the
outline is a staircase from 7 c/lb to 65. Area under the curve is total cost. Same construction as
the nitrogen chart, reduced to its bones.

## What it does with information

**One accent, and it marks a contiguous range of the axis.** Everything from 0 to about 8 800 kt is
orange; everything above is grey. Because the x axis is cumulative, the orange block's own *width* is
the reading — "this much of world smelting sits below this cost" — and the boundary between the two
colours is a value the reader can take off the axis directly. That is a different use of highlight
from the nitrogen chart, where the accents are scattered picks; here the accent is an interval.

**The grey is not a background, it is the rest of the data.** `#E6E6E6` covers 15.69 % of the plate
against the orange's 6.12 %: two thirds of the bars are drawn, unlabelled, in one neutral, and they
carry the shape of the tail (the near-vertical run past 15 000 kt) that gives the orange block its
meaning.

**No bar is named.** No legend either. The entire chart is two axis titles, a tick ladder and the
two-tone staircase. Whatever distinguishes the orange smelters from the grey ones is stated in the
page's own text, not on the plate.

## What it does with style

Colour, from `record.pixel`, measured on `graphic.png`: ground `#FFFFFF` at 77.22 %; the single
chromatic entry `#FF754B` at 6.12 %; neutrals `#E6E6E6` at 15.69 % and `#000000` at 0.22 % for axis
ink. Palette shape reads `monochrome` — **one accent, one neutral, one ground**, and nothing else.
The starkest palette in this corpus, and it is a chart of several thousand values.

Type (`style.typeSource`: *"the page, which contains the graphic — the two are not separated"*,
inline SVG): the same two IEA registers — `Graphik | 12 | 400` grey `rgb(111, 111, 111)` for
`Copper from concentrate (kt)` and `Smelter direct cash cost (c/lb)`, `Graphik | 12 | 500` black for
any named datum. Tick numbers use a thin space as the thousands separator (`15 000`), not a comma.

## What is transferable

1. **A contiguous accent interval on a cumulative axis** — the highlight's width is itself a number
   the reader can read off.
2. **A monochrome variable-width chart**: one accent against one grey is enough for a distribution of
   thousands of units, and refusing a second hue is what keeps the boundary legible.
3. **Thin-space thousands separators** on a wide numeric axis.

## What was not verified

- The exact cumulative value at which orange gives way to grey was estimated off the axis (~8 800 kt),
  not read from data.
- What the orange denotes is not stated on the plate and was not recovered from the page's prose.
- One publication; three sibling IEA charts in this corpus corroborate nothing between themselves.
