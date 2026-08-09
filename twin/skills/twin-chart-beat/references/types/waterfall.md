# Waterfall (bridge)

A waterfall chart shows how a starting total arrives at an ending total through a sequence of
signed steps — a revenue build, a budget variance, an opening-to-closing balance. Each step is a
floating bar that begins exactly where the previous one ended, so the eye can walk the bridge
left to right and see not just the net change but what drove it, and by how much each driver
contributed. That's the question only this type answers well: a plain bar chart of the same
numbers shows magnitudes but throws away the running total that gives them meaning.

Do not reach for it when the steps don't actually accumulate into anything — a set of independent
magnitudes with no running total is just a bar chart, and forcing it into a bridge implies an
arithmetic relationship that isn't real. And don't reach for it for part-to-whole of a single
total, where the pieces are simultaneous shares rather than sequential changes — that's a stacked
bar or a pie; a waterfall's steps are signed deltas moving through time or through a causal
sequence, not slices of one moment.

The one thing that goes wrong, and the one worth actually checking rather than eyeballing: the
bridge has to be arithmetically exact. The chart implicitly asserts that the closing total equals
the opening total plus every signed step in between — if a "total" bar in the middle of the
sequence doesn't actually equal the running level the steps before it produced, the chart is
silently lying about a sum, and because each bar only shows its own delta, a reader has no way to
catch the error by looking. Before shipping, replay the arithmetic yourself: walk the rows in
order, track the running total, and confirm every bar marked as an absolute total actually
matches where the preceding deltas landed.

What the drawing needs: like any bar, this is a length encoding, so the count axis has to start
at zero, and the first and last bars — the true totals — are drawn as full bars from that zero,
while every bar between them floats, starting at the previous bar's end and running to its own.
Thin connectors link each bar's end to the next bar's start so the eye follows the level across
the gap. Three roles get three colours — increase, decrease, and total — and the up/down pair
must not default to a plain red/green, because that's exactly the pairing colour-vision
deficiency confuses most; pick an up and a down hue that are still distinguishable to a
deuteranope. Rows stay in story order, never resorted by magnitude — the sequence itself is the
argument, and sorting it by size answers a different, less interesting question. Every delta
carries a signed label (+ or −), every total an absolute one.

The accessibility trap here isn't hypothetical — it's the same mark-colour-as-text-colour mistake
as elsewhere, but it bit specifically on the narrow bars: when steps are numerous or the canvas
is tall and narrow, bars get thin enough that a label drawn inside the bar in white, meant to sit
on a dark fill, instead sat on a bright decrease colour and measured under 4:1 — a fail. The fix
that held: don't paint value labels inside the bar at all; float them just above the bar's
growing edge in ink, so the label's contrast never depends on which role-colour the bar underneath
happens to be. Category labels have their own version of the same problem when they're long
enough to need rotating — truncate from the end (keep the readable start), and give the rotated
label a bounded strip of vertical room rather than letting a long name push the whole plot area
around or run into the source line underneath it.
