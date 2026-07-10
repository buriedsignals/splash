#!/usr/bin/env bun
// Root quality gate: typecheck every skill that ships a tsconfig, then run every test
// suite. Producer/API suites self-skip without DATAWRAPPER_API_TOKEN, so this stays
// green on a clean checkout. Exits non-zero if any check fails.
import { spawnSync } from "node:child_process";

const TSC_DIRS = ["skills/atelier", "skills/chart-native", "skills/map-native", "skills/scrolly", "skills/image-native", "install"];

const TEST_DIRS = [
  "skills/dw-chart",
  "skills/chart-native",
  "skills/map-native",
  "skills/scrolly",
  "skills/image-native",
  "skills/map-dw/eval",
  "skills/map-dw/src",
  "skills/suggest-chart/eval",
  "skills/suggest-article/eval",
  "skills/atelier",
  "docs/installer",
  "install",
];

const rows = [];
let failed = 0;

function run(label, cmd, args, cwd) {
  const r = spawnSync(cmd, args, { cwd, encoding: "utf8" });
  const ok = r.status === 0;
  if (!ok) failed++;
  rows.push({ label, ok, out: (r.stdout || "") + (r.stderr || "") });
  process.stdout.write(ok ? "." : "F");
}

console.log("Typechecking (tsc --noEmit)…");
for (const d of TSC_DIRS) run(`tsc   ${d}`, "bunx", ["tsc", "--noEmit"], d);
console.log("\nTesting (bun test)…");
for (const d of TEST_DIRS) run(`test  ${d}`, "bun", ["test"], d);

console.log("\n");
for (const r of rows) {
  console.log(`${r.ok ? "PASS" : "FAIL"}  ${r.label}`);
  if (!r.ok) console.log(r.out.split("\n").slice(-30).join("\n"));
}
console.log(`\n${rows.length - failed}/${rows.length} checks passed.`);
process.exit(failed ? 1 : 0);
