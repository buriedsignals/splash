# UNHCR — *Dataviz StreamGraph Explorer*, "Evolution of persons of concern over time"

- url: https://unhcr.github.io/dataviz-streamgraph-explorer/
- archive: url-list
- type: streamgraph — two mirrored stacks, ~20+ bands each, sharing one time axis
- export: web (interactive; read at rest, in its default state)
- readAs: the encoding as the page draws it on arrival, at 1440 × 900
- artifact actually read: the page's own 1058 × 721 inline `svg` (`style.graphic` = `svg`,
  `documentTop` 179, `nearTheTop` true) — the chart, not a hero.
- commissioned by UNHCR, built by Curran Kelleher; longlisted, Information is Beautiful Awards 2018.

## What it is

Every country of ORIGIN of the world's persons of concern, 1951–2016, as a streamgraph; and
directly beneath it, mirrored, every country of DESTINATION, on the same time axis. A cursor sits
at a selected year (2016 on arrival) and a right-hand panel reads out that year's total and its top
twenty origin countries by name and number.

## What it does with information

**Two streamgraphs, mirrored about one shared axis.** `ORIGINS` grows upward from the axis row,
`DESTINATIONS` grows downward from it, and the year labels — `1955 … 2015` — sit in the gutter
between them, serving both. One time scale, read once, for two stacks that must be compared. The
mirroring is the argument: the same people leave the top and arrive in the bottom, and the two
silhouettes are meant to be read against each other.

**In-band labels, sized by the band they sit in.** `Afghanistan` and `Iraq` are set large inside
their own thick bands; `Rwanda`, `Ethiopia`, `Mozambique` a size or two down; a dozen more are
almost too small to read, and the smallest bands carry nothing. There is no legend anywhere. The
label size IS a value channel — it degrades gracefully instead of hiding, so a reader sees "there
are many more, all small" rather than "there are these six".

**Each label is placed inside its band's own thickest run, never at an end.** `Afghanistan` sits at
its 1980s–90s bulge, `Iraq` at its post-2003 bulge, `Colombia` and `Syrian Arab Rep.` at the right
where they are widest. The same country is labelled independently in both stacks, at whichever
point each stack's band is fattest.

**The value read-off is a separate, ranked panel — not the chart.** Right of the plate:
`Selected year 2016`, then `Total from origins to destinations 67,635,713`, then `Top 20 origin
countries` as a list — `Syrian Arab Rep.: 12,642,995`, `Colombia: 7,734,617`, `Iraq: 5,611,517`, and
on down. **Each row has a coloured bar behind its text, in that country's own band colour, whose
length is the value.** So the panel is simultaneously the legend (colour → country), the bar chart
(length → value) and the exact figure (the printed number). This is the cleanest answer in the
family to the form's central problem: the drawing gives rhythm, and a companion panel keyed by the
same hue gives the numbers.

**A year cursor, a full-height black rule, ties the two together.** It marks the year the panel is
reporting. Filter checkboxes above the chart — `Refugees` · `Returnees` · `Internally displaced
persons` · `Returned IDPs` · `Others of concern` · `Asylum-seekers` · `Stateless` — all on by
default, with a `Reset selection` button, let the reader take categories out of the stack.

**A grey total strip runs under everything.** A single silhouette of the total, in flat grey,
outside both stacks — the sum the two coloured stacks are compositions of, shown once, plainly.

**There is no value axis at all** on either stack. Only the year row, faint verticals every five
years, and the two uppercase words `ORIGINS` and `DESTINATIONS`.

## What it does with style

Measured on this record's own `graphic.png` (`routes.pixel.measuredFrom = "graphic.png"`), palette
shape reported as **`categorical`** — the only record in this family the route calls that:

