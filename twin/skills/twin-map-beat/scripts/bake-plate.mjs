// twin/skills/twin-map-beat/scripts/bake-plate.mjs
//
// The bake. One camera, one basemap capture, one file of pixel-space geometry — and after this
// runs, nothing downstream needs a map at all: the still path and the video path both draw an
// image and a set of paths.
//
// This is `geo-discipline.md` rules 1, 2, 3, 4, 6 and 11 in one script:
//   1. the frame gate is `idle` OR a bounded settle, and it records which one fired;
//   2. the plate is fixed, so no genre re-renders tiles per frame and shimmers;
//   3. the shapes are baked to ordered pixel rings HERE — a provider basemap serves administrative
//      boundary LINES, never polygons, so a choropleth's shapes can never come from the tiles;
//   4. the anchors a label will hang from are projected here too, by `map.project()`;
//  11. rings are culled by their projected box, and a ring several frames wide is a wrap, not a
//      country.
//
// Usage:
//   bun skills/twin-map-beat/scripts/bake-plate.mjs --size 620 --out /tmp/map-twin/plate-620
//   bun skills/twin-map-beat/scripts/bake-plate.mjs --size 1080 --out /tmp/map-twin/plate-1080

import { existsSync, readdirSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import puppeteer from "puppeteer";
import { CO2_STUDY, keepRing, simplifyRing } from "../assets/geo.ts";

/** The beat's camera and its anchors — the journalist's frame, not a default. */
const BEAT = {
  // Europe as this story means it: Gibraltar to the Arctic circle, Ireland to the Black Sea. The
  // box is near-square on purpose (rule 12) — a landscape frame that holds this much latitude also
  // holds the mid-Atlantic and a third of North Africa.
  bounds: [
    [-9, 36],
    [31, 67],
  ],
  style: "dataviz-light",
  anchors: {
    // The centre of the subject, where its outline is pointed at.
    subject: [8.23, 46.8],
    // Where the subject's own label hangs, immediately west of it. Data, not a pixel constant:
    // the layout moves when the camera does.
    label: [6.05, 46.62],
  },
};

const MAPLIBRE = "https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.js";
const MAPLIBRE_CSS = "https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.css";

const argv = process.argv.slice(2);
const flag = (name, fallback) => {
  const at = argv.indexOf(name);
  return at >= 0 ? argv[at + 1] : fallback;
};

const size = Number(flag("--size", "620"));
const outDir = flag("--out", `/tmp/map-twin/plate-${size}`);
const shapesPath = flag("--shapes", "/tmp/map-twin/ne50.geojson");
const settleMs = Number(flag("--settle", "15000"));
const keyPath = flag("--env", new URL("../../../.env", import.meta.url).pathname);

/**
 * Headless Chrome has to be FOUND before it can be gated (rule 6). puppeteer's own download is
 * missing on a clean install often enough that the chart genre wrote the same note; this resolves
 * the candidates in order and fails naming every path it looked in.
 */
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
  if (!found)
    throw new Error(
      `no Chrome to capture with. Looked in:\n  ${candidates.join("\n  ")}\nSet CHROME_PATH, or run: bunx puppeteer browsers install chrome`,
    );
  return found;
}

const key = (await readFile(keyPath, "utf8")).match(/MAPTILER_KEY=(\S+)/)?.[1];
if (!key) throw new Error(`no MAPTILER_KEY in ${keyPath}`);

// ── The shapes, keyed the way Natural Earth actually keys them ─────────────────────────────────
const collection = JSON.parse(await readFile(shapesPath, "utf8"));
const byKey = new Map();
for (const feature of collection.features) {
  // ADM0_A3, never ISO_A3: France, Norway and Kosovo carry ISO_A3 = "-99" (rule 5).
  byKey.set(feature.properties.ADM0_A3, feature);
}
const missingShapes = CO2_STUDY.filter((code) => !byKey.has(code));
if (missingShapes.length > 0)
  throw new Error(`${missingShapes.length} declared countries have no shape: ${missingShapes.join(", ")}`);

/** MultiPolygon and Polygon both become a flat list of rings; holes are rings too. */
function ringsOf(geometry) {
  const polygons = geometry.type === "MultiPolygon" ? geometry.coordinates : [geometry.coordinates];
  return polygons.flat();
}

const payload = CO2_STUDY.map((code) => {
  const feature = byKey.get(code);
  return {
    key: code,
    name: feature.properties.NAME_FR ?? feature.properties.NAME,
    rings: ringsOf(feature.geometry),
  };
});

