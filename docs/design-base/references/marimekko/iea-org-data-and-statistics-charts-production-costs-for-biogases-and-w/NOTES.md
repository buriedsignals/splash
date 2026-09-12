# IEA — *Production costs for biogases and wholesale and retail prices of natural gas by selected region/country*

- url: `https://www.iea.org/data-and-statistics/charts/production-costs-for-biogases-and-wholesale-and-retail-prices-of-natural-gas-by-selected-regioncountry`
- archive: `search` (IEA chart library, `?type=variwide`) · harvested 2026-09-08, browser, both routes `ok`
- artifact actually read: the chart itself, an inline `svg 1162 × 500` at `documentTop 569`,
  `routes.pixel.measuredFrom = "graphic.png"`. Page last updated 21 May 2025.

## What it is

**The one chart in this corpus that is variable-width *and* stacked** outside Ferdio — i.e. the only
non-Ferdio marimekko proper here. Seven columns, one per region/country, laid on a cumulative x axis
in bcme (0 → ~805); column width is that region's biomethane production potential. Height is
USD/GJ. Each column stacks two or three segments (a coloured production-cost band, a grey band, and
in some columns a salmon band), and the column tops are ragged — 13.3, 14.3, 14.5, 17.0, 21.2, 21.6,
23.2 — because this is an absolute-value stack, not a 100 % stack.

## What it does with information

**Floating reference bars, drawn in the same visual grammar as the data.** Above most columns sit
short salmon horizontal bars at 15.7, 20.5, 23.4, 26.9 and 25.9 USD/GJ. They span only part of their
column's width — one of them spans two columns — so they read as *a price that applies over this
range of production*, which is exactly what a cumulative axis makes expressible and an ordinary
column chart cannot say. Where the nitrogen chart draws a reference as a full-width rule, this one
draws it as a bar with the same width semantics as the data underneath it.

**Colour identifies the column, not the series.** Each region gets its own hue (cyan, two paler
cyans, purple, green, cyan again, amber) while the grey band recurs across all seven. So the shared
categorical palette that a textbook marimekko uses to compare one series column-to-column is
*absent*: the only cross-column series here is the grey. This is a real departure and it costs the
chart its column-to-column comparison.

**Absolute stacking, not 100 %.** The height axis is a real USD/GJ scale with gridlines at 0/5/10/…/30,
so the segments are values rather than shares. That makes the *area* of a cell a cost × volume
product, which is the reading, but it also means the columns cannot be compared as compositions.

## What it does with style

Colour, from `record.pixel`, measured on `graphic.png`: ground `#FFFFFF` at 50.71 % — by far the most
ink-heavy plate in this corpus, because the columns are contiguous and full-height. Chromatic:
`#49D3FF` 15.54 %, `#FFD48F` 5.64 %, `#68F394` 5.38 %, `#B187EF` 5.20 %, `#C2EFFB` 5.00 %,
`#84DEF7` 4.76 %, `#FFA494` 3.32 %. Neutral `#B1B1B1` at 3.27 % — that is the recurring grey band,
and it is the only mark colour that means the same thing in every column. Palette shape reads
`categorical`.

Type (`style.typeSource`: *"the page, which contains the graphic — the two are not separated"*):
`Graphik | 12 | 400` grey `rgb(111, 111, 111)` for the axis titles (`USD/GJ`, `bcme`),
`Graphik | 12 | 500` black for region names (`China`). No label is printed inside any cell — the
identification is carried entirely by the legend and by the page's title.

## What is transferable

1. **A reference bar that spans a range of the width axis**, drawn in the same grammar as the data —
   only possible because the x axis is cumulative, and worth having wherever a threshold applies to
   part of the population rather than all of it.
2. **A shared neutral for the one series that recurs in every column**, so it is findable even when
   the columns are otherwise coloured by identity.
3. **The negative lesson**: colouring by column rather than by series discards the marimekko's
   central affordance. If the columns must be identified by hue, the form is doing half its job.

## What was not verified

- The legend is not inside `graphic.png`, so what the grey band and the salmon bars denote is
  inferred from the chart's title and axis, not read.
- Column widths were read off the cumulative axis by eye; the underlying bcme values were not
  recovered.
- No contrast measurement — the plate carries no in-cell text.
- One publication. The other three IEA charts in this corpus are the same desk (`METHOD.md`
  correction 4).
