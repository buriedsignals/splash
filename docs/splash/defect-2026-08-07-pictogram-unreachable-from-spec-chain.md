# Defect — `pictogram` is built but unreachable from the spec chain (2026-08-07)

Found during a real `/using-splash` run (article: Heidi.news, JO Milan Cortina — run dir
`exports/jo-milan-cortina/`), where the journalist named « pictogramme » on the DIRECT branch.

## What is true, measured

- The component exists and is complete: `skills/chart-native/src/PictogramChart.tsx`,
  `InteractivePictogramChart.tsx`, and a pure geometry core `pictogram-geometry.ts`
  (`computePictogramLayout`, `iconFill`).
- `skills/chart-native/src/core/chart-walk.ts:177` declares `pictogram: sequenced(...)` — the walk
  registry knows the type.
- `skills/chart-native/scripts/audit-cases.mjs:47,158` carries a `pictogram.json` case.
- **But `MAPPERS` (`skills/chart-native/src/spec-to-config.ts:167`) has no `pictogram` key.**
  Enumerated at runtime, 27 keys: `bar beeswarm boxplot bullet bump connected-scatter diverging
  diverging-stacked dot-strip dumbbell fan grouped heatmap histogram line lollipop pie pyramid
  radial-bar scatter slope stacked stacked-area treemap violin waffle waterfall`.

Consequence: a `NativeSpec` with `nativeType: "pictogram"` throws `UnsupportedNativeType`
(`spec-to-config.ts:953`) → the native producer exits `FALLBACK_TO_DW` → and `dw-chart` has no
pictogram type either. **The type is offerable-looking and unproducible through the prose chain.**

## Why this is worth closing

The KB/prose surfaces disagree with the mechanism, which is the exact class the repo already
names (« une capacité que le moteur calcule et que le rendu jette »). `suggest-chart/SKILL.md`'s
"mapped native families" list is a hand-written prose copy of `MAPPERS` and is ALSO stale in the
other direction — it omits `radial-bar`, `dot-strip`, `connected-scatter` and `pictogram` while
`MAPPERS` carries the first three. Nothing compares the two.

## Shape of the fix (not done here — journalist run, no product-source edits)

1. Add a `pictogram` mapper to `MAPPERS` (category + value + `unitPerIcon`; the geometry core
   already takes exactly that shape). Note `computePictogramLayout` does **not wrap**: one row per
   category, `maxCols` = the longest row's icon count, so `unitPerIcon` must be chosen so the row
   stays countable (380 icons on one line renders ~2 px each).
2. Or, if the type is deliberately not offered through the prose chain, mark it so and have the
   offer say it, rather than leaving a built component with no route.
3. Either way: a parity test between `Object.keys(MAPPERS)` and the prose list in
   `skills/suggest-chart/SKILL.md`. This is the same missing-guard shape as the numbered-rule
   count in `skills/splash/SKILL.md` (already on the backlog): prose enumerating a mechanism with
   nothing comparing them.

## What the run did instead

Offered `waffle` (in `MAPPERS`, countable squares, `unit` names what one square represents) as the
honest substitute, with the withdrawal recorded in
`exports/jo-milan-cortina/candidates.json` (`tier: "withdrawn"`).
