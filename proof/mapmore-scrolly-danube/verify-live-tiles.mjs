// DRIVE THE LIVE MAP AND MEASURE WHETHER THE TILES KEEP UP WITH A READER'S THUMB.
//
// This is the probe that answers the objection the baked plate was kept for. `BRIEF.md` used to
// argue — honestly, and it is kept there marked overturned — that a scrolly's camera is authored and
// finite, so one capture can hold everything the reader will ever see and a tile server is a risk
// taken for nothing. The owner ruled that maps always use MapTiler. So the risk is engineered around
// (the camera is WARMED through MapLibre's own tile cache before the live layer is revealed) and
// then MEASURED here, at scrub speeds from a slow read to a flick.
//
// WHY IT IS NOT IN `bun test`. It needs a real key and a real network — the committed artifact
// carries the placeholder (R1b) and must never spend a newsroom's quota. It writes a KEYED COPY into
// a `mkdtemp` OUTSIDE the tree, exactly as `map-web/scripts/verify-live-map.mjs` does, so the
// live probe cannot defeat the key guard. What IS in `bun test` is the assertion that the committed
// file contains the live layer at all — see `scroll.test.ts`, where the whole of R1 could otherwise
// be deleted in silence.
//
// THIS BEAT'S CAMERA IS FIXED, so there is exactly ONE camera to warm — and it is not knowable in
// node, because it is the contain fit of the plate into whatever box the reader's viewport gives the
// graphic. It is therefore measured at TWO widths: the desktop shape and the phone, whose zooms are
// two levels apart and whose tile sets have nothing in common.
//
// Usage:  bun proof/mapmore-scrolly-danube/verify-live-tiles.mjs [--no-warm] [--size 375x812]

import { createServer } from "node:http";
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { dirname, extname, join } from "node:path";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer";

const HERE = dirname(fileURLToPath(import.meta.url));
const FILE = "danube-scrolly.html";
const RENDER_DIR = join(HERE, "render");
const PLACEHOLDER = "__MAPTILER" + "_KEY__";

/** Scrub speeds, in scrollport pixels per animation frame. 30 is a comfortable read; 400 is a
 *  trackpad flick that crosses the whole piece in a few frames. */
const SPEEDS = [30, 120, 400];

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

/** The key, read from the SAME `.env` this beat's own `bake.mjs` reads (`--env`, defaulting to the
 *  root two directories up). One home, and it is the beat's own existing convention rather than a
 *  second path invented here. */
function readKey() {
  const env = join(HERE, "../../.env");
  if (!existsSync(env)) throw new Error(`no .env at ${env}: this probe needs a real MAPTILER_KEY`);
  const line = readFileSync(env, "utf8").split(/\r?\n/).find((l) => l.startsWith("MAPTILER_KEY="));
  if (!line) throw new Error(`no MAPTILER_KEY in ${env}`);
  return line.slice("MAPTILER_KEY=".length).trim();
}

/** The keyed page, written OUTSIDE the tree. The committed file keeps the placeholder. */
function keyedCopy(key, { warm }) {
  const dir = mkdtempSync(join(tmpdir(), "danube-live-"));
  let html = readFileSync(join(RENDER_DIR, FILE), "utf8").replaceAll(PLACEHOLDER, key);
  // `--no-warm` is the CONTROL, not an option a beat ships: it turns the mitigation off so the same
  // page can be measured with and without it, which is the only way the warm's own number means
  // anything. This beat's warm list is built in the browser (see `live-scroll-map.mjs`), so the flag
  // in the plan is what there is to flip — the sibling empties a build-time array instead.
  if (!warm) html = html.replace('"warmEnabled":true', '"warmEnabled":false');
  writeFileSync(join(dir, FILE), html);
  return dir;
}

const MIME = { ".html": "text/html", ".png": "image/png" };

