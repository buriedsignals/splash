# IEA — *Marginal cost curve for oil and gas methane abatement by policy type, 2025*

- url: `https://www.iea.org/data-and-statistics/charts/marginal-cost-curve-for-oil-and-gas-methane-abatement-by-policy-type-2025`
- archive: `search` (IEA chart library, `?type=variwide`) · harvested 2026-09-08, browser, both routes `ok`
- artifact actually read: the chart itself, an inline `svg 1162 × 500` at `documentTop 521`,
  `routes.pixel.measuredFrom = "graphic.png"`.

## What it is

A marginal abatement cost curve, and **the anti-pattern this family has to name**. Variable-width
bars, cumulative x axis (0 → 62 Mt abated methane), y = USD/tCO₂-eq crossing zero at roughly 32 Mt,
categorical fill by policy type. Structurally identical to the copper and nitrogen charts. Visually
it is a picket fence: several hundred bars, most of them one or two pixels wide, so the fills read as
vertical hairlines and the four categories are indistinguishable across most of the plate.

## What it does with information

**The cumulative axis survives; the categories do not.** The envelope is still readable — a negative-
cost region to the left of 32 Mt, a shallow positive plateau, a spike past 58 — and that envelope is
the chart's actual argument. But `record.style.marks` counts 127 fills of `rgb(73, 211, 255)`, 101 of
`rgb(104, 243, 148)` and 77 of `rgb(0, 173, 161)`: **over 300 separately filled bars in 1162 px**.
At that density a categorical fill encodes nothing a reader can use, and the type page's cap of about
five distinguishable segments is being asked to hold across three hundred marks.

**Zero is drawn as a black rule**, full width, and it is the only annotation on the plate. There is
no reference line, no shaded region, no named case, no label of any kind inside the chart. Compare
the nitrogen chart from the same desk, which names two thresholds and puts a quantity inside a
shaded area: the difference between the two is the whole distance between a cost curve that argues
and one that only exists.

**No sorting cue for the categories.** Because bars are ordered by cost and coloured by policy, the
colours interleave; there is no run of one hue long enough to read as a group.

## What it does with style

Colour, from `record.pixel`, measured on `graphic.png`: ground `#FFFFFF` at 88.59 % — the highest
white share in this corpus, because the marks are hairlines. Chromatic: `#49D3FF` 3.83 %,
`#68F394` 2.92 %, `#00ADA1` 2.52 %, `#3E7AD3` 0.58 %. Palette shape reads `diverging`. Neutrals are
`#E6E6E6` 0.90 % (gridlines) and `#000000` 0.31 % (axis and the zero rule). Note that three of the
four fills are cyan-to-green neighbours (h 194.5, 139.0, 175.8): they are hard to separate at full
bar width and impossible at one pixel.

Type (`style.typeSource`: *"the page, which contains the graphic — the two are not separated"*):
`Graphik | 12 | 400` grey for `USD/tCO₂-eq` and `Abated methane emissions (Mt)`;
`Graphik | 12 | 500` black on the page for the category names (`Zero non-emergency flaring and
venting`), which sit in the page's legend rather than on the plate.

## What is transferable

1. **The negative case**: a variable-width chart whose widths fall below a few pixels has stopped
   encoding its second dimension, and colouring those slivers categorically makes the plate look
   informative while telling the reader nothing. Bucket the units before drawing, or drop the
   categorical fill and keep the envelope.
2. **A zero rule in solid black across the full width**, when the y axis crosses zero — cheap, and it
   is the one thing here that works.
3. **A cautionary palette note**: three of the four hues are within 55° of each other; the categories
   would be hard to separate even at generous widths.

## What was not verified

- The bar count is inferred from `style.marks` fill counts, not from the underlying data.
- Whether the legend sits above or below the plate on the published page was not recorded; it is not
  on the graphic.
- No contrast measurement was made — there is no in-plate text to measure.
