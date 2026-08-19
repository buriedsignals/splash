// Bakes this beat's basemap plate — the picture the route and its stops are drawn over.
//
// WHY IT EXISTS AT ALL. The beat was rebuilt from a delivered file whose plate came baked in
// `dataviz-light` while its own theme declared `--ground: #16191B` and painted every label white on
// a dark halo. The furniture was right for the theme; the PLATE was not. The first rebuild here
// resolved that by moving the theme to the plate — a light ground, ink labels — which is a coherent
// picture and somebody else's editorial decision quietly overturned. This bakes the plate the theme
// asked for instead.
//
// THE CAMERA IS THE ORIGINAL'S, recovered rather than guessed. The delivered plate carries no
// bounds, but it carries five stops whose real coordinates are known and whose pixel positions are
// in the markup; five points over-determine a Web Mercator fit. Residuals came back at 0.03px or
// less, and the recovered frame lands on north 49.0000 and south 33.0002 — round numbers, which is
// what an authored camera looks like. Centre and zoom are used rather than `fitBounds`, which fits
// on whichever axis binds first and overshoots the other.
//
// Usage:
//   bun proof/mapmore-scrolly-route-access/bake.mjs
//   bun proof/mapmore-scrolly-route-access/bake.mjs --size 1400x700 --out plate

import puppeteer from "puppeteer-core";
import { existsSync, readdirSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));

/** The original's own camera, recovered from its five stops. */
const BEAT = {
  center: [6.99984, 41.49104],
  // MapLibre's zoom is defined on 512px tiles, not 256: the first bake asked for 5.52515 and
  // came back at north 45.37 instead of 49.00, exactly one zoom level in. The assertion below is
  // what caught it.
  zoom: 4.52515,
  // The style the beat's own theme asks for. `dataviz-light` is what the delivered file shipped,
  // under a `#16191B` ground — the disagreement this bake exists to end.
  style: "dataviz-dark",
  settleMs: 6000,
};

const MAPLIBRE = "https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.js";
const MAPLIBRE_CSS = "https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.css";

const argv = process.argv.slice(2);
const flag = (name, fallback) => {
  const at = argv.indexOf(name);
  return at >= 0 ? argv[at + 1] : fallback;
};
const [width, height] = flag("--size", "1400x700").split("x").map(Number);
const outDir = flag("--out", join(HERE, "plate"));

/** A DUPLICATE of the `resolveChrome` every capture script in this tree carries — a beat's own
 *  scripts stay copy-pasteable. */
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
  candidates.push("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", "/usr/bin/google-chrome");
  const found = candidates.find((c) => existsSync(c));
  if (!found) throw new Error(`no Chrome to bake with — looked at ${candidates.join(", ")}`);
  return found;
}

const MAPTILER_KEY_ALIASES = ["MAPTILER_API_KEY", "REMOTION_MAPTILER_KEY", "VITE_MAPTILER_KEY"];
const envPath = flag("--env", join(HERE, "../../.env"));
const env = Object.fromEntries(
  (await readFile(envPath, "utf8"))
    .split(/\r?\n/)
    .filter((line) => line.includes("="))
    .map((line) => [line.slice(0, line.indexOf("=")).trim(), line.slice(line.indexOf("=") + 1).trim().replace(/^["']|["']$/g, "")]),
);
const key = env.MAPTILER_KEY ?? MAPTILER_KEY_ALIASES.map((alias) => env[alias]).find(Boolean);
if (!key) throw new Error(`no MAPTILER_KEY in ${envPath}`);

const browser = await puppeteer.launch({ executablePath: resolveChrome(), headless: true, protocolTimeout: 180000 });
const page = await browser.newPage();
// deviceScaleFactor 2, so the plate is baked at twice its display size and stays sharp on a
// retina screen at full width — the same 2800x1400 the original shipped.
await page.setViewport({ width, height, deviceScaleFactor: 2 });
await page.setContent(
  `<!doctype html><html><head><meta charset="utf-8">
<link href="${MAPLIBRE_CSS}" rel="stylesheet"/>
<script src="${MAPLIBRE}"></script>
<style>html,body{margin:0;padding:0}#map{width:${width}px;height:${height}px}</style>
</head><body><div id="map"></div></body></html>`,
  { waitUntil: "networkidle0" },
);
await page.waitForFunction("window.maplibregl !== undefined", { timeout: 60000 });

const shown = await page.evaluate(
  async ({ key, style, center, zoom, settleMs }) => {
    const map = new maplibregl.Map({
      container: "map",
      style: `https://api.maptiler.com/maps/${style}/style.json?key=${key}`,
      center,
      zoom,
      interactive: false,
      attributionControl: false,
      fadeDuration: 0,
    });
    await new Promise((settle) => {
      let done = false;
      const finish = () => {
        if (done) return;
        done = true;
        settle(null);
      };
      map.on("idle", finish);
      // The invariant against a hung bake: idle OR a settle window, never idle alone. A blocked
      // tile leaves `idle` unfired and a bake that waits only for it never returns.
      setTimeout(finish, settleMs);
    });
    const bounds = map.getBounds();
    return {
      west: bounds.getWest(),
      east: bounds.getEast(),
      north: bounds.getNorth(),
      south: bounds.getSouth(),
      zoom: map.getZoom(),
      center: map.getCenter().toArray(),
    };
  },
  { key, style: BEAT.style, center: BEAT.center, zoom: BEAT.zoom, settleMs: BEAT.settleMs },
);

// The recovered frame, asserted rather than trusted: a plate baked at a camera the marks were not
// projected for would put every stop somewhere the basemap never claimed — the defect class this
// beat was rebuilt to be rid of.
const EXPECTED = { north: 48.9993, south: 33.0002, west: -14.3761, east: 28.3758 };
for (const [edge, value] of Object.entries(EXPECTED))
  if (Math.abs(shown[edge] - value) > 0.02)
    throw new Error(
      `the baked camera does not reach the frame the marks were projected for: ${edge} came back ` +
        `${shown[edge].toFixed(4)}, expected ${value}`,
    );

await mkdir(outDir, { recursive: true });
const plate = await page.screenshot({ clip: { x: 0, y: 0, width, height } });
await writeFile(join(outDir, "plate.png"), plate);
await writeFile(
  join(outDir, "camera.json"),
  `${JSON.stringify({ ...BEAT, size: [width, height], shown }, null, 1)}\n`,
);
await browser.close();
console.log(
  `plate → ${join(outDir, "plate.png")}  [${width}x${height} at 2x, ${BEAT.style}]\n` +
    `  frame west ${shown.west.toFixed(4)} east ${shown.east.toFixed(4)} ` +
    `north ${shown.north.toFixed(4)} south ${shown.south.toFixed(4)}`,
);
