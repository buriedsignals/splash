// produce(configPath, outDir): the map-native producer — build + render the
// native outputs from an ARBITRARY choropleth config. Injects the config via
// CONFIG= (Vite define for web, Remotion --props for video), so nothing
// touches the committed sample. Returns the output paths as JSON on stdout.
//
//   bun scripts/produce.mjs <config.json> <outDir> [formats]
//   formats: "all" (default — static + interactive + 3 videos) | "static" (no video)
//
// Outputs:
//   { static, interactive, landscape, square, portrait }
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { mkdtempSync } from "node:fs";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");

const configPath = process.argv[2];
const outDir = process.argv[3];
const formats = process.argv[4] ?? process.env.FORMATS ?? "all";

if (!configPath || !outDir) {
  console.error("usage: produce.mjs <config.json> <outDir> [all|static]");
  process.exit(1);
}

mkdirSync(outDir, { recursive: true });

const env = { ...process.env, CONFIG: configPath };
const run = (cmd, args, extraEnv = {}) =>
  execFileSync(cmd, args, {
    stdio: "inherit",
    cwd: root,
    env: { ...env, ...extraEnv },
  });

// 1. Web builds (config baked in via the Vite define)
console.log(`[produce map] building static…`);
run("bunx", ["vite", "build"]);

console.log(`[produce map] building interactive…`);
run("bunx", ["vite", "build"], { INTERACTIVE: "1" });

// 2. Snap static + interactive into outDir
console.log(`[produce map] snapping static…`);
run("bun", ["scripts/snap-static.mjs"], { OUTDIR: outDir });

console.log(`[produce map] snapping interactive (proof)…`);
run("bun", ["scripts/snap-proof.mjs"], { OUTDIR: outDir });

const result = {
  static: join(outDir, "static.png"),
  interactive: join(outDir, "interactive.png"),
};

// 3. Videos (config injected via Remotion --props)
if (formats === "all") {
  // Write props file for Remotion (expects { config: <choropleth config> })
  const config = JSON.parse(readFileSync(configPath, "utf8"));
  const tmpDir = mkdtempSync(join(tmpdir(), "map-native-props-"));
  try {
    const propsPath = join(tmpDir, "props.json");
    writeFileSync(propsPath, JSON.stringify({ config }));

    const remotionEntry = join(root, "remotion", "src", "index.ts");

    for (const [comp, name] of [
      ["ChoroplethReveal", "landscape"],
      ["ChoroplethSquare", "square"],
      ["ChoroplethPortrait", "portrait"],
    ]) {
      const stillOut = join(outDir, `video-${name}-still.png`);
      const mp4Out = join(outDir, `${name}.mp4`);

      console.log(`[produce map] rendering ${name} (${comp}) — still…`);
      run(
        "bunx",
        [
          "remotion",
          "still",
          remotionEntry,
          comp,
          stillOut,
          "--frame=140",
          "--gl=angle",
          `--props=${propsPath}`,
        ],
        { COMP: comp },
      );

      console.log(`[produce map] rendering ${name} (${comp}) — mp4…`);
      run(
        "bunx",
        [
          "remotion",
          "render",
          remotionEntry,
          comp,
          mp4Out,
          "--gl=angle",
          "--concurrency=1",
          "--timeout=120000",
          `--props=${propsPath}`,
        ],
        { COMP: comp },
      );

      result[name] = mp4Out;
    }
  } finally {
    rmSync(tmpDir, { recursive: true, force: true });
  }
}

console.log("PRODUCE_RESULT " + JSON.stringify(result));
