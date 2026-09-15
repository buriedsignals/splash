// LANE: heavy
import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { homedir } from "node:os";
import { join } from "node:path";
import puppeteer from "puppeteer-core";
import { scrollyMapScript } from "#shared/map-beat/inline.mjs";
import { cameraFields, viewOf } from "#shared/map-beat/scrolly.mjs";

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

// Cameras carry every field the plan's own bindings read (`reveal`, here) — `plan.cameras` is typed
// `state[]`, not `camera[]`: a card's camera IS its state, so the runtime's own auto-restore of
// `cameras[0]` once ready (no scroll position pending yet) has a `reveal` to paint, not just a view.
const CAMERAS = [
  { ...cameraFields({ center: [10, 50], zoom: 3 }), reveal: 0 },
  { ...cameraFields({ center: [20, 41], zoom: 6 }), reveal: 1 },
];

const plan = {
  styleUrl: `data:application/json,${encodeURIComponent(JSON.stringify(style))}`,
  projection: "globe",
  tints: { water: "#aaccee", land: "#f4f1ea" },
  warmSamples: 1,
  cameras: CAMERAS,
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

// A style whose sweep matches nothing this plan tints: one `line` layer, no `background`, no
// `fill` — `styleDecisionFor` hides it as a texture and paints it nothing, so
// `assertLiveStyleAnswered` throws and the mount is expected to fail.
const noTintStyle = {
  version: 8,
  sources: {
    route: {
      type: "geojson",
      data: {
        type: "FeatureCollection",
        features: [
          {
            type: "Feature",
            properties: {},
            geometry: {
              type: "LineString",
              coordinates: [
                [0, 0],
                [1, 1],
              ],
            },
          },
        ],
      },
    },
  },
  layers: [
    {
      id: "route",
      type: "line",
      source: "route",
      paint: { "line-color": "#000000" },
    },
  ],
};
const noTintPlan = {
  ...plan,
  styleUrl: `data:application/json,${encodeURIComponent(JSON.stringify(noTintStyle))}`,
  layers: [],
};

let browser: puppeteer.Browser;
beforeAll(async () => {
  browser = await puppeteer.launch({
    executablePath: CHROME,
    args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
  });
});
afterAll(async () => browser?.close());

/** Loads the runtime and MapLibre's own bundle into a blank page — the one piece of setup every
 *  case shares. */
async function loadRuntime(page: puppeteer.Page) {
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
}

describe("the scrolly map runtime in a browser", () => {
  it("should follow the state's camera and paint once the warm is done", async () => {
    const page = await browser.newPage();
    try {
      await page.setViewport({ width: 800, height: 600 });
      await loadRuntime(page);
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
    } finally {
      await page.close();
    }
  }, 60_000);

  it("should restore the first camera once ready, not the camera the warm ended on", async () => {
    const page = await browser.newPage();
    try {
      await page.setViewport({ width: 800, height: 600 });
      await loadRuntime(page);
      const result = await page.evaluate(async (plan) => {
        const root = document.getElementById("root")!;
        const handle = await new Promise<any>((resolve) => {
          const h = (window as any).initScrollyMap(
            root,
            { ...plan, referenceWidth: 800 },
            { window, onReady: () => resolve(h), warmTimeoutMs: 2000 },
          );
        });
        return {
          center: handle.map.getCenter().toArray(),
          zoom: handle.map.getZoom(),
        };
      }, plan);
      const expected = viewOf(plan.cameras[0]);
      expect(result.center[0]).toBeCloseTo(expected.center[0], 4);
      expect(result.center[1]).toBeCloseTo(expected.center[1], 4);
      expect(result.zoom).toBeCloseTo(expected.zoom, 6);
    } finally {
      await page.close();
    }
  }, 60_000);

  it("should shift zoom by log2(width / referenceWidth) when the stage is narrower than the plan's reference", async () => {
    const page = await browser.newPage();
    try {
      const width = 400;
      await page.setViewport({ width, height: 600 });
      await loadRuntime(page);
      const result = await page.evaluate(async (plan) => {
        const root = document.getElementById("root")!;
        const handle = await new Promise<any>((resolve) => {
          const h = (window as any).initScrollyMap(
            root,
            { ...plan, referenceWidth: 800 },
            { window, onReady: () => resolve(h), warmTimeoutMs: 2000 },
          );
        });
        return {
          zoom: handle.map.getZoom(),
          containerWidth: (
            root.querySelector("[data-part=live]") as HTMLElement
          ).clientWidth,
        };
      }, plan);
      expect(result.containerWidth).toBe(width);
      expect(result.zoom).toBeCloseTo(
        plan.cameras[0].camZoom + Math.log2(width / 800),
        6,
      );
    } finally {
      await page.close();
    }
  }, 60_000);

  it("should record the first error and never reveal the container when the style sweep answers no tint", async () => {
    const page = await browser.newPage();
    try {
      await page.setViewport({ width: 800, height: 600 });
      await loadRuntime(page);
      const result = await page.evaluate(async (plan) => {
        const root = document.getElementById("root")!;
        (window as any).initScrollyMap(
          root,
          { ...plan, referenceWidth: 800 },
          { window, warmTimeoutMs: 2000 },
        );
        // No `onReady` will ever fire for a failed mount — poll for the warm's own receipt instead,
        // which is written whether or not the mount that preceded it succeeded.
        await new Promise<void>((resolve) => {
          const check = () =>
            root.dataset.liveWarm !== undefined
              ? resolve()
              : requestAnimationFrame(check);
          check();
        });
        return {
          liveError: root.dataset.liveError,
          live: (root.querySelector("[data-part=live]") as HTMLElement).style
            .opacity,
        };
      }, noTintPlan);
      expect(result.liveError).toContain("carries no layer");
      expect(result.live).toBe("0");
    } finally {
      await page.close();
    }
  }, 60_000);
});
