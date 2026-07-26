---
id: dumbbell
engines:
  chart-native: dumbbell
  dw-chart: d3-range-plot
intent: [ranking]
shape: paired
limits: { points: 2, maxCategories: 20 }
formats: [static, interactive, video]
bestFor:
  - "the gap between two values across several categories — pay gap by sector, before/after by region, min-max ranges (works well up to ~15-20 rows)"
notFor:
  - "a single value per category — that is a bar; the gap is the whole point of a dumbbell"
  - "more than two values per category, or a trajectory across many periods — that is a slope or a line; a dumbbell is exactly two endpoints"
  - "part-to-whole — the two dots don't sum to a meaningful total"
---

# Dumbbell / range plot — per-type best practice (L2)

> Sources: FT Visual Vocabulary (the canon) — "comparison" / "ranking" dumbbell &
> range — https://github.com/Financial-Times/chart-doctor/tree/main/visual-vocabulary ·
> data-to-viz.com (the "lollipop" / "dumbbell" family) · credited.
> Inherits: `global/dataviz.md` (L0) and the cartesian-XY chart layer (L1).

A dumbbell plot (a.k.a. connected dot / range plot) draws, per category, **two dots joined by a
line** — one dot per value (two periods, or two groups). The **length of the connector is the gap**;
the dots' positions are the two values. It answers **"how big is the gap, and where is it widest"**
across a list of categories. The horizontal layout lets the eye scan a ranked list of gaps.

## When to use / when NOT

- **Use** for: the gap between two values across several categories — pay gap by sector, before/after
  by region, min–max ranges. Works well up to ~15–20 rows.
- **Not** for: a single value per category → that is a **bar** (`bar.md`); the gap is the whole point
  of a dumbbell.
- **Not** for: more than two values per category, or a trajectory across many periods → **slope**
  (`slope.md`) or **line**. A dumbbell is exactly two endpoints.
- **Not** for: part-to-whole (→ stacked) — the two dots don't sum to a meaningful total.

## Correctness "de base" (dumbbell-specific)

1. **Position encoding → the value axis need NOT start at 0** (like the slope, the opposite of the
   bar baseline rule). A zoomed range that shows the gaps clearly is correct; the connector encodes
   the *difference*, not a length from zero. → `checkDumbbellConformance` does NOT require 0.
2. **Two dot colours, one per series; a neutral connector.** Two Okabe-Ito hues for the two endpoints
   (within the global ≤2-colour rule), and a light neutral line between them so the dots read as the
   data and the connector as the gap.
3. **Order deliberately — usually by the gap.** Sort rows by the size of the gap (widest first) when
   the story is "where is it widest"; keep a natural order otherwise. Never arbitrary.
4. **One legend for the two series + direct value labels at the dots.** The two endpoints share a
   colour key (a tiny legend), and each dot can carry its value at the outer side.
5. **Consistent endpoint meaning across rows.** The same series is the same colour and the same side's
   semantics in every row.

## data-to-viz caveats (credited)

- A dumbbell reads the *gap* well but the *absolute* positions less precisely than a bar — if absolute
  magnitude is the story, a bar may be better. (data-to-viz: "lollipop"/"dumbbell".)
- Too many rows → the connectors blur into a band; sort + cap, or facet.

## Motion grammar (how a dumbbell *builds*)

See `formats/video.md`; the dumbbell-specific gesture:

- chrome (the value axis + the category labels + the legend) fades in first;
- per row, the **first dot appears**, then the **connector extends to the second dot**, eased-out,
  **staggered** down the rows in reading order (top→bottom) — the gap "opens up";
- the **second dot rides the connector's growing head** and both **value labels ride the two animated
  dot ends** (outer side of each → never clipped), all fading in **early with** the row — present from
  the moment the row is meaningfully drawn, not only once the gap finishes opening, so a mid-build
  video still never ships a label-less row (rule 4). The fade uses the shared bar-family knob
  (`core/math` `labelReveal`); the old gate hid the last-staggered rows' labels mid-build. Guarded by
  `tests/dumbbell-value-label-reveal.test.tsx`.
The dot never grows from the axis baseline — the two dots are positions, the connector is the gap.
