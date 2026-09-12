# IEA — total oil stocks, two blues in every group, and a unit written where the axis begins

- url: https://www.iea.org/data-and-statistics/charts/iea-total-oil-stocks-may-2026
- archive: search
- type: grouped column chart — 2 series × 3 categories (IEA North America, IEA Asia Pacific,
  IEA Europe)
- export: live SVG, 1162 × 500, at `documentTop` 473, `nearTheTop: true`
- readAs: `graphic.png`, the chart's own SVG plot, plus `screenshot.png` for the page furniture.
  Both routes `ok`; `routes.pixel.measuredFrom === "graphic.png"`. `style.typeSource` is **"the
  page, which contains the graphic — the two are not separated"** — and on this page that is a weak
  claim: the IEA chart page carries a full masthead *and* several other charts, so `style.marks`
  (32 fills of `rgb(62,122,211)`, 30 of `rgb(255,117,75)`, 28 of `rgb(177,135,239)` …) is a
  page-wide tally and mostly belongs to other figures. Only `fill rgb(73, 211, 255)` × 14 matches
  this chart. `consent: null`.

## What it is

An IEA chart-library permalink: government and industry oil stocks held in three IEA regions, as
three groups of two columns.

## What it does with information

**The unit is written above the axis, not on it.** `million barrels` sits in small grey type at the
top-left, above the first tick, running horizontally. No rotated axis title, no unit repeated on
every tick label. The reader meets the unit before the first number, in the direction they read.

**Groups are separated on the axis line itself.** The baseline is drawn as a rule with short
vertical ticks at the group boundaries, so the group structure is stated by the axis rather than
inferred from the whitespace. The within-group gap is roughly a third of a bar; the between-group
gap is about two bars plus a tick.

**No value labels.** The chart is read entirely off gridlines at `0 / 250 / … / 1750`, drawn in a
very light grey that stops at the plot's right edge. That is a defensible choice at three groups of
two, and it is the opposite of every Ferdio plate in this family.

**Every bar carries a 1 px black outline.** On a grouped bar that is not decoration: it is what
separates two touching bars whose fills are close in hue, and it is doing real work here (see
below). It also gives the shortest bars a visible presence at 1–2 px of height.

## What it does with style

**Pixel route (`graphic.png`).** Ground `#FFFFFF` at **86.247 %**. Chromatic `#49D3FF` at
**8.236 %** (195°) and `#0044FF` at **3.459 %** (224°); neutrals `#E6E6E6` **1.173 %** (gridlines),
`#000000` **0.202 %** (bar outlines and the axis rule), `#848484` 0.023 %. Palette shape reported
**sequential**, one cluster at 195° (12.056 %, **6 members**).

**That "sequential, one cluster" is the finding.** The two series are 29° apart — a saturated
electric blue `#0044FF` and a light cyan `#49D3FF` — and the palette reader groups them as one hue
family. A reader is being asked to tell two members of the same family apart, adjacent, in every
group, with no other cue: no value labels, no in-bar text, and a legend that sits below the plot,
outside the 1440 × 900 viewport and therefore unread here. This is exactly the adjacency case the
family's own guidance warns about, done with two cools instead of two warms, and the black outline
is what keeps the boundary visible at all.

**Type.** `Graphik` throughout the page. The only tuple attributable to this chart's furniture is
`Graphik 12 / 400`, sampled as `million barrels`, in `rgb(111,111,111)` and black — the unit line
and the tick labels are the same tuple. The page headline `IEA total oil stocks, May 2026` is
`Graphik 46 / 700`, but that is the *page's* `h1`, not the chart's own title: the chart carries no
title inside its own frame.

## What is transferable

- **Write the unit horizontally above the axis, at its head**, instead of rotating an axis title.
- **Tick the baseline at group boundaries.** The axis states the grouping rather than leaving it to
  gap width.
- **Outline the bars when two series sit adjacent in a close hue pair.** It is the cheapest repair
  for a palette that should have been chosen differently.

## What is NOT transferable, and is the lesson

**Two series 29° apart, adjacent, with no labels and the legend out of view.** Everything else on
this plate is competent; the series pair is the failure, and it is the failure the grouped-bar type
is specifically prone to. The corrective is not a heavier outline — it is a second hue from a
different family, or the ONS answer: one chromatic series and one neutral.

## What is this piece's own

IEA's `#0044FF` brand blue and the IEA regional groupings.

## What was not verified

**The legend.** It sits below the plot and outside the 1440 × 900 capture, so which series is
`#0044FF` and which is `#49D3FF` was never read — the note above deliberately does not name them.
Whether the chart has a source or note line beneath the legend. The interactive behaviour of the
Highcharts figure (read at rest). `style.marks` is page-wide and was not used to describe this
chart.

## A note for the method, on the archive

`METHOD.md` correction 18 filed `iea.org/data-and-statistics/charts?type=<t>` as a second
form-indexed archive. For this family it very nearly is not one: `type=` selects **orientation**
(`column` = vertical, `bar` = horizontal), not grouped-versus-stacked. Of the 24 charts on page 1 of
`?type=column` and `?type=bar`, **20 declared `data-chart-stacking="normal"` or `"percent"`** and
were stacked. The four that declared `data-chart-stacking=""` were harvested and three of them
turned out to be single-series. This one is the only grouped chart in 24. `data-chart-stacking` is
readable from the chart page's HTML without a browser and is the right filter for a future wave —
but note that fetching eight listing pages in parallel tripped a Cloudflare interstitial, and a
1.5 s-spaced sequential loop did not.
