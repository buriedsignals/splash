---
ground: "#FFFFFF"
accent: "#0B7A75"
origin: newsroom
---

The answer recorded for this beat: the newsroom's own house colours, as they stand in
`skills/splash/assets/root-template/NEWSROOM.example.md` (`brandColor: "#0B7A75"`,
`ground: "#FFFFFF"`).

`palette`'s subject option was checked and does not apply. The subject is world population from
1800 to 2023; `matchConvention` holds four grounded conventions — renewables, fossil, water, heat —
and none of them fires on it. Adding a fifth for one beat would teach a reader a code that does not
exist, which is the failure `palette/references/subject-conventions.md` names. When no
convention applies, the house theme wins.

One accent carries the whole beat: the area fill at low opacity, the boundary line, and the end dot
with its label. The crossing annotation and every number are ink and muted, both from
`deriveFurniture`. Measured against this ground: 5.18:1, clear of the 3:1 non-text floor an accent
has to hold (WCAG 2.2 SC 1.4.11) — the 18 % fill beneath it is a density device on top of a colour
that already clears the floor at full strength, not a way past it.

`render.mjs` beside this file reads both values with `readPalette` and names no hex of its own.
