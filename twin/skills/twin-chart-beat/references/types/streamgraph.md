# Streamgraph

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
