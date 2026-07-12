// produce(type, configPath, outDir, format): the chart-native producer — build + render
// the native outputs from an ARBITRARY config (the flow's entry point, the native
// equivalent of dw-chart's produceChart). Injects the config via CONFIG= (Vite
// define for web, Remotion --props for video), so nothing touches the committed
// samples. Returns the output paths as JSON on stdout.
//
//   bun scripts/produce.mjs <type> <config.json> <outDir> <format>
//   format: the SINGLE VisualFormat to build — "static" | "interactive" | "video" |
//           "scrolly" (the ../../atelier/src/channel.ts vocabulary). Builds EXACTLY
//           that one format's artifacts, nothing else (no cross-format byproducts —
//           see the single-format-produce-export design). "scrolly" is not built by
//           chart-native directly (see the case below) — it fails hard.
import { execFileSync } from "node:child_process";
import { mkdirSync, copyFileSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chartDistSub } from "../src/build-paths.ts";
import { runProduceConformance } from "../src/core/produce-conformance.ts";
import { REMOTION_PREFIX } from "../src/native-types.ts";
import { snapCommand } from "../src/platform-runners.ts";
import { ALL_CHANNELS, channelAspect, assertRenderedSize, isFormatAllowed } from "../../atelier/src/channel.ts";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const isWin = process.platform === "win32";
const SNAP = snapCommand(process.platform);

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
// Root.tsx's source text — "known constants" read at produce-time with no render
// (no React/Remotion runtime needed). Used to fail-hard if a future edit regresses a
// comp's dims (e.g. re-introducing the 4:5 1350 bug this slice fixed) without having
// to actually render the video.
function readCompDims(rootTsxSrc, compId) {
  const re = new RegExp(
    `id=["']${compId}["'][\\s\\S]*?width=\\{(\\d+)\\}[\\s\\S]*?height=\\{(\\d+)\\}`,
  );
  const m = rootTsxSrc.match(re);
  return m ? { width: Number(m[1]), height: Number(m[2]) } : null;
}

// Same trick for a comp's registered timing (all chart-native comps register LITERAL
// durationInFrames/fps — 240 @ 30). Feeds snap-video's duration-vs-registered check;
// null (a future non-literal registration) just skips that one check there.
function readCompTiming(rootTsxSrc, compId) {
  const re = new RegExp(
    `id=["']${compId}["'][\\s\\S]*?durationInFrames=\\{(\\d+)\\}[\\s\\S]*?fps=\\{(\\d+)\\}`,
  );
  const m = rootTsxSrc.match(re);
  return m ? { frames: Number(m[1]), fps: Number(m[2]) } : null;
}

// Mid-reveal frame the review still is rendered at — threaded to render-video.mjs
// AND snap-video.mjs so the still the Gate-3 review approves and the mp4 frame the
// snap diffs against it are the SAME frame (the load-bearing still≈mp4 transfer).
const VIDEO_STILL_FRAME = 140;

// The single-format-produce-export redesign's vocabulary (mirrors ../../atelier/src/
// channel.ts's VisualFormat — kept as a plain runtime Set here since this is a .mjs,
// not imported, to avoid a type-only import needing a bundler step).
const VALID_FORMATS = new Set(["static", "interactive", "video", "scrolly"]);

const type = process.argv[2];
const configPath = process.argv[3];
const outDir = process.argv[4];
const format = process.argv[5] ?? process.env.FORMAT;
if (!type || !configPath || !outDir || !VALID_FORMATS.has(format)) {
  console.error("usage: produce.mjs <type> <config.json> <outDir> <static|interactive|video|scrolly>");
  process.exit(1);
}

