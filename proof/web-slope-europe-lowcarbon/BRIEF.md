---
format: web
type: slope
---

# Beat — Les seize ont tous gagné de l'électricité bas-carbone depuis 2000, un seul a dépassé la France (web)

**Type:** slope (slopegraph). **Medium/format:** chart / **web**. **Frame:** fluid in width, fixed in
proportion.

## Claim

**All sixteen countries gained low-carbon electricity between 2000 and 2024 — and exactly one
overtook France.** Finland was **25,1 points below** France in 2000 and is above it in 2024 (95,3 %
against 94,9). Denmark made the largest gain, **+73,7 points** (15,5 % → 89,2 %).

**A crossing is derived, never eyeballed**: a pair crosses when the sign of their gap flips between
the rails. The beat throws if any country fell, or if the number that overtook the pivot is not
exactly one.

## Treatments spent

`the-slope-carries-direction-and-the-number-carries-magnitude` — the angle says which way and how
fast; the two printed numbers say how much. Neither does the other's job, which is why a slopegraph
can afford two rails and no axis between them.

## What the web adds

Sixteen lines converging on two rails means most labels have to be stacked or dropped. Every line
answers with its country, both levels, the gain in points, its rank among the sixteen, and **who it
crossed on the way** — a per-country crossing list the plate could not carry sixteen times.

## What the render taught

Crowded rail labels were pushed **upward**, which lifted the highest one past the top of the rail and
into the rail's own heading — "99 % Suède" printed over "2024". They are pushed **down** now, which
cannot leave the frame: sixteen labels 15 units apart are 240 units in a plot 400 tall.

## Verification

`verify-web.mjs --file renders/creme.html` — **52 passed, 0 failed, 7 skipped**.

## Source

Ember, Energy Institute — Statistical Review of World Energy (2025), via Our World in Data · 2000 and
2024. `data.csv` is a byte-for-byte copy of `proof/static-slope-europe-lowcarbon/data.csv`.
