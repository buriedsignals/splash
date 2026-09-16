# Diverging bar

**Argues:** A diverging bar answers "who gained and who lost, and by how much" for a set of categories whose values are SIGNED.

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

Owner rules that apply here: one frame, read at rest — one accent, all furniture derived from the ground, the subject named where it ends rather than in a legend, and nothing on the plate that does not earn its place.

## Reading stations
- **Enter at** the zero line, drawn ON TOP of the bars so no fill can cover it
- **Then** the mass on the majority side, and the one bar on the other — here a 1.3 px sliver, because it is the value it is
- **Then** the dashed average rule and the value labels, all printed at rest and all legible simultaneously: a still has one instant and has to hold every word at once
- **Subordinate** — the gridlines, the category names, the axis
- **The claim lands on** the exception, named, against 26 bars going the other way

## A choreography must NOT
- `no-accent-thing-claim` — accent more than the one thing the claim is about — a plate where everything is accented has no accent left
- `no-send-reader-legend` — send the reader to a legend for a reading a direct label could carry at the mark itself
- `no-give-furniture-colour` — give furniture a colour of its own instead of deriving it from the ground, or bridge a gap in the data rather than showing it
- `no-make-domain-symmetric` — make the domain symmetric — mirroring the largest fall with a half nobody occupies halves the pixels per unit on both sides to make room for nothing; equal units per pixel either side of zero is what makes two bars comparable, and the visible asymmetry is the data's
- `no-give-exception-minimum` — give the exception a minimum visible width: it is 1.3 px because it is 0.03 tonnes
- `no-draw-diverging-bar` — draw a diverging bar on a one-signed domain — the component throws if the domain ever stops straddling zero

## Precision to assert
- all categories are asserted to carry a reading in both periods before anything is drawn
- the count of risers and fallers, the mean fall and the extremes are computed from the frozen file
- every reader-facing claim string lives in one `words` object, one entry per comma, because a claim `const` declared immediately after another was swallowed by its predecessor's expression and the grounding guard went green on a figure the data could not reproduce

## Devices the worked example implements
- **The zero line painted after the bars** — the sheet's own requirement, and the reason it is not painted before them (`DirectedDivergingBar.tsx`)
- **A `words` object instead of consecutive claim consts** — a measured gap in `claims-grounded-in-data.test.ts` worked around at the beat, and recorded (`render.mjs`)
- **Two columns of rows at the type floor** — 27 rows measured rather than assumed (`DivergingBarChange.tsx`)

## Worked example

`proof/static-diverging-bar-eu-per-capita` — the reference implementation of this type's picture; read its CODE, not only its BRIEF.md. `render-directions.mjs` (data, assertions, words), `DirectedDivergingBar.tsx` (the marks). `BRIEF.md` records the choreography table, not the shape. `skills/chart-beat/scripts/scaffold-static-beat.mjs --type diverging-bar --beat <new-beat>` copies this beat's own code by default, marked `SCAFFOLD:` over what is its subject rather than this type's.
