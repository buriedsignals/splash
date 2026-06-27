// One-off: backfill the missing output-proof/<type>/ folders by running produce()
// for each type from its committed sample. Doubles as a producer validation across
// 17 types / all families. Logs a per-type PASS/FAIL summary at the end.
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");

const TYPES = [
  "radar", "boxplot", "bump", "beeswarm", "treemap", "diverging-stacked",
  "sankey", "streamgraph", "gantt", "fan", "calendar", "waffle", "lorenz",
  "candlestick", "chord", "sunburst", "parallel",
];

const results = [];
for (const t of TYPES) {
  const sample = join(root, "assets/sample-data", `${t}.json`);
  const outDir = join(root, "output-proof", t);
  if (!existsSync(sample)) {
    results.push(`FAIL ${t} (no sample ${t}.json)`);
    continue;
  }
  console.log(`\n========== backfill ${t} ==========`);
  try {
    execFileSync("bun", [join(here, "produce.mjs"), t, sample, outDir, "all"], {
      stdio: "inherit",
      cwd: root,
    });
    results.push(`PASS ${t}`);
  } catch (e) {
    results.push(`FAIL ${t} (${String(e).split("\n")[0]})`);
  }
}

console.log("\n\n===== BACKFILL SUMMARY =====");
for (const r of results) console.log(r);
console.log(`\n${results.filter((r) => r.startsWith("PASS")).length}/${TYPES.length} produced`);
