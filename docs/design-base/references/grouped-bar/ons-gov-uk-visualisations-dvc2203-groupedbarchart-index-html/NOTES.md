# ONS — Census 2011 vs 2021 by ethnic group, a horizontal grouped bar on a chart-only page

- url: https://www.ons.gov.uk/visualisations/dvc2203/groupedbarchart/index.html
- archive: search
- type: horizontal grouped bar — 2 series (2011, 2021) × 4 categories (ethnic groups)
- export: live SVG, 700 × 345, at `documentTop` 19, `nearTheTop: true`
- readAs: `graphic.png`, the chart's own SVG. Both routes `ok`;
  `routes.pixel.measuredFrom === "graphic.png"`. `style.typeSource` is **"the page, which contains
  the graphic — the two are not separated"**, and here that is nearly the same thing as the
  graphic's own voice: the url is a chart permalink and the page holds the chart, a legend and a
  source line and nothing else. No masthead, no consent wall, no hero. `consent: null`.

## What it is

An Office for National Statistics census figure: the share of usual residents in England and Wales
in four ethnic-group categories, 2011 against 2021, as pairs of horizontal bars.

## What it does with information

**The legend sits above the plot, in the same top-to-bottom order as the bars within each group.**
Grey dot `2011`, blue dot `2021`; grey bar on top, blue bar below, in all four groups. Matching a
swatch to a bar costs one learning and never has to be repeated — which is the whole justification
for a legend on this type.

**Only one of the two series is coloured.** 2011 is a neutral grey; 2021 is ONS's blue. The chart is
not "two equal series", it is "the current figure, against last time" — and the palette says so
before any label is read. The reader's attention is spent once, on the blue.

**Every bar carries a two-unit label: `7.5% (4.2 million)`.** The percentage is bold, the count is
regular, both at the same size. The share is what the chart encodes; the count is what makes it
concrete. Neither gets its own axis and neither is relegated to a footnote.

**The label moves in or out depending on whether the bar can hold it.** On the long bars it sits
inside, right-aligned against the cap, in white. On the short ones (`2.2%`, `1.0%`) it sits outside
in dark grey. One rule, applied per bar, and no label ever overflows its own bar or crosses the
axis.

**Bars within a group touch; groups are separated by about two bar-heights.** The category label is
right-aligned to the left of the group, wrapping to as many lines as it needs
(`Black, Black British, / Black Welsh, / Caribbean or African`) and vertically centred on the pair.

**The axis is minimal and directional.** Ticks `0% 2% … 10%` with faint verticals, and the axis
title — `Percentage of usual residents` — set as a right-aligned line *under* the axis rather than
rotated or centred. It reads as a caption to the axis, in the direction the bars run.

## What it does with style

Two routes, and they agree on the authored values.

**Style route (the live DOM).** `marks`: `fill rgb(160, 159, 160)` × **4** and
`fill rgb(32, 96, 149)` × **4** — four categories × two series, exactly. Type is `Open Sans`
throughout, at three tuples only:

| tuple | count | sample | colours |
| --- | ---: | --- | --- |
| Open Sans 14 / 400 | 32 | `2011` | `rgb(112,112,112)`, `rgb(0,0,0)` |
| Open Sans 14 / **700** | 8 | `7.5%` | `rgb(0,0,0)` |
| Open Sans 16 / 400 | 1 | `Source: Office for National Statistics – Census 2021` | `rgb(112,112,113)` |

Eight bold spans for eight bars: the emphasis in `**7.5%** (4.2 million)` is the *only* weight
change on the plate, and it is at the same 14 px as everything else. Hierarchy by weight alone, at
one size, with a third size reserved for the source line — which is *larger* than the chart's own
type, not smaller.

**Pixel route (`graphic.png`).** Ground `#FFFFFF` at **76.990 %**. Chromatic `#206095` at
**10.195 %** (207°) — the same `rgb(32, 96, 149)` the DOM declares. Neutrals `#A09FA0` at
**7.869 %** (the 2011 grey), `#DADADA` **0.652 %** (gridlines), `#414042` **0.627 %** (type),
`#F3F3F3` **0.259 %**. Palette shape **sequential**, one cluster at 207° (10.497 %, 24 members) —
correctly, because only one series is chromatic at all.

## What is transferable

- **Order the legend the way the bars are ordered within a group**, and place it before the plot in
  reading order.
- **Colour only the series that carries the argument; draw the comparison series in a neutral.** A
  two-series grouped bar rarely needs two hues.
- **Give a bar two units in one label**, the encoded one bold and the concrete one regular, at one
  size.
- **Place the label inside the bar when it fits and outside when it does not**, per bar rather than
  per chart.
- **Set the axis title as a caption running with the axis**, right-aligned under it, instead of
  rotating type.

## What is this piece's own

`#206095`, the ONS house blue, and the Census 2011/2021 framing.

## What was not verified

Whether the chart has a title above the clip — the SVG starts at `documentTop` 19 and the
screenshot shows the legend as the topmost element, so the figure title likely lives in the parent
article this permalink is embedded into, and was not read. The interactive behaviour (this is a live
SVG; it was read at rest). Whether the in/out label rule is a width threshold or hand-set.
