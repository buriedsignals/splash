# Render-verify — beeswarm (Task 5)

## Spec

`spec-native.json` — `level,salary` CSV, 22 rows, 3 distinct `level` values
(Junior/Mid/Senior), salary in k$ with one senior outlier (310) to produce a
visible long tail.

## Produce

```
bun skills/chart-native/scripts/produce-from-spec.mjs \
  /Users/rmdms/Sites/Professional/splash/skills/chart-native/output-proof/beeswarm/spec-native.json \
  /Users/rmdms/Sites/Professional/splash/skills/chart-native/output-proof/beeswarm static
```

```
[produce beeswarm] conformance: OK (0 violations).
```

Mapper picked `level` as the category — there is only ONE text column in this
CSV (`level`, 3 distinct values ≤ 5 cap; `salary` is the sole numeric column,
so no second text column exists to become a per-point `label`).
`categories` = `["Junior","Mid","Senior"]`, matching the cardinality-heuristic
test case 2 in `tests/spec-to-config-beeswarm.test.ts`.

## Visual observations (Read of `static.png`)

- **3 category colours** rendered (Okabe-Ito blue=Junior, orange/gold=Mid,
  bluish-green=Senior), well under the ≤5 hard cap — legend at bottom-left
  spells out all 3 labels next to matching dot colours.
- **Swarm dodging works**: the tightly-packed Junior cluster (58–75, 7 points
  within a 17-unit range) is NOT collapsed into an overlapping blob — several
  of its dots are visibly nudged to a second row (slightly above/below the
  shared baseline) so every point stays distinguishable, exactly the
  "show your data, don't hide collisions" behaviour `beeswarm-geometry.ts`'s
  tangent-packing is meant to produce. Mid and Senior points are more spread
  out along the value axis so they sit on a single row with no collisions.
- **Long tail visible**: the Senior outlier (310) sits far right, isolated
  from the rest of the Senior cluster (118–168) — the title's "one senior
  outlier stretching the tail" claim is visually true in the render.
- **Value axis labelled**: gridlines + tick labels 100/150/200/250/300 run
  along the bottom, with the `annual salary (k$)` subtitle directly under the
  title giving the unit — no unlabelled axis.
- **Title, subtitle, source** all present and un-clipped: title wraps to 2
  lines cleanly, subtitle "annual salary (k$)", source line "Source: Levels
  2025 salary survey" bottom-left.
- No >5-category failure triggered (only 3 categories emitted) — confirms the
  cardinality heuristic chose the low-cardinality `level` column, not a
  hypothetical unique-per-row column, so `checkBeeswarmConformance`'s hard
  category cap was never at risk here.
