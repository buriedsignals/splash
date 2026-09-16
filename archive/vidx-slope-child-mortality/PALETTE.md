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
conventions for renewables, fossil fuel, water and heat, and this beat's subject — child mortality
rates falling between 1990 and 2023 — matches none of them. When no convention applies, the house
theme wins.

The accent is spent once, on the subject country's slope; every other line is the furniture's own
`muted`, which `deriveFurniture` derives from `ground`. Delete this file and the render refuses,
naming every directory it searched.
