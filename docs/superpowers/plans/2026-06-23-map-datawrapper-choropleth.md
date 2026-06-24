# Plan — map-dw choropleth (first cut)

Spec: `docs/superpowers/specs/2026-06-23-map-datawrapper-design.md`
Branch: `feat/map-datawrapper` (from `main`). Build under `skills/map-dw/`. TDD, `bun:test`.
Reuse `dw-chart/src/datawrapper.ts`. Do NOT touch dw-chart / suggest-chart / suggest-article.

## Task 1 — `MapSpec` contract + `validateMapSpec` (TDD)
- `src/map-spec.ts`: `MapSpec`, `GradientStop`, `DEFAULT_BLUE`, `KNOWN_BASEMAPS` re-export not needed.
- `validateMapSpec(input)` → `{ok:true,spec,warnings} | {ok:false,errors}`.
- Tests `src/tests/map-spec.test.ts`: valid spec passes; missing key/value/basemap/title/alt fail;
  regionKey/valueColumn not in CSV → fail (key-bound); bad colorScale stop → fail; label-y title → warning.
- Gate: `bun test src/tests/map-spec.test.ts` green.

## Task 2 — `specToMapMetadata` (TDD)
- `src/spec-to-map-metadata.ts`: emit type + axes + visualize(basemap, map-key-attr, colorscale
  WITHOUT `stops` string, tooltip) + describe. Default to `DEFAULT_BLUE` when no colorScale.
- Tests: axes bound to columns; colorscale has `colors` and NO `stops` key (the black-trap guard);
  default blue applied; describe carries altInsight as aria-description.
- Gate: tests green.

## Task 3 — `produceMap` orchestrator
- `src/produce.ts`: import client from `../../dw-chart/src/datawrapper`. validate→create→setData→
  patch→publish→exportPng→return `{chartId,embed,pngPath,publicUrl}`.
- No unit test for the network path here (covered by live e2e in Task 5).

## Task 4 — eval `scoreMapSpec` (TDD, pure)
- `eval/basemaps.ts`: `KNOWN_BASEMAPS` allowlist.
- `eval/score.ts`: `scoreMapSpec(spec, expect)` → validates/basemapKnown/keyBound/conformanceOk/pass.
- `eval/cases/*.json`: ≥2 generic cases (EU countries, US states).
- `eval/tests/score.test.ts` + `eval/package.json`.
- Gate: `bun test` in eval dir green.

## Task 5 — live e2e (real API, the real gate)
- `src/tests/e2e.test.ts` (or a runner): `set -a; source /atelier/.env; set +a`; produce one real
  choropleth from a generic case; assert publicUrl + png bytes > 0; **export PNG and LOOK at it**
  (data bound, light→blue, not black). Save proof to `output-proof/`. Leave the chart PUBLISHED.

## Task 6 — SKILL.md + final verification
- `SKILL.md` canon 8 sections; choropleth; symbol/locator deferred.
- Run full repo test sweep: main's 46 + new map-dw tests all green.
- Commit task-by-task. Leave branch unmerged.
</content>
