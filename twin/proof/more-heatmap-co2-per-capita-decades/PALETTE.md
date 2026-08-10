---
ground: "#FFFFFF"
accent: "#4A9C8F"
accents: "#04241E"
origin: journalist
---

The answer recorded for this beat: the two poles of its sequential ramp — the values the component
named as `RAMP_LOW` and `RAMP_HIGH` before this file existed. Both are stops on ONE hue, the house
teal, but neither IS the house teal, so `origin: journalist` is the honest field: the newsroom's
`brandColor` is `#0B7A75` and these are a pale and a deep pole chosen for this chart.

`twin-palette`'s subject option was checked and does not apply. The subject is per-capita CO₂
emissions by country and decade; `matchConvention` returns nothing for it, because none of the four
grounded conventions (renewables, fossil, water, heat) fires on CO₂ emissions as a phrase.

**Why a heatmap records two accents where every other beat records one.** On this type colour IS the
quantitative channel — there is no length or position carrying the value — so the recorded answer
has to be the whole ramp, not one end of it. `references/types/heatmap.md`'s single failure mode is
a ramp whose luminance does not move in one direction, because a greyscale reader and a
colour-vision-deficient reader are both, in effect, reading luminance; a ramp interpolated between
two stops of one hue is monotonic by construction, and `checkRampFloor` samples the real ramp
against the real ground rather than assuming it.

`seriesInks` returns the recorded accents in written order, so `accent` is the PALE pole and the
first entry of `accents` is the deep one. That order is the encoding: swap them and the grid inverts.

The pale pole is not a pale tint, and that is the beat's own hard-won measurement: the obvious tint
(`#E3F2F0`) measured **1.15:1** against this ground and nearly vanished, caught by `checkRampFloor`
at build time before anybody looked at it. `#4A9C8F` is the palest stop on this hue that still
clears the 3:1 non-text floor (WCAG 2.2 SC 1.4.11) — it measures 3.26:1, and `#04241E` measures
16.45:1, which is what gives the ramp its range.

`render-web.mjs` and `Co2HeatmapWeb.tsx` name no ramp hex; both poles arrive through `readPalette`
and `seriesInks`, threaded in as the `ramp` prop. The `#000000`/`#FFFFFF` pair left in the in-cell
value's ink is the contrast-pole test against the cell it sits on — the two ends of the luminance
range, not a colour anybody chooses.
