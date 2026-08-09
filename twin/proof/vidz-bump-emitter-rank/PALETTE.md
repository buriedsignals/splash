---
ground: "#FFFFFF"
accent: "#0B7A75"
origin: newsroom
---

The answer recorded for this beat: the newsroom's own house colours, as they stand in
`skills/splash-twin/assets/root-template/NEWSROOM.example.md` (`brandColor: "#0B7A75"`,
`ground: "#FFFFFF"`). `origin: newsroom` says who chose them.

`twin-palette`'s subject-fit branch was checked and does not apply: `matchConvention` holds
conventions for renewables, fossil fuel, water and heat, and this beat's subject — a country's rank
among the world's largest CO₂ emitters — matches none of them. When no convention applies, the house
theme wins.

The type sheet allows two or three accent lines on a bump chart. This beat uses **one**, because the
recorded palette carries one accent: a second hue would be a colour nobody chose. Everything else
draws in the furniture's `muted`, which `deriveFurniture` derives from `ground`.
