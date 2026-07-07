# Render-verify — radial-bar (Task 3, Native Batch 3)

## Spec

`spec-native.json` — `hour,trips` CSV, 24 rows (hour 00→23, the shipped sample dataset's own weekday
bike-share telemetry), two commute peaks (08:00 = 392 trips, 17:00 = 371 trips). Cyclical hour-of-day
category, matching the type's "use ONLY for cyclical categories" rule.

## Produce

```
bun scripts/produce-from-spec.mjs \
  /Users/rmdms/Sites/Professional/atelier/skills/chart-native/output-proof/radial-bar/spec-native.json \
  /Users/rmdms/Sites/Professional/atelier/skills/chart-native/output-proof/radial-bar static
```

```
[produce radial-bar] conformance: OK (0 violations).
```

Mapper picked `hour` as `categoryField` (first column) and `trips` as `valueField` (sole numeric
column beyond `hour`); all 24 rows passed through in CSV order (hour 00→23) — confirmed by the
mapper test (`tests/spec-to-config-radial-bar.test.ts`) that rows are NOT re-sorted by value.

## Visual observations (Read of `static.png`)

- **24 bars around the circle in cyclical category order** — rim labels read 0, 3, 6, 9, 12, 15, 18,
  21 clockwise from the top (every 3rd hour, `step = ceil(24/8) = 3`), matching a clock face; row
  order (00→23) survives untouched, exactly what the no-sort mapper guarantees.
- **Baseline 0 at the centre**: every bar starts at the same inner hole (the baseline circle) and
  grows outward — no bar starts partway out, consistent with `radialBaseline: 0` in the guard.
  `checkRadialBarConformance` passed with 0 violations.
- **Two peaks accented orange, everything else blue**: the 06:00–09:00 morning-rush bars and the
  17:00–18:00 evening-rush bar stand out in orange (`PEAK_COLOR = OKABE_ITO.orange`) against the
  uniform blue (`BASE_COLOR = OKABE_ITO.blue`) of the other 22 hours — visually confirms "twice a
  day" from the title.
- **Value-tick rings + rim labels legible**: concentric grey rings at 100/200/300/400/500 with
  haloed value labels along the straight-up spoke, and bold black hour labels just outside the bars
  — both radial-axis reads are legible without hovering.
- **Title unclipped**: "Hire bikes peak twice a day — the commute rush" renders on one full line, no
  truncation; subtitle "trips per hour (weekday average)" and source "Riverton cycle-share
  telemetry" both render clearly.

## Note (cosmetic, not a defect)

`parseCsv` coerces the numeric-looking `"00"`/`"01"`/… hour strings to plain numbers (`0`, `1`, …),
so the rim shows `0` rather than `00` for the early hours. This reads fine on a clock-face layout (no
ambiguity) and is the shared CSV parser's existing, correct behaviour (not something this task's
mapper does) — no fix needed.
