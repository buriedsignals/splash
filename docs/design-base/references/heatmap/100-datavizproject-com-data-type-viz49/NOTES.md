# Ferdio — "1 dataset. 100 visualizations." #49

- url: https://100.datavizproject.com/data-type/viz49/
- archive: datavizproject
- type: heatmap (matrix), 3 countries × 2 years
- export: static
- readAs: the rendered page at 1440 × 900; the graphic itself was read by eye off `screenshot.png`,
  because neither route isolated it (see **What was not verified**)

## What it is

The heatmap encoding of the archive's single dataset: UNESCO World Heritage sites in Norway,
Denmark and Sweden in 2004 and 2021. Three columns, two rows, six cells. Ferdio's own commentary,
printed under the figure, says it plainly: *"Heat map of the dataset. Red indicates most World
Heritage sites and white or light blue least World Heritage sites. The dataset is arguably too small
for a data visualization like this to make sense."*

## What it does with information

**The value is printed in every cell** — 5, 4, 13 across 2004; 8, 10, 15 across 2021 — in white,
centred. A heatmap's known weakness is that colour cannot be read back to a number; printing the
number in the cell repairs it, and at this cell count there is room.

**The legend is a continuous ramp labelled only at its ends**, `0` on the left and `15` on the
right. Numbers, not names — and unlike the Guardian's `Multiple of £25,000`, **no unit at all**. The
reader is told the range and left to interpolate, which is exactly what a printed cell value makes
unnecessary; the two devices overlap.

**And the ramp is not monotone in lightness.** Read left to right off the legend bar it runs white →
pale blue → blue → **navy** → dark red → red. The navy near the middle is darker than the red at the
top, so a reader ranking cells by darkness ranks them wrongly. Denmark's 10 (`#283250`, near-navy) is
visibly darker than Sweden's 15 (a bright red), and 15 is the larger number. **This is the family's
central failure and the corpus should hold an example of it.**

**The scale starts AT the ground.** The legend's low end is white against a `#F4F7F7` page — a cell
of value 0 would be indistinguishable from no cell. Nothing in this dataset reaches 0, so it does
not bite here, but the ramp is built so that it would.

## What it does with style

The graphic sits on Ferdio's near-white `#F4F7F7`. The type is Ferdio's `stevie-sans` throughout
(measured on the page: 28 / 700 for `#49`, 16 / 400 uppercase for the nav, 14.4 / 500 uppercase for
`Stories`), with `Borgia Pro` at 18 / 400 for the running commentary. Row and column labels are set
in a quiet grey; the cell values in white, inside the cell.

The pixel route classifies the palette **diverging** — a classification of the page shot, not of the
graphic, and so worth nothing on its own. By eye that is nonetheless what the ramp is — two
hues meeting at a light middle — used as if it were sequential, on a quantity that has no natural
midpoint. Diverging colour on a one-directional count is the second defect here.

## What is transferable

- **Print the value in every cell** where the matrix is small enough. (This is the existing
  `value-on-the-mark` treatment, met in this family.)
- The three failures, as things to detect and refuse:
  **a ramp that is not monotone in lightness**; **a diverging ramp on a quantity with no midpoint**;
  **a ramp whose low end is the ground colour.**
- Ferdio's own admission that the dataset is too small for the form is worth keeping: **a heatmap
  with six cells is a table with the numbers hidden.**

## What is this piece's own

The blue/red pairing, `stevie-sans`, and the fixed three-country two-year dataset.

## What was not verified

- **Neither route reached the graphic.** The pixel route's `measuredFrom` is `screenshot.png`, so its
  ground (`#F4F7F7`, 44.7 %) and its top chromatic entry (`#3274DA`, 9.9 %) describe the **page**:
  `#3274DA` is Ferdio's own blue site header, which occupies 1440 × 80 = 8.9 % of a 1440 × 900 shot.
  The style route's `graphic` field records an SVG of 280 × 80 at x = 80, y = 0 — that is the site's
  `logo-100.svg` wordmark, not the visualization. **No colour share in `measured.json` is a
  measurement of this graphic.** The hexes named above were read by eye off the screenshot, and the
  ramp order likewise; none was sampled.
- The number of steps in the legend ramp.
- Whether the ramp is continuous or finely stepped.
