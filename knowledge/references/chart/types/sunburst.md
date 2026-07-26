---
id: sunburst
engines:
  chart-native: sunburst
intent: [part-to-whole]
shape: structural
limits: {}
formats: [static, interactive, video]
bestFor:
  - "a hierarchy of 2-3 levels where the nested shares are the story, in a compact radial form"
notFor:
  - "precise comparison — angle, and especially area on outer rings, is read poorly; use a bar/treemap for exact ranking"
  - "deep or wide trees — the outer rings become unreadable slivers; collapse or use an icicle"
  - "flat data (one level) — that's a pie/donut"
---

# Sunburst — per-type best practice (L2)

> Sources: FT Visual Vocabulary (the canon) — "part-to-whole" / hierarchy sunburst · the radial
> icicle/partition (the form) · data-to-viz.com (the sunburst — and its area caveats). credited.
> Inherits: `global/dataviz.md` (L0) and the treemap part-to-whole rules. A radial hierarchy layout.

A sunburst shows a HIERARCHY as concentric rings: the centre is the whole, each ring out is a level, and
each arc's **angle is proportional to its value**. It answers **"how does a whole break down, level by
level"** — a budget → theme → line, a catalogue → category → product.

## When to use / when NOT — read the caveats first

- **Use** for: a hierarchy of 2–3 levels where the nested SHARES are the story, in a compact radial form;
  branches grouped by colour.
- **Not** for: precise comparison — angle (and especially area on outer rings) is read poorly; for exact
  ranking use a bar / treemap.
- **Not** for: deep or wide trees — the outer rings become unreadable slivers; collapse or use an icicle.
- **Not** for: flat data (one level) — that's a pie/donut.

## Correctness "de base" (sunburst-specific)

1. **Angle ∝ value**, a child's arc nested WITHIN its parent's angular range; rings by depth from the
   centre out. → `checkSunburstConformance` (all values > 0; children sum to the parent).
2. **Colour by top-level branch** (Okabe-Ito), lightening with depth so levels read; a legend names the
   branches.
3. **Label the big arcs in place** (along/within the arc), smaller on hover; WCAG-correct text colour.
4. **Order arcs deliberately** (size or fixed) and keep it stable.

## data-to-viz caveats (credited)

- Outer rings span the same angle as their parent but MORE area, exaggerating deep nodes; and angles are
  hard to compare across the circle. Use a sunburst for the gestalt of a hierarchy — pair with a
  treemap/bar when exact values matter.

## Motion grammar (how a sunburst *builds*)

See `formats/video.md`; the gesture:

- the rings **sweep open from the centre outward** — each arc grows from its start angle, ring by ring
  (inner first), eased; the labels fade in after their arc lands.
An arc's angles/radii are fixed by the layout; only the sweep animates, so frame N is a pure function of
the frame.
