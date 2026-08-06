// Camera-path preparation for the 3D flyover. Turns a river/route centerline GeoJSON into a LONG,
// CONTINUOUSLY-curving camera path so the camera banks through smooth flowing curves and never
// "flies straight, snaps to a new heading, flies straight".
//
// Method: clip a window → resample to even arc-length spacing → moving-average smooth (inherently
// continuous curvature) → dampen lateral deviation toward the straight start→end chord (the single
// swerve-amplitude knob). Deliberately NOT Douglas-Peucker/simplify: that concentrates curvature at
// sparse control points, which is exactly the corner artefact we are removing.
//
// RUN (against the shipped sample):
//   bun scripts/prep-path.mjs
//     → reads  assets/sample-data/yarlung-gorge.geojson
//     → writes assets/sample-data/yarlung-gorge-path.json
//   bun scripts/prep-path.mjs <input.geojson> <output.json> [startLng] [startLat]
//
// Input must be a single LineString feature (features[0].geometry).
//
// VALIDATE the output with the heading-delta probe this script prints: deltas should be small and
// change GRADUALLY (e.g. 3, 0, -1, -3, -4, 1, 7, 9, 5, -5, -12, -7). Big jumps = corners = bad.
// Ported from the 3d-flyover reference skill (Buried Signals).

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const IN = process.argv[2] || resolve(here, "../assets/sample-data/yarlung-gorge.geojson");
const OUT = process.argv[3] || resolve(here, "../assets/sample-data/yarlung-gorge-path.json");

// The sample's opening is the Yarlung Tsangpo gorge; START must be a point ON the centerline
// (the script snaps to the nearest vertex).
const START = [
  Number(process.argv[4] ?? 94.968),
  Number(process.argv[5] ?? 29.757),
];
if (!Number.isFinite(START[0]) || !Number.isFinite(START[1])) {
  throw new Error("startLng / startLat must be numbers");
}

const WINDOW_KM = 30; // clipped reach; smoothing + damping shrink it to the usable corridor
const STEP_KM = 0.1; // resample spacing
const SMOOTH_W = 28; // +/-2.8 km moving-average window — meanders become flowing curves
const SMOOTH_PASSES = 2;
const DAMP = 0.45; // keep 45% of the deviation from the chord → gentle, continuous swerve

const havKm = (a, b) => {
  const R = 6371;
  const r = Math.PI / 180;
  const dLat = (b[1] - a[1]) * r;
  const dLng = (b[0] - a[0]) * r;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(a[1] * r) * Math.cos(b[1] * r) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
};

const centerline = JSON.parse(readFileSync(IN, "utf8")).features[0].geometry.coordinates;

let startIndex = 0;
let best = Infinity;
centerline.forEach((p, i) => {
  const d = havKm(p, START);
  if (d < best) {
    best = d;
    startIndex = i;
  }
});

const clip = [];
for (let i = startIndex, acc = 0; i < centerline.length; i++) {
  if (i > startIndex) acc += havKm(centerline[i - 1], centerline[i]);
  if (acc > WINDOW_KM) break;
  clip.push(centerline[i]);
}

const resample = (coords) => {
  const out = [coords[0].slice()];
  let carry = 0;
  let from = coords[0];
  for (let i = 1; i < coords.length; i++) {
    let segLen = havKm(from, coords[i]);
    while (carry + segLen >= STEP_KM) {
      const t = (STEP_KM - carry) / segLen;
      const next = [
        from[0] + (coords[i][0] - from[0]) * t,
        from[1] + (coords[i][1] - from[1]) * t,
      ];
      out.push(next);
      from = next;
      segLen = havKm(from, coords[i]);
      carry = 0;
    }
    carry += segLen;
    from = coords[i];
  }
  return out;
};

const smoothMovingAverage = (coords, w, passes) => {
  let c = coords;
  for (let p = 0; p < passes; p++) {
    c = c.map((_, i) => {
      let sx = 0;
      let sy = 0;
      let n = 0;
      for (let j = Math.max(0, i - w); j <= Math.min(c.length - 1, i + w); j++) {
        sx += c[j][0];
        sy += c[j][1];
        n++;
      }
      return [sx / n, sy / n];
    });
  }
  return c;
};

const even = resample(clip);
const smooth = smoothMovingAverage(even, SMOOTH_W, SMOOTH_PASSES);

// Dampen toward the straight chord in a local equirectangular frame.
const lat0 = (smooth[0][1] * Math.PI) / 180;
const kx = 111.32 * Math.cos(lat0);
const ky = 110.57;
const toXY = (p) => [(p[0] - smooth[0][0]) * kx, (p[1] - smooth[0][1]) * ky];
const toLL = (xy) => [smooth[0][0] + xy[0] / kx, smooth[0][1] + xy[1] / ky];
const A = toXY(smooth[0]);
const B = toXY(smooth[smooth.length - 1]);
const AB = [B[0] - A[0], B[1] - A[1]];
const len2 = AB[0] ** 2 + AB[1] ** 2;
const path = smooth.map((p) => {
  const P = toXY(p);
  const t = ((P[0] - A[0]) * AB[0] + (P[1] - A[1]) * AB[1]) / len2;
  const proj = [A[0] + t * AB[0], A[1] + t * AB[1]];
  return toLL([
    proj[0] + (P[0] - proj[0]) * DAMP,
    proj[1] + (P[1] - proj[1]) * DAMP,
  ]);
});

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify(path));

let lengthKm = 0;
for (let i = 1; i < path.length; i++) lengthKm += havKm(path[i - 1], path[i]);
console.log(
  `flyover path: clip ${clip.length} → resample ${even.length} → smooth → ${path.length} pts · ${lengthKm.toFixed(1)} km`,
);

const bearingDeg = (a, b) => {
  const r = Math.PI / 180;
  const y = Math.sin((b[0] - a[0]) * r) * Math.cos(b[1] * r);
  const x =
    Math.cos(a[1] * r) * Math.sin(b[1] * r) -
    Math.sin(a[1] * r) * Math.cos(b[1] * r) * Math.cos((b[0] - a[0]) * r);
  return (Math.atan2(y, x) * 180) / Math.PI;
};

const stepPts = Math.round(1.5 / STEP_KM);
let previous = null;
const deltas = [];
for (let i = 0; i + stepPts < path.length; i += stepPts) {
  const h = bearingDeg(path[i], path[i + stepPts]);
  if (previous !== null) {
    let d = h - previous;
    while (d > 180) d -= 360;
    while (d < -180) d += 360;
    deltas.push(d.toFixed(0));
  }
  previous = h;
}
console.log(`  heading deltas every 1.5 km (deg): ${deltas.join(", ")}`);
