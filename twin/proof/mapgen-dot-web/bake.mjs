// The bake for the dot-density WEB beat: one Europe camera, one basemap capture, every study
// country's shape projected to pixel space so the scatter can be rejection-sampled inside it.
//
// THE PLATE IS FROZEN BESIDE THE BEAT, in `plate/`, and committed with it — a basemap living in
// `/tmp` cannot be committed, so a delivered artifact drawn over it can be neither reproduced nor
// audited, and MapTiler restyles, so a re-bake months later is a different picture under the same
// dots. `render-web.mjs` calls this only when `plate/` is empty; a warm run never touches the
// network.
//
// `dataviz-light` paints water GREY (`hsl(240, 2%, 88%)`), indistinguishable from a no-data grey —
// overridden to the cartographic blue tint below, before capture. On a dot beat the correction is
// load-bearing rather than cosmetic: the dots are the only ink over most of the frame, so every sea
// and the whole Atlantic would otherwise read as "no data here" instead of "no land here".
//
// SIZE: baked generously — 1000 x 1000 logical px, ~2000 x 2000 physical at the capture's own 2x
// device pixel ratio — and scaled UNIFORMLY within that by the page, never stretched. The shape is
// the camera's own: the box below spans 66° of longitude against 66.5° of Mercator-equivalent
// latitude, so a square frame wastes almost no ocean on either axis. The dot scatter is computed in
// THIS frame's pixel space, so the bake size and the geometry the render reads are always the same
// one file.
//
// Usage:
//   bun proof/mapgen-dot-web/bake.mjs --size 1000x1000        # → proof/mapgen-dot-web/plate

