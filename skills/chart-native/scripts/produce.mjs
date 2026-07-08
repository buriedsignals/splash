// produce(type, configPath, outDir): the chart-native producer — build + render
// the native outputs from an ARBITRARY config (the flow's entry point, the native
// equivalent of dw-chart's produceChart). Injects the config via CONFIG= (Vite
// define for web, Remotion --props for video), so nothing touches the committed
// samples. Returns the output paths as JSON on stdout.
//
//   bun scripts/produce.mjs <type> <config.json> <outDir> [formats]
//   formats: "all" (default — static + interactive + 3 videos) | "static" (no video)
import { execFileSync } from "node:child_process";
import { mkdirSync, copyFileSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chartDistSub } from "../src/build-paths.ts";
import { runProduceConformance } from "../src/core/produce-conformance.ts";
import { REMOTION_PREFIX } from "../src/native-types.ts";
import { snapRunner } from "../src/platform-runners.ts";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const isWin = process.platform === "win32";
const SNAP = snapRunner(process.platform);

const type = process.argv[2];
const configPath = process.argv[3];
const outDir = process.argv[4];
const formats = process.argv[5] ?? process.env.FORMATS ?? "all";
if (!type || !configPath || !outDir) {
  console.error("usage: produce.mjs <type> <config.json> <outDir> [all|static]");
  process.exit(1);
}

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
{
  const config = JSON.parse(readFileSync(configPath, "utf8"));
  const result = runProduceConformance(type, config);
  if (!result.checked) {
    console.log(
      `[produce ${type}] conformance: no produce-time guard wired yet for "${type}" (follow-on) — skipping.`,
    );
  } else if (result.violations.length > 0) {
    console.error(`[produce ${type}] CONFORMANCE VIOLATION — refusing to produce:`);
    for (const v of result.violations) console.error(`  - ${v}`);
    process.exit(1);
  } else {
    console.log(`[produce ${type}] conformance: OK (0 violations).`);
  }
}

mkdirSync(outDir, { recursive: true });
const env = { ...process.env, CHART: type, CONFIG: configPath };
const run = (cmd, args, extraEnv = {}) =>
  execFileSync(cmd, args, { stdio: "inherit", cwd: root, env: { ...env, ...extraEnv }, shell: isWin });

// 1. web builds (config baked in via the Vite define)
console.log(`[produce ${type}] building static + interactive…`);
run("bunx", ["vite", "build"]);
run("bunx", ["vite", "build"], { INTERACTIVE: "1" });

// 1b. copy self-contained interactive.html into outDir
const interactiveSrc = join(root, chartDistSub(type, "interactive"), "index.html");
const interactiveDest = join(outDir, "interactive.html");
copyFileSync(interactiveSrc, interactiveDest);
console.log(`[produce ${type}] interactive.html → ${interactiveDest}`);
run("bun", ["scripts/assert-selfcontained.mjs", interactiveDest]);

// 2. snap static + interactive into outDir
console.log(`[produce ${type}] snapping static + interactive…`);
run(SNAP, ["scripts/snap-proof.mjs"], { OUTDIR: outDir });

// 2b. render-time WCAG contrast guard — every text label must clear 4.5:1 against
// its real background. Fails the run before export on a mark-coloured label.
console.log(`[produce ${type}] checking text contrast (snap-contrast)…`);
run(SNAP, ["scripts/snap-contrast.mjs"]);

const result = {
  static: join(outDir, "static.png"),
  interactive: join(outDir, "interactive.png"),
  interactiveHtml: interactiveDest,
};

// 3. videos (config injected via Remotion --props inside render-video.mjs)
if (formats === "all") {
  for (const [comp, name] of [
    [`${X}Reveal`, "landscape"],
    [`${X}Square`, "square"],
    [`${X}Portrait`, "portrait"],
  ]) {
    console.log(`[produce ${type}] rendering ${name} (${comp})…`);
    run(
      "bun",
      ["scripts/render-video.mjs", join(outDir, `video-${name}-still.png`), join(outDir, `${name}.mp4`)],
      { COMP: comp },
    );
    result[name] = join(outDir, `${name}.mp4`);
  }
}

console.log("PRODUCE_RESULT " + JSON.stringify(result));
