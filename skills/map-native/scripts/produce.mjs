// produce(configPath, outDir): the map-native producer — build + render the
// native outputs from an ARBITRARY config. Injects the config via CONFIG=
// (Vite define for web, Remotion --props for video), so nothing touches the
// committed sample. Returns the output paths as JSON on stdout.
//
//   bun scripts/produce.mjs <config.json> <outDir> <static|reveal|story|all>
//   static — web build + 4 snaps only (no video)
//   reveal — web build + 4 snaps + reveal videos (landscape/square/portrait)
//   story  — web build + 4 snaps + story videos (landscape/square/portrait)
//   all    — web build + 4 snaps + reveal + story videos
//
// Outputs:
//   { static, interactive, reveal?: {landscape,square,portrait}, story?: {landscape,square,portrait} }
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, rmSync, writeFileSync, copyFileSync } from "node:fs";
import { mkdtempSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");

const configPath = process.argv[2];
const outDir = process.argv[3];
// Default to `static` (one fast PNG), NOT `all` — an omitted flag must never silently
// trigger the full video set (up to 9 heavy Remotion renders, needing a MapTiler key +
// ANGLE + Chromium and minutes each). Callers asking for video pass the format explicitly.
const formatArg = process.argv[4] ?? process.env.FORMATS;
const format = formatArg ?? "static";
const VALID = new Set(["static", "reveal", "story", "scrolly", "all"]);

if (!configPath || !outDir || !VALID.has(format)) {
  console.error("usage: produce.mjs <config.json> <outDir> <static|reveal|story|scrolly|all>");
  process.exit(1);
}
if (!formatArg) {
  console.error("note: no format given → defaulting to `static`. Pass reveal|story|scrolly|all for video.");
}

mkdirSync(outDir, { recursive: true });

// Read the config once — reused below both for the conformance gate and for the
// per-type dispatch (video comps) further down, so there is no double-read.
const parsedConfig = JSON.parse(readFileSync(configPath, "utf8"));

// Conformance-at-produce-time: run the type-appropriate guard (core/map-produce-conformance.ts)
// against the ACTUAL config being rendered — furniture L0 (insight title, source name+url, WCAG
// contrast) + palette CVD-safety for the ramp-driven types — BEFORE any build step. A violation
// fails the run here; nothing is built, nothing is rendered. Mirrors chart-native's produce.mjs gate.
{
  const { runProduceMapConformance } = await import("../src/core/map-produce-conformance.ts");
  const res = runProduceMapConformance(parsedConfig.type, parsedConfig);
  if (!res.checked) {
    console.log(`[produce map] conformance: no guard wired for "${parsedConfig.type ?? "choropleth"}" — skipping.`);
  } else if (res.violations.length > 0) {
    console.error("[produce map] CONFORMANCE VIOLATION — refusing to produce:");
    res.violations.forEach((v) => console.error(`  ✗ ${v}`));
    process.exit(1);
  } else {
    console.log("[produce map] conformance: OK (0 violations)");
  }
}

// Per-run build dirs: isolate so concurrent runs never contaminate each other
const tag = basename(outDir).replace(/[^a-z0-9_-]/gi, "") || "run";
const staticDir = join(root, "dist", `static-${tag}`);
const interactiveDir = join(root, "dist", `interactive-${tag}`);

const env = { ...process.env, CONFIG: configPath };
const run = (cmd, args, extraEnv = {}) =>
  execFileSync(cmd, args, {
    stdio: "inherit",
    cwd: root,
    env: { ...env, ...extraEnv },
  });

// 1. Web builds (config baked in via the Vite define) — each into its own dir
console.log(`[produce map] building static… → ${staticDir}`);
run("bunx", ["vite", "build"], { BUILD_OUT: staticDir });

console.log(`[produce map] building interactive… → ${interactiveDir}`);
run("bunx", ["vite", "build"], { INTERACTIVE: "1", BUILD_OUT: interactiveDir });

// 2. Snap static + interactive into outDir — tell each script which build dir to use
console.log(`[produce map] snapping static…`);
run("bun", ["scripts/snap-static.mjs"], { OUTDIR: outDir, SERVE_DIR: staticDir });

console.log(`[produce map] snapping interactive (proof)…`);
run("bun", ["scripts/snap-proof.mjs"], { OUTDIR: outDir, SERVE_DIR: interactiveDir });

// Copy self-contained interactive.html into outDir
const interactiveHtmlSrc = join(interactiveDir, "index.html");
const interactiveHtmlDest = join(outDir, "interactive.html");
copyFileSync(interactiveHtmlSrc, interactiveHtmlDest);
console.log(`[produce map] interactive.html → ${interactiveHtmlDest}`);
run("bun", ["scripts/assert-selfcontained.mjs", interactiveHtmlDest]);

console.log(`[produce map] snapping responsive…`);
run("bun", ["scripts/snap-responsive.mjs"], { OUTDIR: outDir, SERVE_DIR: interactiveDir });

console.log(`[produce map] snapping a11y…`);
run("bun", ["scripts/snap-a11y.mjs"], { OUTDIR: outDir, SERVE_DIR: interactiveDir });

// Theme guard — ONLY when the config asked for the dark basemap: assert the STATIC
// build actually rendered dark (furniture + basemap), not just that the config said so.
// Placed after snap-a11y (the last step in this pipeline); map-native has no
// snap-contrast.mjs yet (that harness is a separate, not-yet-built satellite — see
// CLAUDE.md "parité harnais-contraste côté map"). Fail-hard, like every other snap-*.
if (parsedConfig.mapStyle === "dataviz-dark") {
  console.log(`[produce map] snapping theme (dark)…`);
  run("bun", ["scripts/snap-theme.mjs"], { OUTDIR: outDir, SERVE_DIR: staticDir });
}

const result = {
  static: join(outDir, "static.png"),
  interactive: join(outDir, "interactive.png"),
  interactiveHtml: interactiveHtmlDest,
};

const isSymbol = parsedConfig.type === "symbol";
const isRoute = parsedConfig.type === "route";
const isLocator = parsedConfig.type === "locator";
const isDotDensity = parsedConfig.type === "dot-density";
const isHexGrid = parsedConfig.type === "hex-grid";
const isCartogram = parsedConfig.type === "cartogram";

// Returns the composition set for the story kind, dispatched on cameraMode.
// guided-tour: choropleth/symbol fly-through (SP2). route-reveal: draw-on route (SP3b).
function storyComps(config, cameraMode) {
  const isSymbolMap = config.type === "symbol";
  const isLocatorMap = config.type === "locator";
  const isDotDensityMap = config.type === "dot-density";
  const isHexGridMap = config.type === "hex-grid";
  const isCartogramMap = config.type === "cartogram";
  if (cameraMode === "guided-tour") {
    return isCartogramMap
      ? [["CartogramStory", "landscape"], ["CartogramStorySquare", "square"], ["CartogramStoryPortrait", "portrait"]]
      : isHexGridMap
      ? [["HexGridStory", "landscape"], ["HexGridStorySquare", "square"], ["HexGridStoryPortrait", "portrait"]]
      : isDotDensityMap
      ? [["DotDensityStory", "landscape"], ["DotDensityStorySquare", "square"], ["DotDensityStoryPortrait", "portrait"]]
      : isLocatorMap
      ? [["LocatorStory", "landscape"], ["LocatorStorySquare", "square"], ["LocatorStoryPortrait", "portrait"]]
      : isSymbolMap
      ? [["SymbolStory", "landscape"], ["SymbolStorySquare", "square"], ["SymbolStoryPortrait", "portrait"]]
      : [["ChoroplethStory", "landscape"], ["ChoroplethStorySquare", "square"], ["ChoroplethStoryPortrait", "portrait"]];
  }
  if (cameraMode === "route-reveal") {
    return [["RouteReveal", "landscape"], ["RouteRevealSquare", "square"], ["RouteRevealPortrait", "portrait"]];
  }
  throw new Error(`camera mode '${cameraMode}' is not implemented`);
}

// comps[kind] = [[compId, sizeName], ...] for the config's type
const VIDEO_COMPS = {
  reveal: isCartogram
    ? [["CartogramReveal", "landscape"], ["CartogramRevealSquare", "square"], ["CartogramRevealPortrait", "portrait"]]
    : isHexGrid
    ? [["HexGridReveal", "landscape"], ["HexGridRevealSquare", "square"], ["HexGridRevealPortrait", "portrait"]]
    : isDotDensity
    ? [["DotDensityReveal", "landscape"], ["DotDensityRevealSquare", "square"], ["DotDensityRevealPortrait", "portrait"]]
    : isLocator
    ? [["LocatorReveal", "landscape"], ["LocatorRevealSquare", "square"], ["LocatorRevealPortrait", "portrait"]]
    : isSymbol
    ? [["SymbolReveal", "landscape"], ["SymbolRevealSquare", "square"], ["SymbolRevealPortrait", "portrait"]]
    : [["ChoroplethReveal", "landscape"], ["ChoroplethRevealSquare", "square"], ["ChoroplethRevealPortrait", "portrait"]],
};

const SCROLLY_COMPS = [
  ["MapScrolly", "landscape"],
  ["MapScrollySquare", "square"],
  ["MapScrollyPortrait", "portrait"],
];

// Still mid-frame per kind (reveal is 240 frames; story uses its existing 140).
const STILL_FRAME = { reveal: 120, story: 140, scrolly: 140 };

function renderVideoSet(kind, propsPath, remotionEntry, comps) {
  const out = {};
  for (const [comp, name] of comps) {
    const stillOut = join(outDir, `${kind}-${name}-still.png`);
    const mp4Out = join(outDir, `${kind}-${name}.mp4`);
    console.log(`[produce map] ${kind} ${name} (${comp}) — still…`);
    run("bunx", ["remotion", "still", remotionEntry, comp, stillOut,
      `--frame=${STILL_FRAME[kind]}`, "--gl=angle", `--props=${propsPath}`], { COMP: comp });
    console.log(`[produce map] ${kind} ${name} (${comp}) — mp4…`);
    run("bunx", ["remotion", "render", remotionEntry, comp, mp4Out,
      "--gl=angle", "--concurrency=1", "--timeout=120000", `--props=${propsPath}`], { COMP: comp });
    out[name] = mp4Out;
  }
  return out;
}

// Route has no simple-reveal; its only video is route-reveal (story-kind).
// For route: all/reveal/story → ["story"]; static → []. Non-route branch unchanged.
// Cartogram: Slice B adds reveal + story video kinds (scrolly in Task 3).
const kinds = isCartogram
  ? (format === "static" ? [] : format === "reveal" ? ["reveal"] : format === "story" ? ["story"] : format === "scrolly" ? ["scrolly"] : format === "all" ? ["reveal", "story", "scrolly"] : [])
  : isHexGrid
  ? (format === "static" ? [] : format === "reveal" ? ["reveal"] : format === "story" ? ["story"] : format === "scrolly" ? ["scrolly"] : format === "all" ? ["reveal", "story", "scrolly"] : [])
  : isDotDensity
  ? (format === "static" ? [] : format === "reveal" ? ["reveal"] : format === "story" ? ["story"] : format === "scrolly" ? ["scrolly"] : format === "all" ? ["reveal", "story", "scrolly"] : [])
  : isLocator
  ? (format === "static" ? [] : format === "reveal" ? ["reveal"] : format === "story" ? ["story"] : format === "scrolly" ? ["scrolly"] : format === "all" ? ["reveal", "story", "scrolly"] : [])
  : isRoute
  ? (format === "static" ? [] : format === "scrolly" ? ["scrolly"] : format === "all" ? ["story", "scrolly"] : ["story"])
  : (format === "all" ? ["reveal", "story", "scrolly"]
     : format === "reveal" ? ["reveal"]
     : format === "story" ? ["story"]
     : format === "scrolly" ? ["scrolly"]
     : []);
if (kinds.length) {
  const config = parsedConfig;
  const cameraMode = config.cameraMode ?? (isRoute ? "route-reveal" : "guided-tour");
  const tmpDir = mkdtempSync(join(tmpdir(), "map-native-props-"));
  try {
    const propsPath = join(tmpDir, "props.json");
    writeFileSync(propsPath, JSON.stringify({ config }));
    const remotionEntry = join(root, "remotion", "src", "index.ts");
    for (const kind of kinds) {
      const comps = kind === "story"
        ? storyComps(config, cameraMode)   // dispatches on cameraMode
        : kind === "scrolly"
          ? SCROLLY_COMPS
          : VIDEO_COMPS[kind];
      result[kind] = renderVideoSet(kind, propsPath, remotionEntry, comps);
    }
  } finally {
    rmSync(tmpDir, { recursive: true, force: true });
  }
}

console.log("PRODUCE_RESULT " + JSON.stringify(result));
