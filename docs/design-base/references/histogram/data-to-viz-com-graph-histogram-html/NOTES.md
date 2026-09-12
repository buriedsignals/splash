# From Data to Viz — *Histogram* (Airbnb night prices, southern France)

`https://www.data-to-viz.com/graph/histogram.html` · harvested 2026-09-08 · archive recorded as
`url-list` (found by search, not drawn from the url list file).

## What it is

A **real histogram**, and the artifact read is the chart. The record's graphic is an `img`
672 × 480 at `documentTop` 745, `nearTheTop: true`, `routes.pixel.measuredFrom: "graphic.png"`.
The plate is titled *Night price distribution of Airbnb appartements* and shows ~30 bars over a
price axis running 0 to 300 with a `count` axis 0 to ~875. The page's own prose states the bin
width: "Price range is divided per 10 euros interval."

It is a chart-type reference site (Yan Holtz's data-to-viz.com, the companion to the R Graph
Gallery), and the plate is an **R/ggplot2 rendering** with that engine's grey-panel default
suppressed to white. So this is a code gallery's worked example, not a newsroom's designed
graphic. It is filed for what it does with the *form*, and the note says so rather than dressing it
up as editorial work.

## What it does with information

- The x-axis is the variable in its own unit (euros per night), 0 → 300, labelled `price` at the
  axis's far right rather than centred. Ticks at `0 100 200 300`: round numbers of the *variable*,
  which do **not** coincide with the 10-euro bin edges. The bins are visible; their edges are not
  markable off the axis.
- The count axis starts at zero (`0 250 500 750`) and is named `count`, lower case, at the top
  left, tiny.
- **No central-tendency mark of any kind.** No mean, no median, no rule, no annotation. The plate
  states the distribution and nothing else — and this distribution has plenty to say: a hard peak
  at 50–90 €, a right tail to 300, and conspicuous spikes at 170 and 220 that a round-number
  pricing habit would explain and that the plate does not comment on.
- Roughly 30 bins over the range — three times the type sheet's "about ten" default, and still well
  under its ceiling of fifty. The extra resolution is what makes the round-number spikes visible at
  all, which is the argument *for* a narrow bin, stated by the picture rather than in words.

## What it does with style

Measured on `graphic.png`:

| role | measured |
| --- | --- |
| ground | `#FFFFFF` at 80.02 % |
| bar fill | `#7ABAAC` at 13.202 %, with `#83BEB1`, `#8AC1B5`, `#76B7A9` as its antialiased edges |
| ink | `#000000` at 0.604 % |
| gridlines | `#EBECED` 1.607 %, `#F2F3F3` 0.517 %, `#E2E2E2` 0.502 % |
| palette shape | `monochrome`, one cluster at hue 167 |

**One colour, and it is the bars'.** The pixel route classifies the whole plate as `monochrome`:
there is no second hue anywhere on it. The gridlines are three near-white greys within two percent
of the page — present, and almost invisible.

Bars are separated by a hairline, measured: at row y = 360 the runs of `#7ABAAC` are
`139-154 156-171 173-187 189-204 …` — 14–15 px bars with a **1–2 px gap**. They do not touch.

The bar fill `#7ABAAC` and the site's own link/heading colour `rgb(105, 179, 162)` (in
`style.type`, on `Montserrat | 12 | 500 | uppercase` and `Montserrat | 18.2 | 400`) are close but
not the same value; nothing in the record establishes that one was derived from the other, and this
note does not claim it.

Page type is the publisher's furniture, not the graphic's: `Montserrat` for headings
(`Montserrat | 34 | 400` sample "Definition"; `Montserrat | 28 | 500 | trk 4 | uppercase` sample
"Histogram") over `Source Sans Pro` for the site chrome. The plate is a raster `img` and carries no
`graphicFrame`, so its own axis lettering was read by neither route.

## What is transferable

- **A distribution can be argued with resolution instead of annotation.** Thirty bins where ten
  would do, and no marks at all — the round-number price spikes are the finding, and they are
  legible only because the bin is narrow. This is the type sheet's bin-width warning working in the
  useful direction.
- **A monochrome plate is a defensible whole for this form.** One fill, black ink, near-white
  gridlines: the pixel route finds no second hue and the chart is still complete. A histogram of one
  variable has nothing to distinguish by colour, so colour has no job here.
- **Gridlines at two percent of the page.** `#EBECED` / `#F2F3F3` / `#E2E2E2` against `#FFFFFF`
  — present enough to carry the eye across to the count axis, faint enough that the bars are never
  read against them.
- The count axis is named in a **word**, `count`, at the axis rather than in a title.

## What was not verified

- **The graphic's own type.** Raster `img`, no `graphicFrame`; every tuple in the record is the
  surrounding page.
- **That the bins really are 10 € wide.** The page's prose says so; the plate's axis ticks are at
  100 € and cannot confirm it, and the record measures pixels, not data.
- **Whether the spikes at 170 and 220 are real or a binning artifact.** Nothing on the plate or in
  the record settles it, and this note deliberately reads them as "conspicuous" rather than as a
  finding.
- **The design authorship.** This is a ggplot2 default palette-shifted, on an educational site. It
  is not a desk's house style and must not be read as one.
