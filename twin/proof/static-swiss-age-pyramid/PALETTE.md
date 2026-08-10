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
grounded conventions (renewables, fossil, water, heat) and this beat's subject — Switzerland's
population by age and sex — fires none of them. And a single accent could not have supplied this
beat: the type is two back-to-back bar charts, one per group, so it needs two inks that a
colour-vision-deficient reader can tell apart as a pair
(`references/types/population-pyramid.md`'s accessibility note).

Order matters and is not cosmetic: `seriesInks` returns the recorded accents in the order they are
written, so `accent` is the left side of the spine and the first entry of `accents` is the right.
Measured against this ground: `#0072B2` 5.19:1, `#D55E00` 3.87:1 — both clear of the 3:1 non-text
floor an accent has to hold (WCAG 2.2 SC 1.4.11).

The peak-band callout is drawn INSIDE the widest left-hand bar, so its ink is chosen against that
bar rather than against the ground — `annotation-ink.mjs` measures it and throws if nothing reads.
That measurement now follows the recorded accent instead of a constant, which is the point of the
migration: change the recorded colour and the callout's ink is re-derived rather than left stale.

`render.mjs` and `SwissAgePyramid.tsx` name no hex; both side colours arrive through `readPalette`
and `seriesInks`, threaded into the component as `maleInk` and `femaleInk`.
