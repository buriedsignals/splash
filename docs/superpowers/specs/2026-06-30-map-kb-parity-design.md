# map-native — KB parity (slice 4, final) — design

**Date:** 2026-06-30
**Status:** approved (brainstorming)
**Scope:** fill the two missing map KB layers so the maps engine's knowledge base reaches chart
parity — a global map `design-conformance.md` (mirror of the chart one) and a `choropleth.md` type
reference (mirror of the existing `proportional-symbol.md`). Pure documentation, no code, no renders.
Slice 4 (final) of the maps↔charts parity program (slices 1 MapFrame, 2 conformance, 3 harness all
shipped).

## Why

The chart KB is layered: a global `design-conformance.md` + per-type files under `chart/types/`
(35 of them). The map KB has only one file: `map/types/proportional-symbol.md`. It lacks the global
map conformance reference (the rules live in code and in `proportional-symbol.md` but not in a shared
KB doc) and the choropleth type reference (the choropleth is the worked exemplar engine type, yet has
no KB entry). This slice closes both, completing the parity program: every conformance rule the engine
enforces now traces to a sourced KB line, and both shipped map types have a type reference.

## 1. `knowledge/references/map/design-conformance.md` (NEW)

The global map checklist — the map equivalent of `knowledge/references/design-conformance.md`. Short,
sourced, and cross-referenced to the code that enforces each rule. Rules every produced map must
satisfy, across static / interactive / video:

1. **Title = the insight**, sentence case (not a label or a bare year range, not ALL CAPS).
2. **Description** present — states what / when / where.
3. **Source cited** — name + url.
4. **Contrast** WCAG ≥ 4.5:1 for furniture text.
5. **Legend required** — a map is undecodable without its colour/size key.
6. **No-data colour distinct** from the data ramp (a neutral grey), never a ramp colour.
7. **Framing / safe-area** — the title sits in a reserved band (never over the data), nothing leaves
   the frame, and furniture text scales per format (the `MapFrame` / `resolveMapFrame` guarantee).
8. **Direct labels** where the type supports them (e.g. proportional symbols carry name + value).

Each rule cites its source (data-to-viz, FT Visual Vocabulary, Datawrapper Academy, WCAG) and names
the code that enforces it: `checkGlobalMapConformance` + `checkMapFraming` in
`skills/map-native/src/conformance.ts`, `MapFrame`/`resolveMapFrame` in `src/core/`, and the
`snap-responsive`/`snap-a11y` harness. ≤ ~60 lines (matching the terse chart checklist style).

## 2. `knowledge/references/map/types/choropleth.md` (NEW)

The choropleth type reference, mirroring the structure of the existing `proportional-symbol.md`
(when-to-use → encoding rules with sources + conformance cross-refs → known limits → implementation
pointer). Content:

- **When to use:** a **rate / normalised value** over **areal regions** (share, density, index per
  capita) — the region boundary is the unit, colour encodes the value. **Not** for raw counts (use a
  proportional symbol — a choropleth of counts just re-draws population/area). **Not** for point data.
- **Sequential vs diverging ramp:** sequential for one-directional magnitude (low→high); diverging
  ONLY around a meaningful midpoint (e.g. above/below a national average, gain vs loss), with a neutral
  centre. CVD-safe ramps; monotonic luminance.
- **Bin count:** 3–7 classes; name the classing choice (quantile vs equal-interval) and that it changes
  the story — quantile balances ink, equal-interval preserves true magnitude gaps.
- **No-data colour:** a distinct neutral grey, never a value in the ramp; labelled in the legend.
- **Anti-patterns:** mapping raw counts (population/area artefact); unlabelled classing; the
  **area/projection bias** — large sparse regions dominate the eye regardless of their weight (note it;
  a proportional symbol or a cartogram is the mitigation, the latter deferred).
- **Conformance cross-ref:** the rules `checkChoroplethConformance` enforces (legend, ≥3 scale steps,
  bounds non-empty, regions-with-data, the shared L0 furniture).
- **Implementation pointer:** `skills/map-native/src/choropleth-geo.ts` + `ChoroplethMap.tsx`
  (+ `ChoroplethStory.tsx` for video), guarded by `checkChoroplethConformance`.

Sourced: data-to-viz (choropleth), FT Visual Vocabulary (SPATIAL group), Datawrapper Academy
(choropleth / classing). ≤ ~110 lines (matching `proportional-symbol.md`).

## Testing / verification

Docs only — verification is editorial:
- **Cross-reference check:** every rule in `map/design-conformance.md` and every conformance cross-ref
  in `choropleth.md` must name a rule that actually exists in `conformance.ts` (`checkGlobalMapConformance`,
  `checkMapFraming`, `checkChoroplethConformance`). Read the code and confirm each cited rule is real —
  no invented rules.
- **Source honesty:** cite sources by name; only include a URL if it is a well-known one you are
  confident about (data-to-viz.com, the FT chart-doctor GitHub, academy.datawrapper.de) — do not
  fabricate URLs.
- **Line budget:** each file within its stated budget; terse, no padding.

## Task decomposition

1. `map/design-conformance.md` (global checklist) — write + cross-check against `conformance.ts`.
2. `map/types/choropleth.md` (type reference) — write + cross-check against `checkChoroplethConformance` + `choropleth-geo.ts`.

(Two small independent docs; either could be one task, but a per-file split lets each be checked
against its mirror and its code cross-refs separately.)

## Out of scope (deferred)

- **Map format references** (`map/formats/` — video motion, interactive navigation for maps) — the
  shared `knowledge/references/formats/` already covers format SELECTION (incl. Gate 5 maps); map-specific
  motion/interaction refs are a smaller future add, not part of closing this parity gap.
- The **`proportional-symbol.md`** file already exists — not re-written here.
- The deferred **`snap-a11y` symbol grid-scan** resilience port (code, logged) — separate.
- Any code change — this slice is pure documentation.

## Global constraints (binding)

- **No Claude/Anthropic mention** in any file or commit message — no `Claude-Session:` trailer, no `Co-Authored-By: Claude`.
- **English.**
- **No fabricated URLs / no invented conformance rules** — every cross-ref must match real code; cite sources by name, URLs only when confident.
- **Mirror the existing docs' structure + terseness** (`design-conformance.md` for the global, `proportional-symbol.md` for the type ref).
- **Pure docs** — no code, no renders, no test changes.
