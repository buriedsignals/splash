// DRIVE THE LIVE MAP AND MEASURE WHETHER THE TILES KEEP UP WITH A READER'S THUMB.
//
// A DUPLICATE of `proof/mapscrolly-one-map-europe-carbon/verify-live-tiles.mjs`, adapted, never an
// import — a beat directory stays copy-pasteable on its own.
//
// This is the probe that answers the objection the baked plate was kept for, and on THIS beat it
// also answers a second question the carbon beat does not have to ask. `BRIEF.md` argued — honestly,
// and it is kept there marked overturned — that a delivered file with no request and no key is a
// file that still reads in ten years. The owner ruled that maps always use MapTiler. So the risk is
// engineered around (the camera's tiles are WARMED through MapLibre's own tile cache before the live
// layer is revealed, and the baked plate stays underneath as the fallback) and then MEASURED here.
//
// THE SECOND QUESTION IS REGISTRATION. This beat's camera never moves, so "can the tiles keep up"
// is nearly free — what can actually be wrong is that the live tiles and the 14,057 marks over them
// disagree about where the world is. The page publishes `data-fit-drift`, the worst disagreement in
// frame pixels between the camera `fitCamera` computed and the one the browser resolved
// `preserveAspectRatio` to; this reads it at every width and fails if it is ever over half a pixel.
//
// WHY IT IS NOT IN `bun test`. It needs a real key and a real network — the committed artifact
// carries the placeholder (R1b) and must never spend a newsroom's quota. It writes a KEYED COPY
// into a `mkdtemp` outside the tree, exactly as `map-web/scripts/verify-live-map.mjs` does, so
// the live probe cannot defeat the key guard. What IS in `bun test` is the assertion that the
// committed file contains the live layer at all — the guard `AUDIT-W5-W6-map.md` §5.6 found
// missing, where the whole of R1 could be deleted in silence.
//
// Usage:  bun proof/mapscrolly-quakes-three-ways/verify-live-tiles.mjs [--no-warm] [--world-copies]

import { createServer } from "node:http";
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { dirname, extname, join } from "node:path";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer";

const HERE = dirname(fileURLToPath(import.meta.url));
const FILE = "quakes-four-maps.html";
const RENDER_DIR = join(HERE, "render");
const PLACEHOLDER = "__MAPTILER" + "_KEY__";

/** Scrub speeds, in scrollport pixels per animation frame. 30 is a comfortable read; 400 is a
 *  trackpad flick that crosses the whole piece in a few frames — the case the plate was kept for. */
const SPEEDS = [30, 120, 400];
/** The three shapes this beat is verified at. The camera is the CONTAIN FIT of the plate into the
 *  graphic, so each one is a different zoom — and at the phone it is a NEGATIVE one, which is the
 *  case MapLibre's own default `minZoom: 0` would silently clamp. */
const SIZES = [
  { name: "1600x900", width: 1600, height: 900 },
  { name: "1280x800", width: 1280, height: 800 },
  { name: "375x812", width: 375, height: 812 },
];

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

/** The key, read from the SAME `.env` this beat's own plate was baked with (the twin root, two
 *  directories up). One home, and it is the sibling beats' own existing convention rather than a
 *  second path invented here. */
function readKey() {
  const env = join(HERE, "../../.env");
  if (!existsSync(env)) throw new Error(`no .env at ${env}: this probe needs a real MAPTILER_KEY`);
  const line = readFileSync(env, "utf8").split(/\r?\n/).find((l) => l.startsWith("MAPTILER_KEY="));
  if (!line) throw new Error(`no MAPTILER_KEY in ${env}`);
  return line.slice("MAPTILER_KEY=".length).trim();
}

