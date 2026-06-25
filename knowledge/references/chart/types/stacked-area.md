# Stacked area — per-type best practice (L2)

> Sources: FT Visual Vocabulary (the canon) — "change over time" / "part-to-whole"
> stacked area — https://github.com/Financial-Times/chart-doctor/tree/main/visual-vocabulary ·
> data-to-viz.com (stacked area caveats) · credited.
> Inherits: `global/dataviz.md` (L0), the cartesian-XY chart layer (L1), the line
> rules in `line.md` (continuous x, position), and the composition idea in
> `stacked-bar.md` — the stacked area is the CONTINUOUS sibling of the stacked bar.

A stacked area plots several series as filled bands stacked on a **continuous x** (usually time);
each band's thickness is its value, the top edge is the total. It answers **"how did the
composition of a total shift over time"** — the continuous version of the stacked bar.

## When to use / when NOT

- **Use** for: a composition over many time points (≥ ~5) — energy mix, viewing share, budget split
  over years. ≤ ~5 series.
- **Not** for: a few discrete periods → a **stacked bar** (`stacked-bar.md`) reads more precisely.
- **Not** for: comparing the *inner* (non-baseline) bands precisely across time — only the bottom
  band has a flat baseline; middle bands are hard to read. If an inner series is the story, use
  **lines** or a 100%-stacked area. (Same caveat as stacked bar.)
- **Not** for: > ~5 series — the bands blur; group "Other".

## Correctness "de base" (stacked-area-specific)

1. **Baseline MUST be 0.** The stack grows from a common zero; the y-axis includes 0. → enforced by
   `checkStackedAreaConformance` (valueDomain includes 0). (Length/area encoding, like the bar.)
2. **Consistent series order + colour across the whole width.** The stacking order is fixed; never
   reorder per time point.
3. **Put the most important / most stable series on the baseline** — only the bottom band has a flat
   reference; the series the reader must track goes at the bottom (or the riser goes on top so it
   expands into clear space).
4. **Direct band labels at the right edge** (the latest values) beat a legend — name each band where
   it ends, de-colliding vertically. (Inherits the global "direct labels" rule.)
5. **≤ 5 series, each an Okabe-Ito hue** (categorical, colourblind-safe).

## data-to-viz caveats (credited)

- Stacked areas hide the individual series' shape — only the bottom band and the total read cleanly;
  state the one comparison the chart supports. (data-to-viz: "stacked area graph".)
- Wiggly middle bands can mislead; if absolute per-series trends matter, small-multiple lines win.

## Motion grammar (how a stacked area *builds*)

See `formats/video.md`; the stacked-area gesture, distinct from the bar's vertical grow:

- chrome (axes + gridlines) wipes in first;
- the **whole stack reveals left→right across time** (a horizontal wipe, like the line drawing on),
  so the composition assembles as time advances;
- the **band labels fade in** at the right edge as the wipe lands there.
A band never grows from its own middle — the stack is anchored at the zero baseline (rule 1).
