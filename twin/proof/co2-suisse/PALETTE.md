---
ground: "#FFFFFF"
accent: "#0B7A75"
origin: newsroom
---

The answer recorded for this beat: the newsroom's own house colours, as they stand in
`skills/splash/assets/root-template/NEWSROOM.example.md` (`brandColor: "#0B7A75"`,
`ground: "#FFFFFF"`).

`palette`'s subject option was checked and does not apply. The subject is Switzerland's
territorial CO₂ emissions since 1950; `matchConvention` returns nothing for it, because none of the
four grounded conventions (renewables, fossil, water, heat) fires on CO₂ emissions as a phrase. When
no convention applies, the house theme wins.

One accent for one series: the line, its end marker and the crossing annotation the beat's whole
claim rests on. The reference rule, the axis and the credit are furniture, derived from the ground.
Measured against this ground: 5.18:1, clear of the 3:1 non-text floor an accent has to hold
(WCAG 2.2 SC 1.4.11).

`render-web.mjs` beside this file reads both values with `readPalette` and names no hex of its own;
`EmissionsWeb.tsx`, `EmissionsLine.tsx` and `crossing-geometry.ts` never named one.
