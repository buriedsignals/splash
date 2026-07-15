# Render-verify: stacked-bar end-to-end (Task 1, Native Batch 2)

`spec-native.json` is a realistic `NativeSpec` (`nativeType: "stacked"`) with a 4-year × hydro/wind/solar
wide CSV, run through the full production path — `produce-from-spec.mjs` → `specToNativeConfig` (the new
`stacked` mapper) → `produce.mjs` (the new produce-time conformance guard, then build), using absolute
paths:

```
bun skills/chart-native/scripts/produce-from-spec.mjs \
  /Users/rmdms/Sites/Professional/splash/skills/chart-native/output-proof/stacked/spec-native.json \
  /Users/rmdms/Sites/Professional/splash/skills/chart-native/output-proof/stacked static
```

printed `[produce stacked] conformance: OK (0 violations).` before building — confirming the
`STACKED_SERIES_COLORS` palette (black/orange/skyblue, all Okabe-Ito), ink/muted text, and a
baseline-0 value domain all pass the new guard for this real data shape.

Verified by eye on `static.png`:
- **Segments sum per category**: the printed column totals match hydro+wind+solar exactly —
  2015 = 120+30+10 = 160, 2018 = 124+55+28 = 207, 2021 = 128+85+55 = 268,
  2024 = 131+112+92 = 335 — all four total labels on the chart match this arithmetic.
- **Baseline 0**: the y-axis starts at 0 (gridlines 0/50/…/350) and every stack visibly rises from
  the same zero line; no floating bars.
- **Legend in ink**: the bottom-left legend ("hydro", "wind", "solar") renders in the dark ink
  colour with matching coloured swatches in stack order (black square first, then orange, then
  sky-blue) — same order as the visual stacking (hydro at the bottom of each bar, solar at the top).
- **Okabe-Ito palette**: the three rendered segment colours are black (hydro), the Okabe-Ito
  orange `#E69F00` (wind), and Okabe-Ito sky-blue `#56B4E9` (solar) — matching
  `STACKED_SERIES_COLORS[0..2]` exactly, confirming the guard validated the SAME colours the
  component actually painted.
- **Title unclipped**: "Renewables now supply the biggest slice of the grid" renders in full on one
  line above the "TWh generated" subtitle, with no overlap or truncation; the source line ("Source:
  Ember, 2025 global electricity review") sits clear below the legend.

Not re-run for this task (out of scope per the brief, which asked for `static` only): interactive
hover screenshots at multiple widths and the three video renders. The produce log did capture one
interactive tooltip in passing (`hydro 120 TWh generated2015 · 75% of total`), consistent with the
`StackedBarChart.tsx` tooltip component and not a regression signal.
