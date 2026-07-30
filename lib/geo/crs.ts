// The CRS guard — a range check, never a bbox check, never a winding check. See D4 of the
// design spec for the measurements this shape is built against (6,188 projected CRS scanned;
// exactly 2 pass |x|<=180,|y|<=90; a range check alone cannot catch a bad-datum or a
// non-Greenwich meridian, which is why `crs` stays a DECLARED field, not an inference — that
// declaration is enforced one layer up, in lib/loop/init.ts (Task 8), not here).
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

export function coordinateRangeVerdict(
  geometry: GeoJSON.Geometry | GeoJSON.FeatureCollection,
): CrsVerdict {
  const geometries: GeoJSON.Geometry[] =
    geometry.type === "FeatureCollection"
      ? geometry.features
          .map((f) => f.geometry)
          .filter((g): g is GeoJSON.Geometry => g != null)
      : [geometry];

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
