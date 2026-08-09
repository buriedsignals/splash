---
ground: "#FFFFFF"
accent: "#0B7A75"
origin: newsroom
---

The answer recorded for this beat: the newsroom's own house colours, as they stand in
`skills/splash-twin/assets/root-template/NEWSROOM.example.md` (`brandColor: "#0B7A75"`,
`ground: "#FFFFFF"`). `origin: newsroom` says who chose them.

`twin-palette`'s subject-fit branch was checked and does not apply: `matchConvention` holds
conventions for renewables, fossil fuel, water and heat, and this beat's subject — the change in a
country's CO₂ emissions per person — matches none of them. When no convention applies, the house
theme wins.

**The two sign hues, and why one of them is not a hue.** `references/types/diverging-bar.md` asks for
exactly two colourblind-safe fills, one per sign. A recorded palette carries ONE accent, so the two
fills here are the accent (for the sign the beat is about, the falls) and the furniture's own
`muted`, which `deriveFurniture` derives from `ground`. Both are already required to be legible
against the ground, they are separated by saturation rather than by hue, and neither is a colour
nobody chose — which a second invented hue would be. The direction a bar points is the primary
signal in any case; the fills are the confirmation.
