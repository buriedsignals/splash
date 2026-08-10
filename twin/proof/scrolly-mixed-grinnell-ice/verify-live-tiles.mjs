// PROVE THE LIVE MAPTILER LAYER IS REAL, AND SHOW IT.
//
// THE COMMITTED ARTIFACT IS NOT THE THING TO JUDGE THE MAP ON, and that is by design rather than by
// accident. R1b: a committed proof carries the delivery PLACEHOLDER, so `initLiveScrollMap` returns
// null, no MapLibre map is constructed, no tile is fetched and no newsroom's quota is spent. Opening
// `render/three-media-one-glacier.html` straight from the repository therefore shows the FALLBACK —
// the beat's own drawn geography, the two marked places and the scale bar, with no basemap under
// them. That is the correct behaviour and it is also why this script exists.
//
// WHAT IT DOES. Substitutes the real key into a COPY of the delivered file inside a `mkdtemp`
// outside the tree — the same shape `twin-map-web/scripts/verify-live-map.mjs` and the sibling map
// scrolly use, so the live probe cannot defeat the key guard — serves it, drives the same continuous
// scroll at three scrub speeds, and measures the owner's own two tests plus the one the warm exists
// to answer:
//
//   - a `<canvas>` in the DOM, and `api.maptiler.com` requested by the page;
//   - NO navigation control of any kind, and a camera that only the scroll moves;
//   - the map at FULL WIDTH;
//   - and, at 30 / 120 / 400 scrollport px per frame, how often MapLibre was still loading when the
//     reader arrived — the objection a baked plate would have answered and the warm answers instead.
//
// It also writes keyed screenshots to `drive/live-*.png` so the live picture is in the proof folder
// even though the live FILE never is.
//
// Usage:  bun proof/scrolly-mixed-grinnell-ice/verify-live-tiles.mjs [--no-warm]

import { createServer } from "node:http";
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { dirname, extname, join } from "node:path";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer";

const HERE = dirname(fileURLToPath(import.meta.url));
const FILE = "three-media-one-glacier.html";
const RENDER_DIR = join(HERE, "render");
const SHOT_DIR = join(HERE, "drive");
const PLACEHOLDER = "__MAPTILER" + "_KEY__";

/** Scrub speeds, in scrollport pixels per animation frame. 30 is a comfortable read; 400 is a
 *  trackpad flick that crosses the whole piece in a few frames. */
const SPEEDS = [30, 120, 400];
const SIZE = { width: 1600, height: 900 };

/** The positions the map is on screen for, and the two the keyed screenshots are taken at. */
const LIVE_SHOTS = [2, 3];

function resolveChrome() {
  const candidates = [];
  if (process.env.CHROME_PATH) candidates.push(process.env.CHROME_PATH);
  const cache = join(homedir(), ".cache/puppeteer/chrome");
  if (existsSync(cache))
    for (const build of readdirSync(cache).sort().reverse())
      candidates.push(
        join(cache, build, "chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing"),
        join(cache, build, "chrome-linux64/chrome"),
      );
  candidates.push("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome");
  const found = candidates.find((path) => existsSync(path));
  if (!found) throw new Error(`no Chrome found. Looked in:\n  ${candidates.join("\n  ")}`);
  return found;
}

/** The key, read from the same `.env` every other live probe in this tree reads. */
function readKey() {
  const env = join(HERE, "../../.env");
  if (!existsSync(env)) throw new Error(`no .env at ${env}: this probe needs a real MAPTILER_KEY`);
  const line = readFileSync(env, "utf8")
    .split(/\r?\n/)
    .find((l) => l.startsWith("MAPTILER_KEY="));
  if (!line) throw new Error(`no MAPTILER_KEY in ${env}`);
  return line.slice("MAPTILER_KEY=".length).trim();
}

const MIME = { ".html": "text/html", ".png": "image/png", ".jpg": "image/jpeg" };

