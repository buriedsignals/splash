# Map Locator / Markers Type — Design

**Date:** 2026-07-02
**Status:** Approved (design phase)
**Depends on:** the map-native engine (choropleth exemplar, proportional-symbol sibling, route, all
three video formats, ScrollyStory, `resolveMapStyle` capability).

## Goal

Add the **locator / markers** map type to `map-native`: a map that **situates places** with
markers + labels + optional annotations, rather than encoding a magnitude. It is the sibling of
proportional-symbol but with **no value-by-size encoding** — a marker says *where*, and optionally
*what category*, not *how much*.

Per the engine's standing principle, the locator ships in **all six formats**, exactly like
choropleth/symbol: static · interactive (free-nav) · interactive scrolly · video reveal · video
storytelling · video scrolly. (This supersedes the old `SKILL.md` roadmap row that marked locator
Static+Interactive only — that table row is refreshed as part of this work.)

The type covers **both regimes** — few richly-annotated places AND many categorized points — and the
AI selects per the article. This is "capability, not a default": the full option space is built;
the config/AI picks.

## Non-goals

- No value-by-size encoding (that is proportional-symbol; a locator marker is uniform-size).
- No new furniture/format machinery — reuse `MapFrame`, `resolveMapFrame`, the bounds/fit logic,
  the reveal/story/scrolly video pipeline, and `resolveScene`.
- No clustering in the static/video renders (clustering is an interactive-only affordance).

## Encoding model

A locator marker:

```ts
interface LocatorMarker {
  lon: number;
  lat: number;
  label: string;          // place name — REQUIRED (direct labels mandatory; never hover-only)
  category?: string;      // optional — drives colour (+ optional icon) and the legend
  note?: string;          // optional annotation prose (hover popup / video caption / static callout)
  priority?: number;      // optional — higher = kept first when labels declutter (default: 0)
}
```

- **Glyph** — one marker style per map, chosen by `config.markerStyle ∈ { "dot" | "pin" | "icon" }`
  (default `"dot"`):
  - `dot` — small filled circle, **uniform radius** (a fixed px size, NOT value-scaled).
  - `pin` — teardrop map pin.
  - `icon` — a named glyph per category from a curated, CVD-distinguishable icon set.
- **Category** — optional. When any marker has a `category`:
  - colour comes from the CVD-safe qualitative palette (reuse `QUALITATIVE` from `route-geo.ts`,
    cycling), keyed by category;
  - a **category legend** (swatch/icon + label per category) replaces the size-legend;
  - with `markerStyle: "icon"`, each category maps to an icon.
  When no marker has a category → a single accent colour, no legend.
- **Note (annotation)** — optional. Surfaced as: interactive hover popup (label + category + note);
  video/scrolly caption (the note becomes the beat/step caption, reusing the route
  `territories[].note → caption` pattern); static callout for the few-annotated regime.

## Labels & declutter (`locator-labels.ts`, pure core)

Direct labels are mandatory (conformance), as for symbol. The current engine relies solely on
MapLibre's native declutter (`text-allow-overlap:false` + `text-optional:true`), which **silently
culls** labels when points cluster — a known weakness. The locator replaces this with a
**deterministic priority declutter**:

- Markers (glyphs) are **always drawn**; only labels declutter.
- Labels are placed in descending `priority` order (ties broken deterministically by label text,
  then index). A label is suppressed only when its box **actually collides** with an
  already-placed label's box — never randomly, never silently by the SDK.
- **Static / video:** a computed label set (top-priority, collision-free) is rendered; suppressed
  markers keep their glyph. An optional `maxLabels` cap bounds the static label count.
- **Interactive (free-nav):** at low zoom, nearby markers **cluster** into a count bubble that
  expands on zoom-in; at high zoom the priority declutter applies. Clustering is interactive-only.

`locator-labels.ts` exports the pure declutter: `placeLabels(markers, boxes, opts) → { shown:
string[]; hidden: string[] }` — deterministic, unit-tested, framework-free. It is written so
proportional-symbol can adopt it later (shared improvement).

## Formats — all six, in two slices

### Slice A — type core + static + interactive
- `locator-geo.ts` (pure geo-core), `LocatorMap.tsx` (static + interactive, `progress`-driven like
  `SymbolMap`), `locator-labels.ts` (declutter), validation, conformance, KB doc, mount + produce +
  Root wiring for static/interactive + interactive scrolly, tests, audit case. Render-verify a
  few-annotated sample AND a many-categorized sample.

