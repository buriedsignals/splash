# Data rules

Consulted, not executed. `build-data.mjs` applies these mechanically where it can; everything
else is judgment a beat brief records before a craft skill draws anything. When this file and a
journalist's instruction disagree, the journalist decides — and DATA-NOTES.md records what was
decided.

## Rounding policy

- **The artifact carries full precision; only display rounds.** `data.json` never rounds a value.
  A chart that annotates "fell by a third" while its own data file says 912 → 604 must be able to
  prove both numbers. Rounding happens once, at render time, in the craft skill, and never
  compounds: round for display from the unrounded value, never from an already-rounded one.
- Round **for reading, not for summing**: percentages in an annotation may show one decimal while
  the underlying share keeps full precision; two displayed values that visibly disagree with each
  other by more than their rounding unit is a defect, not a convention.

## Null handling

- **A null is a fact about the world and stays a null.** Blank cells pass through as `null`;
  nothing replaces them — not zero (zero is a measurement), not the column mean, not the previous
  row's value (that is imputation, banned below).
- The receiving chart decides how a null reads: a gap in a line, a missing bar, a "no data"
  region. What it may never do is draw over the hole as if the series were continuous without
  saying so.
- A column that is mostly null is a question for the storyboard, not a default: if the frozen
  profile reports `missing` beyond a handful of rows, say so in the brief before choosing a chart
  type whose grammar hides absence.

## Aggregation honesty — no imputation

- `build-data.mjs` aggregates nothing. If a beat needs a total, an average, or a per-capita
  figure, the derivation is computed in the open — recorded in the beat's DATA-NOTES.md with its
  inputs — so a reader of the notes can recompute it.
- Never bridge a gap by invention: no carrying values forward across missing years, no smoothing,
  no interpolation inside the artifact. A trend line drawn through invented points is not a
  trend.
- Excluded rows are named, never silently dropped: if rows are left out of a chart (out-of-scope
  region, broken sensor year), DATA-NOTES.md's exclusions section says which and why. An
  exclusion nobody can see is indistinguishable from cherry-picking.

## Unit normalization

- Units live with the numbers until the axis names them: `rainfall_mm` stays millimetres in
  `data.json`, and the axis label carries "mm". Converting units inside the artifact multiplies
  the places a factor-of-ten error can hide for exactly one reader's convenience.
- If a conversion is genuinely required before charting (mixed sources in different units), it is
  a recorded derivation under the rule above — source column, target unit, factor — never a quiet
  edit to the values.
- Never mix units in one encoded channel: one scale, one unit, stated on the axis.
