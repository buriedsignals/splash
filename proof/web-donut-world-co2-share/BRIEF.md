---
format: web
type: donut
---

# Beat — En 2000 les États-Unis pesaient 24,4 % du CO₂ mondial et la Chine 14,7 % ; en 2023 ils ont échangé (web)

**Type:** pie and donut (paired concentric rings). **Medium/format:** chart / **web**.
**Frame:** fluid, except the angle.

## Claim

In 2000 the United States emitted **24,4 %** of the world's CO₂ and China **14,7 %**; in 2023 China
emits **32,9 %** and the United States **13,3 %**. They swapped. Meanwhile the world's total went from
**24,7 to 37,0 Gt — up 50 %.** The beat refuses if the two did not swap or if the whole did not grow
by at least a third.

## Why two rings and not two pies side by side

A pie answers one question well: what share is this, of that whole. **Two pies side by side quietly
answer a second one they cannot support** — did the whole change — because nothing says the two
circles stand for different totals. Concentric rings share a centre and an angular scale, so a
wedge's angle is comparable between them, and the two totals are **written in the hole** rather than
drawn. The hole is not decoration: it is where the whole is stated.

`conservation-is-kept-visible` — each ring is closed: six named wedges plus "tous les autres" make the
whole, and the remainder is a wedge like any other rather than a gap.

## What the web adds

**A wedge is an angle, and an angle is the least readable encoding on this list**: a reader can rank
wedges and can barely measure one. Every wedge answers with its country, its share of its own year's
world total, the tonnes behind it, and what the same country held in the other year.

## Two decisions the render forced

- **The angle cannot stretch.** Like the pictogram, this beat sets `xMidYMid meet`: stretching the box
  turns every angle into a different angle, which is the one thing this form cannot survive.
- **The ramp runs the other way.** Wedges are ordered largest first, so tone 0 is the subject and the
  last tone is the remainder. The first render gave its strongest step to "tous les autres" — the
  loudest colour on the one slice that names nobody.

## Verification

`verify-web.mjs --file renders/creme.html` — **56 passed, 0 failed, 5 skipped**.

## Source

Global Carbon Budget 2025 · populations 2000 and 2023, via Our World in Data. `data.csv` is a
byte-for-byte copy of `proof/static-donut-world-co2-share/data.csv`.
