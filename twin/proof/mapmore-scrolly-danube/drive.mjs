// DRIVE THE DELIVERED FILE IN A REAL BROWSER, ON A CONTINUOUS SCROLL, IN BOTH DIRECTIONS.
//
// A DUPLICATE of the sibling one-map beat's harness, not an import — a beat directory stays
// copy-pasteable on its own. What differs is what it reads off the visual: this beat's camera never
// moves, so the thing that can be wrong here is the REVEAL. It records the published reveal state
// (how far along the route the line has been drawn, the contain-fit scale, and how many raster
// pixels of the baked FALLBACK plate land on each delivered pixel) rather than a flying camera.
//
// Why this is not the usual sampled probe. An earlier round of scrolly beats sampled 25 discrete
// scroll positions at three widths and reported 25/25 correct — and the owner, reading the same
// files, saw frames arriving at the wrong moment. A probe that jumps to a position, waits, and asks
// the DOM what it thinks, measures the SETTLED state and never the transition; a reader only ever
// sees the transition. So this run scrolls in small increments with no settle wait, records what is
// actually painted at every increment, and then goes back UP — which is where a step machine built
// out of enter/exit events usually breaks, because "entered from below" and "entered from above"
// are different events and only one of them is normally wired.
//
// Usage:  bun proof/mapmore-scrolly-danube/drive.mjs

import { createServer } from "node:http";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, extname, join } from "node:path";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer";
import { report } from "./scroll-report.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const FILE = "danube-scrolly.html";
const STEP_COUNT = 4;
const RENDER_DIR = join(HERE, "render");
const SHOT_DIR = join(HERE, "drive");

const SIZES = [
  { name: "1600x900", width: 1600, height: 900 },
  { name: "1280x800", width: 1280, height: 800 },
  { name: "375x812", width: 375, height: 812 },
];

const STEP_PX = 30;

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

/** The element the prose actually scrolls inside. Under the scaffold's fixed-page model the
 *  DOCUMENT has no scroll distance at all, so a harness that drives `window.scrollTo` drives
 *  nothing and reports a perfectly still page as perfectly correct. Found by measurement. */
const PORT = () => {
  let best = null;
  for (const el of document.querySelectorAll("*")) {
    const overflow = getComputedStyle(el).overflowY;
    if (overflow !== "auto" && overflow !== "scroll") continue;
    const distance = el.scrollHeight - el.clientHeight;
    if (distance > 1 && (!best || distance > best.distance)) best = { el, distance };
  }
  window.__port = best ? best.el : document.scrollingElement;
  return best ? best.distance : document.documentElement.scrollHeight - window.innerHeight;
};

