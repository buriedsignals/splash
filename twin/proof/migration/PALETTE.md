---
ground: "#FFFFFF"
accent: "#0B7A75"
origin: newsroom
---

The answer recorded for this beat: the newsroom's own house colours, as they stand in
`skills/splash/assets/root-template/NEWSROOM.example.md` (`brandColor: "#0B7A75"`,
`ground: "#FFFFFF"`).

`palette`'s subject option was checked and does not apply. The subject is Switzerland's annual
net migration balance; `matchConvention` returns nothing for it, because none of the four grounded
conventions (renewables, fossil, water, heat) fires on migration as a phrase. When no convention
applies, the house theme wins.

One accent for one series. The two negative years — the beat's whole claim — are marked by their
position below the zero reference rule and by their own labels, not by a second colour: a sign is a
direction, and there is no grounded convention for the change in a quantity
(the same reasoning `static-diverging-bar-eu-per-capita/PALETTE.md` records). The reference rule and
every label are furniture, derived from the ground by `deriveFurniture` and handed to the
composition in the same props object.

Measured against this ground: 5.18:1, clear of the 3:1 non-text floor an accent has to hold
(WCAG 2.2 SC 1.4.11).

`render.mjs` beside this file reads both values with `readPalette` and names no hex of its own. The
`Root.tsx` placeholder props are exempt by the rule the file states itself: they exist so
`remotion compositions` can list the composition, every real render is driven by `render.mjs`'s
computed props, and they never reach a frame.