| role | value | coverage |
| --- | --- | ---: |
| ground | `#FFFFFF` | 76.16 % |
| band | `#FE9DBD` | 1.37 % |
| band | `#E4B276` | 0.87 % |
| band | `#33CAF7` | 0.82 % |
| band | `#D1ADF3` | 0.69 % |
| band | `#F89FCD` | 0.64 % |
| band | `#7CCC98` | 0.61 % |
| band | `#D1BA71` | 0.56 % |
| total strip | grey, reported as neutral `#808080` at 1.85 % | |
| gridlines | `#DDDDDD` 1.03 %, `#ECECEC` 0.47 %, `#E4E4E4` 0.44 % | |

**Every band is a pastel of roughly the same lightness.** No band is dark, no band is saturated;
hue rotates and value barely moves. That is what lets dark labels sit on every single band without
a per-band ink decision, and it is a deliberate trade — the bands are harder to tell apart from a
distance, and every one of them will hold text.

**The one saturated thing on the plate is the year cursor**, `#010101` at 0.56 %, and the one
un-hued area is the grey total strip. Ink is spent on the two elements that are not bands.

Type, from `style.type` on this document (the graphic is inline SVG, so the document IS the
graphic's document), all `Lato`:

| what | tuple |
| --- | --- |
| filter labels and the in-band country names | `Lato \| 14 \| 400 \| normal \| 0 \| none`, 84 of them, `rgb(34,34,34)` |
| the ranked read-out rows | `Lato \| 18.2 \| 400 \| normal \| 0 \| none`, 20 of them, sample `Syrian Arab Rep.: 12,642,995` |
| the year row | `Lato \| 20.2 \| 400 \| normal \| 0 \| none`, 13 of them |
| `ORIGINS` / `DESTINATIONS` | `Lato \| 21 \| 700 \| normal \| 0 \| uppercase` |
| the selected year | `Lato \| 56 \| 400 \| normal \| 0 \| uppercase`, `rgb(27,28,29)` |
| the panel headings | `Lato \| 16 \| 700 \| normal \| 0 \| none`, `rgb(0,114,188)` — UNHCR blue |

**The largest type on the page is the selected year at 56**, and the second largest is the total
beneath it. The chart is big; the number the chart cannot state is bigger.

## What is transferable

- **The ranked read-out panel keyed by the band's own colour, with the value as a bar behind the
  text.** Legend, bar chart and exact figure in one column. This is the mechanism that makes a
  no-axis form quotable.
- **Scale the in-band label with the band.** Big band, big name; small band, small name; tiny band,
  nothing. It shows the long tail instead of pretending it away.
- **Mirror two stacks about one shared time axis** when two compositions have to be read against
  each other, and put the axis labels in the gutter so they serve both.
- **Draw the total once, plainly, outside the coloured stacks**, so "how big is the whole thing" does
  not have to be inferred from silhouette.
- **A uniform-lightness pastel set** is what buys you dark labels on every band without a per-band
  decision.
- **Set the selected value larger than anything in the chart.**

## What is this piece's own

UNHCR's blue (`rgb(0,114,188)`) for panel headings and Lato throughout; and the specific
origins/destinations mirroring, which only makes sense for a quantity that moves from somewhere to
somewhere.

## What was not verified

- **Every interactive state.** Read at rest, in the arrival state. Hover, the filter checkboxes, the
  year cursor being dragged and `Reset selection` were not exercised.
- **Whether the label sizes are computed from band thickness** or authored. The pattern is
  consistent across both stacks, which is suggestive and is not proof.
- **Contrast of the in-band labels against their fills.** The pastels are all pale and the ink is
  dark, so the ratios are plausibly fine; none was computed.
- **The right-hand edge is clipped** at 1440 px — the panel's twentieth row and the chart's last
  year run under the viewport edge.
- **The palette's source.** These pastels are not UNHCR's brand five (`#0072BC`, `#18375F`,
  `#00B398`, `#E1CC0D`, `#EF4A60`), which the agency's own platform uses; where they come from is
  not stated on the page.
- **Independence from `gds-odsss-github-io-unhcr-dataviz-platform-…`.** Different host, same
  publisher. These two records are **one publication** and are not counted as two.
