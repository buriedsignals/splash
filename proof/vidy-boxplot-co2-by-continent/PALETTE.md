---
ground: "#FFFFFF"
accent: "#0B7A75"
origin: newsroom
---

The answer recorded for this beat: the newsroom's own house colours, as they stand in
`skills/splash/assets/root-template/NEWSROOM.example.md` (`brandColor: "#0B7A75"`,
`ground: "#FFFFFF"`). `origin: newsroom` says who chose them. These are exactly the two values
`render.mjs` named as hex literals until now, so the migrated render comes out unchanged.

`palette`'s subject-fit branch was checked and does not apply: `matchConvention` holds
conventions for renewables, fossil fuel, water and heat, and this beat's subject — the spread of
CO₂ emissions per capita within each continent — matches none of them. When no convention applies,
the house theme wins.

One hue does the whole job here — `BoxplotVideo.tsx` fills and strokes every box in the accent and
separates the subject group by emphasis rather than by a second colour — and the furniture (ink,
muted, grid) is derived from `ground` by `deriveFurniture`. So the single recorded accent reaches
every mark in the frame. Delete this file and the render refuses, naming every directory it
searched.
