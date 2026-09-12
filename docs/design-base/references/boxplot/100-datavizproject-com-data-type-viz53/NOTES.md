# 100 datavizproject — #53, the violin's silhouette carrying two numbers

- url: https://100.datavizproject.com/data-type/viz53/
- archive: datavizproject
- type: mirrored silhouette — one bilaterally symmetric filled shape per category, width encoding
  the value at each of two dates, with a central annotation at the waist
- export: static raster (`img`, 823 × 823, `documentTop` 172, `nearTheTop: true`)
- readAs: the graphic as the page draws it, at rest
- routes: style `ok`, pixel `ok` (`measuredFrom: "graphic.png"`), no consent dialog, no entry click

## What it is

**A violin's geometry with no distribution inside it.** The shape is exactly what a violin plot
draws — a filled silhouette mirrored about a vertical axis, its width at any height encoding a
quantity — but the quantity it encodes is two values, 2004 and 2022, with the taper between them
invented by interpolation. The archive's own caption calls it a bar chart with the bars centred.

That makes it the one reference in this family that shows **how a violin's silhouette is finished**
— capped, labelled, annotated — without any claim about the honesty of the shape between the caps.
The shape between the caps here is decoration, and the piece is filed with that said out loud.

## What it does with information

**Each end of the shape is a solid cap carrying its own value in white, and the caps are darker than
the body.** `13` and `15` for Sweden, `4` and `10` for Denmark, `5` and `8` for Norway. The two
things actually measured are the two things drawn hard; everything between them is a lighter tint.

**The date labels sit outside the shape, level with the caps** — `'04` on the upper left, `'22` on
the lower left — so the mark itself carries values and the margin carries the reading order.

**The waist carries the change, in a dark pill, in ink rather than in the category's hue.**
`+15.4 %`, `150 %`, `60 %`. The derived statistic is placed at the narrowest point of the shape,
where it has room and where a median line would sit on a box plot, and it is deliberately *not*
drawn in the entity's colour.

**Categories are named above their shapes in mixed case** (`Sweden`, `Denmark`, `Norway`), and the
three shapes are stacked vertically with no shared axis at all — there is no value scale on this
plate. Width is the only encoding, and it is uncalibrated.

## What it does with style

Measured on this record's own `graphic.png` (`pixel.ground`, `pixel.chromatic`, `pixel.neutral`):

- ground **`#FFFFFF` at 80.077 %** — the shapes are heavy, and this is the least paper of any
  record in this family.
- **Each entity is one hue at two lightnesses, the darker on the caps:**
  Sweden **`#3274D8` (4.18 %) caps over `#5495EC` (5.51 %) body**;
  Denmark **`#EE5440` (1.963 %) caps over `#F6988C` (2.563 %) body**;
  Norway **`#283250` (1.81 %) caps over `#7A8092` (2.306 %) body** — this last pair filed under
  `pixel.neutral` rather than `pixel.chromatic`, below the route's chromatic floor, the same
  misclassification `…viz15` records.
- **the pills are near-black: `#141C2E` (0.213 %) and `#0F1C33` (0.132 %)** — a fourth ink that
  belongs to no entity.
- `pixel.clusters` reports two, at **214°** (9.849 % of the frame) and **7°** (4.738 %), and
  `pixel.shape` `diverging`; the third entity is again invisible to the classifier.

**The body is never the same value as the cap, and never a different hue from it.** Three entities,
three hues, six fills, one rule: lighter = the interpolated part, darker = the measured part.

## What is transferable

- **One hue at two lightnesses, the darker carrying the harder statement.** The exact device a box
  plot needs when an interquartile box sits inside a whisker range, or a 50 % band inside an 80 %
  one.
- **The stated ends carry their own numbers, inside the mark, in white on the darker tint** — no
  leader line, no axis lookup, no legend.
- **A derived central statistic in ink, in a pill, at the waist** — a median or a change put where
  the reader is already looking and deliberately not coloured as the category.
- **The silhouette is symmetric and closed**, so the eye reads one object per category rather than
  two opposed bars.

## What is this piece's own

Ferdio's triad and house sans; and the interpolated taper, which encodes nothing and would be a lie
on real distribution data.

## What was not verified

- **The graphic is a raster `img`, so its own lettering was never read.** `record.style.type` here is
  the *host page's* furniture (`stevie-sans`, `Borgia Pro`, Ferdio's site chrome); it describes the
  archive's article shell, not one label on this chart. No type is quoted above.
- **Whether the pill's near-black is one colour or two.** The record carries `#141C2E` and
  `#0F1C33` at 0.213 % and 0.132 %; three pills at this size could be one fill plus its antialias,
  or two. Not resolved.
- **One publication.** This record and `…viz15` are one desk and one dataset (`METHOD.md`,
  correction 4).
