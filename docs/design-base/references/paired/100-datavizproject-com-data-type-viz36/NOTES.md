# 100 datavizproject — #36, the change given its own column

- url: https://100.datavizproject.com/data-type/viz36/
- archive: datavizproject
- type: three-column table with a ribbon between the two state columns
- export: static
- readAs: the encoding as the page draws it, read at rest, from the page screenshot

## What it is

A three-column table headed **`2004` | `Change` | `2022`**, one band per country. In each band the
two outer cells carry the value in bold with its unit spelled out beneath it (`5` / `World Heritage
Sites`), the middle cell carries `60%` with the word `Increase` beneath it, and under the band a
ribbon runs from a red block on the left to a blue block on the right, its height encoding the value
and its fill a gradient across the middle column.

## What it does with information

**The change is a named variable, headed like the two states.** Not an annotation, not a caption —
a column, with a header of the same rank as `2004` and `2022`. That single decision makes the
picture about three things instead of two, and it is the cheapest version of the idea in this family.

**The change is stated twice, in two registers, in the same cell**: `60%` as a figure and
`Increase` as a word. The word carries the sign for a reader who does not parse the sign, and it
carries it in the reader's language rather than as a glyph.

**The unit is repeated under every number rather than named once.** `World Heritage Sites` appears
six times. Costly in ink, but no number in the table can be read without its unit.

**The ribbon does the same work as the table and disagrees with none of it** — the geometry and the
numerals are the same fact twice, so neither has to be trusted alone.

## What it does with style

The house drawing: white card on a pale `#F4F7F7` page, blue `#3274D8` (216°) and red `#EE5440`
(7°); on this piece the two poles carry unusually large coverage — **9.1 % blue and 5.6 % red** of
the cropped card, because the ribbons are solid areas rather than strokes. Measured from a **crop**
of `screenshot.png` at `308,172,824,728`.

**The record's own pixel and style numbers are the SITE, not the chart.** `largestGraphic` picks the
DVP logo (`svg` 280 × 80 at `y: 0`), so `measured.json` describes the page and the style route sees
only site chrome. The chart is a raster and neither route reaches it.

## What is transferable

- **Head the change as a column.** Where a beat has a before, an after and a delta, the delta is a
  variable and deserves a header, not a footnote.
- **State the sign as a word beside the figure** (`Increase`) rather than only as a `+` or a glyph.
- **Repeat the unit under every number** in a small table; six repetitions is cheaper than one
  misread.

## What is this piece's own

The house triad; the sankey-like ribbon; the red→blue direction of travel.

## What was not verified

Whether the ribbon heights are on a common scale across the three bands. Whether `15.4%` and `60%`
are computed from the printed integers or supplied — they are consistent with them.
