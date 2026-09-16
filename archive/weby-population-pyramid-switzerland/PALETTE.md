---
ground: "#FFFFFF"
accent: "#0072B2"
accents: "#D55E00"
origin: journalist
---

The answer recorded for this beat: a bespoke pair the journalist chose — Okabe-Ito blue and
vermillion, the values this beat was already drawn in — kept over the house teal. They are recorded
in the order the mirror draws them and the legend states them: `accent` is the male half, `accents`
holds the female half. `seriesInks(palette, 2)` therefore returns exactly these two, in exactly that
order, and neither half moves.

Why two recorded accents rather than one plus a derived shade. A pyramid mirrors ONE quantity about
a shared axis; the two halves are told apart by side and by colour, and the colour has to survive
every colour-vision deficiency because side alone does not carry the comparison the reader is
making (the crossover band, where women start to outnumber men, is read across the axis). Two shades
walked off one accent differ only in lightness, which on a bar reads as emphasis. Two distinct hues
is what the type needs, and which two is the newsroom's decision.

`palette`'s subject option was checked and has nothing to offer. `matchConvention` holds four
grounded conventions (renewables, fossil, water, heat), and this beat's subject — Switzerland's
population by age and sex — fires none of them. No convention in that table proposes a pair, either;
a categorical set is out of its scope by its own reference sheet.

The `accent` prop the runner hands `renderWeb` used to be a `NOMINAL_ACCENT` hex typed in the runner
with a comment saying nothing reads it — `renderWeb`'s shared shell always writes `--accent`, so it
has to be given something. It now takes the RECORDED primary accent, which happens to be the same
value, so the render is byte-identical; the difference is that a newsroom changing its answer now
moves it.

Measured against this ground: `#0072B2` 5.19:1 and `#D55E00` 3.87:1, both clear of the 3:1 non-text
floor an accent has to hold (WCAG 2.2 SC 1.4.11).

`render-web.mjs` beside this file reads all three values with `readPalette` and names no hex of its
own; `SwissAgePyramidWeb.tsx` takes the pair as the `colours` prop.
