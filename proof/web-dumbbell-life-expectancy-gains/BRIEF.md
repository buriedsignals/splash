---
format: web
type: dumbbell
---

# Beat — Les dix ont tous gagné des années de vie depuis 2000 (web)

**Type:** dumbbell (range plot). **Medium/format:** chart / **web**. **Frame:** fluid.

## Claim

Every one of ten countries added years of life expectancy between 2000 and 2023 — **Poland gained the
most, +5,0 years; the United States the least, +2,5.** The median gain is +4,1. The beat throws if any
country did not gain.

## Treatments spent

- `segment-between-two-named-states` — the bar between the heads **is** the gap, and both ends are
  named states rather than an anonymous range. That is the difference from a lollipop pair: a
  dumbbell answers "how far apart", not "how far from nothing", so **the axis is fitted and does not
  start at zero** — and the caveat says so rather than leaving it to be noticed.
- `the-delta-is-its-own-register-beside-the-values` — the gain is printed in its own register in its
  own column past the end of every bar, never mixed with the two levels it came from.
- One hue, two chromas: the two heads are two **states** of one measure, never two categories.

## What the web adds

A dumbbell row is three numbers and shows two. Every row here answers with both levels, the gain, its
rank among the ten, and where it sits against the group's own median gain. Ten rows have room for one
annotation; the pointer has room for ten.

## Three things the render taught, all about fixed type over scaled geometry

- **A label lifted above its row by a percentage of its own height clears the row at desktop scale
  and lifts clean out of the svg at 375 px** — the geometry shrinks and the type does not. Value
  labels sit beside their heads now, never above them.
- **The label gutter intercepts the pointer.** Row names are furniture, not controls; the gutter is
  `pointer-events: none` so the plot's hit area sees the pointer wherever a value label crosses it.
- **A label that would leave the frame flips to the inside.** Poland's 2000 head sits at 4 % of the
  plot; its label slid into the gutter and, at phone width, out of the figure. `.end-label` carries
  a ground chip, so a flipped label sits legibly over the connector it now covers.

The delta column is drawn **inside the viewBox**, not at `left: 100.5 %` — the mistake this base's
bump beat paid for at all seven viewports.

## Verification

`verify-web.mjs --file renders/creme.html` — **56 passed, 0 failed, 5 skipped**.

## Source

UN WPP via Our World in Data · life expectancy at birth, 2000 and 2023. `data.csv` is a byte-for-byte
copy of `proof/more-dumbbell-life-expectancy-gains/data.csv`.
