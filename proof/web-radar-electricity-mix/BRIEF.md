---
format: web
type: radar
---

# Beat — France et Allemagne produisent presque autant d'électricité et n'ont presque aucune source en commun (web)

**Type:** radar (spider). **Medium/format:** chart / **web**. **Frame:** fluid in width, fixed in
proportion.

## Claim

In 2024 France generated **562 TWh** and Germany **496** — within **12 %** of each other — from mixes
that share almost nothing: nuclear **67,7 % against 0**, wind + solar **12,5 % against 43,5 %**, coal
**0,2 % against 21,4 %**. The beat throws if the two totals are not within a fifth of each other or
if the nuclear gap is under 50 points.

## Treatments spent

- `the-grid-is-circles-and-the-ceiling-is-drawn` — the rings are **circles**, not a polygon joining
  the axes, and the outermost ring carries its own value. A polygonal grid makes a value near an axis
  look larger than the same value between two.
- **Two shapes, never more** — a radar stops working at three: the overlaps stop being readable and
  the fills stop being separable. The page says so rather than leaving it as a preference.

## What the web adds

A radar's shape is memorable and its values are not: a reader sees "France spikes here, Germany
spreads there" and cannot put a number on either point. Every vertex answers with the country, the
source, its exact share, the TWh, and **what the other country has on the same axis**.

## The one place this base sets type inside an SVG

The fluid frame keeps every word in HTML because `preserveAspectRatio="none"` would stretch a
`<text>` out of shape. **This beat does not stretch** — a radial geometry cannot: an ellipse would
make the same share read as two different distances depending on which axis it sat on. So it
letterboxes instead, and that broke the overlay: the `<svg>` shrinks inside its grid cell and
centres, while an HTML label positioned in percentages of that CELL does not. Measured on the first
render, where every axis name sat in a corner of the frame with the radar small in the middle.

Inside the viewBox the labels follow the drawing exactly. The stated cost is that they scale with the
graphic instead of holding a fixed pixel size — the trade this format normally refuses, taken here
because the alternative is labels that point at nothing.

## Verification

`verify-web.mjs --file renders/creme.html` — **52 passed, 0 failed, 7 skipped**.

## Source

Ember, Energy Institute — Statistical Review of World Energy (2025), via Our World in Data · 2024.
`data.csv` is a byte-for-byte copy of `proof/static-radar-electricity-mix/data.csv`.