/** Everything the page can tell us about this instant, read in one round trip. */
const SNAPSHOT = () => {
  // djb2. A fingerprint has to be one number per frame or the report is bigger than the artifact.
  const digest = (text) => {
    let h = 5381;
    for (let i = 0; i < text.length; i++) h = ((h * 33) ^ text.charCodeAt(i)) >>> 0;
    return h;
  };
  const root = document.querySelector('[data-visual="danube-route"]');
  const scrolly = document.querySelector(".scrolly");
  const column = document.querySelector(".scrolly-steps");
  const panels = Array.from(document.querySelectorAll("[data-step]")).filter(
    (el) => el.querySelector("p") && !el.querySelector("[data-step]"),
  );
  const activeFrame = document.querySelector(".step-frame.active");
  const stepIds = Array.from(document.querySelectorAll(".step")).map((el) => el.getAttribute("data-step"));

  // THE TWO FINGERPRINTS. `moving` is everything the driver writes that has a POSITION: the camera
  // transform (which for this beat only changes on a resize, and is recorded so that stillness is a
  // measurement rather than an assumption), the route's own dash offset — the growing line, which is
  // the whole of what this beat animates — every badge's offset, and the leader path. `alpha` is
  // every opacity it writes: the nine territories and the nine badges. A reveal that only
  // cross-faded would move the second and not the first, and `scroll-report.mjs`'s `fluidity`
  // reports that gap rather than counting it as motion.
  const moving = [];
  const alpha = [];
  const put = (el, keys) => {
    if (!el) return;
    const style = getComputedStyle(el);
    alpha.push(style.opacity);
    for (const key of keys) moving.push(el.getAttribute(key) ?? style[key] ?? "");
  };
  put(root.querySelector("[data-part=camera]"), ["transform"]);
  for (const el of root.querySelectorAll("[data-territory]")) put(el, []);
  for (const el of root.querySelectorAll("[data-badge]")) put(el, ["left", "top"]);
  put(root.querySelector("[data-part=leaders]"), ["d"]);
  // THE GROWING LINE, and it is read off the COMPUTED style rather than with `getAttribute`. The
  // driver writes `strokeDashoffset` as an inline style, so `getAttribute("stroke-dashoffset")`
  // returns null and the `?? style[key] ?? ""` chain above would fingerprint an empty string on
  // every frame — i.e. report a river growing across the continent as frozen. The one measurement
  // this beat exists to make, taken the one way that can see it.
  for (const el of root.querySelectorAll("[data-part=route]")) {
    alpha.push(getComputedStyle(el).opacity);
    moving.push(getComputedStyle(el).strokeDashoffset);
  }

  const marked = Array.from(root.querySelectorAll("[data-badge],[data-part=credit]"))
    .map((el) => ({
      what: el.dataset.badge !== undefined ? `badge ${el.dataset.badge}` : el.dataset.part,
      opacity: Number(getComputedStyle(el).opacity),
      box: el.getBoundingClientRect(),
      text: el.textContent,
    }))
    .filter((m) => m.opacity > 0.05 && m.box.width > 0);
  const graphic = root.parentElement ? root.parentElement.getBoundingClientRect() : null;
  const port = window.__port ?? document.scrollingElement;
  const portBox = port.getBoundingClientRect ? port.getBoundingClientRect() : { height: window.innerHeight };
  const panelFraction = Math.max(...panels.map((p) => p.getBoundingClientRect().height)) / portBox.height;
  // The VISIBLE part of each panel — its own rect clipped by the column that clips it on screen. A
  // panel scrolled out of the top of that column keeps reporting a rect over the graphic; testing
  // THAT against the map's badges invents a collision the box model already made impossible.
  const columnBox = column.getBoundingClientRect();
  const panelVisibleBoxes = panels
    .map((p) => {
      const r = p.getBoundingClientRect();
      const left = Math.max(r.left, columnBox.left);
      const right = Math.min(r.right, columnBox.right);
      const top = Math.max(r.top, columnBox.top);
      const bottom = Math.min(r.bottom, columnBox.bottom);
      return right > left && bottom > top ? { left, right, top, bottom } : null;
    })
    .filter(Boolean);
  const activeStep = activeFrame ? activeFrame.getAttribute("data-step") : null;
  return {
    panelFraction,
    portHeight: portBox.height,
    scrollY: port.scrollTop,
    pageScrolls: document.documentElement.scrollHeight > window.innerHeight + 1,
    docHeight: document.documentElement.scrollHeight,
    innerWidth: window.innerWidth,
    innerHeight: window.innerHeight,
    horizontal: document.documentElement.scrollWidth > window.innerWidth + 1,
    // The scaffold's own published signal, and the beat's echo of it. Recorded separately on
    // purpose: they must be the same number, and their disagreement is a defect class that has
    // already shipped once on the sibling beat.
    progress: Number(scrolly?.dataset.progress ?? "NaN"),
    position: Number(root.dataset.position ?? "NaN"),
    activeStep,
    activeIndex: activeStep === null ? Number.NaN : stepIds.indexOf(activeStep),
    state: JSON.parse(root.dataset.state ?? "null"),
    // The live layer's own published facts. Under the committed placeholder these are undefined by
    // construction (`planIsUnkeyed` returns before a map is built) — which is what the fallback
    // being the plate MEANS, and it is recorded rather than assumed.
    liveWarm: root.dataset.liveWarm ?? null,
    liveView: root.dataset.liveView ?? null,
    liveError: root.dataset.liveError ?? null,
    canvases: document.querySelectorAll("canvas").length,
    paintMoving: digest(moving.join("|")),
    paintAll: digest(moving.join("|") + "#" + alpha.join("|")),
    panelVisibleBoxes,
    marked: marked.map((m) => ({ what: m.what, text: m.text, box: m.box.toJSON() })),
    graphic: graphic ? graphic.toJSON() : null,
    column: columnBox.toJSON(),
    rootBox: root.getBoundingClientRect().toJSON(),
    rootParentIsStack: root.parentElement ? root.parentElement.className : null,
  };
};

