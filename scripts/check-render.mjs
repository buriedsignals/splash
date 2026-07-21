#!/usr/bin/env bun
// check:render — Tier-2 #13. A SEPARATE, KEYED, SLOW lane that drives the REAL
// produce.mjs (or the in-process produce function, for the two engines that have no
// CLI entry point yet) for ONE golden config per engine, format(s) chosen to exercise
// the render-time snap guards.
//
// WHY THIS EXISTS (audit finding, docs/splash/audit-2026-07-20-agentic-and-render.md
// §A5): snap-contrast / snap-label-fit / snap-video / snap-reduced-motion / the map
// furniture contrast guard etc. run ONLY inside produce.mjs. `bun run check`
// (scripts/check.mjs) is typecheck + bun:test only — it never calls produce.mjs, so a
// render REGRESSION (e.g. a component that starts painting a label in a color that
// fails WCAG contrast against its real background) ships with a fully green gate and
// green CI. This lane closes that gap by actually rendering one representative
// config per engine and letting the snap guards fire for real.
//
// NOT part of `bun run check` (see scripts/check.mjs) — deliberately. Reasons:
//   1. It needs live keys (DATAWRAPPER_API_TOKEN, VITE_MAPTILER_KEY /
//      REMOTION_MAPTILER_KEY) that a clean checkout / most contributor machines will
//      not have — folding it into the token-free gate would break that gate's own
//      "green on a clean checkout" contract (scripts/check.mjs's own header comment).
//   2. It is slow (real Vite builds, a real headless-browser screenshot pipeline, and
//      for dw-chart/map-dw a real Datawrapper API round-trip) — tens of seconds even
//      for the network-free chart-native cases, longer for the keyed ones.
//   3. Even the network-free chart-native golden was deliberately kept HERE rather
//      than folded into the fast gate: the fast gate's contract is "typecheck + unit
//      test", a materially different dependency class (no headless-browser screenshot
//      pipeline, no Vite build) from a real render+snap pass. `bun run check` already
//      typechecks/tests chart-native's produce.mjs and every snap-*.mjs it calls
//      (they are plain .mjs under skills/chart-native/scripts, not gated files), so
//      keeping the actual EXECUTION of that pipeline in one place (this lane) avoids
//      contaminating the fast, always-green contributor gate with headless-browser
//      flakiness risk while still getting the network-free coverage for free
//      whenever `check:render` runs. Revisit if the fast gate's runtime budget ever
//      has headroom to spare.
//
// WHEN TO RUN: pre-merge / pre-release, locally, with a populated .env (see
// .env.example — DATAWRAPPER_API_TOKEN, VITE_MAPTILER_KEY, REMOTION_MAPTILER_KEY).
//
//   bun run check:render        (from the repo root — bun auto-loads ./.env there,
//                                 same as `bun run check`)
//
// CI: .github/workflows/ci.yml's only job (`check`) runs `bun run check` with no
// secrets configured — there is currently no keyed job to attach a `check:render`
// step to, and no secrets are fabricated here. Wire a keyed CI step once
// DATAWRAPPER_API_TOKEN / VITE_MAPTILER_KEY / REMOTION_MAPTILER_KEY exist as repo
// secrets: add a job (or a step gated on `secrets.DATAWRAPPER_API_TOKEN != ''`) that
// installs skills/{chart-native,map-native,scrolly,dw-chart,map-dw} deps, then runs
// `bun run check:render` with those secrets exported into the environment (bun
// auto-loads ./.env from the process cwd — exporting directly or writing a .env from
// the secrets both work, as long as this script's cwd is the repo root). Until then,
// run it locally pre-merge/pre-release.
//
// NO SILENT CAPS: every case that cannot run (missing key) is explicitly logged as
// SKIP with the reason — never just silently absent from the output.

import { spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, ".."); // repo root (splash-tier2, or wherever this checkout lives)

