---
ground: "#FFFFFF"
accent: "#0B7A75"
origin: newsroom
---

The answer recorded for this beat: the newsroom's own house colours, as documented in
`NEWSROOM.example.md`.

`twin-palette`'s subject option had nothing to offer here and said so. The subject is a country's
share of global CO₂ emissions — `matchConvention` returns nothing for it, because none of the four
grounded conventions (renewables, fossil, water, heat) fires on "CO₂ emissions" as a phrase, and
inventing a fifth for this one beat would be a colour that "feels right" rather than one a reader
already holds. When no convention applies, the house theme wins.

`render.mjs` beside this file reads both values with `readPalette` and names no hex of its own.
