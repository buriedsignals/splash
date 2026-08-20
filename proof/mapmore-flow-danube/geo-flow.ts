/**
 * RFC 4180 row tokeniser, inlined here rather than imported — no cross-skill runtime import, and
 * a proof/story workspace is not a skill either. A naive comma split corrupts a quoted thousands
 * separator ("1,234.5") or a quoted name carrying its own comma ("Netherlands, the"); this walks
 * the text one character at a time instead. Returns one array of raw field strings per row
 * (header included), quotes stripped, doubled quotes un-escaped, and a lone CR or CRLF closing a
 * row the same way LF does.
 */
function parseCsvRows(text) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;
  let i = 0;
  while (i < text.length) {
    const char = text[i];
    if (quoted) {
      if (char === '"') {
        if (text[i + 1] === '"') { field += '"'; i += 2; continue; }
        quoted = false; i += 1; continue;
      }
      field += char; i += 1; continue;
    }
    if (char === '"') { quoted = true; i += 1; continue; }
    if (char === ",") { row.push(field); field = ""; i += 1; continue; }
    if (char === "\r") { row.push(field); rows.push(row); row = []; field = ""; i += (text[i + 1] === "\n") ? 2 : 1; continue; }
    if (char === "\n") { row.push(field); rows.push(row); row = []; field = ""; i += 1; continue; }
    field += char; i += 1;
  }
  if (field !== "" || row.length > 0) { row.push(field); rows.push(row); }
  return rows;
}

/**
 * The pure half of the flow-map (route) beat: csv parsing, point-in-polygon, the ordered
 * territory-crossing computation, a point-on-feature anchor, and the cycling qualitative palette.
 * No browser, no rasteriser — same split as `map-beat/assets/geo.ts` and
 * `map-quake-density/geo-hex.ts`, so this file can be imported by both the bake step (node) and a
 * test, without either dragging Chromium behind it.
 *
 * See `map-beat/references/types/flow-map.md`, "The one thing that goes wrong": the order
 * territories are crossed in must be each territory's FIRST entry point measured as arc-length from
 * the route's origin — computed here as "first index of appearance while walking the route in
 * order", which handles the one named exception (a territory the route starts inside gets stop
 * zero) for free, because the origin's own territory's first appearance IS index 0.
 */

export type LonLat = [number, number];
export type Ring = LonLat[];

/** @parity */
export function parseRouteCsv(csv: string): LonLat[] {
  const [header, ...rows] = parseCsvRows(csv.trim());
  const columns = (header ?? []);
  const lonAt = columns.indexOf("lon");
  const latAt = columns.indexOf("lat");
  if (lonAt < 0 || latAt < 0)
    throw new Error(`route csv has no lon/lat column, got: ${header}`);
  return rows
    .filter((r) => r.some((cell) => cell.trim() !== ""))
    .map((r) => {
      const cells = r;
      return [Number(cells[lonAt]), Number(cells[latAt])] as LonLat;
    });
}

// ── Point in polygon ───────────────────────────────────────────────────────────────────────────

/** Ray-casting point-in-ring test, plain [lon, lat] pairs. 
 *  @parity */
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

/** Inside the outer ring of some polygon part, and not inside any of that part's holes. 
 *  @parity */
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
 
 *  @parity */
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

/** @parity */
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

/** Cumulative km from the route's own origin to each sample — used only to report leg lengths. 
 *  @parity */
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
 
 *  @parity */
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

/** @parity */
function intersectX(a: LonLat, b: LonLat, x: number): LonLat {
  const t = (x - a[0]) / (b[0] - a[0]);
  return [x, a[1] + t * (b[1] - a[1])];
}
/** @parity */
function intersectY(a: LonLat, b: LonLat, y: number): LonLat {
  const t = (y - a[1]) / (b[1] - a[1]);
  return [a[0] + t * (b[0] - a[0]), y];
}

/**
 * `bbox`, if given, clips every ring to that box first (see `clipToBBox`) — the anchor then lands
 * inside whatever part of the territory the camera actually shows, not the whole country's own
 * visual centre, which can sit far off-frame for a territory the route only clips the corner of.
 
 *  @parity */
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

/** @parity */
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

/** The blue tint `bake.mjs` forces onto the basemap's water layers, because `dataviz-light` paints
 *  water GREY and grey water is indistinguishable from a no-data grey (`geo-discipline.md` rule 7).
 *  It lives here, beside the cycle, because it is the colour every territory fill is measured
 *  AGAINST — see `assertTerritoryFillsReadAsLand`. */
export const WATER_TINT = "#AAC9E0";

/** The basemap's own land, under every territory fill. `dataviz-light` at this camera paints
 *  89% of the plate this exact value, so it is what a fill actually composites over. */
