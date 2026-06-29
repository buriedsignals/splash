# map-native — proportional symbol map (2nd map type) — design

**Date:** 2026-06-29
**Status:** approved (brainstorming)
**Scope:** add the **proportional symbol** map type to `map-native`, on the proven choropleth recipe
(pure geometric core → one React+MapTiler component driven by `progress` → static / interactive /
video → conformance guard). This is the **2nd map type** after choropleth; it forces extracting a
**point-based core** (lat/lon, no region join), generalising the recipe for every later point type
(dot-density, locator).

## Why

`map-native` ships only `choropleth` (the worked exemplar). The user decided to cover all MapTiler 2D
map types one at a time, like chart-native's type buildout. Proportional symbol is first: extremely
common in newsrooms (counts at places — cases, deaths, funding, magnitude by city) and architecturally
the right second type, because it splits the engine's "region-join core" from a new "point core" — the
same way chart-native's bar/scatter forced `core/` out of the line exemplar.

## What stays (reused verbatim from the choropleth recipe)

- **Tom's MapTiler+Remotion harness** — `HarnessCheck.tsx`, the per-frame
  `delayRender → setData/setPaintProperty → map.once('idle', continueRender) → triggerRepaint` gate,
  `interactive:false`/`preserveDrawingBuffer:true`, render flags `--gl=angle --concurrency=1`.
- **3-format derivation** — Vite static build + Playwright snapshot; `vite-plugin-singlefile` →
  one self-contained interactive HTML (pan/zoom/hover/legend, responsive); Remotion compositions for
  video (landscape / square / portrait).
- **Conformance pattern** — a per-type `check<Type>Conformance` composing on the global L0 guard
  (`conformance.ts`: `contrastRatio`, title-insight, furniture).
- **`produce.mjs` pipeline** — `produce.mjs <config.json> <outDir> [all|static]`.
- **Config-validation pattern** — a framework-free `validate<Type>Config` mirroring
  `validateChoroplethConfig` (errors block, warnings flag the furniture standard).

## What is new (the point-based core, distinct from region-join)

### `src/symbol-geo.ts` — pure, framework-free, tested

The geometric heart. No MapTiler, no React. Given the points and value column, it computes everything
the component and the conformance guard need:

```ts
export interface SymbolData {
  points: { lon: number; lat: number; value: number; label?: string }[];
}

export interface SymbolGeometry {
  // points sorted by value DESCENDING (large drawn first → small on top, never occluded)
  symbols: { lon: number; lat: number; value: number; label?: string; radius: number }[];
  maxRadius: number;          // px at progress=1, bounded (see conformance)
  legend: { value: number; radius: number }[]; // nested reference circles, "nice" values
  domain: [number, number];   // [min, max] of value
}

// radius is AREA-proportional: r = maxRadius * sqrt(value / maxValue).
// NEVER radius-proportional (r ∝ value) — that exaggerates large values quadratically.
export function symbolGeometry(data: SymbolData, maxRadius: number): SymbolGeometry;

// 3 "nice" reference values (max, ~mid, ~min rounded to 1 significant figure) for the
// nested-circle legend; deterministic.
export function legendStops(domain: [number, number], maxRadius: number): { value: number; radius: number }[];
```

Determinism: same input → same output (the harness renders frame-by-frame, so the core must be a pure
function — this is also why geocoding is out of scope, see below).

### `src/SymbolMap.tsx` — one component, `progress`-driven

- MapTiler basemap (`interactive:false` under Remotion; interactive web build enables pan/zoom).
- A GL **`circle` layer** whose `circle-radius` is data-driven per point; on each frame the radius
  interpolates `0 → radius(value)` via eased `progress`, with a slight **stagger by descending value**
  (biggest settles first), mutated inside the harness cycle (`setPaintProperty`/`setData`).
- Fill: a **single hue** (size IS the encoding), semi-transparent (~0.75) + a thin contrasting
  stroke (white or dark halo) for legibility over the basemap. Bivariate (size + colour) is deferred.
- Nested-circle **legend** rendered from `legendStops` (web overlay + baked into the video frame).
- `fitBounds` to the points' bbox (reusing the basemap-fit rule) so the symbols frame tightly.

### `src/conformance.ts` → `checkSymbolConformance`

Composes on the global L0 guard (title-insight, furniture, contrast). Symbol-specific checks:

```ts
export function checkSymbolConformance(
  input: {
    title: string;
    description?: string;
    source: { name?: string; url?: string };
    sizingMode: "area" | "radius";   // MUST be "area"
    hasLegend: boolean;
    legendStops: number;             // ≥ 2 reference circles
    maxRadiusPx: number;
    viewportMinPx: number;           // min(width, height) of the render
    pointsWithData: number;
    boundsNonEmpty: boolean;
    strokeContrast: number;          // stroke vs fill contrast ratio
  },
  textColors: { text: string[]; bg: string },
): string[];
```

Violations flagged: `sizingMode !== "area"` (radius-proportional sizing); `!hasLegend` or
`legendStops < 2`; `maxRadiusPx > viewportMinPx * CAP` (a symbol that swallows the map — `CAP ≈ 0.25`);
`pointsWithData < 1`; `!boundsNonEmpty`; `strokeContrast < ~2` (halo too faint to separate symbol from
basemap); plus the inherited title/description/source/text-contrast checks.

