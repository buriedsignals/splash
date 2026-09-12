# Ferdio, *1 dataset. 100 visualizations.* — #9, the area-scaled mosaic

- url: `https://100.datavizproject.com/data-type/viz9/`
- archive: `datavizproject` · harvested 2026-09-08, browser, both routes `ok`
- artifact actually read: the piece's own graphic, `img 823 × 823` at `documentTop 172`,
  `routes.pixel.measuredFrom = "graphic.png"`.

## What it is

A marimekko whose columns scale in **both** dimensions. Two blocks, 2004 and 2022. Measured on
`graphic.png` the 2004 block is 231 × 231 px and the 2022 block 284 × 285 — squares, with sides in
the ratio 1.229 against √(33 ⁄ 22) = 1.2247. So the **area** of each block is its group total, and
the three countries partition that area as vertical bands whose widths are their shares
(18 % / 23 % / 59 %, then 30 % / 24 % / 46 %). A single cell's area is therefore the absolute count,
which is what the form exists to deliver — reached by a different construction than #90's.

## What it does with information

**The total is set as a large numeral above each block**, `22` and `33` in heavy dark type, centred.
Where #90 draws a brace, this one simply prints the number and leaves the block unbounded — the two
Ferdio encodings answer the same question (how does a reader get the width?) two different ways.

**In-cell labels are two lines and bottom-aligned**: the share on top (`18%`), the country code below
(`DK`), both sitting on the floor of the block rather than centred in the cell. Bottom alignment is
what lets the narrowest band — 18 % of 231 px, about 42 px wide — hold two short lines without
crowding; a centred label in that band would have nothing to sit against.

**Both the identity and the share are printed**, unlike #90. The cost is more ink in every cell; the
gain is that the chart survives being read in greyscale.

## What it does with style

Colour, from `record.pixel`, measured on `graphic.png`: ground `#FFFFFF` at 79.62 %; `#3274D8`
(blue, Sweden) at 9.74 %; `#F05440` (coral, Denmark) at 4.76 %; and `#283250` (dark navy, Norway) at
4.42 % in the neutral list. The same three-fill house palette as #90, at lower coverage because this
encoding spends more of the frame on white. Palette shape reads `diverging`.

Label ink is white on all three fills; the country codes are set heavier than the percentages above
them, so identity reads before magnitude.

Type is **not** the graphic's voice: `style.typeSource` says *"the page only — the graphic is a
raster and carries no type this route can read"*.

## What is transferable

1. **Area, not width, as the group total** — a legitimate second construction of this form, useful
   when the columns must sit in a square frame rather than a wide one.
2. **Bottom-aligned two-line cell labels**, which is what makes a narrow band labellable at all.
3. **The total printed large above the column**, the cheapest possible answer to "how wide is wide".

## What was not verified

- Whether Ferdio intended area or side length to carry the total is inferred from the measured pixel
  ratio (1.229 vs √1.5 = 1.2247), not read from any statement on the page.
- No contrast measurement of the white labels against the coral fill.
- One publication; cannot corroborate #90 (`METHOD.md` correction 4).
