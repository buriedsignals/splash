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

**What this page actually partitions, and why that decides the colour.** Not one quantity in two
halves at a pivot year — this file used to say that, in a paragraph forty beats shared byte for byte,
and it was true of none of them. This page draws **an ordered scale of five barreaux** — charbon et
pétrole, gaz, nucléaire, biomasse, then éolien/solaire/hydraulique — leaned about a fixed centre, and
**the reader moves the boundary between the two camps**. So the colour has one job the static sibling
never had: **a barreau has to stay recognisable while it changes side.**

**That is why this beat REFUSES the type sheet's ramp-per-side, and takes its reason instead.**
`types/diverging-stacked-bar.md` asks for "one colour ramp per side (never a single ramp spanning
both directions, which would erase the neutral break)". The reason behind it is that a reader must be
able to tell which camp a segment near the centre belongs to. Here the camp is what the reader just
CHOSE — so a colour that encoded it would repaint every band the moment the boundary moved, and the
one invariant across the four plates, the barreau itself, would be the one thing that did not hold
still. **Colour belongs to the barreau; side belongs to position.** And the rule is still met where
it is checkable: under the DEFAULT cut — the picture the page ships in, and the one a reader with no
script never leaves — the two ink tones are the whole of the left camp, the two accent tones the
whole of the right, and the neutral is alone on the centre. A ramp per side, deepening outward, with
the neutral break intact.

**One ink family, one accent family, and a neutral that belongs to neither.** The fossil barreaux are
tones of the direction's own ink; the renewable ones are tones of its accent; nuclear — which is
neither renewable nor a fossil fuel, by definition rather than by judgement — is `mix(ink, accent)`,
so the band that means "neither" is drawn in neither family's hue. No second hue is imported.

**The ramp is built OUTWARD FROM THE CENTRE, one rung against the last, and never in five
independent calibrations.** The type sheet asks for "lighter shades near the centre and deeper shades
toward the strong-opinion ends", which is an ORDER, so it is built in that order: the neutral first,
as the lightest tone still clearing the non-text floor against the ground, then each rung pushed away
from the rung beside it until it stands `NEIGHBOUR_MIN = 1,45:1` off it. Two colours calibrated
independently against the same floor on the same ground come out **identical by construction** —
1,023:1 measured on one beat of this branch, 1,000:1 on another — which is exactly what building
each rung against its neighbour avoids. Bands are laid in ladder order under every cut, so two bands
touch on the plate exactly when they are adjacent on the ladder: checking adjacent pairs is checking
every pair a reader ever sees meet.

**The first version of this ramp was refused by its own render.** Built from the full ink/accent
blend, the neutral measured **13,4:1** against the ground — the heaviest object on the page was the
band that means "neither", and France's plate was a near-black slab 67,7 % wide. Turned around and
re-measured.

**Measured in Chrome, on the pixels the three delivered pages actually paint** (`rect.band` computed
fill, read back after the page settled):

| | creme | nocturne | rapport |
| --- | --- | --- | --- |
| nucléaire (the neutral, centre) | **3,01:1** | **3,13:1** | **3,03:1** |
| gaz | 4,56:1 | 4,83:1 | 4,61:1 |
| biomasse | 4,51:1 | 4,76:1 | 4,41:1 |
| charbon et pétrole (outer end) | 6,61:1 | 7,28:1 | 6,69:1 |
| éolien, solaire, hydraulique (outer end) | 6,64:1 | 7,18:1 | 6,41:1 |
| charbon/pétrole against gaz | 1,450:1 | 1,508:1 | 1,451:1 |
| gaz against nucléaire | 1,514:1 | 1,542:1 | 1,519:1 |
| nucléaire against biomasse | 1,496:1 | 1,520:1 | 1,453:1 |
| biomasse against renouvelables | 1,473:1 | 1,510:1 | 1,453:1 |

Every band clears the 3:1 non-text floor against the ground in all three directions; every pair a
reader can see touching clears the declared 1,45:1. Nothing is a slab: the deepest band on the page
is 7,28:1, not 21:1, so Poland's 57 % of coal and oil reads as the heavy end of a scale rather than
as black.

**The accent is never borrowed by a number.** Both camp totals in the gutters are drawn in the
direction's ink at the text floor, not in the accent — on this page a full-strength accent is what
the right-hand camp is drawn in, and a left-camp total wearing it would say the left camp is the
argument. The one accent outside the plot is the subject's own row label (France), and the control's
chosen pill, which is the arbitration `control-chrome.ts` carries.

**The control's chrome is the shared module, unmodified**, and its wash measured on the painted pixel
is **1,409:1 / 1,619:1 / 1,410:1** against the three grounds, with the chosen words at 14,49 / 10,98 /
14,89:1 on that wash and the ring at 6,64 / 10,80 / 7,09:1 against the ground — a wash and a ring, not
the heaviest ink on the page.

Nothing else here is chromatic. The axis labels, the gridlines, the centre rule and the net markers
are steps off the direction's own ground, computed at render time and never written here as literals.
