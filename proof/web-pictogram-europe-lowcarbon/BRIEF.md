---
format: web
type: pictogram
---

# Beat — Un carré, un pays : 16 pays européens sur 40 dépassent 75 % d'électricité bas-carbone (web)

**Type:** pictogram (isotype). **Medium/format:** chart / **web**. **Frame:** fluid, except the one
axis this form cannot give up.

## Claim

Of the **40** European countries that report 2024 generation, **16 are above 75 %** low-carbon and
**18 are below 60 %** — **6** are in between. "Polarised" is exactly the kind of word a picture
invites and a count settles, so the page does not use it: it prints the three counts and lets the
reader check them by counting squares. The beat asserts the middle holds under a quarter of the field
and that the three blocks account for every country.

## Treatments spent

- `a-quantity-is-made-countable-by-drawing-its-units` — the whole reason to spend forty squares rather
  than three bars is that a reader can **count** them.
- `a-countable-field-is-paired-with-its-own-figure` — the count is printed beside the block, because
  counting forty squares is a check, not a task.

## What the web adds

A pictogram deliberately **throws the value away**: one square is one country, whatever its share.
That flattening is the point — it makes "how many" visible where a bar makes "how much" visible.
Every square gives the value back on demand: the country, its exact share, its rank among the forty,
its generation, and which block it is in.

## The one beat in this base that does not stretch

The fluid frame's `preserveAspectRatio="none"` is right when the geometry **is** the reading: a line
read at a shallower angle is still the same series. Here the geometry is a **unit** — one square, one
country — and a stretched square is no longer a unit a reader counts, it is a brick. Measured on the
first render, where the window-fit rule shortened the plot and every square came out half as tall as
it was wide. This beat uses `xMidYMid meet`, and says so.

The block headings had the same trouble in the other direction: a viewBox offset reserved above each
block shrinks with the geometry while the type does not, so at 375 px the heading lifts out of the
plot. The three blocks are named in the key instead, where type and swatch are both fixed.

## Verification

`verify-web.mjs --file renders/creme.html` — **52 passed, 0 failed, 7 skipped** (five the filter's,
two the x-axis's: this beat has no value axis at all).

## Source

Ember, Energy Institute — Statistical Review of World Energy (2025), via Our World in Data · 2024.
`data.csv` is a byte-for-byte copy of `proof/static-pictogram-europe-lowcarbon/data.csv`.