### Slice B — video (reveal · storytelling · scrolly)
- `deriveLocatorStory(markers, meta, opts) → Beat[]`: title → establish (all markers in view) →
  reveal per place (few-regime: one beat per place with its note; many/categorized-regime: one beat
  per **category** group, or top-N by priority, capped like symbol's `maxReveals`) → takeaway.
- Reveal: markers drop/fade in (progress ramp, like `SymbolReveal`).
- Storytelling: guided-tour camera flying to each place/category with its note as the caption.
- Scrolly-video: the ScrollyStory captured, via the shared scrolly pipeline (`mapStoryToChapters`
  or a locator converter mirroring `routeStoryToChapters`).
- All three sizes (landscape/square/portrait), `calculateMetadata` for duration.

### mapStyle capability
Locator supports AI-selected `dataviz-light` / `dataviz-dark` via `resolveMapStyle` (as route does),
adapting glyph/label/legend colours per style. Validated in `validateLocatorConfig`.

## Architecture / files (the recipe)

**Slice A — create:**
- `src/locator-geo.ts` — pure core: parse markers, compute bounds (marker bbox, Mercator-clamped),
  resolve category → colour map, resolve glyph mode, build the legend model.
- `src/locator-labels.ts` — pure declutter (`placeLabels`), label offset helper.
- `src/LocatorMap.tsx` — static + interactive React component (MapTiler harness, glyph layer,
  label layer with declutter, category legend, hover popup, clustering for interactive, mapStyle).
- `knowledge/references/map/types/locator.md` — KB type doc.
- `tests/locator-geo.test.ts`, `tests/locator-labels.test.ts`.

**Slice A — modify:**
- `src/validate-config.ts` — `validateLocatorConfig` (+ `LocatorConfigShape`).
- `src/conformance.ts` — `checkLocatorConformance` (composes the global L0 guard; requires direct
  labels + a category legend when categories are present; forbids a size legend; mapStyle valid).
- `src/mount.tsx` — dispatch `config.type === "locator"` → `<LocatorMap>`.
- `scripts/produce.mjs` — locator format branch (static + interactive + scrolly in Slice A; video
  kinds added in Slice B).
- `scripts/audit-cases.mjs` — a locator audit case.
- `skills/map-native/SKILL.md` — refresh the roadmap row (locator → all formats) + document the type.

**Slice B — create/modify:**
- `src/locator-story.ts` — `deriveLocatorStory` (+ a locator→ScrollyStory converter if needed).
- `src/components/LocatorReveal.tsx`, `LocatorStory.tsx`, `LocatorScrolly.tsx` (or fold into the
  existing reveal/story/scrolly components if they generalize cleanly).
- `remotion/src/Root.tsx` — register the locator video compositions (3 sizes each).
- `scripts/produce.mjs` — add reveal/story/scrolly kinds for locator.
- KB `formats/*` notes + tests + render-verify (2 types × 3 sizes per format).

## Error handling & edge cases

- Empty `markers` / a marker missing `lon`/`lat`/`label` → validation error (block).
- `markerStyle: "icon"` with markers that have no `category` → validation error (icon mode needs a
  category to pick an icon) or fall back to a default icon; **decision: fall back to a default
  marker icon and warn** (don't block).
- All markers same category → still draw the legend (1 entry) — not an error.
- Many markers with no `priority` → declutter ties broken deterministically (label text, then
  index); no random culling.
- Mercator-unsafe latitudes → clamp bounds to ±85 (reuse existing clamp).
- Frame-determinism (Slice B): pure `f(frame)`, `delayRender→jumpTo/setData→map.once("idle")→
  continueRender`, `--gl=angle --concurrency=1`.

## Testing

- `locator-geo.test.ts` — bounds, category→colour map (CVD palette cycling, stable), glyph
  resolution, legend model (present iff categories present).
- `locator-labels.test.ts` — `placeLabels` determinism: same input → same shown/hidden; higher
  priority kept on collision; no collision among shown boxes; ties broken deterministically.
- `checkLocatorConformance` — requires labels; category legend present when categories present;
  no size legend; valid mapStyle; title/description/source (global L0).
- Render verification — Slice A: few-annotated + many-categorized samples, static + interactive,
  light + dark mapStyle; Slice B: reveal/story/scrolly × 3 sizes, stills at key frames.

## Global constraints

- Runtime **Bun** always (never npm/node); tests `bun test`.
- Code, comments, commits, branch names in **English**.
- **No** Claude/Anthropic mention, **no** `Co-Authored-By`, **no** Claude-Session trailer in any
  commit / PR / file / README / doc.
- MapTiler key in `atelier/.env` (gitignored) — never commit/log the value.
- Reuse existing building blocks (MapFrame, bounds/fit, reveal/story/scrolly pipeline,
  `resolveScene`, `resolveMapStyle`, `QUALITATIVE` palette); do not fork them.
- Frame-deterministic Remotion for Slice B (no `Date.now`/`Math.random`/argless `new Date()`).
