// produce(configPath, outDir): the map-native producer — build + render the
// native outputs from an ARBITRARY config. Injects the config via CONFIG=
// (Vite define for web, Remotion --props for video), so nothing touches the
// committed sample. Returns the output paths as JSON on stdout.
//
//   bun scripts/produce.mjs <config.json> <outDir> <static|reveal|story|all>
//   static — web build + 4 snaps only (no video)
//   reveal — web build + 4 snaps + ONE reveal video, at the channel's aspect
//   story  — web build + 4 snaps + ONE story video, at the channel's aspect
//   all    — web build + 4 snaps + ONE reveal + ONE story video
//
// Channel-driven format (Slice 2, ATELIER_CHANNEL env, default "article-web"): the
// static build is sized to the channel's exact pixels, and video/scrolly render ONLY
// the single comp matching the channel's aspect (portrait/square/landscape) — never
// the full landscape+square+portrait triple.
//
// Outputs:
//   { static, interactive, reveal?: {[aspectName]: mp4}, story?: {[aspectName]: mp4} }
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, rmSync, writeFileSync, copyFileSync } from "node:fs";
import { mkdtempSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { snapCommand, remotionCommand } from "../src/platform-runners.ts";
import { channelAspect, renderSize, assertRenderedSize } from "../../atelier/src/channel.ts";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");

// Render-size conformance (Slice 2, Task 4) — a cheap, render-free PNG-dimension
// probe: reads the IHDR chunk directly (PNG signature 8 bytes + 4-byte chunk length +
// 4-byte "IHDR" tag, then width/height as big-endian uint32 at bytes 16-19/20-23). No
// new dependency, cross-platform, no browser/Playwright needed — the file already
// exists on disk by the time this runs.
function readPngSize(pngPath) {
  const buf = readFileSync(pngPath);
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

// Reads a named Remotion <Composition>'s registered width/height straight out of
// Root.tsx's source text — "known constants" read at produce-time with no render (no
// React/Remotion runtime needed). Used to fail-hard if a future edit regresses a
// comp's dims (e.g. re-introducing the 4:5 1350 bug this slice fixed) without having
// to actually render the video.
function readCompDims(rootTsxSrc, compId) {
  const re = new RegExp(
    `id=["']${compId}["'][\\s\\S]*?width=\\{(\\d+)\\}[\\s\\S]*?height=\\{(\\d+)\\}`,
  );
  const m = rootTsxSrc.match(re);
  return m ? { width: Number(m[1]), height: Number(m[2]) } : null;
}

// Channel-driven format (Slice 2): the confirmed CADRAGE Q3 channel, forwarded by
// adapters.ts as `ATELIER_CHANNEL` (see adapters.ts's CHANNEL THREADING note). Absent
// (legacy proposals, manual runs) defaults to "article-web" — matches normalizeChannel's
// default and today's landscape-first behavior, so produce.mjs still works with no
// channel arg at all.
const channel = process.env.ATELIER_CHANNEL ?? "article-web";
const aspect = channelAspect(channel); // "portrait" | "square" | "landscape"
const mediaSize = renderSize(channel); // { width, height } — the channel's exact pixels

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

// Dark-video/scrolly gap warning: the video/scrolly renderers (*Story/*Reveal/*Scrolly
// under src/components/) do not yet honor mapStyle:dark — they always render a LIGHT
// basemap (a known, deferred follow-up; see CLAUDE.md "parité harnais-contraste côté
// map"). Warn (never fail — this is a known gap, not a defect) so a journalist who asked
// for a dark video/scrolly isn't silently handed a light MP4 with no explanation.
// `format` here is one of static|reveal|story|scrolly|all: only "static" also drives the
// interactive build without touching a video/scrolly renderer, so any other value means a
// video or scrolly kind will be rendered.
if (parsedConfig.mapStyle === "dataviz-dark" && format !== "static") {
  console.warn(
    `[produce map] WARNING: mapStyle "dataviz-dark" requested with format "${format}" — ` +
      "dark mode is not yet honored in the video/scrolly renderers; the output will render with a LIGHT basemap.",
  );
}

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

const isWin = process.platform === "win32";
const SNAP = snapCommand(process.platform);
const REMOTION = remotionCommand(process.platform);

const env = { ...process.env, CONFIG: configPath };
const run = (cmd, args, extraEnv = {}) =>
  execFileSync(cmd, args, {
    stdio: "inherit",
    cwd: root,
    env: { ...env, ...extraEnv },
    shell: isWin,
  });
const snap = (script, extraEnv = {}) => run(SNAP[0], [...SNAP.slice(1), script], extraEnv);

// 1. Web builds (config baked in via the Vite define) — each into its own dir
console.log(`[produce map] building static… → ${staticDir}`);
run("bunx", ["vite", "build"], { BUILD_OUT: staticDir });

console.log(`[produce map] building interactive… → ${interactiveDir}`);
run("bunx", ["vite", "build"], { INTERACTIVE: "1", BUILD_OUT: interactiveDir });

// 2. Snap static + interactive into outDir — tell each script which build dir to use.
// Static is sized to the channel's exact deliverable pixels (MAP_WIDTH/MAP_HEIGHT) —
// interactive stays unsized (channel "interactive" is only ever article-web, which never
// needs a fixed pixel box — it fills its host).
console.log(`[produce map] snapping static… (channel=${channel} aspect=${aspect} ${mediaSize.width}x${mediaSize.height})`);
snap("scripts/snap-static.mjs", {
  OUTDIR: outDir,
  SERVE_DIR: staticDir,
  MAP_WIDTH: String(mediaSize.width),
  MAP_HEIGHT: String(mediaSize.height),
});

console.log(`[produce map] snapping interactive (proof)…`);
snap("scripts/snap-proof.mjs", { OUTDIR: outDir, SERVE_DIR: interactiveDir });

// Copy self-contained interactive.html into outDir
const interactiveHtmlSrc = join(interactiveDir, "index.html");
const interactiveHtmlDest = join(outDir, "interactive.html");
copyFileSync(interactiveHtmlSrc, interactiveHtmlDest);
console.log(`[produce map] interactive.html → ${interactiveHtmlDest}`);
run("bun", ["scripts/assert-selfcontained.mjs", interactiveHtmlDest]);

console.log(`[produce map] snapping responsive…`);
snap("scripts/snap-responsive.mjs", { OUTDIR: outDir, SERVE_DIR: interactiveDir });

console.log(`[produce map] snapping a11y…`);
snap("scripts/snap-a11y.mjs", { OUTDIR: outDir, SERVE_DIR: interactiveDir });

// Theme guard — ONLY when the config asked for the dark basemap: assert the STATIC
// build actually rendered dark (furniture + basemap), not just that the config said so.
// Placed after snap-a11y (the last step in this pipeline); map-native has no
// snap-contrast.mjs yet (that harness is a separate, not-yet-built satellite — see
// CLAUDE.md "parité harnais-contraste côté map"). Fail-hard, like every other snap-*.
if (parsedConfig.mapStyle === "dataviz-dark") {
  console.log(`[produce map] snapping theme (dark)…`);
  snap("scripts/snap-theme.mjs", { OUTDIR: outDir, SERVE_DIR: staticDir });
}

// Render-size conformance (Slice 2, Task 4) — the produced static.png's pixel
// dimensions must equal the channel's exact media size. Fail-hard before export,
// wired like snap-theme/snap-a11y above. No render: static.png already exists on
// disk (snap-static above already sized the build to MAP_WIDTH/MAP_HEIGHT); this
// just reads its IHDR chunk to confirm what actually landed on disk.
console.log(`[produce map] checking rendered size vs channel "${channel}"…`);
{
  const staticPngPath = join(outDir, "static.png");
  const { width: actualW, height: actualH } = readPngSize(staticPngPath);
  try {
    assertRenderedSize(actualW, actualH, channel);
    console.log(`[produce map] render-size: OK (${actualW}x${actualH} matches channel "${channel}").`);
  } catch (err) {
    console.error(`[produce map] RENDER-SIZE VIOLATION — refusing to produce: ${err.message}`);
    process.exit(1);
  }
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
    run(REMOTION[0], [...REMOTION.slice(1), "still", remotionEntry, comp, stillOut,
      `--frame=${STILL_FRAME[kind]}`, "--gl=angle", `--props=${propsPath}`], { COMP: comp });
    console.log(`[produce map] ${kind} ${name} (${comp}) — mp4…`);
    run(REMOTION[0], [...REMOTION.slice(1), "render", remotionEntry, comp, mp4Out,
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
    // Video render-size conformance (Task 4) — read Root.tsx once and assert the
    // SELECTED comp's registered dims (no render). Square/Portrait comps are
    // uniformly pinned to renderSize(channel) across all 7 map types (1080x1080 /
    // 1080x1920 — the true-9:16 fix this slice made), so an exact match is a real
    // regression guard (e.g. against re-introducing the 4:5 1350 bug). Landscape
    // comps keep the pre-channel 1280x720 convention (same 16:9 aspect ratio as
    // article-web's 1200x675, but not the exact pixel box) — out of this slice's
    // scope (see plan self-review "repoint only"); enforcing exact equality there
    // would fail-hard on every article-web video (the DEFAULT channel), which the
    // Final e2e render-verify expects to still render. So we only hard-assert for
    // portrait/square and log landscape's actual dims for visibility.
    const rootTsxSrc = readFileSync(join(root, "remotion", "src", "Root.tsx"), "utf8");
    for (const kind of kinds) {
      const allComps = kind === "story"
        ? storyComps(config, cameraMode)   // dispatches on cameraMode
        : kind === "scrolly"
          ? SCROLLY_COMPS
          : VIDEO_COMPS[kind];
      // Render ONLY the comp matching the channel's aspect (portrait/square/landscape) —
      // not the unconditional triple. Cuts render cost 3→1 and guarantees the channel is
      // the only aspect ever emitted (e.g. a social-vertical run never produces a stray
      // square/landscape mp4).
      const comps = allComps.filter(([, name]) => name === aspect);
      if (comps.length === 0) {
        throw new Error(
          `no ${kind} comp matches channel '${channel}' aspect '${aspect}' (available: ${allComps.map(([, n]) => n).join(", ")})`,
        );
      }
      for (const [comp] of comps) {
        const compDims = readCompDims(rootTsxSrc, comp);
        if (!compDims) {
          console.error(`[produce map] could not find comp "${comp}" dims in Root.tsx`);
          process.exit(1);
        }
        if (aspect === "portrait" || aspect === "square") {
          try {
            assertRenderedSize(compDims.width, compDims.height, channel);
            console.log(
              `[produce map] video render-size: OK (${comp} ${compDims.width}x${compDims.height} matches channel "${channel}").`,
            );
          } catch (err) {
            console.error(`[produce map] VIDEO RENDER-SIZE VIOLATION — refusing to produce: ${err.message}`);
            process.exit(1);
          }
        } else {
          console.log(
            `[produce map] video render-size: ${comp} is ${compDims.width}x${compDims.height} (landscape keeps its pre-channel 1280x720 convention, not pinned to the channel's exact mediaSize — see comment above).`,
          );
        }
      }
      result[kind] = renderVideoSet(kind, propsPath, remotionEntry, comps);
    }
  } finally {
    rmSync(tmpDir, { recursive: true, force: true });
  }
}

console.log("PRODUCE_RESULT " + JSON.stringify(result));
