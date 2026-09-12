---
format: web
type: grouped-bar
---

# Beat — La Suisse est la seule des six où le solaire dépasse l'éolien (web)

**Type:** grouped bar. **Medium/format:** chart / **web**. **Frame:** fluid.

## Claim

Wind and solar as shares of each country's own 2024 electricity. In five of six countries wind is the
taller column; **Switzerland is the exception — solar 7,2 % against wind 0,2 %.** The beat throws if
the number of countries where solar beats wind is not exactly one.

## Treatments spent

- `the-group-boundary-is-drawn` — the two bars of one country sit tight against each other and the
  next country starts after a gap wider than the bars themselves. Without that a grouped bar reads as
  one long row of alternating colours and the grouping, which is the whole device, disappears.
- Two series, **one hue at two chromas**: wind and solar are two forms of the same quantity (a share
  of the same electricity), not two categories that happen to sit together.

## What the web adds

A grouped bar answers "which is bigger" at a glance; it cannot answer "by how much" without the
reader measuring, and it says nothing at all about the whole the two shares came out of. Every group
answers with **both shares, their ratio, the TWh behind each, and the country's total generation** —
Switzerland's 7,2 % is 5,6 TWh out of 78, Germany's 14,9 % is 74 out of 496.

## Verification

`verify-web.mjs --file renders/creme.html` — **56 passed, 0 failed, 5 skipped**.

## Source

Ember, Energy Institute — Statistical Review of World Energy (2025), via Our World in Data · 2024.
`data.csv` is a byte-for-byte copy of `proof/static-wind-vs-solar/data.csv`.
