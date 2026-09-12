---
format: web
type: histogram
---

# Beat — 127 pays sur 213 émettent moins de 4 tonnes de CO₂ par personne (web)

**Type:** histogram. **Medium/format:** chart / **web**. **Frame:** fluid.

## Claim

**127 of 213 countries (59,6 %) emitted under 4 tonnes of CO₂ per person in 2023.** The distribution
is heavily right-skewed: the median is **3,1 t** and the tail runs out to **40,1 t** (Qatar), one or
two countries per bin. The beat throws if the share under the threshold is not near six in ten.

## Treatments spent

- `bin-named-by-both-edges-and-an-open-top` — a bin is an interval, so it is named by **both** edges,
  and the last one says it is open rather than pretending to end where the data happens to stop. An
  axis labelled `0 2 4 6` leaves the reader to guess which side of 4 a country at exactly 4 t fell
  on; this one does not.
- `the-distribution-is-furniture-and-the-case-is-ink` — the shape is the argument, so the bars are one
  neutral and only the bins the headline counts carry the accent.
- Bars **touch**: a histogram's bins are contiguous intervals, and a gap between them says the scale
  is categorical.

## What the web adds

A histogram's bar says "this many fell here" and **refuses to say who**. That refusal is the form
working correctly — a distribution is not a ranking — but it is also the first question every reader
asks. Every bar answers with its interval, its count, its share of the whole, **the running share up
to its own top edge**, and the countries inside it (the four largest, then a count of the rest).

## Verification

`verify-web.mjs --file renders/creme.html` — **56 passed, 0 failed, 5 skipped**.

## Source

Global Carbon Budget 2025, via Our World in Data · 2023, 213 countries. `data.csv` is a byte-for-byte
copy of `proof/static-carbon-footprint-spread/data.csv`.
