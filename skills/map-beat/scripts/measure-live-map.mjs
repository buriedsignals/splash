// skills/map-beat/scripts/measure-live-map.mjs
//
// WHAT A LIVE MAP DRAWS AT EACH FIXED CAMERA, MEASURED ONCE AND FROZEN. A video's words outside the map
// (a gauge, a label, the credit) are placed in Bun, where they are tested offline; they need to know where
// MapLibre puts a seat and what colour it paints under a box. So each fixed camera of a beat is mounted on
// the real map at the video's size, settled with every tile loaded, and read back: the projected seats and
// a grid of mean cell colours. The key stays in this process: the page reaches MapTiler through the proxy.

import { existsSync, readdirSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer-core";
import { assertMapTilerKey, startMapTilerProxy, DEFAULT_CACHE_DIR } from "./maptiler-proxy.mjs";
import { splashRoot } from "./splash-root.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const TRUNK = ["scrolly.mjs", "mount.mjs", "style.mjs"];
const PLACEHOLDER = "__MAPTILER" + "_KEY__";

/**
 * Headless Chrome has to be FOUND before it can be gated (rule 6). The same resolution as
 * `bake-plate.mjs`'s own, duplicated rather than imported: a skill script may not import out of its
 * skill, and the scrolly skill's copy is not this skill's to reach.
 */
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
  candidates.push("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome");
  const found = candidates.find((path) => existsSync(path));
  if (!found)
    throw new Error(
      `no Chrome to capture with. Looked in:\n  ${candidates.join("\n  ")}\nSet CHROME_PATH, or run: bunx puppeteer browsers install chrome`,
    );
  return found;
}

/** The shared trunk read as TEXT and inlined into the page, its imports and exports dropped: the page
 *  runs the very `viewOf`, `bindState`, `mountPlan` and `transformStyle` the live render runs. The root is
 *  found by its `#shared/*` marker, not a fixed climb. */
async function trunkScript() {
  const shared = join(splashRoot(HERE), "shared", "map-beat");
  const parts = [];
  for (const file of TRUNK) {
    const text = await readFile(join(shared, file), "utf8");
    parts.push(text.split("\n").filter((l) => !/^\s*import\s/.test(l)).join("\n").replace(/^export\s+/gm, ""));
  }
  return parts.join("\n");
}

/** A plan's MapTiler URLs pointed at the proxy, the key placeholder dropped. */
export function throughProxy(value, origin) {
  return JSON.parse(
    JSON.stringify(value)
      .replaceAll("https://api.maptiler.com/", `${origin}/maptiler/`)
      .replaceAll(`?key=${PLACEHOLDER}&`, "?")
      .replaceAll(`?key=${PLACEHOLDER}`, "")
      .replaceAll(`&key=${PLACEHOLDER}`, ""),
  );
}

export async function measureLiveMap({ plan, states, seats, size, mapTilerKey, cacheDir = DEFAULT_CACHE_DIR, cell = 16, tints }) {
  if (!mapTilerKey) throw new Error("measureLiveMap needs the MapTiler key, read by the caller from the environment");
  // The key is checked once before the first request: a warm cache never reaches MapTiler, so without
  // this a dead key produces a complete, correct render and says nothing.
  await assertMapTilerKey(mapTilerKey, { onNote: (n) => console.log(`  ${n}`) });
  const proxy = startMapTilerProxy({ key: mapTilerKey, cacheDir });
  const browser = await puppeteer.launch({ executablePath: resolveChrome(), args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--hide-scrollbars"] });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: size.width, height: size.height, deviceScaleFactor: 1 });
    const maplibre = await readFile(require.resolve("maplibre-gl/dist/maplibre-gl.js"), "utf8");
    await page.setContent(
      `<!doctype html><html><head><style>html,body,#map{margin:0;width:${size.width}px;height:${size.height}px}</style></head><body><div id="map"></div><script>${maplibre}</script><script>${await trunkScript()}</script></body></html>`,
    );
    const proxied = throughProxy(plan, proxy.origin);
    const out = {};
    for (const [name, state] of Object.entries(states)) {
      out[name] = await page.evaluate(
        async ({ proxied, state, seats, cell, tints, first }) => {
          if (first) {
            const doc = await (await fetch(proxied.styleUrl)).json();
            const style = tints ? transformStyle(doc, { tints, glyphs: doc.glyphs, keepLabels: [] }) : doc;
            style.transition = { duration: 0, delay: 0 };
            window.__map = new maplibregl.Map({
              container: "map",
              style,
              ...viewOf(state),
              interactive: false,
              attributionControl: false,
              fadeDuration: 0,
              canvasContextAttributes: { preserveDrawingBuffer: true },
            });
            await new Promise((r) => window.__map.once("style.load", r));
            window.__map.setProjection({ type: proxied.projection || "mercator" });
            mountPlan(window.__map, proxied);
          }
          const map = window.__map;
          map.jumpTo(viewOf(state));
          for (const layer of proxied.layers)
            for (const p in layer.bindings || {}) map.setPaintProperty(layer.id, p, bindState(layer.bindings[p], state), { validate: false });
          let tilesLoaded = false;
          for (let i = 0; i < 8 && !tilesLoaded; i++) {
            await new Promise((r) => {
              map.once("idle", r);
              map.triggerRepaint();
            });
            tilesLoaded = map.areTilesLoaded();
          }
          const projected = Object.fromEntries(
            Object.entries(seats).map(([id, ll]) => {
              const p = map.project(ll);
              return [id, [p.x, p.y]];
            }),
          );
          const gl = map.getCanvas().getContext("webgl2") || map.getCanvas().getContext("webgl");
          const w = gl.drawingBufferWidth,
            h = gl.drawingBufferHeight;
          const px = new Uint8Array(w * h * 4);
          gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, px);
          const cols = Math.floor(w / cell),
            rows = Math.floor(h / cell);
          const colours = [];
          for (let j = 0; j < rows; j++)
            for (let i = 0; i < cols; i++) {
              let r = 0,
                g = 0,
                b = 0,
                n = 0;
              for (let y = j * cell; y < (j + 1) * cell; y += 2)
                for (let x = i * cell; x < (i + 1) * cell; x += 2) {
                  const k = ((h - 1 - y) * w + x) * 4; // readPixels starts at the bottom row
                  r += px[k];
                  g += px[k + 1];
                  b += px[k + 2];
                  n++;
                }
              const hex = (v) => Math.round(v / n).toString(16).padStart(2, "0");
              colours.push(`#${hex(r)}${hex(g)}${hex(b)}`);
            }
          return { tilesLoaded, projected, grid: { cell, cols, rows, colours } };
        },
        { proxied, state, seats, cell, tints, first: Object.keys(out).length === 0 },
      );
    }
    return out;
  } finally {
    await browser.close();
    proxy.stop();
  }
}
