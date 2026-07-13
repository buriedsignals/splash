// OPT-IN from-zero proof that a map-native / scrolly EXPORT "code source" bundle actually
// rebuilds and renders — the Task 9 definition-of-done harness for the runnable source-bundle
// feature (skills/atelier/scripts/bundle-source.mjs). For each representative case it drives
// the REAL pipeline end to end, no mocks, no shortcuts:
//
//   1. the engine's real scripts/produce.mjs (interactive / scrolly format) — real network,
//      real headless renders, drops source-manifest.json + config.json as a side effect;
//   2. bundle-source.mjs <source-manifest.json> <config.json> <bundleDir> — closure-copies a
//      runnable Vite project into a FRESH temp dir (no shared node_modules with the repo);
//   3. `bun install` then `bun run build` in that fresh bundleDir — the actual "does a
//      journalist's clean checkout rebuild this" proof;
//   4. assert dist/index.html exists;
//   5. headless-render dist/index.html via Playwright, asserting the map actually painted
//      (no "VITE_MAPTILER_KEY missing" page error, a maplibre canvas node present, tiles
//      loaded) and writes a proof PNG;
//   6. prints one PASS/FAIL line per case.
//
// This is slow BY DESIGN (real `bun install` from a cold temp dir + live MapTiler tile
// fetch) — that latency IS the proof. It is intentionally NOT wired into `bun run check`
// (would make the gate network-heavy and slow for every contributor on every run). Run it
// manually:
//
//   bun skills/atelier/scripts/verify-source-bundle.mjs              # full representative set
//   bun skills/atelier/scripts/verify-source-bundle.mjs <id> <id...> # only the named case(s)
//
// NO SILENT CAPS: whichever cases are NOT run in a given invocation (CLI-filtered out, or
// simply outside the representative set below) are explicitly logged as skipped — never
// just absent from the output.
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(here, "..", "..", ".."); // skills/atelier/scripts -> repo root

const BUNDLE_SOURCE = join(REPO_ROOT, "skills", "atelier", "scripts", "bundle-source.mjs");
const MAP_NATIVE_ROOT = join(REPO_ROOT, "skills", "map-native");
const MAP_NATIVE_PRODUCE = join(MAP_NATIVE_ROOT, "scripts", "produce.mjs");
const SCROLLY_ROOT = join(REPO_ROOT, "skills", "scrolly");
const SCROLLY_PRODUCE = join(SCROLLY_ROOT, "scripts", "produce.mjs");

// Source VITE_MAPTILER_KEY from the repo-root .env exactly like every engine's own
// produce.mjs does (see skills/scrolly/scripts/produce.mjs / skills/map-native/scripts/
// produce.mjs, top of file): bun/vite only auto-load a `.env` from the process's cwd, and
// nothing guarantees this script is invoked from the repo root, so read it explicitly rather
// than assume. Never hardcoded, never logged.
if (!process.env.VITE_MAPTILER_KEY) {
  const rootEnv = join(REPO_ROOT, ".env");
  try {
    const lines = readFileSync(rootEnv, "utf8").split("\n");
    for (const line of lines) {
      const m = line.match(/^VITE_MAPTILER_KEY\s*=\s*(.+)$/);
      if (m) {
        process.env.VITE_MAPTILER_KEY = m[1].trim();
        break;
      }
    }
  } catch {
    // .env absent/unreadable — fall through to the explicit refusal below.
  }
}
if (!process.env.VITE_MAPTILER_KEY) {
  console.error(
    "verify-source-bundle: VITE_MAPTILER_KEY not found (not in env, not in repo-root .env) " +
      "— refusing to run: every case would fail at render with a clear but useless " +
      '"VITE_MAPTILER_KEY missing" page error. Set it or add it to the repo-root .env.',
  );
  process.exit(1);
}

// playwright is already a devDependency of skills/map-native (skills/map-native/scripts/
// snap-proof.mjs uses it) — resolve it from there instead of re-declaring it here.
const requireFromMapNative = createRequire(join(MAP_NATIVE_ROOT, "package.json"));
const { chromium } = requireFromMapNative("playwright");

// Generous, bounded ceilings — real network + real browser work, not instant, but a true
// hang must still fail rather than run forever (mirrors the repo's video-watchdog philosophy).
const PRODUCE_TIMEOUT_MS = 10 * 60_000;
const BUNDLE_TIMEOUT_MS = 60_000;
const INSTALL_TIMEOUT_MS = 10 * 60_000;
const BUILD_TIMEOUT_MS = 5 * 60_000;
const RENDER_WAIT_TIMEOUT_MS = 60_000;

