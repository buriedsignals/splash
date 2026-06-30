# map-native — conformance parity (slice 2) — design

**Date:** 2026-06-30
**Status:** approved (brainstorming)
**Scope:** bring the maps engine's conformance guard to chart parity — extract a shared L0
(`checkGlobalMapConformance`), make the guard format-aware, and add the framing/legibility rules
that slice 1 (MapFrame) makes true by construction so they become ASSERTABLE. Pure logic, no renders.
Slice 2 of the 4-slice maps↔charts parity program (slice 1 MapFrame shipped; slices 3 verification
harness, 4 KB follow).

## Why

`skills/map-native/src/conformance.ts` works but is below chart parity in three ways the synthesis
identified: (a) the title/description/source/contrast block is copy-pasted verbatim inside both
`checkChoroplethConformance` and `checkSymbolConformance` (no shared L0 — a 3rd map type would paste
it a third time); (b) the guard is NOT format-aware, so it cannot check whether the title fits or
the source is present at a given canvas size — exactly the legibility failures the user hit; (c)
there are no framing rules at all. Chart-native solved this with `core/conformance.ts` (a global
`checkGlobalConformance` L0 + per-type L2) plus the `resolveFrame` framing it relies on. This slice
ports that structure.

## 1. `checkGlobalMapConformance` — the shared L0 (extraction + ALL-CAPS parity)

Extract the duplicated block into one function called by both per-type checks:

```ts
export function checkGlobalMapConformance(
  input: { title: string; description?: string; source: { name?: string; url?: string } },
  textColors: { text: string[]; bg: string },
): string[];
```

Rules (the existing five + one new for chart parity):
- `title.length < 12` → "title too short to be an insight".
- title matches `/^\d{4}(\s*[–-]\s*\d{4})?$/` → "title is a year range, not an insight".
- **NEW (parity with chart L0):** title is ALL CAPS (has letters and `title === title.toUpperCase()`) → "title is ALL CAPS — write it as a sentence".
- `!description?.trim()` → "missing description — a module must state what/when/where".
- `!source?.name?.trim()` → "missing source name"; `!source?.url?.trim()` → "missing source url".
- each `textColors.text` colour with `contrastRatio(t, bg) < 4.5` → the contrast violation string.

`checkChoroplethConformance` and `checkSymbolConformance` are refactored to call
`checkGlobalMapConformance(...)` first, then push ONLY their type-specific rules (legend, scale,
sizing, labeled, bounds, etc.). Behaviour is unchanged except the new ALL-CAPS rule (the existing
samples have sentence-case titles, so they still pass).

## 2. `checkMapFraming` — the format-aware framing/legibility check

```ts
export function checkMapFraming(input: {
  width: number;
  height: number;
  title: string;
  description?: string;
  hasSource: boolean;
  titleLines?: number; // default 2
}): string[];
```

Uses `resolveMapFrame(width, height, { titleLines, hasDescription })` (from slice 1) to assert the
frame is adequate for THIS canvas:
- **Title fits the width** at the scaled size: estimate `titlePx = title.length × frame.type.title × CHAR_W` (`CHAR_W = 0.55`, a conservative average glyph width in ems); if `titlePx > (width - 2 × INSET) × titleLines` → "title too long for the {w}×{h} frame — it overruns the title band" (catches a title that can't fit even wrapped to `titleLines`, especially on portrait). `INSET = 12`.
- **Title band reserved:** `frame.pad.top <= 0` → "no title band reserved" (a structural sanity check; `resolveMapFrame` guarantees a positive band, so this only fires if the frame is degenerate).
- **Source band reserved + source present:** `frame.pad.bottom <= 0` → "no source band reserved"; `!hasSource` → "source band empty — every format must cite the source" (this is the rule that catches the video-without-source regression at the format level).

Pure — depends only on `resolveMapFrame` + the input, no rendered geometry.

## 3. Wiring — format-aware per-type guards (back-compatible)

Both per-type functions gain an optional trailing field on their input (or a separate optional
param) `format?: { width: number; height: number }`. When `format` is present, the function runs
`checkMapFraming({ width, height, title, description, hasSource: !!source?.name })` and merges its
violations. When absent, behaviour is exactly as today (the existing test-time callers pass no
format, so they are unaffected — back-compat). The three Remotion compositions / web components can
later pass their exact dimensions to get the framing rules (the call-site wiring is a future concern;
this slice delivers the guard).

Decision: add `format?` as an optional FIELD on the existing `input` object of each per-type check
(not a new positional param) — keeps the two-arg `(input, textColors)` signature stable and avoids
breaking the existing call sites/tests.

## Data flow

```
checkChoroplethConformance(input{…, format?}, textColors)
  → checkGlobalMapConformance({title,description,source}, textColors)   // shared L0
  → choropleth-specific rules (legend, scale, regions, beats)
  → if (input.format) checkMapFraming({…input.format, title, description, hasSource})
  → concat all violations

checkSymbolConformance(input{…, format?}, textColors)  → same shape (symbol rules + framing)
```

## Testing

| Unit | Cases |
| --- | --- |
| `checkGlobalMapConformance` | conformant input → `[]`; each rule fires in isolation: short title, year-range title, **ALL-CAPS title**, missing description, missing source name, missing source url, low-contrast text colour |
| `checkMapFraming` | a normal landscape title → `[]`; a very long title on a portrait 1080×1350 → "title too long" violation; `hasSource:false` → source-empty violation; conformant portrait with a short title + source → `[]` |
| `checkChoroplethConformance` / `checkSymbolConformance` (regression + format) | existing positive + negative tests still pass (L0 now via the extracted fn); with `format` set + a too-long title → the framing violation appears; without `format` → behaviour identical to today |

Negative tests must isolate each rule (assert a discriminating substring, not just non-empty), per
the test-hygiene lesson.

## Task decomposition

1. `checkGlobalMapConformance` extraction + ALL-CAPS rule; refactor both per-type checks to call it; tests (the L0 negative tests + confirm the two per-type suites still green). Pure, TDD.
2. `checkMapFraming` + its tests (pure, TDD).
3. Wire the optional `format?` field into both per-type checks + tests (with-format fires framing, without-format unchanged).

## Out of scope (deferred)

- **Call-site wiring** — making the components/compositions actually CALL the guard with their
  dimensions at produce/render time. The guard stays test-time (as today, and as chart conformance);
  wiring it into `produce.mjs` is the shared "conformance at render" debt, tracked separately.
- **KB references** (`map/design-conformance.md`, `map/types/choropleth.md`) — slice 4.
- **Verification harness** (`snap-responsive.mjs`, `snap-a11y.mjs`) — slice 3.
- True rendered-overlap detection (projecting symbols to screen to check the title doesn't cover a
  specific feature) — the safe-area construction + the framing check are the chosen proxy; pixel-level
  overlap is out of scope.

## Global constraints (binding)

- **Bun only** — `bun`, `bun test`.
- **No Claude/Anthropic mention** in any file or commit message — no `Claude-Session:` trailer, no `Co-Authored-By: Claude`.
- **Code, comments, commit messages in English.**
- **Pure** — `conformance.ts` stays framework-free (no React/MapTiler imports); `checkMapFraming` may import only `resolveMapFrame` from `core/map-format`.
- **Back-compat** — existing two-arg call sites and tests must keep working unchanged (the `format?` field is optional).
