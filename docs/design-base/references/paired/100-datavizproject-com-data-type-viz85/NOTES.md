# 100 datavizproject — #85, the same axis drawn twice

- url: https://100.datavizproject.com/data-type/viz85/
- archive: datavizproject
- type: dot strip — one ruled axis per date, entities pinned on it, with travel leaders between
- export: static
- readAs: **re-harvested 2026-09-09** at the piece's own chart card, an 823 x 823 `<img>` at the
  top of the page, photographed whole. The first reading, from the page screenshot, is preserved
  below where it differs.

## What it is

Two horizontal rules, one labelled **2004** and one **2022**, drawn one above the other with
**identical scales** (0 to 20, ticked every unit, labelled every five). On each rule, a map-pin
carrying the country's code, in that country's colour. Between the two rules, dotted leaders travel
from each pin's 2004 position to its 2022 position, and the percent change is printed on the leader
in the country's own colour.

## What it does with information

**Two states are drawn as two instances of one axis, rather than as two marks on one axis.** Nothing
is stacked or offset; each date gets a clean, complete, identically-scaled rail of its own, and the
comparison is made by the leader that crosses between them.

**The identical scale is the whole honesty of it.** Two rails at different scales would be two
pictures; here the same tick means the same thing on both, so a pin that has moved right has really
grown.

**The delta rides the leader, in the entity's colour**, halfway down the travel — attached to the
movement rather than to either endpoint.

**Overlap is solved by the pins, not by jitter.** DK and NO nearly collide at 4 and 5 in 2004; the
pins stack at different heights and keep both readable.

## What it does with style

The house drawing: white card on a pale `#F4F7F7` page, blue `#3274D8` (216°), red `#EE5440` (7°),
near-black ink `#283250`; the pixel route reads the card as **diverging, two poles**. Those figures
are from a **crop** of `screenshot.png` at `308,172,824,728`.

**On the re-harvest the pixel route reached the CHART, which is the exception in this pool.**
`largestGraphic` returned the 823 x 823 chart card rather than the site's wordmark, so
`measured.json` now describes the encoding: ground `#FFFFFF` at **95.6 %**, chromatic `#0F76EA`
(212°) and `#EE5440` (7°) at 0.41 % each, ink `#283250` at 0.41 %, and the rails as `#EAEFEF` at
1.9 %. The figures in the paragraph above are from the first reading's crop and are kept because they
agree.

**The type figures are still the SITE's.** The chart is a raster, so the style route reaches only
Ferdio's page chrome (`stevie-sans`, `Borgia Pro`). Nothing in this note rests on them.

## What is transferable

- **Draw the axis once per state, identically, when the two states are far enough apart that one
  axis would tangle.** It costs vertical space and buys an uncluttered reading of each state on its
  own.
- **Label the change on the leader between them**, in the entity's colour, so the number belongs to
  the movement.
- **Draw the strip as a ruled axis with ticks, not as a bare line** — a light band with the ticks cut
  into it, numbers every five. A position converts to a number without a field of gridlines behind
  the marks, which is the whole reason to spend a strip rather than a scatter. *(second reading)*
- **The chip is what makes a mark findable and the STEM is what keeps it honest**: a chip is wider
  than the value it stands for and would otherwise blur the reading by its own width. Identity is on
  the mark and there is no legend anywhere on the plate. *(second reading)*
- **Stack the dates so time reads downward**, and let the two date labels be the only thing that says
  so. *(second reading)*

## What is this piece's own

The map-pin marker; the house triad.

## Why this record was read twice

The catalogue counted **zero** references for `dot strip` while this record — a dot strip, described
accurately — sat in the corpus under `paired`, filed with a `type:` line that named its geometry
("two parallel number lines") rather than its form. The counter reads the `type:` line, so the form
looked unevidenced and the harvest was ordered for a reference the base already held. The line now
names the form; the second reading is kept because it reached the chart's own pixels, which the first
did not.

## What was not verified

Whether the two rails' pixel scales are genuinely identical — they carry identical tick labels, and
the tick spacing looks equal, but this was read by eye rather than measured.
