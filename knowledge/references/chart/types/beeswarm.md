---
id: beeswarm
engines:
  chart-native: beeswarm
intent: [distribution]
shape: distribution
formats: [static, interactive, video]
bestFor:
  - "modest sample sizes (dozens to a few hundred) where the shape and the individual units matter — the box plot's blind spots become visible; colour by category to compare groups"
notFor:
  - "huge n — the swarm overplots into a blob; use a histogram or density plot instead"
  - "when only the summary matters — a box plot is denser (often paired: box behind, swarm in front)"
  - "precise reading of one unit — after the dodge the value position is approximate; that is what hover/labels are for"
---

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
5. **A single-hue swarm carries the subject-fit colour, never the default blue.** When the swarm is
   one hue (no category grouping), `BeeswarmChart` paints `config.baseColor` (the suggester's subject-fit
   choice — housing → amber `#E69F00`, labour/flows → vermilion `#D55E00`, …), falling back to Okabe-Ito
   blue ONLY when absent. A story about a non-water/cold subject left on a blue-family hue (`#0072B2` OR
   the sky-blue escape hatch `#56B4E9`) is the "shipped default blue" defect → `checkBeeswarmConformance`
   forwards the `subject` to the global subject-fit check for a single-hue swarm and FAILS produce (a
   categorical swarm's colours encode categories, not the subject, so subject-fit does not apply there).
6. **Name the outliers that "break away."** The story's called-out points (`config.highlight`) render
   LARGER + fully opaque with a **direct name + value label in ink** (WCAG: the label carries the value,
   the amber/coloured MARK carries the hue) — so the outliers read at a glance in static/video, not only
   on hover. Placement is edge-aware (a right-edge outlier's label extends inward, never clipping) and
   adjacent labels stack on alternating rows so they don't collide.

## data-to-viz caveats (credited)

- "Show your data": a beeswarm reveals what a box plot hides — but its perpendicular axis is decorative.
  Never encode a second variable on the dodge axis; that is a scatter, not a beeswarm.

## Motion grammar (how a beeswarm *builds*)

See `formats/video.md`; the gesture:

- the value axis + gridlines wipe in first (chrome);
- the dots **scale in from nothing** (radius 0 → full), staggered along the value axis (left → right),
  so the swarm assembles in value order; the colour legend fades in with the chrome.
A dot's position is fixed by the layout; only its radius animates, so frame N is a pure function of the frame.
