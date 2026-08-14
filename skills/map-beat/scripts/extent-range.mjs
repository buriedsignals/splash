// twin/skills/map-beat/scripts/extent-range.mjs
//
// B4.1 — "la production doit fonctionner pour N'IMPORTE QUELLE zone de cadrage — la planète
// entière, plusieurs continents ou pays, un continent, un pays, une région, une ville" — and B4.2 —
// "une zone plus large demande un rendu différent".
//
// WHAT THIS IS, AND WHY IT IS A PROBE RATHER THAN A BEAT. The tree's sixteen committed cameras span
// 2 628x in longitude with a 138x hole in the middle: four beats at planet extent, six at
// hemisphere, three at continent, three at city, and NOTHING at country or region — the two rungs a
// local newsroom asks for most. The W5 audit measured that hole twice and it was still empty. A
// camera that has never been run at a scale is a camera nobody has tested, and every constant this
// format carries was tuned by eye against the one extent its own beat happened to have.
//
// This drives the SAME machinery — the same `fitBounds`, the same MapTiler style, the same capture
// gate, the same `extentFacts` — at six cameras derived from one frozen catalogue, and writes down
// what each one shows. It is not a beat: it has no claim, no BRIEF and no data of its own, and it
// must not pretend otherwise (`claims-grounded-in-data.test.ts` would be right to refuse it).
//
// WHY IT SHIPS NO DATA. A skill directory stays copy-pasteable on its own, so this script contains
// no path reaching outside its own skill. The catalogue is passed in:
//
//   bun skills/map-beat/scripts/extent-range.mjs --data proof/map-quake-density/quakes-density.csv
//
// Without `--data` it captures the basemap alone at all six rungs, which still answers B4.2's
// basemap question. With it, the marks are drawn and the legibility numbers are measured.
//
// HOW THE SIX CAMERAS ARE CHOSEN — from the data, not by eye. Each rung has a target ground width
// (the geometric mean of its own band, which is anchored on the Earth's circumference and nothing
// else), and the camera is centred where a box of that width holds the most rows. That is the same
// move `geo-discipline.md` asks for on the antimeridian seam: derive the centre from where the
// data's own densest cluster sits rather than typing it.