async function sweep(page, direction) {
  const samples = [];
  const max = await page.evaluate(PORT);
  const positions = [];
  if (direction === "down") for (let y = 0; y <= max; y += STEP_PX) positions.push(y);
  else for (let y = max; y >= 0; y -= STEP_PX) positions.push(y);
  for (const y of positions) {
    // `scrollTop`, then ONE animation frame: the driver runs on `scroll`, so this is exactly the
    // state a reader's next painted frame would carry. No settle wait — a settle wait is what turns
    // a transition into a snapshot of the destination.
    await page.evaluate((to) => {
      (window.__port ?? document.scrollingElement).scrollTop = to;
      return new Promise((r) => requestAnimationFrame(() => r()));
    }, y);
    samples.push(await page.evaluate(SNAPSHOT));
  }
  return samples;
}

async function main() {
  const { server, port } = await serve(RENDER_DIR);
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: resolveChrome(),
    args: ["--no-sandbox", "--hide-scrollbars"],
  });
  await mkdir(SHOT_DIR, { recursive: true });
  const url = `http://127.0.0.1:${port}/${FILE}`;
  const results = [];
  /** Every frame of every sweep, kept for the plate's resolution budget below. */
  const driven = [];

  for (const size of SIZES) {
    const page = await browser.newPage();
    await page.setViewport({ width: size.width, height: size.height });
    await page.goto(url, { waitUntil: "load" });

    const down = await sweep(page, "down");
    const up = await sweep(page, "up");
    driven.push(...down, ...up);
    results.push(report(`${size.name} down`, down, STEP_COUNT));
    results.push(report(`${size.name} up`, up, STEP_COUNT));

    // One screenshot per step, at the sampled offset CLOSEST to that step. A window of ±0.02 does
    // not survive a continuous signal: progress moves about 0.03 per 30px increment, so whether any
    // sample lands inside a window that narrow is luck.
    const settles = [0, 1, 2, 3].map((k) =>
      down.reduce((best, s) => (Math.abs(s.progress - k) < Math.abs(best.progress - k) ? s : best), down[0]).scrollY,
    );
    for (let k = 0; k < settles.length; k++) {
      if (settles[k] === null) continue;
      // A settle wait HERE only — the sweeps above deliberately have none. The panel's own fade is a
      // 0.3s CSS transition the scaffold owns; a screenshot taken one frame after the scroll catches
      // it half-painted and says nothing about the frame a reader sits on.
      await page.evaluate((y) => {
        (window.__port ?? document.scrollingElement).scrollTop = y;
        return new Promise((r) => setTimeout(r, 450));
      }, settles[k]);
      await page.screenshot({ path: join(SHOT_DIR, `${size.name}-step-${k + 1}.png`) });
    }
    // And two mid-flight, halfway through the first and the last reveal — the moments a sampled
    // probe never looks at, and the ones where a growing line looks different from a swapped one.
    for (const [name, lo, hi] of [
      ["midflight-1", 0.4, 0.6],
      ["midflight-3", 2.4, 2.6],
    ]) {
      const flight = down.find((s) => s.progress > lo && s.progress < hi);
      if (!flight) continue;
      await page.evaluate((y) => {
        (window.__port ?? document.scrollingElement).scrollTop = y;
        return new Promise((r) => requestAnimationFrame(() => r()));
      }, flight.scrollY);
      await page.screenshot({ path: join(SHOT_DIR, `${size.name}-${name}.png`) });
    }
    await page.close();
  }

  // Reduced motion: every step must still ARRIVE, without the growth between them.
  const rm = await browser.newPage();
  await rm.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "reduce" }]);
  await rm.setViewport({ width: 1600, height: 900 });
  await rm.goto(url, { waitUntil: "load" });
  const rmSamples = await sweep(rm, "down");
  const rmStates = new Set(rmSamples.map((s) => JSON.stringify(s.state)));
  await rm.screenshot({ path: join(SHOT_DIR, "reduced-motion-end.png") });
  await rm.close();

  // JavaScript off: the SSR'd opening state, the plate and every step's prose survive.
  const nojs = await browser.newPage();
  await nojs.setJavaScriptEnabled(false);
  await nojs.setViewport({ width: 1600, height: 900 });
  await nojs.goto(url, { waitUntil: "load" });
  const nojsFacts = await nojs.evaluate(() => {
    const root = document.querySelector('[data-visual="danube-route"]');
    if (!root) return { visual: false };
    return {
      visual: true,
      territories: document.querySelectorAll("[data-territory]").length,
      badgesVisible: Array.from(document.querySelectorAll("[data-badge]")).filter(
        (el) => Number(getComputedStyle(el).opacity) > 0.5,
      ).length,
      plateIsInlineData: (document.querySelector("[data-part=camera] img")?.getAttribute("src") ?? "").startsWith(
        "data:image/png;base64,",
      ),
      externalRequests: Array.from(document.querySelectorAll("img,script,link,iframe")).filter((el) => {
        const url = el.getAttribute("src") || el.getAttribute("href") || "";
        return url && !url.startsWith("data:") && !url.startsWith("#");
      }).length,
      paragraphs: document.querySelectorAll(".scrolly-steps p, [data-step] p").length,
      credit: document.querySelector("[data-part=credit]")?.textContent ?? null,
      visualVisible: Number(getComputedStyle(root.parentElement).opacity),
    };
  });
  await nojs.screenshot({ path: join(SHOT_DIR, "no-js.png") });
  await nojs.close();

  await browser.close();
  server.close();

  const summary = {
    file: join(RENDER_DIR, FILE),
    sweeps: results,
    reducedMotion: {
      samples: rmSamples.length,
      distinctStates: rmStates.size,
      everySampleIsOneOfTheFourStates: rmStates.size <= 4,
    },
    // THE FALLBACK PLATE'S BUDGET, over every frame actually driven. It only ever matters when the
    // live tiles are absent — which, on the committed file, is always, because the key is a
    // placeholder. Under 1.0 the plate is being magnified past its own raster.
    camera: (() => {
      const states = driven.map((s) => s.state).filter(Boolean);
      const perPixel = states.map((s) => s.rasterPerPixel).filter(Number.isFinite);
      return {
        framesMeasured: perPixel.length,
        worstRasterPerPixel: perPixel.length ? Number(Math.min(...perPixel).toFixed(3)) : null,
        clampedFrames: states.filter((s) => s.clamped === 1).length,
        scales: [...new Set(states.map((s) => s.scale))].sort((a, b) => a - b),
      };
    })(),
    // What the LIVE layer did on the committed artifact. Recorded rather than asserted: with the
    // placeholder in place there is no map and no canvas by construction, and this is the number
    // that says so out loud instead of letting a silent absence pass for a fallback.
    live: {
      canvases: [...new Set(driven.map((s) => s.canvases))],
      warm: [...new Set(driven.map((s) => s.liveWarm))],
      errors: [...new Set(driven.map((s) => s.liveError))],
    },
    noJs: nojsFacts,
  };
  await writeFile(join(SHOT_DIR, "drive-report.json"), JSON.stringify(summary, null, 2));
  console.log(JSON.stringify(summary, null, 2));
  const failing = results.filter((r) => r.problems.length > 0);
  // Exit non-zero rather than printing a wall of problems and reporting success — a run that says
  // "197 problems" and exits 0 is how a slideshow gets called a clean run in a commit message.
  if (failing.length > 0)
    throw new Error(
      `${failing.length} of ${results.length} sweeps have problems: ` +
        failing.map((r) => `${r.label} (${r.problems.length})`).join(", "),
    );
}

if (import.meta.main) await main();
