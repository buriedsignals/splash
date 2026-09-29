---
ground: "#FFFFFF"
accent: "#0B7A75"
origin: newsroom
---

The answer recorded for this beat: the newsroom's own house colours, as they stand in
`skills/splash/assets/root-template/NEWSROOM.example.md` (`brandColor: "#0B7A75"`,
`ground: "#FFFFFF"`). `origin: newsroom` says who chose them.

`palette`'s subject-fit branch was checked and does not apply. `matchConvention` holds
conventions for renewables, fossil fuel, water and heat; this beat's subject — where and when
magnitude-4 earthquakes were catalogued — matches none of them, and the "heat" entry's warm red
would be actively wrong here, since it is the convention for rising temperature and this map
encodes a count. When no convention applies, the house theme wins.

The accent is spent on exactly ONE shape: the outline of the densest cell, and the line of type
that names its tally. It is deliberately not a member of the class ramp, so no reader can mistake
it for a class. The ramp itself is derived at render time from `ground` and the ink
`deriveFurniture` derives from it — five shades of one hue, luminance moving in one direction only,
so a reader can rank two cells by darkness without consulting the legend.

Measured with `palette`'s own `contrast`: `#0B7A75` on `#FFFFFF` is 5.18:1, well clear of the 3:1 floor WCAG 2.2 SC 1.4.11 sets for
a non-text mark, and clear of 4.5:1 too, which matters because the accent also carries a line of
text on this frame.
