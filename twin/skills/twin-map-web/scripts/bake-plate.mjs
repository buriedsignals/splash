// twin/skills/twin-map-web/scripts/bake-plate.mjs
//
// The bake for the web genre's proportional-symbol seed: one camera, one basemap capture, one
// file of projected point positions. No polygon rings and no data join — a symbol map has neither
// (`twin-map-beat/references/types/proportional-symbol.md`: "there is no data JOIN for this
// type") — so this is a lighter bake than a choropleth's: points in, projected pixels out.
//
// After this runs there is no map anywhere in this skill, same invariant `twin-map-beat` ships:
// the interactive HTML draws an `<image>` and some `<circle>`s through `render-web.mjs`.
//
// This is `twin-doctrine/references/geo-discipline.md` rules 1, 2, 4, 6 in one script (rule 3 does
// not apply — nothing here is a polygon) — read before touching this file:
//   1. the frame gate is `idle` OR a bounded settle, and it records which one fired;
//   2. the plate is fixed, so the two responsive layouts this genre ships never re-render tiles;
//   4. each point's own label is placed at its OWN projected pixel, in this beat's own typography;
//   6. capture plumbing — `preserveDrawingBuffer`, `--use-gl=angle`, a resolved Chrome path.
// Rule 7 (water reads as a blue tint, never grey) applies here MORE than to a choropleth: a
// point-based beat leaves nearly the whole plate exposed as basemap, so MapTiler's own
// `dataviz-light` near-grey water (`hsl(240, 2%, 88%)`) would be visible everywhere between the
// circles rather than hidden under polygon fills — this is the render that actually looks at it.
//
// A skill directory has to build after being copied into a journalist's root, so nothing under a
// skill may import out of it (`splash-twin/test/no-cross-skill-imports.test.ts` fails loud on any
// specifier that does) — this file is this skill's OWN copy of the bake, not an import of
// `twin-map-beat`'s or `proof/map-quake-symbol`'s.
//
// Usage:
//   bun skills/twin-map-web/scripts/bake-plate.mjs --size 496 --out /tmp/map-twin-web/plate-496

import { existsSync, readdirSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer";
import { keepPoint } from "../assets/geo-symbol.ts";

const HERE = dirname(fileURLToPath(import.meta.url));

/**
 * The camera: a box around this beat's own sample of European metro areas (Lisbon to Athens,
 * Athens to Stockholm), padded so no circle sits on the frame edge — the same reasoning
 * `twin-map-beat/scripts/bake-plate.mjs` gives for its own wider Europe box, applied to a smaller
 * study set. Chosen from the geography, not a default (`geo-discipline.md` rule 12): the study
 * set's own lon/lat extent is roughly -9.1..23.7 / 38.0..59.3, padded ~5° on every side.
 */
const BEAT = {
  bounds: [
    [-14, 34],
    [28, 64],
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

const size = Number(flag("--size", "496"));
const outDir = flag("--out", `/tmp/map-twin-web/plate-${size}`);
const dataPath = flag("--data", join(HERE, "../assets/sample-data/regions.json"));
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

// A DUPLICATE of splash-twin's own key-alias resolution, not an import — a skill directory has to
// stay copy-pasteable on its own (see `twin-map-beat/scripts/bake-plate.mjs`'s own header note for
// the same rule applied there). Canonical name wins when both happen to be set.
const MAPTILER_KEY_ALIASES = ["MAPTILER_API_KEY", "REMOTION_MAPTILER_KEY", "VITE_MAPTILER_KEY"];

/** Parses `KEY=value` lines from a `.env` file's text into a plain object — one pair per line. */
function parseEnvFile(text) {
  const env = {};
  for (const line of text.split(/\r?\n/)) {
    const match = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(\S+)\s*$/.exec(line);
    if (match) env[match[1]] = match[2];
  }
  return env;
}

const env = parseEnvFile(await readFile(keyPath, "utf8"));
const key = env.MAPTILER_KEY ?? MAPTILER_KEY_ALIASES.map((alias) => env[alias]).find(Boolean);
if (!key) throw new Error(`no MAPTILER_KEY (or alias: ${MAPTILER_KEY_ALIASES.join(", ")}) in ${keyPath}`);

const points = JSON.parse(await readFile(dataPath, "utf8"));

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
    // is a layer doing none of the five jobs here — the circles and this beat's own labels carry it.
    const hidden = [];
    for (const layer of map.getStyle().layers)
      if (layer.type === "symbol" || /border|boundary|admin/i.test(layer.id)) {
        map.setLayoutProperty(layer.id, "visibility", "none");
        hidden.push(layer.id);
      }

    // Rule 7: water reads as a blue tint, never grey — see this file's own header note. Left
    // uncorrected, MapTiler's `dataviz-light` water is close enough to grey to read as no-data on
    // a beat where the ocean is not covered by anything else.
    for (const id of ["Water", "Water shadow"])
      if (map.getLayer(id)) map.setPaintProperty(id, "fill-color", "#aac9e0");

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
    return { how, ms: Date.now() - started, hidden: hidden.length, zoom: map.getZoom() };
  },
  { key, style: BEAT.style, bounds: BEAT.bounds, settleMs },
);

await mkdir(outDir, { recursive: true });
const platePath = join(outDir, "plate.png");
await page.screenshot({ path: platePath, clip: { x: 0, y: 0, width: size, height: size } });

// ── The projection (rule 4) ────────────────────────────────────────────────────────────────────
const projected = await page.evaluate((rows) => {
  const map = window.__map;
  return rows.map(({ key, lon, lat }) => {
    const p = map.project([lon, lat]);
    return [key, Math.round(p.x * 10) / 10, Math.round(p.y * 10) / 10];
  });
}, points.map(({ key, lon, lat }) => ({ key, lon, lat })));

await browser.close();

const pxOf = new Map(projected.map(([key, x, y]) => [key, [x, y]]));
const projectedPoints = points.map((p) => {
  const [px, py] = pxOf.get(p.key);
  return { ...p, px, py };
});

const frame = { width: size, height: size };
const offFrame = projectedPoints.filter((p) => !keepPoint(p, frame)).map((p) => p.name);

const geometry = {
  frame,
  bounds: BEAT.bounds,
  style: BEAT.style,
  gatedBy: gate.how,
  zoom: Math.round(gate.zoom * 1000) / 1000,
  points: projectedPoints,
};
const geometryPath = join(outDir, "geometry.json");
await writeFile(geometryPath, JSON.stringify(geometry));

console.log(
  `gated by ${gate.how} in ${gate.ms}ms · hid ${gate.hidden} basemap layers · zoom ${geometry.zoom}\n` +
    `plate    → ${platePath}\n` +
    `geometry → ${geometryPath}  ${projectedPoints.length} points\n` +
    `off-frame: ${offFrame.length ? offFrame.join(", ") : "none"}`,
);
