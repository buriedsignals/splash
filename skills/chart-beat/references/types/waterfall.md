# Waterfall (bridge)

**Argues:** A waterfall chart shows how a starting total arrives at an ending total through a sequence of signed steps — a revenue build, a budget variance, an opening-to-closing balance.

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

Owner rules that apply here: one frame, read at rest — one accent, all furniture derived from the ground, the subject named where it ends rather than in a legend, and nothing on the plate that does not earn its place.

## Reading stations
- **Enter at** the opening total and the closing total, the two full-height bars the bridge runs between
- **Then** the steps in order, each in its own role's colour — increase, decrease, total — three roles and three colours, deliberately not red/green
- **Then** the connectors, which carry the running level across each gap
- **Subordinate** — the value labels floating above each bar's growing edge, in ink, never set inside a bar in white; the ticks
- **The claim lands on** the net change between the two totals

## A choreography must NOT
- accent more than the one thing the claim is about — a plate where everything is accented has no accent left
- send the reader to a legend for a reading a direct label could carry at the mark itself
- give furniture a colour of its own instead of deriving it from the ground, or bridge a gap in the data rather than showing it
- set a value label inside a bar in white — the sheet's own named defect on narrow bars; the labels float above the growing edge, in ink
- use a third saturated hue for the totals: they take the page's own muted ink
- draw a bridge whose steps do not replay — the running total after every step is checked against the closing level before anything is drawn

## Precision to assert
- opening plus every step equals the closing, asserted to a stated precision before the render
- one scale from zero for the totals and the steps
- each step's from/to is computed from the frozen file, never typed

## Devices the worked example implements
- **The bridge replayed as a check** — arithmetic consistency proved rather than trusted (`ElectricityBridgeWaterfall.tsx`)
- **Three roles, three colours, not red/green** — the CVD-safe pair plus the page's own muted ink (`DirectedWaterfall.tsx`)
- **Labels above the growing edge** — the narrow-bar defect designed out (`ElectricityBridgeWaterfall.tsx`)

## Worked example

`proof/static-germany-electricity-bridge` — the reference implementation of this type's picture; read its CODE, not only its BRIEF.md. `render-directions.mjs` (data, assertions, words), `DirectedWaterfall.tsx` (the marks). `BRIEF.md` records the choreography table, not the shape. `skills/chart-beat/scripts/scaffold-static-beat.mjs --type waterfall --beat <new-beat>` copies this beat's own code by default, marked `SCAFFOLD:` over what is its subject rather than this type's.
