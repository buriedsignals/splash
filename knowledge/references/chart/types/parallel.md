---
id: parallel
engines: {}
unreachable: "chart-native has no MAPPERS entry for parallel (deferred: \"family-B: rare in a small newsroom\", native-types.ts) — no spec can reach it today"
intent: [magnitude]
shape: wide
limits: { minPoints: 3 }
formats: [static, interactive, video]
bestFor:
  - "comparing items across 3-8 numeric dimensions where the trade-offs and clusters are the story"
notFor:
  - "precise reading of one value — position on an axis is approximate; label or hover for exact values"
  - "many items at once — the lines become a hairball; filter or highlight"
  - "a single dimension — that's a bar/dot plot"
---

# Parallel coordinates — per-type best practice (L2)

> Sources: FT Visual Vocabulary (the canon) — "magnitude" / multivariate parallel coordinates ·
> Inselberg (the form) · data-to-viz.com (the parallel plot — and its ordering/clutter caveats). credited.
> Inherits: `global/dataviz.md` (L0). A multi-axis cartesian comparison.

Parallel coordinates lay several variables on **parallel vertical axes**; each item is a polyline
crossing every axis at its value. It answers **"how do a few items compare across MANY measures — who
leads where, what trades off against what"**: the crossing lines reveal trade-offs a table hides.

## When to use / when NOT — read the caveats first

- **Use** for: comparing items across 3–8 numeric dimensions where the TRADE-OFFS and clusters are the
  story — schools, cars, countries on several metrics. Highlight a few; grey the rest.
- **Not** for: precise reading of one value — position on an axis is approximate; label or hover.
- **Not** for: many items at once — the lines become a hairball; filter/highlight.
- **Not** for: a single dimension — that's a bar/dot plot.

## Correctness "de base" (parallel-specific)

1. **Each axis is its OWN scale** (per-dimension min–max), labelled with its name and end values, so a
   line's height means "where on THIS measure". → `checkParallelConformance` (≥ 3 axes).
2. **Order the axes deliberately** — adjacent axes are the easy comparison; put related/contrasting ones
   side by side (the order changes the read).
3. **Highlight ≤ ~3 items** in Okabe-Ito hues, grey the context; a legend names them.
4. **Direct axis labels** at the top, end values at each axis.

## data-to-viz caveats (credited)

- The AXIS ORDER drives the story (only neighbours are easy to compare) — say it's one ordering, and try
  a few. With many lines it's a hairball; highlight, filter, or bundle. Reversing an axis (so "good" is
  always up) helps but must be flagged.

## Motion grammar (how it *builds*)

See `formats/video.md`; the gesture:

- the axes wipe in first (chrome); then the polylines **draw left → right** across the axes, the
  highlighted ones on top; the legend fades in last.
A line's path is fixed by the layout; the draw is a pure clip of progress, so frame N is a pure function
of the frame.