// Generous per-case ceiling — real renders, real network, real Datawrapper API calls.
// Not tuned tight: this lane's job is correctness, not speed: better a slow PASS/FAIL
// than a flaky one. A case that blows this is almost certainly hung, not just slow —
// the timeout kills it and is reported as a FAIL like any other broken produce.
const SUBPROCESS_TIMEOUT_MS = 5 * 60 * 1000;
const INPROCESS_TIMEOUT_MS = 2 * 60 * 1000;

const rows = []; // { id, status: "PASS" | "FAIL" | "SKIP", detail, elapsedMs }

function keysPresent(names) {
  return names.every((n) => typeof process.env[n] === "string" && process.env[n].trim() !== "");
}

function tmpOutDir(tag) {
  const base = mkdtempSync(join(tmpdir(), `check-render-${tag}-`));
  mkdirSync(base, { recursive: true });
  return base;
}

function tailLines(text, n = 40) {
  return text.split("\n").slice(-n).join("\n");
}

function recordPass(id, elapsedMs, detail) {
  rows.push({ id, status: "PASS", elapsedMs, detail });
  console.log(`PASS  ${id}  (${(elapsedMs / 1000).toFixed(1)}s)`);
}

function recordFail(id, elapsedMs, detail) {
  rows.push({ id, status: "FAIL", elapsedMs, detail });
  console.log(`FAIL  ${id}  (${(elapsedMs / 1000).toFixed(1)}s)`);
  console.log(tailLines(detail));
}

function recordSkip(id, reason) {
  rows.push({ id, status: "SKIP", elapsedMs: 0, detail: reason });
  console.log(`SKIP  ${id}  — ${reason}`);
}

// Runs a golden config through an engine's real `scripts/produce.mjs` CLI, exactly
// the way adapters.ts/produce-all would (chart-native, map-native, scrolly all ship
// this entry point). Captures combined stdout+stderr; PRODUCE_RESULT on stdout +
// exit 0 is success — anything else (a conformance violation, a snap guard firing, a
// crash) is a FAIL, and the tail of the real output (which names the exact
// engine/config/snap that broke, per each producer's own error text) is printed.
function runProduceCli(id, cwd, args) {
  const start = Date.now();
  const r = spawnSync("bun", args, {
    cwd,
    encoding: "utf8",
    timeout: SUBPROCESS_TIMEOUT_MS,
    killSignal: "SIGKILL",
  });
  const elapsed = Date.now() - start;
  const out = (r.stdout || "") + (r.stderr || "");
  const ok = r.status === 0 && /PRODUCE_RESULT/.test(r.stdout || "");
  if (ok) recordPass(id, elapsed, out);
  else {
    const why =
      r.error?.code === "ETIMEDOUT" || r.signal === "SIGKILL"
        ? `TIMED OUT after ${SUBPROCESS_TIMEOUT_MS / 1000}s (likely hung, not just slow)\n${out}`
        : out || String(r.error ?? "unknown failure");
    recordFail(id, elapsed, why);
  }
}