// Channel-driven format (Slice 2) — the distribution channel this deliverable
// targets (default article-web, matching normalizeChannel's default / back-compat
// for legacy callers with no channel). Threaded in by adapters.ts as an env var
// (see skills/atelier/src/adapters.ts channelEnvFor). Sizes the static/interactive
// Vite build (vite.config.ts) and selects the video aspect below.
//
// FAIL-CLOSED (defense in depth below the produce-all gate): an unrecognized
// NON-EMPTY value must never silently default to article-web — that ships the wrong
// aspect (landscape 1200x675 for a square/portrait proposal) with a clean exit.
// Only the CANONICAL values are accepted: the spine normalizes aliases/case-variants
// ("feed", "Stories") to canonical BEFORE threading (produce-all's gate), so the
// alias table lives once in normalizeChannel and is never duplicated here.
// Absent/EMPTY keeps the article-web default (legacy/manual callers).
const rawChannel = (process.env.ATELIER_CHANNEL ?? "").trim();
const channel = rawChannel === "" ? "article-web" : rawChannel;
if (!ALL_CHANNELS.includes(channel)) {
  console.error(
    `produce: unknown ATELIER_CHANNEL "${rawChannel}" — expected one of ${ALL_CHANNELS.join(", ")} ` +
      "(absent/empty defaults to article-web); refusing to default an unrecognized channel to article-web.",
  );
  process.exit(1);
}

// Channel-gated interactive (fix/channel-gated-produce, kept under the single-format
// redesign): the "interactive" format is only buildable when the channel actually
// allows it (social-vertical / social-feed forbid it — allowedFormats = static,
// video). `case "interactive"` below fails hard rather than silently producing when
// this is false.
const interactiveAllowed = isFormatAllowed(channel, "interactive");

const X = REMOTION_PREFIX[type];
if (!X) {
  console.error(`produce: unknown type "${type}". Known: ${Object.keys(REMOTION_PREFIX).join(", ")}`);
  process.exit(1);
}

// Conformance-at-produce-time: run the type-appropriate guard (core/conformance.ts)
// against the ACTUAL config being rendered, so a chart that violates Okabe-Ito /
// WCAG contrast / title-is-insight / baseline-0 / direct-label / source-name+url
// can no longer silently produce. Only the 7 types with a wired resolver (see
// core/resolve-conformance-colors.ts) are checked today — the rest print an
// informational note and proceed unchecked (a follow-on, not a regression: they
// were unchecked before this change too).
//
// A conformance violation FAILS the run before building — no rubber-stamp, no silent
// pass. (The two previously-known pre-existing violations — histogram's median label
// and lollipop's highlighted-row label in OKABE_ITO vermillion, 3.87:1 < 4.5:1 — are
// now fixed: those labels render in COLORS.ink; the vermillion stays on the mark.)
const config = JSON.parse(readFileSync(configPath, "utf8"));
// F2 — the house colours the journalist set via the brand profile (policy b). These
// are the ONLY colours whose CVD/contrast failures are downgraded to a render-review
// concern; every other colour stays hard-guarded. Empty on the auto path.
const brandColors =
  config.brandExplicit === true
    ? [config.baseColor, config.accent, ...(Array.isArray(config.seriesColors) ? config.seriesColors : [])].filter(
        (c) => typeof c === "string" && /^#[0-9a-f]{6}$/i.test(c),
      )
    : [];
let brandConcerns = [];
{
  const result = runProduceConformance(type, config);
  if (!result.checked) {
    console.log(
      `[produce ${type}] conformance: no produce-time guard wired yet for "${type}" (follow-on) — skipping.`,
    );
  } else if (result.violations.length > 0) {
    console.error(`[produce ${type}] CONFORMANCE VIOLATION — refusing to produce:`);
    for (const v of result.violations) console.error(`  - ${v}`);
    process.exit(1);
  } else if (result.concerns.length > 0) {
    // policy (b): the brand colour is KEPT (not rewritten); the a11y tradeoff is
    // recorded for the render-review instead of failing the run.
    brandConcerns = result.concerns;
    console.log(
      `[produce ${type}] conformance: OK — kept the newsroom's house colour with ${result.concerns.length} render-review concern(s) (policy b, brand-first):`,
    );
    for (const c of result.concerns) console.log(`  ~ ${c}`);
  } else {
    console.log(`[produce ${type}] conformance: OK (0 violations).`);
  }
}

