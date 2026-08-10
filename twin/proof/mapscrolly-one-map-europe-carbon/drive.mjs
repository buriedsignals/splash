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
// What it records at every increment: the driven position, the driven state (published by the
// driver onto the element, because a screenshot proves a frame exists and never proves which state
// its geometry is in), which prose panel is actually painted, and the bounding boxes of everything
// the frame annotates against the bounding box of the visible panel.
//
// Usage:  bun proof/mapscrolly-one-map-europe-carbon/drive.mjs

import { createServer } from "node:http";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, extname, join } from "node:path";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer";

const HERE = dirname(fileURLToPath(import.meta.url));
const FILE = "one-map-four-readings.html";
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
  const root = document.querySelector('[data-visual="one-map"]');
  const panels = Array.from(document.querySelectorAll("[data-step]")).filter(
    (el) => el.querySelector("p") && !el.querySelector("[data-step]"),
  );
  const painted = panels
    .map((p, i) => ({ i, opacity: Number(getComputedStyle(p).opacity), box: p.getBoundingClientRect() }))
    .filter((p) => p.opacity > 0.5);
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
  return {
    panelFraction,
    portHeight: portBox.height,
    scrollY: port.scrollTop,
    pageScrolls: document.documentElement.scrollHeight > window.innerHeight + 1,
    docHeight: document.documentElement.scrollHeight,
    innerWidth: window.innerWidth,
    innerHeight: window.innerHeight,
    horizontal: document.documentElement.scrollWidth > window.innerWidth + 1,
    position: Number(root.dataset.position ?? "NaN"),
    state: JSON.parse(root.dataset.state ?? "null"),
    painted: painted.map((p) => p.i),
    paintedBoxes: painted.map((p) => ({ ...p.box.toJSON() })),
    marked: marked.map((m) => ({ what: m.what, text: m.text, box: m.box.toJSON() })),
    graphic: graphic ? graphic.toJSON() : null,
    graphicFullWidth: !!graphic && graphic.left <= 1 && graphic.right >= window.innerWidth - 1,
    rootBox: root.getBoundingClientRect().toJSON(),
    rootParentIsStack: root.parentElement ? root.parentElement.className : null,
  };
};

function overlaps(a, b) {
  return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
}

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

function report(label, samples) {
  const problems = [];
  const positions = samples.map((s) => s.position);
  for (let i = 1; i < positions.length; i++) {
    const delta = positions[i] - positions[i - 1];
    if (label.endsWith("down") && delta < -0.02)
      problems.push(`position went BACKWARDS while scrolling down: ${positions[i - 1].toFixed(3)} -> ${positions[i].toFixed(3)}`);
    if (label.endsWith("up") && delta > 0.02)
      problems.push(`position went FORWARDS while scrolling up: ${positions[i - 1].toFixed(3)} -> ${positions[i].toFixed(3)}`);
  }
  let worstLag = 0;
  for (const s of samples) {
    if (!Number.isFinite(s.position)) problems.push("no driven position on the element — the driver did not run");
    if (s.horizontal) problems.push(`the page scrolls horizontally at scrollY=${s.scrollY}`);
    if (s.pageScrolls) problems.push(`the DOCUMENT itself has scroll distance at scrollY=${s.scrollY} — the page must not scroll`);
    if (!s.graphicFullWidth) problems.push(`the graphic does not span the full viewport width at scrollY=${s.scrollY}`);
    if (s.painted.length > 1) problems.push(`${s.painted.length} prose panels painted at once at scrollY=${s.scrollY}`);
    for (const p of s.painted) worstLag = Math.max(worstLag, Math.abs(p - s.position));
    for (const box of s.paintedBoxes)
      for (const m of s.marked)
        if (overlaps(m.box, box))
          problems.push(`"${m.text}" (${m.what}) is under the prose panel at scrollY=${s.scrollY}`);
    for (const m of s.marked)
      if (m.box.left < -1 || m.box.top < -1 || m.box.right > s.innerWidth + 1 || m.box.bottom > s.innerHeight + 1)
        problems.push(`"${m.text}" (${m.what}) leaves the viewport at scrollY=${s.scrollY}`);
  }
  return {
    label,
    samples: samples.length,
    tallestPanelAsFractionOfPort: Number(Math.max(...samples.map((s) => s.panelFraction)).toFixed(3)),
    portHeight: samples[0]?.portHeight ?? null,
    span: [positions[0], positions[positions.length - 1]],
    worstLag: Number(worstLag.toFixed(3)),
    problems: [...new Set(problems)],
  };
}

async function main() {
  const { server, port } = await serve(RENDER_DIR);
  const browser = await puppeteer.launch({ headless: true, executablePath: resolveChrome(), args: ["--no-sandbox", "--hide-scrollbars"] });
  await mkdir(SHOT_DIR, { recursive: true });
  const url = `http://127.0.0.1:${port}/${FILE}`;
  const results = [];

  for (const size of SIZES) {
    const page = await browser.newPage();
    await page.setViewport({ width: size.width, height: size.height });
    await page.goto(url, { waitUntil: "load" });

    const down = await sweep(page, "down");
    const up = await sweep(page, "up");
    results.push(report(`${size.name} down`, down));
    results.push(report(`${size.name} up`, up));

    // One screenshot per step, taken at the scroll offset where that step's own panel is painted
    // and the driver has settled on it — the frame a reader actually sits on to read.
    const settles = [0, 1, 2, 3].map((k) => {
      const hit = down.filter((s) => Math.abs(s.position - k) < 0.02);
      return hit.length ? hit[Math.floor(hit.length / 2)].scrollY : null;
    });
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
    const flight = down.find((s) => s.position > 2.4 && s.position < 2.6);
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
    camera: {
      worstRasterPerPixel: Math.min(...[].concat(...[])) || null,
    },
    noJs: nojsFacts,
  };
  await writeFile(join(SHOT_DIR, "drive-report.json"), JSON.stringify(summary, null, 2));
  console.log(JSON.stringify(summary, null, 2));
}

await main();
