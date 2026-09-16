---
ground: "#FFFFFF"
accent: "#0072B2"
accents: "#D55E00"
origin: journalist
---

The answer recorded for this beat: a bespoke pair the journalist chose — Okabe-Ito blue and
vermillion, the values this beat was already drawn in — kept over the house teal. They are recorded
in the order the chart introduces them and the legend states them: `accent` is the 2000 endpoint,
`accents` holds the 2023 endpoint. `seriesInks(palette, 2)` therefore returns exactly these two, in
exactly that order, and the dots do not move.

Why two recorded accents rather than one plus a derived shade. A dumbbell's two dots share a row and
a scale, so colour is the ONLY thing telling them apart, and the pair has to hold apart under every
colour-vision deficiency. Two shades walked off one accent differ only in lightness, and on this
type lightness reads as emphasis, not as "the earlier year". Two distinct hues is what the type
needs, and which two is the newsroom's decision.

`palette`'s subject option was checked and has nothing to offer. `matchConvention` holds four
grounded conventions (renewables, fossil, water, heat), and this beat's subject — life expectancy at
birth in 2000 against 2023 — fires none of them. Health was considered for a convention and left out
for the reason `subject-conventions.md` gives: readers do not already hold the association.

**One value moves, and it is a dead one.** The runner used to hand `renderWeb` a nominal
`accent: "#0B7A75"` with a comment saying so — the shared CSS shell always writes `--accent` from
that prop, and omitting it wrote the literal token `undefined` into the stylesheet. Nothing in this
beat's markup or CSS reads `--accent`; the committed HTML contains zero occurrences of
`var(--accent)`. The runner now passes the RECORDED primary accent there instead of a hex nobody can
reach, so the stylesheet's single `--accent:` declaration reads `#0072B2` rather than `#0B7A75`.
That is the only byte that changes and no pixel does.

Measured against this ground: `#0072B2` 5.19:1 and `#D55E00` 3.87:1, both clear of the 3:1 non-text
floor an accent has to hold (WCAG 2.2 SC 1.4.11).

`render-web.mjs` beside this file reads all three values with `readPalette` and names no hex of its
own; `DumbbellLifeExpectancyGainsWeb.tsx` takes the pair as the `colours` prop.
