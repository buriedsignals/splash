# Box plot / box-and-whisker — per-type best practice (L2)

> Sources: FT Visual Vocabulary (the canon) — "distribution" box plot · data-to-viz.com (the boxplot —
> and its "show your data" caveat) · Tukey (the 1.5·IQR convention). credited.
> Inherits: `global/dataviz.md` (L0). A cartesian distribution-per-category layout.

A box plot summarises a distribution with its **five-number summary** (min, Q1, median, Q3, max) and
plots outliers individually. It answers **"how do these groups' distributions compare — centre, spread,
skew, and which points are unusual"**. The box is the middle 50% (the IQR); the line is the median.

## When to use / when NOT — read the caveats first

- **Use** for: comparing the distribution of a continuous variable across a handful of categories —
  spread and skew at a glance, with outliers called out.
- **Not** for: small samples — a box of n≈5 hides how little data there is. Show the points
  (strip / beeswarm) or overlay them. (data-to-viz: "boxplot — show your data".)
- **Not** for: multimodal data — a box plot cannot show two humps; a histogram / violin / beeswarm
  reveals shape the box hides. Say so or switch type when the shape is the story.
- **Not** for: a single number per group — that is a bar / dot plot, not a distribution.

## Correctness "de base" (boxplot-specific)

1. **Always draw the median line** inside the box — it is the headline statistic.
2. **Define the whiskers and state the rule.** Default: Tukey — whiskers reach the furthest point
   within 1.5·IQR of the quartiles; everything beyond is an **outlier dot**. → `checkBoxplotConformance`.
3. **Plot outliers individually** (don't let a whisker run to a lone extreme — that hides the gap),
   with a symbol distinct from the box. **Label the few that matter** — when a category has only a
   handful of outliers (≤ ~3), write each value next to its dot so a lone point reads as data, not a
   glitch; when there are many, drop the labels and rely on hover/focus to show the value (avoid
   clutter). Place the label on the side with room so it never overflows. (FT / data-to-viz / Tableau /
   Atlassian consensus: outliers individually marked, sparingly labelled, value-on-hover in interactives.)
4. **POSITION encoding** → the value axis need NOT start at 0 (a zoomed range is correct); but always
   **label the axis with its unit**. (Unlike a bar, length here is not the encoding.)
5. **One hue for the boxes** (Okabe-Ito); the median + axis are ink. Colour a second series only to
   compare two groups side-by-side, ≤ 2 hues.

## data-to-viz caveats (credited)

- A box plot **hides the underlying distribution**: same five-number summary, very different data.
  When n is modest and shape matters, overlay the points or prefer a violin / beeswarm.

## Motion grammar (how a box plot *builds*)

See `formats/video.md`; the gesture:

- the value axis + gridlines wipe in first (chrome);
- each box **grows from the median outward** — the IQR rectangle expands to Q1/Q3, the whiskers
  extend to their fences, eased-out, staggered by category; outlier dots pop as the whiskers pass them.
A box never grows from an edge — always from the median (rule 1), so frame N is a pure function of the frame.
