/**
 * The pure half of the flow-map (route) beat: csv parsing, point-in-polygon, the ordered
 * territory-crossing computation, a point-on-feature anchor, and the cycling qualitative palette.
 * No browser, no rasteriser — same split as `twin-map-beat/assets/geo.ts` and
 * `map-quake-density/geo-hex.ts`, so this file can be imported by both the bake step (node) and a
 * test, without either dragging Chromium behind it.
 *
 * See `twin-map-beat/references/types/flow-map.md`, "The one thing that goes wrong": the order
 * territories are crossed in must be each territory's FIRST entry point measured as arc-length from
 * the route's origin — computed here as "first index of appearance while walking the route in
 * order", which handles the one named exception (a territory the route starts inside gets stop
 * zero) for free, because the origin's own territory's first appearance IS index 0.
 */

export type LonLat = [number, number];
export type Ring = LonLat[];

export function parseRouteCsv(csv: string): LonLat[] {
  const [header, ...rows] = csv.trim().split(/\r?\n/);
  const columns = (header ?? "").split(",");
  const lonAt = columns.indexOf("lon");
  const latAt = columns.indexOf("lat");
  if (lonAt < 0 || latAt < 0)
    throw new Error(`route csv has no lon/lat column, got: ${header}`);
  return rows
    .filter((r) => r.length > 0)
    .map((r) => {
      const cells = r.split(",");
      return [Number(cells[lonAt]), Number(cells[latAt])] as LonLat;
    });
}

// ── Point in polygon ───────────────────────────────────────────────────────────────────────────

/** Ray-casting point-in-ring test, plain [lon, lat] pairs. */
export function pointInRing(point: LonLat, ring: Ring): boolean {
  const [x, y] = point;
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i]!;
    const [xj, yj] = ring[j]!;
    const crosses = yi > y !== yj > y;
    if (crosses && x < ((xj - xi) * (y - yi)) / (yj - yi + 1e-15) + xi)
      inside = !inside;
  }
  return inside;
}

type Geometry =
  | { type: "Polygon"; coordinates: Ring[] }
  | { type: "MultiPolygon"; coordinates: Ring[][] };

/** Inside the outer ring of some polygon part, and not inside any of that part's holes. */
export function pointInGeometry(point: LonLat, geometry: Geometry): boolean {
  const polygons =
    geometry.type === "MultiPolygon"
      ? geometry.coordinates
      : [geometry.coordinates];
  for (const poly of polygons) {
    const [outer, ...holes] = poly;
    if (!outer || !pointInRing(point, outer)) continue;
    if (holes.some((hole) => pointInRing(point, hole))) continue;
    return true;
  }
  return false;
}

// ── The crossing order ────────────────────────────────────────────────────────────────────────

export type Territory = { key: string; name: string; geometry: Geometry };
export type Crossing = { key: string; name: string; firstIndex: number };

/**
 * Walk the route in order and record, for each territory it enters, the index of its FIRST sample
 * inside that territory. Returns territories in that first-entry order — the order the flow-map
 * sheet calls correct, arc-length from the origin. A route that later re-enters a territory it
 * already left (this beat's own river runs along several borders and drifts back and forth across
 * them at the resolution the source ships) does not change that territory's position in the order:
 * only the FIRST entry counts, exactly as the sheet specifies.
 */
export function territoriesCrossed(
  route: LonLat[],
  territories: Territory[],
): Crossing[] {
  const firstIndex = new Map<string, number>();
  for (let i = 0; i < route.length; i++) {
    const point = route[i]!;
    for (const t of territories) {
      if (firstIndex.has(t.key)) continue;
      if (pointInGeometry(point, t.geometry)) firstIndex.set(t.key, i);
    }
  }
  return territories
    .filter((t) => firstIndex.has(t.key))
    .map((t) => ({
      key: t.key,
      name: t.name,
      firstIndex: firstIndex.get(t.key)!,
    }))
    .sort((a, b) => a.firstIndex - b.firstIndex);
}

// ── Arc length (haversine, for reporting only — not needed for the ordering above) ───────────────

const EARTH_KM = 6371;

function haversineKm(a: LonLat, b: LonLat): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b[1] - a[1]);
  const dLon = toRad(b[0] - a[0]);
  const lat1 = toRad(a[1]);
  const lat2 = toRad(b[1]);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_KM * Math.asin(Math.sqrt(h));
}

/** Cumulative km from the route's own origin to each sample — used only to report leg lengths. */
export function cumulativeKm(route: LonLat[]): number[] {
  const out = [0];
  for (let i = 1; i < route.length; i++)
    out.push(out[i - 1]! + haversineKm(route[i - 1]!, route[i]!));
  return out;
}

// ── Point on feature (not a plain centroid — a centroid can land outside a concave shape) ────────

