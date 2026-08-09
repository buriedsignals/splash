// The bake for THIS beat's flow-map (route), video genre: one camera over the Danube corridor, one
// basemap capture, the route line and the crossed territories' shapes all projected to pixel space.
//
// Camera: the SAME real bounds as `proof/mapmore-flow-danube/bake.mjs` (`geo-discipline.md` rule 12
// — "the camera is decided by the geography", not the frame someone picked; both genres of a beat
// should share one camera). What differs is the VIEWPORT this beat bakes at: the static sibling
// baked a 900×420 landscape box for a 960×780 landscape frame; this beat's video is a 1080×1080
// square frame, so its map box is placed inside that square rather than filling it edge to edge
// (rule 12's own "layout adapts to what comes back", not the plate stretched to fill a frame chosen
// first) — a 940×420 landscape box (aspect ≈2.24, close to the corridor's own real-world aspect at
// this latitude, ≈2.18), with title above and the wrapped legend below.
//
// A SECOND deliberate simplification from the two-resolution convention `twin-map-beat/SKILL.md`
// documents (still @496, video @620): this beat's still (rung 1) and video (rungs 2–3) draw their
// map box at the EXACT SAME pixel size, 940×420, so ONE bake serves both genres. Nothing in
// `geo-discipline.md` rule 2 requires two resolutions — only that a plate is drawn at the exact size
// it was baked at, which one bake trivially satisfies for both here. This halves the network/bake
// cost with no loss of correctness.
//
// Two defects the sibling static beat's own bake.mjs already found and fixed, carried forward here
// verbatim (same camera, same defects would recur otherwise): `dataviz-light` paints water GREY
// (breaks `geo-discipline.md` rule 7 — overridden below), and a plate baked at one size drawn into a
// differently-sized box offsets every mark from the coastline beneath it (this bake is only ever
// called at the exact size both `FlowMapStill.tsx` and `FlowMapVideo.tsx` draw at, 940×420).
//
// Usage:
//   bun proof/mapgen-flowmap-video/bake-plate.mjs --out /tmp/map-twin/mapgen-flowmap-video

