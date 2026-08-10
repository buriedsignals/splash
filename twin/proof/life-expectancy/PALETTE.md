---
ground: "#FFFFFF"
accent: "#0B7A75"
origin: newsroom
---

The answer recorded for this beat: the newsroom's own house colours, as they stand in
`skills/splash/assets/root-template/NEWSROOM.example.md` (`brandColor: "#0B7A75"`,
`ground: "#FFFFFF"`).

`palette`'s subject option was checked and does not apply. The subject is life expectancy at
birth in Switzerland through the COVID-19 years; `matchConvention` holds four grounded conventions —
renewables, fossil, water, heat — and none of them fires on it. Inventing a fifth for one beat would
teach a reader a code that does not exist, which is the failure
`palette/references/subject-conventions.md` names. When no convention applies, the house theme
wins.

One accent for one series, drawn as a line that grows across the frame; the reference rule, the
labels and the credit are furniture, derived from the ground by `deriveFurniture` and handed to the
composition in the same props object. Measured against this ground: 5.18:1, clear of the 3:1
non-text floor an accent has to hold (WCAG 2.2 SC 1.4.11).

`render.mjs` beside this file reads both values with `readPalette` and names no hex of its own. The
`Root.tsx` placeholder props are exempt by the rule the file states itself: they exist so
`remotion compositions` can list the composition, every real render is driven by `render.mjs`'s
computed props, and they never reach a frame.
