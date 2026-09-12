# the-ramp-deepens-outward

- kind: imported
- name: Each side is one ramp, palest at the centre and deepest at the extreme
- applies: the beat draws two or more levels on each side of a centre
- draws: value
- priority: 8
- evidence: vega-github-io-vega-lite-examples-bar-diverging-stack-transform-html
- evidence: jbryer-github-io-likert
- detect: within each side, a level further from the centre is drawn darker or more saturated than
  the one inside it

## The rule

One ramp per side, palest beside the centre, deepest at the extreme.

## Why it is the reason to use this form at all

Vega-Lite's record says it: *"strength of opinion reads as colour intensity as well as as distance,
which is the whole reason to prefer this over a plain stacked bar."* Two channels — position and
intensity — carrying the same thing, so a reader who cannot judge the length still reads the lean.
jbryer's Likert plate obeys the same rule on a different hue axis, which is what makes it a rule
rather than one library's default.

## The choice it does not make for you

jbryer picks brown/teal **for CVD separation, not for prettiness**. A beat with one house accent
reaches the same separation differently: one side ramps the accent, the other ramps the neutral, and
they differ in chroma as well as lightness. What may not happen is two hues chosen because they look
opposed.
