# NSIDC — Charctic, the interactive sea ice graph

- url: https://nsidc.org/sea-ice-today/sea-ice-tools/charctic-interactive-sea-ice-graph
- archive: url-list
- type: **a box plot unrolled along a time axis** — a median line with an interquartile band and an
  interdecile band around it, over which individual years are drawn as lines
- export: interactive, in a frame (`iframe`, 1100 × 900, `documentTop` 576, `nearTheTop: true`);
  the graphic is a separate document, `https://nsidc.org/data/tools/arctic-sea-ice-chart/`
- readAs: the tool as it loads, at rest, default settings (Arctic, January start, "Classic" colours)
- routes: style `ok`, pixel `ok` (`measuredFrom: "graphic.png"`); consent dismissed —
  `record.consent` is `button "Accept"`

## What it is

The National Snow and Ice Data Center's sea ice extent tool: 1979 to today, every year selectable,
with the 1981–2010 reference period drawn as a **distribution summary** underneath. It is the one
reference in this family that puts the box plot's statistics to work on a real published beat
rather than on a teaching sample — and it does it without drawing a single box.

## What it does with information

**The reference period is drawn as three nested statements, and the legend names each one.**
`1981-2010 Median` (a dark grey line), `Interquartile Range` (the innermost 50 % of all values for
that date), `Interdecile Range` (the innermost 80 %). Below them the legend offers a second, mutually
exclusive summary of the same period — `1981-2010 Average` and `±2 Standard Deviations` — so the
reader can swap a robust summary for a parametric one and see the difference on the same plate. That
is the *choice* `boxplot.md` asks a designer to make, exposed as a control.

**Every band is named by its statistic, in words, and never by a bare shade.** No "shaded area shows
the normal range". The three greys are legible only because the legend spells out what each is.

**The individual years the story is about are drawn ON TOP of the summary, in colour.** In this
capture: 2026 in blue and 2012 (labelled `Record minimum` in the legend) in red dashed. The summary
is furniture; the two lines that carry the argument are the only chromatic marks the chart itself
draws.

**The value axis names its unit and its definition.** `Extent (Millions of square kilometers)` down
the left, and a subtitle under the title reading `(Area of ocean with at least 15% sea ice)`. The
axis title says what is measured; the subtitle says what counts as a measurement. `boxplot.md`'s
"always label the unit" is met twice over.

**The date axis is a year of calendar days**, `1 Jan` to `30 …`, which is what makes the summary
possible at all: each vertical slice is a distribution of thirty values for one day of the year, and
the bands are that distribution's quartiles. **A box plot drawn once per day and joined up.**

**Nothing is hidden behind the interaction.** The default state already carries median, both bands,
the current year and the record year; the eighty-odd checkboxes add years, they do not reveal the
chart.

## What it does with style

**Type**, from `record.style.graphicFrame.type` — the frame is a separate document, so this is the
graphic's own voice and not the publisher's article furniture:

- `Lucida Grande | 18 | 400`, `rgb(34, 34, 34)` — the axis title `Extent (Millions of square kilometers)`
- `Lucida Grande | 14 | 400`, `rgb(34, 34, 34)` — the axis values (18 tuples)
- `Lucida Grande | 12 | 400`, **`rgb(102, 102, 102)`** — the subtitle `(Area of ocean with at least 15% sea ice)`
- `Lucida Grande | 9 | 400`, **`rgb(153, 153, 153)`** — the credit `National Snow and Ice Data Center, Boulder, CO`
- `Arial | 11 | 700`, `rgb(33, 37, 41)` — the legend, 59 tuples of it
- **Three sizes and three greys down one ladder**: 18/`#222` title, 14/`#222` values, 12/`#666`
  qualifier, 9/`#999` credit. Importance is size *and* ink together, never one alone.

The host page's own type — `Roboto`, `Helvetica Neue`, NSIDC's `rgb(0, 51, 102)` navy — is in
`record.style.type` and describes the article shell around the frame, not the chart.

**Marks**, from `record.style.graphicFrame.marks` — five declarations that are the whole anatomy:

