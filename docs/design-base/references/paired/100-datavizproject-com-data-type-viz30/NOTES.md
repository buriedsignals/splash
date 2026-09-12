# 100 datavizproject — #30, the change as a countable run on a shared rail

- url: https://100.datavizproject.com/data-type/viz30/
- archive: datavizproject
- type: unit grid, one row per entity, with the interval between the two states inked
- export: static
- readAs: the encoding as the page draws it, read at rest, from the page screenshot

## What it is

Three rows, one per country, each a rail of **fifteen numbered cells** — the same fifteen in every
row. The cells from the country's 2004 value to its 2022 value are inked in that country's hue; the
two endpoint cells are the hue at full strength and the cells between them are a tint; the endpoints
carry `'04` and `'22` inside them. Every other cell is left in the neutral grey `#D0D9DB`, which
the pixel route measures at **10.9 %** of the card. Above each inked run, the absolute change:
`+3`, `+6`, `+2`.

## What it does with information

**The change is a number of things, and the reader can count them.** Not a length to estimate, not a
gap to subtract — three cells, six cells, two cells.

**The rail is identical in all three rows, so the entities are comparable as well as their changes.**
Sweden's run sits at 13–15 and Denmark's at 4–10; the picture says at once both that Denmark grew
more and that Sweden is still ahead. Most paired forms give up one of those.

**The unfilled cells are furniture, not absence.** They are the same shape and the same grid, in
grey; they make the position on the rail readable rather than leaving the run floating.

**The delta is stated in units, not percent** — `+6`, not `+150%` — which is the honest register
for a countable rail. Both readings are true; the encoding chooses one and the label agrees with it.
Checked against the printed endpoints: 5→8 is +3, 4→10 is +6, 13→15 is +2.

## What it does with style

The house drawing: white card on a pale `#F4F7F7` page, blue `#3274D8` (216°), red `#EE5440` (7°),
near-black ink `#283250`; the pixel route reads the card as **diverging, two poles**. Those figures
are from a **crop** of `screenshot.png` at `308,172,824,728`.

**The record's own pixel and style numbers are the SITE, not the chart.** `largestGraphic` picks the
DVP logo (`svg` 280 × 80 at `y: 0`), so `measured.json` describes the page — a 45/45 ground split and
the blue header bar as "chromatic" — and the style route sees only site chrome. The chart is a raster
and neither route reaches it.

## What is transferable

- **Where the quantity is small and countable, give every possible unit a cell and ink only the
  interval.** The change becomes an integer the reader can verify.
- **Keep the rail identical across rows** so the picture answers "who changed most" and "who is
  biggest" at the same time.
- **Match the label's unit to the encoding's unit.** A counted rail wants `+6`, not `+150 %`.

## What is this piece's own

The house triad; the abstract country monograms.

## What was not verified

Why the rail stops at fifteen — presumably the dataset's maximum, but nothing on the picture says so.
