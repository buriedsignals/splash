---
ground: "#FFFFFF"
accent: "#0072B2"
accents: "#c68900"
origin: journalist
---

The answer recorded for this beat: a bespoke pair the journalist chose — a cool hue for wind and a
warm one for solar, the shape the component argued for as `WIND_COLOUR` / `SOLAR_COLOUR` before this
file existed. Only one warm member sits in the set, so the "two warm hues adjacent" trap
`references/types/grouped-bar.md` names (an orange next to a vermillion) cannot occur here.

`palette`'s subject option was checked and this is the MULTI-MATCH case: the subject is wind
and solar generation, so `renewables` fires on both series at once and `matchConvention` returns
nothing when it cannot separate them. Nor could the house theme supply this beat alone — a grouped
bar needs one ink per series and a recorded palette carries one accent. So a bespoke pair, recorded
as the journalist's own.

**The solar ink MOVED, and this is why.** The component drew solar in Okabe-Ito orange `#E69F00`.
Recording that value is refused, and the refusal is right:

> `#E69F00` on `#FFFFFF` measures **2.25:1** — under the 3:1 floor WCAG 2.2 SC 1.4.11 Non-text
> Contrast sets for a graphical object a reader identifies the data by. A reader cannot see it. The
> nearest variant that clears the floor is `#c68900`, at 3.01:1.

`#c68900` is what is recorded, and it is not an invented colour: `adjustToContrast` walks the beat's
own orange toward the ink pole in 2 % steps and stops at the first step that clears the floor, so it
is the same hue at the darkness the criterion requires. Solar bars are now a touch deeper than they
shipped; nothing else about the frame moves. The floor was not lowered and the beat was not
exempted — a bar a reader cannot separate from the page is the defect this whole record exists to
surface, and it was in the tree rather than invented for it.

Order matters and is not cosmetic: `seriesInks` returns the recorded accents in written order, so
`accent` is the wind bar and the first entry of `accents` is the solar bar. Measured against this
ground: `#0072B2` 5.19:1, `#c68900` 3.01:1 — both clear the 3:1 non-text floor.

`render.mjs` and `WindVsSolarBar.tsx` name no hex; both inks arrive through `readPalette` and
`seriesInks`, threaded into the component as `windInk` and `solarInk`.
