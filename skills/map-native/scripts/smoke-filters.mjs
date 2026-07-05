// Committed smoke: filter UI changes the visible feature count for each filter type.
// Covers: filter-choropleth (range/choropleth), filter-locator (category/locator),
//         filter-symbol (range/symbol).
// Exits non-zero on any failure.
import { chromium } from "playwright";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const atelier = join(root, "..", "..");

// Load .env from the atelier root if VITE_MAPTILER_KEY is not already set.
if (!process.env.VITE_MAPTILER_KEY) {
  try {
    const envText = readFileSync(join(atelier, ".env"), "utf8");
    for (const line of envText.split("\n")) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (m) process.env[m[1]] = m[2];
    }
  } catch {
    // .env missing — rely on caller-exported vars
  }
}
if (!process.env.MAPTILER_API_KEY && process.env.VITE_MAPTILER_KEY) {
  process.env.MAPTILER_API_KEY = process.env.VITE_MAPTILER_KEY;
}

const failures = [];

// Build a config with produce and return the interactive dir path.
function buildConfig(cfgName) {
  const cfgPath = join(root, "assets", "sample-data", cfgName);
  const outDir = mkdtempSync(join(tmpdir(), "smoke-filters-"));
  console.log(`  building ${cfgName} → ${outDir}`);
  execFileSync(
    "bun",
    ["scripts/produce.mjs", cfgPath, outDir, "static"],
    { cwd: root, env: process.env, stdio: "inherit" },
  );
  // produce writes interactive to dist/interactive-<tag>; find it via the
  // tag derived from outDir (mirrors produce.mjs tag logic).
  const tag = basename(outDir).replace(/[^a-z0-9_-]/gi, "") || "run";
  // produce.mjs creates dist/interactive-<tag> where tag is derived from outDir basename
  const interactiveDir = join(root, "dist", `interactive-${tag}`);
  return { outDir, interactiveDir };
}

// Wait for a map layer to be loaded and idle.
async function waitForMap(page, layerId) {
  await page.waitForSelector(".maplibregl-canvas", { timeout: 60_000 });
  await page.waitForFunction(
    (lid) =>
      window.__map__ &&
      window.__map__.getLayer &&
      window.__map__.getLayer(lid),
    layerId,
    { timeout: 60_000 },
  );
  await page.waitForFunction(
    () => {
      const m = window.__map__;
      return m && m.loaded && m.loaded() && m.areTilesLoaded && m.areTilesLoaded();
    },
    { timeout: 60_000 },
  );
}

// Count rendered features for a given layer.
async function countFeatures(page, layerId) {
  return page.evaluate(
    (lid) => window.__map__.queryRenderedFeatures({ layers: [lid] }).length,
    layerId,
  );
}

// Assert the filter bar is present (not hidden).
async function assertFilterbarPresent(page, label) {
  const present = await page.evaluate(() => {
    const el = document.querySelector('[data-testid="map-filterbar"]');
    if (!el) return false;
    const s = getComputedStyle(el);
    return s.display !== "none" && s.visibility !== "hidden";
  });
  if (!present) {
    failures.push(`${label}: filter bar not present / hidden`);
    console.error(`  FAIL: filter bar absent or hidden`);
  } else {
    console.log(`  filter bar: visible`);
  }
}

// Assert no page errors accumulated.
function assertNoErrors(errors, label) {
  if (errors.length) {
    failures.push(`${label}: page errors: ${errors.join("; ")}`);
    console.error(`  FAIL: page errors: ${errors.join("; ")}`);
  }
}

// Assert dataNotUnderFurnitureOk: no point marker sits under title, legend, or filterbar.
async function assertOcclusion(page, label) {
  const ok = await page.evaluate(() => {
    const m = window.__map__;
    if (!m) return true;
    const pts = [];
    for (const sid of ["symbols", "locator"]) {
      try {
        for (const f of m.querySourceFeatures(sid))
          if (f.geometry?.type === "Point") pts.push(f.geometry.coordinates);
      } catch {}
    }
    if (!pts.length) return true; // choropleth — not applicable
    const rectOf = (sel) => {
      const el = document.querySelector(sel);
      if (!el || getComputedStyle(el).display === "none") return null;
      const r = el.getBoundingClientRect();
      return r.width < 2 || r.height < 2 ? null : r;
    };
    const title = rectOf('[data-testid="map-title"]');
    const legend = rectOf('[data-testid="map-legend"]');
    const filterbar = rectOf('[data-testid="map-filterbar"]');
    const C = 30;
    const hit = (p, box) =>
      box &&
      p.x >= box.left - 14 &&
      p.x <= box.right + 14 &&
      p.y - C <= box.bottom &&
      p.y + C >= box.top;
    for (const c of pts) {
      const p = m.project(c);
      if (hit(p, title) || hit(p, legend) || hit(p, filterbar)) return false;
    }
    return true;
  });
  if (!ok) {
    failures.push(`${label}: dataNotUnderFurnitureOk:false — a point marker is under furniture`);
    console.error(`  FAIL: dataNotUnderFurnitureOk:false`);
  } else {
    console.log(`  dataNotUnderFurnitureOk:true`);
  }
}

