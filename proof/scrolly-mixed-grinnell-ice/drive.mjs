// DRIVE THE DELIVERED FILE IN A REAL BROWSER, ON A CONTINUOUS SCROLL, IN BOTH DIRECTIONS.
//
// Why this is not the usual sampled probe: a probe that jumps to a position, waits, and asks the DOM
// what it thinks measures the SETTLED state, and a reader only ever sees the transition. Five rounds
// of this genre passed exactly that way while the owner watched frames arrive at the wrong moment.
// So this run scrolls in small increments with NO settle wait, records what is actually painted at
// every increment, and then goes back UP — the direction a step machine built out of enter/exit
// events usually breaks in, because only one of those two events is normally wired.
//
// WHAT THIS COPY ADDS TO THE TWO SINGLE-VISUAL BEATS' HARNESS, and it is the reason a mixed beat
// needs its own: **the fingerprint only covers layers that are actually painted.** A composition with
// three layers can move an INVISIBLE camera and satisfy any fluidity measurement taken over the whole
// element — the picture would not have changed at all and every number would look perfect. So each
// layer's own computed opacity is read first and a layer at ~0 contributes nothing to either
// fingerprint. It is the same discipline as measuring the VISIBLE part of a prose panel rather than
// its rect: the guard has to look at what a reader can see.
//
// Usage:  bun proof/scrolly-mixed-grinnell-ice/drive.mjs

import { createServer } from "node:http";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, extname, join } from "node:path";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer";
import { report } from "./scroll-report.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const FILE = "three-media-one-glacier.html";
const STEP_COUNT = 7;
const MEDIA = ["photo", "map", "chart"];
const RENDER_DIR = join(HERE, "render");
const SHOT_DIR = join(HERE, "drive");

const SIZES = [
  { name: "1600x900", width: 1600, height: 900 },
  { name: "1280x800", width: 1280, height: 800 },
  { name: "375x812", width: 375, height: 812 },
];

const STEP_PX = 30;

/** The two moments a medium hands over to the next — the frames a sampled probe never looks at, and
 *  the ones the owner's *"c'est une sorte de mix de tout"* is actually about. */
const HANDOVERS = [1.5, 3.5];

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

