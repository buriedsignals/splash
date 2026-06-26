# Bullet chart — per-type best practice (L2)

> Sources: Stephen Few (the inventor of the bullet graph) · FT Visual Vocabulary
> (the canon) — "magnitude" vs a target · data-to-viz.com · credited.
> Inherits: `global/dataviz.md` (L0), the cartesian-XY chart layer (L1), and the
> length/baseline-0 rule from `bar.md`.

A bullet chart shows one **measure against a target**, on a backdrop of **qualitative range bands**
(e.g. poor / ok / good). Per row: shaded reference bands, a thin measure bar from zero, and a target
marker. It answers **"did it hit the target, and where does it sit on the scale"** — accountability
in one compact row. A few rows make a small-multiple of KPIs.

## When to use / when NOT

- **Use** for: a metric vs a target with context bands — service targets, budgets vs plan, a KPI
  dashboard rendered for print/embed.
- **Not** for: comparing many categories' raw magnitudes → a **bar** (`bar.md`); the bullet's value
  is the target + the qualitative context, not the cross-category comparison.
- **Not** for: a distribution or a trend (→ histogram / line).

## Correctness "de base" (bullet-specific)

1. **Measure bar from zero** (inherited baseline-0) — the bar's length is the value. → enforced.
2. **A clear TARGET marker** (a perpendicular tick) per row — the whole point is "did it reach this".
   The reader must see measure-vs-target at a glance.
3. **Qualitative bands in NEUTRAL shades** (light→slightly darker greys), NOT the data palette —
   they are context, not data, so they must recede behind the measure (like gridlines, they are
   palette-exempt). 2–3 bands; more is noise.
4. **One measure colour** (Okabe-Ito), strong against the grey bands; the target marker is ink.
5. **Each row on its OWN scale** (its own units and max) — a small-multiple of bullets normalises per
   row so each fills the width; label each row's value + unit.

## data-to-viz caveats (credited)

- Bullets pack a lot into a thin row; keep to ONE measure + ONE target + ≤3 bands, or it stops
  reading at a glance (Few's whole point was restraint).
- The bands are reference, not data — never colour them with the categorical palette or they compete
  with the measure.

## Motion grammar (how a bullet *builds*)

Extends `bar.md`'s "grow from the baseline":

- chrome (the qualitative bands + the target markers) fades in first — the backdrop is set;
- each **measure bar grows from zero to its value**, eased-out, **staggered** down the rows;
- the value label fades in as the measure lands; the target marker was already there to be measured
  against.
The measure never grows from its tip — always from zero (rule 1).
