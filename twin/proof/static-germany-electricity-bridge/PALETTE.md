---
ground: "#FFFFFF"
accent: "#0072B2"
accents: "#D55E00"
origin: journalist
---

The answer recorded for this beat: a bespoke pair the journalist chose — Okabe-Ito blue and
Okabe-Ito vermillion, the two values the component named as `COLOURS` before this file existed —
kept over both the house accent and a subject convention.

`twin-palette`'s subject option was checked and, unusually, it is the MULTI-MATCH case that applies.
The subject is Germany's electricity bridge: the steps are a renewables build-out, a fossil decline
and a nuclear phase-out, so both the `renewables` and the `fossil` conventions fire, and
`matchConvention` returns nothing when several match — deliberately, because which series carries
the argument is an editorial decision and not one a lookup table gets to make by row order. So the
question fell back to a bespoke pair, and that pair is what is recorded.

**Why the pair is blue and vermillion.** `references/types/waterfall.md` asks for two hues for the
two directions of change and rules out red/green explicitly — the pairing colour-vision deficiency
confuses most. Blue and vermillion stay apart for a deuteranope, which is the whole reason a
waterfall gets two hues rather than one. The TOTAL bars are neither: they take the furniture's
`muted`, derived from the ground, because they are the frame the deltas hang from rather than a
third category of change.

Order matters and is not cosmetic: `seriesInks` returns the recorded accents in the order they are
written, so `accent` is the increase fill and the first entry of `accents` is the decrease. Measured
against this ground: `#0072B2` 5.19:1, `#D55E00` 3.87:1 — both clear of the 3:1 non-text floor an
accent has to hold (WCAG 2.2 SC 1.4.11). The value label on each bar is inked against the bar it
sits on, not against the ground, so it follows a recorded colour that changes.

`render.mjs` and `ElectricityBridgeWaterfall.tsx` name no hex in a colour position; both fills
arrive through `readPalette` and `seriesInks`, threaded in as `increaseFill` and `decreaseFill`.
The `#000000`/`#FFFFFF` pair left in `inkOn` is the contrast-pole test — the two ends of the
luminance range, not a colour anybody chooses.
