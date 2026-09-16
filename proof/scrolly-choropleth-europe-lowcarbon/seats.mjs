// THE SEATS, FROZEN. Where each study country's name sits on the live map, in [lon, lat], written to
// `seats.json` beside this file and read by `render-directions-scrolly.mjs`.
//
// The live map places words as symbol layers at geographic points, so the seat the SVG version
// computed in its own frame (the point of a country's largest ring farthest from that ring's edge —
// not the box centre, where Norway's name lands in Sweden, and not the vertex mean, which falls on
// the coast) is carried over UNCHANGED and un-projected back to degrees. The search is the one the
// SVG version's `choropleth-geometry.mjs` ran (removed with the SVG; this port matched its seats to
// 0.001 frame units), on the same frozen Natural Earth rings (`shapes.geojson`, read as data) and in
// the same frame: the static plate's bounds fitted into 1000 × 760 in Web Mercator.
//
// Run by hand when the shapes or the study set change:
//   bun proof/scrolly-choropleth-europe-lowcarbon/seats.mjs

import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const BOUNDS = [[-25, 34], [42, 68]];
const FRAME = { width: 1000, height: 760 };

const RAD = Math.PI / 180;
const mercY = (lat) => Math.log(Math.tan(Math.PI / 4 + (lat * RAD) / 2));
const latOfMercY = (m) => (2 * Math.atan(Math.exp(m)) - Math.PI / 2) / RAD;
const worldX = (lon) => (lon + 180) / 360;
const worldY = (lat) => (1 - mercY(lat) / Math.PI) / 2;
const lonOf = (x) => x * 360 - 180;
const latOf = (y) => (2 * Math.atan(Math.exp((1 - 2 * y) * Math.PI)) - Math.PI / 2) / RAD;

function frameCorners([[west, south], [east, north]], { width, height }) {
  const worldPx = Math.min(width / (worldX(east) - worldX(west)), height / (worldY(south) - worldY(north)));
  const cx = (worldX(west) + worldX(east)) / 2;
  const cy = (worldY(north) + worldY(south)) / 2;
  const halfX = width / worldPx / 2;
  const halfY = height / worldPx / 2;
  return { west: lonOf(cx - halfX), east: lonOf(cx + halfX), north: latOf(cy - halfY), south: latOf(cy + halfY) };
}

export async function computeSeats() {
  const { width, height } = FRAME;
  const corners = frameCorners(BOUNDS, FRAME);
  const yN = mercY(corners.north);
  const yS = mercY(corners.south);
  const project = ([lon, lat]) => [((lon - corners.west) / (corners.east - corners.west)) * width, ((mercY(lat) - yN) / (yS - yN)) * height];
  const unproject = ([x, y]) => [corners.west + (x / width) * (corners.east - corners.west), latOfMercY(yN + (y / height) * (yS - yN))];

  const MARGIN_X = 900;
  const MARGIN_Y = 500;
  const clampPt = ([x, y]) => [Math.min(Math.max(x, -MARGIN_X), width + MARGIN_X), Math.min(Math.max(y, -MARGIN_Y), height + MARGIN_Y)];
  const outside = (p) => p[0] <= -MARGIN_X || p[0] >= width + MARGIN_X || p[1] <= -MARGIN_Y || p[1] >= height + MARGIN_Y;
  const r1 = (v) => Math.round(v * 10) / 10;

  const geo = JSON.parse(await readFile(join(HERE, "shapes.geojson"), "utf8"));
  const study = new Set(
    (await readFile(join(HERE, "data.csv"), "utf8"))
      .trim()
      .split(/\r?\n/)
      .slice(1)
      .map((l) => l.split(",")[1]),
  );

  const largestOf = new Map();
  for (const f of geo.features) {
    const iso = f.properties.iso;
    if (!study.has(iso)) continue;
    for (const poly of f.geometry.coordinates)
      for (const ring of poly) {
        const pts = ring.map(project).map(clampPt);
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
        const held = largestOf.get(iso);
        if (!held || size > held.size) largestOf.set(iso, { pts: shape, size });
      }
  }

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
    return [r1(seat[0]), r1(seat[1])];
  };

  const seats = {};
  for (const iso of [...study].sort()) {
    const largest = largestOf.get(iso);
    if (!largest) throw new Error(`${iso} is in the study set and has no ring in shapes.geojson inside the frame's margin`);
    const [lon, lat] = unproject(seatOf(largest));
    seats[iso] = [Math.round(lon * 1e4) / 1e4, Math.round(lat * 1e4) / 1e4];
  }
  return seats;
}

if (import.meta.main) {
  const seats = await computeSeats();
  const out = {
    provenance:
      "Written by proof/scrolly-choropleth-europe-lowcarbon/seats.mjs from shapes.geojson (Natural Earth 50 m, frozen beside the beat, byte-identical to proof/static-choropleth-europe-lowcarbon/shapes.geojson) and the study set of data.csv: the point of each country's largest ring farthest from its edge, searched on a 24 × 24 grid in the frame the SVG scrolly drew (bounds [-25, 34] → [42, 68] fitted into 1000 × 760, Web Mercator), un-projected to [lon, lat].",
    seats,
  };
  await writeFile(join(HERE, "seats.json"), `${JSON.stringify(out, null, 2)}\n`);
  console.log(`${Object.keys(seats).length} seats -> seats.json`);
}
