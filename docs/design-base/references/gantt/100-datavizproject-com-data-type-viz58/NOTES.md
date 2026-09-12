# Ferdio / 100.datavizproject.com — #58, one bar cut into two named eras

- url: https://100.datavizproject.com/data-type/viz58/
- archive: datavizproject
- type: single horizontal stacked bar, divided by a full-height rule into two periods, each period
  bracketed and named above the bar
- export: static (a raster served in the page, `img 823 × 823` at `documentTop 172`, `nearTheTop`)
- readAs: the published page at 1440 × 900, read at rest. Both routes `ok`; the pixel route
  measured `graphic.png`.

## What it is

One bar for all of Scandinavia, split at 2004: `5 | 13 | 4` to the left of the divider, `3 | 2 | 6`
to the right, coloured by country. Above the bar, two brackets — thin rules ending in an open
arrowhead — name the two stretches: **"Up until 2004"** and **"After 2004"**.

**It is not a gantt.** The horizontal axis is a COUNT, not a date; the bar's length is a quantity and
the two eras are categories, not intervals to scale. It is filed here for one device only, named
below, and for nothing else.

## What it does with information

**The era is named above the axis, in words, with an open-ended bracket.** This is the piece of
furniture a gantt actually needs and most drawings of one omit. `chart-beat`'s own type reference
says the missing time-axis caption is the subtle failure of this form — a reader who is not told that
length here means DURATION reads every bar as a magnitude. #58 solves the adjacent problem in the
adjacent way: it does not caption the axis in a footnote, it writes the period's name over the
stretch of axis it occupies, and lets the bracket's extent say which stretch that is.

**The bracket's arrowhead is open at the outer end and closed at the divider.** "Up until 2004"
points right, into the divider; "After 2004" points right, away from it. An open end is a claim that
the period continues past the edge of the drawing, and it is the honest mark for a period that has
no drawn boundary — an entity still in office, an outbreak still running, a sentence not yet served.

**The divider is a full-height hairline through the whole plate**, not just through the bar. It
crosses the bracket row as well, so the cut is a property of the chart rather than of the bar.

**Segment values are printed inside the segments in white** and no axis is drawn at all — with six
segments and no scale, the numbers are the only exact reading available. That is the opposite trade
from #15, which keeps a scale and prints nothing.

## What it does with style

Ground `#FFFFFF` at **93.653 %**. Two chromatics carry the bar: `#3274D8` at **2.316 %** (Sweden)
and `#EE5440` at **1.554 %** (Denmark), with `#5088DE`, `#5F92E1`, `#F2796A`, `#F06D5C`, `#F7A89E`
as the anti-aliased tail. Norway is neutral navy `#283250` at **1.285 %**. Two hue clusters, 216° at
2.449 % and 7° at 1.647 %; `shape: diverging`, `ramped: 2`.

The furniture is much darker than #15's because the legend swatches and the label text are part of
the same plate: `#68747E` at **0.094 %**, `#DCE3E4` **0.076 %**, `#E5EBEC` **0.055 %**, and the
bracket rules land among `#CACDD4` **0.035 %** and `#E9ECED` **0.033 %**. **The brackets are drawn
in the lightest furniture value in the record** — they are the least ink on the plate, and they are
carrying the chart's only statement of what its axis means.

## What is transferable

- **Name a period over the axis with a bracket, not in a caption.** The bracket's extent says which
  stretch of the axis the name applies to; a caption cannot.
- **An open arrowhead means the period is not bounded here.** Reserve a closed end for a real
  boundary.
- **Draw the divider through the whole plate**, including the label row, when the cut is the
  chart's subject and not the bar's.
- **The naming furniture may be the palest ink on the plate and still work**, because it sits on
  ground rather than on a mark.

## What was not verified

The graphic is a raster, so **the chart's own typography was not measured**; `style.type` here is
`100.datavizproject.com`'s own article furniture (stevie-sans, Borgia Pro) and not the chart's. The
bracket hexes are inferred from the neutral list by elimination, not sampled at the bracket itself —
the record does not separate bracket, legend swatch and label text. Whether the two brackets are the
same weight was judged by eye. One publication, and **it is not a gantt**: no gantt treatment may be
founded on it.