/** The element the prose actually scrolls inside. Under the scaffold's fixed-page model the DOCUMENT
 *  has no scroll distance at all, so a harness that drives `window.scrollTo` drives nothing and
 *  reports a perfectly still page as perfectly correct. Found by measurement. */
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
  // djb2. A fingerprint has to be one number per frame or the report is bigger than the artifact:
  // the base polyline alone is 68 points and the sweeps take hundreds of frames.
  const digest = (text) => {
    let h = 5381;
    for (let i = 0; i < text.length; i++) h = ((h * 33) ^ text.charCodeAt(i)) >>> 0;
    return h;
  };
  const root = document.querySelector('[data-visual="mixed"]');
  const scrolly = document.querySelector(".scrolly");
  const column = document.querySelector(".scrolly-steps");
  const panels = Array.from(document.querySelectorAll("[data-step]")).filter(
    (el) => el.querySelector("p") && !el.querySelector("[data-step]"),
  );
  const activeFrame = document.querySelector(".step-frame.active");
  const stepIds = Array.from(document.querySelectorAll(".step")).map((el) => el.getAttribute("data-step"));

  const layers = {};
  for (const name of ["photo", "map", "chart"]) {
    const node = root.querySelector(`[data-layer="${name}"]`);
    layers[name] = { node, opacity: node ? Number(getComputedStyle(node).opacity) : 0 };
  }
  const presences = Object.fromEntries(Object.entries(layers).map(([k, v]) => [k, v.opacity]));
  const painted = Object.entries(layers).filter(([, v]) => v.opacity > 0.02);

  // THE TWO FINGERPRINTS, TAKEN OVER WHAT A READER CAN SEE. `moving` is everything POSITIONAL the
  // driver writes into a PAINTED layer; `alpha` is every opacity it writes there. A layer at zero
  // contributes nothing to either, so an invisible camera flying cannot make a frozen picture look
  // fluid.
  const moving = [];
  const alpha = [];
  const put = (el, keys) => {
    if (!el) return;
    const style = getComputedStyle(el);
    alpha.push(style.opacity);
    for (const key of keys) moving.push(el.getAttribute(key) ?? style[key] ?? "");
  };
  for (const [name, layer] of painted) {
    alpha.push(String(layer.opacity));
    if (name === "photo") {
      put(layer.node.querySelector("[data-part=photo-box]"), ["left", "top", "width", "height"]);
      put(layer.node.querySelector("[data-part=rail-cursor]"), ["left"]);
      const year = layer.node.querySelector("[data-part=year]");
      if (year) moving.push(year.textContent);
      for (const el of layer.node.querySelectorAll("[data-photo]")) put(el, []);
    }
    if (name === "map") {
      put(layer.node.querySelector("[data-part=camera]"), ["transform"]);
      for (const el of layer.node.querySelectorAll("[data-marker]")) put(el, ["left", "top"]);
      for (const el of layer.node.querySelectorAll("[data-label]")) put(el, ["left", "top"]);
      put(layer.node.querySelector("[data-part=leaders]"), ["d"]);
      put(layer.node.querySelector("[data-part=scale-rule]"), ["width"]);
      const scale = layer.node.querySelector("[data-part=scale-text]");
      if (scale) moving.push(scale.textContent);
    }
    if (name === "chart") {
      put(layer.node.querySelector("[data-part=base]"), ["points"]);
      put(layer.node.querySelector("[data-part=highlight]"), ["points"]);
      for (const el of layer.node.querySelectorAll("[data-mark]")) put(el, ["left", "top"]);
      for (const el of layer.node.querySelectorAll("[data-annotation]")) put(el, ["left", "top"]);
      for (const el of layer.node.querySelectorAll("[data-ytick]")) {
        put(el, ["top"]);
        moving.push(el.textContent);
      }
      for (const el of layer.node.querySelectorAll("[data-xtick]")) {
        put(el, ["left"]);
        moving.push(el.textContent);
      }
      for (const el of layer.node.querySelectorAll("[data-ygrid]")) put(el, ["y1"]);
    }
  }
  const credit = root.querySelector("[data-part=credit]");
  if (credit) moving.push(credit.textContent);

  // Everything a reader is meant to READ, with its EFFECTIVE opacity — its own times its layer's.
  const marked = [];
  const collect = (el, what, layerOpacity) => {
    const opacity = Number(getComputedStyle(el).opacity) * layerOpacity;
    const box = el.getBoundingClientRect();
    if (opacity > 0.05 && box.width > 0 && box.height > 0)
      marked.push({ what, text: el.textContent, box: box.toJSON() });
  };
  for (const [name, layer] of painted) {
    if (name === "photo") {
      const year = layer.node.querySelector("[data-part=year]");
      if (year) collect(year, "year", layer.opacity);
    }
    if (name === "map") {
      for (const el of layer.node.querySelectorAll("[data-label]")) collect(el, `label ${el.dataset.label}`, layer.opacity);
      const scale = layer.node.querySelector("[data-part=scale-text]");
      if (scale) collect(scale, "scale", layer.opacity);
    }
    if (name === "chart") {
      for (const el of layer.node.querySelectorAll("[data-annotation]"))
        collect(el, `annotation ${el.dataset.annotation}`, layer.opacity);
      for (const el of layer.node.querySelectorAll("[data-ytick]")) collect(el, `ytick ${el.dataset.ytick}`, layer.opacity);
      for (const el of layer.node.querySelectorAll("[data-xtick]")) collect(el, `xtick ${el.dataset.xtick}`, layer.opacity);
    }
  }
  if (credit) collect(credit, "credit", 1);

  const graphic = root.parentElement ? root.parentElement.getBoundingClientRect() : null;
  const port = window.__port ?? document.scrollingElement;
  const portBox = port.getBoundingClientRect ? port.getBoundingClientRect() : { height: window.innerHeight };
  const panelFraction = Math.max(...panels.map((p) => p.getBoundingClientRect().height)) / portBox.height;
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
  const state = JSON.parse(root.dataset.state ?? "null");
  return {
    panelFraction,
    portHeight: portBox.height,
    scrollY: port.scrollTop,
    pageScrolls: document.documentElement.scrollHeight > window.innerHeight + 1,
    innerWidth: window.innerWidth,
    innerHeight: window.innerHeight,
    horizontal: document.documentElement.scrollWidth > window.innerWidth + 1,
    progress: Number(scrolly?.dataset.progress ?? "NaN"),
    position: Number(root.dataset.position ?? "NaN"),
    activeStep,
    activeIndex: activeStep === null ? Number.NaN : stepIds.indexOf(activeStep),
    state,
    medium: state ? state.medium : null,
    presences,
    handover: painted.length > 1,
    // A medium whose presence has LEFT zero but not yet reached the 2% a reader can see. Recorded so
    // `scroll-report.mjs` can tell the frames at the very edge of a handover — where `ease` has a
    // near-zero derivative and the outgoing medium is still on its own last authored state — from a
    // medium that merely cross-fades in the middle of its own step, which is a real defect.
    arriving: Object.values(presences).some((v) => v > 0 && v <= 0.02),
    canvases: root.querySelectorAll("canvas").length,
    liveView: root.dataset.liveView ?? null,
    liveWarm: root.dataset.liveWarm ?? null,
    liveError: root.dataset.liveError ?? null,
    paintMoving: digest(moving.join("|")),
    paintAll: digest(moving.join("|") + "#" + alpha.join("|")),
    panelVisibleBoxes,
    marked,
    graphic: graphic ? graphic.toJSON() : null,
    column: columnBox.toJSON(),
  };
};

