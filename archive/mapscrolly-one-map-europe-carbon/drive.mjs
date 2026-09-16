// DRIVE THE DELIVERED FILE IN A REAL BROWSER, ON A CONTINUOUS SCROLL, IN BOTH DIRECTIONS.
//
// A DUPLICATE of the sibling one-chart beat's harness, not an import — a beat directory stays
// copy-pasteable on its own. What differs is what it reads off the visual: this one records the
// CAMERA (centre, span, scale, and how many raster pixels of the baked plate land on each delivered
// pixel) rather than a chart's domains, because "the camera is in the wrong place" and "the plate is
// being magnified past its own resolution" are the two ways this beat can be wrong without any
// screenshot looking obviously broken.
//
// Why this is not the usual sampled probe. The previous round of scrolly beats sampled 25 discrete
// scroll positions at three widths and reported 25/25 correct — and the owner, reading the same
// files, saw frames arriving at the wrong moment. A probe that jumps to a position, waits, and asks
// the DOM what it thinks, measures the SETTLED state and never the transition; a reader only ever
// sees the transition. So this run scrolls in small increments with no settle wait, records what is
// actually painted at every increment, and then goes back UP — which is where a step machine built
// out of enter/exit events usually breaks, because "entered from below" and "entered from above"
// are different events and only one of them is normally wired.
//
// What it records at every increment: the scaffold's own published progress, the driven position,
// the driven state (published by the driver onto the element, because a screenshot proves a frame
// exists and never proves where the camera was pointing), WHICH STEP IS PAINTED, a fingerprint of
// everything the driver actually wrote into the DOM, and the bounding boxes of everything the frame
// annotates against the VISIBLE part of every prose panel.
//
// THE FINGERPRINT IS THIS ROUND'S ADDITION, and it is the assertion whose absence let a slideshow
// ship. Every guard here used to be about ARRIVAL — the right camera, the right panel, no collision
// — and every one of them is satisfied by a camera that jumps between four positions, because they
// only ever look at a settled state. Two fingerprints are taken: `paintMoving` over everything
// positional the driver writes (the camera's transform, each label's offset, the leader path) and
// `paintAll` over that plus every opacity. `scroll-report.mjs`'s `fluidity` then asks the question
// nothing here used to ask: on the frames where the ACTIVE STEP does not change, does the picture?
//
// Usage:  bun proof/mapscrolly-one-map-europe-carbon/drive.mjs

