# Marimekko (mosaic plot)

**Argues:** A Marimekko shows two nested part-to-whole proportions at once: column WIDTH encodes each group's share of the grand total, and the segments inside encode that group's own composition — so a cell's AREA is the joint share.

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

Owner rules that apply here: one frame, read at rest — one accent, all furniture derived from the ground, the subject named where it ends rather than in a legend, and nothing on the plate that does not earn its place.

## Reading stations
- **Enter at** the two wide columns carrying the subject band — area is the reading, so the eye goes to the largest areas of the accented source
- **Then** the hairline or absent bands in every other column, which is the second half of the claim
- **Then** the column names above and the totals under them, so width has a number once
- **Subordinate** — the source names in the right gutter, the grand total, the 100 % scale
- **The claim lands on** the accented band's area against the whole mosaic

## A choreography must NOT
- `no-accent-thing-claim` — accent more than the one thing the claim is about — a plate where everything is accented has no accent left
- `no-send-reader-legend` — send the reader to a legend for a reading a direct label could carry at the mark itself
- `no-give-furniture-colour` — give furniture a colour of its own instead of deriving it from the ground, or bridge a gap in the data rather than showing it
- `no-print-share-inside` — print a share inside a cell — the cell's area IS the share, and a number in it invites reading the height as the value
- `no-draw-variable-width` — draw a variable-width chart whose narrowest unit falls under a few pixels: it has stopped encoding its second dimension, and this beat measures its own narrowest column before drawing and REFUSES rather than draws
- `no-let-small-cell` — let a small cell go unnamed where the type sheet says it should go to the gutter with a leader back to the band it names

## Precision to assert
- column width is on one unit-per-value scale and band height a share of the same 100 %, so a cell's area is the quantity
- every column's bands sum to that column's own total and the widths sum to the grand total
- the narrowest column is measured against a stated legibility floor before the render

## Devices the worked example implements
- **The narrowest-column refusal** — the corpus's worked negative case turned into a check (`render-directions.mjs`)
- **Area as the only reading** — no share printed in a cell, the totals on braces under the columns (`DirectedMarimekko.tsx`)
- **Small cells named in the gutter with a leader** — the type sheet's own rule, implemented (`DirectedMarimekko.tsx`)

## Worked example

`proof/static-marimekko-electricity-mix` — the reference implementation of this type's picture; read its CODE, not only its BRIEF.md. `render-directions.mjs` (data, assertions, words), `DirectedMarimekko.tsx` (the marks). `BRIEF.md` records the choreography table, not the shape. `skills/chart-beat/scripts/scaffold-static-beat.mjs --type marimekko --beat <new-beat>` copies this beat's own code by default, marked `SCAFFOLD:` over what is its subject rather than this type's.
