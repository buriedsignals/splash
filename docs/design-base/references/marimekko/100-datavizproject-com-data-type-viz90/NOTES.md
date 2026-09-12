# Ferdio, *1 dataset. 100 visualizations.* — #90, the marimekko

- url: `https://100.datavizproject.com/data-type/viz90/`
- archive: `datavizproject` · harvested 2026-09-08, browser, both routes `ok`
- artifact actually read: the piece's own graphic, `img 823 × 823` at `documentTop 172`,
  `routes.pixel.measuredFrom = "graphic.png"`.

## What it is

The canonical marimekko, drawn twice for two years of one dataset: Scandinavian World Heritage
sites, 22 in 2004 and 33 in 2022. **Two columns of identical height and unequal width.** Measured on
`graphic.png`: both columns run y 213 → 573; the 2004 column is 185 px wide and the 2022 column
280 px — a ratio of 1.514 against the data's own 33 ⁄ 22 = 1.5. Width is the group total, to the
pixel. Inside each column the three countries stack to 100 %, labelled with their share to one
decimal (59.1 / 18.2 / 22.7 in 2004; 45.5 / 30.3 / 24.2 in 2022).

## What it does with information

**The width is stated, not left to be estimated.** Under each column a thin rounded **brace** spans
its full width and drops to a centred pair of lines — the total in bold (`22`, `33`) over the year
in a lighter grey. That is the piece's one real invention: a marimekko's second dimension is the
hardest thing on the chart to read, and this names it in the furniture instead of asking the eye to
compare two widths.

**Every cell is labelled, and only with the percentage.** No country names inside the cells at all —
the colour carries identity and the number carries the share. Six cells, six labels; the smallest
(18.2 %, roughly 185 × 60 px) still holds its text comfortably, which is what lets the piece get
away with labelling all of them.

**No axis of any kind.** No y scale, no gridlines, no tick for the 100 %. The stack is understood to
be a whole because it is full-height and its parts are printed as percentages.

## What it does with style

Colour, from `record.pixel`, measured on `graphic.png`: a white ground `#FFFFFF` at 74.98 %;
`#3274D8` (blue, Sweden) at 12.12 %; `#EE5440` (coral, Denmark) at 5.88 %; and in the neutral list
`#192440` (near-black navy, Norway) at 5.51 %. Three fills, one per series, held constant across
both columns, and the palette shape is read as `diverging`. Every in-cell percentage is set in white
and clears its fill; the navy and the blue take white comfortably, and the coral is the one that
would need checking at smaller type.

Type is **not** quotable as the graphic's voice: `style.typeSource` says *"the page only — the
graphic is a raster and carries no type this route can read"*. The stevie-sans / Borgia Pro tuples in
the record are `100.datavizproject.com`'s article furniture, not the chart's.

## What is transferable

1. **A brace under each column that names its total.** The one treatment here that a reader could
   not derive without it, and the one that repairs this form's known weakness.
2. **Cell labels carry the share only; colour carries identity.** Halves the ink in every cell.
3. **Equal heights, unequal widths, one shared palette down every column** — the geometry itself,
   drawn without a single axis.

## What was not verified

- The label ink was not measured for contrast against each fill; it is described as *reading* white,
  not as *passing* WCAG. The type page's shipped failure (white on a mid-toned fill) says that
  distinction matters.
- The percentages are printed to one decimal and were not checked against the underlying counts.
- One publication, one designer, one dataset. Ferdio corroborates nothing about Ferdio
  (`METHOD.md` correction 4).