### `src/validate-config.ts` → `validateSymbolConfig`

Framework-free, mirrors `validateChoroplethConfig`. Errors block; warnings flag furniture.

```ts
export type SymbolConfigShape = {
  type: "symbol";
  points: { lon: number; lat: number; value: number; label?: string }[];
  basemap: string;
  title: string;
  description?: string;
  valueUnit?: string;
  source?: { name?: string; url?: string };
};

export function validateSymbolConfig(spec: unknown):
  | { ok: true; spec: SymbolConfigShape; warnings: string[] }
  | { ok: false; errors: string[] };
```

Errors: `points` empty/non-array; any point missing/`NaN` `lon`∉[-180,180], `lat`∉[-90,90],
`value` non-numeric or `< 0`; `basemap` empty; `title` < 12 chars or matches the year-range regex
`/^\d{4}(\s*[–-]\s*\d{4})?$/`. Warnings: missing `description`, missing `source.name`/`source.url`.

### `knowledge/references/map/types/proportional-symbol.md`

Best practices wired as the type's grounding (and the rationale the conformance guard enforces):
area-proportional (never radius), sort-descending + alpha for overlap, nested-circle legend with
"nice" reference values, single hue, bounded max size. Sourced: data-to-viz (bubble map), FT Visual
Vocabulary ("proportional symbol" in the SPATIAL group), Datawrapper symbol-map docs.

## Data flow

```
config.json { type:"symbol", points:[{lon,lat,value,label?}], basemap, valueUnit, title, description, source }
  → validateSymbolConfig         (block on bad coords/value/furniture-short title)
  → symbolGeometry + legendStops (scaleSqrt area sizing, sort desc, nested legend)
  → SymbolMap(progress)          (GL circle layer, eased radius reveal, stagger)
  → 3 derivations                (Vite static + singlefile interactive + Remotion video)
  → produce.mjs <config> <outDir> [all|static]
```

## Decisions (taken from best practices — not user knobs)

- **Coordinates: lat/lon in the config (v1).** The core must be a pure deterministic function of its
  inputs (frame-by-frame Remotion harness); a network geocode in the core would break determinism and
  add homonym ambiguity. Place-name geocoding is deferred (the `viznews-data-preparation` skill can add
  coords upstream).
- **Area-proportional sizing (`scaleSqrt`), never radius-proportional.** Perceptual best practice;
  enforced by `checkSymbolConformance`.
- **Overlap: sort descending + semi-transparent fill + contrasting stroke.** No de-overlap/dodge in v1.
- **Single hue.** Size is the encoding; bivariate size+colour deferred.

## Testing

| Unit | Cases |
| --- | --- |
| `symbol-geo.test.ts` | radius ∝ √value (not ∝ value); sort order descending; `legendStops` "nice" rounded values; determinism (same input → same output) |
| `validate-config.test.ts` | rejects lon/lat out of range, non-numeric/negative value, empty points, short/year-range title; warns on missing description/source |
| `conformance.test.ts` | **negative** cases prove the guard catches: `sizingMode:"radius"`, missing legend, `legendStops < 2`, oversize `maxRadiusPx`, faint `strokeContrast` |
| live e2e | produce static PNG + interactive (hover tooltip verified in-browser via Playwright — a PNG cannot show hover) + 3 mp4 (landscape/square/portrait) on a real case (e.g. EU city population, or earthquakes by magnitude); eyeballed across widths 360→1600 and on the margins; recorded in an e2e proof doc |

## Task decomposition (each = an independently testable deliverable)

1. `symbol-geo.ts` + tests (pure core).
2. `validateSymbolConfig` + tests.
3. `checkSymbolConformance` + negative tests.
4. `SymbolMap.tsx` + `produce.mjs`/Remotion wiring (static + interactive).
5. Video compositions (landscape/square/portrait) + live e2e proof, eyeballed.
6. `proportional-symbol.md` best-practice reference.

## Out of scope (deferred)

- **Place-name geocoding** (coords supplied in config for v1).
- **Bivariate** symbol (size + colour).
- **De-overlap / dodge / clustering** for very dense point sets (known v1 limit — noted, addressed
  later if a real case needs it).
- **Non-circular symbols** (squares, pictograms).
- **`suggest-visual` routing** to the symbol map ("counts at places → symbol map" Gate) — done in a
  grouped routing pass once 2–3 point types exist, to avoid repeating the wiring per type (mirrors how
  choropleth was built before the suggest-visual slices).

## Global constraints (binding)

- **Bun only** — `bun`, `bunx`, `bun test`. The single accepted exception is Remotion render via
  `bunx remotion` / its node toolchain, as already used by choropleth.
- **No Claude/Anthropic mention** in any file or commit message — no `Claude-Session:` trailer, no
  `Co-Authored-By: Claude`.
- **Code, comments, commit messages in English.**
- **MapTiler key via `.env` only** — never hard-code or log it.
- **Grounded conformance** — every guard rule traces to `proportional-symbol.md`; verify at render
  (eyeball each format at multiple widths + the margins), not just at the unit-test level.
