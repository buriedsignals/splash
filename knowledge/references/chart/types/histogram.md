---
id: histogram
engines:
  chart-native: histogram
intent: [distribution]
shape: distribution
formats: [static, interactive, video]
bestFor:
  - "the shape of one continuous variable's distribution — sale prices, commute times, ages — to show the mode, spread, and skew"
notFor:
  - "a categorical comparison — that is a bar; a bar has gaps and discrete categories, a histogram has touching bars and a continuous axis"
  - "comparing two distributions precisely — use small-multiple histograms or a density plot"
---

# Histogram — per-type best practice (L2)

> Sources: FT Visual Vocabulary (the canon) — "distribution" histogram —
> https://github.com/Financial-Times/chart-doctor/tree/main/visual-vocabulary ·
> data-to-viz.com (histogram) · credited.
> Inherits: `global/dataviz.md` (L0), the cartesian-XY chart layer (L1), and the
> length/baseline-0 rule from `bar.md` (a histogram bar encodes a COUNT length).

A histogram bins a **continuous variable** into intervals and draws one bar per bin whose height is
the **count** (or frequency) in that bin. It answers **"how is this variable distributed"** — where
the mass is, the spread, the skew, the tail. The x is the continuous variable; bars **touch** (no
gap), because the bins are contiguous slices of a continuum.

## When to use / when NOT

- **Use** for: the shape of ONE continuous variable's distribution — sale prices, commute times,
  ages — to show the mode, spread and skew.
- **Not** for: a categorical comparison → that is a **bar** (`bar.md`); a bar has gaps and discrete
  categories, a histogram has touching bars and a continuous axis. (The single hardest thing to keep
  straight — they look similar but mean different things.)
- **Not** for: comparing two distributions precisely → small-multiple histograms or a density plot.

## Correctness "de base" (histogram-specific)

1. **Baseline MUST be 0** (inherited from `bar.md` rule 1) — count is a length. → enforced by
   `checkHistogramConformance` (count axis includes 0; it does by construction).
2. **Bars TOUCH — no gap.** Contiguous bins read as a continuum; a gap would make it a bar chart and
   imply discrete categories. This is the defining visual rule.
3. **Choose the bin width deliberately.** Too wide hides the shape; too narrow makes it noisy. State
   the bin width (or imply it from labelled edges). The producer's default: ~`range / 10` rounded to
   a nice number, overridable.
4. **Label the x by the variable + unit**, not by bin index; mark the bin edges so a reader can place
   a value.
5. **Annotate the centre** (median or mean) with a marked line + label when the central tendency is
   part of the story — a single accent (≤2 colours with the bar colour).

## data-to-viz caveats (credited)

- The shape is sensitive to bin width and to bin offset; a misleading bin choice can hide a peak or
  invent one. Pick a sensible width and don't cherry-pick the one that flatters the story.
  (data-to-viz: "histogram".)
- For small samples a histogram is unstable; show the n, or use a dot/strip plot.

## Motion grammar (how a histogram *builds*)

Extends `bar.md`'s "grow from the baseline" — see `formats/video.md`:

- chrome (count axis + gridlines) wipes in first;
- each bar **grows from the zero baseline to its count**, eased-out, **staggered left→right** across
  the bins, so the distribution's shape assembles along the variable axis;
- the **median/mean marker** fades in last.
Bars never grow from the middle — anchored at the zero baseline (rule 1).
