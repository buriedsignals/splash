# 100 datavizproject — #17, the slope chart drawn on RANK

- url: https://100.datavizproject.com/data-type/viz17/
- archive: datavizproject
- type: rank slope (bump chart with two columns)
- export: static
- readAs: the encoding as the page draws it, read at rest, from the page screenshot

## What it is

The same three countries and two dates as #54, but the vertical position is **rank** (1, 2, 3), not
value. Each endpoint is a filled disc with its **value printed inside it**; the country name sits at
the right, in that country'"'"'s own colour. Denmark and Norway swap places and their two lines cross.

## What it does with information

**Two variables in one mark: rank by position, value inside the disc.** The reader gets the
ordering from the layout and the quantity from the label, and the picture never has to choose.

**The crossing IS the story, and rank is the encoding that makes it unmissable.** On #54, the same
swap is a small crossing near the bottom of a value axis. Here it is the whole middle of the frame.
Choosing rank over value is choosing which change the picture is about.

**Colour belongs to the entity, not to the date.** Both ends of a line share one hue. Compare #19,
where the same desk gives colour to the two dates instead — the family'"'"'s one real fork.

**The entity is named at the right end, in its own colour**, so the label is the legend. That is
the treatment already filed as `direct-end-label-in-the-series-colour`.

## What it does with style

The house drawing: a white card on a pale `#F4F7F7` page, one blue `#3274D8` (216°), one red `#EE5440`
(7°), one near-black ink `#283250`, and the pixel route reads the card as **diverging, two poles**
(216° and 7°) on every one of the eight Ferdio pieces in this family. Those figures come from a
**crop** of the card, not from the record.

**The record's own pixel numbers are the SITE, not the chart, and this is a defect worth naming.**
`largestGraphic` picks the largest `<svg>` on a `100.datavizproject.com` page, and that is the DVP
**logo** in the header — 280 × 80 at `y: 0`. So `measured.json` reports the page (ground split 45 %
`#FFFFFF` / 45 % `#F4F7F7`, "chromatic" `#3274DA` at ~8.6 %, which is the blue header bar) and the
style route reports only the site chrome (`stevie-sans`, `Borgia Pro`). **The chart is a raster and
neither route reaches it.** Every measurement about the drawing in this note was read off a crop of
`screenshot.png` at `308,172,824,728`, stated as such.

## What is transferable

- **Encode rank, not value, when the reordering is the finding** — and print the value inside the
  mark so nothing is lost by doing so.
- **Put the number inside the mark** where the mark is a disc big enough to hold it: no leader, no
  second element, and the value cannot be separated from what it belongs to.

## What is this piece'"'"'s own

The house triad; hairline rules between the rank bands.

## What was not verified

Whether the disc radius means anything (it appears constant, but was not measured). Whether ranks
are dense or competition-ranked when values tie — no tie occurs here.
