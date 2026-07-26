---
id: waffle
engines:
  chart-native: waffle
intent: [part-to-whole]
shape: single
limits: { maxCategories: 6 }
formats: [static, interactive, video]
bestFor:
  - "a single composition with a few categories where the proportion should feel countable — a budget split, a 1-in-N share, a modal split"
notFor:
  - "precise sub-percent differences — the grid's granularity is one cell (1%)"
  - "many categories — the cells fragment into confetti; group the tail into Other"
  - "change over time — use a stacked area; a waffle is one snapshot"
---

# Waffle / square-pie chart — per-type best practice (L2)

> Sources: FT Visual Vocabulary (the canon) — "part-to-whole" waffle/isotype · data-to-viz.com · the
> "1 square = 1 unit" newsroom convention. credited.
> Inherits: `global/dataviz.md` (L0). A grid-of-cells part-to-whole.

A waffle chart fills a grid (usually 10×10 = 100 cells) where **each cell is one unit** (often 1%),
coloured by category. It answers **"what share — made concrete and countable"**: "half", "1 in 5". The
grid makes proportion tangible for a general audience in a way a pie's angles don't.

## When to use / when NOT — read the caveats first

- **Use** for: a single composition with a few categories (≤ ~6) where you want the proportion to feel
  COUNTABLE — a budget split, a "1 in N" share, a modal split.
- **Not** for: precise sub-percent differences — the grid's granularity is one cell (1%).
- **Not** for: many categories — the cells fragment into confetti; group the tail into "Other".
- **Not** for: change over time — use a stacked area; a waffle is one snapshot.

## Correctness "de base" (waffle-specific)

1. **Cells sum to the whole** (e.g. 100) — round shares to whole cells with largest-remainder so the
   counts still total exactly. → `checkWaffleConformance`.
2. **State the unit** ("each square = 1%"); fill the cells in a consistent order (a filling container).
3. **≤ ~6 categories**, each an Okabe-Ito hue, with a legend giving the real value.
4. **Square cells, a thin gap**, so they read as discrete countable units.

## data-to-viz caveats (credited)

- Rounding to whole cells distorts small shares — a 0.4% category becomes 0 or 1 cell. Say "each square =
  1%" and never imply sub-cell precision; for exact small values, add a label or use a bar.

## Motion grammar (how a waffle *builds*)

See `formats/video.md`; the gesture:

- the cells **fill in order** (the container fills, bottom→top), scaling/fading in, staggered; the
  category legend fades in with the chrome.
A cell's colour/position is fixed by the layout; only its opacity/scale animates, so frame N is a pure
function of the frame.
