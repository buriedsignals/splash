---
ground: "#FFFFFF"
accent: "#0B7A75"
origin: newsroom
---

The answer recorded for this beat: the newsroom's own house colours, as documented in
`skills/splash/assets/root-template/NEWSROOM.example.md` (`brandColor: "#0B7A75"`,
`ground: "#FFFFFF"`). `origin: newsroom` says who chose them.

`palette`'s subject option was checked and has nothing to offer. `matchConvention` holds four
grounded conventions (renewables, fossil, water, heat), and this beat's subject — world population
from 1800 to 2023 — fires none of them. When no convention applies, the house theme wins.

One accent, because the beat draws one series. The one-billion crossing marker and its label are
`muted` and ink, both derived by `deriveFurniture` from `ground`, so the annotation never competes
with the line it points at.

Measured against this ground: 5.18:1, clear of the 3:1 non-text floor an accent has to hold
(WCAG 2.2 SC 1.4.11).

`render-web.mjs` beside this file reads both values with `readPalette` and names no hex of its own.