import { createServer } from "node:http";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, extname, join } from "node:path";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer";
import { report } from "./scroll-report.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const FILE = "one-map-four-readings.html";
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
  const root = document.querySelector('[data-visual="one-map"]');
  const scrolly = document.querySelector(".scrolly");
  const column = document.querySelector(".scrolly-steps");
  const panels = Array.from(document.querySelectorAll("[data-step]")).filter(
    (el) => el.querySelector("p") && !el.querySelector("[data-step]"),
  );
  const activeFrame = document.querySelector(".step-frame.active");
  const stepIds = Array.from(document.querySelectorAll(".step")).map((el) => el.getAttribute("data-step"));

  // THE TWO FINGERPRINTS. `moving` is everything the driver writes that has a POSITION: the
  // camera's own transform (the whole flight, in one string), every label's offset, and the leader
  // path. `alpha` is every opacity it writes — the veil and the three highlight groups. A step that
  // only cross-faded would move the second and not the first, and `scroll-report.mjs` reports that
  // gap rather than counting it as motion.
  const moving = [];
  const alpha = [];
  const put = (el, keys) => {
    if (!el) return;
    const style = getComputedStyle(el);
    alpha.push(style.opacity);
    for (const key of keys) moving.push(el.getAttribute(key) ?? style[key] ?? "");
  };
  put(root.querySelector("[data-part=camera]"), ["transform"]);
  put(root.querySelector("[data-part=veil]"), []);
  for (const key of ["A", "B", "C"]) put(root.querySelector(`[data-hi=${key}]`), []);
  for (const el of root.querySelectorAll("[data-label]")) put(el, ["left", "top"]);
  put(root.querySelector("[data-part=leaders]"), ["d"]);

  const marked = Array.from(root.querySelectorAll("[data-label],[data-part=credit]"))
    .map((el) => ({
      what: el.dataset.label !== undefined ? `label ${el.dataset.label}` : el.dataset.part,
      opacity: Number(getComputedStyle(el).opacity),
      box: el.getBoundingClientRect(),
      text: el.textContent,
    }))
    .filter((m) => m.opacity > 0.05 && m.box.width > 0);
  const graphic = root.parentElement ? root.parentElement.getBoundingClientRect() : null;
  const port = window.__port ?? document.scrollingElement;
  const portBox = port.getBoundingClientRect ? port.getBoundingClientRect() : { height: window.innerHeight };
  const panelFraction = Math.max(...panels.map((p) => p.getBoundingClientRect().height)) / portBox.height;
  // The VISIBLE part of each panel — its own rect clipped by the column that clips it on screen.
  // A panel scrolled out of the top of that column keeps reporting a rect over the graphic; testing
  // THAT against the map's labels invents a collision the box model already made impossible.
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
    // purpose: they must now be the same number, and their disagreement is the whole of the defect
    // this round repairs.
    progress: Number(scrolly?.dataset.progress ?? "NaN"),
    position: Number(root.dataset.position ?? "NaN"),
    activeStep,
    activeIndex: activeStep === null ? Number.NaN : stepIds.indexOf(activeStep),
    state: JSON.parse(root.dataset.state ?? "null"),
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
    // `scrollTo` with no behaviour, then ONE animation frame: the driver runs on `scroll`, so this
    // is exactly the state a reader's next painted frame would carry. No settle wait — a settle
    // wait is what turns a transition into a snapshot of the destination.
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
  const browser = await puppeteer.launch({ headless: true, executablePath: resolveChrome(), args: ["--no-sandbox", "--hide-scrollbars"] });
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

    // One screenshot per step, at the sampled offset CLOSEST to that reading. A window of ±0.02 was
    // the old rule and it does not survive a continuous signal: progress moves about 0.032 per 30px
    // increment, so whether any sample lands inside a window that narrow is luck.
    const settles = [0, 1, 2, 3].map((k) =>
      down.reduce((best, s) => (Math.abs(s.progress - k) < Math.abs(best.progress - k) ? s : best), down[0]).scrollY,
    );
    for (let k = 0; k < settles.length; k++) {
      if (settles[k] === null) continue;
      // A settle wait HERE only — the sweeps above deliberately have none. The panel's own fade is
      // a 0.3s CSS transition the scaffold owns; a screenshot taken one frame after the scroll
      // catches it half-painted and says nothing about the frame a reader sits on.
      await page.evaluate((y) => { (window.__port ?? document.scrollingElement).scrollTop = y; return new Promise((r) => setTimeout(r, 450)); }, settles[k]);
      await page.screenshot({ path: join(SHOT_DIR, `${size.name}-step-${k + 1}.png`) });
    }
    // And one mid-flight, halfway through the axis flight of the last step — the moment a sampled
    // probe never looks at.
    const flight = down.find((s) => s.progress > 2.4 && s.progress < 2.6);
    if (flight) {
      await page.evaluate((y) => { (window.__port ?? document.scrollingElement).scrollTop = y; return new Promise((r) => requestAnimationFrame(() => r())); }, flight.scrollY);
      await page.screenshot({ path: join(SHOT_DIR, `${size.name}-midflight.png`) });
    }
    await page.close();
  }

  // Reduced motion: the step must still ARRIVE, without the flight.
  const rm = await browser.newPage();
  await rm.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "reduce" }]);
  await rm.setViewport({ width: 1600, height: 900 });
  await rm.goto(url, { waitUntil: "load" });
  const rmSamples = await sweep(rm, "down");
  const rmStates = new Set(rmSamples.map((s) => JSON.stringify(s.state)));
  const discrete = rmStates.size <= 4;
  await rm.screenshot({ path: join(SHOT_DIR, "reduced-motion-end.png") });
  await rm.close();

  // JavaScript off: the SSR'd first reading and every step's prose survive.
  const nojs = await browser.newPage();
  await nojs.setJavaScriptEnabled(false);
  await nojs.setViewport({ width: 1600, height: 900 });
  await nojs.goto(url, { waitUntil: "load" });
  const nojsFacts = await nojs.evaluate(() => {
    const root = document.querySelector('[data-visual="one-map"]');
    if (!root) return { visual: false };
    return {
      visual: true,
      shapes: document.querySelectorAll("[data-shape]").length,
      plateIsInlineData: (document.querySelector("[data-part=camera] img")?.getAttribute("src") ?? "").startsWith("data:image/png;base64,"),
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
      discrete,
    },
    // THE PLATE'S BUDGET, over every frame actually driven rather than over the four authored
    // cameras. It used to read `Math.min(...[].concat(...[]))`, which is `Infinity` and serialises
    // as `null` — a field that reported nothing while looking like a measurement. It matters
    // continuously now: between two readings the camera passes through scales no authored state
    // has, and the deepest one on the whole path is what a reader's eye actually meets.
    camera: (() => {
      const states = driven.map((s) => s.state).filter(Boolean);
      const perPixel = states.map((s) => s.rasterPerPixel).filter(Number.isFinite);
      return {
        framesMeasured: perPixel.length,
        worstRasterPerPixel: perPixel.length ? Number(Math.min(...perPixel).toFixed(3)) : null,
        clampedFrames: states.filter((s) => s.clamped === 1).length,
      };
    })(),
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
