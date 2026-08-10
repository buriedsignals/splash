---
ground: "#FFFFFF"
accent: "#0B7A75"
origin: newsroom
---

The answer recorded for this beat: the newsroom's own house colours, as documented in
`skills/splash-twin/assets/root-template/NEWSROOM.example.md` (`brandColor: "#0B7A75"`,
`ground: "#FFFFFF"`). `origin: newsroom` says who chose them.

`twin-palette`'s subject option was checked and has nothing to offer. `matchConvention` holds four
grounded conventions (renewables, fossil, water, heat), and this beat's subject — per-capita CO₂
emissions in four European countries between 1950 and 2024 — fires none of them. When no convention
applies, the house theme wins.

One accent, and on this type that is the point rather than a limitation: small multiples compare by
POSITION across panels drawn on one shared scale, so every panel is the same series measured in a
different country. Giving each panel its own hue would say the four are different quantities. The
accent marks the subject's panel; the other three are the furniture's `muted`, derived by
`deriveFurniture` from `ground`.

Measured against this ground: 5.18:1, clear of the 3:1 non-text floor an accent has to hold
(WCAG 2.2 SC 1.4.11).

`render-web.mjs` beside this file reads both values with `readPalette` and names no hex of its own.
