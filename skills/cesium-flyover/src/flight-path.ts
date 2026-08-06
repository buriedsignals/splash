// Chaikin corner cutting turns a sparse route into a continuous curve. Repeated passes round
// direction changes into deliberate swerves instead of left-right heading bumps.
// Ported from the 3d-flyover reference skill (Buried Signals) — dependency-free on purpose.

export type LngLat = [number, number];

export const smoothFlightPath = (source: LngLat[], passes = 3): LngLat[] => {
  if (source.length < 2)
    throw new Error("Flyover path needs at least two points");

  // Keep adjacent longitudes continuous for routes that cross the antimeridian.
  const unwrapped: LngLat[] = [source[0]];
  for (let index = 1; index < source.length; index++) {
    const [lng, lat] = source[index];
    const previous = unwrapped[index - 1][0];
    let adjusted = lng;
    while (adjusted - previous > 180) adjusted -= 360;
    while (adjusted - previous < -180) adjusted += 360;
    unwrapped.push([adjusted, lat]);
  }

  let curve = unwrapped;
  for (let pass = 0; pass < Math.max(0, passes); pass++) {
    const next: LngLat[] = [curve[0]];
    for (let i = 0; i < curve.length - 1; i++) {
      const a = curve[i];
      const b = curve[i + 1];
      next.push(
        [a[0] * 0.75 + b[0] * 0.25, a[1] * 0.75 + b[1] * 0.25],
        [a[0] * 0.25 + b[0] * 0.75, a[1] * 0.25 + b[1] * 0.75],
      );
    }
    next.push(curve[curve.length - 1]);
    curve = next;
  }
  return curve;
};

const EARTH_RADIUS_KM = 6371;

export const haversineKm = (a: LngLat, b: LngLat): number => {
  const r = Math.PI / 180;
  const dLat = (b[1] - a[1]) * r;
  const dLng = (b[0] - a[0]) * r;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(a[1] * r) * Math.cos(b[1] * r) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
};

// Walk a path by ARC LENGTH, not by vertex index: unequal source spacing would otherwise
// turn into speed bumps in the camera motion.
export const makePathWalker = (path: LngLat[]) => {
  if (path.length < 2)
    throw new Error("Flyover path needs at least two points");
  const cumulative = [0];
  for (let i = 1; i < path.length; i++) {
    cumulative.push(cumulative[i - 1] + haversineKm(path[i - 1], path[i]));
  }
  const lengthKm = cumulative[cumulative.length - 1];
  const along = (km: number): LngLat => {
    const d = Math.max(0, Math.min(lengthKm, km));
    let i = 1;
    while (i < cumulative.length && cumulative[i] < d) i++;
    if (i >= cumulative.length) return path[path.length - 1];
    const segmentLength = cumulative[i] - cumulative[i - 1] || 1;
    const t = (d - cumulative[i - 1]) / segmentLength;
    return [
      path[i - 1][0] + (path[i][0] - path[i - 1][0]) * t,
      path[i - 1][1] + (path[i][1] - path[i - 1][1]) * t,
    ];
  };
  return { along, lengthKm };
};

// Initial bearing from a to b, in radians, 0 = north, clockwise (Cesium's heading convention).
export const bearing = (a: LngLat, b: LngLat): number => {
  const r = Math.PI / 180;
  const y = Math.sin((b[0] - a[0]) * r) * Math.cos(b[1] * r);
  const x =
    Math.cos(a[1] * r) * Math.sin(b[1] * r) -
    Math.sin(a[1] * r) * Math.cos(b[1] * r) * Math.cos((b[0] - a[0]) * r);
  return Math.atan2(y, x);
};
