# Map Dot-Density Type — Design

**Date:** 2026-07-02
**Status:** Approved (design phase)
**Depends on:** the map-native engine (choropleth region-join + boundaries; symbol/locator point
rendering + declutter; reveal/story/scrolly pipeline; `resolveMapStyle`; the type-add recipe).

## Goal

Add the **dot-density** map type: one dot represents N units, scattered inside each region in
proportion to the region's value (e.g. 1 dot = 1,000 people, sprinkled across each department). It
shows *where the mass is* without the area-bias of a choropleth. Distinct from proportional-symbol
(size ∝ value at a point) and locator (place markers).

It covers **both regimes** — univariate (one value → monochrome dots) and multivariate (several
subgroup values per region → the region's dots split by category, coloured, à la "racial dot map").
The AI/config picks per the data. Per the engine's standing principle, dot-density ships in **all
six formats** (static · interactive free-nav · interactive scrolly · video reveal · video
storytelling · video scrolly).

## Non-goals

- No new furniture/format machinery — reuse `MapFrame`, bounds/fit, the reveal/story/scrolly
  pipeline, `resolveScene`, `resolveMapStyle`, the CVD `QUALITATIVE` palette.
- No per-dot semantics — a single dot is not individually meaningful; hover targets the region.
- No size-encoding — dots are uniform; magnitude is encoded by dot *count/density*, never radius.

## Data model & the two regimes

Config `type: "dot-density"`, reusing the choropleth region-join (`regionKey` + `rows` joined to
boundary features by a join key):

```ts
interface DotDensityConfig {
  type: "dot-density";
  regionKey: string;              // field in rows that matches the boundary join key
  boundaries: string;             // "world" | "fr-departments" | ... (slice-1: world)
  rows: Record<string, string | number>[];
  dotValue?: number;              // units per dot; auto-derived when absent
  // Univariate:
  valueField?: string;
  // Multivariate (presence of `categories` selects this regime):
  categories?: { field: string; label: string; color?: string }[];
  basemap: string;
  mapStyle?: string;              // AI-selected dataviz-light / dataviz-dark
  title: string;
  description?: string;
  source?: { name?: string; url?: string };
}
```

- **Univariate** — each region's dot count = `round(value / dotValue)`; dots one accent colour.
- **Multivariate** — for each category, that region's dot count = `round(value_cat / dotValue)`;
  dots coloured by category (CVD-safe `QUALITATIVE`, keyed by the sorted category order); a category
  legend is shown. `categories[].color` overrides the palette per category.
- **`dotValue`** — when absent, auto-derived so the **total** dot count hits a readable target
  (~4,000–6,000), rounded to a "nice" number (1/2/5 × 10ᵏ). The total is **capped** (~10,000) for
  performance/legibility; a config-supplied `dotValue` that would exceed the cap is honoured but
  warns. The legend states "1 dot = N units".

## Deterministic scatter (`dot-scatter.ts`, pure core)

The crux for frame-determinism (Remotion renders pure `f(frame)`; the scatter is computed ONCE, not
per frame, but must be identical every run):

- `scatterInPolygon(feature, nDots, seed) → [number, number][]`: a **seeded PRNG** (mulberry32,
  seed = a stable hash of the region key `+ category index`) drives **rejection sampling** inside
  the feature's bbox — a candidate `[lon, lat]` is kept iff `turf.booleanPointInPolygon` says it is
  inside. Same inputs → same points. No `Math.random`, no `Date.now`.
- **MultiPolygon** regions (island territories): dots are allocated to sub-polygons in proportion to
  their area, then scattered within each.
- A per-dot attempt cap (thin/sliver regions) with a centroid fallback if exhausted, so the function
  always returns exactly `nDots` points and never loops unbounded.
- Pure, framework-free, unit-tested (determinism across runs; every returned point lies inside the
  polygon; correct count).

## `dot-density-geo.ts` (pure core)

Joins rows→regions (reusing the choropleth join pattern), resolves `dotValue` (auto/override/cap),
allocates dot counts per region (and per category in the multivariate regime), and builds the legend
model + the scatter inputs. Produces the data the component turns into a GeoJSON dot source. Returns
`{ regions: {key, feature-ref, dotsByCategory}[], dotValue, categories, legend, bounds, hasCategories, capped }`.

## Rendering, legend, interaction

- **Dots** — a `circle` layer, fixed ~2px radius, `circle-color: ["get","color"]` (multivariate) or a
  single accent (univariate), no stroke (or a hairline). Region **outlines** drawn faintly for
  context (light line). Never a size legend.
- **Legend** — "1 dot = N units" plus category swatches (multivariate only). mapStyle-adaptive ink.
- **Interaction** — hover targets the **region** (a transparent region fill hit-layer): shows region
  name + value(s). A lone dot is never the hover target.
- **mapStyle** dark/light AI-selected via `resolveMapStyle`; dot/legend/outline colours adapt.

## Formats — all six, in two slices

### Slice A — type core + static + interactive
`dot-scatter.ts`, `dot-density-geo.ts`, `DotDensityMap.tsx` (static + interactive free-nav; dot layer
+ region hit-layer + legend + mapStyle), validation, conformance, KB doc, mount + produce + Root
wiring for static/interactive, tests, audit case, two samples (univariate + multivariate).

### Slice B — video (reveal · storytelling · scrolly) + interactive scrolly
`deriveDotDensityStory(geo, meta, opts) → Beat[]`: title → establish (all dots in view) → reveal the
**densest regions** (top-N by dots-per-area, capped) with a caption → takeaway. `DotDensityReveal`
(dots fade in — or fill in region-by-region), `DotDensityStory` (guided tour to the dense regions),
`DotDensityScrolly` (via MapScrolly dispatch). Interactive scrolly free via the shared
`deriveDotDensityStory → mapStoryToChapters` contract. All three sizes, `calculateMetadata` for
duration.

## Architecture / files (the recipe)

**Slice A — create:** `src/dot-scatter.ts`, `src/dot-density-geo.ts`, `src/DotDensityMap.tsx`,
`assets/sample-data/dot-density-uni.json`, `dot-density-multi.json`,
`knowledge/references/map/types/dot-density.md`, `tests/dot-scatter.test.ts`,
`tests/dot-density-geo.test.ts`.
**Slice A — modify:** `src/validate-config.ts` (`validateDotDensityConfig`), `src/conformance.ts`
(`checkDotDensityConformance`), `src/mount.tsx`, `scripts/produce.mjs`, `scripts/audit-cases.mjs`,
`SKILL.md` (roadmap row).
**Slice B — create/modify:** `src/dot-density-story.ts`, `src/components/DotDensityReveal.tsx`,
`DotDensityStory.tsx`, `DotDensityScrolly.tsx`, `remotion/src/Root.tsx`, `scripts/produce.mjs`,
`src/route-story.ts` (scrollyStepCount branch), `src/components/MapScrolly.tsx` (dispatch), KB
formats + roadmap.

## Error handling & edge cases

- Region in rows but not in boundaries → `unmatched` (warn), like choropleth.
- Region with a value but zero dots after rounding (value < dotValue/2) → 0 dots (fine; the region
  is genuinely near-empty at this dot value).
- Auto `dotValue` when all values are 0 / no data → validation error.
- A config `dotValue` that pushes total dots over the cap → honoured + warn (legibility caveat).
- Multivariate: a category field missing/NaN on a row → validation error.
- Mercator-unsafe latitudes → clamp bounds to ±85.
- Frame-determinism (Slice B): the dot GeoJSON is computed once and held; camera animates; no
  per-frame scatter; no `Date.now`/`Math.random`.

## Testing

- `dot-scatter.test.ts` — determinism (same seed/feature/n → identical points across two calls);
  every returned point is inside the polygon (`booleanPointInPolygon`); exact count returned;
  MultiPolygon allocation sums to n.
- `dot-density-geo.test.ts` — join correctness; `dotValue` auto-derivation hits the target order of
  magnitude + nice rounding; per-region (and per-category) dot allocation; cap flag; legend present
  iff multivariate.
- `checkDotDensityConformance` — region legend present when multivariate; "1 dot = N" legend present;
  bounds non-empty; title/description/source (global L0); valid mapStyle.
- Render verification — Slice A: univariate + multivariate samples, static + interactive, light +
  dark. Slice B: reveal/story/scrolly × 3 sizes, stills at key frames.

## Global constraints

- Runtime **Bun** always (never npm/node); tests `bun test`.
- Code, comments, commits, branch names in **English**.
- **No** Claude/Anthropic mention, **no** `Co-Authored-By`, **no** Claude-Session trailer anywhere.
- MapTiler key in `splash/.env` (gitignored) — never commit/log it.
- Reuse existing building blocks (choropleth join + boundaries, MapFrame, reveal/story/scrolly
  pipeline, `resolveScene`, `resolveMapStyle`, `QUALITATIVE`); do not fork them.
- Frame-deterministic Remotion (Slice B): no `Date.now`/`Math.random`/argless `new Date()`; the dot
  scatter is deterministic and computed once.
