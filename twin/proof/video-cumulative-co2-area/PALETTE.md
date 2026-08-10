---
ground: "#FFFFFF"
accent: "#0B7A75"
origin: newsroom
---

The answer recorded for this beat: the newsroom's own house colours, as they stand in
`skills/splash-twin/assets/root-template/NEWSROOM.example.md` (`brandColor: "#0B7A75"`,
`ground: "#FFFFFF"`). `origin: newsroom` says who chose them. These are exactly the two values
`render.mjs` named as hex literals until now, so the migrated render comes out unchanged.

`twin-palette`'s subject-fit branch was checked and does not apply: `matchConvention` holds
conventions for renewables, fossil fuel, water and heat, and this beat's subject — a country's
cumulative all-time CO₂ — matches none of them. When no convention applies, the house theme wins.

The area fill is the accent at a reduced opacity and the furniture (ink, muted, grid) is derived
from `ground` by `deriveFurniture`, so one recorded pair still carries the whole frame. Delete this
file and the render refuses, naming every directory it searched.
