# ONS — "How each division contributed to the change in CPIH, November → December 2024"

- url: https://www.ons.gov.uk/visualisations/dvc3148/fig02/index.html
- archive: url-list (found from the ONS Digital blog post announcing the transformed CPI preview,
  which says waterfall charts were tested with users; the chart itself is the `fig02` frame of the
  December 2024 CPI bulletin's chart bundle `dvc3148`. Not a line of the alive-urls file.)
- readAs: the standalone chart document at 1440×900 — the file ONS embeds into its own bulletin, so
  the whole page IS the graphic. `style.graphic` is an `svg` 700×561 at `documentTop: 62`;
  `routes.pixel.measuredFrom: "graphic.png"`. The `<img class="fallback">` alt text in the source
  names the form: *"A waterfall chart showing how each division contributed to the change in CPIH in
  November / December 2024"*.

## What it is

A **vertical** contributions bridge. `November CPIH 3.5%` at the top, twelve COICOP divisions as
rows, `December CPIH 3.5%` at the bottom. The two totals are equal: the chart's subject is that a
headline which did not move is the sum of twelve movements that cancelled.

## What it does with information

**The step is an arrow, not a bar.** Each division is drawn as a horizontal arrow whose length is
its contribution and whose head points in the direction of the effect — right for a rise, left for a
fall. A bar would have needed a fill and a baseline; an arrow carries magnitude *and* sign in one
mark and needs neither.

**Its CPI twin was read and is deliberately not filed** — see *What was not verified*. What that
twin shows, and this record cannot show alone, is that the row order is chosen **per chart, from the
answer**: CPIH ended flat and its rows run rises-first, descending and returning; CPI ended down by
0.1 and its rows run falls-first, so the walk travels toward the result. Same template, same type,
same palette, one decision changed.

**The rows are sorted by signed contribution, largest positive first.** Transport `+0.05`,
Housing `+0.04`, Miscellaneous `+0.03`, Communication `+0.02`, then three zeros, then Food `−0.01`
down to Restaurants and hotels `−0.06`. There is no natural sequence among COICOP divisions, so the
sort *is* the story order — this is the case in which the form's usual rule (never resort by
magnitude) is wrong, because the sequence carries no meaning to destroy.

**A zero contribution is drawn as a grey dot and labelled `0.00`.** Furniture, Health and Education
have no arrow, so instead of the gap that the IEA natural-gas record in this family leaves, ONS puts
a `#727173`-family dot on the row's rule with the value beside it. Nothing about the row reads as
missing.

**The endpoints are open circles on a magenta stem.** `#871A5B` at 0.039 % — the only appearance of
that hue on the plate — marks `November CPIH` and `December CPIH` with a ring, not a bar, so the two
absolute levels are visually a different kind of object from the twelve deltas.

**Every step is labelled with its signed value, outside the arrow, in the arrow's own colour**, and
the label sits on the side the arrow points away from, so it never overlaps the head.

**The dashed grey connector runs vertically** from each arrow's head down to the next arrow's tail,
which is what makes a vertical bridge legible: the eye tracks a single descending staircase.

## What it does with style

Ground `#FFFFFF` at **93.55 %** — a very quiet plate; the whole chart is line work. Palette read as
**diverging**: rises `#206095` at 0.148 % (ONS's house blue) with its antialias `#8FAFCA` 0.082 %,
falls `#22D0B6` at 0.133 % with `#90E7DB` 0.117 % and `#1BA590` 0.076 %, endpoints `#871A5B`
0.039 %. Furniture: row rules `#ECECEC` at 2.262 % — more coverage than every coloured mark
combined — and label ink `#424143` at 0.520 %, with `#727173` 0.213 % for the muted zero markers.

Type is `Open Sans`: 14/400 for the 19 category and legend runs (sample `Increase`), 14/600 for the
16 value and total runs (sample `3.5%`), 16/400 for the source line in `rgb(112, 112, 113)`.

**The value labels are heavier than the category labels.** 600 against 400, same size — the numbers
are what the reader is here for.

## What is transferable

- **A vertical bridge with one row per category** when the categories are a list rather than a
  sequence, and their names are long. No rotation, no truncation, no fight for horizontal room.
- **An arrow instead of a bar** for a signed step: magnitude and direction in one mark.
- **Draw a zero step as a dot and print `0.00`.** The row then reads as measured rather than
  missing — the exact failure the IEA natural-gas chart in this family demonstrates.
- **Endpoints as open rings in a third hue**, so a level is never mistaken for a delta.
- **Sort by signed value when the categories have no sequence of their own**, and keep story order
  when they do.
- **Value labels one weight heavier than category labels.**

## What was not verified

**The sibling record was harvested, looked at, and then removed.** `fig06/index.html`, the CPI
version of this chart, was harvested successfully and reached its graphic. It was deleted rather
than filed because `two-records-that-agree-exactly-are-both-wrong` fired on the pair: the two frames
share `#424143` at **0.520 %**, `#3670A0` at 0.03 % and `#2B689A` at 0.02 % — identical to five
decimals. The cause is not site contamination; it is that the two figures carry the *same twelve
category labels, the same legend and the same source line, laid out identically*, so their ink layer
is the same object photographed twice. The guard cannot tell that from the failure it was written
for, and it is right not to try. What the twin taught is recorded above; the record is not kept.
Its endpoint rings are drawn in the blue family rather than this chart's magenta `#871A5B`, an
inconsistency between two figures on one page that nothing on either plate explains.

The legend (`Increase` / `Decrease`, per the 14/400 type sample) lives in a `#legend` div outside the
photographed `<svg>` and was not read as pixels. The `0.00` rows may be rounded from small non-zero
values; the chart does not say. The bulletin page that embeds this frame was read only far enough to
find the frame url. The arithmetic (four rises of +0.14 against five falls of −0.20 landing on an
unchanged 3.5 %) is consistent with a rounded headline but was not reconciled against the ONS series.