mkdirSync(outDir, { recursive: true });
// Drop the exact rendered config + the native render-id next to the outputs, so EXPORT
// (form 1 — "Code source") can assemble a self-contained, runnable Vite source bundle
// from them (skills/chart-native/scripts/export-source.mjs) without re-deriving anything.
// Both are .json, ignored by export-code's artifact glob (.html/.png/.jpg/.mp4) and by
// assert-selfcontained — they never leak into the interactive/static/video outputs.
copyFileSync(configPath, join(outDir, "config.json"));
writeFileSync(
  join(outDir, "native-source.json"),
  JSON.stringify({ type }, null, 2) + "\n",
);
// Record the brand render-review concerns next to the outputs so the render gate /
// the journalist see the surfaced a11y tradeoff (they are never silently dropped).
if (brandConcerns.length > 0) {
  writeFileSync(
    join(outDir, "brand-concerns.json"),
    JSON.stringify({ type, concerns: brandConcerns }, null, 2),
  );
}
// Re-assert the validated channel (rawChannel may have been absent/empty — an
// invalid one already exited above) so vite.config.ts and render-video.mjs never
// have to re-derive the fallback.
const env = { ...process.env, CHART: type, CONFIG: configPath, ATELIER_CHANNEL: channel };
const run = (cmd, args, extraEnv = {}) =>
  execFileSync(cmd, args, { stdio: "inherit", cwd: root, env: { ...env, ...extraEnv }, shell: isWin });
const snap = (script, extraEnv = {}) => run(SNAP[0], [...SNAP.slice(1), script], extraEnv);

const result = {};

