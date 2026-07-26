---
id: stacked-bar
engines:
  chart-native: stacked
  dw-chart: d3-bars-stacked
intent: [part-to-whole, change-over-time]
shape: wide
limits: { maxCategories: 8, maxSeries: 5 }
formats: [static, interactive, video]
bestFor:
  - "composition of a total across a few categories or periods, showing both the total (bar length) and its parts in one mark"
notFor:
  - "precise comparison of the inner (non-baseline) segments across columns — only the bottom segment shares a baseline; use a grouped bar or small multiples/lines if the inner series is the story"
  - "more than about 5 series — the stack becomes an unreadable ribbon"
  - "part-to-whole of a single total — that is a pie/donut, or a single bar"
---

# Stacked bar / column — per-type best practice (L2)

> Sources: FT Visual Vocabulary (the canon) — "part-to-whole" & "change over time"
> stacked columns — https://github.com/Financial-Times/chart-doctor/tree/main/visual-vocabulary ·
> data-to-viz.com (stacked barplot caveats) · credited.
> Inherits: `global/dataviz.md` (L0), the cartesian-XY chart layer (L1), and the
> bar rules in `bar.md` (baseline 0, deliberate order, gaps, direct labels).

A stacked bar/column encodes, per category, **several series summed into one bar** — each segment's
**length** is its value, the whole bar is the total. It answers **part-to-whole across categories**
("what makes up each total, and how the total compares") and, with a time-like category axis,
**how a composition shifts over time** ("renewables overtaking coal").

## When to use / when NOT

- **Use** for: composition of a total across a few categories or periods (≤ ~8 columns, ≤ ~5
  series); showing both the total (bar length) and its parts in one mark.
- **Not** for: precise comparison of the *inner* (non-baseline) segments across columns — only the
  bottom segment shares a common baseline, so middle segments are hard to compare. If the inner
  series is the story, use a **grouped bar** or **small multiples / lines** instead.
- **Not** for: > ~5 series — the stack becomes an unreadable ribbon; group into "Other".
- **Not** for: part-to-whole of a *single* total → that is a **pie/donut** (`pie.md`) or a single bar.

## Correctness "de base" (stacked-specific, on top of bar.md)

1. **Baseline MUST be 0** (inherited from `bar.md` rule 1, non-negotiable) — the stack grows from a
   common zero. → enforced by `check​StackedBarConformance` (valueDomain includes 0).
2. **Consistent series order across every column.** The stacking order (bottom→top) is fixed for all
   categories; never reorder per column or the bands stop reading as the same series.
3. **Put the most important / most stable series on the baseline.** Only the bottom segment has a
   flat reference line, so the series the reader must compare across columns goes at the bottom.
4. **One legend, in series order, matching the stack.** Segments can't all carry direct labels
   (too cramped) → a single legend in the same top-to-bottom order as the stack is the key. This is
   the one type where a legend beats direct labels (it is the global rule's documented exception).
5. **≤ 5 series, each an Okabe-Ito hue.** Categorical colour, colourblind-safe; keep segments
   distinguishable. → enforced (series count + palette membership).
6. **Show the column total** on top of each full stack when the total itself carries meaning
   (it usually does — the bar length is half the message).

## 100%-stacked vs absolute

- **Absolute** (segments sum to the real total): use when the **total** changes and matters.
- **100%-stacked** (every column normalised to 100%): use when only the **share** matters and totals
  are a distraction. Same geometry, values pre-normalised to percentages. Our generic cut ships
  absolute-with-equal-totals (a share story where the totals happen to be 100%).

## data-to-viz caveats (credited)

- Stacked barplots make the **non-baseline groups hard to compare** because they lack a common
  baseline — the single biggest caveat. State the one comparison the chart supports (the total, or
  the baseline series) and don't ask the reader to eyeball the rest. (data-to-viz: "barplot",
  "stacked area" family.)
- Too many series → ribbon soup; cap and group "Other".

## Motion grammar (how a stack *builds*)

Extends `bar.md`'s "grow from the baseline" — see `formats/video.md` for the shared discipline:

- chrome (value axis + gridlines) wipes in first;
- each **whole stack grows from the zero baseline to its full height**, eased-out, **staggered** in
  reading order (left→right) — the segments are revealed bottom→top as the column rises, so the
  baseline series appears first and the composition assembles upward;
- the column **total** fades in as its stack lands.
A segment never grows from its own middle — the entire stack is anchored at the zero baseline,
consistent with rule 1.
