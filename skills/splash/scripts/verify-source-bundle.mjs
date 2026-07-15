// OPT-IN from-zero proof that a map-native / scrolly EXPORT "code source" bundle actually
// rebuilds and renders — the Task 9 definition-of-done harness for the runnable source-bundle
// feature (skills/splash/scripts/bundle-source.mjs). Two tiers of representative case, both
// driving the REAL pipeline end to end, no mocks, no shortcuts:
//
//   render: true  cases (choropleth, symbol, route, the map-scrolly 3-tree closure) get the
//                 FULL 5-step treatment:
//     1. the engine's real scripts/produce.mjs (interactive / scrolly format) — real network,
//        real headless renders, drops source-manifest.json + config.json as a side effect;
//     2. bundle-source.mjs <source-manifest.json> <config.json> <bundleDir> — closure-copies a
//        runnable Vite project into a FRESH temp dir (no shared node_modules with the repo);
//     3. `bun install` then `bun run build` in that fresh bundleDir — the actual "does a
//        journalist's clean checkout rebuild this" proof;
//     4. assert dist/index.html exists;
//     5. headless-render dist/index.html via Playwright, asserting the map actually painted
//        (no "VITE_MAPTILER_KEY missing" page error, a maplibre canvas node present, tiles
//        loaded) and writes a proof PNG.
//   render: false cases (the remaining 4 map-native types: locator, dot-density, hex-grid,
//                 cartogram) run STRUCTURAL-ONLY — steps 1-4 above, skipping the slow live-tile
//                 Playwright render — so all 7 map-native types are build-verified from zero
//                 without paying the full render cost on every one.
//
// Each case prints one PASS / PASS (structural-only) / FAIL line.
//
// This is slow BY DESIGN (real `bun install` from a cold temp dir + live MapTiler tile
// fetch) — that latency IS the proof. It is intentionally NOT wired into `bun run check`
// (would make the gate network-heavy and slow for every contributor on every run). Run it
// manually:
//
//   bun skills/splash/scripts/verify-source-bundle.mjs              # full representative set
//   bun skills/splash/scripts/verify-source-bundle.mjs <id> <id...> # only the named case(s)
//
// NO SILENT CAPS: whichever cases are NOT run in a given invocation (CLI-filtered out, or
// simply outside the representative set below) are explicitly logged as skipped — never
// just absent from the output.
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(here, "..", "..", ".."); // skills/splash/scripts -> repo root

const BUNDLE_SOURCE = join(REPO_ROOT, "skills", "splash", "scripts", "bundle-source.mjs");
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

