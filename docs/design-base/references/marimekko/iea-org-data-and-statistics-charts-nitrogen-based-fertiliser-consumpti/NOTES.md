# IEA — *Nitrogen-based fertiliser consumption in Africa based on application intensity and cropland per country, 2023*

- url: `https://www.iea.org/data-and-statistics/charts/nitrogen-based-fertiliser-consumption-in-africa-based-on-application-intensity-and-cropland-per-country-2023`
- archive: `search` (IEA chart library, `?type=variwide`) · harvested 2026-09-08, browser, both routes `ok`
- artifact actually read: the chart itself, an inline `svg 1162 × 500` at `documentTop 537`,
  `routes.pixel.measuredFrom = "graphic.png"`. One published chart on its own page — no hero, no
  consent wall, no second graphic.

## What it is

A **variable-width bar chart** — the marimekko's unstacked sibling, and the shape this form actually
takes in energy publishing. One bar per African country. Bar **height** is nitrogen applied per
hectare (kg NH₃-eq/ha); bar **width** is that country's cropland; the x axis is *cumulative* cropland
(0 → 300 million ha), so each bar's width can be read straight off the axis. Area is total
consumption. Countries are sorted by intensity, descending, which makes the outline a supply curve.

## What it does with information

**Two named reference lines, and the label sits on the line.** A full-width horizontal rule at ~82
kg/ha labelled `World average`, right-aligned and hard against the line; a second at ~40 labelled
`African Union 2034 target`. No legend, no arrow, no leader — the line is the mark and the words are
its name.

**An area is annotated with the quantity it equals.** The pale grey field between the curve and the
2034 target line carries, in the body of the region, two right-aligned lines:
`Underserved nitrogen demand towards 2034` / `8 Mt NH₃-eq`. This is the treatment this family most
needs, because in a chart where area is the reading, an *unannotated* area is a quantity the reader
is asked to integrate by eye. It is the one thing in this corpus that answers that.

**Grey is the field, colour is the argument.** Roughly forty bars, all `#F2F2F2`/`#E6E6E6`; eight
carry a chromatic fill. The highlighted countries are not contiguous — they are picked out of the
ranking — so the eye reads both the shape of the whole distribution and the specific cases at once.

**No country names on the bars.** At 300 million ha across 1162 px, most bars are a few pixels wide;
the record's type list shows `Egypt` set in `Graphik | 12 | 500` in black, i.e. only the wide bars
get named. Narrow cells are left unlabelled rather than clipped — the discipline the type page asks
for, applied along the width axis instead of inside cells.

## What it does with style

Colour, from `record.pixel`, measured on `graphic.png`: ground `#FFFFFF` at 66.26 %, then the grey
field `#F2F2F2` at 20.30 % and `#E6E6E6` at 5.34 % — **more than a quarter of the plate is
deliberately neutral**. The chromatic list is a categorical set at low coverage: `#68F394` 1.78 %,
`#3E7AD3` 1.27 %, `#49D3FF` 1.09 %, `#00ADA1` 0.74 %, `#FFF45A` 0.62 %, `#FF754B` 0.37 %,
`#FFB743` 0.29 %, `#B187EF` 0.27 %. Palette shape reads `categorical`. Rules and axis ink are pure
`#000000` at 0.60 %.

Type — and here `style.typeSource` is *"the page, which contains the graphic — the two are not
separated"*, the chart being inline SVG, so this is quotable: everything on the chart is **Graphik at
12 px**, split into two registers by weight and colour only. `Graphik | 12 | 400` in
`rgb(111, 111, 111)` for axis titles and annotation prose; `Graphik | 12 | 500` in `rgb(0, 0, 0)` for
the data's own names. Same size, same family; grey-regular is furniture, black-medium is data.

## What is transferable

1. **Annotate the area with what the area equals.** In this family it is not a nicety.
2. **A cumulative axis under the widths**, so the second dimension is readable rather than merely
   present.
3. **A named reference line whose label sits on the line**, right-aligned, no leader.
4. **Grey field, chromatic argument** — a highlight set that need not be contiguous.
5. **Two type registers at one size**, separated by weight and colour: furniture grey-regular, data
   black-medium.

## What was not verified

- The 8 Mt figure is the chart's own claim about its own shaded area; it was not recomputed.
- The bar widths were read as proportional to cropland from the axis label and the chart's title, not
  measured bar by bar.
- The IEA page carries a "Download chart" control and a licence; neither was exercised.
- The grey/colour split is one desk's practice. Four IEA charts in this corpus do it; that is one
  publication, not four.
