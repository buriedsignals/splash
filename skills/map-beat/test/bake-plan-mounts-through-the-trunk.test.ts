// LANE: heavy
import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import {
  existsSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
} from "node:fs";
import { createRequire } from "node:module";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";
import puppeteer from "puppeteer-core";
import { bakePlan } from "#shared/map-beat/bake.mjs";
import { mountPlan } from "#shared/map-beat/mount.mjs";
import { scrollyMapScript } from "#shared/map-beat/inline.mjs";

// A BAKE PAGE GETS `mountPlan` WITH THE TRUNK IT CALLS. `proof/static-choropleth-europe-lowcarbon/bake.mjs`
// injected `mountPlan.toString()` on the claim that it closed over nothing; once `mountPlan` called
// `sourceIdOf` and `beforeIdFor`, every bake threw `sourceIdOf is not defined`, hidden by the plate cache.
// The per-card bake's own live test mounts a no-op `__mountPlan`, so nothing mounted a real layer offline.

const require = createRequire(import.meta.url);

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

const polygon = (w: number, s: number, e: number, n: number) => ({
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      properties: {},
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [w, s],
            [e, s],
            [e, n],
            [w, n],
            [w, s],
          ],
        ],
      },
    },
  ],
});

// The basemap: a white ground and one water fill over the western half of the frame.
const style = {
  version: 8,
  sources: { sea: { type: "geojson", data: polygon(-5, -5, 20, 35) } },
  layers: [
    {
      id: "background",
      type: "background",
      paint: { "background-color": "#ffffff" },
    },
    {
      id: "Water",
      type: "fill",
      source: "sea",
      paint: { "fill-color": "#cccccc" },
    },
  ],
};

// One GeoJSON fill across both halves, drawn beneath the basemap's water: `mountPlan` has to reach
// `sourceIdOf` for its source and `beforeIdFor` for its place in the stack.
const plan = {
  style,
  camera: {
    drawn: { width: 400, height: 300 },
    bounds: [
      [0, 0],
      [40, 30],
    ],
  },
  layers: [
    {
      id: "square",
      type: "fill",
      data: polygon(10, 5, 30, 25),
      paint: { "fill-color": "#ff0000" },
      beneath: "water",
    },
  ],
};

let browser: puppeteer.Browser;
let dir: string;
beforeAll(async () => {
  browser = await puppeteer.launch({
    executablePath: resolveChrome(),
    args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
  });
  dir = mkdtempSync(join(tmpdir(), "bake-plan-mount-"));
});
afterAll(async () => {
  await browser?.close();
  rmSync(dir, { recursive: true, force: true });
});

async function bakePage(mountScript: string) {
  const page = await browser.newPage();
  const js = readFileSync(
    require.resolve("maplibre-gl/dist/maplibre-gl.js"),
    "utf8",
  );
  await page.setContent(
    `<style>html,body{margin:0}#map{width:400px;height:300px}</style><div id="map"></div><script>${js}</script>`,
  );
  await page.addScriptTag({ content: mountScript });
  return page;
}

describe("a plan baked through the trunk injected into the page", () => {
  it("should mount a GeoJSON layer beneath the basemap's water when the page carries scrollyMapScript", async () => {
    const page = await bakePage(
      `${await scrollyMapScript()}\nwindow.__mountPlan = mountPlan;`,
    );
    try {
      const outPath = join(dir, "plate.png");
      await bakePlan({
        page,
        plan,
        glyphsUrl: undefined,
        tints: { water: "#aaccee", land: "#f4f1ea" },
        keepLabels: [],
        outPath,
      });
      const png = readFileSync(outPath).toString("base64");
      const pixels = await page.evaluate(async (png) => {
        const img = new Image();
        img.src = `data:image/png;base64,${png}`;
        await img.decode();
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(img, 0, 0);
        const at = (x: number, y: number) =>
          Array.from(ctx.getImageData(x * 2, y * 2, 1, 1).data.slice(0, 3));
        // Frame 400 × 300 CSS px over lon 0–40: lon 25 is x ≈ 250 (the square, east of the sea), lon 15 is
        // x ≈ 150 (the square, under the sea), both at the frame's middle height.
        return { east: at(250, 150), underSea: at(150, 150) };
      }, png);
      expect(pixels).toEqual({
        east: [255, 0, 0],
        underSea: [0xaa, 0xcc, 0xee],
      });
    } finally {
      await page.close();
    }
  }, 60_000);

  it("should refuse to mount from mountPlan's own text, which cannot reach the trunk it calls", async () => {
    const page = await bakePage(
      `window.__mountPlan = ${mountPlan.toString()};`,
    );
    try {
      let refusal = "";
      try {
        await bakePlan({
          page,
          plan,
          glyphsUrl: undefined,
          tints: { water: "#aaccee", land: "#f4f1ea" },
          keepLabels: [],
          outPath: join(dir, "never.png"),
        });
      } catch (error) {
        refusal = String(error);
      }
      expect(refusal).toMatch(/sourceIdOf is not defined/);
    } finally {
      await page.close();
    }
  }, 60_000);
});
