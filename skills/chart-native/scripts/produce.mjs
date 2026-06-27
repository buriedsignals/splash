// produce(type, configPath, outDir): the chart-native producer — build + render
// the native outputs from an ARBITRARY config (the flow's entry point, the native
// equivalent of dw-chart's produceChart). Injects the config via CONFIG= (Vite
// define for web, Remotion --props for video), so nothing touches the committed
// samples. Returns the output paths as JSON on stdout.
//
//   bun scripts/produce.mjs <type> <config.json> <outDir> [formats]
//   formats: "all" (default — static + interactive + 3 videos) | "static" (no video)
import { execFileSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

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

mkdirSync(outDir, { recursive: true });
const env = { ...process.env, CHART: type, CONFIG: configPath };
const run = (cmd, args, extraEnv = {}) =>
  execFileSync(cmd, args, { stdio: "inherit", cwd: root, env: { ...env, ...extraEnv } });

// 1. web builds (config baked in via the Vite define)
console.log(`[produce ${type}] building static + interactive…`);
run("bunx", ["vite", "build"]);
run("bunx", ["vite", "build"], { INTERACTIVE: "1" });

// 2. snap static + interactive into outDir
console.log(`[produce ${type}] snapping static + interactive…`);
run("bun", ["scripts/snap-proof.mjs"], { OUTDIR: outDir });

const result = {
  static: join(outDir, "static.png"),
  interactive: join(outDir, "interactive.png"),
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
