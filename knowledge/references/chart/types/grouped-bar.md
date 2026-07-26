---
id: grouped-bar
engines:
  chart-native: grouped
  dw-chart: d3-bars-grouped
intent: [magnitude]
shape: wide
limits: { maxSeries: 3, maxCategories: 6 }
formats: [static, interactive, video]
bestFor:
  - "comparing 2-3 series side by side across a handful of categories (e.g. two years per region, men vs women per age band)"
notFor:
  - "composition / part-to-whole where the bars should sum to a meaningful total — that is a stacked bar"
  - "more than about 3 series, or many categories — the groups turn into a picket fence, use small multiples or a dot plot"
  - "a continuous trend over many time points — that is a line chart"
---

# Grouped bar / column — per-type best practice (L2)

> Sources: FT Visual Vocabulary (the canon) — "comparison" grouped columns —
> https://github.com/Financial-Times/chart-doctor/tree/main/visual-vocabulary ·
> data-to-viz.com (grouped barplot caveats) · credited.
> Inherits: `global/dataviz.md` (L0), the cartesian-XY chart layer (L1), and the
> bar rules in `bar.md` (baseline 0, deliberate order, gaps, direct labels).

A grouped bar/column places **several series side by side within each category** — bars share a
category slot but sit next to each other, not stacked. Length from a common baseline encodes each
value, so the eye can compare both **within a group** (series A vs B here) and **across groups**
(series A here vs there). It answers **"compare a few series across a few categories."**

## When to use / when NOT

- **Use** for: comparing 2–3 series across a handful of categories (≤ ~6) — e.g. two years per
  region, men vs women per age band.
- **Not** for: composition / part-to-whole (the bars don't sum to a meaningful total) → that is a
  **stacked bar** (`stacked-bar.md`).
- **Not** for: > ~3 series or many categories — the groups turn into a picket fence; use small
  multiples or a dot plot instead. (bar.md caveat: grouped bars are legible only up to ~3 series.)
- **Not** for: a continuous trend over many periods → **line** (`line.md`).

## Correctness "de base" (grouped-specific, on top of bar.md)

1. **Baseline MUST be 0** (inherited from `bar.md` rule 1, non-negotiable) — every bar encodes
   length. → enforced by `checkGroupedBarConformance` (valueDomain includes 0).
2. **Consistent series order + colour in every group.** The same series sits in the same position
   and colour across all categories, or the groups stop being comparable.
3. **Small gap within a group, larger gap between groups.** The within-group bars touch or nearly
   touch; the between-group gap is clearly bigger, so the eye parses groups before bars.
4. **One legend in series order** (the bars can't all carry a direct value label without clutter at
   2–3 series × several categories). Like the stacked bar, this is the documented exception to the
   global "direct labels over a legend" rule.
5. **≤ 3 series, each an Okabe-Ito hue** (categorical, colourblind-safe). Beyond 3 the comparison
   collapses. → enforced (series count + palette membership).

## data-to-viz caveats (credited)

- A grouped barplot with too many groups/series becomes a "picket fence" — hard to read; prefer
  fewer series, small multiples, or a slope/dot plot. (data-to-viz: "barplot", grouped.)
- The two comparisons it supports (within-group, across-group) compete; lead the reader to the one
  the headline is about.

## Motion grammar (how a grouped chart *builds*)

Extends `bar.md`'s "grow from the baseline" — see `formats/video.md`:

- chrome (value axis + gridlines + legend) wipes in first;
- every bar **grows from the zero baseline to full length**, eased-out, **staggered** across the
  groups in reading order (left→right), the series within a group appearing together;
- bars never grow from the middle/top — anchored at the zero baseline (rule 1).
