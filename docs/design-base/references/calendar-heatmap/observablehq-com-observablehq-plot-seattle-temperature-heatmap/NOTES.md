# Observable Plot — "Seattle temperature temporal heatmap"

- url: https://observablehq.com/@observablehq/plot-seattle-temperature-heatmap
- archive: search
- type: calendar heatmap, day-of-month × month, **drawn with a rainbow (`turbo`) ramp**
- export: web (the notebook is served in an `<iframe>` 1384 × 926; the chart sits in its upper half,
  with the source code below it)
- readAs: the embedded notebook document. `routes.pixel.measuredFrom` is `graphic.png` and
  `style.typeSource` is `the graphic's own document, in style.graphicFrame` — but **the element
  photographed is the whole notebook, not the chart**, so the pixel palette below carries the
  notebook's white page and its grey code panel as well as the chart. Treated as
  `METHOD.md` correction 15 requires: `measuredFrom: graphic.png` is necessary and not sufficient,
  and the shares are stated with what else was in the frame.

## What it is

Observable Plot's own gallery example: four years of Seattle daily maximum temperature, `Jan`–`Dec`
as twelve rows, `1`–`31` as thirty-one columns, one cell per day-of-month per month, coloured by
temperature. It is a **library's documentation**, not editorial work — eight lines of `Plot.cell`
printed under the picture — and it is filed for what it demonstrates rather than for whose it is.

## What it does with information

**The chart's own caption states the encoding in one line**: `A calendar with a cell for each day
(x) of each month (y), colored by maximum temperature on that day.` Both axes and the colour
channel, named, in the reader's words, with the code words `cell` and `colored` as links to the
relevant docs.

**Four years are stacked into twelve rows without saying so.** Each of the 372 slots holds four
observations (2012–2015), and the grid shows one colour per slot; the picture is legible and the
aggregation is invisible. This is the family's structural hazard on display: a day-of-month × month
grid is not indexed by a real date, so nothing about the layout prevents several years being
collapsed into it.

**No legend.** The gallery page relies on the caption and on the reader knowing what Seattle is like.
For a chart whose whole content is a colour, that leaves the reading unanchored — there is no way to
recover a temperature from a cell.

**The February row runs one cell short** and carries one near-black cell at its right end; the
impossible dates are simply absent rather than drawn. Compare the ONS plate, which paints all six as
white cells with the same stroke as the rest.

## What it does with style

Pixel route on the whole embedded notebook: ground `#FDFEFE` at **87.3 %** — that share is the
notebook page, not the chart, which occupies roughly a sixth of the frame. What matters is not the
shares but the **shape**, and the shape is the finding.

**The measurement itself catches the rainbow.** Four of the five references in this family are filed
`shape: "sequential"`, `ramped: 1`, with exactly **one** hue cluster. This one is filed
`shape: "categorical"`, `ramped: 0`, with **four separate hue clusters** — at hue 190 (0.029 share),
hue 27 (0.020), hue 145 (0.0036) and hue 86 (0.0038). A route with no idea what a calendar is looked
at the pixels and said: this is not an ordered scale, it is a set of categories.

The `graphicFrame.marks` list is the ramp, and it is D3's `turbo`: `rgb(38,191,223)`,
`rgb(40,218,191)`, `rgb(255,133,30)`, `rgb(47,157,245)`, `rgb(57,239,155)`, `rgb(227,70,19)`,
`rgb(255,181,38)`, `rgb(169,246,71)`, `rgb(88,251,121)` — blue through cyan, green, yellow, orange to
red. The type reference for this family names exactly this failure: a ramp that does not move in one
luminance direction end-to-end is unreadable in greyscale and unreliable for a colour-vision-deficient
reader, because both are reading luminance. `turbo` peaks in luminance around yellow and falls again
toward red, so the hottest and the coldest days can sit at the same lightness. Here that is the whole
picture: July's dark reds and January's dark blues are the same luminance, and only hue separates
them.

Type — the notebook's own document: `Source Serif 4 Variable | 34 | 700` for the title,
`Source Serif 4 Variable | 17 | 400` for the caption with links in `rgb(59,95,192)`,
`Inter Variable | 13 | 400 | uppercase` for the `OBSERVABLE PLOT › GALLERY` breadcrumb,
`system-ui | 10 | 400` (34 occurrences) for every axis label on the chart, and
`Spline Sans Mono Variable | 14` for the code. A serif for prose, a monospace for code, a 10 px
system sans for the chart's own furniture — three families with three jobs, and the chart's labels
deliberately the least characterful thing on the page.

## What is transferable

- **State the encoding in a one-line caption naming both axes and the colour channel.** It is the
  cheapest legend substitute and it survives a screenshot.
- **A 10 px neutral system sans for a dense grid's axis labels**, distinct from the prose face, so
  372 cells' worth of furniture recedes.
- **The negative lesson, and it is the strongest thing this record carries**: `turbo` and every other
  rainbow is refused on this family. Not as taste — the harvest's own pixel route classified this
  plate `categorical` and found four hue clusters where the four disciplined references each showed
  one. A ramp that a colour clustering reads as four categories will read as four categories to a
  reader too.
- **Test a candidate ramp by clustering its hues**, not by looking at it. The test is
  `shape: "sequential"` with one cluster.

## What is this publication's own

`Source Serif 4`, `Inter` and `Spline Sans Mono` are Observable's site faces. The `turbo` ramp is
D3's default continuous scheme for `Plot.cell` when no scheme is named — which is to say the failure
above is a **default**, not a choice, and that is the most transferable fact in this note.

## What was not verified

- The chart's palette in isolation. The photographed element is the whole notebook; the ground share
  of 87.3 % is the notebook's page, and no share quoted from `pixel` describes the chart alone. Only
  `shape`, `ramped` and the hue clusters are used above, and those are properties of the colour set
  rather than of the crop.
- Whether the four years are averaged, maxed or last-wins. The code shown uses `Plot.group({fill:
  "max"})`, which is read off the printed source and not from the data.
- Any interactive behaviour; Observable notebooks are live documents and this is one still.
- Whether Observable's own gallery elsewhere shows this chart with a corrected ramp.
- This is a library's documentation, not a newsroom's work. It is filed for what it demonstrates and
  it should not be counted as a desk independently choosing a rainbow.