import { existsSync, readdirSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer";

const HERE = dirname(fileURLToPath(import.meta.url));

// The camera, chosen from THIS study set's own geography (geo-discipline.md rule 12) rather than
// inherited. It is deliberately wider than `proof/mapmore-dot-population`'s [[-26,36],[33,67]], and
// the reason is a measured defect in that frame: dots are scattered inside a country's own polygon,
// so any territory that falls outside the frame takes its share of that country's dots with it and
// the clip hides them. Measured on the [[-26,36],[33,67]] bake: only 58% of Norway's outline points,
// 65% of Ukraine's, 72% of Finland's and 47% of Malta's landed inside the frame — four study
// countries whose visible cloud understates their population, on a map whose whole argument is
// which clouds are biggest.
//
// The box below is the study set's own mainland extent, read out of `countries.geojson` and padded
// to nothing: Iceland reaches -24.5° W, Ukraine 40.1° E, Crete 34.9° N, Norway's North Cape 71.2° N.
// It is also near-square once projected (66° of longitude against 66.5° of Mercator-equivalent
// latitude), which is why the default bake is 1000 x 1000.
//
// What is still outside it, culled ring by ring at the bake and named in the beat's own caveat: the
// far territories the geojson carries under a European country's code — Svalbard and Jan Mayen
// (Norway, to 80.5° N), the Azores and Madeira (Portugal, to 31.3° W), the Canaries (Spain), the
// Caribbean Netherlands, and France's overseas departments (to 61.8° W and 21.4° S).
const BEAT = {
  bounds: [
    [-25, 34.5],
    [41, 71.5],
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

const [width, height] = flag("--size", "1000x1000").split("x").map(Number);
const outDir = flag("--out", join(HERE, "plate"));
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

const collection = JSON.parse(await readFile(countriesPath, "utf8"));
const shapes = collection.features.map((f) => ({
  key: f.properties.ADM0_A3,
  name: f.properties.NAME, // the English name; this beat declares lang="en" and its csv is English
  geometry: f.geometry,
}));

/**
 * Polygon PARTS, not a flattened ring list: each part is its own `[outer, ...holes]`. A flattened
 * list loses which rings belong to which part — for a MultiPolygon shape (France's mainland +
 * Corsica, this beat's own caught defect: every dot for France landed crammed onto Corsica's tiny
 * bbox because the flattened list's second ring, Corsica's own outer boundary, was read as a HOLE
 * to cut out of whichever ring happened to sort first). Kept nested here so `geo-dot.ts`'s own
 * scatter can sample each disjoint landmass on its own bbox, with its own holes.
 */
function partsOf(geometry) {
  return geometry.type === "MultiPolygon" ? geometry.coordinates : [geometry.coordinates];
}

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

    const hidden = [];
    for (const layer of map.getStyle().layers)
      if (layer.type === "symbol" || /border|boundary|admin/i.test(layer.id)) {
        map.setLayoutProperty(layer.id, "visibility", "none");
        hidden.push(layer.id);
      }
    // Defect fixed tonight: `dataviz-light` paints water GREY — indistinguishable from a no-data
    // grey (geo-discipline.md rule 7). Force the cartographic-convention blue tint.
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

const payload = shapes.map((s) => ({ key: s.key, parts: partsOf(s.geometry) }));

const projected = await page.evaluate((shapes) => {
  const map = window.__map;
  const at = (lng, lat) => {
    const p = map.project([lng, lat]);
    return [Math.round(p.x * 10) / 10, Math.round(p.y * 10) / 10];
  };
  return shapes.map((shape) => ({
    key: shape.key,
    parts: shape.parts.map((part) => part.map((ring) => ring.map(([lng, lat]) => at(lng, lat)))),
  }));
}, payload);

await browser.close();

// ── Cull and thin, in node ────────────────────────────────────────────────────────────────────
const frame = { width, height };
const minGap = 0.6;

function simplifyRing(ring, gap) {
  if (ring.length <= 3) return ring;
  const kept = [ring[0]];
  for (let i = 1; i < ring.length - 1; i++) {
    const last = kept[kept.length - 1];
    const point = ring[i];
    if (Math.hypot(point[0] - last[0], point[1] - last[1]) >= gap) kept.push(point);
  }
  kept.push(ring[ring.length - 1]);
  return kept.length >= 3 ? kept : ring.slice(0, 3);
}
function keepRing(ring, frame, margin = 40) {
  if (ring.length < 3) return false;
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const [x, y] of ring) {
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }
  if (maxX - minX > frame.width * 3) return false;
  return maxX >= -margin && minX <= frame.width + margin && maxY >= -margin && minY <= frame.height + margin;
}

const shapesOut = projected.map((s) => {
  // Cull ring by ring but keep the PART structure: a part is dropped only once every one of its
  // own rings (its outer boundary included) is off-frame — a hole surviving without its own outer
  // would be nonsensical, but this never drops a disjoint landmass (Corsica, an overseas department)
  // just because it is culled to nothing separately from the mainland part.
  const parts = [];
  for (const part of s.parts) {
    const rings = [];
    for (const ring of part) {
      if (!keepRing(ring, frame)) continue;
      rings.push(simplifyRing(ring, minGap));
    }
    if (rings.length > 0) parts.push(rings);
  }
  return { key: s.key, parts };
});

const empty = shapesOut.filter((s) => s.parts.length === 0).map((s) => s.key);

const geometry = {
  frame,
  bounds: BEAT.bounds,
  style: BEAT.style,
  gatedBy: gate.how,
  zoom: Math.round(gate.zoom * 1000) / 1000,
  shapes: shapesOut,
};
const geometryPath = join(outDir, "geometry.json");
await writeFile(geometryPath, JSON.stringify(geometry));

console.log(
  `gated by ${gate.how} in ${gate.ms}ms · hid ${gate.hidden} basemap layers · zoom ${geometry.zoom}\n` +
    `plate    → ${platePath}\n` +
    `geometry → ${geometryPath}  ${shapesOut.length} shapes\n` +
    `off-frame entirely: ${empty.length ? empty.join(", ") : "none"}`,
);
