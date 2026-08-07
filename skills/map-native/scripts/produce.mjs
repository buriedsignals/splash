// produce(configPath, outDir, format): the map-native producer — build + render the
// native outputs from an ARBITRARY config. Injects the config via CONFIG=
// (Vite define for web, Remotion --props for video), so nothing touches the
// committed sample. Returns the output paths as JSON on stdout.
//
//   bun scripts/produce.mjs <config.json> <outDir> <format>
//   format: the SINGLE VisualFormat to build — "static" | "interactive" | "video" |
//   "scrolly" (the ../../splash/src/channel.ts vocabulary — same format-value set as
//   chart-native's produce.mjs, single-format-produce-export design). Builds EXACTLY
//   that one format's artifacts, nothing else (no cross-format byproducts — e.g. a
//   "static" run no longer also builds interactive.html just because the channel
//   allows it). "scrolly" is not built by map-native directly (see the case below) —
//   it fails hard, mirroring chart-native.
//
// Video-kind note: map-native has always offered TWO video styles internally —
// "reveal" (fixed camera, data fades/animates in — the *Reveal components) and "story"
// (camera-guided narrative tour derived from deriveMapStory beats — the *Story
// components). The single VisualFormat "video" has no slot for that second axis on its
// own, so it is a SEPARATE config field, `cameraMode` (./lib/story-comps.mjs), that
// picks between them: unset defaults to the STORY kind — every type but route supports
// it, and it is the project's own documented preference ("a reveal that just fades
// every region in at once tells no story" — SKILL.md §Narrated story) — but a config
// that sets `cameraMode: "simple"` explicitly gets the fixed-camera reveal instead. The
// old "scrolly-captured-as-mp4" kind (a video CAPTURE of the scroll experience) is still
// not reachable through this CLI — the true scrolly HTML format lives in skills/scrolly
// (see the "scrolly" case); that render path is not deleted, just unwired from this
// single-format entry point.
//
// Outputs (only the built format's keys are present):
//   static      → { static }
//   interactive → { interactive, reviewStill } (reviewStill is EPHEMERAL, not shipped)
//   video       → { [aspect]: mp4, reviewStill } (reviewStill IS the review, not a
//                 separate deliverable)
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, rmSync, writeFileSync, copyFileSync } from "node:fs";
import { mkdtempSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { snapCommand, remotionCommand } from "../src/platform-runners.ts";
import { runWithVideoWatchdog } from "../src/video-watchdog.ts";
import { mapSourceManifest } from "../src/source-manifest.ts";
import { readCompDims } from "./lib/comp-registry.mjs";
import { storyComps, defaultCameraMode } from "./lib/story-comps.mjs";
import { ALL_CHANNELS, channelAspect, renderSize, assertRenderedSize, isFormatAllowed } from "../../splash/src/channel.ts";
import { resolveGeometryForProduce } from "../../../lib/geo/resolve-for-produce.ts";
import { backfillAdm1FeatureIds } from "../src/adm1-backfill.ts";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");

// Load VITE_MAPTILER_KEY / REMOTION_MAPTILER_KEY from the monorepo root .env when not
// already set, mirroring skills/scrolly/scripts/produce.mjs's own fallback (same
// problem: bun/vite only auto-load a `.env` from the process's cwd, and this script's
// cwd is the skill dir, two levels below the monorepo root where the real `.env`
// lives). Every map component throws "*_MAPTILER_KEY missing" at load time without
// it — even a "static" build needs VITE_MAPTILER_KEY, and "video" additionally needs
// REMOTION_MAPTILER_KEY (Remotion's own env-prefix convention) for the Remotion CLI
// subprocess. Silent when the file is absent/unreadable — the map component's own
// throw is the real, clear failure signal in that case.
if (!process.env.VITE_MAPTILER_KEY || !process.env.REMOTION_MAPTILER_KEY) {
  const rootEnv = join(root, "../../.env");
  try {
    const lines = readFileSync(rootEnv, "utf8").split("\n");
    for (const line of lines) {
      const m = line.match(/^(VITE_MAPTILER_KEY|REMOTION_MAPTILER_KEY)\s*=\s*(.+)$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
    }
  } catch {
    // .env absent or unreadable — proceed; the map components' own throw at load
    // time is the clear failure signal.
  }
}

// Mirror one MapTiler key onto the other when only one is set: the two ALWAYS hold the SAME MapTiler
// key — Vite exposes only `VITE_`-prefixed vars to the web bundle, Remotion only `REMOTION_`-prefixed
// vars to the video composition, so the same key must appear under both prefixes. The installer
// writes both from one input; this covers a hand-edited `.env` that sets only one — the web AND the
// video build then both get the key from a single line. `||=` so an empty value ("KEY=") also falls
// back rather than shadowing the other with an empty string.
process.env.REMOTION_MAPTILER_KEY ||= process.env.VITE_MAPTILER_KEY;
process.env.VITE_MAPTILER_KEY ||= process.env.REMOTION_MAPTILER_KEY;

// The fixed 8-byte PNG file signature (RFC 2083 / ISO 15948 §5.2).
const PNG_SIGNATURE = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
]);

