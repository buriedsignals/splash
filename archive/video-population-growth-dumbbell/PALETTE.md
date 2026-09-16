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
conventions for renewables, fossil fuel, water and heat, and this beat's subject — population
growth across ten European countries — matches none of them. When no convention applies, the house
theme wins.

The two ends of each dumbbell are separated by the accent against the furniture's own `muted`,
which `deriveFurniture` derives from `ground` — the same one-accent-plus-furniture pairing
`DumbbellVideo.tsx` documents as "never a third hue". Delete this file and the render refuses,
naming every directory it searched.
