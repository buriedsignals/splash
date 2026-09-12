# Ferdio — "1 dataset. 100 visualizations." #77

- url: https://100.datavizproject.com/data-type/viz77/
- archive: datavizproject
- type: matrix, criterion × pairing, binary cells
- export: static
- readAs: the rendered page at 1440 × 900, the graphic read by eye off `screenshot.png` because
  neither route isolated it (see **What was not verified**)

## What it is

A four-row, three-column matrix of head-to-head verdicts. Rows are criteria —
`Most in 2004`, `Most in 2022`, `Biggest change`, `Biggest % change`. Columns are the three possible
pairings, each headed by two flags with `vs.` between them. A cell holds a single dot.

## What it does with information

**Position inside the cell is the encoding.** The dot sits on the left or the right of a dotted
centre line, on the side of whichever country wins that criterion — and it is filled in that
country's own colour, so the answer is legible twice. A binary value drawn as a position rather than
as a fill: the cell has an internal axis.

**The dotted centre line is the only furniture inside a cell**, and it is what makes "left" and
"right" mean anything. Remove it and the dots become an unreadable scatter.

**Each column is a self-contained comparison**, separated by full-height hairlines, so the matrix
reads as three small charts sharing a row axis rather than as one field.

**No magnitudes anywhere.** The piece answers only "which", never "by how much" — a deliberate
reduction, and the archive holds `#96` for the reader who wants the margin.

## What it does with style

The pixel route reports a `#FFFFFF` ground at 45.1 % of the page shot and classifies the palette
**sequential**; both figures describe the page, not the graphic. By eye the graphic is a white
field, a light grey grid, three saturated dot colours (blue, red, near-black), and Ferdio's
`stevie-sans` for row labels in a mid grey.

## What is transferable

- **Encode a binary outcome as position within the cell**, against a drawn centre line, rather than
  as a fill. It reads faster than a two-colour fill and it does not consume the palette.
- **Reinforce the position with the winner's own colour** so a colour-blind reading still works off
  the geometry and a monochrome reading still works off the position.
- **Separate the columns of a comparison matrix with full-height rules** when each column is its own
  self-contained question.

## What is this piece's own

The flags, `stevie-sans`, and the fixed dataset.

## What was not verified

- **Neither route reached the graphic** — same defect as the other four `100.datavizproject.com`
  records here: the pixel route measured `screenshot.png` (top chromatic entry `#3274DA` at 8.6 %,
  the site's own header bar), and the style route's `graphic` box is the site wordmark, 280 × 80 at
  x = 80, y = 0.
- The dot colours were not sampled; they are named by eye.
- Whether the dotted centre line is dotted or dashed at full resolution.
