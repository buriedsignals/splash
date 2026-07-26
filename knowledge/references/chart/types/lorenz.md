---
id: lorenz
engines:
  chart-native: lorenz
intent: [distribution]
shape: distribution
limits: { maxSeries: 3 }
formats: [static, interactive, video]
bestFor:
  - "showing inequality of a distribution — income, wealth, emissions — and comparing it (before/after tax, two places, two years)"
notFor:
  - "the level/amount — a Lorenz shows shares, never totals; pair with a number for scale"
  - "many overlapping curves — they tangle; show at most a few"
  - "small n where quantiles are noisy — say so"
---

# Lorenz curve (inequality) — per-type best practice (L2)

> Sources: FT Visual Vocabulary (the canon) — "distribution" / inequality · Lorenz (the curve) + Gini
> (the area measure) · data-to-viz.com. credited.
> Inherits: `global/dataviz.md` (L0). A cumulative-share distribution layout.

A Lorenz curve plots the **cumulative share of a total (income, wealth) against the cumulative share of
the population**, poorest → richest. It answers **"how unequally is it shared"**: the further the curve
bows below the 45° line of equality, the more unequal — and that gap IS the Gini coefficient.

## When to use / when NOT — read the caveats first

- **Use** for: showing INEQUALITY of a distribution — income, wealth, emissions — and comparing it
  (before/after tax, two places, two years). The gap to the diagonal is the story.
- **Not** for: the level/amount — a Lorenz shows shares, never totals; pair with a number for scale.
- **Not** for: many overlapping curves — they tangle; show ≤ 3.
- **Not** for: small n where quantiles are noisy — say so.

## Correctness "de base" (lorenz-specific)

1. **Anchor the curve (0,0)→(1,1)** and keep it monotonic and below the diagonal; ALWAYS draw the line
   of equality. The Gini = 2 × area between the line and the curve. → `checkLorenzConformance`.
2. **Both axes 0–100%, square-ish plot** so the diagonal is a true 45°; label both axes as cumulative
   shares.
3. **Quote the Gini** (and a plain-language hook — "the top 10% take a third"); colour ≤ 3 curves with
   Okabe-Ito.
4. **Shade the inequality gap** (curve → diagonal) so the eye reads the area, not just the line.

## data-to-viz caveats (credited)

- A Lorenz curve hides the level: two countries with the same Gini can have wildly different incomes.
  Always give the absolute scale alongside, and remember a single Gini can mask very different curve
  shapes (cross-overs) — show the curve, not just the number.

## Motion grammar (how a Lorenz *builds*)

See `formats/video.md`; the gesture:

- the axes + the line of equality wipe in first (chrome);
- each curve **draws left → right** from (0,0); the inequality gap shades in behind it as it draws; the
  Gini labels fade in last.
The curve's path is fixed by the layout; the draw is a pure clip of progress, so frame N is a pure
function of the frame.
