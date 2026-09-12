---
format: web
type: line
---

# Beat — Le CO₂ suisse est repassé sous son niveau de 1967, 57 ans effacés (web)

**Type:** line. **Medium/format:** chart / **web**. **Frame:** fluid.

## Claim

Switzerland's annual CO₂ peaked at **46,2 Mt in 1973** and stands at **32,1 Mt in 2024** — **30,6 %
below the peak**, and **below its own 1967 level (32,5 Mt)**: 57 years erased.

The reference year is **found, not typed** — the last year before the peak still at or below today's
reading is 1966, so the crossing is 1967 — and the beat throws if today does not sit between those
two years' readings, or if the fall from the peak is not large.

## A line carries a rate, so it refuses a forced zero

`proof/web-area-swiss-co2` draws this same frozen file **filled**, and requires its zero: the moment
a series is filled, every clipped tonne becomes surface a reader integrates. Nothing here is measured
by its length from a baseline — the slope carries the reading — so the axis is fitted and the caveat
says so. **The two beats say opposite things about the same series, for stated reasons.**

## Treatments spent

- `the-target-is-named-on-the-line-that-draws-it` — the 1967 level is a rule across the whole frame
  with its name **on** it, so the crossing is visible where it happens rather than asserted in a
  title.
- `direct-end-label-in-the-series-colour` — the last reading is labelled at the end of the line, in
  the line's own colour: one series needs no legend.

## What the web adds

A line's argument is the SHAPE, and a static frame can print perhaps four of its 167 readings. Every
year answers with its value, how far below the peak it sits, and — the reading this beat exists for —
**how many years it had been since the series was last this low.** That number is what turns "it is
falling" into "half a century has been undone", and it is computed for all 167.

## Verification

`verify-web.mjs --file renders/creme.html` — **56 passed, 0 failed, 5 skipped**. One thing the eye
caught and the script could not: the top tick's label sat on the caveat line, because this component
mapped its own scale instead of using the shared `fitY` and its headroom.

## Source

Global Carbon Budget 2025, via Our World in Data · Switzerland, 1858–2024, 167 consecutive readings.
`data.csv` is a byte-for-byte copy of `proof/co2-suisse/data.csv`.
