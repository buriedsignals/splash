import { afterAll, afterEach, beforeAll, describe, expect, it } from "bun:test";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createRequire } from "node:module";
import puppeteer from "puppeteer-core";
import { bakeCards } from "#shared/map-beat/bake.mjs";
import { mapTilerKeyIn } from "#shared/map-beat/glyphs.mjs";
import { cameraFields } from "#shared/map-beat/scrolly.mjs";
import { resolveChrome } from "../../../scripts/chrome-for-testing.mjs";

const require = createRequire(import.meta.url);
const key = mapTilerKeyIn(process.env);

const CHROME = resolveChrome();
let browser: puppeteer.Browser;
const temps: string[] = [];
const pages: puppeteer.Page[] = [];
const newPage = async () => {
  const page = await browser.newPage();
  pages.push(page);
  return page;
};
const tempDir = () => {
  const dir = mkdtempSync(join(tmpdir(), "cards-"));
  temps.push(dir);
  return dir;
};
beforeAll(async () => {
  browser = await puppeteer.launch({
    executablePath: CHROME,
    args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
  });
});
afterEach(async () => {
  for (const page of pages.splice(0)) await page.close();
});
afterAll(async () => {
  await browser?.close();
  for (const dir of temps) rmSync(dir, { recursive: true, force: true });
});

describe.skipIf(!key)("per-card fallback bake", () => {
  it("should write one PNG per card at twice the published size", async () => {
    const style = await (
      await fetch(`https://api.maptiler.com/maps/dataviz/style.json?key=${key}`)
    ).json();
    const page = await newPage();
    const js = readFileSync(
      require.resolve("maplibre-gl/dist/maplibre-gl.js"),
      "utf8",
    );
    await page.setContent(
      `<div id="map" style="position:absolute;inset:0"></div><script>${js}</script><script>window.__mountPlan=()=>{}</script>`,
    );
    const outDir = tempDir();
    const cameras = [
      cameraFields({ center: [10, 50], zoom: 3 }),
      cameraFields({ center: [20, 41.3], zoom: 6 }),
    ];
    const out = await bakeCards({
      page,
      plan: { style, layers: [] },
      cameras,
      size: { width: 400, height: 300 },
      glyphsUrl: style.glyphs,
      tints: { water: "#aaccee", land: "#f4f1ea" },
      keepLabels: [],
      statesForCards: cameras,
      outDir,
      stem: "probe",
    });
    expect(out.map((o) => o.card)).toEqual([0, 1]);
    const head = readFileSync(out[1].png).subarray(16, 24);
    expect([head.readUInt32BE(0), head.readUInt32BE(4)]).toEqual([800, 600]);
  }, 120_000);

  it("should bake at the scale it is given, so a 1x screen gets a 1x picture", async () => {
    // A reader on a 1x screen saw the frozen card's words (a 2x bake, downscaled, thin) turn heavier the
    // moment the live 1x canvas replaced them — the owner's "les fonts changent dans les premières
    // secondes". The page offers both bakes through srcset.
    const style = await (
      await fetch(`https://api.maptiler.com/maps/dataviz/style.json?key=${key}`)
    ).json();
    const page = await newPage();
    const js = readFileSync(require.resolve("maplibre-gl/dist/maplibre-gl.js"), "utf8");
    await page.setContent(
      `<div id="map" style="position:absolute;inset:0"></div><script>${js}</script><script>window.__mountPlan=()=>{}</script>`,
    );
    const cameras = [cameraFields({ center: [10, 50], zoom: 3 })];
    const out = await bakeCards({
      page,
      plan: { style, layers: [] },
      cameras,
      size: { width: 400, height: 300 },
      glyphsUrl: style.glyphs,
      tints: { water: "#aaccee", land: "#f4f1ea" },
      keepLabels: [],
      statesForCards: cameras,
      outDir: tempDir(),
      stem: "probe",
      scale: 1,
    });
    const head = readFileSync(out[0].png).subarray(16, 24);
    expect([head.readUInt32BE(0), head.readUInt32BE(4)]).toEqual([400, 300]);
  }, 120_000);

  it("should read back each card's pixel for the points it is asked to project, at the fitted zoom", async () => {
    const style = await (
      await fetch(`https://api.maptiler.com/maps/dataviz/style.json?key=${key}`)
    ).json();
    const page = await newPage();
    const js = readFileSync(
      require.resolve("maplibre-gl/dist/maplibre-gl.js"),
      "utf8",
    );
    await page.setContent(
      `<div id="map" style="position:absolute;inset:0"></div><script>${js}</script><script>window.__mountPlan=()=>{}</script>`,
    );
    const cameras = [
      cameraFields({ center: [10, 50], zoom: 3 }),
      cameraFields({ center: [20, 41.3], zoom: 6 }),
    ];
    const out = await bakeCards({
      page,
      plan: {
        style,
        layers: [],
        referenceWidth: 400,
        referenceHeight: 600,
      },
      cameras,
      size: { width: 400, height: 300 },
      glyphsUrl: style.glyphs,
      tints: { water: "#aaccee", land: "#f4f1ea" },
      keepLabels: [],
      statesForCards: cameras,
      outDir: tempDir(),
      stem: "probe",
      project: [[20, 41.3]],
    });
    expect(out[1].projected[0][0]).toBeCloseTo(200, 0);
    expect(out[1].projected[0][1]).toBeCloseTo(150, 0);
    expect(out[1].zoom).toBeCloseTo(6 + Math.log2(300 / 600), 6);
  }, 120_000);
});
