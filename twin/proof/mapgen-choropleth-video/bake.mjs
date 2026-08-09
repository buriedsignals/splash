// The bake for this choropleth beat: one Europe camera, one basemap capture, every study
// country's geometry projected to pixel space, kept as PARTS (`geo-discipline.md` rule 11 — see
// `geo-choropleth.ts`'s own header on `BakedShape`).
//
// Two defects this project paid for tonight, fixed here from the start rather than found again:
//   (a) `dataviz-light` paints water GREY, indistinguishable from a no-data grey (rule 7) —
//       overridden to the cartographic blue tint in the `style.load` handler, before capture.
//   (b) a plate baked at one size and drawn into a differently-sized box offsets every shape —
//       this bake is only ever called at the EXACT size the still (496) or the video (620) draws
//       the map at, never a third size.
//
// Usage:
// The plate is FROZEN BESIDE THE BEAT, for the same reason its data is: a basemap living in `/tmp`
// cannot be committed, so the delivered artifact could not be reproduced or audited — and MapTiler
// restyles, so a re-bake months later is a different picture under the same marks. The render calls
// this bake only when the beat's own plate folder is empty.
//
//   bun proof/mapgen-choropleth-video/bake.mjs --size 496   # → proof/mapgen-choropleth-video/plate-496
//   bun proof/mapgen-choropleth-video/bake.mjs --size 620   # → proof/mapgen-choropleth-video/plate-620

import { existsSync, readdirSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer";
import { CHOROPLETH_STUDY, keepRing, simplifyRing } from "./geo-choropleth.ts";

const HERE = dirname(fileURLToPath(import.meta.url));

/** The beat's camera and its label anchor — the journalist's frame, not a default. */
const BEAT = {
  // Same Europe camera this project's other Europe beats use (`twin-map-beat`'s own CO2
  // choropleth, `mapmore-dot-population`'s dot-density): near-square once projected (rule 12),
  // wide enough west to hold Iceland whole. Poland and Sweden both sit comfortably inside it —
  // Poland lon 14.1–24.1 / lat 49.0–54.8, Sweden lon 11.1–24.2 / lat 55.3–69.0.
  bounds: [
    [-26, 36],
    [33, 67],
  ],
  style: "dataviz-light",
  anchors: {
    // Inside Poland's own landmass (centroid ~19.1, 51.4), nudged east and north so the
    // right-anchored label text ("Poland", drawn growing LEFT from this point) lands centred over
    // the country rather than spilling west into Germany.
    label: [20.3, 52.2],
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
const outDir = flag("--out", join(HERE, `plate-${size}`));
const shapesPath = flag("--shapes", join(HERE, "countries.geojson"));
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
  if (!found)
    throw new Error(`no Chrome to capture with. Looked in:\n  ${candidates.join("\n  ")}`);
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

// ── The shapes, keyed the way Natural Earth actually keys them (ADM0_A3, never ISO_A3 — rule 5) ──
const collection = JSON.parse(await readFile(shapesPath, "utf8"));
const byKey = new Map();
for (const feature of collection.features) byKey.set(feature.properties.ADM0_A3, feature);
const missingShapes = CHOROPLETH_STUDY.filter((code) => !byKey.has(code));
if (missingShapes.length > 0)
  throw new Error(`${missingShapes.length} declared countries have no shape: ${missingShapes.join(", ")}`);

/**
 * Polygon PARTS, not a flattened ring list: each part is its own `[outer, ...holes]`. Kept nested
 * here so nothing downstream ever has to decide, after the fact, which ring in a flattened list
 * belonged to which landmass (rule 11's named warning).
 */
function partsOf(geometry) {
  return geometry.type === "MultiPolygon" ? geometry.coordinates : [geometry.coordinates];
}

const payload = CHOROPLETH_STUDY.map((code) => {
  const feature = byKey.get(code);
  return {
    // English only, this branch: the source's own NAME field, never NAME_FR.
    key: code,
    name: feature.properties.NAME,
    parts: partsOf(feature.geometry),
  };
});

// ── The capture ────────────────────────────────────────────────────────────────────────────────
const browser = await puppeteer.launch({
  headless: true,
  executablePath: resolveChrome(),
  args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--no-sandbox", "--hide-scrollbars"],
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
    // competes with the one label this beat draws itself.
    const hidden = [];
    for (const layer of map.getStyle().layers)
      if (layer.type === "symbol" || /border|boundary|admin/i.test(layer.id)) {
        map.setLayoutProperty(layer.id, "visibility", "none");
        hidden.push(layer.id);
      }

    // Rule 7: water is a blue tint, never grey — grey water is indistinguishable from a no-data
    // region on the same map. `dataviz-light` paints water `hsl(240, 2%, 88%)`, a near-grey; force
    // the cartographic-convention blue before the plate is ever captured.
    for (const id of ["Water", "Water shadow"])
      if (map.getLayer(id)) map.setPaintProperty(id, "fill-color", "#aac9e0");

    // Rule 1: idle OR a bounded settle, and say which. `idle` alone never fires when one tile
    // never resolves, and the capture then hangs forever rather than slowly.
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
    parts: shape.parts.map((part) => part.map((ring) => ring.map(([lng, lat]) => at(lng, lat)))),
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

// ── Cull and thin, in node, PARTS kept whole ───────────────────────────────────────────────────
const frame = { width: size, height: size };
const minGap = 0.6;
let ringsIn = 0;
let ringsOut = 0;

const shapes = projected.map((shape) => {
  // Cull ring by ring but keep the PART structure: a part survives if at least one of its own
  // rings survives the frame test. A hole surviving without its own outer would be nonsensical,
  // but this never drops a disjoint landmass (Sicily, Zealand, the Hebrides) just because it was
  // culled independently of the mainland part it has nothing geometrically to do with.
  const parts = [];
  for (const part of shape.parts) {
    const rings = [];
    for (const ring of part) {
      ringsIn++;
      if (!keepRing(ring, frame)) continue;
      rings.push(simplifyRing(ring, minGap));
      ringsOut++;
    }
    if (rings.length > 0) parts.push(rings);
  }
  return { key: shape.key, name: shape.name, parts };
});

const empty = shapes.filter((s) => s.parts.length === 0).map((s) => s.key);

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
    `geometry → ${geometryPath}  ${ringsOut}/${ringsIn} rings kept, ${shapes.length} shapes\n` +
    `off-frame entirely: ${empty.length ? empty.join(", ") : "none"}`,
);
