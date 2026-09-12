---
format: web
type: sankey
---

# Beat — Le nucléaire est la première source de ces six pays, et 84 % en sort de la France (web)

**Type:** sankey. **Medium/format:** chart / **web**. **Frame:** fluid in width, fixed in proportion.

## Claim

In 2024 six European countries generated **1 638 TWh** from nine sources. **Nuclear is the largest at
455 TWh, and 83,6 % of it is generated in France alone.** Germany, the second-largest generator on
the page, has none. The beat throws if one country does not hold at least four fifths of the largest
source.

**Conservation is the form's own promise, so it is what the runner checks**: every node's total
equals the sum of its own ribbons, on both sides, before a ribbon is drawn.

## Treatments spent

- `every-node-carries-its-own-total` — a node that does not print its total asks to be trusted rather
  than checked.
- `ribbons-are-translucent-so-crossings-are-honest` — an overlap reads as an overlap, not as whichever
  ribbon was drawn last. Opacity is what makes a crossing readable instead of a stacking order nobody
  chose.
- `a-band-too-thin-to-see-is-not-drawn-it-is-counted` — 15 links fall under half a pixel at this
  scale and are **counted into a stated remainder** (12,7 TWh, 0,78 % of the whole) rather than drawn
  as hairlines that read as zero.

## What the web adds

A ribbon's width is a quantity nobody can measure, least of all among fifty crossing each other.
Every ribbon answers with both ends, its TWh, **its share of the source it leaves and its share of
the country it enters** — the two shares that make a ribbon mean something.

## Verification

`verify-web.mjs --file renders/creme.html` — **52 passed, 0 failed, 7 skipped**.

## Source

Ember, Energy Institute — Statistical Review of World Energy (2025), via Our World in Data · 2024.
`data.csv` is a byte-for-byte copy of `proof/static-sankey-electricity-sources/data.csv`.
