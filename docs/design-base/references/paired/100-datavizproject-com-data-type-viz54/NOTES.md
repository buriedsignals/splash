# 100 datavizproject — #54, the slope chart with the change printed at the end

- url: https://100.datavizproject.com/data-type/viz54/
- archive: datavizproject
- type: slope chart (two dated rails, one line per entity)
- export: static
- readAs: the encoding as the page draws it, read at rest, from the page screenshot

## What it is

Three countries, two observations each (2004, 2022), drawn as three straight two-point lines between
two vertical rails. A value axis on the left (0, 5, 10, 15); each rail is capped by a dark chip
carrying its date. At the right end of every line: the country name in ink, then its percent change
in bold — `Sweden +15.4%`, `Denmark +150%`, `Norway +60%`.

## What it does with information

**The slope carries the direction; the printed number carries the magnitude.** A reader who only
looks sees three rising lines and one much steeper than the others. A reader who reads gets the
size. Neither is asked to measure a gap against an axis.

**The percentages are the beat'"'"'s own arithmetic and they check out** against the values #17 prints
for the same dataset: 4→10 is +150 %, 13→15 is +15.4 %, 5→8 is +60 %.

**The date is a chip on the rail, not an axis tick.** The two states are named where the marks
begin and end, so no legend is needed and nothing has to be carried across the picture.

**Ranking is not preserved and is not claimed.** Denmark and Norway cross; the chart lets them,
because the y position is the value and the crossing is the finding.

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

Type in the graphic could not be read at all — see above.

## What is transferable

- **Print the change at the end of the line**, beside the entity'"'"'s name, in the same block. The
  slope shows which way and roughly how fast; the number closes it.
- **Cap each rail with its own date.** Two dated rails replace an x axis, a legend and a caption.
- **Let the lines cross.** A slope chart that avoids crossings is hiding its own finding.

## What is this piece'"'"'s own

The house blue/red/ink triad; the tooltip-shaped date chips.

## What was not verified

Whether the y axis starts at zero on the drawing itself (0 is printed, but the crop was not measured
against the pixel positions). Whether the percentages are computed or typed. Nothing about the
underlying UNESCO data — this note describes the encoding, not the claim.
