// The bake for the locator VIDEO beat: one camera over central Geneva, one basemap capture, the
// study set's points projected — and, because this beat's motion IS a search radius growing out
// from the city centre, the SEARCH RINGS projected too.
//
// Every ring is a real great-circle locus: 72 bearings around the centre at a fixed surface
// distance, each vertex projected by the same MapLibre camera as the markers. Nothing here
// converts kilometres into pixels by a constant, because a constant is a claim about a projection
// that Mercator does not honour — the drawn ring is the ground truth, resampled, not a circle
// scaled by an assumed metres-per-pixel.
//
// No polygons, no join — a locator has neither (`references/types/locator.md`: "position only").
//
// Usage:
// The plate is FROZEN BESIDE THE BEAT, for the same reason its data is: a basemap living in `/tmp`
// cannot be committed, so the delivered artifact could not be reproduced or audited — and MapTiler
// restyles, so a re-bake months later is a different picture under the same marks. The render calls
// this bake only when the beat's own plate folder is empty.
//
//   bun proof/mapvid-locator-geneva/bake.mjs   # → proof/mapvid-locator-geneva/plate
//
// The plate is baked at the EXACT size the video draws it (660 × 660 inside a 1080 × 1350
// composition), never at a third size: a plate baked at one size and drawn into a box of another
// aspect puts every marker off the street beneath it.

