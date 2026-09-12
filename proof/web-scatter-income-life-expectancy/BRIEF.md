---
format: web
type: scatter
---

# Beat — Au-delà de 30 000 $ par personne, le revenu n'achète presque plus d'années de vie (web)

**Type:** scatter (bubble). **Medium/format:** chart / **web**. **Frame:** fluid.

## Claim

Across **165** countries in 2021, life expectancy rises steeply with income and then flattens: the
**41** countries above **30 000 $** per person span **13,9 years** (71,2 to 85,1), while the **124**
below span **41,1**. Both bands are measured off the data, and the beat throws if the upper band is
not much narrower than the lower one.

## Treatments spent

- `the-distribution-is-furniture-and-the-case-is-ink` — the claim is about the SHAPE of the whole
  cloud, so there is **no named subject**: every point is one neutral, and the only ink carrying an
  argument is the threshold rule and the band it names.
- The x axis is **logarithmic and says so in words**. A log axis is the most common silent lie in
  this family: it makes a tenfold difference look like a step.

## What the web adds

165 points have room for two or three labels, and the rest are anonymous — right for a claim about
the shape, wrong for the reader's next question, which is always *which one is that*. Every point
answers with its country, both readings, its region and its population.

## Two things the render taught

- **A hand-picked tick list set the scale's ends**, so every country poorer than the first tick or
  richer than the last was drawn outside the frame: three pixels of horizontal scroll at all seven
  viewports and, far worse, marks a reader could not see. The domain is the data's own now, and the
  component throws if any point falls outside its own axes.
- **Rounding the ends out to decades wasted two thirds of the frame** on a scale where empty space is
  itself a claim about how far apart countries are. The ends are the poorest and richest readings.

## Verification

`verify-web.mjs --file renders/creme.html` — **56 passed, 0 failed, 5 skipped**.

## Source

Our World in Data · life expectancy at birth and GDP per capita (constant international dollars),
2021. `data.csv` is a byte-for-byte copy of `proof/static-income-life-expectancy/data.csv`.
