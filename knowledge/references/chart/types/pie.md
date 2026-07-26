---
id: pie
engines:
  chart-native: pie
  dw-chart: d3-pies
intent: [part-to-whole]
shape: single
limits: { maxCategories: 5 }
formats: [static, interactive, video]
bestFor:
  - "the components of one whole, with few slices and clearly different sizes"
notFor:
  - "more than about five slices — use bars"
  - "comparing angles precisely, or anything that is not a part of one whole"
---

# Pie / Donut — part-to-whole (L2)

> Sources: FT Visual Vocabulary (Part-to-whole — pie, donut) —
> https://github.com/Financial-Times/chart-doctor/tree/main/visual-vocabulary ·
> data-to-viz.com (the pie caveats) · credited.
> Inherits: `global/dataviz.md` (L0). NOT a cartesian chart — no axes (so it does
> NOT inherit the cartesian-XY layer; the chart-family shared bits it uses are
> the frame, palette, label placement, not gridlines/ticks).

A pie/donut shows the **composition of one whole** — each slice's *angle* (and
area) is its share. The donut is a pie with a hole, which can hold a headline
number (the total).

## When to use / when NOT — read this first

data-to-viz is openly sceptical of pies: **angles are hard to compare**, so a pie
is only acceptable when **all three** hold:
1. the data is genuinely **part-to-whole** (the slices sum to a meaningful 100%);
2. there are **few slices (≤5–6)**;
3. the differences are **large and few** (one dominant slice, or clearly distinct sizes).

If any fails — many categories, similar sizes, or you want to compare values
precisely — **use a bar chart** instead (length beats angle). The producer should
refuse a pie with >6 slices and emit a bar recommendation, or group the tail into
"Other".

## Correctness "de base" (specific to pie/donut)

1. **Slices must sum to a whole.** The values represent shares of a single total;
   never a pie of unrelated quantities.
2. **Sort by size, start at 12 o'clock, go clockwise.** Largest slice first from
   the top — the eye reads magnitude from the 12-o'clock anchor.
3. **Label each slice directly** with its name + **percentage** (and/or value);
   no legend (legend = eye travel). Small slices get an outside label + leader.
4. **At most ~5 slices.** Beyond that, angles blur — group into "Other" or switch
   to bars. Keep "Other" last and neutral-coloured.
5. **No 3D, no explode, no drop shadows.** They distort the angle = the data.
6. **Donut hole = the headline number** (the total, or the dominant share) — its
   one good use; otherwise a plain pie.

## Colour (where global ≤2-colour bends)

A pie needs **one colour per slice**, so the global "≤2 colours" rule relaxes to
**few CVD-safe colours (≤5, from the Okabe-Ito set)** — or, stronger editorially,
**one hue with a single highlighted slice** (the subject) and the rest muted
grey. The latter is best when the story is "this one slice vs the rest".

## Motion grammar (how a pie *builds*, distinct from cartesian types)

A pie does not draw or grow from a baseline — it **sweeps**. See `formats/video.md`
for the shared video discipline; the pie-specific gesture:

- the wedges **sweep in clockwise from 12 o'clock** (each slice's end-angle eases
  from its start to its full angle), in size order;
- slice **labels (name + %) fade in** as their wedge completes;
- a donut's **centre number counts in / fades** last.
The sweep is a pure function of progress (one master angle from 0 → 2π mapped
across the sorted slices), so it stays frame-deterministic for video.
