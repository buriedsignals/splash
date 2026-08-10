---
ground: "#FFFFFF"
accent: "#0B7A75"
origin: newsroom
---

The answer recorded for this beat: the newsroom's own house colours, as they stand in
`skills/splash-twin/assets/root-template/NEWSROOM.example.md` (`brandColor: "#0B7A75"`,
`ground: "#FFFFFF"`).

`twin-palette`'s subject option was checked and does not apply. The subject here is the relation
between income and life expectancy across 165 countries; `matchConvention` holds conventions for
renewables, fossil fuel, water and heat, and none of them fires on it. When no convention applies,
the house theme wins.

**Where the accent lands, stated rather than assumed.** The scatter draws a point in the accent only
when that country is HIGHLIGHTED, and everything else in the furniture's `muted`, which
`deriveFurniture` derives from the ground. This beat's argument is about the shape of the whole
cloud, so `render.mjs` highlights nobody and the accent currently reaches no mark — the rendered SVG
contains no instance of it. It is recorded anyway, because it is the colour a highlight on this beat
would be drawn in, and the alternative is a beat that reads a palette only when it happens to use
one. Measured against this ground: 5.18:1, clear of the 3:1 non-text floor an accent has to hold
(WCAG 2.2 SC 1.4.11).

`render.mjs` beside this file reads both values with `readPalette` and names no hex of its own.
