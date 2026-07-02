// Deterministic point scatter inside a polygon — no Math.random, no Date.now. A seeded PRNG
// (mulberry32) drives rejection sampling in the feature's bbox; the same (feature, n, seed) always
// yields the same points, so the dots are stable across every Remotion render frame. The scatter is
// computed ONCE (not per frame). MultiPolygon regions allocate dots to sub-polygons by area.
import {
  bbox,
  booleanPointInPolygon,
  area,
  pointOnFeature,
  polygon,
} from "@turf/turf";

// Fast 32-bit PRNG. Returns a function producing floats in [0, 1).
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// FNV-1a string hash → uint32, for a stable per-region (+category) seed.
export function hashSeed(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

const MAX_ATTEMPTS_PER_DOT = 40;

function scatterSingle(
  feature: GeoJSON.Feature,
  nDots: number,
  seed: number,
): [number, number][] {
  if (nDots <= 0) return [];
  const [w, s, e, n] = bbox(feature);
  const rand = mulberry32(seed);
  const fallback = pointOnFeature(feature).geometry.coordinates as [
    number,
    number,
  ];
  const out: [number, number][] = [];
  for (let d = 0; d < nDots; d++) {
    let placed = false;
    for (let a = 0; a < MAX_ATTEMPTS_PER_DOT; a++) {
      const lon = w + rand() * (e - w);
      const lat = s + rand() * (n - s);
      if (booleanPointInPolygon([lon, lat], feature as never)) {
        out.push([lon, lat]);
        placed = true;
        break;
      }
    }
    // Thin/sliver region exhausted the attempt budget → a guaranteed-inside fallback point.
    if (!placed) out.push([fallback[0], fallback[1]]);
  }
  return out;
}

export function scatterInPolygon(
  feature: GeoJSON.Feature,
  nDots: number,
  seed: number,
): [number, number][] {
  if (nDots <= 0) return [];
  const geom = feature.geometry;
  if (geom.type !== "MultiPolygon") return scatterSingle(feature, nDots, seed);

  // MultiPolygon: allocate dots to sub-polygons by area (deterministic largest-remainder), scatter each.
  const polys = geom.coordinates.map(
    (rings) => polygon(rings) as GeoJSON.Feature,
  );
  const areas = polys.map((p) => area(p));
  const total = areas.reduce((sum, a) => sum + a, 0) || 1;
  const raw = areas.map((a) => (nDots * a) / total);
  const counts = raw.map((x) => Math.floor(x));
  let rem = nDots - counts.reduce((sum, c) => sum + c, 0);
  const order = raw
    .map((x, i) => ({ i, frac: x - Math.floor(x) }))
    .sort((a, b) => b.frac - a.frac || a.i - b.i);
  for (let k = 0; k < rem; k++) counts[order[k].i]++;

  const out: [number, number][] = [];
  polys.forEach((p, i) => {
    out.push(...scatterSingle(p, counts[i], (seed + i + 1) >>> 0));
  });
  return out;
}
