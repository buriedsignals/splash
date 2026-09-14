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

**Everything chromatic on this page is one hue with nine chromas of it, and the hue is whatever the
direction's own accent is.** Nothing is imported, and there is no second hue: `ramp[i] =
mix(ground, accent, 0,14 + i/8 x 0,86)`, nine ordered steps from a tone just off the ground to the
accent itself. The order is the argument — renewables at the top of every column, fossil at the
foot — and an ORDERED set takes a sequential ramp, never a categorical one. Its behaviour on a dark
ground falls out of the same expression instead of being special-cased: on `nocturne` the pale pole
is the dark one, the ramp inverts, and coal stays the most contrasted thing on the plate, which is
what the beat is about.

## What nine steps of one hue actually measure, and it is the reason the page says so out loud

Contrast between each step and the one before it, in the three filed directions:

| step | creme | rapport | nocturne |
| --- | --- | --- | --- |
| biomasse over autres renouv. | 1,195:1 | 1,188:1 | 1,319:1 |
| solaire over biomasse | 1,208:1 | 1,212:1 | 1,361:1 |
| éolien over solaire | 1,212:1 | 1,216:1 | 1,340:1 |
| hydraulique over éolien | 1,236:1 | 1,241:1 | 1,336:1 |
| nucléaire over hydraulique | 1,249:1 | 1,248:1 | 1,296:1 |
| pétrole over nucléaire | 1,260:1 | 1,275:1 | 1,272:1 |
| gaz over pétrole | 1,251:1 | 1,277:1 | 1,262:1 |
| charbon over gaz | 1,259:1 | 1,296:1 | 1,230:1 |

**Nine steps of one ramp are not nine legible colours, and these are the numbers.** The corpus
already carries the same finding one notch worse (a ramp built in `contrast(accent, ground)/3` whose
seven steps measured 1,007:1); this one is looser and still nowhere near a difference two
neighbouring bands could be told apart by. That is not a defect to be repainted — nine categorical
hues on one plate is the worse answer, and the type's own sheet caps a stacked family near five
segments for exactly this reason. It is the reason for the page's second filed treatment: **the tone
ORDERS the sources and does not distinguish them, the plate says so in the sentence above the plot,
and every band that can hold its own name carries it — a band nobody can name is texture, and
texture in a chart is decoration.**

## The defect this passage found: the key's own swatches were under the floor

The key draws each tone as a 13 px square on the ground. Measured against that ground, the pale end
of the ramp is invisible:

| | autres renouv. | biomasse | solaire | éolien |
| --- | --- | --- | --- | --- |
| creme | 1,24:1 | 1,48:1 | 1,79:1 | 2,17:1 |
| rapport | 1,24:1 | 1,47:1 | 1,78:1 | 2,17:1 |
| nocturne | 1,31:1 | 1,73:1 | 2,36:1 | 3,16:1 |

Four steps under the 3:1 non-text floor on the two light grounds, three on the dark one. **Inside the
plot that is correct and is left alone** — a band is bounded by the bands above and below it and
never by the page, so the pale steps read against their neighbours, not against the ground. In the
KEY it is not: a square at 1,24:1 floating on the ground is a square a reader cannot see is there.

The 1 px box drawn round each swatch was `mix(ground, ink, 0,25)` and measured **1,83 / 1,84 /
2,20:1** — under the floor as well, so it was not rescuing anything. It is now raised to the
non-text floor and measured after the raise: **#919088 at 3,12:1 (creme), #919191 at 3,15:1
(rapport), #626184 at 3,02:1 (nocturne)**. The fill stays the datum; what is floored is the only
part of that swatch whose job is to be seen. The column outlines inside the plot keep the unfloored
value: they are drawn ON the fills, and the six units of ground between two columns are what
separate them.

## The type's canonical failure, checked rather than assumed

`references/types/marimekko.md` names one published accessibility failure by name: an in-cell
percentage label whose ink was picked white-or-dark by a brightness rule, landing white on a
mid-toned fill that measured under the text floor. **This beat does not have it**, and that is a
measurement and not a claim. Every tile's ink comes from `inkOnFill`, which measures against that
exact fill; the nine results, in contrast against their own tile:

| | autres renouv. | biomasse | solaire | éolien | hydraulique | nucléaire | pétrole | gaz | charbon |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| creme | 16,49 | 13,80 | 11,42 | 9,42 | 7,62 | 6,10 | 4,85 | 5,27 | 6,64 |
| rapport | 16,96 | 14,27 | 11,78 | 9,69 | 7,81 | 6,25 | 4,90 | 5,47 | 7,09 |
| nocturne | 13,54 | 10,27 | 7,55 | 5,63 | 4,51 | 5,47 | 6,96 | 8,78 | 10,80 |

Twenty-seven combinations, all at or above the 4,5:1 text floor, and the flip from the page's ink to
the page's ground happens at a different step in each direction — creme and rapport flip between
`pétrole` and `gaz`, nocturne between `éolien` and `hydraulique`. A single rule generalised across
all of them is exactly what the published failure was.

## What the control is drawn in, and what it is deliberately not drawn in

The three pills that hold a dimension still take **ink on ground, never the accent**: the accent is
the hue the whole argument is drawn in here, and a control borrowing it would make the one colour
that means something also mean "you clicked here". The figure a held state prints on the tile it
measures is the ink `inkOnFill` returns **for that tile's own fill** — the darkest step, so 6,64 /
7,09 / 10,80:1 — and it is set inline, beside the register it borrows its size from. That is not a
style preference: `regs.value` carries its own `color`, an inline style beats every selector there
is, and the first build of this figure set its colour in the generated rule and shipped it in the
register's mid blue over the darkest tile on the page, where nothing of it could be read.

Nothing else is chromatic. The axis labels, the seams between bands, the column outlines and the
control's own chrome are steps off the direction's own ground and ink, computed by `deriveFurniture`
at render time and never written here as a literal.