| mark | declaration | what it is |
| --- | --- | --- |
| interdecile band | `fill rgba(210, 210, 210, 0.75)` | innermost 80 % |
| interquartile band | `fill rgba(170, 170, 170, 0.75)` | innermost 50 % |
| median | `stroke rgb(130, 130, 130)` | 1981–2010 median |
| record minimum | `stroke rgb(255, 0, 0)` | 2012 |
| current year | `stroke rgb(0, 152, 244)` | 2026 |

**And the two routes agree to the byte, which is worth writing down.** Both bands are declared at
0.75 alpha over white paper, and the interquartile band is painted *over* the interdecile one.
Composited, that predicts `210·0.75 + 255·0.25 = 221` → `#DDDDDD` for the outer band and
`170·0.75 + 221·0.25 = 183` → `#B7B7B7` for the inner. The pixel route, which knows nothing about
those declarations, reports **`#DDDDDD` at 1.414 %** and **`#B7B7B7` at 1.559 %** as its two largest
non-white neutrals, and the median's `rgb(130,130,130)` shows up as **`#828282` at 0.259 %**. The
style route's declared marks and the pixel route's counted pixels describe the same five objects.

The chart's own ground is white — `record.style.graphicFrame.ground` is `rgb(255, 255, 255)` —
while the page around it is dark, `record.style.ground` `rgb(41, 41, 41)`. The plate does not inherit
the site.

**The chromatic reading of this record is contaminated and must not be quoted as the chart's
palette.** `pixel.chromatic` leads with `#C4E0F5` (0.179 %), `#003366` (0.157 %) and `#0062CC`
(0.137 %); the graphic clip includes the site's own sticky navigation across its top edge. Counted
by hand on `graphic.png`, the **top 60 rows** carry `#C4E0F5` at 2.691 %, `#003366` at 2.348 % and
`#0062CC` at 2.021 % of those rows — those three are the `Arctic / Antarctic` tabs and the site's
menu, not the chart. Below row 60 the same hand count gives `#B7B7B7` 1.452 %, `#DDDDDD` 1.396 %,
`#E6E6E6` 1.349 % and `#828282` 0.248 %, which is the chart. `METHOD.md` correction 15 exactly: the
field says `measuredFrom: "graphic.png"` and something else was painted on top of it.

The chart's own two accents survive that check on both routes: `stroke rgb(255,0,0)` /
**`#FF0000` at 0.086 %**, and `stroke rgb(0,152,244)` / **`#0098F4` at 0.096 %**. Two lines, under a
fifth of a percent of the frame between them, and they are the only thing on the plate the eye goes
to first.

## What is transferable

- **The distribution summary is furniture and the case is ink.** Median and both bands in greys; the
  one or two series being argued about in colour, over the top. The summary can be dense — three
  nested greys — precisely because it carries no chroma.
- **Nested intervals are one grey at two lightnesses, the tighter interval darker**, achieved by
  painting both at the same alpha and letting them stack. The reader gets the nesting for free.
- **Every band names its statistic in the legend, in words** — `Interquartile Range`, not "typical
  range" and not an unlabelled swatch.
- **Offer the alternative summary as a control, not as a footnote**: median + quartiles, or mean +
  2σ, on the same axis.
- **A box plot per time slice, joined up, is a real chart** — the way to compare a year against a
  distribution without drawing 365 boxes.
- **A type ladder where size and ink move together**: 18/`#222`, 14/`#222`, 12/`#666`, 9/`#999`.

## What is this piece's own

The eighty-year checkbox legend down the right-hand side, which is a data-tool affordance rather
than an editorial one; the `Classic` colour scheme with its per-year rainbow; and the 1981–2010
baseline, which is a domain convention.

## What was not verified

- **`pixel.chromatic` on this record is mostly the site's navigation** (above), so no chromatic
  figure from that list is used here except the two the style route independently declares.
- **The hand counts quoted above are mine, taken on `graphic.png` with Pillow**, and disagree
  slightly with the record's own shares (`#DDDDDD` 1.304 % by hand over the whole clip against the
  record's 1.414 %); the pixel route bins near-neighbours and I did not. Where the two differ, the
  record's number is the one to cite.
- **The page was read after a consent dialog was dismissed** (`Accept`).
- **Whether the bands are drawn from the record's stated statistics or from a smoothed series** was
  not checked against NSIDC's own methods page.
- **The capture is one state of an interactive.** The default year selection (2026 and 2012) is the
  tool's, not a designer's editorial choice for a particular story.
