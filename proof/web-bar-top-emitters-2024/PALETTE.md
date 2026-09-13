---
ground: "#FFFFFF"
accent: "#0B7A75"
origin: newsroom
---

The answer recorded for **this** beat: the newsroom's own house colours, as they stand in
`skills/splash/assets/root-template/NEWSROOM.example.md` (`brandColor: "#0B7A75"`,
`ground: "#FFFFFF"`). `origin: newsroom` says who chose them, and it is the same answer the static
sibling recorded — `proof/static-bar-top-emitters-2024/PALETTE.md`, same subject, same reasoning:
`palette`'s subject option had nothing to offer, because none of the four grounded conventions
(renewables, fossil, water, heat) fires on "CO₂ emissions" as a phrase, and inventing a fifth for one
beat would be a colour that feels right rather than one a reader already holds. When no convention
applies, the house theme wins.

This is the palette `composeDirections` reconciles the three filed directions against; the delivered
page is drawn in whichever direction governs it, never in this one.

## What the page actually ships, and the rule behind it

**One accent, on one column out of ten, and a single neutral for the other nine.** This beat is a
ranking, not a partition: ten countries, one value each, nothing split into halves of itself. So
there is no second chroma and no sequence — `accent-marks-the-thread`, and nothing else. The nine
non-subject columns are one step off the direction's own ground (`mix(ground, ink, 0.42)`), taken to
the WCAG non-text floor against that ground so a column is never a shape the reader has to guess at.
Measured on the three filed directions: **3.15 : 1** on crème (`#918f87` on `#FFFCEE`), **4.12 : 1** on
nocturne (`#787795` on `#111044`), **3.15 : 1** on rapport (`#919191` on `#FFFFFF`).

**The accent is asked to be text, so it is measured against the text floor and not the mark floor.**
Three things on this page are set in the accent: the eyebrow (crème's own `eyebrow` register reads
its ink from the accent), the subject's value label, and the subject's own name on the x-axis. A
colour picked to be legible as a *fill* is not automatically legible as 11-px *type* — the gap
between the two floors is 3 : 1 and 4.5 : 1 — so the component asserts it rather than assuming it.
Measured against each direction's own ground: **6.64 : 1** (crème `#1757B6` on `#FFFCEE`),
**10.80 : 1** (nocturne `#4FE0C0` on `#111044`), **7.09 : 1** (rapport `#1F5C8B` on `#FFFFFF`). All
three clear 4.5 : 1 with room; the assertion is what keeps that a property of the beat rather than an
accident of the three directions currently filed.

**Colour is not allowed to carry the argument on its own.** The subject is also the tallest column,
which is the one case `static-discipline.md`'s "One accent" rule warns about, and the static sibling
records the same worry. So the comparison the headline makes is *drawn* — a bracket spanning exactly
the five columns it adds up, captioned with their computed sum — and a reader who cannot separate the
accent from the neutral still sees it.

Nothing else on the page is chromatic. The baseline, the bracket, the tooltip's border and every
neutral step are computed from the direction's own ground and ink by `deriveFurniture` and `mix` at
render time, and none of them is written here as a literal.
