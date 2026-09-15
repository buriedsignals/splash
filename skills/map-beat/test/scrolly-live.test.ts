// LANE: heavy
import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { homedir } from "node:os";
import { join } from "node:path";
import puppeteer from "puppeteer-core";
import { scrollyMapScript } from "#shared/map-beat/inline.mjs";
import { cameraFields } from "#shared/map-beat/scrolly.mjs";

const require = createRequire(import.meta.url);

/** A DUPLICATE of the `resolveChrome` every capture script in this tree carries — see
 *  `map-web/test/standalone.test.ts`'s own copy and `skills/scrolly/scripts/verify-scrolly.mjs`'s
 *  own copy for why these are duplicated rather than imported (a skill's own scripts stay
 *  copy-pasteable). */
function resolveChrome() {
  const candidates = [];
  if (process.env.CHROME_PATH) candidates.push(process.env.CHROME_PATH);
  const cache = join(homedir(), ".cache/puppeteer/chrome");
  if (existsSync(cache))
    for (const build of readdirSync(cache).sort().reverse())
      candidates.push(
        join(
          cache,
          build,
          "chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing",
        ),
        join(
          cache,
          build,
          "chrome-mac-x64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing",
        ),
        join(cache, build, "chrome-linux64/chrome"),
      );
  candidates.push(
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/usr/bin/google-chrome",
  );
  const found = candidates.find((c) => existsSync(c));
  if (!found)
    throw new Error(
      `no Chrome to drive — looked at ${candidates.join(", ")}. This format is verified by driving a ` +
        `real browser and by nothing else; there is no fallback that would prove anything.`,
    );
  return found;
}

const CHROME = resolveChrome();
const style = {
  version: 8,
  sources: {
    land: {
      type: "geojson",
      data: {
        type: "FeatureCollection",
        features: [
          {
            type: "Feature",
            properties: {},
            geometry: {
              type: "Polygon",
              coordinates: [
                [
                  [-30, 30],
                  [50, 30],
                  [50, 72],
                  [-30, 72],
                  [-30, 30],
                ],
              ],
            },
          },
        ],
      },
    },
  },
  layers: [
    {
      id: "background",
      type: "background",
      paint: { "background-color": "#ffffff" },
    },
    {
      id: "Water",
      type: "fill",
      source: "land",
      paint: { "fill-color": "#cccccc" },
    },
  ],
};
const plan = {
  styleUrl: `data:application/json,${encodeURIComponent(JSON.stringify(style))}`,
  projection: "globe",
  tints: { water: "#aaccee", land: "#f4f1ea" },
  warmSamples: 1,
  cameras: [
    cameraFields({ center: [10, 50], zoom: 3 }),
    cameraFields({ center: [20, 41], zoom: 6 }),
  ],
  degreesPerPixel: 1,
  layers: [
    {
      id: "square",
      type: "fill",
      data: {
        type: "FeatureCollection",
        features: [
          {
            type: "Feature",
            properties: {},
            geometry: {
              type: "Polygon",
              coordinates: [
                [
                  [15, 40],
                  [25, 40],
                  [25, 45],
                  [15, 45],
                  [15, 40],
                ],
              ],
            },
          },
        ],
      },
      paint: { "fill-color": "#000000", "fill-opacity": 0 },
      bindings: { "fill-opacity": { $state: "reveal" } },
    },
  ],
};

let browser: puppeteer.Browser;
beforeAll(async () => {
  browser = await puppeteer.launch({
    executablePath: CHROME,
    args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
  });
});
afterAll(async () => browser?.close());

describe("the scrolly map runtime in a browser", () => {
  it("should follow the state's camera and paint once the warm is done", async () => {
    const page = await browser.newPage();
    await page.setViewport({ width: 800, height: 600 });
    const js = readFileSync(
      require.resolve("maplibre-gl/dist/maplibre-gl.js"),
      "utf8",
    );
    const css = readFileSync(
      require.resolve("maplibre-gl/dist/maplibre-gl.css"),
      "utf8",
    );
    const runtime = await scrollyMapScript();
    await page.setContent(
      `<style>${css} html,body{margin:0} #root,[data-part=live]{position:absolute;inset:0}</style>` +
        `<div id="root"><div data-part="live" style="opacity:0"></div></div><script>${js}</script><script>${runtime}</script>`,
    );
    const result = await page.evaluate(async (plan) => {
      const root = document.getElementById("root")!;
      const handle = await new Promise<any>((resolve) => {
        const h = (window as any).initScrollyMap(
          root,
          { ...plan, referenceWidth: 800 },
          { window, onReady: () => resolve(h), warmTimeoutMs: 2000 },
        );
      });
      (window as any).applyScrollyMap(handle, {
        ...plan.cameras[1],
        reveal: 0.75,
      });
      return {
        projection: handle.map.getProjection()?.type,
        center: handle.map.getCenter().toArray(),
        zoom: handle.map.getZoom(),
        opacity: handle.map.getPaintProperty("square", "fill-opacity"),
        warm: root.dataset.liveWarm,
        live: (root.querySelector("[data-part=live]") as HTMLElement).style
          .opacity,
      };
    }, plan);
    expect(result.projection).toBe("globe");
    expect(result.center[0]).toBeCloseTo(20, 4);
    expect(result.center[1]).toBeCloseTo(41, 4);
    expect(result.zoom).toBeCloseTo(6, 6);
    expect(result.opacity).toBe(0.75);
    expect(result.warm?.startsWith("3:")).toBe(true);
    expect(result.live).toBe("1");
  }, 60_000);
});
