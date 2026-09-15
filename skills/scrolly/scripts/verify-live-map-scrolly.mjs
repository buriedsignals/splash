// twin/skills/scrolly/scripts/verify-live-map-scrolly.mjs
//
// THE TWO GUARDS A LIVE SCROLLY MAP OWES (addendum §2.6, §3.3), run on a real page with a real key.
//
//   1. After the warm, a scrub at 30, 120 and 400 px per animation frame meets no frame whose tiles
//      are not all loaded (`map.areTilesLoaded()` sampled every frame).
//   2. At every card's camera, no sampled point of the canvas is left undrawn — the page's own ground
//      or transparent — which is what a missing country or the space around the globe looks like.
//
// The key is substituted into a temporary copy of the page, never into the committed file, and that
// copy is removed once the run is done, however it ends.
//
// Usage: bun skills/scrolly/scripts/verify-live-map-scrolly.mjs <page.html> [--viewports 1280x800,375x812]

import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join, resolve } from "node:path";
import puppeteer from "puppeteer-core";
import { mapTilerKeyIn } from "#shared/map-beat/glyphs.mjs";

/** A DUPLICATE of the `resolveChrome` every capture script in this tree carries — see
 *  `skills/scrolly/scripts/verify-scrolly.mjs`'s own copy for why these are duplicated rather than
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

const [pagePath, ...rest] = process.argv.slice(2);
if (!pagePath) throw new Error("usage: verify-live-map-scrolly.mjs <page.html> [--viewports WxH,…]");
const viewports = (rest[rest.indexOf("--viewports") + 1] || "1280x800,375x812").split(",").map((v) => v.split("x").map(Number));
const key = mapTilerKeyIn(process.env);
if (!key) throw new Error("no MapTiler key in the environment");

const placeholder = "__MAPTILER" + "_KEY__";
const html = readFileSync(resolve(pagePath), "utf8");
if (!html.includes(placeholder)) throw new Error(`${pagePath} carries no key placeholder — is it a live map page?`);
const dir = mkdtempSync(join(tmpdir(), "live-scrolly-"));
const keyed = join(dir, "page.html");
writeFileSync(keyed, html.split(placeholder).join(key));

const failures = [];
try {
  const browser = await puppeteer.launch({ executablePath: resolveChrome(), args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
  try {
    for (const [width, height] of viewports) {
      const page = await browser.newPage();
      try {
        await page.setViewport({ width, height, deviceScaleFactor: 1 });
        // `?verify` tells the driver to pass `preserveDrawingBuffer: true` into `initScrollyMap`, or
        // `readPixels` below reads whatever WebGL happened to leave in the default (cleared) buffer.
        await page.goto(`file://${keyed}?verify`, { waitUntil: "load" });
        await page.waitForFunction(() => document.querySelector("[data-live-warm]") || document.querySelector("[data-live-error]"), { timeout: 60_000 });
        const error = await page.evaluate(() => document.querySelector("[data-live-error]")?.getAttribute("data-live-error"));
        if (error) {
          failures.push(`${width}x${height}: the live map reported "${error}"`);
          continue;
        }

        for (const speed of [30, 120, 400]) {
          const missing = await page.evaluate(async (speed) => {
            const scroller = document.querySelector(".scrolly-steps") || document.scrollingElement;
            const map = window.__scrollyMap?.map;
            if (!map) return -1;
            scroller.scrollTop = 0;
            let missing = 0;
            await new Promise((resolve) => {
              const step = () => {
                if (!map.areTilesLoaded()) missing += 1;
                if (scroller.scrollTop + scroller.clientHeight >= scroller.scrollHeight - 1) return resolve();
                scroller.scrollTop += speed;
                requestAnimationFrame(step);
              };
              requestAnimationFrame(step);
            });
            return missing;
          }, speed);
          if (missing !== 0) failures.push(`${width}x${height}: ${missing === -1 ? "no window.__scrollyMap handle" : `${missing} frames with a missing tile`} at ${speed}px/frame`);
        }

        // Land is tinted `mix(ground, ink, 0.045)` and water by `plateTints`, so the page's own ground
        // colour appears in the canvas only where nothing is drawn: a country missing from the tiles,
        // or space around the globe's limb. Either is a defect a real map does not have. A missing
        // handle is a sentinel (`null`), not a thrown error — the tile check above already treats it
        // that way, and an uncaught rejection here would skip both `page.close()` and `browser.close()`.
        const bare = await page.evaluate(async () => {
          const handle = window.__scrollyMap;
          if (!handle) return null;
          const ground = getComputedStyle(document.body).backgroundColor.match(/\d+/g).slice(0, 3).map(Number);
          const out = [];
          for (let k = 0; k < handle.plan.cameras.length; k++) {
            handle.apply({ ...handle.plan.cameras[k], ...handle.plan.statesForCards[k] });
            await new Promise((r) => handle.map.once("idle", r));
            const canvas = handle.map.getCanvas();
            const gl = canvas.getContext("webgl2") || canvas.getContext("webgl");
            let bareCount = 0;
            const px = new Uint8Array(4);
            for (let x = 2; x < canvas.width; x += Math.max(1, Math.floor(canvas.width / 48)))
              for (let y = 2; y < canvas.height; y += Math.max(1, Math.floor(canvas.height / 48))) {
                gl.readPixels(x, y, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
                if (px[3] === 0 || Math.abs(px[0] - ground[0]) + Math.abs(px[1] - ground[1]) + Math.abs(px[2] - ground[2]) < 3) bareCount += 1;
              }
            out.push(bareCount);
          }
          return out;
        });
        if (bare === null) failures.push(`${width}x${height}: no window.__scrollyMap handle`);
        else
          bare.forEach((n, k) => {
            if (n > 0) failures.push(`${width}x${height}: card ${k + 1} leaves ${n} sampled points of the canvas undrawn (page ground or transparent)`);
          });
      } finally {
        await page.close();
      }
    }
  } finally {
    await browser.close();
  }
} finally {
  rmSync(dir, { recursive: true, force: true });
}

if (failures.length) {
  console.log(failures.join("\n"));
  process.exit(1);
}
console.log(`live map guards hold on ${viewports.map((v) => v.join("x")).join(", ")}`);
