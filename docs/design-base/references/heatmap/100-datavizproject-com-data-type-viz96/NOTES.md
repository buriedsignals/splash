# Ferdio — "1 dataset. 100 visualizations." #96

- url: https://100.datavizproject.com/data-type/viz96/
- archive: datavizproject
- type: matrix diagram, pairwise, triangular
- export: static
- readAs: the rendered page at 1440 × 900, the graphic read by eye off `screenshot.png` because
  neither route isolated it (see **What was not verified**)

## What it is

A pairwise comparison matrix. Both axes carry the same six items — three countries × two years —
and each cell answers "which of this pair has more?" by showing the winner's flag, with the size of
the difference printed beneath it (`+4`, `+11`, `+10`, `+9`). Ferdio's own description: *"In a matrix
diagram, we compare all data points, country and year, and display the countries which has the
most."*

## What it does with information

**Only half the matrix is drawn.** The cells form a staircase — five cells in the top row, four,
three, two, one — because a symmetric comparison stated twice says the same thing twice. The
triangle is not a stylistic crop; it is the shape the comparison actually has, and drawing the full
square would double the ink and add nothing.

**The cell carries two encodings at two ranks.** The winner is the flag, read at a glance; the
margin is a small grey number under it, read on inspection. The reader gets the answer first and the
magnitude second, which is the order the question is asked in.

**Both axes are labelled by the mark itself.** The row and column headers are the same flags that
fill the cells, so no legend maps a symbol to a country. The year grouping is carried by a bracket
above and beside — `2004`, `2022` — with the current group in a grey pill.

**The empty half is left empty**, unfilled and unruled: the absence of the mirror cells is visible
and therefore explained.

## What it does with style

Ferdio's near-white page, `stevie-sans` for the furniture, a light grey grid with hairline cell
borders. There is no chromatic encoding at all — the flags carry their own national colours, and the
margin numbers are set in a grey that recedes.

## What is transferable

- **Draw half a symmetric matrix.** Where the cell function is `f(a, b) = −f(b, a)`, the lower
  triangle carries everything.
- **Two encodings at two ranks inside one cell** — the answer as a mark, the magnitude as a small
  number under it.
- **Label an axis with the mark it contains** where the mark is already an identifier the reader
  holds, so the key is unnecessary.

## What is this piece's own

The flags, `stevie-sans`, and the fixed dataset.

## What was not verified

- **Neither route reached the graphic**, exactly as on the other four `100.datavizproject.com`
  records here: the pixel route measured `screenshot.png` (its top chromatic entry `#3274DA` at
  9.1 % is the site's own blue header bar), and the style route's `graphic` box is the site
  wordmark, 280 × 80 at x = 80, y = 0. No colour share in `measured.json` describes this graphic.
- The colour of the margin numbers was not sampled; "grey" is a reading by eye.
- Whatever sits below the 900 px fold.
