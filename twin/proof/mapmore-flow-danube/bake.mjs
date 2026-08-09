// The bake for the flow-map (route) beat: one camera over the Danube corridor, one basemap
// capture, the route line and the crossed territories' shapes all projected to pixel space.
//
// Two defects fixed here that `twin-map-beat/SKILL.md` and `map-quake-density/bake.mjs` both
// flag as landmines for the next map beat: `dataviz-light` paints water GREY (breaks the
// water/land/no-data colour discipline — `geo-discipline.md` rule 7 — so it is overridden below,
// same fix as the hex-grid beat), and a plate baked at one size drawn into a differently-sized box
// offsets every mark from the coastline beneath it — this bake is only ever called at the exact
// size the still draws at.
//
// Usage:
//   bun proof/mapmore-flow-danube/bake.mjs --size 900x420 --out /tmp/map-twin/mapmore-flow-900x420

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
// Landscape, because the journey itself runs west to east far more than north to south.
const BEAT = {
  bounds: [
    [6.3, 42.6],
    [30.0, 50.1],
  ],
  style: "dataviz-light",
};

const MAPLIBRE = "https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.js";
const MAPLIBRE_CSS = "https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.css";

const argv = process.argv.slice(2);
const flag = (name, fallback) => {
  const at = argv.indexOf(name);
  return at >= 0 ? argv[at + 1] : fallback;
};

const [width, height] = flag("--size", "900x420").split("x").map(Number);
const outDir = flag("--out", `/tmp/map-twin/mapmore-flow-${width}x${height}`);
const routePath = flag("--route", join(HERE, "danube-route.csv"));
const countriesPath = flag("--countries", join(HERE, "countries.geojson"));
const settleMs = Number(flag("--settle", "20000"));
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
    // Defect fixed tonight (see this file's own header note): `dataviz-light` paints water GREY,
    // which is indistinguishable from a no-data grey under `geo-discipline.md` rule 7. Force the
    // cartographic-convention blue tint instead.
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