async function sweep(page, direction) {
  const samples = [];
  const max = await page.evaluate(PORT);
  const positions = [];
  if (direction === "down") for (let y = 0; y <= max; y += STEP_PX) positions.push(y);
  else for (let y = max; y >= 0; y -= STEP_PX) positions.push(y);
  for (const y of positions) {
    // `scrollTo` with no behaviour, then ONE animation frame: the driver runs on `scroll`, so this is
    // exactly the state a reader's next painted frame would carry. No settle wait — a settle wait is
    // what turns a transition into a snapshot of the destination.
    await page.evaluate((to) => {
      (window.__port ?? document.scrollingElement).scrollTop = to;
      return new Promise((r) => requestAnimationFrame(() => r()));
    }, y);
    samples.push(await page.evaluate(SNAPSHOT));
  }
  return samples;
}

async function shootAt(page, samples, target, path) {
  const at = samples.reduce((best, s) => (Math.abs(s.progress - target) < Math.abs(best.progress - target) ? s : best), samples[0]);
  await page.evaluate((y) => {
    (window.__port ?? document.scrollingElement).scrollTop = y;
    return new Promise((r) => setTimeout(r, 450));
  }, at.scrollY);
  await page.screenshot({ path });
  return at;
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

  for (const size of SIZES) {
    const page = await browser.newPage();
    await page.setViewport({ width: size.width, height: size.height });
    await page.goto(url, { waitUntil: "load" });

    const down = await sweep(page, "down");
    const up = await sweep(page, "up");
    results.push(report(`${size.name} down`, down, STEP_COUNT, MEDIA));
    results.push(report(`${size.name} up`, up, STEP_COUNT, MEDIA));

    for (let k = 0; k < STEP_COUNT; k++)
      await shootAt(page, down, k, join(SHOT_DIR, `${size.name}-step-${k + 1}.png`));
    // The two HANDOVERS, which is where this beat is different from its two siblings and where a
    // sampled probe never looks.
    for (const h of HANDOVERS)
      await shootAt(page, down, h, join(SHOT_DIR, `${size.name}-handover-${String(h).replace(".", "-")}.png`));
    await page.close();
  }

  // Reduced motion: every reading must still ARRIVE, without the flight or the dissolve.
  const rm = await browser.newPage();
  await rm.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "reduce" }]);
  await rm.setViewport({ width: 1600, height: 900 });
  await rm.goto(url, { waitUntil: "load" });
  const rmSamples = await sweep(rm, "down");
  const rmStates = new Set(rmSamples.map((s) => JSON.stringify(s.state)));
  const rmBlends = rmSamples.filter((s) => Object.values(s.presences).filter((v) => v > 0.02 && v < 0.98).length > 0).length;
  await rm.screenshot({ path: join(SHOT_DIR, "reduced-motion-end.png") });
  await rm.close();

  // JavaScript off: the SSR'd first reading and every step's prose survive.
  const nojs = await browser.newPage();
  await nojs.setJavaScriptEnabled(false);
  await nojs.setViewport({ width: 1600, height: 900 });
  await nojs.goto(url, { waitUntil: "load" });
  const nojsFacts = await nojs.evaluate(() => {
    const root = document.querySelector('[data-visual="mixed"]');
    return {
      visual: !!root,
      photographs: root.querySelectorAll("[data-photo]").length,
      firstPhotoOpacity: Number(getComputedStyle(root.querySelector('[data-photo="0"]')).opacity),
      photoLayerOpacity: Number(getComputedStyle(root.querySelector('[data-layer="photo"]')).opacity),
      mapLayerOpacity: Number(getComputedStyle(root.querySelector('[data-layer="map"]')).opacity),
      chartLayerOpacity: Number(getComputedStyle(root.querySelector('[data-layer="chart"]')).opacity),
      linePoints: (root.querySelector("[data-part=base]")?.getAttribute("points") ?? "").split(" ").length,
      shapes: root.querySelectorAll("[data-shape]").length,
      paragraphs: document.querySelectorAll(".scrolly-steps p, [data-step] p").length,
      credit: root.querySelector("[data-part=credit]")?.textContent ?? null,
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
      everySampleIsOneOfTheSevenStates: rmStates.size <= STEP_COUNT,
      framesWithABlendedLayer: rmBlends,
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
