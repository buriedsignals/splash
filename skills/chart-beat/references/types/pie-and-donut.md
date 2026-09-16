# Pie and donut

**Argues:** A pie (or donut) answers exactly one question: of a fixed whole, what share does each part hold, when there are few enough parts that the reader can hold all of them in view at once.

## What it is for

A pie (or donut — same chart, a hole in the middle and a total in it) answers exactly one question:
of a fixed whole, what share does each part hold, when there are few enough parts that the reader can
hold all of them in view at once. That is a narrower job than most people reach for it to do. It is
not a general-purpose "distribution" chart, and it is not a magnitude-comparison chart wearing a
circle; if the story is "which part is biggest" rather than "how does this whole break down," a pie
is already the wrong shape, because ranking by angle is exactly the thing eyes are bad at (see below).

## When NOT to use it, and what to use instead

This is the type most often misused in a newsroom, so be honest about it rather than reflexive. If
there are more than about five slices, stop — group the smallest into "Other" or, better, switch to
a bar chart, which turns the same part-to-whole comparison into a length comparison a reader can
actually rank at a glance. If the parts don't sum to one meaningful whole (independent counts, not
a partition of a single total), a pie is not just weak, it's making a claim — "these add up to
something" — that the data doesn't support; use a bar. If the reader's real question is "how did
this share change over time," a pie is a single frozen instant and cannot show change at all — a
stacked-area or a set of small pies side by side (and even then, cautiously) is closer, but a slope
chart of the shares is usually the honest answer. And if two slices are close in size, a pie is
close to the worst way to show that — a bar puts the same two values on a shared baseline where a
few pixels of length difference is visible; on a circle, a few degrees of angle difference mostly
isn't.

<!-- limit: slices > 5 -->

## The one thing that goes wrong

Angle is a weak channel for magnitude judgement — people are reliably worse at ranking wedges by
angle than bars by length, which is exactly why the slice-count ceiling exists: more than about five
wedges and the angles blur into "several similar-sized slivers," and the chart stops being able to
answer its own question. The second, sneakier failure is a labelling one: a slice's percentage label
can get silently dropped if it collides with a neighbouring label and there's no reserved fallback —
unlike an annotated point on a scatter, which is never allowed to vanish once the journalist has
named it, a pie's per-slice label has no such guarantee. A dropped label leaves a wedge that is
differentiated from its neighbours by COLOUR ALONE, with no share value printed anywhere near it —
exactly the case a colour-vision-deficient reader can't recover from, since a bar chart's fallback
(position, length) doesn't exist here. Never ship a pie where you haven't checked, by eye, that
every slice still carries its own label or is covered by a legend.

## What the drawing actually needs

Slices are cumulative angles around the circle, always starting from a fixed anchor (12 o'clock,
sweeping clockwise, is the readable convention — pick one and always use it) and always sorted by
size, largest first, so the reader's eye can walk the wedges in a meaningful order instead of
whatever order the source rows happened to arrive in. Colour is the only encoding besides angle, so
every slice needs a distinct, colourblind-safe hue from a small fixed set — reusing a hue for two
different slices makes them indistinguishable outright. A donut's hole is decorative headroom for a
total or a label, not free real estate for more data; keep the hole a fixed, moderate fraction of
the radius (large enough to hold a number, small enough that the ring still reads as a ring). Label
each slice with both its name and its share, placed just outside the arc at the slice's own midpoint
angle — a bare colour swatch with no percentage forces the reader to eyeball an angle, which is the
exact weakness this chart already has. On narrow layouts where outside labels would collide with the
centre or run off the frame, fall back to a legend below the circle rather than cramming labels that
don't fit — but a legend detaches the colour key from the wedge it explains, so only take this
fallback when there is genuinely no room, not as a default layout choice.

## The accessibility trap

Colour is this chart's ONLY differentiator between adjacent parts of the data — there is no position
or length fallback the way there is on every axis-based chart in this set. That makes two things
non-negotiable rather than nice-to-have: every slice's hue must be colourblind-safe and distinct from
its neighbours, and every slice's label (or its legend entry) must actually render, every time — a
label that silently fails to place due to overlap turns that wedge into color-only information for
a CVD reader, with no other channel left to fall back on.

Owner rules that apply here: one frame, read at rest — one accent, all furniture derived from the ground, the subject named where it ends rather than in a legend, and nothing on the plate that does not earn its place.

## Reading stations
- **Enter at** the ring of the case the claim names, its two concentric arcs a few pixels apart so the change is a GAP rather than a second mark
- **Then** the share printed in the hole — the hole's job, and a floor the ladder spends copy to meet
- **Then** the tonnes under each ring, because a share chart that does not carry its own absolute values can be read backwards and stay silent about it
- **Subordinate** — the ring tracks, the names under the rings, the earlier arc in the measured past treatment
- **The claim lands on** the two named cases' arcs having exchanged length between the rings

## A choreography must NOT
- `no-accent-thing-claim` — accent more than the one thing the claim is about — a plate where everything is accented has no accent left
- `no-send-reader-legend` — send the reader to a legend for a reading a direct label could carry at the mark itself
- `no-give-furniture-colour` — give furniture a colour of its own instead of deriving it from the ground, or bridge a gap in the data rather than showing it
- `no-carry-identity-flag` — carry identity with a flag or any asset this base does not ship — a plate that drew approximations of them would be inventing a fact about a country; identity is the name under the ring
- `no-let-turn-mean` — let a turn mean something different on two rings: one full turn is the whole, on every ring, at one radius, because six rings side by side ARE a small multiple
- `no-recolour-subject` — recolour the subject — the chroma axis is already spent on the two dates, so the subject takes a SHAPE: a hairline hugging its own number

## Precision to assert
- wedge angles sum to the same asserted whole on every ring
- two floors are measured before the rings are drawn — the shortest arc must clear a stated drawn length (an arc a reader cannot see is not a share, it is a gap in the ring) and the hole must hold its own number
- the plate refuses if the two named cases did not swap, if the whole did not grow by at least the stated fraction, or if NO case falls into the share-versus-absolute trap the reading line warns about

## Devices the worked example implements
- **Tint measured against a separation floor, not only against the ground** — two chromas a reader cannot separate on concentric arcs is worse than a grey they can, and the disagreement between two references is recorded (`render-directions.mjs`)
- **The absolute value under every ring** — the form's own trap closed on the plate (`DirectedDonuts.tsx`)
- **The subject ringed, not recoloured** — a hairline hugging its number (`DirectedDonuts.tsx`)

## Worked example

`proof/static-donut-world-co2-share` — the reference implementation of this type's picture; read its CODE, not only its BRIEF.md. `render-directions.mjs` (data, assertions, words), `DirectedDonuts.tsx` (the marks). `BRIEF.md` records the choreography table, not the shape. `skills/chart-beat/scripts/scaffold-static-beat.mjs --type pie-and-donut --beat <new-beat>` copies this beat's own code by default, marked `SCAFFOLD:` over what is its subject rather than this type's.
