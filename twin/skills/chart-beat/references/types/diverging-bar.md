# Diverging bar

## What it is for

A diverging bar answers "who gained and who lost, and by how much" for a set of categories whose
values are SIGNED — net job change by sector, vote swing by district, temperature anomaly by year.
Bars grow left or right from a centred zero baseline instead of all growing upward from the bottom,
so positive and negative are two directions, not two colours competing for the same reading. It does
a job a plain bar chart structurally cannot: a plain bar's baseline is also zero, but every bar still
grows the same direction, so "up" carries no sign — a diverging bar's whole reason to exist is a
domain that actually straddles zero.

## When NOT to use it, and what to use instead

If every value in the dataset is positive — even if the story frames it as "growth" or "gain" — this
is a plain bar chart drawn awkwardly for no reason: a domain that never crosses zero has nothing to
diverge from, and centring bars on a baseline nothing ever crosses is a purely decorative complication.
Reach for it only when the sign itself is part of the finding. And if the categories have a time order
rather than being a flat comparison — this year's job losses recovering into next year's gains — a
line or an area chart that shows the crossing as a continuous path usually reads more honestly than a
row of static signed bars, because it can show WHEN the sign flipped, not just that it did somewhere
in the dataset.

## The one thing that goes wrong

A diverging bar is a length encoding exactly like a plain bar, which means the same rule applies with
extra force: the domain must genuinely straddle zero, or the chart is lying about having two
directions when it only has one. The subtler failure lives in the labels, not the domain: value labels
are the one thing a reader trusts to state the exact number a bar's length only approximates, and a
label-reveal gate tied to the LAST slice of a bar's own animated growth — rather than fading in early
and simply riding the bar's growing tip — has previously left the last-staggered bars in a video build
completely unlabelled at the exact moment a viewer paused to read one. A label that only appears once
a bar is fully grown is a label that's absent for most of the time the bar is on screen.

## What the drawing actually needs

Bars grow from a centred zero line drawn on top of the bars, not underneath them, so the baseline
itself stays visible even where a bar's own fill would otherwise cover it. Sort categories by value,
descending, so the biggest gains sit together and the biggest losses sit together, rather than leaving
rows in whatever order the source data happened to arrive in — a diverging bar's whole value is
letting a reader see the extremes at a glance, which an unsorted list defeats. Exactly two hues, one
per sign, both colourblind-safe — never default to a plain red/green pairing, which is precisely the
pair a deuteranope confuses most, so pick a sign pair that's still distinguishable under a colour-
vision-deficiency simulation. Value labels sit just outside each bar's growing end, signed explicitly
(+ or −), in the page's neutral ink rather than the bar's own fill colour.

## The accessibility trap

Exactly two sign hues are allowed, and both must be visually distinct from each other under CVD
simulation — this is not a stylistic cap, it's the only thing telling a reader which direction a bar
is pointing when the bar itself is short enough that its position relative to the centre line is hard
to judge at a glance. And exactly like every other type in this bar family, a value label painted in
the bar's own accent hue — rather than the page's neutral ink — is the specific mistake that has
failed WCAG contrast here before: keep the label in ink, let the fill carry the sign.