import { existsSync, readdirSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import puppeteer from "puppeteer-core";
import { splashEnvPath } from "./splash-root.mjs";
import {
  EARTH_CIRCUMFERENCE_KM,
  admittedRatios,
  extentBand,
  groundWidthKm,
  markRadiusCeilingPx,
  maxStageHeightPx,
  mercatorAreaBias,
  mercY,
  nearestNeighbourPx,
  stageBoxFor,
  studyExtentOf,
} from "../assets/geo.ts";

const MAPLIBRE = "https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.js";
const MAPLIBRE_CSS = "https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.css";

/** The six rungs, each two zoom levels wide, anchored on the Earth's own circumference. The target
 *  is the geometric mean of the band — the middle of the rung, in the only sense a ratio scale has
 *  a middle. `city` has no floor of its own, so it borrows the next step down. */
const RUNGS = [
  { band: "planet", from: 4, to: 1 },
  { band: "hemisphere", from: 16, to: 4 },
  { band: "continent", from: 64, to: 16 },
  { band: "country", from: 256, to: 64 },
  { band: "region", from: 1024, to: 256 },
  { band: "city", from: 4096, to: 1024 },
].map((rung) => ({
  ...rung,
  targetKm: Math.sqrt(
    (EARTH_CIRCUMFERENCE_KM / rung.from) * (EARTH_CIRCUMFERENCE_KM / rung.to),
  ),
}));

const argv = process.argv.slice(2);
const flag = (name, fallback) => {
  const at = argv.indexOf(name);
  return at >= 0 ? argv[at + 1] : fallback;
};

const dataPath = flag("--data", "");
const size = Number(flag("--size", "900"));
const style = flag("--style", "dataviz-light");
const settleMs = Number(flag("--settle", "15000"));
// A probe capture is read at its own pixel size, so it is written at 1x. The BAKE writes plates at
// 2x because a plate is displayed; nothing here is displayed, and a 2x proof is four times the
// bytes for a legibility claim nobody reads at 2x.
const scale = Number(flag("--scale", "1"));
const outDir = flag("--out", join(import.meta.dirname, "..", "output-proof", "extent-range"));
const keyPath = flag("--env", splashEnvPath(import.meta.dirname));

/**
 * Headless Chrome has to be FOUND before it can be gated (rule 6). A byte-identical copy of the
 * bake's own resolver — this script is in the same skill and duplicates rather than imports across
 * one, and `bake-parity.test.ts` walks bakes rather than probes, so the copy is stated here.
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

/** Rows with a longitude and a latitude, whatever the catalogue calls them. */
function pointsFromCsv(text) {
  const lines = text.trim().split(/\r?\n/);
  const head = lines[0].split(",").map((h) => h.trim().toLowerCase());
  const lonAt = head.findIndex((h) => h === "lon" || h === "longitude");
  const latAt = head.findIndex((h) => h === "lat" || h === "latitude");
  if (lonAt < 0 || latAt < 0)
    throw new Error(`no lon/lat column in the catalogue — its header is: ${lines[0]}`);
  const rows = [];
  for (const line of lines.slice(1)) {
    const cells = line.split(",");
    const lon = Number(cells[lonAt]);
    const lat = Number(cells[latAt]);
    if (Number.isFinite(lon) && Number.isFinite(lat)) rows.push({ lon, lat });
  }
  return rows;
}

/**
 * The camera for one rung, centred where the data is densest at that ground width.
 *
 * The box is square in MERCATOR, because the frame is square and `fitBounds` fits the tighter axis:
 * asking for a box that is square in degrees would make every camera above the tropics come back
 * wider than it was asked for, and the rung would drift.
 */
function cameraForRung(rows, targetKm, band) {
  if (rows.length === 0) return null;
  let best = null;
  // Candidate centres are every row, thinned to at most 3 000 so a 14 175-row catalogue is a
  // 42-million comparison rather than a 200-million one. The thinning cannot move a rung: the
  // densest box at this width contains hundreds of rows, so its neighbourhood survives any
  // uniform thinning of the candidates.
  const stride = Math.max(1, Math.ceil(rows.length / 3000));
  for (let i = 0; i < rows.length; i += stride) {
    const centre = rows[i];
    const halfLon =
      ((targetKm / 2) / (EARTH_CIRCUMFERENCE_KM * Math.cos((centre.lat * Math.PI) / 180))) * 360;
    if (!Number.isFinite(halfLon) || halfLon <= 0) continue;
    const halfMerc = (halfLon / 360) * 2 * Math.PI;
    const north = latOfMercY(mercY(centre.lat) + halfMerc);
    const south = latOfMercY(mercY(centre.lat) - halfMerc);
    const west = centre.lon - halfLon;
    const east = centre.lon + halfLon;
    const bounds = [
      [Math.max(west, -179.9), Math.max(south, -85)],
      [Math.min(east, 179.9), Math.min(north, 85)],
    ];
    // A candidate whose CLAMPED box no longer lands on the rung it was asked for is not a camera at
    // that rung. Without this the search degenerates: near a pole `cos(lat)` collapses, the half-
    // width in degrees runs past ±180°, the box clamps to the whole world and wins every count —
    // measured, and it silently returned the planet camera for the hemisphere rung.
    const achieved = {
      west: bounds[0][0],
      south: bounds[0][1],
      east: bounds[1][0],
      north: bounds[1][1],
    };
    if (extentBand(achieved) !== band) continue;
    let count = 0;
    for (const row of rows)
      if (
        row.lon >= achieved.west &&
        row.lon <= achieved.east &&
        row.lat >= achieved.south &&
        row.lat <= achieved.north
      )
        count++;
    if (!best || count > best.count) best = { count, bounds };
  }
  if (!best)
    throw new Error(
      `no camera at the ${band} rung holds any of this catalogue: every candidate box of ` +
        `${Math.round(targetKm)} km, centred on a row, clamped off its own rung. The catalogue may not ` +
        `reach that scale, which is a fact about the data and not a defect in the search.`,
    );
  return best;
}

/** Inverse of `mercY`. */
function latOfMercY(y) {
  return (360 / Math.PI) * Math.atan(Math.exp(y)) - 90;
}

const env = parseEnvFile(await readFile(keyPath, "utf8"));
const key = env.MAPTILER_KEY ?? MAPTILER_KEY_ALIASES.map((alias) => env[alias]).find(Boolean);
if (!key) throw new Error(`no MAPTILER_KEY (or alias: ${MAPTILER_KEY_ALIASES.join(", ")}) in ${keyPath}`);

const rows = dataPath ? pointsFromCsv(await readFile(dataPath, "utf8")) : [];
await mkdir(outDir, { recursive: true });

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

/** One capture: fit the camera, hide the provider's own labels, draw the marks, screenshot. */
async function capture({ bounds, width, height, marks, radiusPx, file }) {
  const page = await browser.newPage();
  await page.setViewport({ width, height, deviceScaleFactor: scale });
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
    async ({ key, style, bounds, settleMs, width, height, marks, radiusPx }) => {
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
      // Rule 9: quiet the plate — the provider's own place labels are five jobs this beat is doing
      // itself. Kept here so the six captures differ ONLY by camera.
      let hidden = 0;
      for (const layer of map.getStyle().layers)
        if (layer.type === "symbol" || /border|boundary|admin/i.test(layer.id)) {
          map.setLayoutProperty(layer.id, "visibility", "none");
          hidden++;
        }
      if (marks.length > 0) {
        map.addSource("marks", {
          type: "geojson",
          data: {
            type: "FeatureCollection",
            features: marks.map(([lon, lat]) => ({
              type: "Feature",
              geometry: { type: "Point", coordinates: [lon, lat] },
              properties: {},
            })),
          },
        });
        map.addLayer({
          id: "marks",
          type: "circle",
          source: "marks",
          paint: {
            "circle-radius": radiusPx,
            "circle-color": "#B8412F",
            "circle-opacity": 0.55,
            "circle-stroke-width": 1,
            "circle-stroke-color": "#7A2418",
          },
        });
      }
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
      const projected = marks.map(([lon, lat]) => {
        const p = map.project([lon, lat]);
        return { px: Math.round(p.x * 10) / 10, py: Math.round(p.y * 10) / 10 };
      });
      return {
        how,
        ms: Date.now() - started,
        hidden,
        zoom: map.getZoom(),
        topLeft: map.unproject([0, 0]),
        bottomRight: map.unproject([width, height]),
        projected,
      };
    },
    { key, style, bounds, settleMs, width, height, marks, radiusPx },
  );
  // A pass that only needs the PROJECTION writes no file: the probe measures the drawn gaps
  // before it knows what radius to draw at, and committing that intermediate would triple the
  // proof's bytes for a picture nobody looks at.
  if (file)
    await page.screenshot({ path: join(outDir, file), clip: { x: 0, y: 0, width, height } });
  await page.close();
  return gate;
}

