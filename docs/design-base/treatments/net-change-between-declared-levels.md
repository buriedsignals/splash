# net-change-between-declared-levels

- kind: derived
- name: The difference between the beat's first and last declared level is drawn on the plate
- applies: the beat declares two or more absolute levels, so their difference is a value it already holds
- draws: value, annot
- priority: 8
- detect: the delivered artifact carries a mark spanning the first and last level marks, and a text
  run within one line-height of it naming their signed difference in the beat's own unit
- provenBy: proof/static-germany-electricity-bridge/renders/*.png

## The rule

Where a beat states two levels and the story is the distance between them, draw that distance.

## Why it needs no published precedent

The same reason `crossing-marked` needs none, and it was found the same way — by rendering a beat
through the design base and looking at what the plate did not say.

A bridge computes its own net change. `render-directions.mjs` already walks the steps and asserts
that the opening plus the deltas equals the closing, because a reader cannot catch a bad running
total by looking. That check produces a number, and the number was thrown away.

On the German electricity beat the title asserts **143 TWh de moins**, and the plate carries `639.2`
and `496.0`. The figure the headline rests on is nowhere on the graphic; the reader is asked to
subtract two labels that sit 900 px apart. Every reference in the waterfall family does the same —
Datawrapper, ONS, the IEA, Flourish all print their levels and leave the difference to the reader —
so there is nothing to import. This is not a practice observed elsewhere. It is a fact the beat
contains and does not show.

That is why the two-publication floor does not apply. The floor exists to stop a newsroom's HABIT
being copied without its logic (`doctrine/references/anti-patterns.md`, closing entry); applied to a
value the data holds, it refuses honest work — which is exactly what it did to `crossing-marked` for
a day (`METHOD.md`, correction 7).

## What limits it

**It is not a subtotal.** `subtotal-restated-as-a-full-bar` draws an intermediate level as its own
bar on the baseline; this draws the DISTANCE between the outer two. A beat with three levels has
both available and they answer different questions.

**And it says nothing about which levels matter.** The predicate takes the first and the last,
because that is the span a bridge is about. A beat whose story is the distance between its second
and third levels needs the levels declared in that order, or a different treatment.

## What it found the first time it was drawn

The three directed renders of the German bridge carried no statement of their own subject. The
component drew five bars, five values and five names, all correct, and the one number the title
promised was absent from every one of them — in all three directions at once, which is what makes
it a hole in the treatment set rather than a slip in one plate.
