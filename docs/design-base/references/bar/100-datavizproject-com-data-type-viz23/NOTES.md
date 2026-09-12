# Ferdio / 100.datavizproject.com — #23, stacked columns on a map

- url: https://100.datavizproject.com/data-type/viz23/
- archive: datavizproject
- type: stacked column chart, each column anchored at its country on a grey basemap
- export: static (a raster served in the page)
- readAs: the published page at 1440×900, read at rest. `largestGraphic: null`; the pixel route
  measured the whole page shot. The bottom of the plate — Denmark's column and its `DK` label — was
  below the fold and is clipped in the capture.

## What it is

One of a hundred encodings of the same dataset — UNESCO World Heritage sites in Denmark, Norway and
Sweden, 2004 against 2022. Here each country is a two-part column standing on its own place on a
flat grey map of Scandinavia.

## What it does with information

**The stack is [level, growth], and the total is printed outside it.** Each column has a blue lower
segment carrying the 2004 value and a red upper segment carrying the *increase since*, with a dark
callout pill above the column carrying the 2022 total. Norway `5` + `3` → `8`. Sweden `13` + `2` →
`15`. Denmark `4` + `6` → `10`. The three sums check.

**That is the repair for the stacked bar's real defect.** A stack hides its own total: the reader has
to add. Printing the total beyond the stack's end, in a register distinct from the segments' own,
gives back the number the geometry took away — and printing the *increase* rather than the 2022
value means no segment's number has to be subtracted from another either.

**Position carries a second variable at no cost.** The columns stand where their countries are, so
the chart answers "which is where" without a legend, a key or a second graphic. It costs the value
axis, which cannot exist on a map — which is exactly why every number is printed.

## What it does with style

Ground `#F4F7F7` at **44.8 %**, `#FFFFFF` at **37.8 %**, and a third neutral `#D0D9DB` at **5.1 %**
— the basemap landmass, drawn as a flat grey with no borders, no labels and no coastline detail
beyond the outline. Strongest chromatic cluster `#3274DA` at **9.9 %**, red `#F05440` at 0.7 %;
palette read as **diverging**. As with every DVP record the blue is inseparable from the site's own
navigation bar.

The total pill is near-black (`#253239` among the neutrals) rather than either segment's hue: the
total belongs to neither part, and is drawn as neither.

## What is transferable

- **Print a stack's total beyond its end**, in a neutral that belongs to no segment.
- **Stack [starting level, growth] rather than [before, after]** when the story is growth: then no
  number in the picture has to be subtracted from another.
- **A basemap under columns should be one flat grey with nothing named on it**, or the reader starts
  reading the map instead of the columns.

## What is this piece's own

The Scandinavian basemap, and the flag-free country codes.

## What was not verified

Denmark's column below the fold, and the chart's own typography — unmeasured, as with every DVP
record. Whether the columns are placed at capitals or at country centroids. One publication.