const report = [];
for (const rung of RUNGS) {
  const camera = cameraForRung(rows, rung.targetKm, rung.band) ?? {
    count: 0,
    // With no catalogue, a rung still has a camera: the same target width centred on the seed's own
    // subject, so the six basemap captures are comparable.
    bounds: (() => {
      const halfLon = ((rung.targetKm / 2) / (EARTH_CIRCUMFERENCE_KM * Math.cos((46.8 * Math.PI) / 180))) * 360;
      const halfMerc = (halfLon / 360) * 2 * Math.PI;
      return [
        [Math.max(8.23 - halfLon, -179.9), Math.max(latOfMercY(mercY(46.8) - halfMerc), -85)],
        [Math.min(8.23 + halfLon, 179.9), Math.min(latOfMercY(mercY(46.8) + halfMerc), 85)],
      ];
    })(),
  };
  const [[west, south], [east, north]] = camera.bounds;
  const inside = rows.filter((r) => r.lon >= west && r.lon <= east && r.lat >= south && r.lat <= north);

  // Pass 1: the basemap alone, so the two captures differ only by the marks.
  const plain = await capture({
    bounds: camera.bounds,
    width: size,
    height: size,
    marks: [],
    radiusPx: 0,
    file: `basemap-${rung.band}.png`,
  });
  const corners = {
    west: plain.topLeft.lng,
    north: plain.topLeft.lat,
    east: plain.bottomRight.lng,
    south: plain.bottomRight.lat,
  };
  const gaps = nearestNeighbourPx(plain.projected.length > 1 ? plain.projected : []);
  const medianGap = gaps.length > 0 ? gaps[Math.floor(gaps.length / 2)] : 0;

  // Pass 2: the same camera with the marks, sized by THIS camera rather than by a typed constant.
  let marked = null;
  let radius = 0;
  if (inside.length > 0) {
    const probe = await capture({
      bounds: camera.bounds,
      width: size,
      height: size,
      marks: inside.slice(0, 4000).map((r) => [r.lon, r.lat]),
      radiusPx: 2,
      file: null,
    });
    const probeGaps = nearestNeighbourPx(probe.projected);
    const probeMedian = probeGaps.length > 0 ? probeGaps[Math.floor(probeGaps.length / 2)] : 0;
    radius = Math.max(1.5, markRadiusCeilingPx(probeMedian, 30));
    marked = await capture({
      bounds: camera.bounds,
      width: size,
      height: size,
      marks: inside.slice(0, 4000).map((r) => [r.lon, r.lat]),
      radiusPx: Math.round(radius * 10) / 10,
      file: `marks-${rung.band}.png`,
    });
    marked.gaps = probeGaps;
    marked.medianGap = probeMedian;
  }

  const study = inside.length > 0 ? studyExtentOf(inside, corners.west) : null;
  const admitted = study ? admittedRatios(corners, study) : null;
  report.push({
    band: rung.band,
    targetKm: Math.round(rung.targetKm),
    bounds: camera.bounds,
    zoom: Math.round(plain.zoom * 1000) / 1000,
    gatedBy: plain.how,
    hidden: plain.hidden,
    corners,
    measuredBand: extentBand(corners),
    groundWidthKm: Math.round(groundWidthKm(corners)),
    lonSpan: Number((corners.east - corners.west).toFixed(4)),
    rowsInFrame: inside.length,
    admittedLonRatio: admitted ? Number(admitted.lon.toFixed(3)) : null,
    admittedLatRatio: admitted ? Number(admitted.lat.toFixed(3)) : null,
    mercatorAreaBias: Number(mercatorAreaBias(corners).toFixed(2)),
    medianGapPx: marked ? Number(marked.medianGap.toFixed(2)) : null,
    minGapPx: marked && marked.gaps.length > 0 ? Number(marked.gaps[0].toFixed(2)) : null,
    markRadiusPx: marked ? Number(radius.toFixed(2)) : null,
    metresPerPixel: Number(
      ((40075016.686 * Math.cos((((corners.north + corners.south) / 2) * Math.PI) / 180)) /
        (512 * 2 ** plain.zoom)).toPrecision(6),
    ),
    portrait: (() => {
      const stage = stageBoxFor(1080, 1920, corners.east - corners.west);
      return {
        letterboxed: stage.letterboxed,
        stage: `${stage.width}x${stage.height}`,
        spareHeightPx: stage.spareHeightPx,
        degreesIfForced: Number(stage.degreesIfForced.toFixed(1)),
        maxStageHeightPx: Math.round(maxStageHeightPx(1080, corners.east - corners.west)),
      };
    })(),
  });
  console.log(
    `${rung.band.padEnd(11)} ${String(Math.round(groundWidthKm(corners))).padStart(6)} km  zoom ${String(report.at(-1).zoom).padStart(6)}  ` +
      `${String(inside.length).padStart(5)} rows  admitted x${report.at(-1).admittedLonRatio}/x${report.at(-1).admittedLatRatio}  ` +
      `bias x${report.at(-1).mercatorAreaBias}  mark r=${report.at(-1).markRadiusPx}px`,
  );
}