/**
 * A coarse-to-fine grid search for the point inside the polygon that sits farthest from its own
 * boundary — a simplified "pole of inaccessibility" (the algorithm behind Mapbox's `polylabel`,
 * approximated here without its priority-queue refinement because a beat's own label anchor does
 * not need sub-pixel precision, just to land inside an oddly-shaped or concave territory rather
 * than floating outside it the way a plain centroid can).
 */
export type BBox = { minX: number; minY: number; maxX: number; maxY: number };

/**
 * Sutherland-Hodgman polygon clip against an axis-aligned box, in lon/lat space. Used so a
 * territory's own label anchor (`pointOnFeature`, below) is computed against the part of the shape
 * that is actually IN the camera — a route that only clips a territory's corner (this beat's own
 * Germany and Ukraine, both mostly outside the Danube corridor's frame) must not anchor its label
 * off-frame, which the whole-country visual centre would do.
 */
export function clipToBBox(ring: Ring, box: BBox): Ring {
  const edges: Array<
    [(p: LonLat) => boolean, (a: LonLat, b: LonLat) => LonLat]
  > = [
    [(p) => p[0] >= box.minX, (a, b) => intersectX(a, b, box.minX)],
    [(p) => p[0] <= box.maxX, (a, b) => intersectX(a, b, box.maxX)],
    [(p) => p[1] >= box.minY, (a, b) => intersectY(a, b, box.minY)],
    [(p) => p[1] <= box.maxY, (a, b) => intersectY(a, b, box.maxY)],
  ];
  let output: Ring = ring;
  for (const [inside, intersect] of edges) {
    const input = output;
    output = [];
    if (input.length === 0) break;
    for (let i = 0; i < input.length; i++) {
      const curr = input[i]!;
      const prev = input[(i - 1 + input.length) % input.length]!;
      const currIn = inside(curr);
      const prevIn = inside(prev);
      if (currIn) {
        if (!prevIn) output.push(intersect(prev, curr));
        output.push(curr);
      } else if (prevIn) {
        output.push(intersect(prev, curr));
      }
    }
  }
  return output;
}

function intersectX(a: LonLat, b: LonLat, x: number): LonLat {
  const t = (x - a[0]) / (b[0] - a[0]);
  return [x, a[1] + t * (b[1] - a[1])];
}
function intersectY(a: LonLat, b: LonLat, y: number): LonLat {
  const t = (y - a[1]) / (b[1] - a[1]);
  return [a[0] + t * (b[0] - a[0]), y];
}

/**
 * `bbox`, if given, clips every ring to that box first (see `clipToBBox`) — the anchor then lands
 * inside whatever part of the territory the camera actually shows, not the whole country's own
 * visual centre, which can sit far off-frame for a territory the route only clips the corner of.
 */
export function pointOnFeature(geometry: Geometry, bbox?: BBox): LonLat {
  const polygons =
    geometry.type === "MultiPolygon"
      ? geometry.coordinates
      : [geometry.coordinates];
  // Anchor on the largest ring by bounding-box area — the main landmass, not a small exclave.
  let best: { outer: Ring; area: number } | null = null;
  for (const poly of polygons) {
    let outer = poly[0]!;
    if (bbox) {
      const clipped = clipToBBox(outer, bbox);
      if (clipped.length < 3) continue;
      outer = clipped;
    }
    const lons = outer.map((p) => p[0]);
    const lats = outer.map((p) => p[1]);
    const area =
      (Math.max(...lons) - Math.min(...lons)) *
      (Math.max(...lats) - Math.min(...lats));
    if (!best || area > best.area) best = { outer, area };
  }
  if (!best)
    throw new Error(
      "pointOnFeature: geometry has no ring left after clipping to bbox",
    );
  const outer = best.outer;
  const lons = outer.map((p) => p[0]);
  const lats = outer.map((p) => p[1]);
  let [minX, maxX] = [Math.min(...lons), Math.max(...lons)];
  let [minY, maxY] = [Math.min(...lats), Math.max(...lats)];

  const distToRing = (p: LonLat, ring: Ring): number => {
    let min = Infinity;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const d = distToSegment(p, ring[j]!, ring[i]!);
      if (d < min) min = d;
    }
    return min;
  };

  let bestPoint: LonLat = [(minX + maxX) / 2, (minY + maxY) / 2];
  let bestScore = -Infinity;
  const geo: Geometry = { type: "Polygon", coordinates: [outer] };

  for (let pass = 0; pass < 4; pass++) {
    const steps = 12;
    for (let i = 0; i <= steps; i++) {
      for (let j = 0; j <= steps; j++) {
        const x = minX + ((maxX - minX) * i) / steps;
        const y = minY + ((maxY - minY) * j) / steps;
        const p: LonLat = [x, y];
        if (!pointInGeometry(p, geo)) continue;
        const score = distToRing(p, outer);
        if (score > bestScore) {
          bestScore = score;
          bestPoint = p;
        }
      }
    }
    // Refine around the current best, halving the search window each pass.
    const spanX = (maxX - minX) / 3;
    const spanY = (maxY - minY) / 3;
    minX = bestPoint[0] - spanX;
    maxX = bestPoint[0] + spanX;
    minY = bestPoint[1] - spanY;
    maxY = bestPoint[1] + spanY;
  }
  return bestPoint;
}

