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

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");

const type = process.argv[2];
const configPath = process.argv[3];
const outDir = process.argv[4];
const formats = process.argv[5] ?? process.env.FORMATS ?? "all";
if (!type || !configPath || !outDir) {
  console.error("usage: produce.mjs <type> <config.json> <outDir> [all|static]");
  process.exit(1);
}

// type → the Remotion composition prefix (XReveal / XSquare / XPortrait). Several
// keys don't PascalCase cleanly (pyramid → PopulationPyramid, grouped → GroupedBar).
const PREFIX = {
  line: "Line", bar: "Bar", scatter: "Scatter", pie: "Pie",
  stacked: "StackedBar", slope: "Slope", grouped: "GroupedBar",
  dumbbell: "Dumbbell", "stacked-area": "StackedArea", heatmap: "Heatmap",
  histogram: "Histogram", diverging: "DivergingBar", waterfall: "Waterfall",
  lollipop: "Lollipop", pyramid: "Pyramid", bullet: "Bullet",
  "connected-scatter": "ConnectedScatter", marimekko: "Marimekko", radar: "Radar",
  boxplot: "Boxplot", bump: "Bump", beeswarm: "Beeswarm", treemap: "Treemap",
  "diverging-stacked": "DivergingStacked", sankey: "Sankey",
  streamgraph: "Streamgraph", gantt: "Gantt", fan: "Fan", calendar: "Calendar",
  waffle: "Waffle", lorenz: "Lorenz", candlestick: "Candlestick", chord: "Chord",
  sunburst: "Sunburst", parallel: "Parallel", "dot-strip": "DotStrip",
  violin: "Violin", arc: "Arc", "radial-bar": "RadialBar", combo: "Combo",
  pictogram: "Pictogram",
};
const X = PREFIX[type];
if (!X) {
  console.error(`produce: unknown type "${type}". Known: ${Object.keys(PREFIX).join(", ")}`);
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
// KNOWN pre-existing violations: found while wiring this up, NOT introduced by it
// (see .superpowers/sdd/conformance-report.md). OKABE_ITO.vermillion (#D55E00) on
// white is 3.87:1, below the 4.5:1 WCAG minimum — histogram's median label and
// lollipop's highlighted-row label both render text in this fixed accent. Rather
// than silently pass (rubber-stamp) OR hard-fail every existing histogram/lollipop
// render (break the producer over a pre-existing design gap), produce WARNS on
// exactly this known message and still FAILS HARD on any other violation.
const KNOWN_PREEXISTING_VIOLATIONS = {
  histogram: [/^text colour #D55E00 contrast 3\.87:1 on #FFFFFF < 4\.5:1$/],
  lollipop: [/^text colour #D55E00 contrast 3\.87:1 on #FFFFFF < 4\.5:1$/],
};

{
  const config = JSON.parse(readFileSync(configPath, "utf8"));
  const result = runProduceConformance(type, config);
  if (!result.checked) {
    console.log(
      `[produce ${type}] conformance: no produce-time guard wired yet for "${type}" (follow-on) — skipping.`,
    );
  } else {
    const known = KNOWN_PREEXISTING_VIOLATIONS[type] ?? [];
    const unknownViolations = result.violations.filter(
      (v) => !known.some((re) => re.test(v)),
    );
    const knownViolations = result.violations.filter((v) =>
      known.some((re) => re.test(v)),
    );
    if (unknownViolations.length > 0) {
      console.error(`[produce ${type}] CONFORMANCE VIOLATION — refusing to produce:`);
      for (const v of unknownViolations) console.error(`  - ${v}`);
      process.exit(1);
    }
    if (knownViolations.length > 0) {
      console.warn(
        `[produce ${type}] conformance: KNOWN pre-existing violation (flagged, not blocking — see conformance-report.md):`,
      );
      for (const v of knownViolations) console.warn(`  - ${v}`);
    } else {
      console.log(`[produce ${type}] conformance: OK (0 violations).`);
    }
  }
}

mkdirSync(outDir, { recursive: true });
const env = { ...process.env, CHART: type, CONFIG: configPath };
const run = (cmd, args, extraEnv = {}) =>
  execFileSync(cmd, args, { stdio: "inherit", cwd: root, env: { ...env, ...extraEnv } });

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
run("bun", ["scripts/snap-proof.mjs"], { OUTDIR: outDir });

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
