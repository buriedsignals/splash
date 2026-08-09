# Grouped bar

## What it's for

A small number of series placed side by side within each category, so a reader can make two
comparisons off one chart: within a group (this series here against that one, same category) and
across groups (this series here against itself over there, a different category). It answers
"compare a few series across a few categories" — a question a stacked bar can't answer, because a
stack sums its series into one length instead of keeping them separately comparable.

## When not to reach for it

Composition, where the series are meant to sum to a meaningful total, is a stacked bar's job —
bars placed side by side don't read as parts of a whole, and forcing them to imply one is a
category error, not a style choice. Past roughly three series, or past a handful of categories,
the groups turn into a picket fence and both comparisons this type exists for collapse at once —
move to small multiples or a slope/dot plot rather than adding a fourth colour to squeeze in. And a
continuous trend across many periods is a line chart wearing this type's clothes: if the interesting
shape is between the periods, not within a handful of them, this is the wrong tool regardless of
how many series are involved.

## Where it goes wrong

A series that swaps position or colour between groups. The entire type runs on a reader learning,
once, "the first bar in every group is series A, and it's always this colour" — and then reusing
that association group after group without re-checking it. Reorder series A even in a single
category, or let its colour drift, and every comparison the chart offers breaks silently: the
reader keeps applying a rule that quietly stopped being true, and nothing on the page tells them
so. Consistency of order and colour isn't a polish pass here — it's the mechanism the whole chart
depends on to be read correctly at all.

## What the drawing needs

Two nested bands: an outer band per category, and an inner band per series inside it. The gap
within a group stays small — the bars nearly touch — while the gap between groups is clearly
larger, so the eye parses groups first and the individual bars within them second; collapse that
distinction and the chart reads as one long unbroken row instead of a series of comparisons. Value
still maps to length from a shared zero baseline, inherited whole from the single-series bar. Because
two or three bars per category, repeated across several categories, can't each carry a direct value
label without the frame turning into clutter, this is one of the few types where a single legend
earns its place instead of being a fallback of last resort — and it sits in the same left-to-right
order as the bars within a group, so matching a swatch to a bar costs the reader nothing beyond
learning it once.

## The trap that's specific to this one

Because this type leans on a legend instead of per-bar labels, colour becomes the ONLY thing tying
a bar in the fifth category back to "series A," first learned in the first category — there's no
text doing that job bar by bar. Every hue needs to come from a colourblind-safe categorical set,
but membership in that set on its own isn't the whole story: two members of it can still sit close
enough for some colour-vision deficiencies to blur into each other, and the case that actually
happens in practice is two warm hues — an orange and a vermillion — placed next to each other
within the same group. Assign the palette so adjacent bars in a group don't pair two warm members
or two cool ones; the safety a CVD-safe set promises is a property of which colours end up sitting
next to each other, not just a property of the set they were both drawn from.
