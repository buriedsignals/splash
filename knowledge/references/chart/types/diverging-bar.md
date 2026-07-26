---
id: diverging-bar
engines:
  chart-native: diverging
intent: [deviation]
shape: single
formats: [static, interactive, video]
bestFor:
  - "signed values across categories — net jobs added/lost, budget surplus/deficit, poll swing, above/below an average"
notFor:
  - "all-positive magnitudes — that is a plain bar; the diverging form only earns its keep when values cross zero"
  - "composition or part-to-whole — the bars don't sum to a whole, use stacked instead"
---

# Diverging bar — per-type best practice (L2)

> Sources: FT Visual Vocabulary (the canon) — "deviation" diverging bars —
> https://github.com/Financial-Times/chart-doctor/tree/main/visual-vocabulary ·
> data-to-viz.com · credited.
> Inherits: `global/dataviz.md` (L0), the cartesian-XY chart layer (L1), and the
> length/baseline-0 rule from `bar.md`.

A diverging bar chart shows values that go **above and below a zero baseline** — gains vs losses,
surplus vs deficit, sentiment + / −. Bars grow LEFT (negative) or RIGHT (positive) from a centred
zero line; their length is the magnitude, their side and colour the sign. It answers **"who is up,
who is down, and by how much"** — the **deviation** family.

## When to use / when NOT

- **Use** for: signed values across categories — net jobs added/lost, budget surplus/deficit,
  poll swing, above/below an average.
- **Not** for: all-positive magnitudes → a plain **bar** (`bar.md`); the diverging form only earns
  its keep when values cross zero.
- **Not** for: composition or part-to-whole (→ stacked); the bars don't sum to a whole.

## Correctness "de base" (diverging-specific)

1. **A single, emphasised ZERO line down the centre.** Everything is read relative to it; it must be
   the strongest reference line. The value axis includes 0 by construction (baseline rule from
   `bar.md`). → `checkDivergingBarConformance`.
2. **Two colours, one per sign** (within the global ≤2-colour rule) — a positive hue and a negative
   hue, both Okabe-Ito, consistent across the chart.
3. **Sort by value** (most positive at the top to most negative at the bottom) so the diverging shape
   reads as a ranked deviation, not a jumble.
4. **Direct, SIGNED value labels at each bar's outer tip** (`+18`, `−14`) — the sign is part of the
   value; never drop it. Category labels sit in the left gutter, clear of the bars.
5. **Symmetric breathing room** so the longest bar on each side has space for its label; the bars
   never run into the category gutter or the edge.

## data-to-viz caveats (credited)

- A diverging bar with no values crossing zero is just a bar chart drawn awkwardly — only diverge
  when the data actually diverges.
- Colour carries the sign, so the two hues must be clearly distinct AND colourblind-safe (a red/green
  pair fails CVD — use e.g. blue/orange-vermillion).

## Motion grammar (how a diverging bar *builds*)

Extends `bar.md`'s "grow from the baseline", but from the CENTRED zero:

- chrome (the zero line + any gridlines) wipes in first;
- each bar **grows from the zero line outward** to its value (left or right), eased-out, **staggered
  top→bottom**;
- the signed value label **rides the bar's growing outer tip** (always beyond the edge → never
  clipped) and fades in **early with** the bar — present from the moment the bar is meaningfully
  drawn, not only once it lands, so a mid-build video still never ships a label-less bar (rule 4).
  The fade uses the shared bar-family knob (`core/math` `labelReveal`); the old gate tied the label to
  the last 35 % of each bar's staggered growth, so the last-staggered bars froze label-less before the
  still. Guarded by `tests/diverging-bar-value-label-reveal.test.tsx`.
A bar never grows from its outer end — always from the zero line (rule 1).
