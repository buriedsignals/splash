---
id: marimekko
engines:
  chart-native: marimekko
intent: [part-to-whole]
shape: structural
limits: { maxSeries: 5, maxCategories: 6 }
formats: [static, interactive, video]
bestFor:
  - "a total split two ways at once — spend by channel x category, market by segment x brand — where both the group sizes and their internal mix matter"
notFor:
  - "a single split — use a stacked bar / pie; the Marimekko only earns its width axis when the group sizes differ and matter"
  - "precise reading — variable widths make exact comparison hard; label the shares"
---

# Marimekko / mosaic — per-type best practice (L2)

> Sources: FT Visual Vocabulary (the canon) — "part-to-whole" Marimekko / mosaic —
> https://github.com/Financial-Times/chart-doctor/tree/main/visual-vocabulary ·
> data-to-viz.com (mosaic) · credited.
> Inherits: `global/dataviz.md` (L0), the cartesian-XY chart layer (L1), and the
> composition idea in `stacked-bar.md`.

A Marimekko (mosaic) shows **two nested proportions at once**: columns of VARYING WIDTH (each width =
that column's share of the total) are each split into vertical SEGMENTS (each height = that series'
share within the column). So a cell's **area = column-share × within-share = its overall share**. It
answers **"how big is each group, and how does each group break down"** — part-to-whole in 2-D.

## When to use / when NOT

- **Use** for: a total split two ways at once — spend by channel × category, market by segment ×
  brand — where BOTH the group sizes and their internal mix matter.
- **Not** for: a single split → a **stacked bar** / pie (`stacked-bar.md`); the Marimekko only earns
  its width axis when the group SIZES differ and matter.
- **Not** for: precise reading — variable widths make exact comparison hard; label the shares.

## Correctness "de base" (marimekko-specific)

1. **Both axes are 0–100%** (or 0–total): column widths sum to the full width, each column's segments
   sum to its full height. The area encodes the joint share. → `checkMarimekkoConformance`.
2. **Consistent series order + colour down EVERY column** (like a stacked bar) so the segments read
   as the same series across columns.
3. **Label the column widths** (each column's share) along the top, and the series via a legend; cell
   labels only where the cell is big enough to hold them.
4. **≤ ~5 series and ≤ ~6 columns** — beyond that the mosaic turns to confetti; group "Other".
5. **Thin separators** between columns and between segments so the grid reads as discrete cells.

## data-to-viz caveats (credited)

- The Marimekko is striking but READ IMPRECISELY — varying widths defeat quick comparison; always
  label the shares and state the one comparison the chart is for. (data-to-viz: "mosaic".)
- Too many cells = noise; this form wants a small, clean grid.

## Motion grammar (how a Marimekko *builds*)

Extends the stacked composition idea:

- chrome (the % axes + column-width labels + legend) fades in first;
- the cells **fade + scale in, staggered column by column LEFT→RIGHT**, the segments within a column
  appearing together — so the mosaic assembles a column at a time;
- the cell / column labels fade in with their column.
A cell never moves — only its appearance animates, so frame N is a pure function of the frame.
