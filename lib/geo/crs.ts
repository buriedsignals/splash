// The CRS guard — a range check, never a bbox check, never a winding check. See D4 of the
// design spec for the measurements this shape is built against (6,188 projected CRS scanned;
// exactly 2 pass |x|<=180,|y|<=90; a range check alone cannot catch a bad-datum or a
// non-Greenwich meridian, which is why `crs` stays a DECLARED field, not an inference — that
// declaration is enforced one layer up, in lib/loop/init.ts (Task 8), not here).
//
// Scope, found by Task 14: this guard is called ONLY on a journalist's DECLARED geography
// input (lib/loop/init.ts, slot "geography") — never on this repo's own shipped basemap
// assets. That is deliberate, not an oversight: the shipped `us-states.geojson` encodes
// Alaska's Aleutians past the antimeridian (lon down to -188.9) so the state stays one
// contiguous shape instead of splitting across the map, and this same range check would refuse
// that file. Wrapping those longitudes to satisfy the guard would split Alaska in two — exactly
// what the -188.9 encoding exists to prevent. A journalist's uploaded file and a shipped,
// curated basemap are different concerns: one is unvetted input worth refusing loudly outside
// the physical globe, the other is a known-good asset with a documented, intentional reason to
// sit outside it. See lib/geo/subset.ts's own tolerance-unit branch for where that asset is
// actually read.
export type CrsVerdict =
  | { ok: true }
  | { ok: false; code: "coordinate-out-of-range"; message: string };

function walk(
  coords: unknown,
  visit: (pt: [number, number]) => string | undefined,
): string | undefined {
  if (
    Array.isArray(coords) &&
    coords.length >= 2 &&
    typeof coords[0] === "number" &&
    typeof coords[1] === "number"
  ) {
    return visit(coords as [number, number]);
  }
  if (Array.isArray(coords)) {
    for (const c of coords) {
      const bad = walk(c, visit);
      if (bad) return bad;
    }
  }
  return undefined;
}

function flattenGeometries(
  geometry: GeoJSON.Geometry | GeoJSON.FeatureCollection,
): GeoJSON.Geometry[] {
  if (geometry.type === "FeatureCollection") {
    const result: GeoJSON.Geometry[] = [];
    for (const feature of geometry.features) {
      if (feature.geometry) {
        result.push(...flattenGeometries(feature.geometry));
      }
    }
    return result;
  }
  if (geometry.type === "GeometryCollection") {
    const result: GeoJSON.Geometry[] = [];
    for (const geom of geometry.geometries) {
      result.push(...flattenGeometries(geom));
    }
    return result;
  }
  return [geometry];
}

export function coordinateRangeVerdict(
  geometry: GeoJSON.Geometry | GeoJSON.FeatureCollection,
): CrsVerdict {
  const geometries = flattenGeometries(geometry);

  for (const g of geometries) {
    const bad = walk((g as { coordinates?: unknown }).coordinates, ([x, y]) => {
      if (Math.abs(x) > 180 || Math.abs(y) > 90) return `${x}, ${y}`;
      return undefined;
    });
    if (bad)
      return {
        ok: false,
        code: "coordinate-out-of-range",
        message:
          `coordinate ${bad} is outside the physical globe (|lon|<=180, |lat|<=90) — this is ` +
          `almost always a projected CRS mistaken for WGS84; re-export in EPSG:4326`,
      };
  }
  return { ok: true };
}