const browser = await chromium.launch();

// ─── Case 1: filter-choropleth (range filter on choropleth-fill) ─────────────
{
  const label = "filter-choropleth";
  console.log(`\n[${label}]`);
  const { interactiveDir } = buildConfig("filter-choropleth.json");
  const url = pathToFileURL(join(interactiveDir, "index.html")).href;
  const page = await browser.newPage({ viewport: { width: 1000, height: 700 } });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));

  await page.goto(url);
  await waitForMap(page, "choropleth-fill");
  await page.waitForTimeout(1500);

  const before = await countFeatures(page, "choropleth-fill");
  console.log(`  count before: ${before}`);

  // Set range slider to 60% of range (hides lower-value countries)
  const sliderInfo = await page.evaluate(() => {
    const el = document.querySelector('[data-testid="filter-range"]');
    if (!el) return null;
    return { min: Number(el.min), max: Number(el.max) };
  });
  if (!sliderInfo) {
    failures.push(`${label}: no filter-range input found`);
    console.error(`  FAIL: no filter-range input`);
  } else {
    const newVal = Math.round(sliderInfo.min + (sliderInfo.max - sliderInfo.min) * 0.6);
    await page.evaluate((val) => {
      const el = document.querySelector('[data-testid="filter-range"]');
      el.value = val;
      el.dispatchEvent(new Event("input", { bubbles: true }));
    }, newVal);
    console.log(`  slider set to ${newVal}`);
    await page.waitForTimeout(800);

    const after = await countFeatures(page, "choropleth-fill");
    console.log(`  count after: ${after}`);
    if (after < before) {
      console.log(`  count drop: OK (${before} → ${after})`);
    } else {
      failures.push(`${label}: count did not drop (${before} → ${after})`);
      console.error(`  FAIL: count did not drop`);
    }
  }

  await assertOcclusion(page, label);
  await assertFilterbarPresent(page, label);
  assertNoErrors(errors, label);
  if (!failures.some((f) => f.startsWith(label))) console.log(`  OK`);
  await page.close();
}

