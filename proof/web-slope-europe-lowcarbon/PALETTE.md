---
ground: "#FFFFFF"
accent: "#0B7A75"
origin: newsroom
---

The answer recorded for this beat: the newsroom's own house colours, as they stand in
`skills/splash/assets/root-template/NEWSROOM.example.md` (`brandColor: "#0B7A75"`,
`ground: "#FFFFFF"`). `origin: newsroom` says who chose them. This is the palette
`composeDirections` reconciles the three filed directions against; the delivered page is drawn in
whichever direction governs it, never in this one.

## Nothing on this plate is measured in colour, and that is the whole of the reasoning

A slopegraph encodes its value in POSITION, twice, and the change between the two in the ANGLE
between them. Colour carries no quantity here at all: there is no ramp, no bin, no share of
anything. `palette`'s subject-fit branch has a convention to offer — "électricité", "renouvelable" —
and it is declined for the reason that makes a convention worth taking in the first place. A
subject's own hue is admissible where a reader already holds it and where it cannot be mistaken for
a measurement; on this page there is no measurement in hue to be mistaken for, so a "renewables
green" would be one more thing to learn and nothing to read.

## One neutral and one accent, because a slope with sixteen accents has none

`references/types/slope.md` states the rule in the strongest form this catalogue has: colour is
restrained to at most two hues, "one neutral tone for the ordinary context lines, and one accent
reserved for whichever line the journalist actually wants the reader to notice — a slope chart where
every line is accented has no accent at all, and the one signal that told the reader where to look
is gone." Sixteen countries is squarely the case that rule was written for.

So: fourteen lines in one neutral, two in the direction's accent — Finlande and la France, the pair
the headline's second half is about, and nothing else. `accent-marks-the-thread` is spent exactly
once on this page.

`colour-belongs-to-the-entity-not-to-the-state` is the other half of it, and it is what makes the
accent affordable. A line keeps ONE colour end to end; the two states are told apart by where the
line's ends sit, not by two hues. A slopegraph that painted 2000 in one colour and 2024 in another
would have spent the whole channel saying something the two rails already say, and there would be
nothing left to say "look here".

## What the web adds, and why it does not cost the accent a thing

The reader may park a yardstick on any of the sixteen. That emphasis needs a channel, and the
accent is not available: it already means "this is the crossing the headline names", in every state
of the page. `the-subject-is-ringed-not-recoloured` — "recolouring spends a channel that is already
carrying something" — so a chosen country takes a RING on its two end dots and full ink on its name,
and its two reference rules are drawn in the direction's own ink on a casing of its own ground.
No hue moves when the reader operates the control, and the two accented lines are drawn
unconditionally: no control on this page can take them off.

## The measurements, taken on the colour the page actually paints

Per direction, against that direction's own ground — `creme` on `#FFFCEE`, `rapport` on `#FFFFFF`,
`nocturne` on `#111044`:

| what | creme | rapport | nocturne | floor |
| --- | --- | --- | --- | --- |
| the accent, WRITING the two gutter labels (text) | 6,852:1 | 7,309:1 | 10,926:1 | 4,5:1 |
| the neutral the fourteen context lines are drawn in | 3,029:1 | 3,033:1 | 3,015:1 | 3:1 |
| a gutter label's ink | 20,411:1 | 21,000:1 | 17,775:1 | 4,5:1 |
| the two rails | 3,949:1 | 3,949:1 | 5,155:1 | 3:1 |

**THE DEFECT THAT MEASUREMENT CAUGHT, and it is the one this file's previous contents could not
have found.** The neutral was lifted to the 3:1 non-text floor and then every context line was drawn
at `strokeOpacity={0.75}`. What reached the reader was **2,188:1 in creme, 2,193:1 in rapport and
2,233:1 in nocturne** — fourteen of the sixteen lines on a plate whose entire first claim is *all
sixteen rose*, under the floor. A colour is measured where it lands, so the opacity is gone and the
neutral is the neutral.

Nothing else on the page is chromatic. The rails, the leader lines back to a pushed label, the
yardstick's casing and its dash are steps off the direction's own ground, computed by
`deriveFurniture` at render time and never written here as a literal.
