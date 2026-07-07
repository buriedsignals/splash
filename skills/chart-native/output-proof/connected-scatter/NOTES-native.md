# connected-scatter — render-verify notes (Task 4, Native Batch 1)

**Spec:** `spec-native.json` — 9 rows, `year,unemployment,inflation`, 1980–2020, row order = year ascending (NOT sorted by any measure).

**Produce:**
```
bun skills/chart-native/scripts/produce-from-spec.mjs \
  skills/chart-native/output-proof/connected-scatter/spec-native.json \
  skills/chart-native/output-proof/connected-scatter static
```
`[produce connected-scatter] conformance: OK (0 violations).`

**Visual check (`static.png`):**
- Path traces the points in the exact CSV row order (1980 → 1985 → 1990 → 1995 → 2000 → 2005 → 2010 → 2015 → 2020), confirmed by manually walking each segment's endpoint coordinates against the source rows. The path is NOT monotonic in x or y — it zigzags (e.g. 1980 at unemployment≈7.1 down to 1985 at ≈7.2/inflation≈3.6, then left-up to 1990 at ≈5.6/5.4, etc.), which is the expected shape for real 1980–2020 unemployment/inflation data and is inconsistent with any accidental x- or y-sort. This is the strongest evidence `numericColumns.filter(c => c !== labelCol)` correctly excluded `year` from the measure candidates and that `rows` was passed through unsorted.
- Both axes are titled: x-axis "unemployment" (bottom), y-axis "inflation" (rotated, left) — required since `ConnectedScatterConfig` has no optional axis labels.
- Start point (1980) and end point (2020) are labelled directly on the plot at their correct coordinates.
- Title/subtitle/source render correctly; no baseColor override used (default Okabe-Ito blue accent).

**Conclusion:** mapper behaves as specified — `labelField=year` (ordering key, excluded from measures), `xField=unemployment`, `yField=inflation` (first two non-label numeric columns in header order), row order preserved.
