# Ferdio — "1 dataset. 100 visualizations." #35

- url: https://100.datavizproject.com/data-type/viz35/
- archive: datavizproject
- type: matrix of small multiples, 3 countries × 2 years, gauge in each cell
- export: static
- readAs: the rendered page at 1440 × 900, the graphic read by eye off `screenshot.png` because
  neither route isolated it (see **What was not verified**)

## What it is

A matrix laid out exactly like a heatmap — countries across the top, years down the side, six cells
— where each cell holds a **donut gauge** instead of a fill. Ferdio: *"Table with donut charts. A
full donut represents the maximum value of World Heritage sites (15)."*

## What it does with information

**Every cell is drawn against the same declared maximum.** The full ring is 15 — the largest value in
the dataset — so the arcs are comparable across cells without a shared axis, which is the problem a
grid of small multiples normally has to solve with a common y-scale. The maximum is stated in the
commentary; it is not stated in the graphic, and it should be.

**The value is printed large in the centre of the cell**, and the arc is thin. Ferdio's own
commentary concedes the ordering: *"All data points are represented by a large number and the data
visualization is kind of secondary."* The encoding is a texture; the number is the reading. That is
an honest configuration for a six-cell matrix and it is worth naming as one.

**The unused remainder is drawn.** Each ring shows the empty portion in a pale grey, so the cell
carries "4 out of 15" rather than "4" — the denominator is visible in every cell.

**Colour identifies the column, not the value.** Sweden blue, Denmark red, Norway near-black, held
constant down both rows.

## What it does with style

Ferdio's near-white page, `stevie-sans`, row and column labels in a quiet grey, the cell number in a
heavy near-black at roughly twice the label size. The pixel route classifies the palette
**sequential** — an artifact of the site's blue header dominating the page shot.

## What is transferable

- **A matrix cell may hold a small chart rather than a fill**, and where it does, **give every cell
  the same declared maximum** so the cells are comparable without an axis.
- **Draw the remainder**, so each cell shows its denominator.
- **Say the maximum on the graphic.** This piece does not, and the arcs are uninterpretable without
  the sentence underneath.
- The honest concession: when the number is large and the encoding is thin, the encoding is texture.
  That can be the right choice; it should be a choice.

## What is this piece's own

`stevie-sans`, the three national colours, and the fixed dataset.

## What was not verified

- **Neither route reached the graphic** — same defect as the other four `100.datavizproject.com`
  records here. The pixel route measured `screenshot.png` (ground `#F4F7F7` at 44.8 %, top chromatic
  entry `#3274DA` at 9.3 % — the site's blue header bar); the style route's `graphic` box, 280 × 80
  at x = 80, y = 0, is the site wordmark. No colour share in `measured.json` describes this graphic.
- The ring stroke widths and the grey of the remainder arc were not measured.
- Whether the maximum of 15 is stated anywhere inside the graphic below the 900 px fold.
