# Ferdio / 100.datavizproject.com — #24, two 100 % stacked bars

- url: https://100.datavizproject.com/data-type/viz24/
- archive: datavizproject
- type: 100 % stacked bar, one row per year
- export: static (a raster served in the page)
- readAs: the published page at 1440×900, read at rest. `largestGraphic: null`; the pixel route
  measured the whole page shot.

## What it is

One of a hundred encodings of the same dataset — UNESCO World Heritage sites in Denmark, Norway and
Sweden, 2004 against 2022. Here each YEAR is one bar of fixed length, divided into the three
countries' shares of that year's total.

## What it does with information

**Two rows, and the comparison is composition rather than size.** `2004` reads 18 % / 23 % / 59 %
and `2022` reads 30 % / 24 % / 46 %. Both sum to 100, which is what makes the two rows comparable at
equal length: the chart has given up absolute size in order to make share legible, and says so by
printing percent signs on every segment.

**Every segment carries its own share, inside itself.** No axis, no gridlines, no percent scale
under the bars.

**The row label is joined to its bar by a hairline leader.** `2004` and `2022` sit well left of the
bars with a thin rule running from the word to the bar's rounded end. Two rows do not need a leader
to be unambiguous; drawing one anyway keeps the label out of the bar's own space without letting the
pairing go loose.

**The key is placed over the segments it names, not beside the chart.** Flag roundels with `DK`,
`NO`, `SE` sit above the first row, each centred on that row's segment. It works for the row it is
aligned to — and it is worth recording that it **stops working for the second**: the 2022 segments
have moved, so the key's positions no longer land on the colours they name. A key positioned on one
row of a composition chart is a key that goes wrong as soon as the composition changes.

## What it does with style

Ground `#F4F7F7` at **44.8 %** with `#FFFFFF` at **42.0 %**; strongest chromatic cluster `#3274DA`
at **10.4 %**, red `#F05440` at 0.8 %, and a dark navy `#283250` at **0.8 %** among the neutrals —
the third category is drawn in near-black rather than a third hue. Palette read as **diverging**.
Bars have fully rounded ends and a hairline light outline around the whole bar, so the composite
reads as one object that has been divided rather than as three objects abutting.

## What is transferable

- **A percentage inside every segment, and no percent axis.**
- **A hairline leader from the row label to the bar** keeps the label outside the bar and the pairing
  tight.
- **Outline the whole stacked bar, not each segment**, so it reads as one thing divided.
- **Do not position a key on one row of a composition chart** — the segments move.

## What is this piece's own

The flag roundels, the fully rounded ends, and using near-black as the third category colour.

## What was not verified

The chart's own typography, unmeasured as with every DVP record. Whether the underlying counts
(which #6 and #23 print) are recoverable from this view — they are not, which is the cost this
encoding pays. One publication.