async function withTimeout(promise, ms, label) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label}: timed out after ${ms / 1000}s`)), ms);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    clearTimeout(timer);
  }
}

// dw-chart and map-dw have no CLI produce.mjs (only produce-all-types.ts, which
// cycles every chart type and is not a "one golden config" entry point) — so their
// golden case calls the REAL produceChart/produceMap function in-process, the exact
// function produce-all-types.ts and the orchestrator's own dispatch
// (skills/splash/src/adapters.ts) call. Same render+guard path, just no CLI wrapper
// to shell out to. The chart/map is deleted from the Datawrapper account afterward
// (mirrors produce-all-types.ts's own cleanup) so this lane never accumulates junk
// charts on repeated runs.
async function runProduceInProcess(id, fn) {
  const start = Date.now();
  try {
    const detail = await withTimeout(fn(), INPROCESS_TIMEOUT_MS, id);
    recordPass(id, Date.now() - start, detail);
  } catch (err) {
    recordFail(id, Date.now() - start, err?.stack || String(err?.message ?? err));
  }
}

console.log("check:render — golden produce+snap chain per engine (keyed, slow; NOT part of `bun run check`)\n");

// ---------------------------------------------------------------------------
// chart-native — network-free (no external API/tiles). Golden: "bar" /
// assets/sample-data/bars.json (a plain single-series ranking, no special-cased
// edge shape — representative of the most common newsroom chart).
//   static      → snap-contrast (WCAG text contrast) + snap-label-fit
//   interactive → snap-interactive-contrast + snap-tooltip-contrast +
//                 snap-tooltip-viewport + snap-reduced-motion (WCAG 2.3.3)
// ---------------------------------------------------------------------------
{
  const cwd = join(root, "skills/chart-native");
  runProduceCli("chart-native:bar:static", cwd, [
    "scripts/produce.mjs",
    "bar",
    "assets/sample-data/bars.json",
    tmpOutDir("chart-native-static"),
    "static",
  ]);
  runProduceCli("chart-native:bar:interactive", cwd, [
    "scripts/produce.mjs",
    "bar",
    "assets/sample-data/bars.json",
    tmpOutDir("chart-native-interactive"),
    "interactive",
  ]);
}

// ---------------------------------------------------------------------------
// map-native — needs a live MapTiler basemap (VITE_MAPTILER_KEY). Golden:
// assets/sample-data/choropleth.json (the flagship map type; no explicit "type"
// field = the implicit choropleth default, matching the sample as shipped).
//   static → the render-time furniture-text WCAG contrast guard (canvas-composited
//            sampling against the real basemap, closing the GL-contrast gap).
// ---------------------------------------------------------------------------
{
  const MAPTILER_KEYS = ["VITE_MAPTILER_KEY"];
  if (keysPresent(MAPTILER_KEYS)) {
    runProduceCli("map-native:choropleth:static", join(root, "skills/map-native"), [
      "scripts/produce.mjs",
      "assets/sample-data/choropleth.json",
      tmpOutDir("map-native-static"),
      "static",
    ]);
  } else {
    recordSkip(
      "map-native:choropleth:static",
      `${MAPTILER_KEYS.join("/")} not set — skipping (map-native needs a live MapTiler basemap even for a static render)`,
    );
  }
}

// ---------------------------------------------------------------------------
// scrolly — needs VITE_MAPTILER_KEY too: Scrolly.tsx imports all map modules
// statically, so even a chart-only scrolly config throws at load time without it
// (see scripts/produce.mjs's own comment in skills/scrolly). Golden:
// assets/sample-data/bar-scrolly.json (chart-hosted scrolly — the mechanism
// skills/scrolly provides, hosting chart-native's geometry under the scroll-driven
// format; see CLAUDE.md's engine/format taxonomy).
//   → snap-reduced-motion (WCAG 2.3.3): the sticky graphic must already show its
//     end-state under emulated prefers-reduced-motion, never keep animating.
// ---------------------------------------------------------------------------
{
  const MAPTILER_KEYS = ["VITE_MAPTILER_KEY"];
  if (keysPresent(MAPTILER_KEYS)) {
    runProduceCli("scrolly:bar-scrolly", join(root, "skills/scrolly"), [
      "scripts/produce.mjs",
      "assets/sample-data/bar-scrolly.json",
      tmpOutDir("scrolly"),
    ]);
  } else {
    recordSkip(
      "scrolly:bar-scrolly",
      `${MAPTILER_KEYS.join("/")} not set — skipping (Scrolly.tsx statically imports every map module, even for a chart-only config)`,
    );
  }
}

// ---------------------------------------------------------------------------
// dw-chart — needs DATAWRAPPER_API_TOKEN (a real Datawrapper API round-trip: create
// → set data → patch → publish → export PNG → delete). No CLI produce.mjs exists for
// this engine (only produce-all-types.ts, which cycles every chart type) — call the
// real produceChart() in-process instead, same function the orchestrator dispatches
// to. Golden: assets/sample-data/sample.spec.json (a d3-lines chart with
// valueLabels + numberFormat — exercises the label-safety + value-label-contrast
// guards produceChart runs before publish).
// ---------------------------------------------------------------------------
{
  const DW_KEYS = ["DATAWRAPPER_API_TOKEN"];
  if (keysPresent(DW_KEYS)) {
    await runProduceInProcess("dw-chart:d3-lines:static", async () => {
      const { readFileSync } = await import("node:fs");
      const { produceChart } = await import(
        pathToFileURL(join(root, "skills/dw-chart/src/produce.ts")).href
      );
      const { deleteChart } = await import(
        pathToFileURL(join(root, "skills/dw-chart/src/datawrapper.ts")).href
      );
      const specPath = join(root, "skills/dw-chart/assets/sample-data/sample.spec.json");
      const spec = JSON.parse(readFileSync(specPath, "utf8"));
      const outDir = tmpOutDir("dw-chart");
      const res = await produceChart(spec, join(outDir, "static.png"));
      await deleteChart(res.chartId); // never leave junk charts on the account
      return `PRODUCE_RESULT ${JSON.stringify(res)}\ndeleted ${res.chartId}`;
    });
  } else {
    recordSkip("dw-chart:d3-lines:static", `${DW_KEYS.join("/")} not set — skipping (needs a real Datawrapper API round-trip)`);
  }
}

// ---------------------------------------------------------------------------
// map-dw — same shape as dw-chart (no CLI produce.mjs, needs DATAWRAPPER_API_TOKEN),
// in-process real produceMap(). Golden: the "locator" case from
// eval/cases/arve-sites.json (3 markers along the Arve valley) — chosen over the
// choropleth eval cases specifically because it needs no basemap-geometry join fetch
// (assessJoinMatch), keeping this golden fast and network-scoped to just the DW API.
// map-dw is flagged in the audit (§A5) as the least-guarded engine (zero
// contrast/conformance/label-fit at the time of writing beyond the produce-time
// floor) — this golden at least proves its produce path renders end-to-end.
// ---------------------------------------------------------------------------
{
  const DW_KEYS = ["DATAWRAPPER_API_TOKEN"];
  if (keysPresent(DW_KEYS)) {
    await runProduceInProcess("map-dw:locator:static", async () => {
      const { readFileSync } = await import("node:fs");
      const { produceMap } = await import(pathToFileURL(join(root, "skills/map-dw/src/produce.ts")).href);
      const { deleteChart } = await import(
        pathToFileURL(join(root, "skills/dw-chart/src/datawrapper.ts")).href
      );
      const casePath = join(root, "skills/map-dw/eval/cases/arve-sites.json");
      const { spec } = JSON.parse(readFileSync(casePath, "utf8"));
      const outDir = tmpOutDir("map-dw");
      const res = await produceMap(spec, join(outDir, "static.png"));
      await deleteChart(res.chartId);
      return `PRODUCE_RESULT ${JSON.stringify(res)}\ndeleted ${res.chartId}`;
    });
  } else {
    recordSkip("map-dw:locator:static", `${DW_KEYS.join("/")} not set — skipping (needs a real Datawrapper API round-trip)`);
  }
}

// ---------------------------------------------------------------------------
console.log();
const passed = rows.filter((r) => r.status === "PASS").length;
const failed = rows.filter((r) => r.status === "FAIL").length;
const skipped = rows.filter((r) => r.status === "SKIP").length;
for (const r of rows) console.log(`  ${r.status.padEnd(4)}  ${r.id}`);
console.log(`\n${passed} passed, ${failed} failed, ${skipped} skipped (${rows.length} golden cases).`);
if (skipped > 0) {
  console.log(
    "\nSkips are logged, not silent — see the SKIP lines above for exactly which key each needs. " +
      "Run with a full .env (DATAWRAPPER_API_TOKEN, VITE_MAPTILER_KEY/REMOTION_MAPTILER_KEY) for full coverage.",
  );
}
process.exit(failed > 0 ? 1 : 0);
