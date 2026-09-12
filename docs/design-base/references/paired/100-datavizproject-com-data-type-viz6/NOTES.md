# 100 datavizproject — #6, one bar split at the earlier value

- url: https://100.datavizproject.com/data-type/viz6/
- archive: datavizproject
- type: single bar per entity, marked at the earlier value (a "two-stop" bar)
- export: static
- readAs: the encoding as the page draws it, read at rest, from the page screenshot

## What it is

Three rounded bars, one per country, each running from a common left edge to its **2022** value. A
disc part-way along each bar marks the **2004** value, and the bar is drawn in two inks: the segment
up to 2004 at full saturation, the segment beyond it in a lighter tint of the same hue. Both numbers
sit in discs on the bar. The country is named at the left with its flag; the two dates are labelled
once, under the longest bar, with leader lines to the two discs.

## What it does with information

**There is one mark, not two, and the change is a part of it.** The bar is the 2022 value; the growth
is the piece of it past the 2004 stop. Nothing has to be subtracted by eye, and the "before" is
visibly contained in the "after".

**The base is the accent and the addition is the tint** — the opposite polarity to #3, on the same
page of the same project. Read across the two, what is stable is not *which* part is darker but that
**the pair is one hue at two strengths**; which strength lands on which state is a separate decision.

**The date key is drawn once, on one bar, with leaders** rather than repeated on all three. It is a
legend placed inside the plot at the only place it is needed.

## What it does with style

The house drawing: white card on a pale `#F4F7F7` page, blue `#3274D8` (216°), red `#EE5440` (7°),
near-black ink `#283250`; the pixel route reads the card as **diverging, two poles**. Those figures
are from a **crop** of `screenshot.png` at `308,172,824,728`.

**The record's own pixel and style numbers are the SITE, not the chart.** `largestGraphic` picks the
DVP logo (`svg` 280 × 80 at `y: 0`), so `measured.json` describes the page — a 45/45 ground split and
the blue header bar as "chromatic" — and the style route sees only site chrome. The chart is a raster
and neither route reaches it.

## What is transferable

- **When both states share a zero, draw one mark and split it at the earlier value.** The change
  becomes a segment rather than a gap, and a comparison the reader had to make becomes something they
  can just see.
- **Label a repeated key once, on the instance where there is room**, with leaders.

## What is this piece's own

The flags as identity marks; the fully-rounded bar caps; the house triad.

## What was not verified

Whether the bars are on a shared scale across the three rows — they share a left edge and the values
are printed, but the pixel lengths were not measured against them.
