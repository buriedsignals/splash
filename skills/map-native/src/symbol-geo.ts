// Pure point-based core for the proportional symbol map — no MapTiler, no React.
// The render harness mutates state frame-by-frame, so every number a frame needs
// must come from a deterministic pure function (this file). Mirror of choropleth-geo
// for the point (lat/lon) case: no region join, sizing instead of binning.

export interface SymbolPoint {
  lon: number;
  lat: number;
  value: number;
  label?: string;
}
export interface SymbolData {
  points: SymbolPoint[];
}
export interface PlacedSymbol extends SymbolPoint {
  radius: number;
}
export interface LegendStop {
  value: number;
  radius: number;
}
export interface SymbolGeometry {
  symbols: PlacedSymbol[]; // sorted by value DESC
  maxRadius: number;
  legend: LegendStop[];
  domain: [number, number]; // [min, max]
  bounds: [number, number, number, number]; // [west, south, east, north]
}

// Area-proportional radius: a symbol's AREA (πr²) scales with value, so r ∝ √value.
// Radius-proportional sizing (r ∝ value) exaggerates large values quadratically — banned.
export function symbolRadius(
  value: number,
  maxValue: number,
  maxRadius: number,
): number {
  if (maxValue <= 0) return 0;
  return maxRadius * Math.sqrt(Math.max(0, value) / maxValue);
}

// Round to one significant figure — legend reference values read as "nice" numbers.
export function niceNumber(x: number): number {
  if (x <= 0) return 0;
  const mag = Math.pow(10, Math.floor(Math.log10(x)));
  return Math.round(x / mag) * mag;
}

// Nested-circle legend: largest + two smaller reference values, deduped, each ≥ 2 kept.
export function legendStops(
  domain: [number, number],
  maxRadius: number,
): LegendStop[] {
  const [, max] = domain;
  const candidates = [max, max * 0.4, max * 0.1].map(niceNumber);
  const seen = new Set<number>();
  const stops: LegendStop[] = [];
  for (const value of candidates) {
    if (value <= 0 || seen.has(value)) continue;
    seen.add(value);
    stops.push({ value, radius: symbolRadius(value, max, maxRadius) });
  }
  // Guarantee at least two stops even when nice-rounding collapses the candidates.
  if (stops.length < 2 && max > 0) {
    const half = niceNumber(max / 2) || max / 2;
    if (!seen.has(half) && half > 0)
      stops.push({ value: half, radius: symbolRadius(half, max, maxRadius) });
  }
  return stops;
}

export function symbolGeometry(
  data: SymbolData,
  maxRadius: number,
): SymbolGeometry {
  if (!data.points.length)
    throw new Error("symbolGeometry: no points — nothing to map");

  const values = data.points.map((p) => p.value);
  const min = Math.min(...values);
  const max = Math.max(...values);

  // Sort value-DESC for stable, deterministic order (legend + labels read the largest
  // first). NOTE: source-array order does NOT reliably control a MapLibre circle layer's
  // z-order — that is enforced separately by a `circle-sort-key` in SymbolMap so smaller
  // circles draw ON TOP (visible AND hoverable when nested inside a larger one). See the
  // symbol-circles layer + the `nearestSymbolIndex` hover pick below.
  const symbols: PlacedSymbol[] = [...data.points]
    .sort((a, b) => b.value - a.value)
    .map((p) => ({ ...p, radius: symbolRadius(p.value, max, maxRadius) }));

  const lons = data.points.map((p) => p.lon);
  const lats = data.points.map((p) => p.lat);
  const bounds: [number, number, number, number] = [
    Math.min(...lons),
    Math.min(...lats),
    Math.max(...lons),
    Math.max(...lats),
  ];

  return {
    symbols,
    maxRadius,
    legend: legendStops([min, max], maxRadius),
    domain: [min, max],
    bounds,
  };
}

// Hover hit-test for OVERLAPPING proportional symbols. Given the projected pixel
// centres of every symbol feature under the pointer and the pointer position, return
// the INDEX of the one whose centre is nearest. Overlapping circles share pixels, so
// the topmost-drawn feature is not necessarily the one the reader is pointing at — a
// small circle nested behind a larger one is unreachable if the handler just takes the
// front feature. Nearest-centre keeps every city reachable: sweep toward a city's
// centre and it wins. Pure (pixel maths only) so it is unit-tested without a browser.
// Returns -1 for an empty list.
export function nearestSymbolIndex(
  centers: { x: number; y: number }[],
  point: { x: number; y: number },
): number {
  let best = -1;
  let bestDist = Infinity;
  for (let i = 0; i < centers.length; i++) {
    const dx = centers[i].x - point.x;
    const dy = centers[i].y - point.y;
    const d2 = dx * dx + dy * dy;
    if (d2 < bestDist) {
      bestDist = d2;
      best = i;
    }
  }
  return best;
}