import { existsSync, readdirSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer";
import {
  parseRouteCsv,
  territoriesCrossed,
  pointOnFeature,
  routeBBoxWithin,
  keepRing,
  simplifyRing,
} from "./geo-flow.ts";

const HERE = dirname(fileURLToPath(import.meta.url));

// The Danube corridor: source region in Baden-Württemberg to the delta near the Ukrainian border.
// Byte-identical to `proof/mapmore-flow-danube/bake.mjs`'s own `BEAT.bounds` — same real geography,
// per this file's own header note on rule 12.
const BEAT = {
  bounds: [
    [6.3, 42.6],
    [30.0, 50.1],
  ],
  style: "dataviz-light",
};

// This beat's own map-box pixel size — see this file's header for why it is one size, not two.
export const MAP_SIZE = { width: 940, height: 420 };

const MAPLIBRE = "https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.js";
const MAPLIBRE_CSS = "https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.css";

const argv = process.argv.slice(2);
const flag = (name, fallback) => {
  const at = argv.indexOf(name);
  return at >= 0 ? argv[at + 1] : fallback;
};

const { width, height } = MAP_SIZE;
const outDir = flag("--out", `/tmp/map-twin/mapgen-flowmap-video`);
const routePath = flag("--route", join(HERE, "danube-route.csv"));
const countriesPath = flag("--countries", join(HERE, "countries.geojson"));
const settleMs = Number(flag("--settle", "15000"));
const keyPath = flag("--env", join(HERE, "../../.env"));

function resolveChrome() {
  const candidates = [];
  if (process.env.CHROME_PATH) candidates.push(process.env.CHROME_PATH);
  const cache = join(homedir(), ".cache/puppeteer/chrome");
  if (existsSync(cache))
    for (const build of readdirSync(cache).sort().reverse())
      candidates.push(
        join(cache, build, "chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing"),
        join(cache, build, "chrome-mac-x64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing"),
        join(cache, build, "chrome-linux64/chrome"),
      );
  candidates.push("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome");
  const found = candidates.find((path) => existsSync(path));
  if (!found) throw new Error(`no Chrome to capture with. Looked in:\n  ${candidates.join("\n  ")}`);
  return found;
}

function parseEnvFile(text) {
  const env = {};
  for (const line of text.split(/\r?\n/)) {
    const match = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(\S+)\s*$/.exec(line);
    if (match) env[match[1]] = match[2];
  }
  return env;
}

const MAPTILER_KEY_ALIASES = ["MAPTILER_API_KEY", "REMOTION_MAPTILER_KEY", "VITE_MAPTILER_KEY"];
const env = parseEnvFile(await readFile(keyPath, "utf8"));
const key = env.MAPTILER_KEY ?? MAPTILER_KEY_ALIASES.map((a) => env[a]).find(Boolean);
if (!key) throw new Error(`no MAPTILER_KEY in ${keyPath}`);

// ── The route and the territories it computes as crossed ──────────────────────────────────────
const route = parseRouteCsv(await readFile(routePath, "utf8"));
const collection = JSON.parse(await readFile(countriesPath, "utf8"));
const territories = collection.features.map((f) => ({
  key: f.properties.ADM0_A3,
  name: f.properties.NAME_FR ?? f.properties.NAME,
  geometry: f.geometry,
}));

const crossings = territoriesCrossed(route, territories);
if (crossings.length === 0) throw new Error("the route crosses no declared territory — nothing to bake");
console.log(`crossings, in order: ${crossings.map((c) => c.key).join(" -> ")}`);

// Each anchor is computed against the part of the territory the route is ACTUALLY in (see
// `routeBBoxWithin`'s own doc-comment) — never the country's whole national visual centre, which
// can sit far outside this beat's own frame for a territory the route only clips the corner of.
const anchorsLonLat = crossings.map((c) => {
  const t = territories.find((t) => t.key === c.key);
  const box = routeBBoxWithin(route, t.geometry, 0.6);
  return { key: c.key, lonlat: pointOnFeature(t.geometry, box) };
});

const crossedGeometry = new Map(territories.map((t) => [t.key, t.geometry]));

// ── The capture ────────────────────────────────────────────────────────────────────────────────
const browser = await puppeteer.launch({
  headless: true,
  executablePath: resolveChrome(),
  args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--no-sandbox", "--hide-scrollbars"],
});
const page = await browser.newPage();
await page.setViewport({ width, height, deviceScaleFactor: 2 });
await page.setContent(
  `<!doctype html><html><head>
<link href="${MAPLIBRE_CSS}" rel="stylesheet"/>
<script src="${MAPLIBRE}"></script>
<style>html,body{margin:0;padding:0}#map{width:${width}px;height:${height}px}</style>
</head><body><div id="map"></div></body></html>`,
  { waitUntil: "load" },
);
await page.waitForFunction("window.maplibregl !== undefined", { timeout: 60000 });

// Rule 1: gate on `idle` OR a bounded settle timeout, whichever comes first, and record which
// fired — the single invariant that makes this bake finishable rather than a hang.
const gate = await page.evaluate(
  async ({ key, style, bounds, settleMs }) => {
    const map = new maplibregl.Map({
      container: "map",
      style: `https://api.maptiler.com/maps/${style}/style.json?key=${key}`,
      interactive: false,
      attributionControl: false,
      fadeDuration: 0,
      preserveDrawingBuffer: true,
      bounds,
      fitBoundsOptions: { padding: 0, animate: false },
    });
    window.__map = map;
    await new Promise((resolve) => map.once("style.load", resolve));

    // Rule 9: quiet the plate — hide labels and the provider's own boundary lines.
    const hidden = [];
    for (const layer of map.getStyle().layers)
      if (layer.type === "symbol" || /border|boundary|admin/i.test(layer.id)) {
        map.setLayoutProperty(layer.id, "visibility", "none");
        hidden.push(layer.id);
      }
    // Rule 7: water must read as a blue tint, never grey. `dataviz-light` paints water near-grey.
    for (const id of ["Water", "Water shadow"]) if (map.getLayer(id)) map.setPaintProperty(id, "fill-color", "#aac9e0");

    const started = Date.now();
    const how = await new Promise((resolve) => {
      let done = false;
      const finish = (how) => {
        if (!done) {
          done = true;
          resolve(how);
        }
      };
      map.once("idle", () => finish("idle"));
      setTimeout(() => finish("settle"), settleMs);
    });
    return { how, ms: Date.now() - started, hidden: hidden.length, zoom: map.getZoom() };
  },
  { key, style: BEAT.style, bounds: BEAT.bounds, settleMs },
);

await mkdir(outDir, { recursive: true });
const platePath = join(outDir, "plate.png");
await page.screenshot({ path: platePath, clip: { x: 0, y: 0, width, height } });

// ── The projection ────────────────────────────────────────────────────────────────────────────
function ringsOf(geometry) {
  const polygons = geometry.type === "MultiPolygon" ? geometry.coordinates : [geometry.coordinates];
  return polygons.flat();
}

const territoryPayload = crossings.map((c) => ({
  key: c.key,
  rings: ringsOf(crossedGeometry.get(c.key)),
}));

const projected = await page.evaluate(
  ({ territoryPayload, routeCoords, anchors }) => {
    const map = window.__map;
    const at = (lng, lat) => {
      const p = map.project([lng, lat]);
      return [Math.round(p.x * 10) / 10, Math.round(p.y * 10) / 10];
    };
    return {
      territories: territoryPayload.map((t) => ({
        key: t.key,
        rings: t.rings.map((ring) => ring.map(([lng, lat]) => at(lng, lat))),
      })),
      route: routeCoords.map(([lng, lat]) => at(lng, lat)),
      anchors: anchors.map((a) => ({ key: a.key, px: at(...a.lonlat) })),
    };
  },
  { territoryPayload, routeCoords: route, anchors: anchorsLonLat },
);

await browser.close();

// ── Cull and thin, in node, with the pure functions the tests cover ────────────────────────────
const frame = { width, height };
const minGap = 0.6;

const territoriesOut = projected.territories.map((t) => {
  const rings = [];
  for (const ring of t.rings) {
    if (!keepRing(ring, frame)) continue;
    rings.push(simplifyRing(ring, minGap));
  }
  return { key: t.key, rings };
});

const empty = territoriesOut.filter((t) => t.rings.length === 0).map((t) => t.key);
if (empty.length > 0)
  console.warn(`WARNING: entirely off-frame after culling (label/route may still be nearby): ${empty.join(", ")}`);

const geometry = {
  frame,
  bounds: BEAT.bounds,
  style: BEAT.style,
  gatedBy: gate.how,
  zoom: Math.round(gate.zoom * 1000) / 1000,
  crossings: crossings.map((c) => c.key),
  anchors: Object.fromEntries(projected.anchors.map((a) => [a.key, a.px])),
  territories: territoriesOut,
  route: projected.route,
};
const geometryPath = join(outDir, "geometry.json");
await writeFile(geometryPath, JSON.stringify(geometry));

console.log(
  `gated by ${gate.how} in ${gate.ms}ms · hid ${gate.hidden} basemap layers · zoom ${geometry.zoom}\n` +
    `plate    → ${platePath}\n` +
    `geometry → ${geometryPath}  ${territoriesOut.length} territories, ${projected.route.length} route points`,
);
