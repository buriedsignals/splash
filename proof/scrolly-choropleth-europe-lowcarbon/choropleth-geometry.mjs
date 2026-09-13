// The map this beat draws, as vector shapes in the static plate's OWN camera, computed once in node.
//
// CAMERA. `static-choropleth-europe-lowcarbon` bakes its plate with MapLibre's `fitBounds` on the bounds
// [-25, 34] → [42, 68] at an aspect of 1000:760, and places every mark through `cameraFor` — the fit in ten
// lines. The same arithmetic is used here, so a country sits where it sits on the plate: Web Mercator,
// longitude linear in x, latitude through the inverse Mercator formula.
//
// SHAPES. The frozen Natural Earth rings, projected, clamped to a wide margin around the frame (it shortens
// Russia and Africa to that margin), rings too small to see dropped — but never a
// study country's only ring: Malta is 27 km across and a map that loses it has lost a country — and
// consecutive points closer than a unit merged.
//
// SEATS. A country's name is seated at the point of its largest ring farthest from that ring's own edge —
// not the box centre (Norway's lands in Sweden), and not the vertex mean, which falls on the coast.

const RAD = Math.PI / 180;
const mercY = (lat) => Math.log(Math.tan(Math.PI / 4 + (lat * RAD) / 2));
const worldX = (lon) => (lon + 180) / 360;
const worldY = (lat) => (1 - mercY(lat) / Math.PI) / 2;
const lonOf = (x) => x * 360 - 180;
const latOf = (y) => (2 * Math.atan(Math.exp((1 - 2 * y) * Math.PI)) - Math.PI / 2) / RAD;

/** `fitBounds`, as `static-choropleth-europe-lowcarbon/render-directions.mjs` predicts it. */
export function cameraFor(bounds, { width, height }) {
  const [[west, south], [east, north]] = bounds;
  const worldPx = Math.min(width / (worldX(east) - worldX(west)), height / (worldY(south) - worldY(north)));
  const cx = (worldX(west) + worldX(east)) / 2;
  const cy = (worldY(north) + worldY(south)) / 2;
  const halfX = width / worldPx / 2;
  const halfY = height / worldPx / 2;
  return { west: lonOf(cx - halfX), east: lonOf(cx + halfX), north: latOf(cy - halfY), south: latOf(cy + halfY) };
}

export function choroplethGeometry(geo, { bounds, width, height, keep }) {
  const corners = cameraFor(bounds, { width, height });
  const yN = mercY(corners.north);
  const yS = mercY(corners.south);
  const project = ([lon, lat]) => [((lon - corners.west) / (corners.east - corners.west)) * width, ((mercY(lat) - yN) / (yS - yN)) * height];
/** Shapes are kept this far past the frame: a stage wider than the frame, and a close-up that sits low in
   *  it, both show real geography there rather than the cut edge of a clamped coastline. */
  const MARGIN = 280;
  const clampPt = ([x, y]) => [Math.min(Math.max(x, -MARGIN), width + MARGIN), Math.min(Math.max(y, -MARGIN), height + MARGIN)];
  const r1 = (v) => Math.round(v * 10) / 10;
  const outside = (p) => p[0] <= -MARGIN || p[0] >= width + MARGIN || p[1] <= -MARGIN || p[1] >= height + MARGIN;

  const byIso = new Map();
  for (const f of geo.features) {
    const iso = f.properties.iso;
    const held = byIso.get(iso) ?? { iso, rings: [], largest: null };
    for (const poly of f.geometry.coordinates)
      for (const ring of poly) {
        const raw = ring.map(project);
        const pts = raw.map(clampPt);
        if (pts.every(outside)) continue;
        const xs = pts.map((p) => p[0]);
        const ys = pts.map((p) => p[1]);
        const size = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys));
        const kept = [pts[0]];
        for (const p of pts.slice(1)) {
          const q = kept[kept.length - 1];
          if (Math.abs(p[0] - q[0]) + Math.abs(p[1] - q[1]) >= 0.8) kept.push(p);
        }
        const shape = kept.length >= 3 ? kept : pts;
        const entry = { pts: shape, size, raw };
        if (!held.largest || size > held.largest.size) held.largest = entry;
        if (size >= 1.5) held.rings.push(entry);
        byIso.set(iso, held);
      }
    // A study country is never lost to the size threshold.
    if (keep.has(iso) && held.largest && held.rings.length === 0) held.rings.push(held.largest);
    byIso.set(iso, held);
  }

  /** The seat is the point of the largest ring farthest from its own edge, searched on a grid. The static
   *  plate's vertex mean walked to a vertex lands ON the coast for Norway, Sweden, Italy and Britain,
   *  and a name centred on a coastline sits half in the sea. */
  const seatOf = (largest) => {
    const ring = largest.pts.filter((p) => !outside(p));
    const use = ring.length >= 3 ? ring : largest.pts;
    const xs = use.map((p) => p[0]);
    const ys = use.map((p) => p[1]);
    const x0 = Math.min(...xs);
    const y0 = Math.min(...ys);
    const w = Math.max(...xs) - x0;
    const h = Math.max(...ys) - y0;
    const inside = (px, py) => {
      let hit = false;
      for (let i = 0, j = largest.pts.length - 1; i < largest.pts.length; j = i++) {
        const [xi, yi] = largest.pts[i];
        const [xj, yj] = largest.pts[j];
        if (yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) hit = !hit;
      }
      return hit;
    };
    const edgeDistance = (px, py) => {
      let best = Infinity;
      for (let i = 0, j = largest.pts.length - 1; i < largest.pts.length; j = i++) {
        const [ax, ay] = largest.pts[j];
        const [bx, by] = largest.pts[i];
        const dx = bx - ax;
        const dy = by - ay;
        const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy || 1)));
        best = Math.min(best, (px - ax - t * dx) ** 2 + (py - ay - t * dy) ** 2);
      }
      return best;
    };
    let seat = [x0 + w / 2, y0 + h / 2];
    let room = -1;
    const N = 24;
    for (let i = 0; i <= N; i++)
      for (let j = 0; j <= N; j++) {
        const px = Math.min(Math.max(x0 + (w * i) / N, 0), width);
        const py = Math.min(Math.max(y0 + (h * j) / N, 0), height);
        if (!inside(px, py)) continue;
        const d = edgeDistance(px, py);
        if (d > room) {
          room = d;
          seat = [px, py];
        }
      }
    return { x: r1(seat[0]), y: r1(seat[1]) };
  };
  const boxOf = (rings) => {
    const pts = rings.flatMap((r) => r.pts);
    const xs = pts.map((p) => p[0]);
    const ys = pts.map((p) => p[1]);
    return { x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) };
  };

  const shapes = [...byIso.values()]
    .filter((c) => c.rings.length)
    .map((c) => ({
      iso: c.iso,
      path: c.rings.map((r) => `M${r.pts.map((p) => `${r1(p[0])} ${r1(p[1])}`).join("L")}Z`).join(""),
      seat: seatOf(c.largest),
      box: boxOf(c.rings),
    }));
  return { shapes, project, corners };
}
