---
id: dot-strip
engines:
  chart-native: dot-strip
intent: [distribution]
shape: single
formats: [static, interactive, video]
bestFor:
  - "comparing the SPREAD of raw observations across a few categories when the shape — not just a single summary number — is the story"
notFor:
  - "a single value per category — that is a bar or lollipop, not a distribution"
  - "dozens of categories at once — the strips stack up and become tall and hard to scan; keep it to a handful"
  - "very large n where dots saturate into a solid band even with transparency — switch to a histogram or violin"
  - "confusing this with the FT 'dot plot' — a min/max range per category, closer to a dumbbell"
  - "confusing this with beeswarm — beeswarm dodges points off the line so none overlap; a dot strip keeps every point on its own line and shows overlap via transparency"
---

# Dot strip plot — per-type best practice (L2)

> Sources: FT Visual Vocabulary (the canon) — "distribution" dot strip plot —
> https://github.com/Financial-Times/chart-doctor/tree/main/visual-vocabulary ("Good for showing
> individual values in a distribution, can be a problem when too many dots have the same value.") ·
> data-to-viz.com (the boxplot "show your data" caveat, shared logic) —
> https://www.data-to-viz.com/caveat/boxplot.html · credited.
> Inherits: `global/dataviz.md` (L0). A 1-D value layout, ONE row per category, no dodge.

A dot strip plots **every raw observation** of a category on its OWN horizontal line, positioned by
value on a shared axis. It answers **"how spread out are this group's actual values — not just its
average"** across a handful of categories at once. Overlapping values are shown honestly by
transparency (+ a tiny deterministic jitter so identical values don't merge into one dot), never by
hiding or averaging them away.

## When to use / when NOT — read the caveats first

- **Use** for: comparing the SPREAD of raw observations across a few categories (pupils per school,
  wait times per clinic, salaries per team) when the shape — not just a single summary number — is
  the story, and each category has a modest number of observations (tens, not thousands).
- **Not** for: a single value per category — that is a **bar** or **lollipop**, not a distribution.
- **Not** for: dozens of categories at once — the strips stack up and the chart becomes tall and hard
  to scan; keep it to the handful an eye can compare (FT vocabulary; same ceiling as beeswarm).
- **Not** for: very large n where dots saturate into a solid band even with transparency — switch to a
  **histogram** or **violin** (the density shape reads better than an overplotted strip).
- **Not to be confused with** the FT vocabulary's separate "dot plot" (a min/max RANGE per category,
  closer to a `dumbbell`) — same family, different encoding: a dot strip shows every observation, a
  dot(-range) plot shows only the extremes.
- **Not to be confused with `beeswarm`** — a beeswarm actively DODGES points off the value line so none
  overlap (a 2-D layout in service of a 1-D read); a dot strip keeps every point on the category's own
  line and lets transparency show the overlap instead (a stricter "position IS the data" read, cheaper
  to compute, more honest about density when the dodge itself would exaggerate spread).

## Correctness "de base" (dot-strip-specific)

1. **Every observation plotted, none aggregated away** — many rows can share a category; the mapper
   passes rows RAW (`spec-to-config.ts`'s `dot-strip` case never groups/reduces before render). A
   category with zero observations is a build error, not a valid empty strip. → `checkDotStripConformance`
   (`skills/chart-native/src/core/conformance.ts:642`).
2. **POSITION encoding** → the value axis need NOT start at 0 (like the beeswarm/dumbbell/slope, the
   opposite of the bar); always **label the axis with its unit**.
3. **A summary marker is REQUIRED** (the category mean, drawn as a neutral vertical tick) — the raw
   cloud of dots needs one reference point so the eye isn't left averaging by hand.
   `checkDotStripConformance` fails a strip with no summary marker.
4. **One Okabe-Ito hue for every dot** (`DOT_COLOR`) — colour is not spent encoding anything here;
   the mean tick uses a neutral ink colour so it reads as "reference", not "another series".
5. **Overlap is honest, never hidden**: identical/near-identical values render as transparent,
   slightly-jittered dots (deterministic — a pure function of the value, not `Math.random()`, so
   frames stay reproducible) rather than a dodge or a silent drop.

## data-to-viz caveats (credited)

- The same "show your data" argument the boxplot caveat makes: a single summary marker (mean/median)
  can hide bimodality, gaps, or a lone outlier that only the raw points reveal — the reason a dot strip
  pairs a real per-point layer with, not instead of, its summary tick.
  (data-to-viz: `caveat/boxplot.html`.)
- FT vocabulary's own caveat is the mirror risk: too many same-valued dots make the strip a solid smear
  — the jitter mitigates it but does not solve it at high n; switch types past that point.

## Motion grammar (how a dot strip *builds*)

See `formats/video.md`; the gesture:

- the value axis + gridlines wipe in first, and category labels fade in with the chrome;
- the dots and each category's mean tick are revealed together by a **left→right clip wipe** along the
  value axis (`progress` drives the clip width, not per-dot staggering) — the strip fills in value
  order, same direction the axis reads.
A dot's screen position is fixed by its value; only the reveal clip advances, so frame N is a pure
function of the frame.
