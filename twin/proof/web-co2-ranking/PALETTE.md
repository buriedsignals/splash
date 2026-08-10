---
ground: "#FFFFFF"
accent: "#0B7A75"
origin: newsroom
---

The answer recorded for this beat: the newsroom's own house colours, as documented in
`skills/splash-twin/assets/root-template/NEWSROOM.example.md` (`brandColor: "#0B7A75"`,
`ground: "#FFFFFF"`). `origin: newsroom` says who chose them.

`twin-palette`'s subject option was checked and has nothing to offer. `matchConvention` holds four
grounded conventions (renewables, fossil, water, heat), and this beat's subject — a country's
per-capita CO₂ emissions ranked against nine other European economies — fires none of them.
Inventing a fifth convention for this one beat would be a colour that feels right rather than one a
reader already holds. When no convention applies, the house theme wins.

One accent, because the accent is spent on the one thing this chart singles out: the subject's own
bar. Every other bar is the furniture's `muted`, which `deriveFurniture` derives from `ground`, so
the ranking reads as one series with one row picked out of it.

Measured against this ground: 5.18:1, clear of the 3:1 non-text floor an accent has to hold
(WCAG 2.2 SC 1.4.11).

`render-web.mjs` beside this file reads both values with `readPalette` and names no hex of its own.
