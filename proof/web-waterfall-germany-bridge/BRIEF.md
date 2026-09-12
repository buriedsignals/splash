---
format: web
type: waterfall
---

# Beat — L'électricité allemande a perdu 143 TWh entre 2015 et 2024 (web)

**Type:** waterfall (bridge). **Medium/format:** chart / **web**. **Frame:** fluid.

## Claim

Germany's total electricity generation fell from **639 TWh in 2015 to 496 in 2024 — a net −143** —
because the nuclear phase-out (**−92**) and a falling fossil share (**−154**) outweighed renewables
growth (**+103**).

## Treatments spent

- `net-change-between-declared-levels` — a waterfall is honest only if **both ends are levels the page
  names**. Otherwise the steps float over nothing and a reader cannot tell whether they add up.
- `conservation-is-kept-visible` — the moves sum to the difference between the two levels, and the
  runner **checks it before drawing**, then checks again that the bridge lands on the declared level.
  A bridge that does not reconcile is a bar chart with connectors.
- `sign-is-direction-and-hue-only-doubles-it` — a step's direction is up or down; colour repeats it.

## What the web adds

A step starts wherever the previous one ended, so **only the first and the last are measured against
anything a reader can see**. Every step answers with its own value, the level it starts from, the
level it ends at, and its share of the total movement.

## What the render taught

A value printed **above** its bar is right for a short step and wrong for a tall bar whose top is
already near the frame: at 375 px the plot is a hundred units tall and the label a fixed fourteen
pixels, so it lifted clean out of the svg, where the hit area cannot answer for it. A value now goes
**inside** its own bar when the bar can hold it, in `inkOnFill`'s ink for that fill.

## Verification

`verify-web.mjs --file renders/creme.html` — **56 passed, 0 failed, 5 skipped**.

## Source

Ember, Energy Institute — Statistical Review of World Energy (2025), via Our World in Data · Germany,
2015 and 2024. `data.csv` is a byte-for-byte copy of
`proof/static-germany-electricity-bridge/data.csv`.
