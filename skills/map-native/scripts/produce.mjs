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
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { mkdtempSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");

const configPath = process.argv[2];
const outDir = process.argv[3];
const format = process.argv[4] ?? process.env.FORMATS ?? "all";
const VALID = new Set(["static", "reveal", "story", "scrolly", "all"]);

if (!configPath || !outDir || !VALID.has(format)) {
  console.error("usage: produce.mjs <config.json> <outDir> <static|reveal|story|scrolly|all>");
  process.exit(1);
}

mkdirSync(outDir, { recursive: true });

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

console.log(`[produce map] snapping responsive…`);
run("bun", ["scripts/snap-responsive.mjs"], { OUTDIR: outDir, SERVE_DIR: interactiveDir });

console.log(`[produce map] snapping a11y…`);
run("bun", ["scripts/snap-a11y.mjs"], { OUTDIR: outDir, SERVE_DIR: interactiveDir });

const result = {
  static: join(outDir, "static.png"),
  interactive: join(outDir, "interactive.png"),
};

const parsedConfig = JSON.parse(readFileSync(configPath, "utf8"));
const isSymbol = parsedConfig.type === "symbol";
const isRoute = parsedConfig.type === "route";
const isLocator = parsedConfig.type === "locator";

// Returns the composition set for the story kind, dispatched on cameraMode.
// guided-tour: choropleth/symbol fly-through (SP2). route-reveal: draw-on route (SP3b).
function storyComps(config, cameraMode) {
  const isSymbolMap = config.type === "symbol";
  if (cameraMode === "guided-tour") {
    return isSymbolMap
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
  reveal: isSymbol
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
const kinds = isLocator
  ? []                       // Slice A: static + interactive web builds only; video is Slice B
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
