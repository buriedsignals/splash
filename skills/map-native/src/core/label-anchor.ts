import * as turf from "@turf/turf";
import type { Feature, MultiPolygon, Polygon } from "geojson";

// Pole of inaccessibility — the most-interior point of a polygon (grid-sample, keep the point with
// the greatest distance to the boundary). Centroids get pulled toward edges on concave/crescent
// shapes and can fall outside the polygon; the pole never does. Ported from Tom's prep-geo.mjs to
// a runtime turf call. Pure.
export function poleOfInaccessibility(
  feature: Feature<Polygon | MultiPolygon>,
  opts: { samples?: number; nudge?: [number, number] } = {},
): [number, number] {
  const N = opts.samples ?? 46;
  const bb = turf.bbox(feature);
  // Boundary as line(s). polygonToLine → LineString (Polygon) or FeatureCollection (MultiPolygon);
  // pointToLineDistance needs a single (Multi)LineString feature, so normalize to a MultiLineString.
  const boundary = toBoundaryMultiLine(feature);

  let best: [number, number] | null = null;
  let bestD = -1;
  for (let i = 0; i <= N; i++) {
    for (let j = 0; j <= N; j++) {
      const lng = bb[0] + ((bb[2] - bb[0]) * i) / N;
      const lat = bb[1] + ((bb[3] - bb[1]) * j) / N;
      const p = turf.point([lng, lat]);
      if (!turf.booleanPointInPolygon(p, feature)) continue;
      // Compute minimum distance to any boundary line (pointToLineDistance only accepts LineString)
      let minD = Infinity;
      for (const lineCoords of boundary.geometry.coordinates) {
        const line = turf.lineString(lineCoords);
        const d = turf.pointToLineDistance(p, line);
        minD = Math.min(minD, d);
      }
      if (minD > bestD) {
        bestD = minD;
        best = [lng, lat];
      }
    }
  }

  // Degenerate polygon (too thin for the grid to catch an interior sample): fall back to
  // pointOnFeature, which is still guaranteed on the feature.
  if (!best) {
    const p = turf.pointOnFeature(feature);
    best = [p.geometry.coordinates[0], p.geometry.coordinates[1]];
  }

  const nudge = opts.nudge ?? [0, 0];
  return [best[0] + nudge[0], best[1] + nudge[1]];
}

function toBoundaryMultiLine(
  feature: Feature<Polygon | MultiPolygon>,
): Feature<import("geojson").MultiLineString> {
  const coords: number[][][] = [];
  const g = feature.geometry;
  const rings = g.type === "Polygon" ? [g.coordinates] : g.coordinates;
  for (const poly of rings) for (const ring of poly) coords.push(ring);
  return turf.multiLineString(coords);
}
