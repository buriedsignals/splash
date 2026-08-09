// The render ladder for the proportional-symbol beat.
//
// Usage:
//   bun proof/map-quake-symbol/render.mjs --still
//   bun proof/map-quake-symbol/render.mjs --final-frame
//   bun proof/map-quake-symbol/render.mjs --video

import { spawnSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { deriveFurniture, renderStill } from "./render-still.mjs";
import { QuakeSymbolStill } from "./QuakeSymbolStill.tsx";
import { quakesFromCsv, symbolClaimViolations } from "./geo-symbol.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const PACKAGE_ROOT = resolve(HERE, "../..");
const ENTRY = join(HERE, "index.ts");
const COMPOSITION = "quake-symbol";

/** The story's own constants: the confirmed title, its source, its subject. */
const BEAT = {
  ground: "#FFFFFF",
  accent: "#C1440E",
  subjectKey: "q0", // 2011 Tohoku, 9.1 — the largest row in quakes-symbol.csv (sorted by mag desc)
  comparisonKey: "q1", // 2005 Sumatra (Nias), 8.6 — the next-largest
  title:
    "The 2011 Tohoku earthquake was the most powerful to strike the western Pacific in two decades.",
  source: "Source: USGS Earthquake Catalog (earthquake.usgs.gov), M7.8+, western Pacific, 2005–2024",
  basemapCredit: "basemap © MapTiler, © OpenStreetMap",
  legendCaption: "Magnitude (radius scaled to √magnitude, not to energy released)",
  caveat:
    "Moment magnitude is a logarithmic scale: each whole step is roughly 32× the energy release, " +
    "so a circle 1.3 units bigger is not 1.3× the event — it is orders of magnitude bigger.",
  alt:
    "Map of the western Pacific. A circle marks each of 17 earthquakes of magnitude 7.8 or higher, " +
    "2005–2024, sized by magnitude. The 2011 Tohoku earthquake, magnitude 9.1 off Japan, is the " +
    "largest circle on the map by a wide margin, outlined in the accent colour.",
};

const argv = process.argv.slice(2);
const flag = (name, fallback) => {
  const at = argv.indexOf(name);
  return at >= 0 ? argv[at + 1] : fallback;
};

const dataPath = flag("--data", join(HERE, "quakes-symbol.csv"));
const outDir = flag("--out", join(HERE, "render"));
const stillPlate = flag("--still-plate", "/tmp/map-twin/quake-symbol-496");
const videoPlate = flag("--video-plate", "/tmp/map-twin/quake-symbol-620");
const wantStill = argv.includes("--still");
const wantFinalFrame = argv.includes("--final-frame");
const wantVideo = argv.includes("--video");

const quakes = quakesFromCsv(await readFile(dataPath, "utf8"));
console.log(`data: ${quakes.length} events, M${Math.min(...quakes.map((q) => q.mag))}–M${Math.max(...quakes.map((q) => q.mag))}`);

const violations = symbolClaimViolations({ rows: quakes, subjectKey: BEAT.subjectKey });
if (violations.length === 0) console.log("claim: supported by the source.");
else
  console.log(
    `claim: NOT SUPPORTED, in ${violations.length} way(s):\n  ${violations.join("\n  ")}`,
  );

const furniture = deriveFurniture(BEAT.ground);

async function plateOf(dir) {
  const geometry = JSON.parse(await readFile(join(dir, "geometry.json"), "utf8"));
  const png = await readFile(join(dir, "plate.png"));
  return { geometry, plate: `data:image/png;base64,${png.toString("base64")}` };
}

const shared = {
  title: BEAT.title,
  source: BEAT.source,
  basemapCredit: BEAT.basemapCredit,
  legendCaption: BEAT.legendCaption,
  caveat: BEAT.caveat,
  alt: BEAT.alt,
  ground: BEAT.ground,
  accent: BEAT.accent,
  ...furniture,
  subjectKey: BEAT.subjectKey,
  comparisonKey: BEAT.comparisonKey,
};

await mkdir(outDir, { recursive: true });

if (wantStill) {
  const { geometry, plate } = await plateOf(stillPlate);
  const { pngPath } = await renderStill({
    element: createElement(QuakeSymbolStill, { ...shared, geometry, plate }),
    width: 900,
    height: 560,
    outDir,
    name: "static",
  });
  console.log(`still → ${pngPath}\nNow open it and look at it.`);
}

function remotion(args) {
  const binary = join(PACKAGE_ROOT, "node_modules/.bin/remotion");
  const started = Date.now();
  const result = spawnSync(binary, args, { cwd: PACKAGE_ROOT, stdio: "inherit" });
  if (result.status !== 0) throw new Error(`remotion ${args[0]} exited with ${result.status}`);
  return Math.round((Date.now() - started) / 1000);
}

if (wantFinalFrame || wantVideo) {
  const { geometry, plate } = await plateOf(videoPlate);
  const propsPath = join(outDir, "video-props.json");
  await writeFile(propsPath, JSON.stringify({ ...shared, geometry, plate }));

  const framePath = join(outDir, "final-frame.png");
  const stillSeconds = remotion(["still", ENTRY, COMPOSITION, framePath, "--frame=-1", `--props=${propsPath}`, "--timeout=180000"]);
  console.log(`final frame (--frame=-1) → ${framePath}  [${stillSeconds}s]`);

  if (wantVideo) {
    const videoPath = join(outDir, "quake-symbol.mp4");
    const videoSeconds = remotion([
      "render",
      ENTRY,
      COMPOSITION,
      videoPath,
      `--props=${propsPath}`,
      "--concurrency=1",
      "--timeout=180000",
    ]);
    console.log(`video → ${videoPath}  [${videoSeconds}s]`);
  }
}

if (!wantStill && !wantFinalFrame && !wantVideo) console.log("nothing asked for. Pass --still, --final-frame or --video.");