export const LAND_TINT = "#F7F7F7";

/** How much of a territory's hue is laid over the plate. It is a colour decision, not a taste one:
 *  the wash pulls every hue toward the pale plate, and a hue washed far enough lands ON the water
 *  tint. 0.42 — what this beat shipped — put Austria's fill 11.0 ΔE from the sea while the bare
 *  land sits 23.8 away, i.e. the paint made its own coastline HALF as readable as no paint at all.
 *  0.45 is the smallest step that lifts every member of the cycle back over that bar. */
export const TERRITORY_FILL_OPACITY = 0.45;

/** Tol Muted, a CVD-safe qualitative set (Paul Tol's "Muted" scheme), with the two members a map
 *  with water cannot use. The earlier 8-entry Okabe-Ito-plus-grey cycle wrapped on this beat's own
 *  9 territories (Germany and Ukraine landed on the same slot, rendering in the identical blue),
 *  which is why the set has nine entries; it also drops the plain grey/black pair the old cycle
 *  fell back to, which this doctrine reserves for "no data" on a choropleth. Orange is held back
 *  for the route's own accent (see `FlowMapStill.tsx`), so none of these nine overlaps it.
 *
 *  TWO SLOTS ARE NOT TOL'S, AND THE REASON IS MEASURED, NOT AESTHETIC. Tol's pale cyan `#88CCEE`
 *  and pale teal `#44AA99` are LIGHT COOL hues: washed over a pale plate they land in the water
 *  tint's own neighbourhood. Cyan is the worst case and cannot be rescued by any opacity — at 0.42
 *  its fill sits 11.0 ΔE76 from the sea, at 0.70 it sits 6.9, because it IS a water tint; teal
 *  needs 0.70 before it clears. They are replaced by two DARK hues (`#8B0000`, and `#40004B` from
 *  ColorBrewer PRGn's dark end) chosen by running the measurement below over a candidate pool.
 *  Against the shipped set, at the shipped opacities, the substitution improves every axis:
 *  nearest fill-to-water 11.0 → 24.4, tightest pair 9.4 → 10.1, tightest pair under a simulated
 *  deuteranopia/protanopia 5.1 → 8.4, tightest under tritanopia 5.0 → 5.6; the route accent stays
 *  58.0 ΔE from the nearest fill. Distinguishability was checked under Viénot–Brettel–Mollon
 *  dichromat simulation, not by eye — the doctrine asks for that explicitly. */
export const QUALITATIVE_CYCLE = [
  "#332288", // indigo
  "#8B0000", // dark red  — Tol's pale cyan #88CCEE held this slot and read as sea
  "#40004B", // dark purple — Tol's pale teal #44AA99 held this slot
  "#117733", // green
  "#999933", // olive
  "#DDCC77", // sand
  "#CC6677", // rose
  "#882255", // wine
  "#AA4499", // purple
];

/** @parity */
export function territoryColour(index: number): string {
  return QUALITATIVE_CYCLE[index % QUALITATIVE_CYCLE.length]!;
}

// ── The rule those two substitutions exist to satisfy ────────────────────────────────────────────

/** @parity */
function srgbChannels(hex: string): [number, number, number] {
  return [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)) as [number, number, number];
}

