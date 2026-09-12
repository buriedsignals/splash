# Datawrapper — "Democrats won the popular vote in seven of the last eight U.S. presidential elections"

- url: https://www.datawrapper.de/_/xFO0J/
- archive: search (the chart's own published permalink, reached from Datawrapper Academy's
  `examples-of-datawrapper-bar-charts` gallery; **not** a line of
  `~/Downloads/infoviz-source-urls-alive.txt`, which carries none of this form)
- readAs: the published chart page at 1440×900. `style.graphic.tag` is **`iframe`** at
  `documentTop: 219`, `nearTheTop: true`, frame `https://datawrapper.dwcdn.net/xFO0J/1/`;
  `routes.pixel.measuredFrom: "graphic.png"`. **The graphic's type is `style.graphicFrame.type`**
  (`style.typeSource` says so); `style.type` would be datawrapper.de's own page furniture.

## What it is

Eight U.S. presidential elections since 1992, one row each, drawn as the **popular-vote margin**:
the winner's lead over the runner-up, signed by which party won it. Seven bars run right, one — 2004,
George W. Bush over John Kerry — runs left. A single signed series about one zero.

## What it does with information

**The zero line is drawn on top of everything and it is not in the middle.** Only one of eight
values is negative, so the axis is asymmetric: measured off `graphic.png`, the rule stands at
x = 282 of 602 — **47 % across** — and the plate gives the negative side just enough room for the one
bar that needs it. The centre is where the data puts it, not where the frame's symmetry would.

**No axis ticks at all. One directional caption instead.** Above the plot, at the top of the
positive side: `More votes for the Democratic candidate`. The reader is told what the direction
MEANS rather than what each gridline is worth, and every magnitude is then stated as a label.

**The sign is encoded twice, in two different colour systems.** The bar carries it as fill and
direction — `#2B668C` at 10.698 % for the seven Democratic margins, `#D04F37` at 0.780 % for the one
Republican one. The row's own label repeats it in **darker, more saturated text colours**:
`2020: Joe Biden` in `rgb(0, 104, 144)`, `2004: George W. Bush` in `rgb(225, 66, 43)`
(`graphicFrame.type`, Roboto 13/700, eight runs). Two hues for the marks, two matched but distinct
hues for the type — chosen, visibly, so the text passes contrast where the fill would not.

**The value label flips side when the bar runs out of room.** `4.5 %`, `2.1 %`, `8.5 %` sit
**inside** the bar in white at its growing end; `0.5 %` — the 2000 Bush–Gore margin, the shortest bar
on the plate — sits **outside** it in dark ink. One rule, applied per row, and no label is ever
painted on a fill too short to hold it.

**Rows are in reverse chronological order, and are NOT sorted by value.** 2020 at the top down to
1992 at the bottom. The category here is time, and time wins over magnitude.

**One annotation, in ink, in the empty half of the plate.** `In 2016 and 2000, Republicans won the
Electoral College but lost the popular vote.` — placed in the whitespace to the right of the single
red bar, saying the thing the geometry structurally cannot: that the sign of this chart is not the
sign of the election result.

## What it does with style

Ground `#FFFFFF` at 61.365 %; palette read as **diverging**. The second-largest area on the plate is
`#F3F3F3` at 16.626 % — a full-width row track behind every bar, on **both** sides of the zero, which
is what makes the centre legible without a drawn axis. Furniture: `#000000` 1.366 %, `#181818`
0.919 %, `#D9D9D9` 0.925 %, `#ECECEC` 0.334 %. Chromatic tail is antialiasing plus Datawrapper's
link blue `#0289CC` at 0.032 % in the source line.

Type (from `graphicFrame`, `https://datawrapper.dwcdn.net/xFO0J/1/`): Roboto 22/700 title, 15/400
subtitle, 13/700 row headline ×8 in the party colours, 13/400 sub-line and value labels ×17, 12/400
for the directional caption, 11/400 source in `rgb(136, 136, 136)`.

**The title states the finding and the subtitle states the measure.** "Democrats won the popular vote
in seven of the last eight" is the count a reader could do from the bars; "Margin between the votes
received by the top two candid[ates]" is what a bar's length is. Neither sentence is a description
of the chart.

## What is transferable

- **Put the zero where the data puts it.** An asymmetric domain gets an asymmetric plate; centring a
  zero that only one value crosses wastes half the picture.
- **Caption the DIRECTION instead of ticking the axis** when every magnitude is already labelled.
- **Encode the sign in the row's label colour as well as the bar's**, and darken the text version so
  it is readable as type.
- **Flip the value label outside the bar when the bar is too short to hold it**, keeping one
  in/out rule rather than one position.
- **Let time order beat value order** when the categories are dates.
- **Put the annotation in the empty half.** A diverging bar with a lopsided domain always has one.

## What was not verified

The margins were not checked against the Wikipedia source the chart cites. Hover, tooltip and the
chart's mobile layout were not read; the reading is of a single 1440×900 capture. Whether the row
label colours were chosen for contrast or inherited from a Datawrapper theme was not established —
the difference between `#2B668C` and `rgb(0, 104, 144)` is visible in the record, its reason is not.
One publication.