function distToSegment(p: LonLat, a: LonLat, b: LonLat): number {
  const [px, py] = p;
  const [ax, ay] = a;
  const [bx, by] = b;
  const dx = bx - ax;
  const dy = by - ay;
  const lenSq = dx * dx + dy * dy;
  let t = lenSq === 0 ? 0 : ((px - ax) * dx + (py - ay) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  const cx = ax + t * dx;
  const cy = ay + t * dy;
  return Math.hypot(px - cx, py - cy);
}

// ── Colour: a cycling, CVD-safe qualitative palette for the crossed territories ──────────────────

/** Tol Muted, a 9-colour CVD-safe qualitative set (Paul Tol's "Muted" scheme) — reused here as a
 *  fact about safe categorical colour, not re-derived. The earlier 8-entry Okabe-Ito-plus-grey
 *  cycle wrapped on this beat's own 9 territories (Germany and Ukraine landed on the same slot,
 *  rendering in the identical blue — a real defect, caught by looking at the legend swatches, not
 *  a stylistic call). Nine distinct entries removes the wrap outright; it also drops the plain
 *  grey/black pair the old cycle fell back to, which this doctrine reserves for "no data" on a
 *  choropleth — a categorical route map has no no-data class, but a reader doesn't know that, so a
 *  grey or black territory swatch risked reading as unmeasured rather than as "the 7th or 8th
 *  territory crossed." Orange is held back for the route's own accent (see `FlowMapStill.tsx`), so
 *  none of these nine overlaps it. */
export const QUALITATIVE_CYCLE = [
  "#332288", // indigo
  "#88CCEE", // cyan
  "#44AA99", // teal
  "#117733", // green
  "#999933", // olive
  "#DDCC77", // sand
  "#CC6677", // rose
  "#882255", // wine
  "#AA4499", // purple
];

export function territoryColour(index: number): string {
  return QUALITATIVE_CYCLE[index % QUALITATIVE_CYCLE.length]!;
}

// ── Anchoring a label near where the route ACTUALLY passes through a territory ───────────────────

/**
 * The bounding box (in lon/lat, padded) of every route sample that actually falls inside this
 * geometry. A large territory the route only clips the corner of (this beat's own Germany and
 * Ukraine) still has its full national extent as a shape, but a label anchored at the NATIONAL
 * visual centre would float far from the part of the country the route is actually in — so
 * `pointOnFeature` is asked to anchor within this box instead of the country's own bbox.
 */
export function routeBBoxWithin(
  route: LonLat[],
  geometry: Geometry,
  pad: number,
): BBox {
  const inside = route.filter((p) => pointInGeometry(p, geometry));
  if (inside.length === 0)
    throw new Error(
      "routeBBoxWithin: no route sample falls inside this geometry",
    );
  const lons = inside.map((p) => p[0]);
  const lats = inside.map((p) => p[1]);
  return {
    minX: Math.min(...lons) - pad,
    maxX: Math.max(...lons) + pad,
    minY: Math.min(...lats) - pad,
    maxY: Math.max(...lats) + pad,
  };
}

// ── Pixel-space ring culling and thinning, once baked (same construction as `twin-map-beat`'s own
//    `geo.ts` — written fresh here, per this project's own rule that a beat's pure core is its own,
//    not imported across skills or beats) ────────────────────────────────────────────────────────

export type PixelRing = [number, number][];
export type Frame = { width: number; height: number };

/** Keep a projected ring only once it clears `minGap` px from the last point kept. */
export function simplifyRing(ring: PixelRing, minGap: number): PixelRing {
  if (ring.length <= 3) return ring;
  const kept: PixelRing = [ring[0]!];
  for (let i = 1; i < ring.length - 1; i++) {
    const last = kept[kept.length - 1]!;
    const point = ring[i]!;
    if (Math.hypot(point[0] - last[0], point[1] - last[1]) >= minGap)
      kept.push(point);
  }
  kept.push(ring[ring.length - 1]!);
  return kept.length >= 3 ? kept : ring.slice(0, 3);
}

/** Whether a projected ring is worth drawing: on-frame (within `margin`), and not several times
 *  wider than the frame — a ring that wide is an antimeridian wrap, not a big shape. Not reachable
 *  by this beat's own camera (nowhere near ±180°), kept anyway per `geo-discipline.md` rule 11. */
export function keepRing(ring: PixelRing, frame: Frame, margin = 40): boolean {
  if (ring.length < 3) return false;
  let minX = Infinity,
    maxX = -Infinity,
    minY = Infinity,
    maxY = -Infinity;
  for (const [x, y] of ring) {
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }
  if (maxX - minX > frame.width * 3) return false;
  return (
    maxX >= -margin &&
    minX <= frame.width + margin &&
    maxY >= -margin &&
    minY <= frame.height + margin
  );
}