// The representative set (from the Task 9 plan). Two tiers:
//
//   render: true  — the FULL treatment (produce → bundle → install → build → Playwright
//                   render + assert the map paints). Covers map choropleth + symbol (the two
//                   most common types), route (geo-heavy: polygons + a long line, dark
//                   basemap), and the map-scrolly 3-tree closure (scrolly + map-native +
//                   chart-native copied into one bundle).
//   render: false — STRUCTURAL-ONLY (steps 1-4: produce → bundle → clean install → build →
//                   assert dist/index.html). Proves the bundle actually BUILDS from clean, but
//                   skips the slow live-tile Playwright render. Covers the remaining 4 map
//                   types (locator, dot-density, hex-grid, cartogram) so ALL 7 map-native
//                   types' bundles are build-verified, not just the 3 rendered ones (Task 9
//                   Step 1 explicitly asked for structural-only coverage of the rest).
const CASES = [
  {
    id: "map-native-choropleth",
    label: "map-native / choropleth",
    engine: "map-native",
    config: join(MAP_NATIVE_ROOT, "assets", "sample-data", "choropleth.json"),
    render: true,
  },
  {
    id: "map-native-symbol",
    label: "map-native / symbol",
    engine: "map-native",
    config: join(MAP_NATIVE_ROOT, "assets", "sample-data", "symbol.json"),
    render: true,
  },
  {
    id: "map-native-route",
    label: "map-native / route (geo-heavy: polygons + long line, dark basemap)",
    engine: "map-native",
    config: join(MAP_NATIVE_ROOT, "assets", "sample-data", "route.json"),
    render: true,
  },
  {
    id: "scrolly-map",
    label: "scrolly / map (3-tree closure: scrolly + map-native + chart-native)",
    engine: "scrolly",
    config: join(SCROLLY_ROOT, "assets", "sample-data", "scrolly.json"),
    render: true,
  },
  {
    id: "map-native-locator",
    label: "map-native / locator (structural-only: build, no render)",
    engine: "map-native",
    config: join(MAP_NATIVE_ROOT, "assets", "sample-data", "locator-few.json"),
    render: false,
  },
  {
    id: "map-native-dot-density",
    label: "map-native / dot-density (structural-only: build, no render)",
    engine: "map-native",
    config: join(MAP_NATIVE_ROOT, "assets", "sample-data", "dot-density-uni.json"),
    render: false,
  },
  {
    id: "map-native-hex-grid",
    label: "map-native / hex-grid (structural-only: build, no render)",
    engine: "map-native",
    config: join(MAP_NATIVE_ROOT, "assets", "sample-data", "hex-grid-count.json"),
    render: false,
  },
  {
    id: "map-native-cartogram",
    label: "map-native / cartogram (structural-only: build, no render)",
    engine: "map-native",
    config: join(MAP_NATIVE_ROOT, "assets", "sample-data", "cartogram-scaled.json"),
    render: false,
  },
];
const REPRESENTATIVE_IDS = CASES.map((c) => c.id);

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

    // The map components throw "VITE_MAPTILER_KEY missing" at MODULE LOAD when the key never
    // made it into the build — in that case the canvas is never created, so a bare
    // waitForSelector would burn the full RENDER_WAIT_TIMEOUT_MS before failing with a generic
    // "selector not found" even though pageErrors already holds the real cause. Race the
    // selector wait against a poll of pageErrors so we fail FAST with the precise reason. The
    // poll only ever REJECTS (on a captured missing-key error) — it never resolves or self-
    // times-out, so if the canvas simply loads slowly, canvasReady wins and its own timeout is
    // the failure of record. The interval is cleared no matter which branch settles the race.
    const canvasReady = page.waitForSelector(".maplibregl-canvas", {
      timeout: RENDER_WAIT_TIMEOUT_MS,
    });
    let keyPoll;
    const keyMissingRace = new Promise((_, reject) => {
      keyPoll = setInterval(() => {
        const km = pageErrors.find((m) => m.includes("VITE_MAPTILER_KEY missing"));
        if (km) reject(new Error(`page error at load: ${km}`));
      }, 200);
      if (typeof keyPoll.unref === "function") keyPoll.unref();
    });
    try {
      await Promise.race([canvasReady, keyMissingRace]);
    } finally {
      clearInterval(keyPoll);
    }

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
  const doRender = def.render !== false;
  const nSteps = doRender ? 5 : 4;
  console.log(`\n=== ${def.label} (${def.id}) ===`);
  const workDir = mkdtempSync(join(tmpdir(), `verify-source-bundle-${def.id}-`));
  const produceOutDir = join(workDir, "produce-out");
  const bundleDir = join(workDir, `${def.id}-source`);

  try {
    console.log(`[${def.id}] 1/${nSteps} produce (interactive/scrolly, real network + render)…`);
    await produce(def, produceOutDir);

    const manifestPath = join(produceOutDir, "source-manifest.json");
    const configOutPath = join(produceOutDir, "config.json");
    if (!existsSync(manifestPath) || !existsSync(configOutPath)) {
      throw new Error(
        `produce.mjs did not drop source-manifest.json/config.json in ${produceOutDir}`,
      );
    }

    console.log(`[${def.id}] 2/${nSteps} bundle-source (closure copy)…`);
    execFileSync("bun", [BUNDLE_SOURCE, manifestPath, configOutPath, bundleDir], {
      cwd: REPO_ROOT,
      stdio: "inherit",
      timeout: BUNDLE_TIMEOUT_MS,
    });

    console.log(`[${def.id}] 3/${nSteps} bun install (from clean, real network)…`);
    execFileSync("bun", ["install"], {
      cwd: bundleDir,
      stdio: "inherit",
      timeout: INSTALL_TIMEOUT_MS,
    });

    console.log(`[${def.id}] 4/${nSteps} bun run build…`);
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

    // Structural-only case: the bundle BUILT from clean (steps 1-4). Skip the slow live-tile
    // Playwright render — its own PASS tier ("PASS (structural-only)") is reported distinctly
    // so partial coverage is never presented as a full render pass.
    if (!doRender) {
      console.log(
        `PASS (structural-only)  ${def.id}  — clean install + build produced dist/index.html (render SKIPPED by design for this type).`,
      );
      return { id: def.id, status: "PASS (structural-only)" };
    }

    console.log(`[${def.id}] 5/${nSteps} headless render + assert (Playwright)…`);
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
  } finally {
    // Each case leaves a full node_modules install under workDir/bundleDir — heavy, and
    // repeated runs would accumulate them under the OS temp dir. Remove the whole workDir;
    // the proof PNGs live under the separate proofRoot (logged) and survive.
    rmSync(workDir, { recursive: true, force: true });
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

  const renderedIds = CASES.filter((c) => c.render !== false).map((c) => c.id);
  const structuralIds = CASES.filter((c) => c.render === false).map((c) => c.id);
  console.log(`verify-source-bundle: representative set = ${REPRESENTATIVE_IDS.join(", ")}`);
  console.log(`verify-source-bundle: full render (produce→bundle→install→build→render): ${renderedIds.join(", ")}`);
  console.log(
    `verify-source-bundle: structural-only (produce→bundle→install→build, NO render): ${structuralIds.join(", ")} ` +
      "— these build-verify the remaining map types' bundles so all 7 are covered.",
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

  const proofRoot = mkdtempSync(join(tmpdir(), "splash-verify-source-bundle-"));
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
  const rendered = results.filter((r) => r.status === "PASS").length;
  const structural = results.filter((r) => r.status === "PASS (structural-only)").length;
  console.log(
    `\nverify-source-bundle: all ${results.length} run case(s) PASSED ` +
      `(${rendered} full-render, ${structural} structural-only). Proof PNGs under ${proofRoot}`,
  );
}

await main();
