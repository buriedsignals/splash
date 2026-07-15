# Lollipop — native-flow render-verify (Task 3, Native Batch 1)

Spec: `spec-native.json` — 6 staff roles × median wait in days, `role,days` CSV,
`highlight: "Nurse"` (the headline subject, the longest wait). Produced via:

```
bun skills/chart-native/scripts/produce-from-spec.mjs \
  /Users/rmdms/Sites/Professional/splash/skills/chart-native/output-proof/lollipop/spec-native.json \
  /Users/rmdms/Sites/Professional/splash/skills/chart-native/output-proof/lollipop static
```

## Conformance

```
[produce lollipop] conformance: OK (0 violations).
```

Passes before any build step — `checkBarConformance` (the shared bar/lollipop
guard: valueDomain starts at 0, title-is-insight, Okabe-Ito data colour, source
name+url, WCAG contrast) is clean, with the resolved colours correctly ignoring
`config.baseColor` (not forwarded by the mapper — `LollipopConfig` has no
`baseColor` field, per `resolveConformanceColors("lollipop", …)`'s fixed-colour
contract).

## Visual assessment (`static.png`, read by eye)

- **Baseline 0**: every stem starts at the same left-edge x-position (the
  category axis, value 0) regardless of row value — a magnitude read, not an
  arbitrary-origin distortion. Confirms `computeLollipopLayout`'s `valueDomain`
  starts at 0 (the same invariant `checkBarConformance` enforces for bar).
- **Dots + stems, not bars**: each row is a thin line ending in a filled circle
  — clearly the lollipop mark, far less ink than a bar chart, easy to compare
  by dot position alone.
- **Direct value labels in ink**: every row's numeric value (31, 24, 12, 10, 9,
  6) is printed directly past the dot in **black ink** (`COLORS.ink`), never in
  the accent colour — matches the produce.mjs comment that the
  previously-known vermillion-as-text a11y bug (3.87:1 contrast) is fixed for
  this type; labels stay legible regardless of which row is highlighted.
- **Highlighted row emphasised by the MARK, not the label**: "Nurse" (31) is
  the only stem+dot rendered in Okabe-Ito vermillion; every other row (incl.
  its own value label "31") is in the same neutral blue/ink as the rest. The
  emphasis reads instantly by colour on the mark — not by a low-contrast
  colored label, which would fail WCAG and is exactly what the guard forbids.
- **Sorted desc, ranking reads top-to-bottom**: Nurse (31) → Healthcare
  assistant (24) → GP (12) → Pharmacist (10) → Dentist (9) → Optician (6),
  strictly decreasing top-to-bottom — a ranking chart, reads at a glance.
- **Title unclipped**: "Nurses wait longest of any staff group for a first
  appointment" fits on one line, fully inside the canvas, sentence case,
  states the insight (not just "Wait times by role").
- **Category label truncation**: "Healthcare assistant" renders as
  "Healthcare a…" (existing `truncate()` behaviour in `LollipopChart.tsx`,
  unrelated to this task) — truncated with an ellipsis inside the left
  margin, not overflowing off-canvas. Noted, not a defect introduced here.
- **Source**: "Source: NHS England, 2025 workforce health survey" rendered
  bottom-left, matching the spec's `source.name`.

No visual defects found. `interactive.png`/`.html` were also produced by the
same run (tooltip text sampled: "31 median wait (days) Nurse") — not required
by this task's render-verify step, not deeply inspected, but confirms the
interactive build path doesn't error on this config either.
