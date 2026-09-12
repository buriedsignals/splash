# Datawrapper Academy — *How to read a histogram, min, max, median & mean*

`https://www.datawrapper.de/academy/histogram-min-max-median-mean` · harvested 2026-09-08 ·
archive recorded as `url-list` (see the proposal: it was found by search, not drawn from the url
list file).

## What it is

A **real histogram**, and the artifact read was the chart itself, not a promotional card or a
`<meta>` image. The record's graphic is an `img` 640 × 350 at `documentTop` 1213, `nearTheTop:
true`, and `routes.pixel.measuredFrom` is `graphic.png`. What is in that frame: a plate titled
*Value distribution (histogram)*, ten grey bars over a `0.0 – 1.0` axis, and a single caption row
under the axis reading `Min: 0.0   Max: 1.0   Mean: 0.5   Median: 0.6`.

It is the panel Datawrapper's own data editor opens when a numeric column is selected — that is,
tool documentation showing the tool's own histogram, not a piece of journalism. The consent dialog
was dismissed by the harvester (`consent: button "Accept all"`), so this is a page in a state the
harvester put it in.

## What it does with information

- The x-axis **is the variable**, in its own units, `0.0` to `1.0`, with ticks at `0.0 0.2 0.4 0.6
  0.8 1.0` — bin *edges*, never bin index. Ten bins across the range, which is exactly the
  "about ten roughly-round bins" default the type sheet gives.
- The count axis is **not drawn at all**. There is no y-axis, no gridline, no tick, no number: bar
  height is left as pure relative length against a shared baseline. The plate spends its numeric
  furniture on the *summary statistics* instead of on the counts.
- Those four statistics are **lifted off the plot** and set in a row beneath the axis, as
  `label: value` pairs. Nothing is drawn across the bars — no median rule, no mean marker. This is
  the opposite of the tree's own `chart-beat/references/types/histogram.md`, which says to mark
  central tendency "with its own line and label".
- The one editorial word on the plate is the title, which names the form to the reader:
  *Value distribution (histogram)*.

## What it does with style

Measured on `graphic.png` (`routes.pixel.measuredFrom: "graphic.png"`):

| role | measured |
| --- | --- |
| ground | `#F9FAF9` at 74.40 % |
| bar fill | `#CDCECD` at 17.38 % — filed by the pixel route as a **neutral**, not a chromatic |
| axis ink | `#020302` at 0.806 % |
| the one accent | `#2C81AA` at 0.086 %, with `#3385AC`, `#2A7FA9`, `#4B94B6` trailing it |
| palette shape | `sequential`, one cluster at hue 199 |

The arithmetic is the point: **the bars are 200× the accent's coverage and carry none of its
colour.** All the chroma on the plate — 0.086 % of it — is spent on the four numbers under the
axis. The distribution is grey; the reading of it is blue.

Bars are separated by a hairline. Measured on the pixels at row y = 193, the runs of `#CDCECD` are
`34-89 91-145 147-202 203-258 …` — bars 54–55 px wide with a **1–2 px gap** between them. They do
not touch.

Type is the publisher's page furniture, not the graphic's: the record's `style.type` is Roboto
throughout (`Roboto | 32 | 700` for the article title, `Roboto | 24 | 700` sample
`"Value distribution (histogram)"`, `Roboto | 16 | 400` × 55 for body), with `Bitter | 20 | 400`
for the "Academy" wordmark. The graphic is a raster `img`, so it carries no `graphicFrame` and its
own lettering was **not** read by any route.

## What is transferable

- **A histogram can spend all of its colour on the statistics and none on the distribution.** The
  bars are the subject and are drawn in a neutral; the accent goes to the four numbers that read
  it. Measured, not inferred: bar `#CDCECD` at 17.38 % neutral against accent `#2C81AA` at 0.086 %.
- **Summary statistics can live in a caption row rather than as rules across the plot.** This
  sidesteps the whole problem the tree's own histogram amendment was written for — a median rule
  running the height of the plot spends most of its length inside the tallest bar and cannot be
  inked to read against both the page and that bar. Datawrapper never has that problem because it
  never draws the rule.
- **The count axis can be dropped entirely** when the question is shape rather than magnitude.
- **Bin edges on the axis, in the variable's own unit.** Ticks land on bin boundaries.

## What was not verified

- **The graphic's own type.** The plate is a raster `img`; every tuple in `style.type` is the
  Datawrapper Academy article around it. Nothing in this record says what typeface the axis
  numbers or the `Min:` labels are set in.
- **Whether the plate is animated.** It is a 640 × 350 raster served in an explainer about reading
  a histogram, and `graphic.png` is one moment of it. `METHOD.md` correction 5 applies: if this is a
  loop, the frame photographed is one state of it and the record cannot say which.
- **The counts.** With no y-axis there is no way to check the bar heights against anything.
- **Independence of design authorship.** This is a tool vendor documenting its own default
  rendering. It is evidence of what one chart engine does, which is not the same as evidence of
  what a newsroom decided.
- The page was read **after a consent dialog was dismissed** (`"Accept all"`); nothing suggests
  that changed the plate, and nothing verifies that it did not.
