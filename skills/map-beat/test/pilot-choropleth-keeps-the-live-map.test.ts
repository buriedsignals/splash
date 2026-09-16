// LANE: heavy
import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { homedir } from "node:os";
import { join } from "node:path";
import puppeteer from "puppeteer-core";
import { scrollyMapScript } from "#shared/map-beat/inline.mjs";
import { cameraFields } from "#shared/map-beat/scrolly.mjs";

// THE CHOROPLETH PILOT'S DRIVER KEEPS THE LIVE MAP IN CHARGE ONCE IT IS ON SCREEN. It used to read "live" as
// `ready && !failed`, and the runtime marked the map failed on any MapLibre `error` event: one refused tile
// put the frozen card images back under a moving live map, seated Albania's chip from baked pixels over the
// live camera, and kept the warmed map from ever taking over. Offline: a data-URL style and GeoJSON only.

const require = createRequire(import.meta.url);
const DRIVER = join(import.meta.dirname, "../../../proof/scrolly-choropleth-europe-lowcarbon/choropleth-drive.mjs");

/** A DUPLICATE of the `resolveChrome` every capture script in this tree carries — see
 *  `skills/map-beat/test/scrolly-live.test.ts`'s own copy for why these are duplicated rather than
 *  imported (a skill's own scripts stay copy-pasteable). */
function resolveChrome() {
  const candidates = [];
  if (process.env.CHROME_PATH) candidates.push(process.env.CHROME_PATH);
  const cache = join(homedir(), ".cache/puppeteer/chrome");
  if (existsSync(cache))
    for (const build of readdirSync(cache).sort().reverse())
      candidates.push(
        join(cache, build, "chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing"),
        join(cache, build, "chrome-mac-x64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing"),
        join(cache, build, "chrome-linux64/chrome"),
      );
  candidates.push("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", "/usr/bin/google-chrome");
  const found = candidates.find((c) => existsSync(c));
  if (!found)
    throw new Error(
      `no Chrome to drive — looked at ${candidates.join(", ")}. This format is verified by driving a ` +
        `real browser and by nothing else; there is no fallback that would prove anything.`,
    );
  return found;
}

const square = (w: number, s: number, e: number, n: number) => ({
  type: "FeatureCollection",
  features: [{ type: "Feature", properties: {}, geometry: { type: "Polygon", coordinates: [[[w, s], [e, s], [e, n], [w, n], [w, s]]] } }],
});
const style = {
  version: 8,
  sources: { sea: { type: "geojson", data: square(-30, 30, 50, 72) } },
  layers: [
    { id: "background", type: "background", paint: { "background-color": "#ffffff" } },
    { id: "Water", type: "fill", source: "sea", paint: { "fill-color": "#cccccc" } },
  ],
};
const STATES = [
  { ...cameraFields({ center: [10, 50], zoom: 3 }), card: 0, classes: 0, filter: 0, top: 0, zoom: 0, odd: 0 },
  { ...cameraFields({ center: [20, 41], zoom: 5 }), card: 1, classes: 1, filter: 0, top: 0, zoom: 1, odd: 1 },
];
const baked = { odd: [5, 5], zoom: 3 };
const plan = {
  styleUrl: `data:application/json,${encodeURIComponent(JSON.stringify(style))}`,
  tints: { water: "#aaccee", land: "#f4f1ea" },
  warmSamples: 40,
  referenceWidth: 800,
  cameras: [cameraFields({ center: [10, 50], zoom: 3 }), cameraFields({ center: [20, 41], zoom: 5 })],
  statesForCards: STATES,
  degreesPerPixel: 1,
  oddSeat: [20, 41],
  oddRingDegrees: 1,
  fallback: { wide: { size: { width: 800, height: 600 }, cards: [baked, baked] } },
  layers: [{ id: "classes", type: "fill", data: square(15, 38, 25, 44), paint: { "fill-color": "#000000", "fill-opacity": 0 }, bindings: { "fill-opacity": { $state: "classes" } } }],
};

let browser: puppeteer.Browser;
beforeAll(async () => {
  browser = await puppeteer.launch({ executablePath: resolveChrome(), args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
});
afterAll(async () => browser?.close());

describe("the choropleth pilot's driver once the live map is on screen", () => {
  it("should keep the frozen images hidden and the live map in charge when a map error fires after the reveal", async () => {
    const page = await browser.newPage();
    try {
      await page.setViewport({ width: 800, height: 600 });
      const js = readFileSync(require.resolve("maplibre-gl/dist/maplibre-gl.js"), "utf8");
      const driver = readFileSync(DRIVER, "utf8").replace(/^export /gm, "");
      const img = (k: number) => `<img data-fallback="${k}" data-shape="wide" style="position:absolute;inset:0;opacity:${k === 0 ? 1 : 0}">`;
      await page.setContent(
        `<style>html,body{margin:0}#root,[data-part=stage],[data-part=live]{position:absolute;inset:0}</style>` +
          `<div id="root"><div data-part="stage">${img(0)}${img(1)}<div data-part="live" style="opacity:0"></div>` +
          `<div data-part="odd-leader"></div><div data-role="odd" style="position:absolute">Albanie</div></div>` +
          `<div data-part="key"><i data-class-swatch="0"></i></div><p data-part="top-count" data-template="{n} pays" data-value="7"></p>` +
          `<script type="application/json" data-part="plan">${JSON.stringify(plan)}</script></div>` +
          `<script>${js}</script><script>${await scrollyMapScript()}\n${driver}\nwindow.applyChoroplethState = applyChoroplethState;</script>`,
      );
      const result = await page.evaluate(async (states) => {
        const w = window as any;
        const root = document.getElementById("root")!;
        const frame = () => new Promise((r) => requestAnimationFrame(r));
        const until = async (test: () => boolean) => {
          while (!test()) await frame();
        };
        root.dataset.state = JSON.stringify(states[0]);
        w.applyChoroplethState(root, states[0]);
        await until(() => root.dataset.liveShown !== undefined);
        const handle = w.__scrollyMap;
        const warmAtError = root.dataset.liveWarm !== undefined;
        for (const map of handle.maps) map.fire("error", { error: new Error("a tile request failed: 404") });
        root.dataset.state = JSON.stringify(states[1]);
        w.applyChoroplethState(root, states[1]);
        const images = () => Array.from(root.querySelectorAll<HTMLElement>("[data-fallback]")).map((el) => el.style.opacity);
        const oddLeft = Number.parseFloat((root.querySelector("[data-role=odd]") as HTMLElement).style.left);
        const afterError = { images: images(), oddLeft, liveOdd: handle.map.project([20, 41]).x };
        await until(() => root.dataset.liveWarm !== undefined);
        await frame();
        return {
          warmAtError,
          afterError,
          afterWarm: { images: images(), live: (root.querySelector("[data-part=live]") as HTMLElement).style.opacity },
          liveError: root.dataset.liveError,
          liveWarning: root.dataset.liveWarning,
          ready: handle.ready,
        };
      }, STATES);
      expect(result.warmAtError).toBe(false);
      expect(result.afterError.images).toEqual(["0", "0"]);
      expect(result.afterError.oddLeft).toBeCloseTo(result.afterError.liveOdd, 3);
      expect(result.afterWarm).toEqual({ images: ["0", "0"], live: "1" });
      expect(result.liveError).toBeUndefined();
      expect(result.liveWarning).toBe("a tile request failed: 404");
      expect(result.ready).toBe(true);
    } finally {
      await page.close();
    }
  }, 120_000);
});
