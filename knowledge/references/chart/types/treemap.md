# Treemap — per-type best practice (L2)

> Sources: FT Visual Vocabulary (the canon) — "part-to-whole" / "magnitude" treemap · data-to-viz.com
> (the treemap — and its "area is hard to compare" caveat) · Bruls/Huizing/van Wijk (squarified). credited.
> Inherits: `global/dataviz.md` (L0). A space-filling area layout.

A treemap tiles a rectangle into cells whose **AREA is proportional to each item's value**; colour groups
related items. It answers **"how is a whole split across MANY parts — which dominate, how do the groups
compare"** in a compact space a pie can't hold.

## When to use / when NOT — read the caveats first

- **Use** for: a part-to-whole with **many** items (more than ~6, where a pie fails), where relative
  SIZE is the message — budgets, market share, catalogue breakdowns; optionally grouped by colour.
- **Not** for: precise ranking or comparison — area (and aspect ratio) is read poorly; if exact order
  matters use a bar / dot plot.
- **Not** for: a few parts — a bar or pie is clearer.
- **Not** for: negative or zero values — area can't be negative (drop or aggregate them).

## Correctness "de base" (treemap-specific)

1. **Area encodes value** — a faithful tiling (cells fill the rectangle; the only gaps are thin
   separators). → `checkTreemapConformance` (all values > 0; area ∝ value).
2. **Squarified layout** (cells kept near-square) so areas are as comparable as a treemap allows;
   order largest → top-left.
3. **Label the big cells in place** (name + value/share), with WCAG-correct text colour by cell
   luminance; smaller cells read on hover. Truncate to the cell.
4. **Colour by group** (Okabe-Ito, ≤ ~5) with white separators; a legend names the groups.

## data-to-viz caveats (credited)

- Humans compare **area** far worse than length, and a cell's aspect ratio distorts the read. A treemap
  is for an at-a-glance overview in tight space — pair it with a bar when precise ranking is the point.

## Motion grammar (how a treemap *builds*)

See `formats/video.md`; the gesture:

- the cells **scale in from nothing** (from each cell's centre), largest first, staggered;
- each cell's label fades in after the cell lands; the group legend fades in with the first cells.
A cell's rectangle is fixed by the layout; only its scale animates, so frame N is a pure function of the frame.
