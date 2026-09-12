---
format: web
type: small-multiples
---

# Beat — La France a multiplié son solaire par 40 et reste la courbe la plus plate des six (web)

**Type:** small multiples. **Medium/format:** chart / **web**. **Frame:** fluid in width, fixed in
proportion.

## Claim

Six European countries' annual solar generation, 2010–2024. **All six grew.** Spain ends highest
(2,41 → 20,7 TWh), and **France multiplied its own by 40 (0,11 → 4,4 TWh) while ending lowest of the
six** — so on the shared scale its panel is the flattest one on the page.

That tension is the finding, and it is what a shared scale is for: **a factor and a quantity are
different questions**, and a common axis answers only the second.

## Treatments spent

- `panels-share-one-scale-or-they-are-not-multiples` — every panel runs 0 to the same ceiling on the
  same years. The moment one is fitted to its own data the grid stops being a comparison and becomes
  six unrelated charts sharing a caption. The component **throws** rather than draw a panel on a
  scale of its own, and the cost is stated rather than hidden: the smallest country's curve is nearly
  flat, and that flatness is the reading.
- `what-is-shared-is-stated-once-and-what-varies-is-repeated` — scale, span and unit above the grid;
  name and final value inside every panel.

A panel with a missing year throws too: a hole in one panel is not a multiple.

## What the web adds

A grid is read as a set of SHAPES — its whole advantage and its whole cost, since nothing in a
240-pixel panel can carry fifteen years of numbers. Every panel answers with its country, both ends,
the multiple it grew by, its rank among the six, and the year it first passed one terawatt-hour.

## Verification

`verify-web.mjs --file renders/creme.html` — **52 passed, 0 failed, 7 skipped**.

## Source

Ember, Energy Institute — Statistical Review of World Energy (2025), via Our World in Data ·
2010–2024. `data.csv` is a byte-for-byte copy of
`proof/static-small-multiples-solar-eu-six/data.csv`.
