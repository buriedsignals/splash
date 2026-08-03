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

// A TopoJSON topology, structurally — not trusted from a declared `encoding` field (a
// journalist's declaration can be wrong; this guard checks the actual shape of the parsed
// JSON, the same discipline the rest of this file already applies to coordinates). Only the
// parts this guard needs to decode positions from.
export type TopoJsonTopology = {
  type: "Topology";
  arcs: number[][][];
  transform?: { scale: [number, number]; translate: [number, number] };
  objects: Record<string, unknown>;
};

function isTopology(x: unknown): x is TopoJsonTopology {
  return (
    typeof x === "object" &&
    x !== null &&
    (x as { type?: unknown }).type === "Topology" &&
    Array.isArray((x as { arcs?: unknown }).arcs)
  );
}

// Every real coordinate a Topology can carry, decoded to [x, y]. A Topology has no
// `.coordinates` field at all — its geometries reference `arcs` by index instead — which is
// exactly why the range walk below silently found nothing before this fix: it inspected
// `.coordinates` on the topology object itself (undefined) and returned ok:true unconditionally,
// regardless of what CRS the file was actually in.
//
// Two source of positions, decoded the same way `topojson-client`'s own transform.js does
// (verified against that library's source, not hand-derived from spec prose alone):
//   1. `topology.arcs` — every LineString/MultiLineString/Polygon/MultiPolygon in `objects`
//      references these by index; decoding every arc, unconditionally, is a superset of every
//      such geometry's positions regardless of which object references which arc, so there is
//      no need to resolve those references or handle reversed (negative) arc indices — winding
//      and connectivity are irrelevant to a magnitude check.
//   2. Point/MultiPoint objects — these store coordinates directly (not via arcs), quantized
//      the same way but as a single, freshly-reset position each time (topojson-client's
//      feature.js calls `transformPoint(p)` with no arc-position index, which resets the
//      running delta sum to zero).
// When `transform` is present, positions are quantized integers delta-encoded from the
// previous position WITHIN THE SAME ARC (the running sum resets at the start of each arc, and
// for each standalone point); absent a transform, positions are already the real coordinates,
// copied through unchanged.
function decodeTopologyPoints(topology: TopoJsonTopology): [number, number][] {
  const t = topology.transform;
  const points: [number, number][] = [];

  for (const arc of topology.arcs) {
    let x = 0;
    let y = 0;
    for (const pos of arc) {
      const dx = pos[0] ?? 0;
      const dy = pos[1] ?? 0;
      if (t) {
        x += dx;
        y += dy;
        points.push([
          x * t.scale[0] + t.translate[0],
          y * t.scale[1] + t.translate[1],
        ]);
      } else {
        points.push([dx, dy]);
      }
    }
  }

  const decodeStandalonePoint = (p: number[]): [number, number] => {
    const dx = p[0] ?? 0;
    const dy = p[1] ?? 0;
    return t
      ? [dx * t.scale[0] + t.translate[0], dy * t.scale[1] + t.translate[1]]
      : [dx, dy];
  };
  const walkObject = (o: unknown): void => {
    if (typeof o !== "object" || o === null) return;
    const type = (o as { type?: unknown }).type;
    if (type === "GeometryCollection") {
      const geometries = (o as { geometries?: unknown }).geometries;
      if (Array.isArray(geometries)) for (const g of geometries) walkObject(g);
      return;
    }
    if (type === "Point") {
      const c = (o as { coordinates?: unknown }).coordinates;
      if (Array.isArray(c) && typeof c[0] === "number")
        points.push(decodeStandalonePoint(c as number[]));
      return;
    }
    if (type === "MultiPoint") {
      const c = (o as { coordinates?: unknown }).coordinates;
      if (Array.isArray(c))
        for (const p of c)
          if (Array.isArray(p))
            points.push(decodeStandalonePoint(p as number[]));
      return;
    }
    // LineString/MultiLineString/Polygon/MultiPolygon reference arcs by index — already fully
    // covered by the arc decode above, nothing further to walk here.
  };
  for (const key of Object.keys(topology.objects))
    walkObject(topology.objects[key]);

  return points;
}

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
  geometry: GeoJSON.Geometry | GeoJSON.FeatureCollection | TopoJsonTopology,
): CrsVerdict {
  const outOfRange = (x: number, y: number): boolean =>
    Math.abs(x) > 180 || Math.abs(y) > 90;

  if (isTopology(geometry)) {
    for (const [x, y] of decodeTopologyPoints(geometry)) {
      if (outOfRange(x, y))
        return {
          ok: false,
          code: "coordinate-out-of-range",
          message:
            `coordinate ${x}, ${y} is outside the physical globe (|lon|<=180, |lat|<=90) — this is ` +
            `almost always a projected CRS mistaken for WGS84; re-export in EPSG:4326`,
        };
    }
    return { ok: true };
  }

  const geometries = flattenGeometries(geometry);

  for (const g of geometries) {
    const bad = walk((g as { coordinates?: unknown }).coordinates, ([x, y]) => {
      if (outOfRange(x, y)) return `${x}, ${y}`;
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
