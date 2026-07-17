// produce(configPath, outDir): build the single-file scrolly HTML with the config baked in.
//   bun scripts/produce.mjs <config.json> <outDir>
import { execFileSync } from "node:child_process";
import { mkdirSync, copyFileSync, readFileSync as readFS } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { writeFileSync } from "node:fs";
import { scrollySourceManifest } from "../src/source-manifest.ts";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");

// Load VITE_MAPTILER_KEY from the monorepo root .env when not already set.
// Scrolly.tsx imports all map modules statically (they throw at load time when
// the key is absent), so the build always needs the key — even for chart-only
// configs that never render a map. Source it from the repo root .env silently
// rather than requiring the caller to set it manually.
if (!process.env.VITE_MAPTILER_KEY) {
  const rootEnv = join(root, "../../.env");
  try {
    const lines = readFS(rootEnv, "utf8").split("\n");
    for (const line of lines) {
      // Accept EITHER prefix — the two hold the same MapTiler key (Vite vs Remotion prefix), so a
      // .env that sets only REMOTION_MAPTILER_KEY still satisfies the scrolly's (Vite) web build.
      const m = line.match(/^(?:VITE|REMOTION)_MAPTILER_KEY\s*=\s*(.+)$/);
      if (m) { process.env.VITE_MAPTILER_KEY = m[1].trim(); break; }
    }
  } catch {
    // .env absent or unreadable — proceed; Vite will bake undefined and the map
    // modules will throw at runtime (only matters for map configs, not chart).
  }
}
const configPath = process.argv[2];
const outDir = process.argv[3];
if (!configPath || !outDir) {
  console.error("usage: produce.mjs <config.json> <outDir>");
  process.exit(1);
}
mkdirSync(outDir, { recursive: true });

// IMAGE track (visual:"image"): the prepped frames live on disk (framesDir), but the
// deliverable is ONE self-contained scrolly.html — so the frames are inlined here as
// base64 data URIs (frameSrcs, aligned 1:1 with story.frames) into the config the
// Vite single-file build bakes. Chart/map configs pass through untouched.
let buildConfigPath = configPath;
const rawConfig = JSON.parse(readFS(configPath, "utf8"));
if (rawConfig.visual === "image" && rawConfig.framesDir && !rawConfig.frameSrcs) {
  const { readFileSync: readBin, mkdtempSync } = await import("node:fs");
  const { tmpdir } = await import("node:os");
  const { resolve, isAbsolute } = await import("node:path");
  const framesRoot = isAbsolute(rawConfig.framesDir)
    ? rawConfig.framesDir
    : resolve(configPath, "..", rawConfig.framesDir);
  const frameSrcs = rawConfig.story.frames.map((frame) => {
    const framePath = join(framesRoot, `${frame.id}.jpg`);
    const b64 = readBin(framePath).toString("base64");
    return `data:image/jpeg;base64,${b64}`;
  });
  const inlined = { ...rawConfig, frameSrcs };
  const tmp = mkdtempSync(join(tmpdir(), "scrolly-image-config-"));
  buildConfigPath = join(tmp, "config.json");
  writeFileSync(buildConfigPath, JSON.stringify(inlined));
}

execFileSync("bunx", ["vite", "build"], {
  stdio: "inherit",
  cwd: root,
  env: { ...process.env, CONFIG: buildConfigPath },
});
const out = join(outDir, "scrolly.html");
copyFileSync(join(root, "dist", "index.html"), out);
const parsedConfig = JSON.parse(readFS(configPath, "utf8"));
writeFileSync(join(outDir, "source-manifest.json"), JSON.stringify(scrollySourceManifest(parsedConfig), null, 2) + "\n");
copyFileSync(configPath, join(outDir, "config.json"));
console.log("PRODUCE_RESULT " + JSON.stringify({ scrolly: out }));
