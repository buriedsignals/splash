// produce(configPath, outDir): build the single-file scrolly HTML with the config baked in.
//   bun scripts/produce.mjs <config.json> <outDir>
import { execFileSync } from "node:child_process";
import { mkdirSync, copyFileSync, readFileSync as readFS } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { writeFileSync } from "node:fs";
import { scrollySourceManifest } from "../src/source-manifest.ts";
import { scrollySpecErrors } from "../src/manifest.ts";
import { resolveGeometryForProduce } from "../../../lib/geo/resolve-for-produce.ts";
import { backfillAdm1FeatureIds } from "../../map-native/src/adm1-backfill.ts";
import { renderSize } from "../../splash/src/channel.ts";

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
// IMAGE track (visual:"image"): the prepped frames live on disk (framesDir), but the
// deliverable is ONE self-contained scrolly.html — so the frames are inlined here as
// base64 data URIs (frameSrcs, aligned 1:1 with story.frames) into the config the
// Vite single-file build bakes. Chart/map configs pass through untouched.
let buildConfigPath = configPath;
const rawConfig = JSON.parse(readFS(configPath, "utf8"));

// VALIDATE FIRST — this CLI is a journalist-reachable entry point, and it used to be the only
// one that reached the renderer without asking the validator. An `arcBeats` plan pushed through
// here was accepted and then silently dropped (measured: none of the three authored sentences
// reached the page). No new rule: scrollySpecErrors is the SAME function the producer manifest
// registers, so the CLI and the spine refuse identically.
const specErrors = scrollySpecErrors(rawConfig);
if (specErrors.length > 0) {
  console.error("[produce scrolly] INVALID CONFIG — refusing to build:");
  for (const e of specErrors) console.error(`  ✗ ${e}`);
  process.exit(1);
}

// outDir is only created once the config has passed validation — a refusal leaves no
// trace on disk at all, not even an empty directory.
mkdirSync(outDir, { recursive: true });

// Geometry resolution (D5/D7) — mirrors skills/map-native/scripts/produce.mjs's own call, the
// step that made ChoroplethMap.tsx et al. resolvable again after their bundled `?raw` GEOJSON
// fallback was removed. A scrolly's MAP track (choropleth/cartogram/dot-density/route) throws a
// loud, named "config.geometry is required" (Scrolly.tsx's decodeWorldGeometry, ScrollyMap.tsx,
// ScrollyDotDensityMap.tsx, ScrollyCartogramMap.tsx) without this — there is no bundled basemap
// geometry left to fall back on. A CHART track config (config.type not one of the four joining
// types) is a no-op here: resolveGeometryForProduce's own allow-list returns false and rawConfig
// is left untouched.
//
// `config.type` is normalized for a MAP-track config first — Scrolly.tsx's own dispatch (see
// its "default, un-typed" comments) treats an ABSENT `type` on a config that is neither the
// chart track (`nativeType` present) nor the image track (`visual` present) as "choropleth,
// the un-typed default": a real, renderer-supported shape, not an unknown one. Without this,
// resolveGeometryForProduce's join-type allow-list reads `config.type` literally (undefined ⇒
// not one of the four joining types) and silently skips resolution — measured against this
// skill's own committed sample-data/scrolly.json, which predates the `type` field and is
// exactly this shape. Left untouched for the chart/image tracks, whose configs never carry
// `type` at all and must not be mistaken for an untyped map.
const isMapTrackConfig =
  !("visual" in rawConfig) && !("nativeType" in rawConfig);
if (isMapTrackConfig && rawConfig.type === undefined) {
  rawConfig.type = "choropleth";
}

// renderWidthPx: article-web's own mediaSize.width (skills/splash/src/channel.ts's renderSize) —
// a scrolly is always delivered at article-web (its only host; skills/scrolly reads no channel of
// its own, see lib/core/verbs/exec.ts's channelEnvForEngine), and this is the SAME width
// lib/verify/viewport.ts's resolveTargets already treats as this format's PRIMARY breakpoint and
// map-native's own produce.mjs threads as `mediaSize.width` for the identical purpose — reused,
// not a second width source invented here.
let resolvedConfigPath = configPath;
// The same missing bridge map-native's produce.mjs closes, on the same resolver: a map-track
// scrolly written straight from a spec (the prose chain writes it verbatim — lib/core/verbs/
// render.ts) never went through the loop's orient step either, so an admin-1 join arrives with
// no resolved region ids and the resolver refuses. Inert for the chart and image tracks: they
// carry no basemap, so the backfill returns without touching the config.
backfillAdm1FeatureIds(rawConfig);
const wroteGeometry = await resolveGeometryForProduce({
  config: rawConfig,
  assetsGeoDir: join(here, "..", "..", "map-native", "assets", "geo"),
  renderWidthPx: renderSize("article-web").width,
});
if (wroteGeometry) {
  // Persist the resolved config to THIS producer's own outDir — never back to the caller's own
  // `configPath` (mirrors map-native's produce.mjs: a real invocation against a repo-committed
  // sample fixture must not mutate that fixture on disk). `resolvedConfigPath` is what the Vite
  // build below reads via CONFIG=, and what the trailing config.json copy at the bottom of this
  // file is skipped for (already the right bytes, in the right place).
  resolvedConfigPath = join(outDir, "config.json");
  writeFileSync(resolvedConfigPath, JSON.stringify(rawConfig, null, 2) + "\n");
  buildConfigPath = resolvedConfigPath;
}

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
// render-time reduced-motion guard (WCAG 2.3.3) — under an emulated
// prefers-reduced-motion: reduce, the sticky graphic (map camera flight / chart
// reveal / image crossfade) must already show its end-state and never keep
// animating. Runs against the just-built dist before it is copied out. Fails the
// run before export.
console.log("[produce scrolly] checking prefers-reduced-motion is honored (snap-reduced-motion)…");
execFileSync("bun", ["scripts/snap-reduced-motion.mjs"], {
  stdio: "inherit",
  cwd: root,
  env: process.env,
});

const out = join(outDir, "scrolly.html");
copyFileSync(join(root, "dist", "index.html"), out);
const parsedConfig = JSON.parse(readFS(resolvedConfigPath, "utf8"));
writeFileSync(join(outDir, "source-manifest.json"), JSON.stringify(scrollySourceManifest(parsedConfig), null, 2) + "\n");
// Skip when geometry resolution already wrote this exact file (resolvedConfigPath IS
// outDir/config.json in that case) — copying it onto itself is a needless self-copy at best and,
// worse, `copyFileSync(configPath, ...)` would silently overwrite the resolved-geometry version
// with the caller's ORIGINAL (pre-resolution) config. Mirrors map-native's produce.mjs.
if (resolvedConfigPath !== join(outDir, "config.json")) {
  copyFileSync(resolvedConfigPath, join(outDir, "config.json"));
}
console.log("PRODUCE_RESULT " + JSON.stringify({ scrolly: out }));