// The representative set (from the Task 9 plan): map-native choropleth, map-native symbol,
// one geo-heavy map-native type (route — polygons + a long line, dark basemap), and one
// map-scrolly (exercises the 3-tree closure: scrolly + map-native + chart-native all copied
// into one bundle). All four get the FULL treatment (produce → bundle → install → build →
// Playwright render) — none of them are structural-only.
const CASES = [
  {
    id: "map-native-choropleth",
    label: "map-native / choropleth",
    engine: "map-native",
    config: join(MAP_NATIVE_ROOT, "assets", "sample-data", "choropleth.json"),
  },
  {
    id: "map-native-symbol",
    label: "map-native / symbol",
    engine: "map-native",
    config: join(MAP_NATIVE_ROOT, "assets", "sample-data", "symbol.json"),
  },
  {
    id: "map-native-route",
    label: "map-native / route (geo-heavy: polygons + long line, dark basemap)",
    engine: "map-native",
    config: join(MAP_NATIVE_ROOT, "assets", "sample-data", "route.json"),
  },
  {
    id: "scrolly-map",
    label: "scrolly / map (3-tree closure: scrolly + map-native + chart-native)",
    engine: "scrolly",
    config: join(SCROLLY_ROOT, "assets", "sample-data", "scrolly.json"),
  },
];
const REPRESENTATIVE_IDS = CASES.map((c) => c.id);

// The remaining map-native types (locator, dot-density, hex-grid, cartogram) share the exact
// same source-manifest.json / bundle-source.mjs mechanism as choropleth/symbol/route, but are
// NOT independently proven by this harness — logged explicitly (never silently absent) rather
// than presented as covered.
const OUT_OF_SCOPE_TYPES = ["locator", "dot-density", "hex-grid", "cartogram"];

async function produce(def, outDir) {
  if (def.engine === "map-native") {
    execFileSync("bun", [MAP_NATIVE_PRODUCE, def.config, outDir, "interactive"], {
      cwd: MAP_NATIVE_ROOT,
      stdio: "inherit",
      timeout: PRODUCE_TIMEOUT_MS,
    });
  } else if (def.engine === "scrolly") {
    execFileSync("bun", [SCROLLY_PRODUCE, def.config, outDir], {
      cwd: SCROLLY_ROOT,
      stdio: "inherit",
      timeout: PRODUCE_TIMEOUT_MS,
    });
  } else {
    throw new Error(`unknown engine "${def.engine}"`);
  }
}

// Headless-render dist/index.html and assert it actually painted a map: a maplibre canvas
// node exists, the map reaches idle+tiles-loaded, and no page error mentions the missing-key
// throw (ChoroplethMap.tsx et al. throw "VITE_MAPTILER_KEY missing" at module load when the
// key never made it into the build — this is the real, end-to-end proof that the key
// threading through bundle-source's baked config actually works from a clean install).
async function renderAndAssert(distIndexPath, proofPngPath) {
  const fileUrl = pathToFileURL(distIndexPath).href;
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({
      viewport: { width: 1200, height: 700 },
      deviceScaleFactor: 2,
    });
    const pageErrors = [];
    page.on("pageerror", (e) => pageErrors.push(String(e?.message ?? e)));
    page.on("console", (msg) => {
      if (msg.type() === "error") pageErrors.push(msg.text());
    });

    await page.goto(fileUrl);
    await page.waitForSelector(".maplibregl-canvas", { timeout: RENDER_WAIT_TIMEOUT_MS });
    await page.waitForFunction(
      () => {
        const m = window.__map__;
        return Boolean(m && m.loaded && m.loaded() && m.areTilesLoaded && m.areTilesLoaded());
      },
      { timeout: RENDER_WAIT_TIMEOUT_MS },
    );
    await page.waitForTimeout(300); // settle for paint to flush, mirrors snap-proof.mjs

    const keyMissing = pageErrors.find((m) => m.includes("VITE_MAPTILER_KEY missing"));
    if (keyMissing) throw new Error(`page error: ${keyMissing}`);
    if (pageErrors.length > 0)
      throw new Error(`page reported ${pageErrors.length} console/page error(s): ${pageErrors[0]}`);

    await page.screenshot({ path: proofPngPath });
    return { canvasSelector: ".maplibregl-canvas", proofPngPath };
  } finally {
    await browser.close();
  }
}

