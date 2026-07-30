// Shared choropleth fill paint — the SINGLE source of truth for how a choropleth
// layer is coloured, used by BOTH the interactive/video ChoroplethMap and the
// scrolly ScrollyMap so the two engines can never drift.
//
// The non-negotiable rule this encodes:
//   - regions WITHOUT data keep the DEFAULT basemap (opacity 0, no tint);
//   - only data-bearing regions are painted by the scale;
//   - the ocean/water is left to the basemap default (this module never touches it).
//
// Feature-state contract (built identically by both engines, D5 + D8's second point — the
// join is applied via MapLibre `setFeatureState`, never merged into the geometry's own
// `properties`, so a licensed geometry's "Collective Database" boundary stays intact):
//   hasData: boolean  — true when the region joined a data row
//   value:   number|null — the joined value (null for no-data regions)

import { NO_DATA_COLOR } from "./theme/colors";

export interface ChoroplethBin {
  min: number;
  max: number;
  color: string;
}

// A feature whose join-key property is falsy (missing/null/""/0) never gets an entry in
// MapLibre's per-source feature-state table — the SDK's own setFeatureState/getFeatureState
// machinery is gated on `if (id && ...)`, so a falsy id is silently never promoted. Reading
// ["feature-state", "hasData"] on such a feature returns `null`, and a bare `["==", null,
// false]` evaluates to `false` — NOT the no-data branch. `["<", ["feature-state", "value"],
// n]` then compares `null` against a number, which MapLibre's evaluator catches internally and
// falls back to the property's OWN spec default — `#000000` (opaque black) for fill-color, the
// "has data" numeric branch for fill-opacity. Net effect: a feature with a falsy join key
// renders as an opaque black fill instead of invisible/no-data. Invisible on world.geojson
// (every iso_a3 is truthy) but real for sub-national geometry-anywhere datasets, which
// routinely carry null/blank/zero admin codes. `["boolean", <value>, <default>]` is the
// style-spec's own documented safe-read idiom: it evaluates <value>, and substitutes <default>
// when the value is missing/not-a-boolean — never throws, never falls through to the property
// spec's own default. Verified against the real bundled MapLibre expression evaluator (not
// just asserted) — see choropleth-paint-feature-state-safety.test.ts.
const SAFE_HAS_DATA = ["boolean", ["feature-state", "hasData"], false];
const SAFE_VALUE = ["number", ["feature-state", "value"], NaN];

// fill-color expression: no-data → NO_DATA_COLOR (never shown, opacity 0 hides it,
// but kept as a defined fallback), otherwise the bin colour for the feature-state value.
export function choroplethFillColor(bins: ChoroplethBin[]): unknown[] {
  const sorted = [...bins].sort((a, b) => a.min - b.min);
  const expr: unknown[] = ["case", ["==", SAFE_HAS_DATA, false], NO_DATA_COLOR];
  for (let i = 0; i < sorted.length - 1; i++) {
    expr.push(["<", SAFE_VALUE, sorted[i].max]);
    expr.push(sorted[i].color);
  }
  expr.push(sorted[sorted.length - 1].color);
  return expr;
}

// fill-opacity expression: no-data regions are forced to 0 so the default basemap
// shows through (identical treatment to the ocean); data-bearing regions use the
// supplied resting opacity (a scalar, or later overridden by a reveal progress).
export function choroplethFillOpacity(dataOpacity: number): unknown[] {
  return ["case", ["==", SAFE_HAS_DATA, false], 0, dataOpacity];
}

// The full fill-layer paint object — fill-color + no-data-aware fill-opacity.
export function choroplethFillPaint(
  bins: ChoroplethBin[],
  dataOpacity: number,
): Record<string, unknown> {
  return {
    "fill-color": choroplethFillColor(bins),
    "fill-opacity": choroplethFillOpacity(dataOpacity),
  };
}
