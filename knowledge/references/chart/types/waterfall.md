# Waterfall — per-type best practice (L2)

> Sources: FT Visual Vocabulary (the canon) — "flow" / "magnitude" waterfall —
> https://github.com/Financial-Times/chart-doctor/tree/main/visual-vocabulary ·
> data-to-viz.com · credited.
> Inherits: `global/dataviz.md` (L0), the cartesian-XY chart layer (L1), and the
> length/baseline-0 rule from `bar.md`.

A waterfall (bridge) chart shows how a **starting total moves to an ending total** through a sequence
of **+ and − steps**. Each step is a FLOATING bar that begins where the previous one ended; thin
connectors carry the running level across. It answers **"what drove the change from A to B, and by
how much each"** — the **flow** family.

## When to use / when NOT

- **Use** for: a bridge from one total to another — opening→closing balance, revenue build, a
  variance broken into contributions.
- **Not** for: independent magnitudes with no running total → a plain **bar** (`bar.md`); a waterfall
  only earns its keep when the steps ACCUMULATE.
- **Not** for: part-to-whole of a single total → **stacked**/pie. The waterfall's steps are signed
  changes, not slices.

## Correctness "de base" (waterfall-specific)

1. **Baseline 0 and a real running total.** The first and last bars are TOTALS drawn from zero; the
   middle bars are signed deltas that float on the running level. The cumulative arithmetic must be
   exact — the last total equals the start plus every step. → `checkWaterfallConformance`.
2. **Connectors carry the running level** from each bar's end to the next bar's start, so the eye
   follows the bridge. They are light, behind the bars.
3. **Three roles, three colours: increase / decrease / total** — an up hue, a down hue, and a neutral
   for the totals; all Okabe-Ito and colourblind-safe (an up/down pair must not be red/green).
4. **Signed value labels on the deltas** (`+600`, `−900`), absolute on the totals. The sign is the
   message.
5. **Order is the narrative** — steps run in story order (not sorted); the sequence IS the argument.

## data-to-viz caveats (credited)

- A waterfall with many small steps becomes hard to follow — group minor steps into "Other".
- Floating bars are read less precisely than grounded ones; the connectors + labels do the work, so
  label every step.

## Motion grammar (how a waterfall *builds*)

Extends `bar.md`'s "grow from the baseline", but each delta grows from its START level:

- chrome (count axis + gridlines) wipes in first;
- the bars build **left→right in story order**, each **growing from where the previous step ended**
  toward its own end (a total grows up from zero; an increase grows up, a decrease drops down),
  eased-out, staggered;
- each **connector** draws to the next step and the **signed label** fades in as the bar lands.
The bridge assembles step by step, so the reader follows the running total across.
