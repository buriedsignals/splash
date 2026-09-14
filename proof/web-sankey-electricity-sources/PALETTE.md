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

## One hue, one chroma, one neutral — and this file used to say something else

The text that stood here was one of forty byte-identical copies. It described a page that "partitions
one quantity into two halves of itself — the emissions before and after the year the cumulative total
reaches its midpoint" and promised "one hue, two chromas… nothing else on the page is chromatic". None
of that was this beat. There is no midpoint year here, there are no two halves, and the page it
described was not the page that shipped: **the render carried TWELVE distinct hex fills** — the
ground, the label ink, a node ink, and a NINE-STEP ramp, one step per source.

## Why the nine-step ramp had to go, measured

The ramp existed to let a reader track one source's ribbons across the crossings by their tone. It
could not do that job, and the measurement says so. Adjacent steps, in `creme`:

| step pair | contrast |
|---|---|
| 1 vs 2 | 1,230 |
| 2 vs 3 | 1,245 |
| 3 vs 4 | 1,246 |
| 4 vs 5 | 1,133 |
| **5 vs 6** | **1,011** |
| **6 vs 7** | **1,011** |
| **7 vs 8** | **1,016** |
| **8 vs 9** | **1,006** |

The bottom five steps — solar, gas, bioenergy, oil, other renewables — were four colours a reader
cannot tell apart, painted as though they were four categories. This is the donut's finding again
(*"a ramp built inside `contrast(accent, ground)/3` cannot carry many levels — the seven stepped
1,007:1 and had to become four"*), and `sankey.md`'s own rule said it in advance: *"past about six
distinct flow categories, the ribbons stop being individually colour-trackable."* Nine were offered.

## What replaces it, and why the control is what makes it affordable

The reader now picks the source they want to follow, so the tracking job that the ramp could not do is
done by the trace instead — and the page needs exactly **two states for a ribbon**: on the path, or
not.

- **the traced path** — the direction's own accent, laid at 0,95;
- **everything else** — one neutral, the direction's ink mixed 55 % into its ground, laid at 0,5;
- **the nodes** — the same neutral, solid, except the traced origin, which takes the accent, and a
  destination the path never reaches, which is drawn hollow: no fill, a dashed outline in the same
  neutral;
- **the words** — the direction's ink, held to the text floor against the ground and cased in the
  ground (`paint-order: stroke fill`) so what they are measured against is the ground and not
  whichever ribbon passes behind.

Four fills in the delivered file, from twelve. Nothing else on the page is chromatic: the label ink and
the neutral are steps off the direction's own ground, computed at render time and never written here
as a literal.

## What is measured, on the colour the page actually paints

A translucent fill is not the colour a reader sees, so every figure below is the COMPOSITE — and a
receding ribbon is measured against what it crosses, not against the ground alone.

| | creme | nocturne | rapport |
|---|---|---|---|
| traced path vs ground | 5,99 | 9,85 | 6,31 |
| traced path vs the receded field it crosses | 3,06 | 4,09 | 3,21 |
| traced path OVER a receded ribbon, vs that ribbon | 3,20 | 4,21 | 3,36 |
| traced origin's node vs ground | 6,64 | 10,80 | 7,09 |
| a neutral node vs ground | 4,74 | 5,94 | 4,74 |
| words vs ground | 20,41 | 17,78 | 21,00 |
| **receded ribbon vs ground** | **1,96** | **2,41** | **1,96** |
| a receded crossing vs a single receded ribbon | 1,51 | 1,62 | 1,51 |

## The one figure under the floor, and it is stated rather than hidden

**A receded ribbon does not clear the 3:1 non-text floor against the ground, and it cannot.** Three
levels — ground, receded, lit — are one more than the ground-to-accent range can carry. Searched over
every combination of the two opacities (0,75–0,95 and 0,35–0,70) and the neutral's tint (0,15–0,60),
the best a receded ribbon can do against the ground **while the lit path stays 3:1 clear of it in all
three directions** is **1,98:1**. Something has to give, and the choice is deliberate: the floor is
spent on the path the reader asked to follow, against the ground AND against everything it crosses,
because a path a reader cannot pick out of the network is the one failure this control cannot survive.

What the receded field gives up, it gives back in readings that do not depend on seeing it: every
ribbon keeps its own hit target and its full sentence, every node prints its own total at full
strength, and every source is one radio away from being the lit one. This is `sankey.md`'s own
category — *"those neutral ribbons are scaffolding, the same way an unhighlighted context line is on a
bump chart"* — and it is recorded here as a measured trade rather than an unnoticed pass.
