---
id: streamgraph
engines:
  chart-native: streamgraph
intent: [change-over-time, part-to-whole]
shape: wide
limits: { maxSeries: 7 }
formats: [static, interactive, video]
bestFor:
  - "many series (5-7) over a continuous time axis where the shift in composition and the overall ebb/flow is the story"
notFor:
  - "reading precise values — with no shared baseline only the thickest bands are readable; use a stacked area or small multiples if exact values matter"
  - "few series — a stacked area or lines are clearer"
  - "data with negatives or gaps — the stack needs a clean positive composition per step"
---

# Streamgraph — per-type best practice (L2)

> Sources: FT Visual Vocabulary (the canon) — "change over time" / "part-to-whole" streamgraph ·
> data-to-viz.com (the streamgraph — and its "no baseline" caveat) · Byron & Wattenberg (wiggle/inside-out).
> credited. Inherits: `global/dataviz.md` (L0). A stacked-area variant with a free, centred baseline.

A streamgraph is a stacked area with **no fixed baseline**: the bands flow around a centred, wiggling
axis, their THICKNESS encoding each series' value over time. It answers **"how has the COMPOSITION and
its overall size shifted over time"** — an organic, at-a-glance read of many series rising and falling.

## When to use / when NOT — read the caveats first

- **Use** for: many series (5–7) over a continuous time axis where the SHIFT in composition and the
  overall ebb/flow is the story — genres, fuels, categories over decades.
- **Not** for: reading precise values — with no shared baseline, only the THICKEST bands are readable;
  thin/middle ones are guesswork. If exact values matter, use a stacked area or small multiples.
- **Not** for: few series — a stacked area or lines are clearer.
- **Not** for: data with negatives or gaps — the stack needs a clean positive composition per step.

## Correctness "de base" (streamgraph-specific)

1. **Thickness ∝ value** on one shared scale; the wiggle baseline (inside-out order, wiggle offset)
   minimises distracting waviness so the bands read. → `checkStreamgraphConformance`.
2. **No value axis** (the baseline is free) — so LABEL the bands directly (on their thickest point) and
   caption the time axis; never imply readable absolute heights.
3. **≤ ~7 series**, each an Okabe-Ito hue; order inside-out (biggest in the middle).
4. **Smooth the bands** (a gentle curve) for the organic read, but keep the data points honest.

## data-to-viz caveats (credited)

- A streamgraph is **beautiful but imprecise**: the free baseline makes every band but the centre hard
  to measure, and the curve can hide the actual data points. Use it for the GESTALT of change; pair with
  a stacked area or a table when readers need numbers.

## Motion grammar (how a streamgraph *builds*)

See `formats/video.md`; the gesture:

- each band **grows from its own centre-line outward** (thickness 0 → full), staggered, so the stream
  inflates into shape; the band labels fade in last on their thickest point.
A band's silhouette is fixed by the layout; only its thickness animates, so frame N is a pure function
of the frame.