function serve(root) {
  return new Promise((resolve) => {
    const server = createServer((req, res) => {
      const name = decodeURIComponent(req.url.split("?")[0]).replace(/^\//, "") || FILE;
      const path = join(root, name);
      if (!path.startsWith(root) || !existsSync(path)) return void res.writeHead(404).end("no");
      res.writeHead(200, { "content-type": MIME[extname(path)] ?? "application/octet-stream" });
      res.end(readFileSync(path));
    });
    server.listen(0, "127.0.0.1", () => resolve({ server, port: server.address().port }));
  });
}

const PORT = () => {
  let best = null;
  for (const el of document.querySelectorAll("*")) {
    const overflow = getComputedStyle(el).overflowY;
    if (overflow !== "auto" && overflow !== "scroll") continue;
    const distance = el.scrollHeight - el.clientHeight;
    if (distance > 1 && (!best || distance > best.distance)) best = { el, distance };
  }
  window.__port = best ? best.el : document.scrollingElement;
  return best ? best.distance : 0;
};

async function run({ warm, size }) {
  const key = readKey();
  const dir = keyedCopy(key, { warm });
  const { server, port } = await serve(dir);
  const browser = await puppeteer.launch({ executablePath: resolveChrome(), args: ["--no-sandbox", "--hide-scrollbars"] });
  const page = await browser.newPage();
  await page.setViewport(size);

  const tiles = [];
  page.on("response", (response) => {
    const url = response.url();
    if (url.includes("api.maptiler.com")) tiles.push({ url, at: Date.now(), status: response.status() });
  });

  const started = Date.now();
  await page.goto(`http://127.0.0.1:${port}/${FILE}`, { waitUntil: "load", timeout: 60000 });

  // The live layer publishes its own readiness onto the visual: `data-live-warm` is
  // "<cameras>:<ms>". Waiting on it rather than on a sleep is what makes the number below the warm's
  // own cost rather than an arbitrary pause.
  await page.waitForFunction(
    () => document.querySelector('[data-visual="danube-route"]')?.dataset.liveWarm !== undefined,
    { timeout: 90000 },
  );
  const boot = Date.now() - started;
  const warmField = await page.evaluate(
    () => document.querySelector('[data-visual="danube-route"]').dataset.liveWarm,
  );
  const afterWarm = tiles.length;

  const canvases = await page.evaluate(() => document.querySelectorAll("canvas").length);
  const hasLib = await page.evaluate(() => typeof window.maplibregl !== "undefined");
  const liveView = await page.evaluate(
    () => document.querySelector('[data-visual="danube-route"]').dataset.liveView ?? null,
  );
  // THE CAMERA HAS NO CONTROLS, asserted on the live DOM rather than trusted to a constructor
  // option: `interactive: false` is what the owner asked for, and a `NavigationControl` added later
  // by a well-meaning edit would leave exactly this trace.
  const controls = await page.evaluate(
    () => document.querySelectorAll(".maplibregl-ctrl button, .maplibregl-ctrl-group").length,
  );

  await page.evaluate(PORT);

  const runs = [];
  for (const speed of SPEEDS) {
    const before = tiles.length;
    // Back to the top, settled, so every speed starts from the same place.
    await page.evaluate(() => {
      window.__port.scrollTop = 0;
    });
    await new Promise((r) => setTimeout(r, 1200));
    const baseline = tiles.length;

    // THE SCRUB: one step per animation frame, no settle wait — a reader's thumb, not a probe's
    // teleport. At each frame we ask MapLibre whether every tile the CURRENT camera needs has
    // arrived, which is the honest form of "did the reader see grey".
    const samples = await page.evaluate(async (px) => {
      const out = [];
      const port = window.__port;
      const distance = port.scrollHeight - port.clientHeight;
      const map = window.__dsMap;
      for (let y = 0; y <= distance; y += px) {
        port.scrollTop = y;
        await new Promise((r) => requestAnimationFrame(r));
        const root = document.querySelector('[data-visual="danube-route"]');
        out.push({
          y,
          loaded: map ? map.areTilesLoaded() : null,
          state: root.dataset.state ?? null,
          progress: Number(document.querySelector(".scrolly")?.getAttribute("data-progress") ?? NaN),
        });
      }
      return out;
    }, speed);

    // How long after the flick until the map is quiet again — the "how bad is it when it does not
    // keep up" number, which matters more than the frame count.
    const settleStart = Date.now();
    await page
      .waitForFunction(() => window.__dsMap && window.__dsMap.areTilesLoaded(), { timeout: 20000 })
      .catch(() => {});
    const settleMs = Date.now() - settleStart;

    runs.push({
      speed,
      frames: samples.length,
      framesWithMissingTiles: samples.filter((s) => s.loaded === false).length,
      progressSpan: [samples[0]?.progress, samples[samples.length - 1]?.progress],
      newRequests: tiles.length - baseline,
      requestsBeforeScrub: baseline - before,
      settleMs,
    });
  }

  // One settled shot per step, plus a MID-FLIGHT one, because a settled reveal never shows what a
  // moving one does.
  const label = `${size.width}x${size.height}-${warm ? "warm" : "cold"}`;
  const shots = [];
  for (const at of [0, 1, 2, 3, 1.5]) {
    await page.evaluate((fraction) => {
      const port = window.__port;
      port.scrollTop = Math.round((port.scrollHeight - port.clientHeight) * fraction);
    }, at / 3);
    await new Promise((r) => setTimeout(r, 1500));
    const path = join(tmpdir(), `danube-live-${label}-${String(at).replace(".", "_")}.png`);
    await page.screenshot({ path });
    shots.push(path);
  }

  await browser.close();
  server.close();
  rmSync(dir, { recursive: true, force: true });

  return {
    size: `${size.width}x${size.height}`,
    warm,
    boot,
    warmField,
    canvases,
    hasLib,
    controls,
    liveView,
    tileRequests: tiles.length,
    afterWarm,
    runs,
    shots,
  };
}

const argv = process.argv.slice(2);
const warm = !argv.includes("--no-warm");
const at = argv.indexOf("--size");
const [width, height] = (at >= 0 ? argv[at + 1] : "1600x900").split("x").map(Number);
const result = await run({ warm, size: { width, height } });
console.log(JSON.stringify(result, null, 2));
