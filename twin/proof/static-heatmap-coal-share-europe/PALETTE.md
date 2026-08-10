---
ground: "#FFFFFF"
accent: "#3A3A3A"
origin: subject
---

The answer recorded for this beat: `palette`'s **subject** option.

`matchConvention("coal's share of electricity")` returns exactly one grounded convention —
`fossil` — and returns it alone, so there was nothing for the journalist to disambiguate. Its
reasoning, from `palette/references/subject-conventions.md`: near-black grey reads as coal,
the material's own colour, and it stays legible where a saturated hue would compete with the
renewable green it is usually plotted against.

It happens to be the ideal accent for **this type** as well, and that is worth recording rather
than treating as luck. A heatmap's colour carries its entire quantitative channel, and
`references/types/heatmap.md`'s one failure mode is a ramp whose luminance does not move in one
direction — because a greyscale reader and a colour-vision-deficient reader are both, in effect,
reading luminance. A ramp built between two greys is monotonic in luminance by construction. The
render still measures it rather than assuming it.

Measured against this ground: 11.36:1, far clear of the 3:1 non-text floor the accent has to hold
(WCAG 2.2 SC 1.4.11), which leaves room for a long ramp whose palest stop still clears that floor.

`render.mjs` and `CoalShareHeatmap.tsx` name no hex; both colours arrive through `readPalette`,
and every ramp stop between them is derived.
