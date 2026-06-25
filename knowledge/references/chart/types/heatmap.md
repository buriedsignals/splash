# Heatmap — per-type best practice (L2)

> Sources: FT Visual Vocabulary (the canon) — "magnitude" / "spatial" heatmap —
> https://github.com/Financial-Times/chart-doctor/tree/main/visual-vocabulary ·
> data-to-viz.com (heatmap) · ColorBrewer (sequential CVD-safe ramps, Brewer/Harrower) ·
> credited.
> Inherits: `global/dataviz.md` (L0). NOTE: this is the first type where COLOUR is
> the quantitative channel, so it does NOT use the Okabe-Ito categorical palette —
> it uses a SEQUENTIAL ramp (see rule 1).

A heatmap is a grid of cells across two categorical dimensions (e.g. day × hour); each cell's
**colour encodes a value**. It answers **"where are the highs and lows over two dimensions"** —
patterns, clusters, periodicity. The eye scans the grid for dark/bright clusters.

## When to use / when NOT

- **Use** for: a value over two categorical/temporal dimensions — activity by day×hour, a
  correlation matrix, intensity over region×year.
- **Not** for: a value over ONE dimension → a **bar** (length reads more precisely than colour).
- **Not** for: precise value comparison — colour is read less precisely than position/length; pair
  with in-cell value labels when exact numbers matter.
- **Not** for: too-fine grids that become noise; aggregate the bins.

## Correctness "de base" (heatmap-specific)

1. **Sequential, perceptually-ordered, CVD-safe colour ramp — NOT the categorical palette.** Colour
   is the data here, so it must be a sequential ramp whose **luminance changes monotonically** (a
   single-hue ColorBrewer ramp, or viridis). Monotonic luminance is what makes it readable in
   greyscale and under colour-vision deficiency. → `checkHeatmapConformance` enforces monotonic
   luminance across the ramp stops. (Diverging ramps for signed data are a future variant.)
2. **A colour legend (colourbar) with min/max labels.** Colour without a key is unreadable; show the
   ramp and its range.
3. **In-cell value labels when exact numbers matter**, with the label colour chosen by the cell's
   luminance (white on dark cells, ink on light) so it always clears contrast — the global WCAG rule
   applied per cell.
4. **Order the rows/cols deliberately** (natural order for time; by similarity or magnitude
   otherwise) so clusters are visible rather than scattered.
5. **Square-ish cells and a thin separator** so the grid reads as discrete cells.

## data-to-viz caveats (credited)

- Colour is imprecise: a heatmap shows the PATTERN well and exact values poorly — label cells if the
  number matters. (data-to-viz: "heatmap".)
- A rainbow ramp is the classic mistake — not perceptually uniform, not CVD-safe. Use sequential
  single-hue or viridis. (ColorBrewer.)

## Motion grammar (how a heatmap *builds*)

See `formats/video.md`; the heatmap gesture:

- chrome (row + column labels + the colourbar) fades in first;
- the cells **fade + scale in**, **staggered on a diagonal wave** (by row+column index) so the grid
  assembles corner-to-corner;
- the in-cell value labels fade in with their cell.
A cell never moves — only its appearance is animated, so frame N stays a pure function of the frame.
