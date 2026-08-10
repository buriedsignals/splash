---
ground: "#FFFFFF"
accent: "#0B7A75"
origin: newsroom
---

The answer recorded for this beat: the newsroom's own house colours, as documented in
`skills/splash-twin/assets/root-template/NEWSROOM.example.md` (`brandColor: "#0B7A75"`,
`ground: "#FFFFFF"`). `origin: newsroom` says who chose them.

`twin-palette`'s subject option was checked and has nothing to offer. `matchConvention` holds four
grounded conventions (renewables, fossil, water, heat), and this beat's subject — 2024 per-capita
CO₂ emissions ranked across fifteen European countries — fires none of them. When no convention
applies, the house theme wins.

One accent, because the accent is spent on the subject's own stem and dot; the other fourteen rows
are the furniture's `muted`, derived by `deriveFurniture` from `ground`. A lollipop chart of one
year is one series, so a second hue would encode a grouping the data does not carry.

Measured against this ground: 5.18:1, clear of the 3:1 non-text floor an accent has to hold
(WCAG 2.2 SC 1.4.11).

`render-web.mjs` beside this file reads both values with `readPalette` and names no hex of its own.