/** The keyed page, written OUTSIDE the tree. The committed file keeps the placeholder. */
function keyedCopy(key, { warm, worldCopies }) {
  const dir = mkdtempSync(join(tmpdir(), "quakes-live-"));
  let html = readFileSync(join(RENDER_DIR, FILE), "utf8").replaceAll(PLACEHOLDER, key);
  // `--no-warm` is the CONTROL, not an option a beat ships: it turns the warm off so the same page
  // is measured with and without the mitigation, which is the only way the warm's own number means
  // anything. One boolean, because with a fixed camera the warm list is one position computed in
  // the browser — there is no literal array here to cut in half, which is the failure mode the
  // carbon beat's own copy of this function records.
  if (!warm) html = html.replace('"warm":true', '"warm":false');
  // `--world-copies` is the OTHER control, and it is what the beat's own decision was made against:
  // it puts MapLibre's default back so the repeat can be photographed rather than reasoned about.
  if (worldCopies) html = html.replace('"renderWorldCopies":false', '"renderWorldCopies":true');
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

/** The element the prose actually scrolls inside. Under the scaffold's fixed-page model the
 *  DOCUMENT has no scroll distance at all, so a probe that drives `window.scrollTo` drives nothing
 *  and reports a perfectly still page as perfectly correct. */
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

async function runSize(browser, url, size, { shotSuffix }) {
  const page = await browser.newPage();
  // One tile ledger per SIZE, wired to that size's own page: the camera is a different zoom at
  // every viewport, so a phone that inherited a desktop's request count would report a warm it
  // never paid for.
  const tiles = [];
  page.on("response", (response) => {
    const requestUrl = response.url();
    if (requestUrl.includes("api.maptiler.com"))
      tiles.push({ url: requestUrl, at: Date.now(), status: response.status() });
  });
  await page.setViewport({ width: size.width, height: size.height });
  const started = Date.now();
  await page.goto(url, { waitUntil: "load", timeout: 60000 });

  // The live layer publishes its own readiness onto the graphic: `data-live-warm` is
  // "<cameras>:<ms>". Waiting on it rather than on a sleep is what makes the number below the
  // warm's own cost rather than an arbitrary pause.
  await page.waitForFunction(
    () => document.querySelector(".scrolly-graphic")?.dataset.liveWarm !== undefined,
    { timeout: 90000 },
  );
  const boot = Date.now() - started;
  const published = await page.evaluate(() => {
    const g = document.querySelector(".scrolly-graphic");
    return {
      warm: g.dataset.liveWarm ?? null,
      view: g.dataset.liveView ?? null,
      fitDrift: g.dataset.fitDrift === undefined ? null : Number(g.dataset.fitDrift),
      error: g.dataset.liveError ?? null,
      canvases: document.querySelectorAll("canvas").length,
      hasLib: typeof window.maplibregl !== "undefined",
      liveIsUnderTheStack:
        document.querySelector("[data-part=live]")?.parentElement?.className ?? null,
      plateOpacity: Number(
        getComputedStyle(document.querySelector("[data-part=plate]")).opacity,
      ),
      // The owner's own test, asked of the reader's own screen rather than of the markup: is the
      // map ELEMENT the full width and height of the graphic?
      fills: (() => {
        const g = document.querySelector(".scrolly-graphic").getBoundingClientRect();
        const c = document.querySelector("canvas")?.getBoundingClientRect();
        if (!c) return null;
        return {
          width: Math.round(c.width - g.width),
          height: Math.round(c.height - g.height),
        };
      })(),
    };
  });
  const afterWarm = tiles.length;

  await page.evaluate(PORT);

  const runs = [];
  for (const speed of SPEEDS) {
    const before = tiles.length;
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
      const map = window.__qmMap;
      for (let y = 0; y <= distance; y += px) {
        port.scrollTop = y;
        await new Promise((r) => requestAnimationFrame(r));
        out.push({
          y,
          loaded: map ? map.areTilesLoaded() : null,
          step: document.querySelector(".step-frame.active")?.dataset.step ?? null,
        });
      }
      return out;
    }, speed);

    const settleStart = Date.now();
    await page
      .waitForFunction(() => window.__qmMap && window.__qmMap.areTilesLoaded(), { timeout: 20000 })
      .catch(() => {});
    const settleMs = Date.now() - settleStart;

    runs.push({
      speed,
      frames: samples.length,
      framesWithMissingTiles: samples.filter((s) => s.loaded === false).length,
      stepsSeen: [...new Set(samples.map((s) => s.step))],
      newRequests: tiles.length - baseline,
      requestsBeforeScrub: baseline - before,
      settleMs,
    });
  }

  // One settled shot per encoding — the four maps, over live tiles.
  const shots = [];
  for (let step = 0; step < 4; step++) {
    await page.evaluate((k) => {
      const port = window.__port;
      port.scrollTop = Math.round(((port.scrollHeight - port.clientHeight) * k) / 3);
    }, step);
    await new Promise((r) => setTimeout(r, 1200));
    const path = join(tmpdir(), `quakes-live-${size.name}-${shotSuffix}-step${step + 1}.png`);
    await page.screenshot({ path });
    shots.push(path);
  }

  await page.close();
  return {
    size: size.name,
    boot,
    ...published,
    tileRequestsAtWarm: afterWarm,
    tileRequestsTotal: tiles.length,
    runs,
    shots,
  };
}

async function run({ warm, worldCopies }) {
  const key = readKey();
  const dir = keyedCopy(key, { warm, worldCopies });
  const { server, port } = await serve(dir);
  const browser = await puppeteer.launch({ executablePath: resolveChrome(), args: ["--no-sandbox"] });
  const url = `http://127.0.0.1:${port}/${FILE}`;
  const suffix = `${warm ? "warm" : "cold"}${worldCopies ? "-worldcopies" : ""}`;

  const sizes = [];
  for (const size of SIZES) sizes.push(await runSize(browser, url, size, { shotSuffix: suffix }));

  await browser.close();
  server.close();
  rmSync(dir, { recursive: true, force: true });

  return { warm, worldCopies, sizes };
}

const warm = !process.argv.includes("--no-warm");
const worldCopies = process.argv.includes("--world-copies");
const result = await run({ warm, worldCopies });
console.log(JSON.stringify(result, null, 2));

const failures = [];
for (const size of result.sizes) {
  if (size.canvases < 1) failures.push(`${size.size}: no <canvas> in the live DOM`);
  if (size.fitDrift === null || size.fitDrift > 0.5)
    failures.push(`${size.size}: fit drift ${size.fitDrift} — the tiles and the marks disagree`);
  if (size.plateOpacity !== 0) failures.push(`${size.size}: the fallback plate is still painted over the live tiles`);
  if (size.fills && (size.fills.width < 0 || size.fills.height < 0))
    failures.push(`${size.size}: the map element does not fill the graphic (${JSON.stringify(size.fills)})`);
}
if (failures.length) throw new Error(failures.join("\n"));
