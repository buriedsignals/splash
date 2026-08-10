---
ground: "#FFFFFF"
accent: "#0B7A75"
origin: newsroom
---

The answer recorded for this beat: the newsroom's own house colours, as documented in
`skills/splash-twin/assets/root-template/NEWSROOM.example.md` (`brandColor: "#0B7A75"`,
`ground: "#FFFFFF"`). `origin: newsroom` says who chose them.

`twin-palette`'s subject option was checked and has nothing to offer. `matchConvention` holds four
grounded conventions (renewables, fossil, water, heat), and this beat's subject — Swiss life
expectancy from 1950 to 2023 — fires none of them. Health was one of the colours considered for a
convention and left out for exactly the reason `subject-conventions.md` gives: the association is
not one readers already hold. When no convention applies, the house theme wins.

One accent, because the beat draws one line. The crossing marker, the caveat and the source line are
ink and `muted`, both derived by `deriveFurniture` from `ground`.

Measured against this ground: 5.18:1, clear of the 3:1 non-text floor an accent has to hold
(WCAG 2.2 SC 1.4.11).

`render-web.mjs` beside this file reads both values with `readPalette` and names no hex of its own.
