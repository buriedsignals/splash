// Shared choropleth fill paint — the SINGLE source of truth for how a choropleth
// layer is coloured, used by BOTH the interactive/video ChoroplethMap and the
// scrolly ScrollyMap so the two engines can never drift.
//
// The non-negotiable rule this encodes:
//   - regions WITHOUT data keep the DEFAULT basemap (opacity 0, no tint);
//   - only data-bearing regions are painted by the scale;
//   - the ocean/water is left to the basemap default (this module never touches it).
//
// Enriched-feature contract (built identically by both engines):
//   __hasData: boolean  — true when the region joined a data row
//   __value:   number|null — the joined value (null for no-data regions)

import { NO_DATA_COLOR } from "./theme/colors";

export interface ChoroplethBin {
  min: number;
  max: number;
  color: string;
}

// fill-color expression: no-data → NO_DATA_COLOR (never shown, opacity 0 hides it,
// but kept as a defined fallback), otherwise the bin colour for __value.
export function choroplethFillColor(bins: ChoroplethBin[]): unknown[] {
  const sorted = [...bins].sort((a, b) => a.min - b.min);
  const expr: unknown[] = [
    "case",
    ["==", ["get", "__hasData"], false],
    NO_DATA_COLOR,
  ];
  for (let i = 0; i < sorted.length - 1; i++) {
    expr.push(["<", ["get", "__value"], sorted[i].max]);
    expr.push(sorted[i].color);
  }
  expr.push(sorted[sorted.length - 1].color);
  return expr;
}

// fill-opacity expression: no-data regions are forced to 0 so the default basemap
// shows through (identical treatment to the ocean); data-bearing regions use the
// supplied resting opacity (a scalar, or later overridden by a reveal progress).
export function choroplethFillOpacity(dataOpacity: number): unknown[] {
  return ["case", ["==", ["get", "__hasData"], false], 0, dataOpacity];
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
