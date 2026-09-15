---
ground: "#FFFFFF"
accent: "#0072B2"
accents: "#D55E00"
origin: journalist
---

The answer recorded for this beat: a bespoke pair the journalist chose — Okabe-Ito blue and
Okabe-Ito vermillion, the two values the component named as `COLOURS` before this file existed —
kept over both the house accent and a subject convention.

`palette`'s subject option was checked and has nothing to offer. `matchConvention` holds four
grounded conventions (renewables, fossil, water, heat) and this beat's subject — life expectancy
gained between 2000 and 2023 — fires none of them. And the house theme could not have supplied this
beat on its own: `references/types/dumbbell.md` asks for exactly two hues, one per year, and a
single recorded accent is one. So the pair stays, recorded as the journalist's own choice.

**Why two accents and not one accent plus a derived shade.** With no positional convention telling
a reader which dot is the earlier year — a dumbbell has no left-is-earlier reading the way a slope
chart does — the two colours are the only thing naming the series, on every row, and the legend is
load-bearing rather than decorative. Two shades of one hue would separate by lightness alone; a
cool/warm pair separates by hue as well, and holds up under colour-vision-deficiency simulation.

Order matters here and is not cosmetic: `seriesInks` returns the recorded accents in the order they
are written, so `accent` is the 2000 dot and the first entry of `accents` is the 2023 dot. Measured
against this ground: `#0072B2` 5.19:1, `#D55E00` 3.87:1 — both clear of the 3:1 non-text floor an
accent has to hold (WCAG 2.2 SC 1.4.11).

`render.mjs` and `DumbbellLifeExpectancyGains.tsx` name no hex; both dot colours arrive through
`readPalette` and `seriesInks`, threaded into the component as `startInk` and `endInk`.
