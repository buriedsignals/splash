# Fan chart (forecast uncertainty) — per-type best practice (L2)

> Sources: FT Visual Vocabulary (the canon) — "change over time" with uncertainty · Bank of England
> inflation fan chart (the canonical form) · data-to-viz.com. credited.
> Inherits: `global/dataviz.md` (L0). A time-series with nested uncertainty bands.

A fan chart shows a forecast as a **central estimate plus nested confidence bands that WIDEN into the
future** — the "fan". It answers **"what's the projection, and how uncertain is it"**: the spread of the
fan IS the message, not just the central line.

## When to use / when NOT — read the caveats first

- **Use** for: a projection where the UNCERTAINTY is the story — economic forecasts, debt/population
  projections, scenario ranges. Pair a solid historical line with the widening forecast fan.
- **Not** for: a point forecast with no uncertainty — that's just a line; don't fake bands.
- **Not** for: many overlapping fans — they muddy; show one, or small-multiple them.
- **Not** for: implying false precision — the central line is one path among many; never label it as THE
  answer.

## Correctness "de base" (fan-specific)

1. **Bands NEST and WIDEN**: the 95% interval contains the 80% contains the 50%, and all widen with time
   from the present (zero width at "now"). → `checkFanConformance` (every hi ≥ central ≥ lo; outer ⊇ inner).
2. **Mark "now"** — the boundary between solid history and the forecast fan (a vertical rule + a note).
3. **One hue, tints by level** — the widest band lightest, narrowest darkest, central line solid; CVD-safe
   single Okabe-Ito hue. A note states the interval levels.
4. **Caption the value axis**; the history is a solid line, the central forecast a dashed/lighter line.

## data-to-viz caveats (credited)

- A fan chart is honest ONLY if the central line is read as one scenario among many — the eye latches onto
  it. Emphasise the SPREAD (the fan), keep the central line subordinate, and never quote it as a fact.

## Motion grammar (how a fan *builds*)

See `formats/video.md`; the gesture:

- a left→right wipe reveals the history line first, then the fan UNFOLDS as the wipe crosses "now" — the
  bands widen out of the present; the "now" rule and the axis fade in with the chrome.
The fan's silhouette is fixed by the layout; the wipe is a pure clip of progress, so frame N is a pure
function of the frame.
