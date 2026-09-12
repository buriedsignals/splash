---
format: web
type: population-pyramid
---

# Beat — La tranche la plus large de la Suisse est celle des 55-59 ans (web)

**Type:** population pyramid. **Medium/format:** chart / **web**. **Frame:** fluid.

## Claim

Switzerland's widest age band in 2023 is **55-59 (669 962 people)**, not the youngest: 0-4 year-olds
total **434 030**, well under the peak — the mark of an ageing population, not an expanding one. The
widest band is **found, not typed**, and the beat throws if it turns out to be the youngest.

## Treatments spent

- `mirrored-halves-cross-at-a-named-band` — the band where the shape stops widening is **named**,
  because that band is the whole reading.
- `name-each-half-in-words` — left and right are named above the halves. A mirrored chart with two
  unlabelled sides is a Rorschach test.
- `the-neutral-straddles-the-centre` is **refused**, and the refusal is worth stating: the centre here
  is a boundary between two populations, not a category belonging to neither. There is nothing to
  straddle it with.

## What the web adds

A pyramid's bars are lengths from a shared centre, so a reader can compare two bands and cannot read
either. Every band answers with both counts, the total, the difference between the sexes, and **the
band's share of the whole population** — the share is what turns a silhouette into a claim about how
many people are where.

## Verification

`verify-web.mjs --file renders/creme.html` — **56 passed, 0 failed, 5 skipped**.

## Source

Office fédéral de la statistique · permanent resident population, 2023, 21 five-year bands.
`data.csv` is a byte-for-byte copy of `proof/static-swiss-age-pyramid/data.csv`.
