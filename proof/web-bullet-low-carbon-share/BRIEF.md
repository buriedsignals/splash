---
format: web
type: bullet
---

# Beat — La Pologne a gagné 17,3 pts d'électricité bas-carbone depuis 2015 (web)

**Type:** bullet (measure, comparative state, neutral track). **Medium/format:** chart / **web**.
**Frame:** fluid.

## Claim

Low-carbon electricity — nuclear plus every renewable — as a share of each country's own generation:
Pologne 13,8 → **31,1 %** (+17,3 pts), Allemagne 43,8 → 58,6, France 92,2 → 94,9, Suisse 97,2 →
98,1, Suède 98,1 → 98,8, Norvège 98,0 → 98,6. **Poland moved furthest and is the only one of the six
still under 50 %** — both halves asserted before the render, and the beat throws if the biggest mover
is not also the only one under the threshold.

The share is **computed from the nine source columns**, never read off a "low-carbon" column that
does not exist in the file.

## What the web adds

A bullet compresses a whole generation mix into one share, and the share is all the plate can show.
The frozen file carries the nine sources that share was computed FROM, so **every row answers with
them**: which sources make up its low-carbon share, in order, with their own percentages. Poland's
31,1 % is almost entirely wind and biomass; Sweden's 98,8 % is hydro plus nuclear. That is the
question a bullet raises on paper and cannot answer there.

## Treatments spent

- `the-track-runs-the-full-scale-so-the-remainder-is-legible` — every track runs 0–100 %, because
  the remainder is the reading a bare bar cannot give, and here the remainder is the story.
- `two-states-of-one-measure-are-one-hue-at-two-chromas` — 2015 is **not a target**; no policy is
  scored here. It is the same measure at an earlier date, so it is a tick, not a goal marker, and
  the caveat says so.
- `the-verdict-is-written-as-a-derived-number` — the change in points is printed on the row.
- `accent-marks-the-thread` — the subject alone carries the accent.

## Two collisions the eye caught

The first row's own name landed on the caveat line (the band of rows now starts below a stated top
inset), and the threshold's label printed "50 %" directly on the axis's own "50 %" tick. A threshold
is named in **words** here — *la moitié* — because the axis already gives the number.

## Verification

`verify-web.mjs --file renders/creme.html` — **56 passed, 0 failed, 5 skipped**.

## Source

Ember, Energy Institute — Statistical Review of World Energy (2025), via Our World in Data · 2015
and 2024. `data.csv` is a byte-for-byte copy of `proof/static-bullet-low-carbon-share/data.csv`.