switch (format) {
  // static → static.png (the media) only. No interactive/video byproducts.
  case "static": {
    console.log(`[produce ${type}] building static…`);
    run("bunx", ["vite", "build"]);

    console.log(`[produce ${type}] snapping static…`);
    snap("scripts/snap-proof.mjs", { OUTDIR: outDir, SKIP_INTERACTIVE: "1" });

    // render-time WCAG contrast guard — every text label must clear 4.5:1 against its
    // real background. Fails the run before export on a mark-coloured label. F2 — tell
    // snap-contrast which fills are brand-explicit so a low-contrast label in the
    // newsroom's house colour is recorded as a render-review concern, not a hard
    // failure (policy b). No brand profile → empty → the auto path stays strict.
    console.log(`[produce ${type}] checking text contrast (snap-contrast)…`);
    snap("scripts/snap-contrast.mjs", { BRAND_EXPLICIT_COLORS: brandColors.join(",") });

    // render-size conformance (Slice 2, Task 4) — the produced static.png's pixel
    // dimensions must equal the channel's exact media size. Fail-hard before export.
    // No render: static.png already exists on disk (the snap above); this just reads
    // its IHDR chunk.
    console.log(`[produce ${type}] checking rendered size vs channel "${channel}"…`);
    {
      const staticPngPath = join(outDir, "static.png");
      const { width: actualW, height: actualH } = readPngSize(staticPngPath);
      try {
        assertRenderedSize(actualW, actualH, channel);
        console.log(`[produce ${type}] render-size: OK (${actualW}x${actualH} matches channel "${channel}").`);
      } catch (err) {
        console.error(`[produce ${type}] RENDER-SIZE VIOLATION — refusing to produce: ${err.message}`);
        process.exit(1);
      }
    }

    result.static = join(outDir, "static.png");
    break;
  }

  // interactive → interactive.html (the deliverable) + interactive.png (a Gate-3
  // review still — EPHEMERAL, never shipped) + the interaction guards. No static
  // build at all: the static Vite pass does not run, so snap-contrast (which reads
  // the static dist) does not apply here — snap-interactive-contrast below is its
  // interactive-dist counterpart, so rendered-text WCAG contrast is still checked.
  case "interactive": {
    if (interactiveAllowed) {
      console.log(`[produce ${type}] building interactive…`);
      run("bunx", ["vite", "build"], { INTERACTIVE: "1" });

      const interactiveSrc = join(root, chartDistSub(type, "interactive"), "index.html");
      const interactiveDest = join(outDir, "interactive.html");
      copyFileSync(interactiveSrc, interactiveDest);
      console.log(`[produce ${type}] interactive.html → ${interactiveDest}`);
      run("bun", ["scripts/assert-selfcontained.mjs", interactiveDest]);

      // Gate-3 review still (ephemeral, not a deliverable) — snap-proof normally also
      // writes static.png, so SKIP_STATIC tells it to skip that half (no static dist
      // exists here to serve/screenshot); only interactive.png is written.
      console.log(`[produce ${type}] snapping interactive (ephemeral review still)…`);
      snap("scripts/snap-proof.mjs", { OUTDIR: outDir, SKIP_STATIC: "1" });

      // render-time WCAG contrast guard for the interactive dist's own SVG text
      // (axis/value/direct labels — the same labels the static build renders,
      // mount.tsx wraps the identical *Chart.tsx component either way). Closes the
      // coverage gap left by this format no longer building the static dist: a
      // mark-coloured label would otherwise ship unguarded on the article-web
      // interactive path (the most common delivery). Fails the run before export.
      console.log(`[produce ${type}] checking text contrast (snap-interactive-contrast)…`);
      snap("scripts/snap-interactive-contrast.mjs", { BRAND_EXPLICIT_COLORS: brandColors.join(",") });

      // render-time WCAG contrast guard for the INTERACTIVE hover/focus tooltip — a
      // static-build check can't see this (the tooltip only exists on hover, in
      // HTML/CSS, not SVG). Fails the run before export on a tooltip name painted in
      // the mark hue.
      console.log(`[produce ${type}] checking tooltip contrast (snap-tooltip-contrast)…`);
      snap("scripts/snap-tooltip-contrast.mjs");

      // render-time in-viewport guard for the INTERACTIVE hover/focus tooltip — a mark
      // near the right/top edge must not push the tooltip off-screen (its text would
      // clip). ChartFrame's ClampedTooltip flips/clamps it back in-bounds; this asserts
      // the property mechanically at a narrow + wide embed width. Fails the run before
      // export.
      console.log(`[produce ${type}] checking tooltip stays in-viewport (snap-tooltip-viewport)…`);
      snap("scripts/snap-tooltip-viewport.mjs");

      result.interactive = interactiveDest;
      result.reviewStill = join(outDir, "interactive.png"); // ephemeral — not delivered
    } else {
      console.error(
        `[produce ${type}] format "interactive" is not allowed for channel "${channel}" — refusing to produce.`,
      );
      process.exit(1);
    }
    break;
  }

  // video (config injected via Remotion --props inside render-video.mjs) — render
  // ONLY the single comp matching the channel's aspect (not the old unconditional
  // landscape+square+portrait triple); the aspect is a CADRAGE decision, not picked
  // post-hoc at export. No web build at all: Remotion has its own bundler entry
  // (remotion/index.ts), independent of the static/interactive Vite dist.
  case "video": {
    const VIDEO_COMP_BY_ASPECT = {
      landscape: [`${X}Reveal`, "landscape"],
      square: [`${X}Square`, "square"],
      portrait: [`${X}Portrait`, "portrait"],
    };
    const aspect = channelAspect(channel);
    const entry = VIDEO_COMP_BY_ASPECT[aspect];
    if (!entry) {
      console.error(`produce: no video comp for channel "${channel}" aspect "${aspect}"`);
      process.exit(1);
    }
    const [comp, name] = entry;

    // Video render-size conformance (Task 4) — assert the SELECTED comp's registered
    // dims (read straight from Root.tsx, no render) match the channel. Square/Portrait
    // comps are uniformly pinned to renderSize(channel) across every one of the 41
    // chart types (1080x1080 / 1080x1920 — the true-9:16 fix this slice made) so an
    // exact match is a real regression guard (e.g. against re-introducing the 4:5 1350
    // bug). Landscape ("Reveal") comps keep each family's own pre-channel aesthetic
    // dims (e.g. 840x480, 840x460 for bar/stacked, 840x420 for calendar…) — they were
    // never resized to the channel's exact media pixels (out of this slice's scope, see
    // plan self-review "repoint only"); enforcing exact equality there would fail-hard
    // on every article-web video (the DEFAULT channel), which is not this slice's intent
    // (the Final e2e render-verify expects an article-web video to still render). So we
    // only hard-assert for portrait/square and log landscape's actual dims for visibility.
    const rootTsxSrc = readFileSync(join(root, "remotion", "src", "Root.tsx"), "utf8");
    const compDims = readCompDims(rootTsxSrc, comp);
    if (!compDims) {
      console.error(`[produce ${type}] could not find comp "${comp}" dims in Root.tsx`);
      process.exit(1);
    }
    if (aspect === "portrait" || aspect === "square") {
      try {
        assertRenderedSize(compDims.width, compDims.height, channel);
        console.log(
          `[produce ${type}] video render-size: OK (${comp} ${compDims.width}x${compDims.height} matches channel "${channel}").`,
        );
      } catch (err) {
        console.error(`[produce ${type}] VIDEO RENDER-SIZE VIOLATION — refusing to produce: ${err.message}`);
        process.exit(1);
      }
    } else {
      console.log(
        `[produce ${type}] video render-size: ${comp} is ${compDims.width}x${compDims.height} (landscape keeps its family-tuned aspect, not pinned to the channel's exact mediaSize — see comment above).`,
      );
    }

    console.log(`[produce ${type}] rendering ${name} (${comp}) for channel "${channel}"…`);
    const stillPath = join(outDir, `video-${name}-still.png`);
    const mp4Path = join(outDir, `${name}.mp4`);
    run("bun", ["scripts/render-video.mjs", stillPath, mp4Path], {
      COMP: comp,
      STILL_FRAME: String(VIDEO_STILL_FRAME),
    });

    // Video snap guard (fail-hard, like snap-contrast): mechanical assertions on the
    // ACTUAL mp4 — container sanity (size/dims/registered duration), the reveal
    // really animates (first≠mid≠final sampled frames, none blank), and the mp4
    // frame at VIDEO_STILL_FRAME matches the review still the Gate-3 human approves.
    // A violation exits 1 here, BEFORE the outputs are declared.
    console.log(`[produce ${type}] verifying the rendered mp4 (snap-video)…`);
    const timing = readCompTiming(rootTsxSrc, comp);
    run("bun", ["scripts/snap-video.mjs"], {
      MP4: mp4Path,
      STILL: stillPath,
      STILL_FRAME: String(VIDEO_STILL_FRAME),
      FPS: String(timing?.fps ?? 30),
      ...(timing ? { EXPECTED_FRAMES: String(timing.frames) } : {}),
      EXPECTED_WIDTH: String(compDims.width),
      EXPECTED_HEIGHT: String(compDims.height),
      OUTDIR: outDir,
    });

    result[name] = mp4Path;
    result.reviewStill = stillPath; // the still IS the review, not a separate deliverable
    console.log(`[produce ${type}] done rendering ${name}.`);
    break;
  }

  // scrolly — NOT built by chart-native directly. The true interactive scroll-driven
  // format (skills/scrolly) is its own producer (see ../../atelier/src/producer-spec.ts
  // Producer union and adapters.ts's SCRIPT table): it hosts chart-native's chart
  // geometry under its own build/render pipeline, dispatched independently by the
  // orchestrator as producer "scrolly", never through this script. chart-native has no
  // Vite "scrolly" build mode, no scrolly mount, no scrolly snap — inventing one here
  // would duplicate skills/scrolly rather than reuse it. Fail hard with a clear reason
  // instead of silently mis-producing.
  case "scrolly": {
    console.error(
      `[produce ${type}] format "scrolly" is not built by chart-native — dispatch to the "scrolly" ` +
        `producer (skills/scrolly), which hosts chart-native's geometry for the scroll-driven format.`,
    );
    process.exit(1);
    break;
  }
}

console.log("PRODUCE_RESULT " + JSON.stringify(result));
