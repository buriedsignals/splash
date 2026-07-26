---
id: radial-bar
engines:
  chart-native: radial-bar
intent: [magnitude, ranking]
shape: single
formats: [static, interactive, video]
bestFor:
  - "a magnitude per category where the categories form a natural cycle and that cyclicality is part of the story — trips per hour of day, sales per month of year, wind observations per compass direction"
notFor:
  - "a non-cyclical ranking or magnitude comparison — that is a plain bar, which lets lengths be compared directly on a shared baseline"
  - "precise value comparison between two bars far apart around the circle — the eye compares chords/angles worse than bars on a line"
  - "many non-adjacent categories where you need to read exact differences — reserve this for the shape of the cycle, not a data-lookup task"
---

# Radial bar / radial column — per-type best practice (L2)

> Sources: FT Visual Vocabulary (the canon) — "magnitude / ranking" radial bar/column —
> https://github.com/Financial-Times/chart-doctor/tree/main/visual-vocabulary · data-to-viz.com (the
> circular-barplot distortion caveats) —
> https://www.data-to-viz.com/caveat/circular_barplot_accordeon.html ("Mind the radial bar charts") and
> https://www.data-to-viz.com/caveat/circular_bar_yaxis.html ("Circular barplot and distortion") ·
> credited. Inherits: `global/dataviz.md` (L0). A bar chart bent around a circle — same length
> encoding as `bar.md`, wrapped for a CYCLICAL category axis.
> Cross-ref: `checkRadialBarConformance` (`skills/chart-native/src/core/conformance.ts:745`).

A radial bar plots one value per category as a bar growing **outward from a baseline circle**,
categories arranged around the circle instead of along a line. It answers the same "how big" question
as a plain bar, but ONLY earns the extra visual cost when the category axis itself is **cyclical** —
hours of the day, months of the year, days of the week, compass points — so wrapping it into a circle
lets the reader see the *cycle* (e.g. the two commute peaks of a 24-hour day) at a glance, the way a
straight axis cannot.

## When to use / when NOT — read the caveats first

- **Use** for: a magnitude per category where the categories form a natural CYCLE and that
  cyclicality is part of the story — trips per hour-of-day (the two commute peaks), sales per
  month-of-year (the holiday spike), wind observations per compass direction.
- **Not** for: a non-cyclical ranking or magnitude comparison ("biggest to smallest", "revenue by
  region") — that is a plain **bar** (`bar.md`), which lets bar LENGTHS be compared directly on a
  shared baseline; a radial layout only adds distortion with no narrative payoff there.
- **Not** for: precise value comparison between two bars far apart around the circle — the eye is
  much worse at comparing chord lengths / angles than it is at comparing bars on a line. If exact
  ranking matters more than the cycle, use a bar.
- **Not** for: many non-adjacent categories where you need to read exact differences — reserve the
  radial bar for the "shape of the cycle" read, not a data-lookup task.

## Correctness "de base" (radial-bar-specific)

1. **Baseline MUST be 0** — exactly like the cartesian bar, radial LENGTH (inner circle → bar tip)
   encodes value; a radial baseline that isn't the value-0 ring lies about magnitude the same way a
   truncated y-axis does on a cartesian bar. → `checkRadialBarConformance` fails any
   `radialBaseline !== 0`.
2. **Preserve the cyclical category order** — the mapper (`spec-to-config.ts`'s `radial-bar` case)
   passes CSV rows through UNSORTED: angle encodes the category's position in the cycle (hour 00
   through 23, Jan through Dec), so sorting by value would scramble the one thing a radial layout is
   for. This is the opposite default of a ranking bar, which sorts by value.
3. **A radial value axis (tick rings) is required** so lengths can be decoded — a bare radial shape
   with no rings turns "how big" into a guess. → `checkRadialBarConformance` fails `tickCount < 1`.
4. **One Okabe-Ito hue for the bars**, with at most a peak accent (a second Okabe-Ito hue on the
   tallest bar(s), e.g. the two commute-rush hours) to call out the headline moment — never a
   different colour per category (colour is not free real estate here; the cycle position already
   encodes the category via angle).
5. **Rim category labels + haloed value-tick labels** so both axes of the polar read — WHERE around
   the circle (the category) and HOW FAR out (the value) — are legible without a hover.

## data-to-viz caveats (credited)

- **Circular bars distort length perception**: a bar farther from the centre occupies more visual
  area and reads as "bigger" even at an equal value to a bar nearer the centre, because the same
  radial increment sweeps more arc length the farther out it sits. (data-to-viz:
  `caveat/circular_barplot_accordeon.html`.)
- **The radial (y) axis itself compresses near the centre and stretches near the rim**: an identical
  numeric step covers less visual distance near the baseline circle than near the outer edge, biasing
  the read toward outer bars. (data-to-viz: `caveat/circular_bar_yaxis.html`.) This is *why* rule 1
  (baseline-0) and rule 2b (visible tick rings) are non-negotiable — without a decodable radial axis,
  this built-in distortion has nothing to anchor it back to real values.
- Net guidance: reach for a radial bar only when the CYCLE is the story; when precise comparison
  matters more than the cycle shape, a plain bar sidesteps this distortion entirely.

## Motion grammar (how a radial bar *builds*)

See `formats/video.md`; the gesture:

- the baseline circle + tick rings fade in first (the radial value axis, established before any bar
  moves);
- each bar **grows outward from the baseline circle to its full radial length**, eased-out, staggered
  clockwise around the circle (the reading order of a clock face);
- rim category labels and haloed value-tick labels fade in with the chrome.
A bar's angular position is fixed by its category (cyclical order, never re-sorted); only its radial
length animates, so frame N is a pure function of the frame.
