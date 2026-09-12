---
format: web
type: lollipop
---

# Beat — La Chine a triplé son CO₂ par personne depuis 2000 (web)

**Type:** lollipop (paired). **Medium/format:** chart / **web**. **Frame:** fluid.

## Claim

Among the six countries with the largest **total** emissions in 2023 — 63,9 % of the world's CO₂ —
China's per-person figure went from **2,9 to 8,6 t** (×2,98) while the United States fell from 21,4 to
14,3. **The ratio between the two averages fell from 7,5 to 1,7.** The six are a computed rule, not a
pick: per-person × population, ranked. The beat throws if the subject did not roughly triple, if the
ratio did not fall into that band, or if the six do not carry most of the world's emissions.

## Why a lollipop and not the dumbbell next door

A dumbbell draws the **gap** and says nothing about how far either end is from nothing. A lollipop
pair draws each state as its own stem **from zero**, so the two LEVELS are the first reading and the
gap the second — which is what this claim is about.

- `two-states-of-one-measure-are-one-hue-at-two-chromas` — the earlier state is a lighter tint of the
  later state's own hue. Not grey, not a second hue.
- `every-bar-labelled-lets-the-axis-go` — both values are printed above their own heads, so the page
  carries a zero line and its unit instead of a value axis.

## What the web adds

Twelve stems and twelve printed numbers already say a lot; what they cannot say is the **weight**
behind them. A per-person figure is a division, and the population it was divided by is exactly what
a reader needs before comparing China with Japan. Every pair answers with both levels, the change,
the population, the country's total emissions and its share of the world.

## Verification

`verify-web.mjs --file renders/creme.html` — **56 passed, 0 failed, 5 skipped**.

## Source

Global Carbon Budget 2025 · population 2023, via Our World in Data. `data.csv` is a byte-for-byte copy
of `proof/static-lollipop-co2-per-person/data.csv`.
