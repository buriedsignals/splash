---
format: web
type: boxplot
---

# Beat — Le CO₂ par personne des Français a culminé dans les années 1970 (web)

**Type:** box plot. **Medium/format:** chart / **web**. **Frame:** fluid.

## Claim

France's annual CO₂ per person peaked in the **1970s** (median 9,96 t) and has fallen in **every
decade since**: 5,41 → 7,59 → **9,96** → 7,43 → 6,92 → 6,75 → 5,17 → 4,27. The runner computes every
summary from the frozen file and **throws rather than draw the headline** if any decade after the
peak is not below the one before it. The 2020s carry n=5 (a partial decade), which each box states
under its own label.

Quartiles are the linear-interpolation definition; the whiskers are Tukey's 1,5 IQR fences **clipped
to real readings**, never stretched to the extremes — one outlier is found, 1980's 9,54 t, and it is
drawn hollow.

## What the web adds

`the-sample-is-drawn-beside-its-own-summary`, and on the web that treatment is the whole reason to
build this form here. **A box is a five-number summary: it hides the ten readings it was computed
from**, and nothing in it separates a decade that fell steadily from one that swung and landed on
the same median. So every year is drawn as its own dot beside its box — and every dot answers with
its year, its value, its decade's median and n, and whether it sits above or below that median.
The static plate can draw the dots. It cannot name one of them.

`every-band-names-its-own-statistic` — each box prints its median above it and its n under it, so a
partial decade cannot be mistaken for a full one.

## The axis is fitted, and that is the type's own rule

A box plot encodes POSITIONS: nothing on this page is measured by its length from a baseline, so the
axis is fitted to the readings (3–11 t) rather than anchored at zero, and the caveat says so in
words. What the component *does* check is that the fitted window contains every mark drawn inside
it, outliers included — an axis that clips a reading is worse than one that wastes space, because
the clipped mark is silently gone.

The first render anchored at zero and wasted the bottom third of the plot; the type sheet and the
static sibling both refuse that, and the render showed why.

## Two collisions the eye caught, both now the scale's business rather than this beat's

- **The top tick's label sat on the caveat.** A scale whose maximum IS its top tick puts half that
  label outside the plot's own cell. Fixed once, in `#shared/design-base/web.mjs`'s `fitY`, which
  every directed web beat now shares.
- **The peak's note landed on the peak's own printed median.** It is anchored at the left edge now:
  the accent and the accented decade label under the axis are what point at the peak, and the box
  already carries its number.

## Verification

`verify-web.mjs --file renders/rapport.html` — **56 passed, 0 failed, 5 skipped** (all the filter's).

## Source

Global Carbon Budget 2025, via Our World in Data · France, 1950–2024, 75 annual readings. `data.csv`
is a byte-for-byte copy of `proof/more-boxplot-france-co2-decades/data.csv`, re-parsed here.
