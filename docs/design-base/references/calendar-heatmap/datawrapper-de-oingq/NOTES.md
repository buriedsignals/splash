# Datawrapper — "My Year in Music 2022" (Doce Fernandes)

- url: https://www.datawrapper.de/_/oInGQ/
- archive: search
- type: calendar heatmap, **weekday-row × week-column, split into twelve month blocks**
- export: web (the chart's own permalink; the graphic is the `<iframe>`
  `datawrapper.dwcdn.net/oInGQ/6/`, 600 × 584)
- readAs: the chart's own document. `routes.pixel.measuredFrom` is `graphic.png`;
  `style.typeSource` is `the graphic's own document, in style.graphicFrame`, so the type below IS
  this chart's voice.
- provenance: found as an embed in the Datawrapper Weekly Chart post
  `datawrapper.de/blog/my-year-in-music-calendar-heatmap`; harvested at the permalink instead,
  which is `METHOD.md` correction 18's recommendation and removes the blog page's own furniture from
  the measurement.

## What it is

One person's Last.fm listening for 2022, one square per day. The layout is the GitHub-contribution
grid, cut into **twelve separate blocks, one per month**, each headed with the month's name, laid
four across and three down. Within a block, columns are weeks and rows are weekdays; a month starts
on whichever weekday it starts on, which is why each block has a ragged first and last column.

Behind the scenes it is a Datawrapper **scatter plot** with a square symbol per day, positioned by a
precomputed calendar CSV — the tool has no calendar-heatmap type, and the chart is a demonstration
that the layout is data, not a chart type.

## What it does with information

**The month is made visible by cutting the grid, not by drawing a boundary.** A continuous
weekday × week grid has to answer "where does March end", and this chart answers it by never joining
the months in the first place. Twelve small multiples of the same seven-row grid, each labelled once.
The cost is that the week that straddles two months is split; the gain is that no boundary line, no
alternating tint and no month-tick axis is needed at all.

**The absent day is grey, off the ramp, and is allowed to take a whole month.** `#C4C4C4` covers
**5.4 %** of the plate — all of December and scattered days from September on — where the record
simply stops. The chart ships with a month greyed rather than filled at zero, which is the honest
answer and the one the type reference asks for.

**And the grey's lightness sits INSIDE the ramp.** `#C4C4C4` is at lightness 0.769; the ramp runs
`#E6ECB1` 0.809 → `#D9E289` 0.712 → `#A8BD65` 0.569 → `#789943` 0.432 → `#487722` 0.300 →
`#195501` 0.169. So the no-data state is separated from a real low value by **hue alone**
(achromatic against yellow-green), not by lightness. In greyscale, or for a reader who reads
luminance, December would fall between the two palest greens. That is a real limit of this solution
and it is not signalled anywhere on the plate.

**No legend.** The subtitle carries the whole key in one sentence: `A calendar heatmap of my
listening habits in 2022. The darker the square, the more songs I played on that day, normalized to a
0-5 scale. Hover to see the numbers and my top tracks.` Direction of the ramp, the scale's range, and
where the exact numbers live — three facts, no swatches. The chart is a personal piece and can afford
to spend the reading on hover; a chart that must be read as a still could not.

**The source line names three things**: `Chart: Doce Fernandes • Source: Last.fm • Get the data •
Created with Datawrapper`, with `Get the data` as a live link. Author, source, data, tool.

## What it does with style

Pixel route on the chart's own element: ground `#FFFFFF` at **68.0 %** — a twelve-block calendar
leaves most of the frame to the page, the opposite of the single-grid layouts in this family. The
ramp is six yellow-greens: `#E6ECB1` 0.46 %, `#D9E289` **10.58 %**, `#A8BD65` 3.99 %, `#789943`
3.79 %, `#487722` 1.30 %, `#195501` 0.56 %. Heavily bottom-weighted: most days are a light day.
`shape: "sequential"`, `ramped: 1`, one hue cluster at hue 66.

Contrast against its own white ground, computed from the record's hexes: `#E6ECB1` **1.24 : 1**,
`#D9E289` 1.38, `#A8BD65` 2.07, `#789943` 3.26, `#487722` 5.33, `#195501` 8.97. As on every
white-ground plate in this family the ramp's bottom is invisible against the page; here it is the
gutter between squares, and the squares' own regularity, that make a pale cell a cell.

Type — the graphic's own: `Roboto` throughout. `22 / 700` black for the title, `15 / 400` in
`rgb(24,24,24)` for the standfirst, `13 / 400` in the same ink for the twelve month names, `13 / 400
italic` in `rgb(101,101,101)` for the note, `11 / 400` in `rgb(136,136,136)` with links in
`rgb(0,136,204)` for the source line. Five roles, one family, three greys — the furniture gets
lighter as it gets less important, and the month names sit at the same size as the note but not
italic.

`graphicFrame.marks` is **empty**: the cells are drawn to a `<canvas>` or as unlabelled shapes the
style route cannot enumerate, which is why the ramp above is read from pixels only.

## What is transferable

- **Cut the year into twelve month blocks and label each once**, instead of drawing month boundaries
  across a continuous weekday grid. It removes a whole class of furniture.
- **A no-data state drawn in a neutral outside the ramp**, and the willingness to ship a whole empty
  month rather than fill it with zeros.
- **Put the key in the subtitle when the ramp is one hue**: direction, range, and where the exact
  numbers are. Three clauses replace a legend.
- **A source line that names author, source, data and tool** — four attributions on one 11 px line.
- **The counter-lesson this plate teaches against itself**: separate "no data" from "low value" by
  LIGHTNESS as well as hue, or say in words that grey means no data. Hue alone does not survive
  greyscale.

## What is this publication's own

`Roboto` and the Datawrapper chart furniture; the Last.fm data; the yellow-green ramp, which is one
of Datawrapper's own sequential palettes.

## What was not verified

- The hover state, which the subtitle says carries the exact counts and top tracks. The record is one
  still.
- Why the data stops in the autumn — whether December is missing data or a deliberate cut-off. The
  plate does not say, and this note does not guess.
- The blog post around the chart (`datawrapper.de/blog/my-year-in-music-calendar-heatmap`) was read
  to find the permalink and to confirm the technique; nothing in this note is measured from it.
- Whether the six greens are six classes or a continuous scale quantised to six. The 0–5 normalisation
  named in the subtitle suggests six classes and does not prove it.
- Any mobile version. A second embed id (`MMu4E`) exists on the blog page and was not harvested.