// Render-size conformance (Slice 2, Task 4) — a cheap, render-free PNG-dimension
// probe: reads the IHDR chunk directly (PNG signature 8 bytes + 4-byte chunk length +
// 4-byte "IHDR" tag, then width/height as big-endian uint32 at bytes 16-19/20-23). No
// new dependency, cross-platform, no browser/Playwright needed — the file already
// exists on disk by the time this runs. The signature is CHECKED first: fixed offsets
// off a non-PNG yield garbage "dimensions" and a confusing size-mismatch error — fail
// with the real problem instead (kept in lockstep with chart-native's twin and
// map-dw's src/produce.ts readPngSize).
function readPngSize(pngPath) {
  const buf = readFileSync(pngPath);
  if (buf.length < 24 || !buf.subarray(0, 8).equals(PNG_SIGNATURE)) {
    throw new Error(
      `"${pngPath}" is not a PNG (bad or missing 8-byte PNG signature) — cannot read IHDR dimensions`,
    );
  }
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

// readCompDims — a comp's registered width/height literals read straight out of
// Root.tsx at produce-time (no render), to fail-hard if a future edit regresses a
// comp's dims (e.g. re-introducing the 4:5 1350 bug this slice fixed). The scan is
// bounded to the comp's own tag — see scripts/lib/comp-registry.mjs (mirrored).

// Channel-driven format (Slice 2): the confirmed CADRAGE Q3 channel, forwarded by
// adapters.ts as `SPLASH_CHANNEL` (see adapters.ts's CHANNEL THREADING note). Absent
// (legacy proposals, manual runs) defaults to "article-web" — matches normalizeChannel's
// default and today's landscape-first behavior, so produce.mjs still works with no
// channel arg at all.
//
// FAIL-CLOSED (defense in depth below the produce-all gate, mirrors chart-native's
// produce.mjs): an unrecognized NON-EMPTY value used to crash later inside
// channelAspect() with an opaque TypeError — refuse it here with a clear message
// instead, and never default it to article-web. Only the CANONICAL values are
// accepted: the spine normalizes aliases/case-variants ("feed", "Stories") to
// canonical BEFORE threading, so the alias table lives once in normalizeChannel and
// is never duplicated here. Absent/EMPTY keeps the article-web default.
const rawChannel = (process.env.SPLASH_CHANNEL ?? "").trim();
const channel = rawChannel === "" ? "article-web" : rawChannel;
if (!ALL_CHANNELS.includes(channel)) {
  console.error(
    `produce: unknown SPLASH_CHANNEL "${rawChannel}" — expected one of ${ALL_CHANNELS.join(", ")} ` +
      "(absent/empty defaults to article-web); refusing to default an unrecognized channel to article-web.",
  );
  process.exit(1);
}
const aspect = channelAspect(channel); // "portrait" | "square" | "landscape"
const mediaSize = renderSize(channel); // { width, height } — the channel's exact pixels

// Channel-gated interactive (fix/channel-gated-produce, kept under the single-format
// redesign): the "interactive" format is only buildable when the channel actually
// allows it (social-vertical / social-feed forbid it — allowedFormats = static,
// video). `case "interactive"` below fails hard rather than silently producing when
// this is false.
const interactiveAllowed = isFormatAllowed(channel, "interactive");

// The single-format-produce-export redesign's vocabulary (mirrors chart-native's
// produce.mjs — kept as a plain runtime Set here since this is a .mjs, not imported,
// to avoid a type-only import needing a bundler step).
const VALID_FORMATS = new Set(["static", "interactive", "video", "scrolly"]);

const configPath = process.argv[2];
const outDir = process.argv[3];
const format = process.argv[4] ?? process.env.FORMAT;
if (!configPath || !outDir || !VALID_FORMATS.has(format)) {
  console.error("usage: produce.mjs <config.json> <outDir> <static|interactive|video|scrolly>");
  process.exit(1);
}

mkdirSync(outDir, { recursive: true });

// Read the config once — reused below both for the conformance gate and for the
// per-type dispatch (video comps) further down, so there is no double-read.
const parsedConfig = JSON.parse(readFileSync(configPath, "utf8"));

// The path handed to Vite/Remotion via `CONFIG=` below (env, :349ish) — starts as the
// caller's own `configPath` and is repointed to the resolved outDir/config.json once
// geometry resolution runs. NEVER overwrite `configPath` itself in place: it is a
// caller-owned file — a real produce.mjs invocation against a repo-committed sample
// fixture (assets/sample-data/*.json), run directly while verifying this task, mutated
// that committed fixture on disk the first time this was tried writing back to
// `configPath` — exactly the footgun a shared/reusable fixture path invites. Writing
// only to a location this script owns (outDir) avoids it entirely.
let resolvedConfigPath = configPath;

// The geography match the PROSE chain has no other place to run. A config that came through
// the loop (orient → assemble) already carries `featureIdsByValue` and this is a no-op; a
// config written straight from a spec — which is what lib/core/verbs/render.ts hands every
// journalist run — reaches admin-1 geometry through here or not at all. Before the resolver
// on purpose: it is the field the resolver refuses without.
backfillAdm1FeatureIds(parsedConfig);

const wroteGeometry = await resolveGeometryForProduce({
  config: parsedConfig,
  assetsGeoDir: join(root, "assets", "geo"),
  renderWidthPx: mediaSize.width,
  format,
});
if (wroteGeometry) {
  // Persist the resolved config to outDir/config.json — never back to the caller's own
  // `configPath` (see the comment on `resolvedConfigPath` above) — and repoint
  // `resolvedConfigPath` there so vite.config.ts's `CONFIG=` re-read below picks up the
  // resolved geometry for every build. Written now, before any build/snap step that may
  // need VITE_MAPTILER_KEY/REMOTION_MAPTILER_KEY, so the resolved geometry is observable
  // on disk even if a later step fails for an unrelated reason. The "interactive" branch's
  // own config.json copy further down is skipped when it would be a same-path no-op (see
  // that branch) — tolerated by every format's delivery contract either way
  // (lib/core/contract.ts: "config.json ... legitimately sit beside the deliverable").
  resolvedConfigPath = join(outDir, "config.json");
  writeFileSync(resolvedConfigPath, JSON.stringify(parsedConfig, null, 2) + "\n");
}

// Dark-video gap warning: the video renderer (*Story under src/components/) does not
// yet honor mapStyle:dark — it always renders a LIGHT basemap (a known, deferred
// follow-up; see CLAUDE.md "parité harnais-contraste côté map"). Warn (never fail —
// this is a known gap, not a defect) so a journalist who asked for a dark video isn't
// silently handed a light MP4 with no explanation. Only "video" touches the renderer.
if (parsedConfig.mapStyle === "dataviz-dark" && format === "video") {
  console.warn(
    `[produce map] WARNING: mapStyle "dataviz-dark" requested with format "video" — ` +
      "dark mode is not yet honored in the video renderer; the output will render with a LIGHT basemap.",
  );
}

// Route arc notice: a route's video draws its line on continuously, so a confirmed storyboard
// has no camera stops to drive and its prose never appears. Sound behaviour (RouteReveal.tsx
// explains why), but the reachability audit found it to be the only map type that drops
// `arcBeats` in SILENCE — and rated that above a hard refusal, because a refusal is something
// the journalist learns. A notice, not a failure: the video is still the right artefact.
{
  const { routeArcNotice } = await import("../src/route-arc-notice.ts");
  const notice = routeArcNotice({
    type: parsedConfig.type,
    format,
    arcBeats: parsedConfig.arcBeats,
  });
  if (notice) console.warn(`[produce map] WARNING: ${notice}`);
}

// Conformance-at-produce-time: run the type-appropriate guard (core/map-produce-conformance.ts)
// against the ACTUAL config being rendered — furniture L0 (insight title, source name+url, WCAG
// contrast) + palette CVD-safety for the ramp-driven types — BEFORE any build step. A violation
// fails the run here; nothing is built, nothing is rendered. Mirrors chart-native's produce.mjs gate.
{
  const { runProduceMapConformance } = await import("../src/core/map-produce-conformance.ts");
  // mediaSize was already computed above (the channel's real renderSize) — thread it through
  // so the symbol guard's viewportMinPx measures the REAL per-channel viewport instead of
  // falling back to a fixed article-web-sized assumption for every channel.
  const res = runProduceMapConformance(parsedConfig.type, parsedConfig, mediaSize);
  if (!res.checked) {
    console.log(`[produce map] conformance: no guard wired for "${parsedConfig.type ?? "choropleth"}" — skipping.`);
  } else if (res.violations.length > 0) {
    console.error("[produce map] CONFORMANCE VIOLATION — refusing to produce:");
    res.violations.forEach((v) => console.error(`  ✗ ${v}`));
    process.exit(1);
  } else {
    console.log("[produce map] conformance: OK (0 violations)");
  }
  // Non-blocking review concerns (policy b — kept as produced, verify at render-review). Printed
  // on the pass path; a hard violation above has already aborted before this.
  if (res.concerns && res.concerns.length > 0) {
    console.warn("[produce map] conformance CONCERNS (kept — verify at render-review):");
    res.concerns.forEach((c) => console.warn(`  ⚠ ${c}`));
  }
}

// Per-run build dirs: isolate so concurrent runs never contaminate each other
const tag = basename(outDir).replace(/[^a-z0-9_-]/gi, "") || "run";
const staticDir = join(root, "dist", `static-${tag}`);
const interactiveDir = join(root, "dist", `interactive-${tag}`);

const isWin = process.platform === "win32";
const SNAP = snapCommand(process.platform);
const REMOTION = remotionCommand(process.platform);

const env = { ...process.env, CONFIG: resolvedConfigPath };
const run = (cmd, args, extraEnv = {}) =>
  execFileSync(cmd, args, {
    stdio: "inherit",
    cwd: root,
    env: { ...env, ...extraEnv },
    shell: isWin,
  });
const snap = (script, extraEnv = {}) => run(SNAP[0], [...SNAP.slice(1), script], extraEnv);

// storyComps (the composition set for the story kind, dispatched on cameraMode) and
// defaultCameraMode (the no-choice fallback) now live in ./lib/story-comps.mjs — pulled out
// of this script so they can be unit-tested by calling them directly (this script cannot be
// imported in a test: process.argv parsing + process.exit below run the moment it loads).
// See skills/map-native/tests/story-comps.test.ts.

// Still mid-frame for the story kind (matches the pre-single-format STILL_FRAME.story).
const STORY_STILL_FRAME = 140;

const result = {};

switch (format) {
  // static → static.png (the media) only. No interactive build, no video. The dark
  // basemap theme guard applies here (it reads the static dist).
  case "static": {
    console.log(`[produce map] building static… → ${staticDir}`);
    run("bunx", ["vite", "build"], { BUILD_OUT: staticDir });

    console.log(`[produce map] snapping static… (channel=${channel} aspect=${aspect} ${mediaSize.width}x${mediaSize.height})`);
    snap("scripts/snap-static.mjs", {
      OUTDIR: outDir,
      SERVE_DIR: staticDir,
      MAP_WIDTH: String(mediaSize.width),
      MAP_HEIGHT: String(mediaSize.height),
    });

    // Theme guard — ONLY when the config asked for the dark basemap: assert the
    // static build actually rendered dark (furniture + basemap), not just that the
    // config said so. A coarse light/dark luminance CLASSIFIER, not a WCAG check.
    if (parsedConfig.mapStyle === "dataviz-dark") {
      console.log(`[produce map] snapping theme (dark)…`);
      snap("scripts/snap-theme.mjs", { OUTDIR: outDir, SERVE_DIR: staticDir });
    }

    // Contrast guard (ALWAYS, not just dark) — render-time WCAG 1.4.3 check on every
    // furniture text label (title/description/source/legend), sampled against its REAL
    // composited background (GL canvas + overlay, alpha-blended as shipped — see
    // snap-contrast.mjs's header for why a plain DOM background read cannot see this).
    // Upgrades the config-time conformance gate above (a drift-defense on pre-vetted
    // tokens against an assumed-opaque backdrop) to a live render-time fail.
    // No OUTDIR here (unlike chart-native's snap-contrast.mjs, which now passes OUTDIR
    // since it writes no debug artifact — task 23): this snap's own debug screenshot
    // (contrast-static.png) is a byproduct for a human to inspect, not part of the
    // delivery, and passing outDir put it beside static.png —
    // the loop's own render() collects the WHOLE outDir as the delivery's files
    // (lib/core/verbs/exec.ts's collectOutputs), so a "static" produce found TWO image
    // files and assertFileMedia refused it (task-7, first real call through render()).
    // Left to its own default, the debug PNG lands in this skill's persistent
    // output-proof/contrast/ instead.
    console.log(`[produce map] snapping contrast (furniture text WCAG)…`);
    // MAP_WIDTH/MAP_HEIGHT — same channel-exact box snap-static.mjs above already used to
    // render static.png, so this guard samples the SAME geometry that was actually
    // delivered, not a fixed 1200x700 landscape window (see snap-contrast.mjs's own note).
    snap("scripts/snap-contrast.mjs", {
      SERVE_DIR: staticDir,
      MODE: "static",
      MAP_WIDTH: String(mediaSize.width),
      MAP_HEIGHT: String(mediaSize.height),
    });

    // Render-size conformance (Slice 2, Task 4) — the produced static.png's pixel
    // dimensions must equal the channel's exact media size. Fail-hard before export.
    // No render: static.png already exists on disk (snap-static above already sized
    // the build to MAP_WIDTH/MAP_HEIGHT); this just reads its IHDR chunk to confirm
    // what actually landed on disk.
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

    result.static = join(outDir, "static.png");
    break;
  }

  // interactive → interactive.html (the deliverable) + interactive.png (a Gate-3
  // review still — EPHEMERAL, never shipped) + the interaction guards (responsive,
  // a11y). No static build at all: static.png/snap-static/snap-theme do not apply to
  // an interactive-only produce.
  case "interactive": {
    if (!interactiveAllowed) {
      console.error(
        `[produce map] format "interactive" is not allowed for channel "${channel}" — refusing to produce.`,
      );
      process.exit(1);
    }

    console.log(`[produce map] building interactive… → ${interactiveDir}`);
    run("bunx", ["vite", "build"], { INTERACTIVE: "1", BUILD_OUT: interactiveDir });

    console.log(`[produce map] snapping interactive (ephemeral review still)…`);
    snap("scripts/snap-proof.mjs", { OUTDIR: outDir, SERVE_DIR: interactiveDir });

    const interactiveHtmlSrc = join(interactiveDir, "index.html");
    const interactiveHtmlDest = join(outDir, "interactive.html");
    copyFileSync(interactiveHtmlSrc, interactiveHtmlDest);
    console.log(`[produce map] interactive.html → ${interactiveHtmlDest}`);

    // Drop the entry marker + the exact rendered config next to the outputs so EXPORT
    // (form 1 — "Code source") can assemble a runnable source bundle (bundle-source.mjs).
    // Both are .json — ignored by export-code's artifact glob and by assert-selfcontained.
    writeFileSync(
      join(outDir, "source-manifest.json"),
      JSON.stringify(mapSourceManifest(parsedConfig), null, 2) + "\n",
    );
    // Skip when geometry resolution already wrote this exact file (resolvedConfigPath IS
    // outDir/config.json in that case) — copying it onto itself is a needless self-copy at
    // best and, worse, `copyFileSync(configPath, ...)` would silently overwrite the
    // resolved-geometry version with the caller's ORIGINAL (pre-resolution) config.
    if (resolvedConfigPath !== join(outDir, "config.json")) {
      copyFileSync(resolvedConfigPath, join(outDir, "config.json"));
    }

    run("bun", ["scripts/assert-selfcontained.mjs", interactiveHtmlDest]);

    console.log(`[produce map] snapping responsive…`);
    snap("scripts/snap-responsive.mjs", { OUTDIR: outDir, SERVE_DIR: interactiveDir });

    console.log(`[produce map] snapping a11y…`);
    snap("scripts/snap-a11y.mjs", { OUTDIR: outDir, SERVE_DIR: interactiveDir });

    // Contrast guard — same render-time WCAG 1.4.3 check as the static path, against the
    // interactive dist (which can additionally show the filter bar). See snap-contrast.mjs.
    // No OUTDIR (see the static branch's comment above) — its debug screenshot does not
    // belong beside interactive.html either.
    console.log(`[produce map] snapping contrast (furniture text WCAG)…`);
    snap("scripts/snap-contrast.mjs", { SERVE_DIR: interactiveDir, MODE: "interactive" });

    result.interactive = interactiveHtmlDest;
    result.reviewStill = join(outDir, "interactive.png"); // ephemeral — not delivered
    break;
  }

  // video (config injected via Remotion --props) — render ONLY the single comp matching
  // the channel's aspect, from whichever kind `cameraMode` selects (see the file-header
  // "Video-kind note" and ./lib/story-comps.mjs). No web build at all: Remotion has its
  // own bundler entry (remotion/src/index.ts), independent of the static/interactive
  // Vite dist.
  case "video": {
    const cameraMode = parsedConfig.cameraMode ?? defaultCameraMode(parsedConfig);
    const allComps = storyComps(parsedConfig, cameraMode);
    // Render ONLY the comp matching the channel's aspect (portrait/square/landscape) —
    // not the unconditional triple. Guarantees the channel is the only aspect ever
    // emitted (e.g. a social-vertical run never produces a stray square/landscape mp4).
    const comps = allComps.filter(([, name]) => name === aspect);
    if (comps.length === 0) {
      throw new Error(
        `no story comp matches channel '${channel}' aspect '${aspect}' (available: ${allComps.map(([, n]) => n).join(", ")})`,
      );
    }
    const [comp, name] = comps[0];

    // Video render-size conformance (Task 4) — read Root.tsx once and assert the
    // SELECTED comp's registered dims (no render). Square/Portrait comps are
    // uniformly pinned to renderSize(channel) across all 7 map types (1080x1080 /
    // 1080x1920 — the true-9:16 fix this slice made), so an exact match is a real
    // regression guard. Landscape comps keep the pre-channel 1280x720 convention
    // (same 16:9 aspect ratio as article-web's 1200x675, but not the exact pixel box)
    // — out of this slice's scope; enforcing exact equality there would fail-hard on
    // every article-web video (the DEFAULT channel). So we only hard-assert for
    // portrait/square and log landscape's actual dims for visibility.
    const rootTsxSrc = readFileSync(join(root, "remotion", "src", "Root.tsx"), "utf8");
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

    const tmpDir = mkdtempSync(join(tmpdir(), "map-native-props-"));
    try {
      const propsPath = join(tmpDir, "props.json");
      writeFileSync(propsPath, JSON.stringify({ config: parsedConfig }));
      const remotionEntry = join(root, "remotion", "src", "index.ts");

      const stillOut = join(outDir, `video-${name}-still.png`);
      const mp4Out = join(outDir, `${name}.mp4`);
      // Both Remotion invocations run under the render watchdog (src/video-watchdog.ts):
      // the seismes-class hang (Remotion+MapLibre per-frame render) is killed after
      // SPLASH_VIDEO_TIMEOUT_MS (default 15 min) and fails the run cleanly instead of
      // burning it — root-causing the hang itself stays a separate ticket.
      const renderEnv = { ...env, COMP: comp };
      console.log(`[produce map] video ${name} (${comp}) — still…`);
      await runWithVideoWatchdog(REMOTION[0], [...REMOTION.slice(1), "still", remotionEntry, comp, stillOut,
        `--frame=${STORY_STILL_FRAME}`, "--gl=angle", `--props=${propsPath}`], { cwd: root, env: renderEnv, shell: isWin });
      console.log(`[produce map] video ${name} (${comp}) — mp4…`);
      await runWithVideoWatchdog(REMOTION[0], [...REMOTION.slice(1), "render", remotionEntry, comp, mp4Out,
        "--gl=angle", "--concurrency=1", "--timeout=120000", `--props=${propsPath}`], { cwd: root, env: renderEnv, shell: isWin });

      // Video snap guard (fail-hard, like snap-a11y): mechanical assertions on the
      // ACTUAL mp4 — container sanity (size/dims), the story really animates
      // (first≠mid≠final sampled frames, none blank), and the mp4 frame at
      // STORY_STILL_FRAME matches the review still the Gate-3 human approves. No
      // EXPECTED_FRAMES: map story durations are bundle-time computed constants
      // (buildTimeline over sample-derived beats in remotion/src/Root.tsx), not
      // literals — snap-video logs that skip; its still-frame containment check
      // still bounds truncation. A violation exits 1 BEFORE outputs are declared.
      // ASYMMETRY vs chart-native: no FINAL_STILL here. chart-native also renders
      // the composition's last frame as a separate still and has snap-video diff
      // the mp4's final frame against it (the end-state check). map-native's still
      // renders go through the hang-prone Remotion+MapLibre per-frame path (the
      // seismes-class hang, see CLAUDE.md backlog) — a second still render per
      // video doubles that exposure, so the end-state check is deferred until the
      // hang is root-caused. snap-video.mjs already supports FINAL_STILL (mirror,
      // lockstep) — wiring it is one env var when that day comes.
      console.log(`[produce map] verifying the rendered mp4 (snap-video)…`);
      run("bun", ["scripts/snap-video.mjs"], {
        MP4: mp4Out,
        STILL: stillOut,
        STILL_FRAME: String(STORY_STILL_FRAME),
        FPS: "30",
        EXPECTED_WIDTH: String(compDims.width),
        EXPECTED_HEIGHT: String(compDims.height),
        OUTDIR: outDir,
      });

      result[name] = mp4Out;
      result.reviewStill = stillOut; // the still IS the review, not a separate deliverable
      console.log(`[produce map] done rendering ${name}.`);
    } finally {
      rmSync(tmpDir, { recursive: true, force: true });
    }
    break;
  }

  // scrolly — NOT built by map-native directly. The true interactive scroll-driven
  // format (skills/scrolly) is its own producer (see ../../splash/src/producer-spec.ts
  // Producer union and adapters.ts's SCRIPT table): it hosts map-native's rendering
  // under its own build/render pipeline, dispatched independently by the orchestrator
  // as producer "scrolly", never through this script. map-native's own former
  // "scrolly" CLI value built a scrolly-experience captured AS AN MP4 — a different,
  // narrower thing than the true HTML scrolly format — and is no longer reachable
  // through this single-format entry point either (see the file-header note). Fail
  // hard with a clear reason instead of silently mis-producing.
  case "scrolly": {
    console.error(
      `[produce map] format "scrolly" is not built by map-native — dispatch to the "scrolly" ` +
        `producer (skills/scrolly), which hosts map-native's rendering for the scroll-driven format.`,
    );
    process.exit(1);
    break;
  }
}

console.log("PRODUCE_RESULT " + JSON.stringify(result));