// ── The capture ────────────────────────────────────────────────────────────────────────────────
const browser = await puppeteer.launch({
  headless: true,
  executablePath: resolveChrome(),
  args: [
    "--use-gl=angle",
    "--use-angle=swiftshader",
    "--enable-unsafe-swiftshader",
    "--no-sandbox",
    "--hide-scrollbars",
  ],
});
const page = await browser.newPage();
await page.setViewport({ width: size, height: size, deviceScaleFactor: 2 });
await page.setContent(
  `<!doctype html><html><head>
<link href="${MAPLIBRE_CSS}" rel="stylesheet"/>
<script src="${MAPLIBRE}"></script>
<style>html,body{margin:0;padding:0}#map{width:${size}px;height:${size}px}</style>
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
      // Without this the WebGL canvas is empty by the time a screenshot reads it (rule 6).
      preserveDrawingBuffer: true,
      bounds,
      fitBoundsOptions: { padding: 0, animate: false },
    });
    window.__map = map;
    await new Promise((resolve) => map.once("style.load", resolve));

    // Rule 9: quiet the plate. Every place label, road label and boundary line the provider ships
    // is a layer doing none of the five jobs here — and an unlabelled dark region is the only way a
    // map stays discreet about a country the prose has already named.
    const hidden = [];
    for (const layer of map.getStyle().layers)
      if (layer.type === "symbol" || /border|boundary|admin/i.test(layer.id)) {
        map.setLayoutProperty(layer.id, "visibility", "none");
        hidden.push(layer.id);
      }

    // Rule 1: idle OR a bounded settle, and say which. `idle` alone never fires when one tile never
    // resolves, and the capture then hangs forever rather than slowly.
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
    return { how, ms: Date.now() - started, hidden: hidden.length, zoom: map.getZoom(), center: map.getCenter() };
  },
  { key, style: BEAT.style, bounds: BEAT.bounds, settleMs },
);

await mkdir(outDir, { recursive: true });
const platePath = join(outDir, "plate.png");
await page.screenshot({ path: platePath, clip: { x: 0, y: 0, width: size, height: size } });

// ── The projection (rule 3 and rule 4) ─────────────────────────────────────────────────────────
const projected = await page.evaluate((shapes) => {
  const map = window.__map;
  const at = (lng, lat) => {
    const p = map.project([lng, lat]);
    return [Math.round(p.x * 10) / 10, Math.round(p.y * 10) / 10];
  };
  return shapes.map((shape) => ({
    key: shape.key,
    name: shape.name,
    rings: shape.rings.map((ring) => ring.map(([lng, lat]) => at(lng, lat))),
  }));
}, payload);

const anchors = await page.evaluate((points) => {
  const map = window.__map;
  return Object.fromEntries(
    Object.entries(points).map(([name, [lng, lat]]) => {
      const p = map.project([lng, lat]);
      return [name, [Math.round(p.x * 10) / 10, Math.round(p.y * 10) / 10]];
    }),
  );
}, BEAT.anchors);

await browser.close();

// ── Cull and thin, in node, with the pure functions the tests cover ────────────────────────────
const frame = { width: size, height: size };
const minGap = 0.6;
let ringsIn = 0;
let ringsOut = 0;
let pointsIn = 0;
let pointsOut = 0;

const shapes = projected.map((shape) => {
  const rings = [];
  for (const ring of shape.rings) {
    ringsIn++;
    pointsIn += ring.length;
    if (!keepRing(ring, frame)) continue;
    const thin = simplifyRing(ring, minGap);
    ringsOut++;
    pointsOut += thin.length;
    rings.push(thin);
  }
  return { key: shape.key, name: shape.name, rings };
});

const empty = shapes.filter((s) => s.rings.length === 0).map((s) => s.key);

const geometry = {
  frame,
  bounds: BEAT.bounds,
  style: BEAT.style,
  gatedBy: gate.how,
  zoom: Math.round(gate.zoom * 1000) / 1000,
  anchors,
  shapes,
};
const geometryPath = join(outDir, "geometry.json");
await writeFile(geometryPath, JSON.stringify(geometry));

console.log(
  `gated by ${gate.how} in ${gate.ms}ms · hid ${gate.hidden} basemap layers · zoom ${geometry.zoom}\n` +
    `plate    → ${platePath}\n` +
    `geometry → ${geometryPath}  ${ringsOut}/${ringsIn} rings, ${pointsOut}/${pointsIn} points\n` +
    `off-frame entirely: ${empty.length ? empty.join(", ") : "none"}`,
);
