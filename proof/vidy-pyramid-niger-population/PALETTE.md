---
ground: "#FFFFFF"
accent: "#0072B2"
accents: "#D55E00"
origin: journalist
---

The answer recorded for this beat: the two sides of the pyramid, in the order the beat draws them —
male in Okabe-Ito blue `#0072B2` (5.19:1 against the ground), female in Okabe-Ito vermillion
`#D55E00` (3.87:1), both clear of the 3:1 mark floor SC 1.4.11 sets. These are exactly the values
`render.mjs` named as hex literals until now, so the migrated render comes out unchanged.

`origin: journalist` says who chose them. This is a bespoke CVD-safe pair, not the newsroom's house
teal and not a subject convention: `matchConvention` holds renewables, fossil fuel, water and heat,
and a population's age-and-sex structure matches none of them. The type doctrine
(`chart-beat/references/types/population-pyramid.md`) requires the two side colours to be
checked **together** rather than assumed safe individually, and this is a cool/warm pair — not the
two adjacent warm hues `visual-system.md` warns about — and the same two the static Swiss pyramid
beat uses for this type.

**Two data colours, so `seriesInks(palette, 2)`.** `render.mjs` takes both through it rather than
reading `accent` and a second literal: recorded accents come back first and in order, so the render
does not move, and a beat that ever asks for more sides than were recorded fails loudly instead of
padding with the furniture grey. The subject's emphasis then reuses the FEMALE hue as a third
CHANNEL — an outline, a wash, a bold label — never as a third HUE.

The pure `#FFFFFF` and `#000000` inside `PyramidVideo.tsx`'s spine mask are NOT palette: white keeps
the rule and black erases it, which is what an SVG mask means, and neither is a colour anybody
chose. They are named `MASK_KEEP` / `MASK_ERASE` at their one definition so that stays legible.

Delete this file and the render refuses, naming every directory it searched.
