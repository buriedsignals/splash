---
format: web
type: marimekko
---

# Beat — 99,5 % du charbon de ces six pays est brûlé dans deux d'entre eux (web)

**Type:** marimekko (mosaic). **Medium/format:** chart / **web**. **Frame:** fluid.

## Claim

Six European countries, 2024, **1 638 TWh**. Coal is **201 TWh — 12,3 % of the six — and 99,5 % of it
is generated in Germany and Poland.** Every other column's coal band is a hairline or nothing.

Column **width** is the country's own generation, column **height** is its mix, so a band's **area**
is a real quantity in TWh — which is what this form is for and what six percentage columns could not
say. Because those areas are a product of two scales, the beat checks both: each column's bands sum
to that column's own total, and the widths sum to the six countries' total.

## Treatments spent

- `the-width-dimension-is-named-on-the-plate` — a marimekko has two scales and only one is obvious.
  The width scale is stated in words above the columns and each column prints its own TWh; without
  that a reader takes this for a stacked bar with sloppy spacing.
- `a-band-is-named-inside-itself-or-it-is-texture` — a band wide and tall enough carries its own name;
  every band that is not gets its name from the pointer. **A band nobody can name is texture, and
  texture in a chart is decoration.**

The tone **orders** the nine sources, renewable to fossil; it does not distinguish them, and the page
says so. Nine steps of one hue are not nine legible colours, and the honest consequence is that the
name is written in the band or given by the pointer.

## What the web adds

The whole point of this form is that **area is a quantity** — and area is the one thing an eye cannot
read off a page. Every band answers with its country, its source, its share of that country's mix,
its TWh, and its share of the six countries' total.

## Two things the render taught

- **One invisible character stops all three directions.** A no-break space typed by hand inside a
  band's own label refused every family on the sans ladder — "no family on the sans ladder can set
  this beat's text", naming the code point and not the string. Every register's text now passes
  through `plain` before it reaches the ladder, in **every** directed web beat, and `plain` itself is
  written with explicit ` `-style escapes rather than literal characters nobody can see.
- The claim note sat over the widest column's own bands; it is part of the paragraph under the key
  now.

## Verification

`verify-web.mjs --file renders/creme.html` — **55 passed, 1 failed, 5 skipped**. The failure is
phone-only and 5 px wide (`document 380px in a 375px window`); a per-element scan at that width finds
no box outside the frame, so it is not yet localised. Desktop is the validated frame; this is
recorded rather than papered over.

## Source

Ember, Energy Institute — Statistical Review of World Energy (2025), via Our World in Data · 2024.
`data.csv` is a byte-for-byte copy of `proof/static-marimekko-electricity-mix/data.csv`.
