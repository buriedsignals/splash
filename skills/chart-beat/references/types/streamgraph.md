# Streamgraph

**Argues:** A streamgraph shows many overlapping time series stacked with no fixed baseline — so the READ is the overall rhythm and relative flow of many series at once, not the exact value of any one band.

## What it is for

A streamgraph shows many overlapping time series stacked with no fixed baseline — bands can wiggle up
and down around a shifting centre rather than growing from a flat zero line — so the READ is the
overall rhythm and relative flow of many series at once, not the exact value of any one band at any one
point. It is the type for "does this whole system swell and contract, and which bands dominate when,"
a shape-of-change question a stacked-area chart, which pins everything to a flat baseline, states less
organically but far more precisely.

## When NOT to use it, and what to use instead

If a reader needs to read off an approximately accurate VALUE for any one series at any one point, this
is the wrong type — a wiggling baseline is specifically designed to minimise visual wobble across the
WHOLE stack, which means individual band heights are systematically harder to read precisely than the
same data on a stacked-area chart's flat, fixed baseline. In production, a request that named
"streamgraph" by name was judged better served by a plain stacked-area chart instead, precisely because
the story needed readable values, not just an impression of rhythm — don't treat the fancier-looking
type as automatically the better choice once a viewer actually needs numbers off it. And past about
seven series, the bands compress into visual mush regardless of the wiggle-minimising layout; trim to
the series that matter or facet instead.

<!-- limit: series > 7 -->

## The one thing that goes wrong

Because there is no axis a reader can look values up against, every in-band label has to state its
value directly, INSIDE the band, at whatever point along the timeline that band happens to be at its
thickest — and it can only do that honestly at an INTERIOR point, never right at either end of the
timeline, because a label placed at an end step routinely overflows the plot's own edge on a shape
that's actively narrowing toward zero there. A streamgraph with no in-band labels at all is a chart of
pure impression with no way back to a number — the labelling isn't optional decoration here the way it
might be on an axis-based chart, it's the ENTIRE mechanism by which this type states a value at all.

## What the drawing actually needs

Bands stack with an inside-out ordering (the largest series nearest the centre, tapering outward) and a
wiggle-minimising offset, rather than a fixed baseline — this is the one deliberate structural
difference from a stacked-area chart, and it's what buys the organic, rhythmic look at the cost of
readability. Each band gets its label placed at its own thickest interior point, never at an endpoint.
Colour is categorical, one hue per series, capped near seven for the same reason any stacked type
caps series count — beyond that, individual bands stop being visually separable regardless of how
carefully they're coloured.

## The accessibility trap

With no axis and no fixed baseline, colour and in-band position are doing the ENTIRE job of separating
one series from the next — there is no positional fallback the way a bar chart's shared baseline
provides one. That makes the in-band label's contrast against its own fill non-negotiable rather than
a nicety: a specific, previously shipped failure picked white text by a naive brightness rule and
landed it on a mid-toned green band, measuring under the WCAG 4.5:1 text floor. The fix that holds:
measure real contrast against the exact fill a label sits on and pick whichever of white or dark ink
actually clears the floor — never a single brightness threshold applied the same way across every hue
in the palette.

Owner rules that apply here: one frame, read at rest — one accent, all furniture derived from the ground, the subject named where it ends rather than in a legend, and nothing on the plate that does not earn its place.

## Reading stations
- **Enter at** the silhouette — the rhythm of the whole, which is what this form gives and a stacked area does not
- **Then** the subject band, named inside itself once it is thick enough to hold a name
- **Then** the rule at the year the claim turns on, and the printed numbers that stand in for the axis this form forbids
- **Subordinate** — the period ticks along the foot, the other bands in their neutrals, the note saying which period is excluded and why
- **The claim lands on** the subject band's rank, stated in words because the picture cannot carry it

## A choreography must NOT
- accent more than the one thing the claim is about — a plate where everything is accented has no accent left
- send the reader to a legend for a reading a direct label could carry at the mark itself
- give furniture a colour of its own instead of deriving it from the ground, or bridge a gap in the data rather than showing it
- draw a value axis: no band starts at zero, so an axis would be a lie — the numbers are printed instead
- include a partial period — a partial year drawn on a stream reads as a collapse, so it is excluded and the reason is on the plate
- expect a reader to recover a number from the picture: strip the labels and nothing on this plate can be turned back into a number, which is the form's own counter-example in this base

## Precision to assert
- the wiggle baseline and the inside-out order are computed once from the frozen file
- the rank, the period it was first reached and the fact that it held are all computed and asserted before the render
- every period in the drawn range is complete; an incomplete one is excluded and said to be

## Devices the worked example implements
- **`a-free-baseline-forbids-a-value-axis`** — the debt named and paid in printed numbers (`DirectedStreamgraph.tsx`)
- **The partial period excluded on the plate** — the exclusion is a reading, not a silence (`render-directions.mjs`)
- **A computed rank held across every period** — the claim refused if the subject reached the rank and lost it (`render-directions.mjs`)

## Worked example

`proof/static-streamgraph-swiss-electricity` — the reference implementation of this type's picture; read its CODE, not only its BRIEF.md. `render-directions.mjs` (data, assertions, words), `DirectedStreamgraph.tsx` (the marks). `BRIEF.md` records the choreography table, not the shape. `skills/chart-beat/scripts/scaffold-static-beat.mjs --type streamgraph --beat <new-beat>` copies this beat's own code by default, marked `SCAFFOLD:` over what is its subject rather than this type's.
