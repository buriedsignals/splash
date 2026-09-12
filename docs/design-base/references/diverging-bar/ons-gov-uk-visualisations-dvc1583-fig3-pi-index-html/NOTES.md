# Office for National Statistics — dvc1583, Figure 3, private-industrial floorspace change

- url: https://www.ons.gov.uk/visualisations/dvc1583/Fig3/pi/index.html
- archive: search
- readAs: the **chart's own document** at 1440×900 — an ONS `visualisations/dvcNNNN/…/index.html`
  fragment, which is what the parent article embeds. `style.graphic.tag` is **`svg`** at
  `documentTop: 0`, `nearTheTop: true`; `routes.pixel.measuredFrom: "graphic.png"`.
  `style.typeSource` is **"the page, which contains the graphic — the two are not separated"**, and
  here that costs nothing: the document contains the chart and no furniture at all.
- **This artifact carries no title, no unit, no source and no caption.** All four live in the ONS
  article that embeds it, which was not read. The reading below is of the drawing only.

## What it is

Four rows of change in private industrial floorspace: an aggregate, `Total Private Industrial`, and
three components — `Factories`, `Warehouses`, `Oil, Steel, Coal`. Three run left of zero, one runs
right. The barest diverging bar in this family: four bars, an axis, and nothing else.

## What it does with information

**Colour encodes ROLE, not sign.** The aggregate is `#003C57` at 1.419 % — a near-black navy. The
three components are `#27A0CC` at 2.763 % — a mid cyan. `Factories` is positive and `Warehouses` is
negative and **both are the same cyan**; the aggregate is negative and is the only dark bar. So the
one colour decision on the plate separates a total from its parts, and the direction alone carries
the sign. (Our World in Data reaches the same place from the other side: one hue, sign by position.)

**Every number lives on the axis; no bar is labelled.** Ticks every 500 from `-3,000` to `2,000`,
each with its own full-height gridline in `#E5E5E5` (1.104 %) and `#CCCCCC` (0.657 %). The reader
measures rather than reads. This is the opposite of every other reference in this family, and it is
the one whose bars are shortest relative to its domain: at ≈ 8.9 units per pixel the four values read
as roughly `-680`, `+340`, `-460`, `-500`, so the data occupies about a fifth of a 5 000-unit axis
and **four fifths of the plate is range nothing reaches**.

**The zero is a tick like any other.** No emphasised rule, no separate weight: `0` is simply the
gridline the bars start from. Measured off `screenshot.png`, the `-3,000` tick is at x ≈ 495, the
`2,000` tick at x ≈ 1 050 and the `0` tick at x ≈ 827 — **59 % of the way across**, which is where a
`-3,000 … 2,000` domain puts it.

**Category labels are right-aligned into the axis**, two lines where needed (`Total Private /
Industrial`), so the label column has a hard right edge against the plot and the four rows read as a
list.

**Row order is aggregate-first, then components**, not sorted by value: the total is at the top and
the three parts follow. Where Statista and Datawrapper let time order the rows, this one lets
hierarchy do it.

## What it does with style

Ground `#FFFFFF` at 90.878 %; palette read as **sequential**, which is what a two-tone blue chart
with no second hue is. Only four chromatic entries exist in the whole record — `#27A0CC` 2.763 %,
`#003C57` 1.419 %, and two antialiasing tints at 0.019 % each. Furniture: `#E5E5E5` 1.104 % and
`#CCCCCC` 0.657 % (gridlines), `#666666` 0.540 % and `#6B6B6B` 0.325 % (axis text), `#9B9B9B`
0.209 %.

Type: **one tuple for the entire document** — Open Sans 14/400 in `rgb(0, 0, 0)`, 15 runs, sample
`-3,000`. Category names and axis numbers are the same size, the same weight and the same colour.
Nothing on this plate is typographically louder than anything else.

## What is transferable

- **Two tints of one hue can separate an aggregate from its components** while leaving the sign
  entirely to direction. It is a cheaper decision than two sign hues and it survives CVD, because
  the two tints differ in luminance rather than in hue.
- **A single type tuple is a legitimate answer** for an embedded chart whose title and source are
  the article's job. The furniture does not have to be in the picture.
- **And a domain the data does not fill is the cost of a fixed axis.** `-3,000 … 2,000` for values
  spanning roughly `-680 … +340` leaves the bars small and the comparison weak; whatever the axis was
  fixed to (a sibling figure, most likely) is not visible from inside this document, which is exactly
  why it reads as an error here.

## What was not verified

The unit is unknown — the path segment `pi` and the category names suggest private industrial
floorspace, and the axis carries no unit at all. The four values above are read off the pixels at
the axis's own scale and are approximate to about ±10 units; no bar is labelled, so no exact value
is recoverable from this artifact. The parent ONS article was not read, so the title,
the source, the period and the reason for the `-3,000 … 2,000` domain are all unverified. Whether a
sibling figure at `dvc1583/Fig3/…` shares the axis was not checked. One publication.
