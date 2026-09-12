# Lawrence Livermore National Laboratory — *United States Energy Consumption in 2024: 94.6 Quads*

## What it is

The LLNL energy flow chart: the single most-copied sankey in existence, republished every year since
the 1970s. Nine primary sources on the left (`Petroleum 35.59`, `Natural Gas 34.27`, `Coal 7.87`,
`Nuclear 8.17`, `Biomass 5.11`, `Wind 1.54`, `Solar 1.1`, `Hydro 0.83`, `Geothermal 0.12`), one
transformation node (`Electricity Generation 32.77`), four consuming sectors, and two sinks —
`Rejected Energy 62.27` and `Energy Services 32.34`.

**What was actually read**: the chart itself, as an `img` 561 × 319 at `documentTop: 573` on
`flowcharts.llnl.gov`'s front page (`style.graphic`), photographed as an element. Confirmed by eye
at 3× enlargement: it is the whole 2024 chart, title, logo and all. Both routes `ok`.

**It is small.** 561 × 319 is the site's own presentation size, so the palette shares below are the
real chart's, but the labels are at the edge of legibility and the reading of the type is by eye.
A second harvest of `flowcharts.llnl.gov/commodities/energy` — the page that lists the charts —
returned `no graphic outside the site's own chrome`, correctly: that page is a grid of thumbnails
and no single one of them is the piece. It was deleted rather than filed.

## What it does with information

**Every node is a filled box carrying its own name and its own total**, stacked on two lines
(`Nuclear` / `8.17`), and the box is filled in the node's own colour with the label reversed out of
it. Node height is proportional, so `Petroleum 35.59` is a tall block and `Geothermal 0.12` is a
thin strip that still gets a full-size box and a full-size label.

**A whole stage can be one colour.** The four consuming sectors — Residential, Commercial,
Industrial, Transportation — are all the same pink, and the two sinks are two greys. So colour is
doing two jobs at once: on the left it identifies a *source*, in the middle and right it identifies
a *stage*. Hue travels along the ribbons from each source, and the pink and grey boxes are where
that travelling stops.

**Every ribbon is labelled with its value, on the ribbon, in the ribbon's own colour.** `13.56` in
orange leaving Electricity Generation, `4.58` in light blue, `0.32` in green. There are perhaps
fifty of these. Combined with the node totals, the entire arithmetic of the diagram is printed —
which is what lets a reader audit conservation by hand, the thing the form promises and the
geometry cannot show.

**The ribbons are pipes, not ribbons.** They run orthogonally with rounded corners rather than as
smooth Béziers, and they are opaque, so where two cross one simply covers the other. That is the
cost of the routing: at the left edge, seven thin flows run as near-horizontal hairlines through the
whole width of the chart and are readable only because their colours differ.

**The grand total is in the title**: `United States Energy Consumption in 2024: 94.6 Quads`. The
unit lives there too, since there is no axis to put it on.

## What it does with style

Pixels, measured on `graphic.png` (`record.pixel`, `measuredFrom === "graphic.png"`):

- ground `#FFFFFF` at **52.21 %**, much lower than the other references in this family — this
  diagram fills its frame;
- **the largest single non-ground value is again a neutral**: `#B9B9B9` at **7.98 %**, which is
  `Rejected Energy` and the ribbons feeding it, with `#616161` at 2.44 % (`Energy Services`) and
  `#000000` at 0.73 % (coal, drawn black);
- the source hues: `#006000` at **8.34 %** (petroleum), `#46AAF5` at **5.84 %** (natural gas),
  `#E69A38` at **2.08 %** (electricity generation), `#CC0001` 0.83 % (nuclear), `#911391` 0.24 %
  (wind);
- `#FFBBC6` at **2.48 %** is the four consuming-sector boxes — one hue for a whole stage;
- palette shape `categorical`, which is right: nine sources with no order between them.

Two thirds of the chart's ink (`#B9B9B9` + `#616161` + `#000000` = 11.15 % against the largest hue
at 8.34 %) is neutral, and the largest neutral is the diagram's punchline — 62.27 of 94.6 quads
rejected as waste heat.

**The colour-on-white labels are below any text floor**, computed from the record's own hexes
against its own ground: `#46AAF5` on `#FFFFFF` is **2.52 : 1**, `#E69A38` on `#FFFFFF` is
**2.32 : 1**, `#B9B9B9` is **1.96 : 1**. The darker sources are fine — `#006000` 7.86 : 1,
`#911391` 7.76 : 1, `#CC0001` 5.89 : 1 — so the failure is not the idea of colouring the value
label, it is that half the palette is too light to carry text.

`record.style.type` for this reference is the **LLNL website**, not the chart: `Open Sans` at 14/400,
80/700 for the page hero, 18/400 tracked 2.7 uppercase for `SITE MAP`. The chart is a raster image
and its own type could not be measured. `record.style.marks` likewise describes the page.

## What is transferable

- **A node box that carries its name and its total, reversed out of the node's own colour.** It is
  the densest possible node: identity, quantity and category in one object.
- **Give a whole stage one colour.** Four sector boxes in one pink says "these four are the same
  kind of thing" at no palette cost, and it stops the travelling source hues from being confused
  with a destination category.
- **Print the value on the ribbon so conservation can be audited by hand.** This is the only one of
  the five publications here that makes the arithmetic checkable by a reader.
- **Let the neutral be the largest area when the neutral is the argument.** Rejected energy is grey
  and grey is 11 % of the picture; the design's biggest colour decision is to make the waste
  colourless.
- **And the refusal**: do not paint a value label in a light source colour. Measured at 2.32–2.52 : 1
  here. If the value must carry its flow's identity, put the colour on a swatch and the text in ink.

## What was not verified

- **Conservation.** All the numbers are printed and none of them were added up. This chart is the
  one reference in the family where the check would actually be possible from the image alone.
- **The chart's own typography.** Raster `img` at 561 × 319; families, sizes and weights were seen
  at 3× enlargement, not measured. Everything in `record.style.type` is the LLNL page.
- **The full-resolution artifact.** LLNL publishes these as large PDFs and PNGs; the record is of
  the site's presentation copy. Colours and areas are the chart's; the crispness is not.
- **Whether the ribbons are opaque by choice.** Asserted from looking at crossings; not measured.
- **Interaction.** None; this is a static image and nothing was clicked.
