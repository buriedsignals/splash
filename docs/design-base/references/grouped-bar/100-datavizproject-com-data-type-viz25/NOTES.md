# Ferdio / 100.datavizproject.com — #25, a grouped column with no frame at all

- url: https://100.datavizproject.com/data-type/viz25/
- archive: datavizproject
- type: grouped column chart — 3 series (Norway, Denmark, Sweden) × 2 categories (2004, 2022)
- export: static raster (`img` 823 × 823) served in the page
- readAs: `graphic.png`, the piece's own plate, picked by the harvester at `documentTop` 172 and
  photographed at 824 × 823. Both routes `ok`; `routes.pixel.measuredFrom === "graphic.png"`.
  `style.typeSource` is **"the page only — the graphic is a raster and carries no type this route
  can read"**, so nothing below claims to know the graphic's typefaces.

## What it is

One of a hundred encodings of the same dataset — UNESCO World Heritage sites in Denmark, Norway and
Sweden, 2004 against 2022 — drawn here as the textbook grouped column: two groups of three bars,
`5 4 13` in 2004 and `8 10 15` in 2022, on a shared vertical scale.

## What it does with information

**The chart has no frame.** No value axis, no tick labels, no gridlines, not even a baseline rule.
The bars simply stand on an implied line, and every one of the six carries its own number. Removing
the axis is affordable precisely *because* every bar is labelled; the axis exists to let a reader
estimate a length, and nothing here has to be estimated.

**The value label sits inside the foot of the bar, in white on the fill.** Not above the cap, not
outside — at the bottom, where the six labels align into a single horizontal row that reads as its
own baseline. That row is what replaces the missing axis rule.

**The legend has been dissolved into the groups.** Instead of one key placed once, the three
national flags are repeated under *every* group, directly beneath their own bar. Both comparisons
this type exists for — within a group and across groups — are then served without the reader ever
looking away from the geometry. It costs one duplicated row of icons; it buys the elimination of the
back-and-forth that a single legend forces.

**Series order and colour are identical in both groups** — Norway navy, Denmark red, Sweden blue,
left to right, twice. That is the mechanism the whole type runs on, and it is obeyed here without
comment.

**Bars within a group touch; the gap between groups is roughly one bar wide.** The eye parses two
objects first and three bars second, which is the correct reading order for this form.

## What it does with style

Measured on `graphic.png` (`record.pixel`): ground `#FFFFFF` at **87.849 %**. Chromatic
`#3274D8` at **5.696 %** (216°) and `#EE5440` at **2.716 %** (7°); the palette shape is reported
**diverging**, with clusters at 216° (5.861 %, 9 members) and 7° (3.086 %, 13). Among the neutrals,
`#283250` at **2.325 %** — that near-black navy is Norway's fill, and it is filed as a neutral
rather than a chromatic because its chroma is low.

That is the interesting fact about this palette: **the third series is drawn in a near-neutral.**
Two chromatic hues plus one dark neutral, and the dark neutral is placed *first* in every group so
that the two blue-family members (navy and `#3274D8`) never sit next to each other — the warm red
is always between them. The reference type's stated trap is two warm or two cool members touching;
this plate avoids it by ordering, not by choosing different hues.

The remaining chromatics are antialiasing tails of the same three fills (`#E04A3E` 0.242 %,
`#548BDF` 0.057 %) plus `#EDCB41` at 0.063 % — the yellow cross in the Swedish flag icon.

## What is transferable

- **Label every bar and the value axis becomes optional.** Where a grouped chart has few enough
  bars to label them all, the axis, its ticks and its gridlines can go.
- **Put the value label inside the foot of the bar**, so the labels align into a row that does the
  baseline's work.
- **Repeat the series key under each group instead of placing one legend once**, when the group
  count is small. The reader never leaves the geometry.
- **Order the series so that two members of the same hue family are never adjacent**, separating
  them with the third. This is a placement decision, not a palette decision, and it is free.

## What is this piece's own

The national flag icons as the series key, and Ferdio's house blue / coral / navy triple.

## What was not verified

The graphic's typography — the record's `style.type` is the *page's*, and `style.typeSource` says so
outright. The exact within-group and between-group gap widths (read by eye off an 824 px plate, not
measured). Whether the missing axis is a deliberate rule of this piece or an accident of its size.
One publication.
