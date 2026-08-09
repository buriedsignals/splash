---
ground: "#FFFFFF"
accent: "#0B7A75"
origin: newsroom
---

The answer recorded for this beat: the newsroom's own house colours, as they stand in
`skills/splash-twin/assets/root-template/NEWSROOM.example.md` (`brandColor: "#0B7A75"`,
`ground: "#FFFFFF"`). `origin: newsroom` says who chose them.

`twin-palette`'s subject-fit branch was checked and does not apply: `matchConvention` holds
conventions for renewables, fossil fuel, water and heat, and this beat's subject — where the
population of Europe lives — matches none of them. When no convention applies, the house theme wins.

**This differs from the static sibling, deliberately.** `proof/mapmore-dot-population` draws its
dots in `#0072B2`, an Okabe-Ito blue chosen before `twin-palette` existed and hard-coded in its
render script. Nothing about population makes blue the right hue — it is a palette-safe default, not
a convention a reader arrives holding — so under the recorded-answer rule this beat takes the house
accent instead. The sibling is not wrong; it is older than the mechanism.

ONE accent for every dot, because this is a univariate map: a dot means a fixed number of people and
nothing else, so a second hue would invent a second variable. The five countries the claim names are
picked out by direct labels, never by colour — the same refusal the static sibling makes, for the
same reason: the claim is about which clusters are biggest, and recolouring them would beg its own
question. The meter under the map carries the accent too, because the meter and the dots are the
same quantity in two channels.

Measured with `twin-palette`'s own `contrast`: `#0B7A75` on `#FFFFFF` is 5.18:1, clear of the 3:1
floor WCAG 2.2 SC 1.4.11 sets for a non-text mark and of the 4.5:1 text floor, which matters because
the conclusion line is drawn in the accent.
