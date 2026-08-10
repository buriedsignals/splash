---
ground: "#FFFFFF"
accent: "#0B7A75"
origin: newsroom
---

The answer recorded for this beat: the newsroom's own house colours, as they stand in
`skills/splash-twin/assets/root-template/NEWSROOM.example.md` (`brandColor: "#0B7A75"`,
`ground: "#FFFFFF"`).

`twin-palette`'s subject option was checked and does not apply. This beat's subject is a country's
per-capita CO₂ emissions ranked against fourteen neighbours; `matchConvention` returns nothing for
it, because none of the four grounded conventions (renewables, fossil, water, heat) fires on CO₂
emissions as a phrase. When no convention applies, the house theme wins.

The accent is spent on the SUBJECT row rather than on all fifteen — the rest are furniture-muted,
which `deriveFurniture` derives from the ground, so the highlight stays a highlight. Measured
against this ground: 5.18:1, clear of the 3:1 non-text floor an accent has to hold
(WCAG 2.2 SC 1.4.11).

`render.mjs` beside this file reads both values with `readPalette` and names no hex of its own.
