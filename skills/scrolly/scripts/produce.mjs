// produce(configPath, outDir): build the single-file scrolly HTML with the config baked in.
//   bun scripts/produce.mjs <config.json> <outDir>
import { execFileSync } from "node:child_process";
import { mkdirSync, copyFileSync, readFileSync as readFS } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");

// Load VITE_MAPTILER_KEY from the monorepo root .env when not already set.
// Scrolly.tsx imports all map modules statically (they throw at load time when
// the key is absent), so the build always needs the key — even for chart-only
// configs that never render a map. Source it from the repo root .env silently
// rather than requiring the caller to set it manually.
if (!process.env.VITE_MAPTILER_KEY) {
  const rootEnv = join(root, "../../.env");
  try {
    const lines = readFS(rootEnv, "utf8").split("\n");
    for (const line of lines) {
      const m = line.match(/^VITE_MAPTILER_KEY\s*=\s*(.+)$/);
      if (m) { process.env.VITE_MAPTILER_KEY = m[1].trim(); break; }
    }
  } catch {
    // .env absent or unreadable — proceed; Vite will bake undefined and the map
    // modules will throw at runtime (only matters for map configs, not chart).
  }
}
const configPath = process.argv[2];
const outDir = process.argv[3];
if (!configPath || !outDir) {
  console.error("usage: produce.mjs <config.json> <outDir>");
  process.exit(1);
}
mkdirSync(outDir, { recursive: true });
execFileSync("bunx", ["vite", "build"], {
  stdio: "inherit",
  cwd: root,
  env: { ...process.env, CONFIG: configPath },
});
const out = join(outDir, "scrolly.html");
copyFileSync(join(root, "dist", "index.html"), out);
console.log("PRODUCE_RESULT " + JSON.stringify({ scrolly: out }));
