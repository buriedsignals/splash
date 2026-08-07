// produce(configPath, outDir, format): the cesium-flyover producer — render the 3D
// terrain flyover from an ARBITRARY config, mirroring skills/map-native/scripts/produce.mjs's
// contract exactly (same argv shape, same SPLASH_CHANNEL threading, same still→mp4→snap-video
// order, same PRODUCE_RESULT last line), so the orchestrator dispatches it like any other
// file-based engine.
//
//   bun scripts/produce.mjs <config.json> <outDir> <format>
//
// VIDEO IS THE ONLY FORMAT THIS ENGINE HAS. Not "not yet" — a flyover IS camera movement
// through terrain; a still of one is a satellite photograph and an interactive one is a map.
// The three other format words are refused BY NAME, each naming the act that resolves it
// (this repo's refusal convention), because "invalid format" leaves the journalist guessing
// which engine they actually wanted.
//
// Outputs:
//   video → { [aspect]: mp4, reviewStill }   (reviewStill IS the Gate-3 review, not a deliverable)
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { mkdtempSync, rmSync } from "node:fs";
import { basename, dirname, isAbsolute, join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { remotionCommand } from "../../map-native/src/platform-runners.ts";
import { runWithVideoWatchdog } from "../../map-native/src/video-watchdog.ts";
import { ALL_CHANNELS, channelAspect, isFormatAllowed } from "../../splash/src/channel.ts";
import { flyoverConfigErrors, resolveFlyoverProps, FLYOVER_COMPS } from "../src/validate-config.ts";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const mapNativeRoot = join(root, "..", "map-native");

// REMOTION_MAPTILER_KEY from the monorepo root .env when not already set — same problem and
// same fallback as map-native's produce.mjs (bun only auto-loads a `.env` from the process's
// cwd, and this script's cwd is the skill dir, two levels below the root where the real one
// lives). The key must be UNRESTRICTED: a domain-locked key 403s from headless Chrome
// (SKILL.md § "The gotcha that costs a day").
if (!process.env.REMOTION_MAPTILER_KEY || !process.env.VITE_MAPTILER_KEY) {
  try {
    for (const line of readFileSync(join(root, "../../.env"), "utf8").split("\n")) {
      const m = line.match(/^(VITE_MAPTILER_KEY|REMOTION_MAPTILER_KEY)\s*=\s*(.+)$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
    }
  } catch {
    // .env absent/unreadable — the component's own "REMOTION_MAPTILER_KEY missing" throw at
    // load time is the clear failure signal.
  }
}
// The two prefixes always hold the SAME MapTiler key (Vite exposes only VITE_*, Remotion only
// REMOTION_*) — mirror whichever one is set, exactly as map-native does.
process.env.REMOTION_MAPTILER_KEY ||= process.env.VITE_MAPTILER_KEY;
process.env.VITE_MAPTILER_KEY ||= process.env.REMOTION_MAPTILER_KEY;

// ── the format refusals ──────────────────────────────────────────────────────────────────
// Each names the act that resolves it. A journalist who asked for "a flyover, as a still"
// wanted a map; saying so is the whole value of refusing here instead of rendering something.
const FORMAT_REFUSALS = {
  static:
    'a flyover has no static format: it IS camera movement through terrain, and one frame of ' +
    'it is a satellite photograph, not a visual that carries the story. For an owned still of ' +
    'this place, produce a map-native "locator" (markers on a basemap) or "choropleth" in ' +
    'format "static" — bun skills/map-native/scripts/produce.mjs <config> <outDir> static.',
  interactive:
    'a flyover has no interactive format: the reader cannot be handed a Cesium globe as a ' +
    'self-contained HTML file (the engine and its terrain stream from the network at view ' +
    'time, and there is no data to explore). For a map the reader drives, produce map-native ' +
    'in format "interactive" — bun skills/map-native/scripts/produce.mjs <config> <outDir> interactive.',
  scrolly:
    'a flyover has no scrolly format: it is one continuous camera move, not a run of discrete ' +
    'steps with a sentence each. For a scroll-driven map story, dispatch the "scrolly" ' +
    'producer (skills/scrolly), which hosts map-native\'s rendering — or keep the flyover as ' +
    'the video and place it inside the article beside the scrolly.',
};

const VALID_FORMATS = new Set(["static", "interactive", "video", "scrolly"]);

const configPath = process.argv[2];
const outDir = process.argv[3];
const format = process.argv[4] ?? process.env.FORMAT;
if (!configPath || !outDir || !VALID_FORMATS.has(format)) {
  console.error("usage: produce.mjs <config.json> <outDir> video");
  process.exit(1);
}
if (format !== "video") {
  console.error(`[produce flyover] format "${format}" is not produced by cesium-flyover — ${FORMAT_REFUSALS[format]}`);
  process.exit(1);
}

// Channel (CADRAGE Q3, threaded by adapters.ts as SPLASH_CHANNEL) — fail-closed on an
// unrecognized non-empty value, exactly like map-native's produce.mjs. Absent/empty keeps
// the article-web default.
const rawChannel = (process.env.SPLASH_CHANNEL ?? "").trim();
const channel = rawChannel === "" ? "article-web" : rawChannel;
if (!ALL_CHANNELS.includes(channel)) {
  console.error(
    `[produce flyover] unknown SPLASH_CHANNEL "${rawChannel}" — expected one of ${ALL_CHANNELS.join(", ")} ` +
      "(absent/empty defaults to article-web); refusing to default an unrecognized channel to article-web.",
  );
  process.exit(1);
}
if (!isFormatAllowed(channel, "video")) {
  console.error(`[produce flyover] format "video" is not allowed for channel "${channel}" — refusing to produce.`);
  process.exit(1);
}
const aspect = channelAspect(channel);
// The two registered compositions are both 1280x720. A portrait or square flyover is not a
// crop of this one — the camera framing, the pitch and the look-ahead all change — so a
// vertical channel is refused BY NAME rather than silently handed a letterboxed landscape.
if (aspect !== "landscape") {
  console.error(
    `[produce flyover] channel "${channel}" wants a ${aspect} video, and this engine registers ` +
      "only landscape compositions (1280x720): a vertical flyover is a different camera framing, " +
      "not a crop of this one. Produce this element for an article-web/landscape channel, or " +
      "choose map-native's video (it renders portrait and square from the same config).",
  );
  process.exit(1);
}

mkdirSync(outDir, { recursive: true });

const parsedConfig = JSON.parse(readFileSync(configPath, "utf8"));

// ── config validation (fail-hard, before anything renders) ──────────────────────────────
const errors = flyoverConfigErrors(parsedConfig);
if (errors.length > 0) {
  console.error("[produce flyover] CONFIG REFUSED — nothing rendered:");
  errors.forEach((e) => console.error(`  ✗ ${e}`));
  process.exit(1);
}

// A centerline instead of control points: run this skill's own prep-path.mjs over it (clip →
// resample → smooth → dampen) rather than feeding raw vertices to the camera, which is the
// corner-artefact the prep step exists to remove. The prepared path is written into outDir —
// never back beside the caller's geojson.
let flyoverConfig = parsedConfig;
if (!parsedConfig.path) {
  const geojsonPath = isAbsolute(parsedConfig.routeGeoJSON)
    ? parsedConfig.routeGeoJSON
    : resolve(dirname(resolve(configPath)), parsedConfig.routeGeoJSON);
  if (!existsSync(geojsonPath)) {
    console.error(
      `[produce flyover] routeGeoJSON "${parsedConfig.routeGeoJSON}" does not exist (resolved to ` +
        `${geojsonPath}, relative to the config file). Point it at the LineString centerline file, ` +
        "or give the camera path inline as \"path\".",
    );
    process.exit(1);
  }
  const preparedPath = join(outDir, "camera-path.json");
  const coords = JSON.parse(readFileSync(geojsonPath, "utf8"))?.features?.[0]?.geometry?.coordinates;
  if (!Array.isArray(coords) || coords.length < 2) {
    console.error(
      `[produce flyover] "${geojsonPath}" carries no LineString: prep-path.mjs reads ` +
        "features[0].geometry.coordinates. Export the centerline as a single LineString feature.",
    );
    process.exit(1);
  }
  // Where the flight starts on that centerline. `routeStart` when the journalist named a
  // point, the line's own first vertex otherwise (prep-path snaps to the nearest vertex).
  const start = parsedConfig.routeStart ?? coords[0];
  console.log(`[produce flyover] preparing the camera path from ${basename(geojsonPath)}…`);
  execFileSync("bun", [join(here, "prep-path.mjs"), geojsonPath, preparedPath, String(start[0]), String(start[1])], {
    stdio: "inherit",
    cwd: root,
  });
  flyoverConfig = { ...parsedConfig, path: JSON.parse(readFileSync(preparedPath, "utf8")) };
}

// The exact config this run rendered, beside the outputs (same convention as map-native).
writeFileSync(join(outDir, "config.json"), JSON.stringify(flyoverConfig, null, 2) + "\n");

// ── render ──────────────────────────────────────────────────────────────────────────────
const { comp, durationInFrames, width, height, fps, props } = resolveFlyoverProps(flyoverConfig);
const stillFrame = Math.floor(durationInFrames / 2);

const isWin = process.platform === "win32";
const REMOTION = remotionCommand(process.platform);
const remotionEntry = join(root, "remotion", "src", "index.ts");
const renderEnv = { ...process.env };

const tmpDir = mkdtempSync(join(tmpdir(), "cesium-flyover-props-"));
const result = {};
try {
  const propsPath = join(tmpDir, "props.json");
  // Remotion merges these over the composition's defaultProps; CesiumFlyover takes its config
  // as its props directly (unlike map-native's `{ config }` wrapper — see remotion/src/Root.tsx).
  writeFileSync(propsPath, JSON.stringify(props));

  const stillOut = join(outDir, `video-${aspect}-still.png`);
  const mp4Out = join(outDir, `${aspect}.mp4`);

  // ONE still before the render — the discipline the whole video path here follows (SKILL.md
  // Quick start step 2): a framing mistake costs one frame, not 720. `--gl=angle` is mandatory
  // (WebGL under headless Chrome) and the timeout is generous because cold Cesium tiles far
  // exceed Remotion's default.
  console.log(`[produce flyover] ${comp} — review still (frame ${stillFrame})…`);
  await runWithVideoWatchdog(
    REMOTION[0],
    [...REMOTION.slice(1), "still", remotionEntry, comp, stillOut,
      `--frame=${stillFrame}`, "--gl=angle", "--timeout=180000", `--props=${propsPath}`],
    { cwd: root, env: renderEnv, shell: isWin },
  );

  // `--concurrency=1` is NOT a performance choice: every frame settles one shared Cesium
  // viewer, so two workers race on a single tile pipeline.
  console.log(`[produce flyover] ${comp} — mp4 (${durationInFrames} frames)…`);
  await runWithVideoWatchdog(
    REMOTION[0],
    [...REMOTION.slice(1), "render", remotionEntry, comp, mp4Out,
      "--gl=angle", "--concurrency=1", "--timeout=180000", `--props=${propsPath}`],
    { cwd: root, env: renderEnv, shell: isWin },
  );

  // The same mechanical video guard every other video-producing engine runs, fail-hard:
  // container sanity, real animation (no frozen or two-state video), no blank frame, and the
  // mp4's frame at `stillFrame` matching the still a human approved at Gate 3. Run from
  // map-native's own dir — it resolves Remotion's ffmpeg binaries relative to itself.
  console.log("[produce flyover] verifying the rendered mp4 (snap-video)…");
  execFileSync("bun", ["scripts/snap-video.mjs"], {
    stdio: "inherit",
    cwd: mapNativeRoot,
    shell: isWin,
    env: {
      ...process.env,
      MP4: mp4Out,
      STILL: stillOut,
      STILL_FRAME: String(stillFrame),
      FPS: String(fps),
      EXPECTED_FRAMES: String(durationInFrames),
      EXPECTED_WIDTH: String(width),
      EXPECTED_HEIGHT: String(height),
      OUTDIR: outDir,
    },
  });

  result[aspect] = mp4Out;
  result.reviewStill = stillOut; // the still IS the review, not a separate deliverable
  console.log(`[produce flyover] done rendering ${aspect}.`);
} finally {
  rmSync(tmpDir, { recursive: true, force: true });
}

console.log("PRODUCE_RESULT " + JSON.stringify(result));
