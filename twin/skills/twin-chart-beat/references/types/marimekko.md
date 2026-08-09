# Marimekko (mosaic plot)

## What it is for

A Marimekko shows two nested part-to-whole proportions at once: column WIDTH encodes each group's
share of the grand total, and the segments stacked inside each column encode that group's own internal
composition — so a single cell's AREA is the joint share, group-size × internal-split, in one glance.
That's something neither a stacked bar (equal-width columns; only the internal split is data) nor a
treemap (recursive nesting with no consistent per-series alignment across cells) can do together: a
Marimekko's whole value is that both the column widths AND the segments within them are simultaneously
real data, aligned so the same series compares cleanly across every column.

## When NOT to use it, and what to use instead

If the group sizes are all roughly equal, or don't matter to the story, the variable-width axis is
adding a second thing to decode for no payoff — use a plain stacked bar with equal-width columns
instead, which reads the internal split alone more simply. This type only earns its extra complexity
when the group SIZES genuinely differ AND that difference is part of what the story is claiming. And
because column widths already vary, precise reading suffers on both axes at once — if the actual
numbers, not just the proportions, need to be read off precisely, this isn't the type to reach for; a
grouped or stacked bar with a shared width states those numbers more legibly.

## The one thing that goes wrong

Every column has to have a genuinely positive total to divide into a width at all, and every column's
internal segments have to sum to something positive too — a column with no real composition to show
(zero or negative total) breaks the whole width-allocation logic the type depends on. The concrete,
previously shipped failure was a labelling one: in-cell percentage labels were picked white-or-dark by
a naive brightness rule, and white landed on a mid-toned green cell measuring under the WCAG 4.5:1 text
floor — while dark ink cleared comfortably on that exact same fill. A second, separate shipped bug: two
narrow adjacent columns' rotated labels collided at the top of the chart, fixed by staggering the
labels across two rows instead of relying on rotation to create enough separation.

## What the drawing actually needs

Column widths are normalised from each group's share of the total width available, never drawn from
a fixed or equal-width grid — that variable width is this type's entire second dimension of data.
Within each column, segments stack exactly like a stacked bar, one shared categorical palette across
every column so the same series is instantly comparable column to column. Cap the segment count near
five, same reasoning as every other stacked type in this family — beyond that, distinguishing hues run
out. A cell only gets a percentage label printed inside it if the cell is actually large enough to hold
the text cleanly — small cells go unlabelled rather than clipping a number into illegibility. Column
labels along the top need real collision handling at narrow widths — a two-row stagger, not rotation
alone, once neighbouring columns get too narrow for their labels to sit side by side without touching.

## The accessibility trap

Every in-cell label's ink colour has to be chosen by real measured contrast against that exact cell's
fill, not a brightness heuristic — the shipped failure here is the canonical example of why: a naive
rule confidently picked white for a fill it actually failed against. With up to five segment colours
per column and column widths varying on top of that, this type accumulates more distinct fill-and-label
combinations on one chart than almost any other type in this set, which makes checking every
combination's real contrast, rather than trusting one rule to generalise across all of them, especially
worth doing deliberately rather than assuming it from a single spot-check.
