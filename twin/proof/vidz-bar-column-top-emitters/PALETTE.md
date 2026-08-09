---
ground: "#FFFFFF"
accent: "#0B7A75"
origin: newsroom
---

The answer recorded for this beat: the newsroom's own house colours, as they stand in
`skills/splash-twin/assets/root-template/NEWSROOM.example.md` (`brandColor: "#0B7A75"`,
`ground: "#FFFFFF"`). `origin: newsroom` says who chose them.

`twin-palette`'s subject-fit branch was checked and does not apply here: `matchConvention` holds
conventions for renewables, fossil fuel, water and heat, and the subject of this beat — a country's
total annual CO₂ emissions — matches none of them. When no convention applies, the house theme
wins, which is exactly this file.

`render.mjs` beside it names no hex of its own; both colours come from `readPalette`, and the
furniture (ink, muted, grid) is derived from `ground` by `deriveFurniture`. Delete this file and the
render refuses, naming every directory it searched.
