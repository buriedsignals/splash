# UNHCR Dataviz Platform — *Evolution of people of concern to UNHCR | 1991–2020*

- url: https://gds-odsss.github.io/unhcr-dataviz-platform/tools/d3/d3_streamgraph.html
- archive: url-list
- type: streamgraph — six categories, centred (silhouette) offset
- export: static (inline SVG on a documentation page)
- readAs: the encoding as the page draws it, at rest
- artifact actually read: the page's own 546 × 425 inline `svg` (`style.graphic` = `svg`,
  `documentTop` 478, `nearTheTop` true), which is the chart itself and not the page's chrome.

## What it is

Six categories of people of concern to UNHCR — refugees, asylum-seekers, IDPs, stateless persons,
others of concern, and Venezuelans displaced abroad — from 1991 to 2020, stacked with a centred
offset so the whole stack grows outward from a floating middle. It sits on UNHCR's own dataviz
platform, in the section that shows how the agency draws each chart type in D3, over real Refugee
Data Finder numbers and under the agency's own credit line.

**It is a streamgraph on the baseline test**: nothing is pinned to zero, the stack thickens
symmetrically about a moving centre, and the visible growth from ~1991 to 2020 is read as total
thickness.

## What it does with information

**A key above the chart, six entries, two rows, swatch then name.** With no in-band labels anywhere,
the key is doing the whole naming job — and it is placed above the plate rather than beside it, so
the reader meets the vocabulary before the shape.

**The unit is named in a subhead, not on the axis**: `Number of people (millions)`, grey, small, sat
between the key and the plot. The chart names its quantity in words first.

**And then it keeps a y-axis anyway, and the axis is wrong.** The scale runs
`60M · 40M · 20M · 0 · −20M · −40M · −60M`. Those negative labels are an artefact of the centring
offset; there has never been a negative person of concern. A reader who trusts the axis will read
the bottom half of the chart as a deficit. **This is the clearest evidence in the whole family for
why the form drops its value axis**: the two references that dropped it (Ferdio #42, the Times) lose
nothing, and this one, which kept it, prints six labels of which five cannot be true.

**Vertical gridlines only.** Faint verticals at 1990/1995/2000/2005/2010/2015/2020 and nothing
horizontal — consistent with a chart where the horizontal position means something and the vertical
does not.

**A source and a rights line sit under the plate**, two lines of 8 px grey:
`Source: UNHCR Refugee Data Finder` / `©UNHCR, The UN Refugee Agency`.

## What it does with style

Measured on this record's own `graphic.png` (`routes.pixel.measuredFrom = "graphic.png"`), palette
shape reported as `diverging`:

| role | value | coverage |
| --- | --- | ---: |
| ground | `#FFFFFF` | 82.27 % |
| IDPs | `#00B398` | 5.42 % |
| refugees | `#0072BC` | 4.43 % |
| stateless persons | `#E1CC0D` | 0.75 % |
| asylum-seekers | `#18375F` | 0.44 % |
| Venezuelans displaced abroad | `#EF4A60` | 0.21 % |
| others of concern | grey, reported as neutral `#9A9A9A` at 0.76 % | |

The six fills are confirmed independently by the style route's `marks`, which reads them off the SVG
itself: `rgb(0,114,188)`, `rgb(24,55,95)`, `rgb(0,179,152)`, `rgb(225,204,13)`, `rgb(153,153,153)`,
`rgb(239,74,96)`, with a single `stroke rgb(51,51,51)` for the axis. **Both routes name the same six
colours**, which is the state a record should be in and rarely is.

**One category is deliberately grey.** "Others of concern" — the residual bucket — is the only band
with no hue. Colour is spent on the categories that have a name worth carrying and withheld from
the one that does not.

**Furniture is a near-white and a grey**: `#F4F4F4` 1.17 %, `#E3E3E3` 0.35 %, `#ECECEC` 0.25 % for
the gridlines and page rules, `#333333` 0.29 % and `#222222` 0.18 % for the axis and its labels.

Type, from `style.type` on this document (the graphic is inline SVG, so the document IS the
graphic's document): the chart's own tick labels are **`lato` 10/400 in `rgb(34,34,34)`**, 20 of
them, sample `1990`; the source and rights lines are **`lato` 8/400**, same ink. Around them sits the
platform's furniture — `Lato` 32/700 and 28/700 for the page titles, `Lato` 16/400 for the nav,
`Source Code Pro` 14.4 for the code samples the page also publishes. **The chart speaks the same
typeface as its host at a much smaller size**, which is what a house style guide looks like from the
inside.

## What is transferable

- **Name the unit in a subhead above the plate** (`Number of people (millions)`) instead of leaning
  on an axis title.
- **Give the residual category no hue.** Grey for "other" reserves colour for the things that are
  actually being argued about.
- **Vertical gridlines only**, when the vertical position carries nothing.
- **The counter-example, which is the strongest thing this record carries: do not keep a value axis
  over a centred offset.** It will print negative labels for a quantity that cannot be negative.

## What is this piece's own

UNHCR's brand palette (`#0072BC`, `#18375F`, `#00B398`, `#E1CC0D`, `#EF4A60`) and Lato; and the
documentation register — this is a chart published to show how the agency draws a chart, which
constrains it toward the plainest possible reading of the form.

## What was not verified

- **Whether the piece is editorial or a template.** It sits under `/tools/d3/` on a dataviz-platform
  site and reads as a reference implementation. It carries real data and a real credit line, but no
  headline, no takeaway and no annotation — so nothing here should be read as an editorial choice
  made for a story.
- **Whether the negative axis labels are deliberate.** They are stated above as a defect; it is
  possible they are shown knowingly, as a demonstration of what the offset does.
- **The offset used.** Symmetry about zero is consistent with `stackOffsetSilhouette`; the record
  does not name it.
- **Independence from `unhcr-github-io-dataviz-streamgraph-explorer`.** Different host, same
  publisher. These two records are **one publication** and are not counted as two.
