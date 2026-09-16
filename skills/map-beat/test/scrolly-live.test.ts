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

// `plan.cameras` are PURE camera fields — exactly `cameraFields`'s own output, nothing else — the
// shape Tasks 7-9 actually produce, and the warm reads only these. A card's full STATE (its camera
// plus every field a binding reads, `reveal` here) lives separately in `plan.statesForCards`: the
// runtime's own auto-restore of card 1 once ready (no scroll position pending yet) overlays
// `statesForCards[0]` onto `cameras[0]` rather than assuming the camera alone carries what a binding
// needs — the regression this file now guards is exactly a restore that assumed it did.
const CAMERAS = [
  cameraFields({ center: [10, 50], zoom: 3 }),
  cameraFields({ center: [20, 41], zoom: 6 }),
];
const STATES_FOR_CARDS = [
  { ...cameraFields({ center: [10, 50], zoom: 3 }), reveal: 0 },
  { ...cameraFields({ center: [20, 41], zoom: 6 }), reveal: 1 },
];

const plan = {
  styleUrl: `data:application/json,${encodeURIComponent(JSON.stringify(style))}`,
  tints: { water: "#aaccee", land: "#f4f1ea" },
  warmSamples: 1,
  cameras: CAMERAS,
  statesForCards: STATES_FOR_CARDS,
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
      // A plan that names no projection is a flat Web Mercator map (the owner's ruling, addendum §7.1).
      expect(result.projection).toBe("mercator");
      expect(result.center[0]).toBeCloseTo(20, 4);
      expect(result.center[1]).toBeCloseTo(41, 4);
      expect(result.zoom).toBeCloseTo(6, 6);
      expect(result.opacity).toBe(0.75);
      // Two cards, one uniform sample between them, and one view just past each integer zoom the travel
      // crosses (3 → 6 crosses 4 and 5): the widest view of each tile level is the one a scrub reaches
      // first, and uniform samples alone left it cold — 15 frames with a missing tile on the choropleth pilot.
      expect(result.warm?.startsWith("5:")).toBe(true);
      expect(result.live).toBe("1");
    } finally {
      await page.close();
    }
  }, 60_000);

  it("should set a bound paint value only when it changed", async () => {
    // 103 setPaintProperty calls per frame on the proportional symbol scrolly for values that had not moved.
    const page = await browser.newPage();
    try {
      await page.setViewport({ width: 800, height: 600 });
      await loadRuntime(page);
      const calls = await page.evaluate(async (plan) => {
        const root = document.getElementById("root")!;
        const handle = await new Promise<any>((resolve) => {
          const h = (window as any).initScrollyMap(root, { ...plan, referenceWidth: 800 }, { window, onReady: () => resolve(h), warmTimeoutMs: 2000 });
        });
        const map = handle.map;
        let count = 0;
        const set = map.setPaintProperty.bind(map);
        map.setPaintProperty = (...a: unknown[]) => {
          count++;
          return set(...a);
        };
        const state = { ...plan.cameras[1], reveal: 0.4 };
        (window as any).applyScrollyMap(handle, state);
        const first = count;
        (window as any).applyScrollyMap(handle, { ...state });
        const same = count - first;
        (window as any).applyScrollyMap(handle, { ...state, reveal: 0.5 });
        return { first, same, changed: count - first - same, opacity: map.getPaintProperty("square", "fill-opacity") };
      }, plan);
      expect(calls).toEqual({ first: calls.first, same: 0, changed: 1, opacity: 0.5 });
    } finally {
      await page.close();
    }
  }, 60_000);

  it("should set the projection the plan names", async () => {
    const page = await browser.newPage();
    try {
      await page.setViewport({ width: 400, height: 300 });
      await loadRuntime(page);
      const projection = await page.evaluate(async (plan) => {
        const root = document.getElementById("root")!;
        const handle = await new Promise<any>((resolve) => {
          const h = (window as any).initScrollyMap(
            root,
            { ...plan, projection: "globe", referenceWidth: 400 },
            { window, onReady: () => resolve(h), warmTimeoutMs: 2000 },
          );
        });
        return handle.map.getProjection()?.type;
      }, plan);
      expect(projection).toBe("globe");
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

  it("should shift zoom by the tighter of the width and height ratios when the plan names a referenceHeight", async () => {
    const page = await browser.newPage();
    try {
      await page.setViewport({ width: 800, height: 300 });
      await loadRuntime(page);
      const zoom = await page.evaluate(async (plan) => {
        const root = document.getElementById("root")!;
        const handle = await new Promise<any>((resolve) => {
          const h = (window as any).initScrollyMap(
            root,
            { ...plan, referenceWidth: 800, referenceHeight: 600 },
            { window, onReady: () => resolve(h), warmTimeoutMs: 2000 },
          );
        });
        return handle.map.getZoom();
      }, plan);
      expect(zoom).toBeCloseTo(
        plan.cameras[0].camZoom + Math.log2(300 / 600),
        6,
      );
    } finally {
      await page.close();
    }
  }, 60_000);

  it("should draw the state's own shifted camera before it reveals the map, never an unshifted one", async () => {
    // THE FIRST-SECOND REFRESH. Recorded on the choropleth pilot (Apple M2 Max, cold profile, CDP
    // screencast): at 2,436 ms the live map appeared at the card's UNSHIFTED camera (the stage's zoom
    // shift was not in the map's constructor), 8 ms later it jumped to the right camera and its tiles
    // filled in visible stages until 3,730 ms. What the canvas last drew when the container is revealed
    // must already be the state's shifted camera.
    const page = await browser.newPage();
    try {
      await page.setViewport({ width: 400, height: 600 });
      await loadRuntime(page);
      const result = await page.evaluate(async (plan) => {
        const root = document.getElementById("root")!;
        const live = root.querySelector("[data-part=live]") as HTMLElement;
        const w = window as any;
        const Original = w.maplibregl.Map;
        const rendered: number[] = [];
        const maps: any[] = [];
        w.maplibregl.Map = function (options: any) {
          const map = new Original(options);
          maps.push(map);
          map.on("render", () => {
            if (map === maps[0]) rendered.push(map.getZoom());
          });
          return map;
        };
        let atReveal: number | null = null;
        new MutationObserver(() => {
          if (live.style.opacity === "1" && atReveal === null) atReveal = rendered[rendered.length - 1] ?? null;
        }).observe(live, { attributes: true, attributeFilter: ["style"] });
        w.initScrollyMap(root, { ...plan, warmSamples: 400, referenceWidth: 800 }, { window, warmTimeoutMs: 2000 });
        await new Promise<void>((resolve) => {
          const check = () => (atReveal !== null ? resolve() : requestAnimationFrame(check));
          check();
        });
        w.maplibregl.Map = Original;
        return { atReveal, firstRendered: rendered[0] };
      }, plan);
      const shifted = plan.cameras[0].camZoom + Math.log2(400 / 800);
      expect(result.atReveal).toBeCloseTo(shifted, 6);
      expect(result.firstRendered).toBeCloseTo(shifted, 6);
    } finally {
      await page.close();
    }
  }, 120_000);

  it("should draw the stage's new size when the stage changes before the reveal, without a window resize", async () => {
    // THE HEADER SETS ITS TITLE ONCE ITS FACES LOAD, and on a phone that changes the stage's height without
    // resizing the window. Measured on the choropleth pilot (375 x 812 at 2x): the live map was revealed
    // with its names 19.5 px below the frozen card's, half the 39 px the stage had changed by.
    const page = await browser.newPage();
    try {
      await page.setViewport({ width: 800, height: 600 });
      await loadRuntime(page);
      const result = await page.evaluate(async (plan) => {
        const root = document.getElementById("root")!;
        const live = root.querySelector("[data-part=live]") as HTMLElement;
        const w = window as any;
        const Original = w.maplibregl.Map;
        const maps: any[] = [];
        w.maplibregl.Map = function (options: any) {
          const map = new Original(options);
          maps.push(map);
          return map;
        };
        let atReveal: { zoom: number; canvas: number } | null = null;
        new MutationObserver(() => {
          if (live.style.opacity === "1" && atReveal === null)
            atReveal = { zoom: maps[0].getZoom(), canvas: maps[0].getCanvas().clientHeight };
        }).observe(live, { attributes: true, attributeFilter: ["style"] });
        w.initScrollyMap(root, { ...plan, warmSamples: 400, referenceWidth: 800, referenceHeight: 600 }, { window, warmTimeoutMs: 2000 });
        root.style.bottom = "auto";
        root.style.height = "400px";
        await new Promise<void>((resolve) => {
          const check = () => (atReveal !== null ? resolve() : requestAnimationFrame(check));
          check();
        });
        w.maplibregl.Map = Original;
        return atReveal;
      }, plan);
      expect(result).toEqual({ zoom: expect.closeTo(plan.cameras[0].camZoom + Math.log2(400 / 600), 6), canvas: 400 });
    } finally {
      await page.close();
    }
  }, 120_000);

  it("should follow the stage's new size once shown, without a window resize or a new state", async () => {
    const page = await browser.newPage();
    try {
      await page.setViewport({ width: 800, height: 600 });
      await loadRuntime(page);
      const result = await page.evaluate(async (plan) => {
        const root = document.getElementById("root")!;
        const handle = (window as any).initScrollyMap(root, { ...plan, warmSamples: 400, referenceWidth: 800, referenceHeight: 600 }, { window, warmTimeoutMs: 2000 });
        await new Promise<void>((resolve) => {
          const check = () => (root.dataset.liveShown ? resolve() : requestAnimationFrame(check));
          check();
        });
        root.style.bottom = "auto";
        root.style.height = "400px";
        await new Promise((r) => setTimeout(r, 400));
        await new Promise((r) => handle.map.once("idle", r) && handle.map.triggerRepaint());
        return { zoom: handle.map.getZoom(), canvas: handle.map.getCanvas().clientHeight };
      }, plan);
      expect(result).toEqual({ zoom: expect.closeTo(plan.cameras[0].camZoom + Math.log2(400 / 600), 6), canvas: 400 });
    } finally {
      await page.close();
    }
  }, 120_000);

  it("should show a live map that follows the scroll before the warm has finished", async () => {
    // THE FIRST SCROLL IS READ ON A LIVE MAP, NOT ON THE FROZEN CARDS. Measured on the choropleth pilot
    // (Apple M2 Max, cold profile): the warm took 8 s and the reveal came 11.1 s after the page loaded,
    // so a reader's first scroll stepped through frozen card images and never saw a class arrive. A long
    // warm (many samples) is used here so the check lands while it is still running.
    const page = await browser.newPage();
    try {
      await page.setViewport({ width: 800, height: 600 });
      await loadRuntime(page);
      const result = await page.evaluate(async (plan) => {
        const root = document.getElementById("root")!;
        const live = root.querySelector("[data-part=live]") as HTMLElement;
        const handle = (window as any).initScrollyMap(
          root,
          { ...plan, warmSamples: 400, referenceWidth: 800 },
          { window, warmTimeoutMs: 2000, preserveDrawingBuffer: true },
        );
        await new Promise<void>((resolve) => {
          const check = () => (live.style.opacity === "1" || root.dataset.liveWarm !== undefined ? resolve() : requestAnimationFrame(check));
          check();
        });
        const warmDoneAtShow = root.dataset.liveWarm !== undefined;
        handle.apply({ ...plan.cameras[0], reveal: 0.5 });
        await new Promise((r) => handle.map.once("idle", r));
        const map = handle.map;
        const p = map.project([20, 42.5]);
        const canvas = map.getCanvas();
        const gl = canvas.getContext("webgl2") || canvas.getContext("webgl");
        const px = new Uint8Array(4);
        gl.readPixels(Math.round(p.x * devicePixelRatio), canvas.height - Math.round(p.y * devicePixelRatio), 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
        return {
          warmDoneAtShow,
          warmStillRunning: root.dataset.liveWarm === undefined,
          shown: live.style.opacity,
          red: px[0],
        };
      }, plan);
      expect(result.warmDoneAtShow).toBe(false);
      expect(result.warmStillRunning).toBe(true);
      expect(result.shown).toBe("1");
      // Black at 0.5 over the style's water polygon, tinted #aaccee (red 170): halfway is 85 — neither
      // the bare tint nor the full fill.
      expect(result.red).toBeGreaterThan(75);
      expect(result.red).toBeLessThan(95);
    } finally {
      await page.close();
    }
  }, 120_000);

  it("should reveal on card 1's own state when no scroll state is ever applied before ready", async () => {
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
        // No external `applyScrollyMap` call at all: `plan.cameras` alone (pure camera fields, no
        // `reveal`) would throw inside `bindState` if the restore did not also reach for
        // `plan.statesForCards`.
        return {
          center: handle.map.getCenter().toArray(),
          zoom: handle.map.getZoom(),
          opacity: handle.map.getPaintProperty("square", "fill-opacity"),
          live: (root.querySelector("[data-part=live]") as HTMLElement).style
            .opacity,
          liveError: root.dataset.liveError,
        };
      }, plan);
      const expected = viewOf(plan.statesForCards[0]);
      expect(result.center[0]).toBeCloseTo(expected.center[0], 4);
      expect(result.center[1]).toBeCloseTo(expected.center[1], 4);
      expect(result.zoom).toBeCloseTo(expected.zoom, 6);
      expect(result.opacity).toBe(plan.statesForCards[0].reveal);
      expect(result.live).toBe("1");
      expect(result.liveError).toBeUndefined();
    } finally {
      await page.close();
    }
  }, 60_000);

  it("should move the camera and paint through handle.apply, the door a real page's own IIFE leaves open", async () => {
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
        // `handle.apply` is what a real page's driver and this guard both call — `renderScrolly`
        // wraps the inlined runtime in an IIFE, so `window.applyScrollyMap` does not exist there.
        handle.apply(plan.statesForCards[1]);
        return {
          center: handle.map.getCenter().toArray(),
          zoom: handle.map.getZoom(),
          opacity: handle.map.getPaintProperty("square", "fill-opacity"),
        };
      }, plan);
      const expected = viewOf(plan.statesForCards[1]);
      expect(result.center[0]).toBeCloseTo(expected.center[0], 4);
      expect(result.center[1]).toBeCloseTo(expected.center[1], 4);
      expect(result.zoom).toBeCloseTo(expected.zoom, 6);
      expect(result.opacity).toBe(plan.statesForCards[1].reveal);
    } finally {
      await page.close();
    }
  }, 60_000);

  it("should keep a shown map in charge when a map error fires after the reveal, and record it as a warning", async () => {
    // ONE FAILED TILE OR GLYPH REQUEST IS NOT A FAILED MAP. Any MapLibre `error` event used to mark the whole
    // live map failed, even on screen: the driver then showed frozen card images under a moving live map and
    // the warmed map never took over.
    const page = await browser.newPage();
    try {
      await page.setViewport({ width: 800, height: 600 });
      await loadRuntime(page);
      const result = await page.evaluate(async (plan) => {
        const root = document.getElementById("root")!;
        const live = root.querySelector("[data-part=live]") as HTMLElement;
        let readyFired = false;
        const handle = (window as any).initScrollyMap(
          root,
          { ...plan, warmSamples: 40, referenceWidth: 800 },
          { window, warmTimeoutMs: 2000, onReady: () => (readyFired = true) },
        );
        await new Promise<void>((resolve) => {
          const check = () => (root.dataset.liveShown ? resolve() : requestAnimationFrame(check));
          check();
        });
        const warmBeforeError = root.dataset.liveWarm !== undefined;
        for (const map of handle.maps) map.fire("error", { error: new Error("a tile request failed: 404") });
        handle.apply({ ...plan.cameras[1], reveal: 0.25 });
        await new Promise<void>((resolve) => {
          const check = () => (root.dataset.liveWarm !== undefined ? resolve() : requestAnimationFrame(check));
          check();
        });
        return {
          warmBeforeError,
          readyFired,
          failed: handle.failed,
          ready: handle.ready,
          liveError: root.dataset.liveError,
          liveWarning: root.dataset.liveWarning,
          live: live.style.opacity,
          opacity: handle.map.getPaintProperty("square", "fill-opacity"),
        };
      }, plan);
      expect(result).toEqual({
        warmBeforeError: false,
        readyFired: true,
        failed: false,
        ready: true,
        liveError: undefined,
        liveWarning: "a tile request failed: 404",
        live: "1",
        opacity: 0.25,
      });
    } finally {
      await page.close();
    }
  }, 120_000);

  it("should fail and never reveal when the style itself cannot load, so the frozen images stay", async () => {
    const page = await browser.newPage();
    try {
      await page.setViewport({ width: 800, height: 600 });
      await loadRuntime(page);
      const result = await page.evaluate(async (plan) => {
        const root = document.getElementById("root")!;
        const handle = (window as any).initScrollyMap(root, { ...plan, styleUrl: "data:application/json,not-a-style" }, { window, warmTimeoutMs: 2000 });
        await new Promise<void>((resolve) => {
          const check = () => (root.dataset.liveError !== undefined ? resolve() : requestAnimationFrame(check));
          check();
        });
        await new Promise((r) => setTimeout(r, 500));
        return {
          failed: handle.failed,
          ready: handle.ready,
          live: (root.querySelector("[data-part=live]") as HTMLElement).style.opacity,
          shown: root.dataset.liveShown,
        };
      }, plan);
      expect(result).toEqual({ failed: true, ready: false, live: "0", shown: undefined });
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
