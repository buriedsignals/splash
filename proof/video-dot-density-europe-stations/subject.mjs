// THE SUBJECT OF `static-dot-density-europe-stations`, LOADED AND ASSERTED — and the land and the stations in the
// frame's own pixels, in the sibling maps' Lambert azimuthal equal-area projection.
//
// Runs in Bun only.

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { laea } from "../scrolly-cartogram-europe-lowcarbon/cartogram-geometry.mjs";
import { clipRing } from "../video-choropleth-europe-lowcarbon/geometry.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
export const STATIC_DIR = join(HERE, "..", "static-dot-density-europe-stations");
export const SUBJECT = "Nuclear";
/** The static beat's window, [west, south, east, north]. */
export const WINDOW = [-25, 34, 45, 72];

export function loadSubject({ dir = STATIC_DIR } = {}) {
  const csv = readFileSync(join(dir, "stations.csv"), "utf8").trim().split(/\r?\n/);
  const header = csv[0].split(",");
  const stations = csv.slice(1).map((l) => {
    const c = l.split(",");
    const r = Object.fromEntries(header.map((h, i) => [h, c[i]]));
    return { fuel: r.fuel, country: r.country, mw: Number(r.capacity_mw), lon: Number(r.lon), lat: Number(r.lat) };
  });
  for (const s of stations) if (![s.lon, s.lat, s.mw].every(Number.isFinite)) throw new Error(`a station has no usable coordinates or capacity: ${JSON.stringify(s)}`);

  // THE CLAIM, ASSERTED — the static beat's own three checks.
  const total = stations.length;
  const nuclear = stations.filter((s) => s.fuel === SUBJECT);
  const mwAll = stations.reduce((a, s) => a + s.mw, 0);
  const mwNuclear = nuclear.reduce((a, s) => a + s.mw, 0);
  const shareSites = (nuclear.length / total) * 100;
  const shareCapacity = (mwNuclear / mwAll) * 100;
  if (!(shareSites < 1)) throw new Error(`the video says nuclear is under 1 % of the sites; it is ${shareSites.toFixed(2)} %`);
  if (!(shareCapacity > 30)) throw new Error(`the video says nuclear carries a third of the capacity; it is ${shareCapacity.toFixed(1)} %`);
  const byFuel = {};
  for (const s of stations) {
    byFuel[s.fuel] ??= { fuel: s.fuel, n: 0, mw: 0 };
    byFuel[s.fuel].n++;
    byFuel[s.fuel].mw += s.mw;
  }
  const perSite = Object.values(byFuel).sort((a, b) => b.mw / b.n - a.mw / a.n);
  if (perSite[0].fuel !== SUBJECT) throw new Error(`nuclear is no longer the most concentrated fuel; ${perSite[0].fuel} is`);
  /** The order the dots arrive in: fuel by fuel, the most sites first, the subject last whatever its count. */
  const arrival = Object.values(byFuel)
    .filter((f) => f.fuel !== SUBJECT)
    .sort((a, b) => b.n - a.n)
    .map((f) => f.fuel)
    .concat(SUBJECT);
  const geo = JSON.parse(readFileSync(join(dir, "shapes.geojson"), "utf8"));
  return { stations, total, nuclear: nuclear.length, shareSites, shareCapacity, byFuel, arrival, geo, maxMw: Math.max(...stations.map((s) => s.mw)) };
}

const r1 = (v) => Math.round(v * 10) / 10;

/** The window fitted inside `box` (contain), the land clipped to the stage plus `margin`, every station projected. */
export function dotGeometry(subject, { box, stage, margin }) {
  const [west, south, east, north] = WINDOW;
  const edge = [];
  for (let t = 0; t <= 40; t++) {
    const lon = west + ((east - west) * t) / 40;
    const lat = south + ((north - south) * t) / 40;
    edge.push(laea(lon, south), laea(lon, north), laea(west, lat), laea(east, lat));
  }
  const minX = Math.min(...edge.map((p) => p[0]));
  const maxX = Math.max(...edge.map((p) => p[0]));
  const ys = subject.stations.map((s) => laea(s.lon, s.lat)[1]);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const scale = Math.min(box.w / (maxX - minX), box.h / (maxY - minY));
  const offX = box.x + (box.w - (maxX - minX) * scale) / 2;
  const offY = box.y + (box.h - (maxY - minY) * scale) / 2;
  const toStage = ([x, y]) => [offX + (x - minX) * scale, offY + (y - minY) * scale];
  const clip = { x0: -margin, x1: stage.width + margin, y0: -margin, y1: stage.height + margin };
  const land = [];
  const rings = [];
  for (const f of subject.geo.features) {
    const parts = [];
    for (const poly of f.geometry.coordinates)
      for (const ring of poly) {
        const cut = clipRing(ring.map(([lon, lat]) => toStage(laea(lon, lat))), clip);
        if (cut.length < 3) continue;
        const kept = [cut[0]];
        for (const p of cut.slice(1)) if (Math.abs(p[0] - kept.at(-1)[0]) + Math.abs(p[1] - kept.at(-1)[1]) >= 1) kept.push(p);
        if (kept.length < 3) continue;
        rings.push(kept);
        parts.push(`M${kept.map((p) => `${r1(p[0])} ${r1(p[1])}`).join("L")}Z`);
      }
    if (parts.length) land.push(parts.join(""));
  }
  const dots = subject.stations.map((s) => {
    const [x, y] = toStage(laea(s.lon, s.lat));
    return { x: r1(x), y: r1(y), fuel: s.fuel, mw: s.mw };
  });
  return { land, rings, dots };
}
