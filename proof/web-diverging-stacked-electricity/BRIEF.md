---
format: web
type: diverging-stacked-bar
---

# Beat — En 2024, le nucléaire français pèse plus lourd que le fossile et le renouvelable réunis (web)

**Type:** diverging stacked bar (Likert-shaped lean). **Medium/format:** chart / **web**.
**Frame:** fluid.

## Claim

Each country's 2024 electricity mix as a lean: **fossil** left (coal, oil, gas), **renewables** right
(wind, solar, hydro, bioenergy, other), **nuclear straddling the centre**. France's nuclear share is
**67,7 %**, against 5,1 % fossil and 27,2 % renewable — larger than both wings together. Poland leans
furthest left (68,9 % fossil), Norway furthest right (98,6 % renewable, no nuclear at all).

The beat throws if the subject's centre band is not larger than its two wings, and checks that each
country's three groups sum to 100 % before drawing.

## Treatments spent

- `the-neutral-straddles-the-centre` — and here the neutral is **not a judgement call**: nuclear is
  neither fossil nor renewable *by definition*, which is what makes it the middle band rather than a
  category assigned to a wing. A Likert scale's "neither agree nor disagree" is the same case.
- `name-each-half-in-words` — the two directions are named above the rows and again under them,
  because a reader who does not already know which way is which cannot recover it from the bars.
- Three bands, **one hue family, three strengths**: the wings are the direction's accent and a step
  off its ground, the middle a tint between them. A second hue would make the neutral a third
  category; it is not, it is the middle.

## What the web adds

Three bands per country is three numbers; the mix they summarise is **nine**. Every row answers with
the full breakdown — the three groups and every source inside them that reaches half a point. That is
the question a three-way lean immediately raises and cannot answer on paper.

A band narrower than four points prints no label (Norway's 1,4 % fossil, Switzerland's 1,9 %) — a
number that does not fit inside its own band is a collision, not a reading. Those bands are still
answered by the pointer, which is the whole point of building this form here.

## Verification

`verify-web.mjs --file renders/creme.html` — **56 passed, 0 failed, 5 skipped**.

## Source

Ember, Energy Institute — Statistical Review of World Energy (2025), via Our World in Data · 2024.
`data.csv` is a byte-for-byte copy of `proof/static-diverging-stacked-electricity/data.csv`.
