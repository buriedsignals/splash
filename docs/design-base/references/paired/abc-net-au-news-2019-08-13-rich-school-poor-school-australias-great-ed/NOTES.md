# ABC News — "Rich school, poor school: Australia's great education divide"

- url: https://www.abc.net.au/news/2019-08-13/rich-school-poor-school-australias-great-education-divide/11383384
- archive: url-list
- type: grouped paired bars — two measures per entity, one hue at two lightnesses
- export: interactive scrollytelling (a searchable "how your school rates" section further down)
- readAs: the live charts, reached by scrolling to the article's middle — NOT the state the harvester
  photographed (`screenshot.png` is the article opening). `graphic-scrolled.png` in this directory is
  what was read; the pixel figures for the paired bars were measured on it.

## What it is

A ranked list of private schools, each a **pair of horizontal bars** on one shared dollar axis
(`$0.0m … $120.0m`): a pale bar for **recurrent government funding** and a saturated bar for
**income allocated to capital projects**. The axis sits **above** the plot; a two-swatch legend sits
above that, inline; school names run down the left. The finding is the chart's own title: "At these
schools, the income allocated to capital projects was worth at least 70 % of recurrent government
funding."

## What it does with information

**The pair is one hue at two lightnesses.** Measured on the scrolled capture, the graphic's palette
reads **sequential, one hue cluster at 199°**, with the two members at near-identical coverage —
`#B8DAEA` at **2.2 %** and `#1D81A2` at **2.0 %**. Two states, one colour identity, no second accent
spent. Reuters does the same thing with a purple pair in this family, and Ferdio does it with a tint
in `#3` and `#6`.

**The two bars are adjacent rows of one group, not stacked and not overlaid.** Both start at the same
left edge, so the reader compares two lengths from a common origin — the only comparison the eye does
reliably.

**The axis is at the top.** With rows sorted descending and the reader arriving from the prose above,
the ticks are met before the bars rather than after 80 rows of them.

**The comparison is between two MEASURES of one entity, not two dates.** The family's geometry is the
same either way, and this piece is the reminder that "two states" need not mean "two times" — which
is also what the Information is Beautiful pay-gap dumbbell shows for two groups.

**The list is a shortlist with its criterion printed.** The chart title states the threshold ("at
least 70 %") that decided who is in it, so the selection is not silent.

## What it does with style

Measured on `graphic-scrolled.png`: ground **`#FFFFFF` at 91.5 %**; the palette reads **sequential,
one cluster at 199°**, `#B8DAEA` (2.2 %) and `#1D81A2` (2.0 %); neutral furniture `#000000` at 1.0 %
(type), `#F3F3F3` and `#DBDBDB` (gridlines).

The record's own `graphic.png` is a different thing and its numbers are not this chart's: the
harvester's `largestGraphic` selected the scrollytelling column as one 700 × 10 520 `<svg>`
(ratio **0.07**), and measured ground `#FFFFFF` at 90.6 % with a **categorical** palette of three
clusters — 171° `#68E1CF`, 359° `#FCA0A1`, 220° `#5890FD`. Those are the piece's *other* charts (a
school-by-school scatter). Both readings are true of different parts of one very tall graphic; the
paired-bar section is the one this note is about.

Style route on the page: **37 type tuples**, marks led by `fill rgb(0, 0, 0)` ×30 and
`fill rgb(212, 17, 69)` ×8. Text column 653 px / **73 ch**, the same measure as the sibling ABC
piece.

## What is transferable

- **Draw a two-measure pair as one hue at two lightnesses**, adjacent, from a shared origin.
- **Put the value axis above a long ranked list**, where the reader meets it first.
- **Print the selection criterion in the chart title** when the chart shows a shortlist.

## What is this piece's own

The ABC teal; the licensed ABCSans; the school subject and the very tall single-SVG scrollytelling
column.

## What was not verified

Whether the two bars are on one scale or two — they share tick labels and a left edge, which is
strong evidence, but the pixel lengths were not checked against the printed dollar figures. Whether
the row order is by capital allocation, by ratio, or by funding. The interactive school lookup
further down the page was not opened.
