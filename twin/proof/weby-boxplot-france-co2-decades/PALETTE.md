---
ground: "#FFFFFF"
accent: "#0072B2"
origin: journalist
---

The answer recorded for this beat: a bespoke accent the journalist chose — Okabe-Ito blue, the value
this beat was already drawn in — kept over both the house teal and a subject convention.

`palette`'s subject option was checked and has nothing to offer. `matchConvention` holds four
grounded conventions (renewables, fossil, water, heat), and this beat's subject — the SPREAD of
France's per-capita CO₂ readings within each decade — fires none of them. So the choice was between
the house accent and the one already drawn, and the one already drawn is what is recorded here:
changing it is a newsroom decision, not a migration. Its static twin,
`proof/more-boxplot-france-co2-decades`, records the same answer for the same reason.

One hue for every box, per `references/types/boxplot.md` — this is a single group compared across
decades, not two groups compared with each other, so a second accent would encode a distinction the
data does not carry. The median line, the whiskers and the outlier value labels are ink and `muted`,
both derived by `deriveFurniture` from `ground`, never the box colour.

Measured against this ground: 5.19:1, clear of the 3:1 non-text floor an accent has to hold
(WCAG 2.2 SC 1.4.11).

`render-web.mjs` beside this file reads both values with `readPalette` and names no hex of its own.
