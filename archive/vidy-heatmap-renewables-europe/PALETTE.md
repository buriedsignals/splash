---
ground: "#FFFFFF"
accent: "#1E7B45"
origin: subject
---

The answer recorded for this beat: the green `#1E7B45` on a white ground. `origin: subject` says
who chose it — this is a subject-fit departure from the newsroom's house teal (`#0B7A75`), and the
subject is the one `palette`'s table covers most directly: the share of electricity generated
from **renewables**, where `matchConvention`'s `renewables` row argues green from evidence that
readers already hold the association (Lin et al., EuroVis 2013). The convention's own accent is
`#1B7F4B`; this beat draws a neighbouring green it has always drawn, and the recorded answer is
what the beat draws, not what the table would have proposed. It measures 5.28:1 against the ground,
well clear of the 3:1 mark floor SC 1.4.11 sets.

These are exactly the two values `render.mjs` named as hex literals until now, so the migrated
render comes out unchanged.

**The accent here is a RAMP HUE, not a single mark colour.** `rampAnchors(ground, accent)` derives
the pale and deep ends of the cell scale from this pair at render time, `rampColor` interpolates
between them, and the same hue draws Iceland's subject outline and wash — so one recorded pair
reaches all seventy-two cells. `timing.test.ts` reads this same file rather than repeating the two
hexes, so the ramp's monotonicity and 3:1 proofs are run against the colour the beat actually
draws. Delete this file and both the render and that test refuse, naming every directory they
searched.
