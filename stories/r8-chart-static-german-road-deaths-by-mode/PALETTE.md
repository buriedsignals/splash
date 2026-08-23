---
ground: "#16191B"
accent: "#D4A853"
accents: "#5B8A8A"
origin: newsroom
---

# The palette for this story

`proposePalette` (`skills/palette/scripts/palette.mjs`) was run with the subject the journalist
named — *people killed while riding a pedelec in Germany* — the format recorded at gate 2b
(`static`) and the destination recorded at gate 2c (`screen`). It found no subject convention: no
colour a reader already holds means "pedelec" or "road death", and it said so out loud rather than
inventing one. The newsroom's own colours therefore led the proposal.

Option 1 was recommended and was accepted: `#D4A853` on `#16191B`, measured at **8.01:1** against
the ground, clear of the 3:1 non-text floor (WCAG 2.2 SC 1.4.11). The second house accent `#5B8A8A`
measured **4.58:1** — also passing — and is recorded in `accents` because `NEWSROOM.md` carries it.

## What this beat spends the accent on, and what it does not

The beat draws two lines and has one accent. Pedelec riders — the subject — take `#D4A853`. Riders
of bicycles without a motor are the comparison field, not a second subject, so they are drawn in a
step toward the ink pole rather than in the second house accent: two equal accents would say the
two series are of equal standing, and the argument is that one of them is closing on the other.

`seriesInks` was read and deliberately not used. It returns the recorded accents in order, which is
right when every series is data of equal standing; here the second series exists to be measured
against the first.
