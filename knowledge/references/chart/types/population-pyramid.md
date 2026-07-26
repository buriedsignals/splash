---
id: population-pyramid
engines:
  chart-native: pyramid
intent: [distribution, magnitude]
shape: wide
limits: { maxSeries: 2 }
formats: [static, interactive, video]
bestFor:
  - "a magnitude across ordered categories split into two groups — age x sex, a metric by band for two regions/years"
notFor:
  - "unordered categories ranked by value — a diverging bar sorts by value; a pyramid keeps the natural category order so the shape is the message"
  - "a single group — that is a bar; more than two groups — use a grouped bar or small multiples"
---

# Population pyramid — per-type best practice (L2)

> Sources: FT Visual Vocabulary (the canon) — "distribution" / "magnitude"
> back-to-back bars — https://github.com/Financial-Times/chart-doctor/tree/main/visual-vocabulary ·
> data-to-viz.com · credited.
> Inherits: `global/dataviz.md` (L0), the cartesian-XY chart layer (L1), and the
> length/baseline-0 rule from `bar.md`.

A population pyramid is **two back-to-back bar charts** sharing a central category axis: ordered age
bands run up the centre, one group's bars extend LEFT, the other's RIGHT, each bar's length a
magnitude. It answers **"how is a population split by age and group, and where is one group bigger"**
— the canonical demographic chart (age × sex), but the form fits any ordered category × two groups.

## When to use / when NOT

- **Use** for: a magnitude across ORDERED categories split into two groups — age × sex, a metric by
  band for two regions/years.
- **Not** for: unordered categories ranked by value → a **diverging bar** (`diverging-bar.md`) sorts
  by value; a pyramid keeps the natural category order (age) so the SHAPE is the message.
- **Not** for: a single group (→ bar) or > 2 groups (→ grouped/small multiples).

## Correctness "de base" (pyramid-specific)

1. **Both sides grow from the central zero** — each side is its own baseline-0 bar (lengths are
   magnitudes). The magnitude axis is the SAME scale on both sides so the two groups are comparable.
   → `checkPopulationPyramidConformance`.
2. **Keep the natural category order** (oldest→youngest down the axis, or vice-versa) — never sort by
   value; the pyramid's silhouette (expansive / constrictive / stationary) is the insight.
3. **Two colours, one per group**, both Okabe-Ito and CVD-safe; a legend names them.
4. **Category (age) labels run down the CENTRE** between the two sides, in a reserved gutter so they
   never sit on a bar.
5. **A symmetric magnitude axis** — the same ticks left and right, both labelled as POSITIVE values
   (the left side is not "negative", it is the other group).

## data-to-viz caveats (credited)

- The two sides are read independently against the centre; comparing a left bar to a right bar at the
  same band is the one comparison the chart supports well — state it.
- Counts vs percentages change the shape; a shrinking cohort can look bigger in % — label the unit.

## Motion grammar (how a pyramid *builds*)

Extends `bar.md`'s "grow from the baseline", mirrored from the centre:

- chrome (the centre axis + magnitude gridlines + legend) wipes in first;
- every bar **grows from the central zero outward** to its magnitude (left group leftward, right
  group rightward), eased-out, **staggered** down the bands;
- the centre age labels fade in with their row.
A bar never grows from its outer tip — always from the central zero (rule 1).