// ─── Case 2: filter-locator (category filter on locator-glyphs) ──────────────
// The locator source disables clustering when a category filter is present (F-B fix).
// The smoke measures the cluster-inclusive total (glyphs + clusters) so that any regression
// that re-enables clustering while leaving cluster badges unfiltered will be caught.
{
  const label = "filter-locator";
  console.log(`\n[${label}]`);
  const { interactiveDir } = buildConfig("filter-locator.json");
  const url = pathToFileURL(join(interactiveDir, "index.html")).href;
  const page = await browser.newPage({ viewport: { width: 1000, height: 700 } });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));

  await page.goto(url);
  await waitForMap(page, "locator-glyphs");
  await page.waitForTimeout(1500);

  // Cluster-inclusive count: glyphs + any cluster badges that may be rendered.
  // With the F-B fix clustering is disabled so locator-clusters will be 0; the sum is still
  // measured this way so that a regression (clusters re-enabled but unfiltered) causes failure.
  async function countLocatorTotal(pg) {
    const glyphs = await countFeatures(pg, "locator-glyphs");
    const clusters = await pg.evaluate(() => {
      const m = window.__map__;
      if (!m || !m.getLayer("locator-clusters")) return 0;
      return m.queryRenderedFeatures({ layers: ["locator-clusters"] }).length;
    });
    const labels = await pg.evaluate(() => {
      const m = window.__map__;
      if (!m || !m.getLayer("locator-labels")) return 0;
      return m.queryRenderedFeatures({ layers: ["locator-labels"] }).length;
    });
    return { glyphs, clusters, labels, total: glyphs + clusters };
  }

  const beforeCounts = await countLocatorTotal(page);
  console.log(
    `  count before — glyphs:${beforeCounts.glyphs} clusters:${beforeCounts.clusters} labels:${beforeCounts.labels} total:${beforeCounts.total}`,
  );

  // Assert clustering IS disabled when a category filter is configured (F-B guardrail).
  const clusterLayerPresent = await page.evaluate(
    () => !!window.__map__?.getLayer("locator-clusters"),
  );
  if (clusterLayerPresent) {
    failures.push(
      `${label}: locator-clusters layer is present — clustering must be disabled when a category filter is active (F-B regression)`,
    );
    console.error(`  FAIL: locator-clusters layer still present (F-B regression)`);
  } else {
    console.log(`  no cluster layer: OK (clustering disabled for category filter)`);
  }

  const chips = await page.$$('[data-testid="filter-chip"]');
  if (chips.length === 0) {
    failures.push(`${label}: no filter chips found`);
    console.error(`  FAIL: no filter chips`);
  } else {
    console.log(`  found ${chips.length} chip(s), clicking first`);
    await chips[0].click();
    await page.waitForTimeout(800);

    const afterCounts = await countLocatorTotal(page);
    console.log(
      `  count after  — glyphs:${afterCounts.glyphs} clusters:${afterCounts.clusters} labels:${afterCounts.labels} total:${afterCounts.total}`,
    );
    if (afterCounts.total < beforeCounts.total) {
      console.log(
        `  count drop: OK (${beforeCounts.total} → ${afterCounts.total})`,
      );
    } else {
      failures.push(
        `${label}: cluster-inclusive count did not drop (${beforeCounts.total} → ${afterCounts.total})`,
      );
      console.error(`  FAIL: cluster-inclusive count did not drop`);
    }
    // Labels must drop alongside glyphs — a label with no marker is the F-B residual leak.
    if (afterCounts.labels < beforeCounts.labels) {
      console.log(
        `  label drop: OK (${beforeCounts.labels} → ${afterCounts.labels})`,
      );
    } else {
      failures.push(
        `${label}: locator-labels count did not drop (${beforeCounts.labels} → ${afterCounts.labels}) — labels survive filtered-out markers`,
      );
      console.error(`  FAIL: locator-labels count did not drop`);
    }
  }

  await assertOcclusion(page, label);
  await assertFilterbarPresent(page, label);
  assertNoErrors(errors, label);
  if (!failures.some((f) => f.startsWith(label))) console.log(`  OK`);
  await page.close();
}

// ─── Case 3: filter-symbol (range filter on symbol-circles) ──────────────────
{
  const label = "filter-symbol";
  console.log(`\n[${label}]`);
  const { interactiveDir } = buildConfig("filter-symbol.json");
  const url = pathToFileURL(join(interactiveDir, "index.html")).href;
  const page = await browser.newPage({ viewport: { width: 1000, height: 700 } });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));

  await page.goto(url);
  await waitForMap(page, "symbol-circles");
  await page.waitForTimeout(1500);

  const before = await countFeatures(page, "symbol-circles");
  console.log(`  count before: ${before}`);

  const sliderInfo = await page.evaluate(() => {
    const el = document.querySelector('[data-testid="filter-range"]');
    if (!el) return null;
    return { min: Number(el.min), max: Number(el.max) };
  });
  if (!sliderInfo) {
    failures.push(`${label}: no filter-range input found`);
    console.error(`  FAIL: no filter-range input`);
  } else {
    const newVal = Math.round(sliderInfo.min + (sliderInfo.max - sliderInfo.min) * 0.6);
    await page.evaluate((val) => {
      const el = document.querySelector('[data-testid="filter-range"]');
      el.value = val;
      el.dispatchEvent(new Event("input", { bubbles: true }));
    }, newVal);
    console.log(`  slider set to ${newVal}`);
    await page.waitForTimeout(800);

    const after = await countFeatures(page, "symbol-circles");
    console.log(`  count after: ${after}`);
    if (after < before) {
      console.log(`  count drop: OK (${before} → ${after})`);
    } else {
      failures.push(`${label}: count did not drop (${before} → ${after})`);
      console.error(`  FAIL: count did not drop`);
    }
  }

  await assertOcclusion(page, label);
  await assertFilterbarPresent(page, label);
  assertNoErrors(errors, label);
  if (!failures.some((f) => f.startsWith(label))) console.log(`  OK`);
  await page.close();
}

await browser.close();

if (failures.length) {
  console.error("\nSMOKE FAILURES:\n" + failures.map((f) => `  - ${f}`).join("\n"));
  process.exit(1);
}
console.log("\nsmoke:filters — all three types pass");
