---
ground: "#16191B"
accent: "#D4A853"
accents: "#5B8A8A"
origin: newsroom
---

# The palette for this story

`proposePalette` (`skills/palette/scripts/palette.mjs`) found no subject convention for
"wildfires in Africa". Its own `noConventionReason` said so out loud, and the newsroom's house
colours led the proposal instead.

Option 1 was `recommended`: `#D4A853` on `#16191B`, measured at **8.01:1** against the ground,
clear of the 3:1 non-text floor (WCAG 2.2 SC 1.4.11). The second house accent `#5B8A8A` measured
**4.58:1** — also passing — and is recorded in `accents` because `NEWSROOM.md` carries it.

No journalist was present to answer this proposal interactively. Following the unattended-run path
(`skills/palette/SKILL.md`, "When nobody is there to answer"), the recommended option is recorded
exactly as proposed, with `origin: newsroom` naming where it came from.

## What this beat spends the accent on, and what it does not

The beat draws six bands and has one accent, which is the doctrine's own arithmetic
(`doctrine/references/visual-system.md`: one semantic accent, reserved for the subject; every
series that exists to be compared against it drawn in a step toward the ink). Africa — the subject
the journalist named — takes `#D4A853`. The other five continents take a graded neutral ramp
derived from the ground, each step further toward the ink pole, so a reader sees one coloured
band and five degrees of context rather than six colours competing.

`seriesInks` was read and deliberately not used here. It exists to stop a multi-series beat drawing
its second and third series in furniture grey, which is right when every series is data of equal
standing; on this beat the five upper bands ARE the comparison field, and giving each of them a
shade of the house accent would produce six accents and no accent, which
`doctrine/references/anti-patterns.md` names by that title.

Band labels are drawn in the page's own ink, never in the band's fill —
`chart-beat/references/types/area.md` states that rule and
`doctrine/references/visual-system.md` records the six separate times it was rediscovered.
