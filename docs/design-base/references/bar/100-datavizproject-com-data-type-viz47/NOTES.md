# Ferdio / 100.datavizproject.com — #47, growth stacked into one column

- url: https://100.datavizproject.com/data-type/viz47/
- archive: datavizproject
- type: column chart, one column per country, split into a 2004 block and a 2022 block
- export: static (a raster served in the page)
- readAs: the published page at 1440×900, read at rest. `largestGraphic: null`; the pixel route
  measured the whole page shot and the style route reached only DVP's chrome.

## What it is

One of a hundred encodings of the same dataset — UNESCO World Heritage sites in Denmark, Norway and
Sweden, 2004 against 2022. Here each country is one column whose lower block is its 2004 count and
whose upper block carries it to 2022.

## What it does with information

**The series is named inside the mark.** `'04` sits in the saturated lower block and `'22` in the
lighter upper block of every column, set in white on the fill. There is no legend anywhere on the
plate. The name of a series is carried by the series.

**Same hue, two lightnesses, and the lighter one is the later one.** Each country keeps one hue —
red for Denmark, navy for Norway, blue for Sweden — and the second period is a lighter step of it.
Nothing in the palette says "different category", because these are not different categories; they
are the same country twice.

**The axis stays, and it is drawn as short tick dashes rather than rules.** `0 2 4 6 8 10 12 14 16`
down the left, each with a small dash and no gridline crossing the plot. The columns here are not
labelled with their values, so a scale is required — and it is drawn as quietly as a scale that is
required can be.

**The columns are in alphabetical order — Denmark, Norway, Sweden — not value order** (10, 8, 15).
That is worth recording as what it is: the default order of the source table, left in place. The
chart's own #19 and #6 both order deliberately; this one does not, and reads flatter for it.

## What it does with style

Ground `#F4F7F7` at **44.7 %** with `#FFFFFF` at **39.5 %**; strongest chromatic cluster `#3274DA`
at **11.0 %**, then `#F37666` at 1.2 % and `#EE5440` at 0.8 %; dark navy `#283250` at **1.0 %** among
the neutrals. Palette read as **diverging**. As with every DVP record, the blue cannot be separated
from the site's own navigation bar, which is the same colour.

Columns are separated by roughly a third of a column width, and the two blocks of one column are
separated by nothing — they touch, so the total height is legible as a total.

## What is transferable

- **Name the series inside its own mark** and delete the legend.
- **Two lightnesses of one hue for two dates of one subject**; a second hue would claim a second
  subject.
- **When the values are not printed, keep the scale and draw it as ticks, not rules.**
- **The stack's blocks touch and the columns do not** — the reader is told what adds up and what
  does not by the gaps alone.

## What is this piece's own

The specific three-country palette, and the two-digit year form `'04`.

## What was not verified

The chart's own typography — sizes, weights, families of `'04`, `Denmark`, `16` — is unmeasured; the
style route read DVP's page chrome (stevie-sans, Borgia Pro) rather than the raster. The column
values were read off the axis by eye. One publication.
