---
id: scatter
engines:
  chart-native: scatter
  dw-chart: d3-scatter-plot
intent: [correlation]
shape: paired
formats: [static, interactive, video, scrolly]
bestFor:
  - "whether two numeric measures move together — correlation, clusters, and outliers across many items, one dot per item"
  - "mapping a third value to bubble size, for context rather than the headline number"
notFor:
  - "change over time of one series — that is a line; magnitude across categories — that is a bar; one variable's distribution — use a histogram or dot plot"
---

# Scatter / Bubble — per-type best practice (L2)

> Sources: FT Visual Vocabulary (Correlation — scatterplot, bubble) —
> https://github.com/Financial-Times/chart-doctor/tree/main/visual-vocabulary ·
> data-to-viz.com (scatter & bubble caveats) · credited.
> Inherits: `global/dataviz.md` (L0) and the cartesian-XY chart layer (L1).

A scatterplot encodes **two numeric variables** as the x/y **position** of a dot — the canonical way
to show the **relationship/correlation** between them. An optional third variable maps to dot **size**
(→ bubble) or colour (→ category).

## When to use / when NOT

- **Use** for: "do these two measures move together?" — correlation, clusters, outliers across many
  items (one dot per item).
- **Bubble** (size = a third value) when a third magnitude matters — but size is read imprecisely, so
  it's for context, not the headline number.
- **Not** for: change over time of one series → that is a **line** (a connected scatter is a special
  case). Magnitude across categories → **bar**. One variable's distribution → histogram/dot plot.

## Correctness "de base" (specific to scatter)

1. **Position encodes value — axes need not start at 0** (unlike bars, which encode length). Choose
   each axis range to *frame the relationship*; do not pad to 0 if it flattens the cloud. But never
   truncate to manufacture a correlation — show the honest spread. (This is why the bar baseline-0
   rule does NOT apply here.)
2. **Overplotting is the #1 failure.** With many points they overlap into a blob. Mitigate with dot
   **opacity** (~0.6–0.8), smaller radius, and/or thin strokes. If still unreadable → bin into a
   density/heatmap. (data-to-viz: "scatterplot".)
3. **Correlation ≠ causation.** The chart shows association; the title must not assert cause. A trend
   line is optional and, if shown, must be honest (linear fit only when linear; never extrapolate
   beyond the data).
4. **Label the few that matter, not all.** Annotate the outliers / the subject of the story; labelling
   every dot is clutter and, in a static (no hover), labels collide into an unreadable pile. The
   producer takes an explicit `annotate` list (the journalist/② names the story points — mapped from
   the spec's `highlights`/`highlight`); with none, it labels just the headline outlier. **Every point
   named in `annotate` is REQUIRED — it is always labelled, never dropped.** Placement is
   collision-aware: it tries right/left/above/below adjacent to the dot, then a short **leader line**
   into the empty space just above/below the cloud (a thin connector back to the point — the standard
   technique for a label in a dense cluster); if even that is contested, a requested label is **offset
   onto an in-bounds spot rather than skipped** (only AUTO labels are "fewer-but-readable" and may be
   dropped). Labels stay strictly inside the plot (never over the axis text) and never sit on a bubble.
   The full set is always reachable on hover/focus in the interactive build. (Inherits the global
   "direct labels" principle, applied selectively.) (Regression: a GDP × life-expectancy scatter that
   requested Japan/Qatar/Nigeria shipped a single label because the mapper dropped `highlights`;
   guarded by `tests/spec-to-config.test.ts` + `tests/scatter-annotate.test.tsx` + the `required`
   path in `tests/labels.test.ts`.)
5. **Bubble size = AREA, never radius.** Map the third value to circle *area* (`r ∝ √value`); mapping
   to radius exaggerates large values ~quadratically — a classic lie. (data-to-viz: "bubble".)

## Encoding the third/fourth variable

- **Size** → bubble (area-scaled, ≤ ~one order of magnitude or it's unreadable).
- **Colour** → category: at most a few classes, from the Okabe-Ito set (global ≤2-colour rule bends
  here to "few CVD-safe classes"); a continuous colour ramp only for a sequential third measure.
- Don't stack size AND colour AND a trend line at once — pick the one that serves the story.

## Motion grammar (how a scatter *builds*, distinct from line/bar)

A scatter does not draw or grow — the **points appear**. See `formats/video.md` for the shared video
discipline; the scatter-specific gesture:

- chrome (both axes + gridlines) wipes in first;
- the **dots pop in** — `scale`/opacity 0→1 with a slight overshoot (a bubble "blooms"), **staggered**
  (e.g. left→right along x, so the eye reads the spread building);
- outlier **labels fade in last**, after their dot lands.
The pop is anchored at each dot's final position (points never fly in from off-screen — that distracts
from the spatial encoding, which is the whole point).
