---
format: web
type: stacked-bar
---

# Beat — L'Espagne a ajouté plus d'électricité bas-carbone que la France depuis 2000 (web)

**Type:** stacked bar. **Medium/format:** chart / **web**. **Frame:** fluid.

## Claim

**Spain added +119 TWh of low-carbon electricity between 2000 and 2024 against France's +50, having
started five times lower (97 against 483 TWh). France is still the largest producer, at 533 TWh.**
Four things asserted: that the largest adder is *not* the largest producer, that it added more, that
the leader started several times higher, and that the leader still holds the largest total.

## Treatments spent

- `the-stack-gives-back-the-total-it-hides` — a stack's segments are comparable only at the baseline;
  every one above it starts somewhere the reader cannot see. Each bar prints its own total, and the
  ranking is built on that total.
- `a-segment-not-starting-at-zero-carries-its-own-number` — every segment wide enough prints its TWh
  inside itself.
- **The earlier total is a tick on the bar, not a second bar.** The headline is about the ADDITION,
  and an addition is the distance between a mark and the end of the bar it sits on.

## What the web adds

A stack hides its own arithmetic. Every segment answers with its source, its TWh, its share of that
country's low-carbon total, and **what it was in 2000** — the per-source history the plate has no
room for sixteen times over. Solar in Spain went from nothing to 58 TWh; France's nuclear moved 380
→ 380.

## What the render taught

The total-plus-addition label was one unwrapped run in a 150-unit gutter, and at 375 px it pushed the
document 58 px sideways. The gutter is wider, the label wraps, and the row-name gutter gave back the
difference.

## Verification

`verify-web.mjs --file renders/creme.html` — **56 passed, 0 failed, 5 skipped**.

## Source

Ember, Energy Institute — Statistical Review of World Energy (2025), via Our World in Data · 2000 and
2024. `data.csv` is a byte-for-byte copy of `proof/static-stacked-bar-lowcarbon-growth/data.csv`.
