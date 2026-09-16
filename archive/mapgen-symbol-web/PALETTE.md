---
ground: "#FFFFFF"
accent: "#0B7A75"
origin: newsroom
---

The answer recorded for this beat: the newsroom's own house colours, as documented in
`skills/splash/assets/root-template/NEWSROOM.example.md`.

`palette`'s proposal for the subject line "seventeen great earthquakes on the western Pacific
rim, sized by magnitude" returned **one** option — the house theme — because `matchConvention`
fires on none of the four grounded conventions (renewables, fossil, water, heat). An earthquake is
not a warming story: reaching for the `heat` convention's warm red because a quake feels violent
would be a colour that "feels right", which is exactly the move
`palette/references/subject-conventions.md` refuses. When no convention applies, the house
theme wins.

Measured against this ground: **5.18:1**, comfortably clear of the 3:1 floor a graphical object has
to hold (WCAG 2.2 SC 1.4.11). The accent carries no text — the words on this beat clear 4.5:1
through `deriveFurniture`, from the same ground.

The accent is spent on exactly one mark: the subject circle's fill and outline. Every other event is
drawn in the derived muted grey, because a second hue on a univariate map would invent a second
variable. `render-web.mjs` and `QuakeSymbolWeb.tsx` name no hex of their own; both colours arrive
through `readPalette`, and the ink, muted and grid values are derived from the ground.
