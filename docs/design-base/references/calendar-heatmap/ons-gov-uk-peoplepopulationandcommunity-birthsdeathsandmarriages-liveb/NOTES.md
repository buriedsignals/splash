# Office for National Statistics — "How popular is your birthday?"

- url: https://www.ons.gov.uk/peoplepopulationandcommunity/birthsdeathsandmarriages/livebirths/articles/howpopularisyourbirthday/2015-12-18
- archive: search
- type: calendar heatmap, day-of-month × month, one cell per calendar date
- export: web (an `<iframe>` chart on a statistics-bulletin page)
- readAs: the chart's OWN document, `ons.gov.uk/visualisations/nesscontent/dvc307/chart1/index.html`,
  photographed as the element (`graphic.png`, 700 × 1102). `routes.pixel.measuredFrom` is
  `graphic.png`; `style.typeSource` is `the graphic's own document, in style.graphicFrame`.
- consent: the harvester clicked a button labelled `Accept additional cookies` before measuring.
  The page was therefore read in a state the harvester put it in.

## What it is

The ONS's own answer to which calendar dates produce the most births in England and Wales, 1995–2014.
One rectangle per date. **Rows are days of the month, 1 to 31; columns are the twelve months**, `Jan`
to `Dec` across the top. So the grid is 31 × 12 = 372 slots for 366 real dates, and the six that do
not exist are the first thing the design has to answer for.

It is one of the chart-tool permalinks `METHOD.md` correction 18 recommends: one published chart, its
own document, no masthead inside it, no hero, no second graphic.

## What it does with information

**The six impossible dates are DRAWN, not omitted.** `style.graphicFrame.marks` counts
`fill rgb(255, 255, 255)` exactly **6** times — Feb 30, Feb 31, Apr 31, Jun 31, Sep 31, Nov 31. They
are white cells with the same grey stroke as every other cell, so the grid stays rectangular and the
gap reads as "this date does not exist" rather than as a value at the pale end of the ramp. Six is
the arithmetic that proves it: no other count in that chart is six.

**The legend prints its own class breaks, in the data's units.** Not a continuous gradient bar with
two end labels, but a five-step strip carrying `1,350`, `1,580`, `1,800`, `1,850`, `1,980` — and
`1,900` is printed under a boundary too. A reader can convert any cell back to a number of births,
which a smooth gradient does not permit. `Open Sans | 12 | 400` at 6 occurrences is exactly that
strip of numbers.

**Two headings, and the second names what the numbers rank.** `Number of Births` sits over the grid
at `Open Sans | 15 | 800` and `Rank` sits to its right in the same register — the chart states that
one encoding carries two readings.

**Nothing is annotated.** The extremes are not called out; the reader finds September by seeing the
block of dark red. The picture argues by shape alone.

## What it does with style

Pixel route on the chart's own element: ground `#FFFFFF` at **30.8 %** — the ramp fills most of the
frame, which is what a full calendar grid does to a plate. The ramp is the five-class **YlOrRd**
ColorBrewer sequence, and `graphicFrame.marks` gives both the colours and how many cells each takes:
`#FFFFB2` ×4, `#FECC5C` ×157, `#FD8D3C` ×122, `#F03B20` ×69, `#BD0026` ×19. Measured shares in the
pixels agree: 25.97 %, 20.06 %, 11.30 %, 2.98 %, 0.51 %.

The pixel route independently classified the plate `shape: "sequential"`, `ramped: 1`, with **one**
hue cluster at hue 41 covering 61.2 % of the picture. A ramp that reads as one ordered thing to a
machine reads as one ordered thing to a reader.

Type — from the graphic's own document, not the page: `Open Sans` throughout. `15 / 800` for the two
headings in `rgb(102,102,102)`, `14 / 300` for the month names, `14 / 400` for the day numbers,
`12 / 400` for the legend's break values, `14 / 100` for `Source:`. Six weights of one family, with
the **lightest weight reserved for the source line** — the least important text is the thinnest,
which is a register decision, not a default.

**The contrast the ramp actually has against its own ground**, computed from the record's hexes:
`#FFFFB2` is **1.04 : 1** against `#FFFFFF`, `#FECC5C` 1.50, `#FD8D3C` 2.32, `#F03B20` 3.92,
`#BD0026` 6.58. The bottom of the ramp is invisible against the page and the design accepts that; it
is the grey cell stroke, not the fill, that makes the palest cell a cell at all.

## What is transferable

- **Draw the dates that cannot exist as explicit empty cells** with the same stroke as the rest, so
  the grid stays rectangular and a hole never reads as a low value.
- **A binned legend that prints its break values in the data's own units** — the reader can invert
  the colour. This is stronger than a gradient bar and costs one row of small type.
- **Name both readings when one encoding carries two** (`Number of Births` / `Rank`).
- **The lightest weight in the family for the source line.** A register built from one family and six
  weights, with importance running with weight.
- **Expect the low end of any sequential ramp on a white page to be around 1 : 1 against it**, and
  carry the cell's edge — not its fill — as the thing that makes it legible.

## What is this publication's own

`Open Sans` and the ONS's `nesscontent/dvc307` chart harness. The YlOrRd ramp is ColorBrewer's, not
the ONS's.

## What was not verified

- Any interactive behaviour of the chart: hover, tooltip, keyboard. The record is one still.
- Whether the page carries a second figure below this one; only the largest graphic was measured.
- The exact class boundary that `1,900` labels — it is printed between two swatches and was read off
  the picture, not from the chart's data.
- Whether the six white cells are a deliberate encoding or a by-product of the data having no rows
  for those dates. The count of 6 proves they are painted; it does not prove they were intended.
- The page's own type (`ons.gov.uk` article furniture) was not used for anything here, because
  `typeSource` says the graphic speaks for itself.
