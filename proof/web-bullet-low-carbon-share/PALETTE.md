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

**One hue, and the second chroma is a CONSEQUENCE, not a decision.** This page draws a measure
against a target the reader chooses, so every row splits into two parts at the tick: the bar up to
the target, and the stretch beyond it. That is `two-states-of-one-measure-are-one-hue-at-two-chromas`
in its literal case — under the target the page ships in, the stretch beyond the tick IS the gain
since 2015 — so the second chroma is a step off the direction's own accent and never a second hue.

**The catalogue's two hues are refused, and the refusal is measured.** `bullet.md` offers "exactly
two accent hues are enough — one for hit, one for miss". This page draws the verdict in SHAPE:
filled beyond the tick, a hollow outlined box short of it. Three reasons. Hue is already spent on
which row the story is about. A verdict carried by hue alone is one a colour-blind reader does not
get, while a hollow bar survives a photocopy. And two hues calibrated independently against the same
floor against the same ground come out identical by construction — this branch has measured 1,023:1
and 1,000:1 doing exactly that.

**What was measured on the pages this beat actually ships, against the surfaces they actually
paint.** Nothing here is a colour the page uses; it is the arithmetic the page's own component runs
per direction, and the numbers it came out with.

| | creme | nocturne | rapport |
| --- | --- | --- | --- |
| bar, subject, against the band behind it | 5,20 | 8,42 | 5,47 |
| bar, the other five, against the band | 3,96 | 3,81 | 3,91 |
| the stretch beyond the tick, against its own bar | 1,24 / 1,22 | 1,22 / 1,21 | 1,21 / 1,23 |
| the bar under the pointer, against its own bar | 1,37 / 1,39 | 1,36 / 1,36 | 1,36 / 1,40 |
| **that lift against the stretch beyond the tick** | **1,70** | **1,65** | **1,64** |
| the hollow's outline against the track it sits on | 5,92 / 4,51 | 9,62 / 4,36 | 6,22 / 4,44 |
| the target tick on its own ground-coloured halo | 20,41 | 17,78 | 21,00 |

Three of those rows are defects this beat found by measuring rather than by reasoning:

- **A BAR IS NEVER DRAWN ON THE GROUND.** It sits on the track, and past the target on the band, and
  the band is the darkest surface behind it. Both fills are calibrated against the BAND. Calibrating
  against the ground is how two beats on this branch shipped 1,75:1 and 2,19:1.
- **THE BOLD ROW: the stretch beyond the tick and the bar's own lift under the pointer collided.**
  Written independently, each clearing its own floor against the same fill, they came out **1,04:1**
  apart on `nocturne` and 1,07–1,09:1 on the other two — so a reader who pointed at a row watched
  the "beyond the target" segment dissolve into the bar at the moment they were looking at it. The
  second colour is now hunted with the first in hand and refused under 1,25:1.
- **AND THE TWO MEANINGS SIT ON ONE POLE EACH, FOR THE WHOLE DIRECTION.** Hunted per fill, the
  surplus came out lighter than the subject's bar and darker than everyone else's — the same
  encoding, two directions, on one plate. The bars are now calibrated with 25 % of headroom above
  the non-text floor precisely so that the ground-ward pole is reachable for both of them.

Nothing else on the page is chromatic. The track, the band, the axis labels, the dashed rule at the
half, and the tick's halo are all steps off the direction's own ground, computed at render time and
never written here as a literal — and the two backdrop steps are refused if the smallest step a
reader can see already reads 3:1 against the ground, because a backdrop that reaches the non-text
floor is a mark competing with the bars drawn on it.
