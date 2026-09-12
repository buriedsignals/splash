---
format: web
type: heatmap
---

# Beat — 7 pays européens tirent plus de 94 % de leur électricité de sources bas-carbone (web)

**Type:** heatmap (matrix). **Medium/format:** chart / **web**. **Frame:** fluid.

## Claim

**Seven European countries draw more than 94 % of their electricity from low-carbon sources — and
they get there by three different routes.** Albania, Iceland and Norway do it **without any nuclear
at all**. France does it **on nuclear**, 67,7 % of its mix. Sweden, Switzerland and Finland do it on
**both**, each above 50 % renewables *and* above 25 % nuclear.

The three routes are a **computed partition**, not a caption: three disjoint tests, and a country
falling into none of them or into two throws.

## Treatments spent

- `a-sequential-grid-is-one-hue-cluster` — one hue at increasing strength. Nine sources are nine
  columns, **not nine colours**: a qualitative palette here would say the sources differ in kind
  along the axis that is supposed to carry magnitude.
- `the-cell-value-is-printed-or-the-region-is-named` — the cells that carry the argument print their
  own share, and **every one of the 63 answers with its exact value** under the pointer.
- `order-is-chosen-from-the-answer` — rows ordered by low-carbon share, columns grouped renewables
  first, so the three routes are three **shapes** rather than three facts to assemble.

## What the web adds

A heatmap cell is a colour, and a colour is a bin. Every cell answers with its exact share, the TWh
behind it, and the country's rank among the seven for that source.

## What the render taught, and it corrects a rule

The first ramp lifted **every** bin to the non-text contrast floor against the ground. That is the
right rule for a **mark** and the wrong one for a **ramp**: `adjustToContrast` darkens toward the
ground's opposite pole, so the two lightest bins came out grey while the rest stayed blue — a
sequential scale that changes hue halfway is not a sequential scale. A ramp's low end is *supposed*
to be close to the ground; what it owes the reader is a key, which this page prints, and a cell edge,
which it draws.

Three stacked annotation lines cost 44 px of an 812 px phone window; they are one paragraph now.

## Verification

`verify-web.mjs --file renders/creme.html` — **56 passed, 0 failed, 5 skipped**.

## Source

Ember, Energy Institute — Statistical Review of World Energy (2025), via Our World in Data · 2024,
40 European countries measured, 7 above the floor. `data.csv` is a byte-for-byte copy of
`proof/static-heatmap-europe-electricity/data.csv`.
