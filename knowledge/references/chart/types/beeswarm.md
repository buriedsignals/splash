# Beeswarm / strip plot — per-type best practice (L2)

> Sources: FT Visual Vocabulary (the canon) — "distribution" beeswarm · data-to-viz.com (the
> "show your data" argument) · credited.
> Inherits: `global/dataviz.md` (L0). A 1-D value layout with perpendicular dodge.

A beeswarm plots **every data point** along ONE value axis, dodged perpendicular so none overlap. It
answers **"how are the individual units actually distributed — clusters, gaps, outliers — with nothing
hidden"**. It is the **"show your data"** answer to the box plot: same axis, but every unit is a dot.

## When to use / when NOT — read the caveats first

- **Use** for: modest n (dozens to a few hundred) where the SHAPE and the individual units matter —
  the box plot's blind spots (bimodality, a sparse tail) become visible. Colour by a category to
  compare groups.
- **Not** for: huge n — the swarm overplots into a blob; use a histogram / density.
- **Not** for: when only the summary matters — a box plot is denser; (often the two are paired —
  box behind, swarm in front).
- **Not** for: precise reading of one unit — after the dodge the value position is approximate; that
  is what hover/labels are for.

## Correctness "de base" (beeswarm-specific)

1. **Every point shown exactly once**, dodged so dots don't overlap (collision-avoidance along the
   perpendicular axis only). → `checkBeeswarmConformance`.
2. **The dodge axis is MEANINGLESS** — only the value position carries meaning. Keep it visibly a 1-D
   chart (centre the swarm; don't add a perpendicular scale) so readers don't over-read vertical
   position.
3. **Label the value axis with its unit** (POSITION encoding → the axis need NOT start at 0).
4. **Colour categories with Okabe-Ito + a legend** (or one hue); a few notable points may be labelled,
   the rest read on hover.

## data-to-viz caveats (credited)

- "Show your data": a beeswarm reveals what a box plot hides — but its perpendicular axis is decorative.
  Never encode a second variable on the dodge axis; that is a scatter, not a beeswarm.

## Motion grammar (how a beeswarm *builds*)

See `formats/video.md`; the gesture:

- the value axis + gridlines wipe in first (chrome);
- the dots **scale in from nothing** (radius 0 → full), staggered along the value axis (left → right),
  so the swarm assembles in value order; the colour legend fades in with the chrome.
A dot's position is fixed by the layout; only its radius animates, so frame N is a pure function of the frame.
