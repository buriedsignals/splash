---
ground: "#FFFFFF"
accent: "#009E73"
accents: "#0072B2, #D55E00"
origin: journalist
---

The answer recorded for this beat: a bespoke set of three the journalist chose — Okabe-Ito
bluish-green, blue and vermillion, the values the component named as `COLOURS` before this file
existed — kept over both the house accent and a subject convention.

`twin-palette`'s subject option was checked and this is the MULTI-MATCH case. The subject is a
country's electricity mix split into renewables, nuclear and fossil, so both the `renewables` and
the `fossil` conventions fire, and `matchConvention` returns nothing when several match —
deliberately, because which series carries the argument is an editorial decision and not one a
lookup table gets to make by row order. Nor could the house theme supply this beat on its own: a
100%-stacked column needs one distinct fill per band, and a recorded palette carries one accent.

**Order is the encoding here, not a preference.** `seriesInks` returns the recorded accents in
written order, and this beat spends them bottom-to-top: `accent` is renewables (the baseline band a
reader compares across columns), then nuclear, then fossil. The stacking order is fixed for every
column — reordering per column is the specific defect `references/types/stacked-bar.md` warns about.

Exactly one of the three is a warm hue, so no two adjacent bands are both warm — the same
discipline the grouped-bar beat holds. Measured against this ground: `#009E73` 3.42:1, `#0072B2`
5.19:1, `#D55E00` 3.87:1 — all clear of the 3:1 non-text floor an accent has to hold
(WCAG 2.2 SC 1.4.11). Each segment's value label is inked against its own band rather than against
the ground, so it follows a recorded colour that changes.

`render.mjs` and `ElectricityMixStack.tsx` name no hex in a colour position; all three fills arrive
through `readPalette` and `seriesInks`, threaded in as the `fills` record. The `#000000`/`#FFFFFF`
pair left in `inkOn` is the contrast-pole test — the two ends of the luminance range, not a colour
anybody chooses.
