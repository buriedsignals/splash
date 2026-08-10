---
ground: "#FFFFFF"
accent: "#0072B2"
accents: "#D55E00"
origin: journalist
---

The answer recorded for this beat: a bespoke pair the journalist chose — two Okabe-Ito hues, the
values this beat was already drawn in — kept over the house teal. They are recorded in the order the
legend states them and the chart introduces them: `accent` is the INCREASE fill, `accents` holds the
DECREASE fill. `seriesInks(palette, 2)` therefore returns exactly these two, in exactly that order,
and the chart does not move.

Why two recorded accents rather than one plus a derived shade. On a waterfall, colour encodes the
SIGN of each step — up or down — and a reader has to tell the two apart at a glance and under every
colour-vision deficiency. Two shades walked off one accent differ only in lightness, and a bar's
lightness is already doing nothing else, so a pale-blue/dark-blue pair would be read as "small step /
big step" rather than "up / down". Two distinct hues is what the type needs, and which two is the
newsroom's decision.

`palette`'s subject option was checked and has nothing to offer. `matchConvention` holds four
grounded conventions (renewables, fossil, water, heat); this bridge's steps are renewables, the
nuclear phase-out and a falling fossil share, so a convention lookup would fire on `renewables` AND
`fossil` — a multi-match, which `matchConvention` deliberately answers with null so no table decides
which series carries the argument. And in any case the fills here do not encode the SOURCE, they
encode the DIRECTION: the renewables step is drawn as an increase, not as renewables.

The two opening and closing TOTAL bars stay in the furniture's `muted`, derived by `deriveFurniture`
from `ground` — a total is not a step and must not read as one.

Measured against this ground: `#0072B2` 5.19:1 and `#D55E00` 3.87:1, both clear of the 3:1 non-text
floor an accent has to hold (WCAG 2.2 SC 1.4.11).

`render-web.mjs` beside this file reads all three values with `readPalette` and names no hex of its
own; `WaterfallWeb.tsx` takes the pair as the `colours` prop.