// The planet rung in a 1080x1920 portrait export, both ways, so the decision is a picture and not a
// paragraph: what MapLibre gives when the whole frame height is handed to a world camera, and what
// the letterboxed stage gives instead.
const planet = report.find((r) => r.band === "planet");
if (planet) {
  const forced = await capture({
    bounds: planet.bounds,
    width: 1080,
    height: 1920,
    marks: [],
    radiusPx: 0,
    file: "portrait-forced-planet.png",
  });
  const stage = stageBoxFor(1080, 1920, planet.lonSpan);
  const letterboxed = await capture({
    bounds: planet.bounds,
    width: stage.width,
    height: stage.height,
    marks: [],
    radiusPx: 0,
    file: "portrait-letterboxed-planet.png",
  });
  planet.portraitMeasured = {
    forcedLonSpan: Number((forced.bottomRight.lng - forced.topLeft.lng).toFixed(1)),
    forcedZoom: Math.round(forced.zoom * 1000) / 1000,
    letterboxedLonSpan: Number((letterboxed.bottomRight.lng - letterboxed.topLeft.lng).toFixed(1)),
    letterboxedZoom: Math.round(letterboxed.zoom * 1000) / 1000,
    predictedForcedLonSpan: Number(stage.degreesIfForced.toFixed(1)),
  };
  console.log(
    `portrait 1080x1920: forced shows ${planet.portraitMeasured.forcedLonSpan}° ` +
      `(model predicted ${planet.portraitMeasured.predictedForcedLonSpan}°); ` +
      `letterboxed to ${stage.width}x${stage.height} shows ${planet.portraitMeasured.letterboxedLonSpan}°`,
  );
}

await browser.close();
await writeFile(join(outDir, "range.json"), `${JSON.stringify({ size, style, dataPath, rungs: report }, null, 1)}\n`);
console.log(`\nwrote ${outDir}/range.json and ${readdirSync(outDir).filter((f) => f.endsWith(".png")).length} captures`);
