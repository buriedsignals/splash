---
ground: "#FFFFFF"
accent: "#0B7A75"
origin: newsroom
---

The answer recorded for this beat: the newsroom's own house colours, as they stand in
`skills/splash/assets/root-template/NEWSROOM.example.md` (`brandColor: "#0B7A75"`,
`ground: "#FFFFFF"`).

`palette`'s subject option was checked and does not apply. `matchConvention` holds four
grounded conventions — renewables, fossil, water, heat — and this beat's subject, life expectancy at
birth in Switzerland, fires none of them. Inventing a fifth for one beat would be a colour that felt
right rather than one a reader already holds, which is the trap
`palette/references/subject-conventions.md` argues against at length. When no convention
applies, the house theme wins.

One accent is all this beat needs: a single line, one series, with its end label set in the same
colour. Measured against this ground: 5.18:1, clear of the 3:1 non-text floor an accent has to hold
(WCAG 2.2 SC 1.4.11).

`render.mjs` beside this file reads both values with `readPalette` and names no hex of its own.
