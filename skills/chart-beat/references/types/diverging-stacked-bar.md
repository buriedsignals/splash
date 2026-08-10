# Diverging stacked bar (Likert)

## What it is for

A diverging stacked bar answers "how did opinion split, for many items at once, when the response
scale itself has a neutral middle" — a survey's strongly-disagree-to-strongly-agree results, one row
per question, segments stacked outward from a shared centre instead of from a shared zero. It is the
purpose-built type for ordered, forced-choice survey data (a Likert scale), and it does something a
plain stacked bar cannot: a plain stacked bar has no forced centre, so "which way does opinion lean"
has to be read by eye across the whole bar; here the centre point makes agree-vs-disagree legible at a
glance, row after row, because every row shares the same anchor.

## When NOT to use it, and what to use instead

If the categories being stacked aren't genuinely ORDERED around a neutral midpoint — they're just
unordered parts of a whole, or counts with no natural "this side vs that side" — this is a plain
stacked bar wearing an unearned centre line; the diverging split only means something when there's a
real neutral response to straddle. And if the response scale has more than about five levels, don't
force it through this type at all: the palette this chart uses is built for exactly two shades per
side (four total, plus an optional neutral), and a six-or-seven-point scale run through it has, in
practice, produced two different response levels sharing the same hue — a silent, unreadable
collision, not a stylistic compromise. Collapse a longer scale to five buckets first, or reach for a
different type.

## The one thing that goes wrong

Two things, both real and both silent. First, the neutral straddle point has to be explicit — which
response level is "neutral" and therefore sits centred on the shared zero — because if it's left to
default to the middle of the array rather than named, the whole stack can silently drift off-centre
and, worse, two adjacent response levels have been seen to collapse onto the same segment, reading as
one answer when the data held two. Second, every row genuinely has to sum to its own 100% — a diverging
stacked bar makes an implicit promise that "these segments are the whole of this row's responses," and
a row that doesn't actually total 100% is quietly making a different claim than the one the shape of
the chart is making.

## What the drawing actually needs

Segments grow outward from a centred zero line, one colour ramp per side (never a single ramp
spanning both directions, which would erase the neutral break the whole type exists to show), lighter
shades near the centre and deeper shades toward the strong-opinion ends so the strength of response
reads as intensity as well as position. Cap the response scale at five levels; beyond that the two
shades per side run out of room to stay distinguishable. Rows keep their own natural order — by
question number, by topic — never re-sorted by result, because the point is comparing many items'
splits against each other in a fixed, referenceable order. A shared legend below the bars, not
per-row, names every response level once. In-segment percentage labels only belong on a segment large
enough to actually hold the text without the number spilling outside its own colour block — a segment
too small or too short simply doesn't get one, rather than forcing an unreadable label into it.

## The accessibility trap

Every in-segment label's ink colour has to be picked against that exact segment's own fill by real
measured contrast, not a rule of thumb — a diverging stacked bar has more distinct fills on one row
than almost any other type in this set (up to five, all different lightnesses), and a single
light-or-dark threshold that works for the lightest segment routinely fails on a mid-tone one two
segments over. And because the two sides of the scale are colour-coded by design, that colour coding
is the ONLY thing separating "leans positive" from "leans negative" for a segment sitting close to the
centre — both ramps must stay CVD-distinguishable from each other at every step, not just from white,
or the two directions of opinion the chart exists to contrast start reading as the same colour.
