#!/usr/bin/env bun
// Root quality gate: typecheck every skill that ships a tsconfig, then run every test
// suite. Producer/API suites self-skip without DATAWRAPPER_API_TOKEN, so this stays
// green on a clean checkout. Exits non-zero if any check fails.
import { spawnSync } from "node:child_process";
import { readdirSync } from "node:fs";

// ── WHY lib IS SPLIT, and why the split is COMPUTED (registry E15) ─────────────────────────
// `lib/verify` runs the only suite that launches a real browser. Measured 2026-08-04: once
// `lib/verify/capture-html.test.ts` shares a process with any `lib/host` file that drives ≥5 CLI
// journeys, Playwright can no longer launch Chromium — `ENOENT` on connect, inside launchProcess.
// It is NOT an assertion failing: the capture layer is fine, the browser never starts.
//
// Four causes were refuted by measurement, not by reasoning: an undrained `stderr` pipe (drained
// → still fails), spawning as such (1 child → fine), the number of children (20 → fine), and the
// weight of the child (6 real CLI boots → fine). The remaining shape points inside Bun's own
// process handling, which we would not fix here.
//
// So the coupling is REMOVED rather than explained, and that trade is stated plainly: this file
// tests the capture layer, never process co-residency, so nothing a journalist experiences
// depends on the two running together. What we buy is a gate whose number means something —
// which is the whole point of E15: while `lib` can redden by ordering, every green is unproven.
// ⚠️ This is a MITIGATION, not a diagnosis. The registry says so; do not read the determinism
// that follows as understanding.
//
// COMPUTED, never hand-listed: a new directory under `lib/` joins the gate by existing. A static
// list would silently stop testing whatever was added next, which is a worse defect than the one
// this split repairs.
const LIB_DIRS = readdirSync("lib", { withFileTypes: true })
  .filter((e) => e.isDirectory() && e.name !== "node_modules")
  .map((e) => `lib/${e.name}`)
  .sort();
const BROWSER_SUITE = "lib/verify";

const TSC_DIRS = ["lib", "skills/splash", "skills/chart-native", "skills/map-native", "skills/cesium-flyover", "skills/scrolly", "skills/image-native", "skills/dw-chart", "skills/map-dw", "install"];

const TEST_DIRS = [
  // Everything under lib EXCEPT the browser suite, in one process…
  { label: "lib", args: LIB_DIRS.filter((d) => d !== BROWSER_SUITE) },
  // …and the browser suite in its own, for the reason above.
  { label: BROWSER_SUITE, args: [BROWSER_SUITE] },
  "skills/dw-chart",
  "skills/chart-native",
  "skills/map-native",
  "skills/cesium-flyover",
  "skills/scrolly",
  "skills/image-native",
  "skills/map-dw/eval",
  "skills/map-dw/src",
  "skills/suggest-chart/eval",
  "skills/suggest-article/eval",
  "skills/splash",
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
// A plain string means "cd there and run every test under it" — unchanged. An object names the
// paths explicitly, from the repo root, which is what lets `lib` be split without a second idiom.
for (const d of TEST_DIRS) {
  if (typeof d === "string") run(`test  ${d}`, "bun", ["test"], d);
  else run(`test  ${d.label}`, "bun", ["test", ...d.args], ".");
}

console.log("\n");
for (const r of rows) {
  console.log(`${r.ok ? "PASS" : "FAIL"}  ${r.label}`);
  if (!r.ok) console.log(r.out.split("\n").slice(-30).join("\n"));
}
console.log(`\n${rows.length - failed}/${rows.length} checks passed.`);
process.exit(failed ? 1 : 0);
