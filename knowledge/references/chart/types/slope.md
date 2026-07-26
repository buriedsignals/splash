---
id: slope
engines:
  chart-native: slope
intent: [change-over-time, ranking]
shape: wide
limits: { points: 2, maxSeries: 12 }
formats: [static, interactive, video]
bestFor:
  - "a before/after across a handful of categories"
  - "a rank change between two periods"
  - "an 'every X did A except Y' story where one line bucks the trend"
notFor:
  - "more than two points in time — that is a line chart"
  - "many categories with similar values — the lines tangle into a hairball"
  - "part-to-whole, or magnitude from zero"
---

# Slope chart — per-type best practice (L2)

> Sources: FT Visual Vocabulary (the canon) — "change over time" / "ranking"
> slope — https://github.com/Financial-Times/chart-doctor/tree/main/visual-vocabulary ·
> data-to-viz.com (the "slope" / two-period line) · Tufte (slopegraph) · credited.
> Inherits: `global/dataviz.md` (L0) and the cartesian-XY chart layer (L1).

A slope chart (slopegraph) plots **one value per category at exactly two points** (usually two
periods) and connects them with a straight line. The **slope of the line** encodes the change:
up/down direction, steepness = magnitude, and crossing lines = a change in rank. It answers
**"what went up, what went down, and what changed places"** between a before and an after.

## When to use / when NOT

- **Use** for: a before/after across a handful of categories (≤ ~12 lines); ranking changes between
  two periods; "every X did A except Y" stories where one line bucks the trend.
- **Not** for: more than two time points → that is a **line chart** (`line.md`). A slope is the
  two-point special case where the connecting line itself is the message.
- **Not** for: many categories with similar values → the lines tangle into a hairball; filter, or
  highlight the few that matter and mute the rest.
- **Not** for: part-to-whole (→ stacked/pie) or magnitude-from-zero (→ bar).

## Correctness "de base" (slope-specific)

1. **Position encoding, not length → the y-axis need NOT start at 0.** Unlike a bar, a slope encodes
   value by vertical *position*; a zoomed y-range that shows the change clearly is correct and
   expected. (This is the explicit opposite of the bar baseline-0 rule.) A light y-axis or none.
2. **Exactly two x positions, far apart**, one per period, each captioned with its period label.
   Keep generous left/right gutters for the category + value labels — they live outside the plot.
3. **Label both ends directly.** Each line carries its category name and value at the ends (the
   global "direct labels over a legend" rule); never force a legend on a slope. De-collide labels
   vertically when two endpoints are close.
4. **Two colours at most: a neutral context + one accent** (global ≤2-colour rule). The editorial
   subject — the line that crosses, or bucks the trend — is the accent; every other line is the
   neutral context colour. This is the whole point of a slope: make the one line that matters pop.
5. **Order/space the value labels** so the steepest, most important lines stay readable; a slope
   lives or dies on its endpoints being legible.

## data-to-viz caveats (credited)

- A slope with too many lines becomes spaghetti — its power is comparison of a *few* trajectories;
  beyond ~10–12 lines, highlight + mute or switch to small multiples. (data-to-viz: "line/slope".)
- Equal-looking slopes at different absolute heights still differ in rank — don't imply the highest
  line "won" if the story is about *change*; state which the chart is about.

## Motion grammar (how a slope *builds*)

See `formats/video.md` for the shared video discipline; the slope-specific gesture:

- chrome (the two period captions + a light axis) fades in first;
- the **left endpoints appear**, then each **line extends from its left point to its right point**
  (x2 interpolated left→right, eased-out), **staggered** in reading order — so the eye reads each
  trajectory drawing toward its destination;
- the **end labels fade in** as each line lands.
The accent line can lead (drawn first/last) to draw the eye to the editorial subject.