/** CIE L*a*b* (D65) from sRGB, the space the audit measured this defect in. */
export function labOf(colour: string | [number, number, number]): [number, number, number] {
  const [r, g, b] = (typeof colour === "string" ? srgbChannels(colour) : colour).map((v) => {
    const c = v / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  const x = (r * 0.4124564 + g * 0.3575761 + b * 0.1804375) / 0.95047;
  const y = r * 0.2126729 + g * 0.7151522 + b * 0.072175;
  const z = (r * 0.0193339 + g * 0.119192 + b * 0.9503041) / 1.08883;
  const f = (t: number) => (t > 216 / 24389 ? Math.cbrt(t) : (841 / 108) * t + 4 / 29);
  const [fx, fy, fz] = [f(x), f(y), f(z)];
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}

/** ΔE76 — the plain Euclidean distance in L*a*b*. Deliberately the same metric the render audit
 *  used, so a number here can be compared with a number there without a conversion argument. 
 *  @parity */
export function deltaE76(
  a: string | [number, number, number],
  b: string | [number, number, number],
): number {
  const [l1, a1, b1] = labOf(a);
  const [l2, a2, b2] = labOf(b);
  return Math.hypot(l1 - l2, a1 - a2, b1 - b2);
}

/** What a hue actually looks like once laid over the plate at `opacity` — SVG's `fill-opacity`
 *  composites in sRGB, so this is plain linear interpolation of the 0..255 channels. 
 *  @parity */
export function compositeOverLand(
  hue: string,
  opacity: number = TERRITORY_FILL_OPACITY,
  land: string = LAND_TINT,
): string {
  const h = srgbChannels(hue);
  const l = srgbChannels(land);
  return (
    "#" +
    h
      .map((v, i) => Math.round(v * opacity + l[i]! * (1 - opacity)).toString(16).padStart(2, "0"))
      .join("")
      .toUpperCase()
  );
}

/**
 * A territory fill may not make its own coastline harder to read than no paint at all.
 *
 * The bar is not a taste threshold and carries no free parameter: the basemap already separates its
 * land from its water by ΔE76 `deltaE76(LAND_TINT, WATER_TINT)` = 23.8, and that separation is what
 * a reader uses to find a coast. A fill laid over the land that ends up NEARER the water than the
 * bare land was has spent the beat's own paint making the map worse than the plate it was given.
 *
 * This is `geo-discipline.md` rule 7 ("each must read as a different KIND of thing at a glance")
 * turned into a number, and it runs at render time rather than in a test because the thing it
 * guards — a hue, an opacity and a basemap tint that live in three different files — can only
 * disagree once they are composited.
 
 *  @parity */
export function territoryFillReport(
  cycle: string[] = QUALITATIVE_CYCLE,
  opacity: number = TERRITORY_FILL_OPACITY,
): { hue: string; fill: string; toWater: number }[] {
  return cycle.map((hue) => {
    const fill = compositeOverLand(hue, opacity);
    return { hue, fill, toWater: deltaE76(fill, WATER_TINT) };
  });
}

/** @parity */
export function assertTerritoryFillsReadAsLand(
  cycle: string[] = QUALITATIVE_CYCLE,
  opacity: number = TERRITORY_FILL_OPACITY,
): void {
  const floor = deltaE76(LAND_TINT, WATER_TINT);
  const offenders = territoryFillReport(cycle, opacity).filter((r) => r.toWater < floor);
  if (offenders.length > 0)
    throw new Error(
      `territory fill colour reads as water: ` +
        offenders
          .map((o) => `${o.hue} at fill-opacity ${opacity} composites to ${o.fill}, ${o.toWater.toFixed(2)} ΔE76 from the water tint ${WATER_TINT}`)
          .join("; ") +
        ` — the bare basemap land is ${floor.toFixed(2)} ΔE76 away, so these fills make their own coastline harder to read than no paint at all. Darken the hue or raise TERRITORY_FILL_OPACITY.`,
    );
}

/** WCAG 2.x relative luminance, and the ratio built from it. Duplicated here rather than imported
 *  from `render-still.mjs` on purpose: this module is bundled INTO the video by webpack, and
 *  `render-still.mjs` pulls in the native rasteriser, which webpack cannot parse ("Module parse
 *  failed: Unexpected character" on a `.node` binary). A module a bundler has to walk keeps its
 *  arithmetic pure. 
 *  @parity */
function relativeLuminance(hex: string): number {
  const [r, g, b] = srgbChannels(hex).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** @parity */
function wcagContrast(a: string, b: string): number {
  const [hi, lo] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}

/**
 * Black or white for a numeral drawn on a swatch — whichever MEASURES higher against it, the same
 * pole rule `deriveFurniture` applies to a ground. The shipped beat drew every badge numeral in the
 * ground colour, on a disc drawn at the hue's FULL strength: white on Tol's sand `#DDCC77` measures
 * 1.62:1, on its pale cyan 1.76:1, on its teal 2.82:1 and on its olive 3.02:1 — five of the nine
 * numbers a reader is asked to read in order sat under the 4.5:1 floor, and two were barely there.
 
 *  @parity */
export function numeralInk(swatch: string): string {
  return wcagContrast("#000000", swatch) >= wcagContrast("#FFFFFF", swatch) ? "#000000" : "#FFFFFF";
}

// ── Anchoring a label near where the route ACTUALLY passes through a territory ───────────────────

/**
 * The bounding box (in lon/lat, padded) of every route sample that actually falls inside this
 * geometry. A large territory the route only clips the corner of (this beat's own Germany and
 * Ukraine) still has its full national extent as a shape, but a label anchored at the NATIONAL
 * visual centre would float far from the part of the country the route is actually in — so
 * `pointOnFeature` is asked to anchor within this box instead of the country's own bbox.
 
 *  @parity */
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

// ── Pixel-space ring culling and thinning, once baked (same construction as `map-beat`'s own
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
 *  by this beat's own camera (nowhere near ±180°), kept anyway per `geo-discipline.md` rule 11. 
 *  @parity */
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
