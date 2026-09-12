# Ferdio — "1 dataset. 100 visualizations." #100

- url: https://100.datavizproject.com/data-type/viz100/
- archive: datavizproject
- type: table with in-cell bars (matrix), 4 rows × 4 measures
- export: static
- readAs: the rendered page at 1440 × 900, the graphic read by eye off `screenshot.png` because
  neither route isolated it (see **What was not verified**)

## What it is

The archive's hundredth and plainest encoding: a table. Columns `2004`, `2022`, `Change`, `in %`;
rows the three countries, identified by flag rather than by name; a fourth `Avg.` row beneath. Every
cell prints its number and draws a small bar under it. Ferdio: *"A table giving an overview … In the
table, bar charts have been included to visualize the values."*

## What it does with information

**Number and bar in the same cell.** The number answers "how much"; the bar answers "how much
compared to the others in this column", and the reader gets both without leaving the cell. It is the
same repair as printing values on a heatmap, run the other way round: start from the table and add
the encoding.

**Each column has its own bar scale.** `150%` in the `in %` column draws a bar the full width of its
column while `6` in the `Change` column draws a short one — the bars are comparable down a column
and meaningless across one. That is correct for a table of unlike measures and it is a trap: nothing
in the graphic says the scales differ, and a reader comparing a `Change` bar to an `in %` bar is
misled.

**The summary row is drawn in neutral.** `Avg.` carries grey bars where the country rows carry their
own hues, so the aggregate is visibly not a fourth country. The row is also labelled in words rather
than by a flag, breaking the identifier pattern deliberately.

**Colour identifies, it does not measure.** Denmark red, Norway near-black, Sweden blue, average
grey — one hue per row, constant across all four columns, so the eye can follow a country across the
table.

## What it does with style

Ferdio's `#F4F7F7` page and `stevie-sans`; column heads in a light grey, values in near-black bold,
hairline rules between rows and one above the head. The pixel route classifies the palette
**sequential**, which is an artifact of the page's own blue chrome dominating the measurement rather
than a reading of the table.

## What is transferable

- **Number and bar in the same cell**, when a table's rows are few enough to draw.
- **Draw an aggregate row in neutral** so it cannot be mistaken for another member. (This is the
  existing `context-in-neutral-at-the-subject-scale` treatment, met in a table.)
- **One hue per row, constant across columns**, so a reader can track an entity across measures.
- The trap to detect: **per-column bar scales that are not declared.**

## What is this piece's own

`stevie-sans`, the flags, and the fixed dataset.

## What was not verified

- **Neither route reached the graphic** — same defect as the other four `100.datavizproject.com`
  records here. The pixel route measured `screenshot.png`, whose top chromatic entry `#3274DA` at
  8.8 % is the site's blue header bar; the style route's `graphic` box (280 × 80 at x = 80, y = 0) is
  the site wordmark. No colour share in `measured.json` describes this table.
- Whether the bar scales are in fact per-column was inferred from the drawn widths against the
  printed values, not from any statement on the page.
- The hexes of the row colours were not sampled.