import { existsSync, readdirSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer";
import { orgsFromCsv } from "./geo-locator.ts";

const HERE = dirname(fileURLToPath(import.meta.url));

// The camera. The static sibling frames the ELEVEN MARKERS (lon 6.122–6.192, lat 46.192–46.234).
// This beat has to frame something bigger: the SOURCE QUERY'S OWN CATCHMENT, a 6 km radius around
// central Geneva, because the argument includes the empty ground beyond the farthest organisation
// and a frame that stopped at the markers would hide exactly the part that is the point.
//
// So the bounds are the centre ± the catchment, in each axis, with a little air:
//   6.6 km of latitude  = 6.6 / 110.9  = 0.0595°
//   6.6 km of longitude = 6.6 / 77.05  = 0.0857°  (a degree of longitude is cos(46.2°) as long)
// Those two spans are near-identical once projected (Web Mercator stretches latitude by
// 1/cos(lat)), which is what keeps a square frame from wasting one axis.
const BEAT = {
  centre: [6.1432, 46.2044],
  /** The radius the source's own Wikidata query used. The sweep stops here, and so must the frame. */
  searchKm: 6,
  bounds: [
    [6.0575, 46.1449],
    [6.2289, 46.2639],
  ],
  style: "dataviz-light",
};

/**
 * The great-circle locus of every point exactly `km` from `[lon, lat]`, sampled at `steps`
 * bearings — the destination-point formula on a sphere of mean radius 6371.0088 km.
 */
function ringAt([lon, lat], km, steps = 72) {
  const R = 6371.0088;
  const toRad = (d) => (d * Math.PI) / 180;
  const toDeg = (r) => (r * 180) / Math.PI;
  const phi1 = toRad(lat);
  const lambda1 = toRad(lon);
  const delta = km / R;
  return Array.from({ length: steps }, (_, i) => {
    const theta = (2 * Math.PI * i) / steps;
    const phi2 = Math.asin(
      Math.sin(phi1) * Math.cos(delta) + Math.cos(phi1) * Math.sin(delta) * Math.cos(theta),
    );
    const lambda2 =
      lambda1 +
      Math.atan2(
        Math.sin(theta) * Math.sin(delta) * Math.cos(phi1),
        Math.cos(delta) - Math.sin(phi1) * Math.sin(phi2),
      );
    return [toDeg(lambda2), toDeg(phi2)];
  });
}

/** Radii the video interpolates between, 0.25 km apart out to the query's own 6 km edge. */
const RING_STEP_KM = 0.25;
const RING_RADII = Array.from(
  { length: Math.round(BEAT.searchKm / RING_STEP_KM) },
  (_, i) => Math.round((i + 1) * RING_STEP_KM * 100) / 100,
);

const MAPLIBRE = "https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.js";
const MAPLIBRE_CSS = "https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.css";

const argv = process.argv.slice(2);
const flag = (name, fallback) => {
  const at = argv.indexOf(name);
  return at >= 0 ? argv[at + 1] : fallback;
};

const size = Number(flag("--size", "660"));
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

    const hidden = [];
    for (const layer of map.getStyle().layers)
      if (layer.type === "symbol" || /border|boundary|admin/i.test(layer.id)) {
        map.setLayoutProperty(layer.id, "visibility", "none");
        hidden.push(layer.id);
      }
    // geo-discipline.md rule 7: water reads as a blue tint, never the style's default grey — see
    // `proof/map-quake-symbol/bake.mjs` for how this was first found.
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
await page.screenshot({ path: platePath, clip: { x: 0, y: 0, width: size, height: size } });

const projected = await page.evaluate((points) => {
  const map = window.__map;
  return points.map(({ key, lon, lat }) => {
    const p = map.project([lon, lat]);
    return [key, Math.round(p.x * 10) / 10, Math.round(p.y * 10) / 10];
  });
}, orgs.map(({ key, lon, lat }) => ({ key, lon, lat })));

// The centre and every search ring, through the SAME camera as the markers.
const centrePx = await page.evaluate((point) => {
  const p = window.__map.project(point);
  return [Math.round(p.x * 10) / 10, Math.round(p.y * 10) / 10];
}, BEAT.centre);

const ringsPx = await page.evaluate((rings) => {
  const map = window.__map;
  return rings.map((ring) =>
    ring.map(([lon, lat]) => {
      const p = map.project([lon, lat]);
      return [Math.round(p.x * 10) / 10, Math.round(p.y * 10) / 10];
    }),
  );
}, RING_RADII.map((km) => ringAt(BEAT.centre, km)));

await browser.close();

const pxOf = new Map(projected.map(([key, x, y]) => [key, [x, y]]));
const points = orgs.map((o) => {
  const [px, py] = pxOf.get(o.key);
  return { ...o, px, py };
});

const frame = { width: size, height: size };
const offFrame = points.filter((p) => p.px < 0 || p.px > frame.width || p.py < 0 || p.py > frame.height);

// The whole catchment must be inside the picture, or the beat's closing claim — that the search
// went to 6 km and the last 1.6 km of it are empty — would be made about ground the frame cut off.
const outerRing = ringsPx[ringsPx.length - 1];
const spill = outerRing.filter(([x, y]) => x < 0 || y < 0 || x > size || y > size);
if (spill.length > 0)
  throw new Error(
    `the ${BEAT.searchKm} km search ring leaves this ${size}px frame at ${spill.length} of its ` +
      `${outerRing.length} sampled bearings. Widen BEAT.bounds — a sweep whose own edge is off-frame ` +
      `cannot show that the ground beyond the farthest marker is empty.`,
  );

const geometry = {
  frame,
  bounds: BEAT.bounds,
  style: BEAT.style,
  gatedBy: gate.how,
  zoom: Math.round(gate.zoom * 1000) / 1000,
  points,
  centre: { lonLat: BEAT.centre, px: centrePx },
  searchKm: BEAT.searchKm,
  /** Ring `i` is the projected locus at `radiiKm[i]` kilometres. Same vertex count throughout, in
   *  the same bearing order, so two adjacent rings interpolate vertex by vertex. */
  radiiKm: RING_RADII,
  rings: ringsPx,
};
const geometryPath = join(outDir, "geometry.json");
await writeFile(geometryPath, JSON.stringify(geometry));

console.log(
  `gated by ${gate.how} in ${gate.ms}ms · hid ${gate.hidden} basemap layers · zoom ${geometry.zoom}\n` +
    `plate    → ${platePath}\n` +
    `geometry → ${geometryPath}  ${points.length} points, ${ringsPx.length} search rings ` +
    `(${RING_RADII[0]}..${BEAT.searchKm} km)\n` +
    `off-frame: ${offFrame.length ? offFrame.map((p) => p.name).join(", ") : "none"}`,
);
