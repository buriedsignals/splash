---
ground: "#FFFFFF"
accent: "#0B7A75"
origin: newsroom
---

The answer recorded for this beat: the newsroom's own house colours, as documented in
`skills/splash/assets/root-template/NEWSROOM.example.md`.

`palette`'s proposal for the subject line "where the population of Europe lives, one dot per
199 thousand people" returned **one** option — the house theme — because `matchConvention` fires on
none of the four grounded conventions (renewables, fossil, water, heat). Population carries no
colour a reader already holds; when no convention applies, the house theme wins.

Measured against this ground: **5.18:1**, comfortably clear of the 3:1 floor a graphical object has
to hold (WCAG 2.2 SC 1.4.11). That margin matters more here than on most beats: the mark is a dot
of about one pixel radius at the plate's own scale, and the whole quantitative channel is carried by
how many of them fall in one place.

One accent, on every dot. A dot map is univariate — every dot means the same number of people
wherever it falls — so a second hue would invent a second variable that the data does not have. The
country outlines and their land fill are derived from the ground and the ink, not chosen.
`render-web.mjs` and `DotDensityWeb.tsx` name no hex of their own.
