# Histogram — native-flow render-verify (Task 2, Native Batch 1)

Spec: `spec-native.json` — 45 raw commute-duration observations (minutes), min 5 /
max 65 / median 22, single numeric column `minutes`. Produced via:

```
bun skills/chart-native/scripts/produce-from-spec.mjs \
  /Users/rmdms/Sites/Professional/atelier/skills/chart-native/output-proof/histogram/spec-native.json \
  /Users/rmdms/Sites/Professional/atelier/skills/chart-native/output-proof/histogram static
```

## Conformance

```
[produce histogram] conformance: OK (0 violations).
```

Passes before any build step — `checkHistogramConformance` (count axis starts at 0,
bin count 13 ∈ [3,50]) plus the inherited global checks (title-is-insight, Okabe-Ito
data colour, source name+url, WCAG contrast) all clean, with the resolved colours
correctly ignoring `config.baseColor` (not forwarded by the mapper, per
`resolveConformanceColors("histogram", …)`'s fixed-colour contract).

## Visual assessment (`static.png`, read by eye)

- **Distribution shape**: sensible and right-skewed — a tall cluster of touching
  bars in the 15–25 min bins (11 each), tapering through 25–45, then a thin,
  bumpy long tail out to 70 (small counts, incl. a 2-count bump at 60–65 from two
  nearby outliers). Reads as "most commutes are quick, a rush-hour minority runs
  long" — matches the title's claim.
- **Bars touch, no gaps** — correctly rendered as a continuum (histogram rule 2,
  not a bar chart with gaps).
- **Median line + label**: vermillion dashed line at x=22 with the label
  "median 22 min" directly above it. The label text renders in **black ink**
  (`COLORS.ink`), not vermillion — confirms the produce-time-fixed a11y bug
  (vermillion-as-text, 3.87:1 contrast) does not regress on this type. Label is
  fully inside the frame, not clipped, not overlapping the title/subtitle.
- **Title**: "Most commutes wrap up in well under half an hour, but a rush-hour
  tail drags past an hour" wraps cleanly to 2 lines, sentence case, fully inside
  the canvas — not clipped top or side.
- **Axis labelling**: x ticks at the bin edges (5, 10, 15 … 70) let a reader place
  any value; the "min" subtitle (from `valueUnit`, per the mapper's
  `unit: spec.valueUnit ?? spec.unit` preference) labels the variable's unit once,
  consistent with how the other native chart types caption their unit. Y ticks
  (0–10) label the count axis, baseline at 0.
- **Source**: "City Transit Authority, 2025 survey" rendered bottom-left, matching
  the spec's `source.name`.

No visual defects found. `interactive.png`/`.html` were also produced by the same
run (tooltip text sampled: "2 in 5–10 min") — not required by this task's render-verify
step, not deeply inspected, but confirms the interactive build path doesn't error
on this config either.
