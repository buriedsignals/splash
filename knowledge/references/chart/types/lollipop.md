---
id: lollipop
engines:
  chart-native: lollipop
  dw-chart: d3-dot-plot
intent: [ranking, magnitude]
shape: single
limits: { maxCategories: 20 }
formats: [static, interactive, video]
bestFor:
  - "ranking many categories by one value, where a bar chart would feel ink-heavy"
notFor:
  - "tiny differences where the dot's position is hard to read precisely, or a value that is a part of a whole"
  - "two values per category (the gap) — that is a dumbbell"
---

# Lollipop / dot plot — per-type best practice (L2)

> Sources: FT Visual Vocabulary (the canon) — "ranking" / "magnitude" lollipop —
> https://github.com/Financial-Times/chart-doctor/tree/main/visual-vocabulary ·
> data-to-viz.com (lollipop) · credited.
> Inherits: `global/dataviz.md` (L0), the cartesian-XY chart layer (L1), and the
> length/baseline-0 rule from `bar.md` (the stem is the value's length).

A lollipop plots one value per category as a **thin stem from the baseline to a dot** at the value.
It is a **ranking / magnitude** chart — the same job as a bar, with far less ink, so a long ordered
list reads cleanly without a wall of heavy rectangles. The dot marks the value; the stem carries the
eye back to zero.

## When to use / when NOT

- **Use** for: ranking many categories by one value (≤ ~20 rows) — branches by usage, countries by
  a rate — where a bar chart would feel ink-heavy.
- **Not** for: tiny differences where the dot's position is hard to read precisely → a bar's filled
  length can be easier; or where the value is a part-of-whole (→ stacked).
- **Not** for: two values per category (the gap) → that is a **dumbbell** (`dumbbell.md`).

## Correctness "de base" (lollipop-specific)

1. **Baseline MUST be 0** (inherited from `bar.md` rule 1) — the stem's length encodes the value, so
   it starts at zero. → enforced (reuses `checkBarConformance`: the value domain includes 0).
2. **Sort by value** (descending for a ranking) unless the category has a natural order.
3. **Thin stem, clear dot.** The stem is light; the dot is the read. Keep the dot large enough to
   land on, small enough not to blur the value.
4. **Direct value label at the dot.** Label each dot with its value at the outer side; the axis can
   then be light or dropped (inherits the global "direct labels" rule).
5. **One accent at most.** A single highlight colour on the key row (the subject of the headline);
   everything else the neutral series colour. ≤ 2 colours (global rule).

## data-to-viz caveats (credited)

- A lollipop reads the dot's POSITION; for very close values the dot is less precise than a bar's
  edge — if exact ranking of near-ties matters, label every value. (data-to-viz: "lollipop".)
- Too many rows still crowd; sort + cap or facet.

## Motion grammar (how a lollipop *builds*)

Extends `bar.md`'s "grow from the baseline":

- chrome (a light value axis / gridlines) wipes in first;
- each **stem grows from the zero baseline to its dot**, eased-out, **staggered top→bottom**, the dot
  popping in as the stem lands;
- the value label **rides the stem's growing head** (right of the dot → never clipped) and fades in
  **early with** the stem — present from the moment the stem is meaningfully drawn, not only once the
  dot lands, so a mid-build video still never ships a label-less dot (rule 4). The fade uses the shared
  bar-family knob (`core/math` `labelReveal`); the old gate hid the last-staggered rows' labels
  mid-build. Guarded by `tests/lollipop-value-label-reveal.test.tsx`.
The stem never grows from the dot inward — always from the zero baseline (rule 1).
