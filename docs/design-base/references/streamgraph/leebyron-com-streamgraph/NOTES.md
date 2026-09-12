# Lee Byron & Martin Wattenberg — *Stacked Graphs – Geometry & Aesthetics*

- url: https://leebyron.com/streamgraph/
- archive: url-list
- type: streamgraph — the paper's own figure, the form at its purest and least annotated
- export: static
- readAs: the figure as the page draws it, at rest
- artifact actually read: the page's own 572 × 204 figure (`style.graphic` = `img`, `documentTop`
  323, `nearTheTop` true) — the chart, not a hero and not a card.

## What it is

The home page of the InfoVis 2008 paper that formalised the form, carrying one figure: an
unlabelled, wordless streamgraph of many layers over an unnamed time span. The page's prose states
the lineage in its own words — the February 2008 New York Times box-office chart "was based on a
similar visualization, developed by the first author, that displayed trends in music listening" —
and describes the paper as "a mathematical analysis of how this layered graph relates to traditional
stacked graphs and to techniques such as ThemeRiver, showing how each method is optimizing a
different 'energy function'."

## What it does with information

**It states nothing and shows only the geometry.** No axis, no tick, no label, no legend, no title
inside the figure. That is not an oversight in a paper about geometry, and it is precisely the
condition the chart-beat type reference warns a published streamgraph must never be left in: "a
streamgraph with no in-band labels at all is a chart of pure impression with no way back to a
number." This record is the clearest available picture of what that costs.

**What the figure does prove is the layout.** Layers are ordered inside-out — the fattest bands
run through the middle and the thin ones taper to the outside edges — and the whole stack is
displaced so that no layer's baseline is straight. Around x ≈ 40 % of the span one thin band
plunges downward well below the body of the stack: the offset is free to move a layer wherever the
wiggle is cheapest, which no fixed baseline can do.

**Layer boundaries are drawn as hairlines in the fill's own family**, not as a contrasting stroke.
At this layer count the outlines are what separate one band from the next; a black stroke would
turn the plate into a mesh.

## What it does with style

Measured on this record's own `graphic.png` (`routes.pixel.measuredFrom = "graphic.png"`), palette
shape reported as `sequential`:

| role | value | coverage |
| --- | --- | ---: |
| ground | `#FFFFFF` | 55.89 % |
| ramp, light | `#B3BCE4` | 4.56 % |
| ramp, dark | `#52556A` | 4.21 % |
| ramp, dark | `#55596D` | 3.70 % |
| ramp, mid-dark | `#696F89` | 3.25 % |
| ramp, light | `#B1B6DE` | 2.36 % |

**One hue, many values.** Everything on the plate is periwinkle-to-slate: the route calls the shape
`sequential`, and the route is right. There is no categorical palette here at all — layers are told
apart by tone and by outline, which is the same choice the Times made with its gold-to-red ramp and
the opposite of the two UNHCR records' one-hue-per-country. At this many layers, a categorical
palette has nowhere left to go.

**Type on this record is the page's, not the chart's.** `style.type` reports Georgia 16/400 for the
heading, Georgia 12/400 for the abstract and Georgia 12/700 for the bold runs, in `rgb(42,42,42)` and
`rgb(51,51,51)` — a plain academic page. The figure is a raster with no text in it, so the form's own
typography is simply absent from this reference.

**`style.marks` on this record is the wordmark, not the chart.** The three fills it reports —
`rgb(255,116,76)`, `rgb(38,38,40)`, `rgb(109,169,182)` — are the striped `LEE BYRON` logotype at the
top of the page. No claim above rests on them.

## What is transferable

- **Inside-out ordering**: largest layers through the middle, thin ones tapering outward. It is what
  keeps the small series from being crushed against a hard edge.
- **A free offset is allowed to move a layer far from the pack** when that is where its wiggle is
  cheapest; a drawing that refuses this is a stacked area wearing curves.
- **At high layer counts, separate by TONE within one hue** and draw the boundaries as hairlines in
  the same family.
- **And the negative lesson, which is the one this record teaches best**: strip the labels and a
  streamgraph becomes a texture. Nothing on this plate can be turned back into a number.

## What is this piece's own

The academic register — Georgia, a white page, an abstract — and the licence to publish a figure
with no data in it at all, which an editorial piece does not have.

## What was not verified

- **What the figure's data is.** The page does not say what is plotted, over what span, in what
  unit. It may be the author's Last.fm listening history; it is not stated on the page and it is
  not asserted here.
- **The layer count**, which was not counted, and the exact offset algorithm used to draw this
  particular figure — the paper defines several.
- **Whether the hairlines are strokes or gaps.** At 572 px wide the two look identical.
- **Independence from `archive-nytimes-com-…-REVENUE_GRAPHIC`.** Lee Byron is an author of both.
  For counting publications these two records are **one voice** and are not used as two.
