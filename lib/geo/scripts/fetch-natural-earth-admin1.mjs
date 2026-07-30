// One-time build script for the offline ADM1 index (D6) and its committed geometry sidecar
// (D10, ~500m Visvalingam tolerance). Run by hand, not part of `bun run check` — the source
// (Natural Earth v5.1.x admin-1) has been frozen since 2022, so an automatic refresh cadence
// would be theatre (spec R6). Downloads the shapefile, converts it, builds the index with the
// pure `buildAdm1Index` (index-build.ts), and writes two committed artifacts:
//   - lib/geo/adm1-index.json
//   - skills/map-native/assets/geo/natural-earth-admin-1.topojson
//
// Usage: bun lib/geo/scripts/fetch-natural-earth-admin1.mjs
import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { buildAdm1Index } from "../index-build.ts";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(scriptDir, "..", "..", ".."); // lib/geo/scripts → repo root

const SOURCE_URL =
  "https://naciscdn.org/naturalearth/10m/cultural/ne_10m_admin_1_states_provinces.zip";
const SHAPEFILE_BASENAME = "ne_10m_admin_1_states_provinces";

const INDEX_OUT_PATH = join(REPO_ROOT, "lib", "geo", "adm1-index.json");
const TOPOJSON_OUT_PATH = join(
  REPO_ROOT,
  "skills",
  "map-native",
  "assets",
  "geo",
  "natural-earth-admin-1.topojson",
);

// A stable scratch dir (not the ephemeral per-process tmpdir) so a re-run during development
// reuses the downloaded zip instead of refetching 14.9MB every time.
const scratchDir = join(tmpdir(), "splash-natural-earth-admin1");
const zipPath = join(scratchDir, `${SHAPEFILE_BASENAME}.zip`);
const shpDir = join(scratchDir, "shp");
const shpPath = join(shpDir, `${SHAPEFILE_BASENAME}.shp`);
const geojsonPath = join(scratchDir, "admin1.geojson");

async function downloadZip() {
  if (existsSync(zipPath)) {
    console.log(`[fetch] reusing cached zip at ${zipPath}`);
    return;
  }
  console.log(`[fetch] downloading ${SOURCE_URL}`);
  const res = await fetch(SOURCE_URL);
  if (!res.ok) {
    throw new Error(`Download failed: HTTP ${res.status} ${res.statusText}`);
  }
  const bytes = new Uint8Array(await res.arrayBuffer());
  writeFileSync(zipPath, bytes);
  console.log(`[fetch] wrote ${bytes.byteLength} bytes to ${zipPath}`);
}

function unzip() {
  if (existsSync(shpPath)) {
    console.log(`[unzip] reusing extracted shapefile at ${shpPath}`);
    return;
  }
  mkdirSync(shpDir, { recursive: true });
  console.log(`[unzip] extracting ${zipPath} -> ${shpDir}`);
  execFileSync("unzip", ["-o", zipPath, "-d", shpDir], { stdio: "inherit" });
}

function convertToGeojson() {
  console.log(`[mapshaper] ${shpPath} -> ${geojsonPath}`);
  execFileSync(
    "bunx",
    ["mapshaper", shpPath, "-o", geojsonPath, "format=geojson"],
    { stdio: "inherit", cwd: scratchDir },
  );
}

function convertToTopojson() {
  mkdirSync(dirname(TOPOJSON_OUT_PATH), { recursive: true });
  console.log(`[mapshaper] ${geojsonPath} -> ${TOPOJSON_OUT_PATH} (simplify visvalingam 500m)`);
  execFileSync(
    "bunx",
    [
      "mapshaper",
      geojsonPath,
      "-simplify",
      "visvalingam",
      "interval=500m",
      "-o",
      TOPOJSON_OUT_PATH,
      "format=topojson",
      "quantization=1e5",
    ],
    { stdio: "inherit", cwd: scratchDir },
  );
}

function buildAndWriteIndex() {
  const geojson = JSON.parse(readFileSync(geojsonPath, "utf8"));
  const features = geojson.features ?? [];
  console.log(`[index] building index from ${features.length} admin-1 features`);
  const index = buildAdm1Index(features);
  mkdirSync(dirname(INDEX_OUT_PATH), { recursive: true });
  writeFileSync(INDEX_OUT_PATH, JSON.stringify(index));
  return index;
}

function report(index) {
  const keys = Object.keys(index);
  const distinctKeys = keys.length;
  const ambiguousKeys = keys.filter((k) => index[k].length > 1).length;
  const indexBytes = statSync(INDEX_OUT_PATH).size;
  const topojsonBytes = statSync(TOPOJSON_OUT_PATH).size;

  console.log("");
  console.log("=== fetch-natural-earth-admin1: results (informational, not asserted) ===");
  console.log(`distinct keys:        ${distinctKeys}`);
  console.log(`ambiguous keys (>1):  ${ambiguousKeys}`);
  console.log(`adm1-index.json:      ${indexBytes} bytes (${INDEX_OUT_PATH})`);
  console.log(`natural-earth-admin-1.topojson: ${topojsonBytes} bytes (${TOPOJSON_OUT_PATH})`);
}

async function main() {
  mkdirSync(scratchDir, { recursive: true });
  await downloadZip();
  unzip();
  convertToGeojson();
  convertToTopojson();
  const index = buildAndWriteIndex();
  report(index);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
