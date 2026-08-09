// twin/proof/mapgen-locator-web/bake-plate.mjs
//
// The bake for the locator-web beat: one camera over central Geneva, one basemap capture, the
// eleven study-set points projected. No polygons, no join — a locator has neither
// (`twin-map-beat/references/types/locator.md`: "position only").
//
// Baked at the EXACT pixel size this beat's own desktop `WebLayout` displays the plate at (420px,
// `LocatorWeb.tsx`'s `DESKTOP_LAYOUT.mapSize`) — not a larger size scaled down at draw time. The
// narrow layout still reuses this ONE plate (`scale = mapSize / geometry.frame.width` at draw time
// handles the further downscale to 324px cleanly, same as `twin-map-web`'s own seed), but the
// desktop layout — the one most readers see first — gets the plate at its own true pixel size, no
// scale factor between bake and draw for that layout.
//
// This is `twin-doctrine/references/geo-discipline.md` rules 1, 2, 4, 6, 7 in one script (rule 3
// does not apply — nothing here is a polygon):
//   1. the frame gate is `idle` OR a bounded settle, and it records which one fired;
//   2. the plate is fixed, so both responsive layouts this genre ships never re-render tiles;
//   4. each point's own label is placed at its OWN projected pixel, in this beat's own typography
//      (done in `LocatorWeb.tsx`, not here — this script only projects and records);
//   6. capture plumbing — `preserveDrawingBuffer`, `--use-gl=angle`, a resolved Chrome path;
//   7. water reads as a blue tint, never MapTiler's own near-grey — a point-based beat leaves
//      nearly the whole plate exposed as basemap, so this matters MORE here than on a choropleth.
//
// This is this beat's OWN copy of the bake — never an import of `twin-map-web`'s or
// `proof/map-geneva-locator`'s own `bake.mjs` (a beat's pure core and its bake are its own; see
// `mapmore-flow-danube/geo-flow.ts`'s own header for why).
//
// Usage:
//   bun proof/mapgen-locator-web/bake-plate.mjs --size 420   # → proof/mapgen-locator-web/plate

import { existsSync, readdirSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer";
import { orgsFromCsv } from "./geo-locator.ts";

const HERE = dirname(fileURLToPath(import.meta.url));

// The camera: the SAME real bounds `proof/map-geneva-locator/bake.mjs` uses — central Geneva,
// padded so no marker sits on the frame edge (the study set spans lon 6.122-6.192, lat
// 46.192-46.234; WEF, in Cologny, is the easternmost point). Same real geography, not code reuse.
const BEAT = {
  bounds: [
    [6.09, 46.165],
    [6.225, 46.26],
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

// 420 — this beat's own DESKTOP_LAYOUT.mapSize (LocatorWeb.tsx), not the 496 the web seed uses for
// its own, different layout.
const size = Number(flag("--size", "420"));
const outDir = flag("--out", join(HERE, "plate"));
const csvPath = flag("--data", join(HERE, "geneva-orgs.csv"));
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
  if (!found)
    throw new Error(
      `no Chrome to capture with. Looked in:\n  ${candidates.join("\n  ")}\nSet CHROME_PATH, or run: bunx puppeteer browsers install chrome`,
    );
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
if (!key) throw new Error(`no MAPTILER_KEY (or alias: ${MAPTILER_KEY_ALIASES.join(", ")}) in ${keyPath}`);

const orgs = orgsFromCsv(await readFile(csvPath, "utf8"));

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
      preserveDrawingBuffer: true,
      bounds,
      fitBoundsOptions: { padding: 0, animate: false },
    });
    window.__map = map;
    await new Promise((resolve) => map.once("style.load", resolve));

    // Rule 9: quiet the plate. Every place label, road label and boundary line the provider ships
    // is a layer doing none of the five jobs here — the markers and this beat's own labels carry it.
    const hidden = [];
    for (const layer of map.getStyle().layers)
      if (layer.type === "symbol" || /border|boundary|admin/i.test(layer.id)) {
        map.setLayoutProperty(layer.id, "visibility", "none");
        hidden.push(layer.id);
      }
    // Rule 7: water reads as a blue tint, never the style's own near-grey.
    for (const id of ["Water", "Water shadow"])
      if (map.getLayer(id)) map.setPaintProperty(id, "fill-color", "#aac9e0");

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

const projected = await page.evaluate((points) => {
  const map = window.__map;
  return points.map(({ key, lon, lat }) => {
    const p = map.project([lon, lat]);
    return [key, Math.round(p.x * 10) / 10, Math.round(p.y * 10) / 10];
  });
}, orgs.map(({ key, lon, lat }) => ({ key, lon, lat })));

await browser.close();

const pxOf = new Map(projected.map(([key, x, y]) => [key, [x, y]]));
const points = orgs.map((o) => {
  const [px, py] = pxOf.get(o.key);
  return { ...o, px, py };
});

const frame = { width: size, height: size };
const offFrame = points.filter((p) => p.px < 0 || p.px > frame.width || p.py < 0 || p.py > frame.height);

const geometry = {
  frame,
  bounds: BEAT.bounds,
  style: BEAT.style,
  gatedBy: gate.how,
  zoom: Math.round(gate.zoom * 1000) / 1000,
  points,
};
const geometryPath = join(outDir, "geometry.json");
await writeFile(geometryPath, JSON.stringify(geometry));

console.log(
  `gated by ${gate.how} in ${gate.ms}ms · hid ${gate.hidden} basemap layers · zoom ${geometry.zoom}\n` +
    `plate    → ${platePath}\n` +
    `geometry → ${geometryPath}  ${points.length} points\n` +
    `off-frame: ${offFrame.length ? offFrame.map((p) => p.name).join(", ") : "none"}`,
);
