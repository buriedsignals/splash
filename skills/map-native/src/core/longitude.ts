// Antimeridian-aware longitude math — shared by every map story/geometry that frames
// a set of points. A naive [min-lon … max-lon] box tears apart any dataset that
// straddles the ±180° dateline (e.g. the Pacific Ring of Fire: Alaska −176.6°, Japan
// +142.4°, Chile −73.2°): min/max span ~343° and centre on ~−5° (Africa), so the map
// frames the EMPTY back-side of the globe with the data split at both frame edges.
// These helpers take the SHORT way around the dateline instead.

/** Minimal-arc longitude extent that stays on the short side of the antimeridian.
 * Returns `{ west, east }` where `east` may exceed +180 (UNWRAPPED) when the points
 * straddle the dateline, so `(west + east) / 2` lands on the data's true centre and
 * `east − west` is the true (minimal) span — never the ~360-minus-largest-gap naive
 * box. For a dataset that does NOT cross the dateline this reduces exactly to
 * `{ west: min, east: max }`. Pass the unwrapped bounds straight to MapLibre's
 * `cameraForBounds`, which reads longitudes in continuous (unwrapped) Mercator space. */
export function shortWayLongitudeExtent(lons: number[]): {
  west: number;
  east: number;
} {
  if (lons.length === 0)
    throw new Error("shortWayLongitudeExtent: no longitudes");
  const sorted = [...lons].sort((a, b) => a - b);
  const n = sorted.length;

  // The data occupies every arc EXCEPT the single largest gap between adjacent
  // longitudes (treating the list as circular, so the last→first gap wraps via +360).
  // The minimal bounding arc therefore begins at the point just AFTER that largest gap
  // and sweeps eastward around to the point just before it.
  let gapStartIndex = 0; // index of the first point after the largest gap
  let largestGap = -Infinity;
  for (let i = 0; i < n; i++) {
    const cur = sorted[i];
    const next = i + 1 < n ? sorted[i + 1] : sorted[0] + 360;
    const gap = next - cur;
    if (gap > largestGap) {
      largestGap = gap;
      gapStartIndex = (i + 1) % n;
    }
  }

  const west = sorted[gapStartIndex];
  let east = west;
  for (let k = 0; k < n; k++) {
    let lon = sorted[(gapStartIndex + k) % n];
    // Unwrap points that sit east of the dateline relative to `west` (they sorted to
    // the low end but belong at the high end of the minimal arc).
    if (lon < west) lon += 360;
    if (lon > east) east = lon;
  }
  return { west, east };
}

/** Normalise a longitude to the canonical [-180, 180) range. */
export function normalizeLongitude(lon: number): number {
  return (((lon + 180) % 360) + 360) % 360 - 180;
}

/** Wrap-aware longitude interpolation: lerp `from`→`to` along the SHORTER arc across
 * the antimeridian, returning a value normalised to [-180, 180). A camera panning
 * from Japan (+142°) to Chile (−73°) then crosses the ~145° of Pacific ocean between
 * them, not the ~215° the long way across Asia/Africa — so intermediate frames stay
 * over the data instead of fetching high-zoom tiles for the opposite side of the
 * globe (the antimeridian video-hang trigger). */
export function lerpLongitude(from: number, to: number, t: number): number {
  let delta = to - from;
  if (delta > 180) delta -= 360;
  else if (delta < -180) delta += 360;
  return normalizeLongitude(from + delta * t);
}
