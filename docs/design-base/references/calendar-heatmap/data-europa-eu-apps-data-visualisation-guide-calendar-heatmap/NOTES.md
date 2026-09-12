# Via Velox (Hochschule Mannheim) — cycling-trajectory calendar, as republished in the EU Data Visualisation Guide

- url: https://data.europa.eu/apps/data-visualisation-guide/calendar-heatmap
- archive: search
- type: calendar heatmap, **week-row × weekday-column, with marginal histograms on two edges**
- export: web (a static raster, `img 768 × 726`, at `documentTop` 1192)
- readAs: the graphic itself, photographed as the element (`graphic.png`).
  `routes.pixel.measuredFrom` is `graphic.png`. **`style.typeSource` is `the page only — the graphic
  is a raster and carries no type this route can read`**, so nothing below is the graphic's
  typographic voice; the page's `Helvetica` is the European Commission's guide furniture.

## The publication this record really belongs to, and why it counts once

The plate is **not** the EU's. `data.europa.eu`'s calendar-heatmap page reproduces three graphics it
did not make, each credited: a New York daily-maximum-temperature calendar by **Maarten Lambrechts**
made with RAWGraphs, and two plates sourced to **`infovis-mannheim.de/viavelox`** — an
interdisciplinary student research project at Hochschule Mannheim visualising GPS-tracked bike rides.
The graphic this record measures is the second of those, `viavelox-calendar-heatmap-1.png`.

So this record's **design author is Via Velox, and `data.europa.eu` is a re-publisher.** The
proposal counts it once, as Via Velox — the exact host-is-a-proxy failure the brief warns about, and
it is recorded here rather than left to be inferred from the url.

`infovis-mannheim.de/viavelox` was harvested separately and the record was **deleted**: the largest
graphic on the author's own page is the same plate inside a browser-window mock-up beside a map, so
its pixel reading is of a composite screenshot, not of the calendar. The EU guide's crop is the
cleaner measurement of the same design.

## What it is

A year of cycling trajectories in Mannheim, one cell per day, for a year selected by the `2016` /
`2017` tabs in the live tool. **Rows are weeks — 52 of them, running down the plate — and columns are
the seven weekdays**, `Mo Di Mi Do Fr Sa So`. This is the transpose of the GitHub-contribution
layout: the year runs vertically, the week runs horizontally.

## What it does with information

**The month boundary is drawn as a staircase.** Because weeks are rows and weekdays are columns, the
first of a month falls at an arbitrary column, so a month's edge is a step function across the grid.
The plate draws it: a dark navy line that runs along a row, drops a row at the month change, and
continues. It is the direct alternative to Datawrapper's "cut the year into twelve blocks" — one
continuous grid, with the calendar's irregularity made explicit as a line rather than designed away.

**The vertical axis labels the month AND the week number together** — `Jan 01`, `Feb 05`, `Mär 10`,
`Apr 15`, … `Dez 50` — one label every five weeks, with a dotted leader carrying the eye between
labels. Two calendar units in one axis, at a fifth of the density a per-week axis would need.

**Two marginal histograms turn the grid into three charts.** A bar chart of weekly totals runs down
the right edge, aligned row-for-row with the calendar, with its own axis (`500`, `1,000`); a bar
chart of weekday totals runs along the bottom, aligned column-for-column, with its own axis
(`5,000`). The cell grid gives the pattern, the margins give the two aggregates, and nothing is
repeated. The weekday marginal is what makes the weekend visible as a fact rather than an impression.

**One annotation, and it is a bracket.** A square bracket down the right of the weekly histogram
spans roughly April to September, labelled in italic `higher amount of trajectories in
spring/summer months`. The seasonal claim is attached to the marginal bar chart — the view that
actually shows the magnitude — not to the calendar grid, and it is the only text on the plate that
argues anything.

**A toggle sits at the top-left of the axis** (`KW`, a switch) — the week-number labelling is a
reader option, which is why the axis can carry two units without committing to either.

## What it does with style

Pixel route on the graphic: ground `#16334E`, a dark navy, at **67.3 %** — the only dark-canvas
plate in this family's corpus. The ramp runs the other way from the light-ground references: the
cells are near-white at the low end and saturate toward blue at the high end. Measured:
`#EBEBEB` 5.00 %, `#CED6DC` 2.98 %, `#B3C4CE` 2.05 %, `#96B0C0` 1.27 %, `#5D89A2` 0.84 %,
`#226492` **3.91 %** — the last being the marginal bars' own blue as well as the top of the cell
ramp. `shape: "sequential"`, `ramped: 1`, one hue cluster at hue 205.

**The dark-canvas trap, measured — and it is the opposite end from the one the type reference
predicts.** Against this plate's own `#16334E` ground: `#EBEBEB` **10.89 : 1**, `#CED6DC` 8.83,
`#B3C4CE` 7.24, `#96B0C0` 5.73, `#5D89A2` 3.44, `#226492` **2.04**. The low end of this ramp is the
*brightest* thing on the plate and is never at risk; it is the **high** end — the saturated blue that
carries the busiest cycling weeks — that closes to 2.04 : 1 against the background. On a dark canvas
the vanishing end is whichever end was aimed at the canvas, and this design aimed the top of its
ramp there.

Type: **not readable from this graphic**. It is a raster. The record's `style.type` is
`data.europa.eu`'s own `Helvetica` guide furniture with the EU's magenta `rgb(219,0,77)` for links,
and describes the page, not the chart. What can be said from the picture alone is that the plate uses
one sans throughout and reserves **italic for the single annotation**.

## What is transferable

- **Transpose the calendar when the year is the story and the week is the texture** — weeks down,
  weekdays across. It fits a portrait frame, which the standard 53 × 7 landscape grid does not.
- **Draw the month boundary as a staircase** over a continuous weekday grid. One line does what
  twelve separate blocks otherwise do.
- **Label a long calendar axis with two units at once** (`Feb 05` = month and week number), every
  fifth row, with dotted leaders between.
- **Put the aggregates in the margins, aligned to the grid**: a bar per row on one edge, a bar per
  column on the other. Two extra readings for no extra grid.
- **Attach the seasonal annotation to the marginal chart, not to the cells**, and bracket the span it
  covers rather than pointing at one cell.
- **On a dark ground, measure the END OF THE RAMP THAT POINTS AT THE GROUND**, whichever end that is.
  Here it is the top, at 2.04 : 1.

## What is this publication's own

The navy `#16334E` and the German weekday abbreviations belong to Via Velox; the `Helvetica` and the
magenta belong to `data.europa.eu` and appear nowhere in the graphic.

## What was not verified

- **The colour legend.** The live tool carries a stepped key reading roughly `≤6 ≤7 ≤14 ≤22 ≤29 ≤43
  ≤51 ≤100 Fahrer` beneath the calendar; it is **cropped out of the plate this record measures** and
  was seen only in the deleted `infovis-mannheim.de` screenshot. Nothing in this record measures it,
  and the claim that this design carries a binned legend is therefore NOT evidenced here.
- The graphic's typeface, size and weight. It is a raster; no claim above names one.
- The live tool itself: the `2016` / `2017` tabs, the `KW` toggle, brushing between the map and the
  calendar. The record is one still of one state.
- Which year the plate shows. The tabs are visible in the deleted screenshot; the EU crop does not
  include them.
- Whether the staircase line marks months or something else. It steps roughly twelve times over the
  year, which is consistent with months and is not proof.
- The first graphic on the same guide page — the New York temperature calendar by Maarten
  Lambrechts — was NOT the element the picker chose and is not measured by this record.