async function runCase(def, proofRoot) {
  console.log(`\n=== ${def.label} (${def.id}) ===`);
  const workDir = mkdtempSync(join(tmpdir(), `verify-source-bundle-${def.id}-`));
  const produceOutDir = join(workDir, "produce-out");
  const bundleDir = join(workDir, `${def.id}-source`);

  try {
    console.log(`[${def.id}] 1/5 produce (interactive/scrolly, real network + render)…`);
    await produce(def, produceOutDir);

    const manifestPath = join(produceOutDir, "source-manifest.json");
    const configOutPath = join(produceOutDir, "config.json");
    if (!existsSync(manifestPath) || !existsSync(configOutPath)) {
      throw new Error(
        `produce.mjs did not drop source-manifest.json/config.json in ${produceOutDir}`,
      );
    }

    console.log(`[${def.id}] 2/5 bundle-source (closure copy)…`);
    execFileSync("bun", [BUNDLE_SOURCE, manifestPath, configOutPath, bundleDir], {
      cwd: REPO_ROOT,
      stdio: "inherit",
      timeout: BUNDLE_TIMEOUT_MS,
    });

    console.log(`[${def.id}] 3/5 bun install (from clean, real network)…`);
    execFileSync("bun", ["install"], {
      cwd: bundleDir,
      stdio: "inherit",
      timeout: INSTALL_TIMEOUT_MS,
    });

    console.log(`[${def.id}] 4/5 bun run build…`);
    execFileSync("bun", ["run", "build"], {
      cwd: bundleDir,
      env: { ...process.env },
      stdio: "inherit",
      timeout: BUILD_TIMEOUT_MS,
    });

    const distIndexPath = join(bundleDir, "dist", "index.html");
    if (!existsSync(distIndexPath)) {
      throw new Error(`bundle build did not produce dist/index.html at ${distIndexPath}`);
    }

    console.log(`[${def.id}] 5/5 headless render + assert (Playwright)…`);
    const proofPngPath = join(proofRoot, `${def.id}.png`);
    const render = await renderAndAssert(distIndexPath, proofPngPath);

    console.log(
      `PASS  ${def.id}  — dist/index.html rendered (${render.canvasSelector} present, tiles loaded, no key-missing error); proof: ${render.proofPngPath}`,
    );
    return { id: def.id, status: "PASS", proofPngPath: render.proofPngPath };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`FAIL  ${def.id}  — ${msg}`);
    return { id: def.id, status: "FAIL", error: msg };
  }
}

async function main() {
  const requestedIds = process.argv.slice(2);
  const unknown = requestedIds.filter((id) => !REPRESENTATIVE_IDS.includes(id));
  if (unknown.length > 0) {
    console.error(
      `verify-source-bundle: unknown case id(s): ${unknown.join(", ")} — known ids: ${REPRESENTATIVE_IDS.join(", ")}`,
    );
    process.exit(1);
  }
  const selected = requestedIds.length > 0 ? CASES.filter((c) => requestedIds.includes(c.id)) : CASES;
  const skippedByFilter = requestedIds.length > 0 ? CASES.filter((c) => !requestedIds.includes(c.id)) : [];

  console.log(`verify-source-bundle: representative set = ${REPRESENTATIVE_IDS.join(", ")}`);
  console.log(
    `verify-source-bundle: NOTE — map-native's remaining types (${OUT_OF_SCOPE_TYPES.join(", ")}) ` +
      "share the identical source-manifest/bundle-source mechanism but are OUT OF SCOPE for this " +
      "harness — not independently proven here.",
  );
  if (requestedIds.length > 0) {
    console.log(`verify-source-bundle: CLI filter — running: ${selected.map((c) => c.id).join(", ") || "(none)"}`);
    console.log(
      `verify-source-bundle: CLI filter — SKIPPING this invocation (explicit CLI selection): ${skippedByFilter.map((c) => c.id).join(", ") || "(none)"}`,
    );
  }
  if (selected.length === 0) {
    console.error("verify-source-bundle: no cases selected — nothing to run.");
    process.exit(1);
  }

  const proofRoot = mkdtempSync(join(tmpdir(), "atelier-verify-source-bundle-"));
  console.log(`verify-source-bundle: proof PNGs → ${proofRoot}`);

  const results = [];
  for (const def of selected) {
    results.push(await runCase(def, proofRoot));
  }

  console.log("\n=== SUMMARY ===");
  for (const r of results) console.log(`${r.status}  ${r.id}`);
  for (const c of skippedByFilter) console.log(`SKIPPED  ${c.id}  (excluded by CLI filter this invocation)`);

  const failed = results.filter((r) => r.status === "FAIL");
  if (failed.length > 0) {
    console.error(`\nverify-source-bundle: ${failed.length}/${results.length} case(s) FAILED.`);
    process.exit(1);
  }
  console.log(`\nverify-source-bundle: all ${results.length} run case(s) PASSED. Proof PNGs under ${proofRoot}`);
}

await main();
