---
ground: "#FFFFFF"
accent: "#0B7A75"
origin: newsroom
---

The answer recorded for this beat: the newsroom's own house colours, as they stand in
`skills/splash/assets/root-template/NEWSROOM.example.md` (`brandColor: "#0B7A75"`,
`ground: "#FFFFFF"`).

`palette`'s subject option was checked and does not apply. The subject is the distribution of
CO₂ emissions per person across 213 countries; `matchConvention` returns nothing for it, because
none of the four grounded conventions (renewables, fossil, water, heat) fires on CO₂ emissions as a
phrase. When no convention applies, the house theme wins.

**Where the accent lands: nowhere, and that is a finding rather than an omission.** This beat's only
annotation is the median rule, and the rule runs THROUGH the tallest bar, so whatever hue it takes
is measured against the bar's `#616161` and not against the page. The recorded accent measures
5.18:1 against this ground and **1.20:1 against that bar** — `references/types/histogram.md` asks
for the accent on the median line, and this render forced the amendment that says otherwise. The
rule's ink is derived from the marks it crosses (`annotation-ink.mjs`), which here is near-black.
A beat that cannot spend its accent anywhere a reader would see it does not take one.

The value is still recorded, for two reasons. The bars themselves are furniture-muted, so a
newsroom changing its accent should be told plainly that this chart will not move — silence would
read as the change having been applied. And the frozen `probe/` copy of this component, kept
deliberately at the 1.20:1 the beat has since corrected, is the one caller that DOES stroke the rule
in the accent; it now reads this file rather than naming the colour itself, so the probe keeps
measuring the beat's own colours instead of a stale copy of them.

`render.mjs` and `probe/probe.mjs` read both values with `readPalette` and name no hex of their own.
