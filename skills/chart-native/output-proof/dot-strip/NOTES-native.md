# Render-verify — dot-strip (Task 1, Native Batch 3)

## Spec

`spec-native.json` — `clinic,days` CSV, 21 rows, 3 clinics (Riverside/Northside/Harbour), 7 raw
wait-day observations each. Within-clinic spread is narrow (Riverside 3–7, Northside 9–13, Harbour
18–23) but the three clinics sit far apart, matching the title's claim
("Wait times vary far more between clinics than within them").

## Produce

```
bun scripts/produce-from-spec.mjs \
  /Users/rmdms/Sites/Professional/atelier/skills/chart-native/output-proof/dot-strip/spec-native.json \
  /Users/rmdms/Sites/Professional/atelier/skills/chart-native/output-proof/dot-strip static
```

```
[produce dot-strip] conformance: OK (0 violations).
```

Mapper picked `clinic` as `categoryField` (first column) and `days` as `valueField` (sole numeric
column); all 21 rows passed through RAW — `computeDotStripLayout` grouped them into 3 strips
(7 observations each), confirming the mapper does NOT aggregate.

## Visual observations (Read of `static.png`)

- **3 strips, one per clinic**, ordered Harbour / Riverside / Northside top→bottom — the geometry's
  default `spread-desc` sort (Harbour's 18–23 range has the widest spread, 5, edging out Riverside's
  and Northside's spread of 4 each), not CSV row order. Expected behaviour of
  `computeDotStripLayout`, unrelated to this task's guard/mapper wiring.
- **Dots per category showing spread**: each clinic renders 7 individual blue dots spread along the
  value axis — Riverside clustered ~3–7, Northside ~9–13, Harbour ~18–23. The between-clinic gaps are
  visually much larger than any one clinic's own spread, matching the title's claim.
- **A mean marker per category**: a black vertical tick sits inside each clinic's dot cloud at the
  correct position (Harbour ≈20.4, Riverside ≈4.9, Northside ≈11) — the neutral reference the
  guard's `hasSummaryMarker` requires.
- **Single blue hue**: every observation dot is the same Okabe-Ito blue (`DOT_COLOR`); the mean ticks
  and category labels are neutral ink — no second data colour anywhere, consistent with
  `dotColor: OKABE_ITO.blue` in the guard.
- **Axes labelled**: category names (Harbour/Riverside/Northside) in bold ink along the left gutter;
  value-axis gridlines + tick labels (5/10/15/20) in muted grey along the bottom, with the `wait
  (days)` unit as the subtitle directly under the title — no unlabelled axis.
- **Title unclipped**: "Wait times vary far more between clinics than within them" renders on one
  full line with no truncation or overflow.
- **Legend**: "Mean" (tick) + "Individual pupil" (dot) at bottom-left, matching the component's
  built-in legend text.

## Concern found (not fixed — out of this task's scope)

`DotStripChart.tsx` hardcodes the word **"pupil"** in the per-point tooltip/aria-label
(`"${count} pupils, …"`) and in the static legend ("Individual pupil") — a leftover from the
component's original school-exam sample dataset. For a non-education dataset (here, clinic wait
times) the legend literally reads "Individual pupil" next to a wait-times chart, which is
semantically wrong. This is cosmetic only (not caught by `checkDotStripConformance`, no
conformance/a11y impact) and touching `DotStripChart.tsx` was not part of this task's file list —
flagging for a follow-up fix (make the noun a `DotStripConfig` field, e.g. `unitNoun`, defaulting to
something generic like "observation").