function serve(root) {
  return new Promise((resolve) => {
    const server = createServer((req, res) => {
      const name = decodeURIComponent(req.url.split("?")[0]).replace(/^\//, "") || FILE;
      const path = join(root, name);
      if (!path.startsWith(root) || !existsSync(path)) {
        res.writeHead(404).end("no");
        return;
      }
      res.writeHead(200, { "content-type": MIME[extname(path)] ?? "application/octet-stream" });
      res.end(readFileSync(path));
    });
    server.listen(0, "127.0.0.1", () => resolve({ server, port: server.address().port }));
  });
}

async function main() {
  const noWarm = process.argv.includes("--no-warm");
  const key = readKey();
  const source = readFileSync(join(RENDER_DIR, FILE), "utf8");
  if (!source.includes(PLACEHOLDER))
    throw new Error(`${FILE} does not carry the delivery placeholder — the committed artifact must never hold a key`);
  let keyed = source.split(PLACEHOLDER).join(key);
  if (noWarm) keyed = keyed.replace("plan.warm || []", "[]");
  const dir = mkdtempSync(join(tmpdir(), "mixed-live-"));
  writeFileSync(join(dir, FILE), keyed);

  const { server, port } = await serve(dir);
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: resolveChrome(),
    args: ["--no-sandbox", "--hide-scrollbars", "--enable-unsafe-swiftshader"],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: SIZE.width, height: SIZE.height });
  const hosts = new Map();
  page.on("request", (r) => {
    const host = new URL(r.url()).host;
    if (host === "127.0.0.1") return;
    hosts.set(host, (hosts.get(host) ?? 0) + 1);
  });
  await page.goto(`http://127.0.0.1:${port}/${FILE}`, { waitUntil: "load" });
  // The warm drives the camera itself and resolves before the live layer is revealed; waiting for
  // the class it sets is waiting for exactly the thing the reader waits for.
  const warmed = await page
    .waitForFunction(() => document.documentElement.classList.contains("ms-live"), { timeout: 60000 })
    .then(() => true)
    .catch(() => false);
  const warmFacts = await page.evaluate(() => {
    const root = document.querySelector('[data-visual="mixed"]');
    return { warm: root.dataset.liveWarm ?? null, error: root.dataset.liveError ?? null };
  });

  const port2 = await page.evaluate(() => {
    let best = null;
    for (const el of document.querySelectorAll("*")) {
      const overflow = getComputedStyle(el).overflowY;
      if (overflow !== "auto" && overflow !== "scroll") continue;
      const distance = el.scrollHeight - el.clientHeight;
      if (distance > 1 && (!best || distance > best.distance)) best = { el, distance };
    }
    window.__port = best ? best.el : document.scrollingElement;
    return best ? best.distance : 0;
  });

  // The owner's own two tests, plus the two rulings that are true of a scrolly and not of map × web.
  const structure = await page.evaluate(() => {
    const root = document.querySelector('[data-visual="mixed"]');
    const layer = root.querySelector('[data-layer="map"]');
    const canvas = root.querySelector("canvas");
    const frame = root.getBoundingClientRect();
    const container = root.querySelector("[data-part=live]").getBoundingClientRect();
    return {
      canvases: root.querySelectorAll("canvas").length,
      canvasWidth: canvas ? canvas.getBoundingClientRect().width : 0,
      mapContainerWidth: container.width,
      frameWidth: frame.width,
      fullWidth: Math.abs(container.width - frame.width) < 1,
      navigationControls: document.querySelectorAll(".maplibregl-ctrl-group, .maplibregl-ctrl-zoom-in, .maplibregl-ctrl button").length,
      interactive: !!(window.__msMap && window.__msMap.dragPan && window.__msMap.dragPan.isEnabled()),
      scrollZoom: !!(window.__msMap && window.__msMap.scrollZoom && window.__msMap.scrollZoom.isEnabled()),
      keyboard: !!(window.__msMap && window.__msMap.keyboard && window.__msMap.keyboard.isEnabled()),
      layerOpacity: Number(getComputedStyle(layer).opacity),
    };
  });

  // Scrub, and ask whether the tiles kept up. `loaded()` is MapLibre's own answer to "is everything
  // for this camera on the screen", asked on the frame the reader is actually looking at.
  const scrub = [];
  for (const speed of SPEEDS) {
    const result = await page.evaluate(
      async (step, max) => {
        const port = window.__port;
        const map = window.__msMap;
        let frames = 0;
        let tilesMissing = 0;
        let notLoaded = 0;
        for (let y = 0; y <= max; y += step) {
          port.scrollTop = y;
          await new Promise((r) => requestAnimationFrame(() => r()));
          const root = document.querySelector('[data-visual="mixed"]');
          const mapOn = Number(getComputedStyle(root.querySelector('[data-layer="map"]')).opacity) > 0.02;
          if (!mapOn) continue;
          frames += 1;
          // TWO QUESTIONS, NOT ONE, and the difference between them is the whole finding.
          // `areTilesLoaded()` asks whether every tile for THIS camera is in hand, which is what a
          // reader sees. `loaded()` additionally asks whether the map has finished all its internal
          // work, and it is false on every frame of a scrub by construction — the driver calls
          // `jumpTo` on each one, so the map is re-planning as it is asked. Reporting `loaded()`
          // alone would have said "0% ready at every speed" about a map whose tiles were all there.
          if (!map.areTilesLoaded()) tilesMissing += 1;
          if (!map.loaded()) notLoaded += 1;
        }
        return { frames, tilesMissing, notLoaded };
      },
      speed,
      port2,
    );
    scrub.push({
      speed,
      ...result,
      fractionWithEveryTile: result.frames ? Number((1 - result.tilesMissing / result.frames).toFixed(3)) : null,
      fractionFullyIdle: result.frames ? Number((1 - result.notLoaded / result.frames).toFixed(3)) : null,
    });
  }

  // Keyed screenshots — the live picture, in the proof folder, since the live FILE never is.
  for (const target of LIVE_SHOTS) {
    await page.evaluate(
      async (want, max) => {
        const port = window.__port;
        const scrolly = document.querySelector(".scrolly");
        // Walk to the scroll offset whose published progress is nearest the reading wanted.
        let best = { y: 0, d: Infinity };
        for (let y = 0; y <= max; y += 20) {
          port.scrollTop = y;
          await new Promise((r) => requestAnimationFrame(() => r()));
          const d = Math.abs(Number(scrolly.dataset.progress) - want);
          if (d < best.d) best = { y, d };
        }
        port.scrollTop = best.y;
        await new Promise((r) => setTimeout(r, 900));
      },
      target,
      port2,
    );
    await page.screenshot({ path: join(SHOT_DIR, `live-step-${target + 1}.png`) });
  }

  const report = {
    file: join(dir, FILE),
    warmReached: warmed,
    warm: warmFacts,
    hosts: Object.fromEntries(hosts),
    maptilerRequests: [...hosts.entries()].filter(([h]) => h.endsWith("maptiler.com")).reduce((n, [, c]) => n + c, 0),
    structure,
    scrub,
  };
  await page.close();
  await browser.close();
  server.close();
  rmSync(dir, { recursive: true, force: true });

  console.log(JSON.stringify(report, null, 2));

  const problems = [];
  if (!structure.canvases) problems.push("no <canvas> in the DOM — the live map was never constructed");
  if (!report.maptilerRequests) problems.push("no request to api.maptiler.com — the page is not using MapTiler");
  if (structure.navigationControls) problems.push(`${structure.navigationControls} navigation control(s) on a scrolly map`);
  if (structure.interactive || structure.scrollZoom || structure.keyboard)
    problems.push("the reader can move this camera — on a scrolly the scroll is the only input");
  if (!structure.fullWidth)
    problems.push(`the map is ${structure.mapContainerWidth}px wide inside a ${structure.frameWidth}px frame — it must take the full width`);
  if (problems.length) throw new Error(problems.join("; "));
}

if (import.meta.main) await main();
