// DRIVE THE DELIVERED FILE IN A REAL BROWSER, ON A CONTINUOUS SCROLL, IN BOTH DIRECTIONS.
//
// A DUPLICATE of the sibling one-map beat's harness, not an import — a beat directory stays
// copy-pasteable on its own. What differs is what it reads off the page, because this beat can be
// wrong in different ways: its camera never moves, so there is no flight to measure; what there is
// instead is a LIVE tile layer that has to stay registered with 14,057 baked marks, a mark surface
// that has to repeat with the world, and one ring per frame that must NOT.
//
// Why this is not the usual sampled probe. The previous round of scrolly beats sampled 25 discrete
// scroll positions at three widths and reported 25/25 correct — and the owner, reading the same
// files, saw frames arriving at the wrong moment. A probe that jumps to a position, waits, and asks
// the DOM what it thinks, measures the SETTLED state and never the transition; a reader only ever
// sees the transition. So this run scrolls in small increments with no settle wait, records what is
// actually painted at every increment, PHOTOGRAPHS every increment, and then goes back UP.
//
// What it records at every increment: which encoding is painted, the live camera the layer
// published, the drift between that camera and the one the browser drew the marks with, how many
// world copies the marks are repeated into, whether MapLibre has every tile the current camera
// needs, a fingerprint of the painted frame, and the boxes of the legend and of every visible prose
// card — which is what makes the ninth correction's own guarantee checkable here: a card may COVER
// the legend whole, and may never SLICE it down one of its vertical edges.
//
// THE FILMSTRIP. `--shots <dir>` writes one PNG per increment, both directions, every width. It is
// deliberately NOT the beat's own `drive/` directory: 700-odd frames is a quarter of a gigabyte and
// none of it belongs in a repository. `drive/` keeps the handful a reader of this beat needs — one
// per encoding per width, one mid-card-crossing, no-JS, reduced motion — and the filmstrip is for
// the person driving, who has to LOOK at it.
//
// Usage:  bun proof/mapscrolly-quakes-three-ways/drive.mjs [--shots /tmp/quakes-filmstrip]

import { createServer } from "node:http";
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { homedir, tmpdir } from "node:os";
import { dirname, extname, join } from "node:path";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer";

const HERE = dirname(fileURLToPath(import.meta.url));
const FILE = "quakes-four-maps.html";
const PLACEHOLDER = "__MAPTILER" + "_KEY__";
const STEP_IDS = ["events", "bins", "biggest", "strength"];
const RENDER_DIR = join(HERE, "render");
const SHOT_DIR = join(HERE, "drive");

const SIZES = [
  { name: "1600x900", width: 1600, height: 900 },
  { name: "1280x800", width: 1280, height: 800 },
  // 768 is in the list because it is the ONE band where the vehicle's card can reach this beat's
  // own legend: above 600px the card is 410px centred, so its left edge sits at `(W − 410) / 2`,
  // which only clears a 190px-wide legend anchored 14px from the left once W is past about 810.
  { name: "768x1024", width: 768, height: 1024 },
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

/** The key, read from the SAME `.env` this beat's plate was baked with — the twin root, two
 *  directories up. The sibling beats' own convention rather than a second path invented here. */
function readKey() {
  const env = join(HERE, "../../.env");
  if (!existsSync(env)) throw new Error(`no .env at ${env}: driving the live map needs a MAPTILER_KEY`);
  const line = readFileSync(env, "utf8").split(/\r?\n/).find((l) => l.startsWith("MAPTILER_KEY="));
  if (!line) throw new Error(`no MAPTILER_KEY in ${env}`);
  return line.slice("MAPTILER_KEY=".length).trim();
}

/** THE PAGE THIS RUN SERVES, and it is written OUTSIDE the tree. R1b: the committed artifact keeps
 *  the placeholder, so driving the committed file directly would drive a page with no live map on
 *  it and measure the fallback while calling it the map. A `mkdtemp` copy with the key substituted
 *  is the same page a newsroom is delivered, and the key never touches a tracked file — the same
 *  arrangement `verify-live-tiles.mjs` and `twin-map-web/scripts/verify-live-map.mjs` use.
 *  `--no-key` serves the committed file as it stands, which is how the FALLBACK is driven. */
function servedCopy({ keyed }) {
  const dir = mkdtempSync(join(tmpdir(), "quakes-drive-"));
  const html = readFileSync(join(RENDER_DIR, FILE), "utf8");
  writeFileSync(join(dir, FILE), keyed ? html.replaceAll(PLACEHOLDER, readKey()) : html);
  return dir;
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
  const graphic = document.querySelector(".scrolly-graphic");
  const scrolly = document.querySelector(".scrolly");
  const column = document.querySelector(".scrolly-steps");
  const active = document.querySelector(".step-frame.active");
  const port = window.__port ?? document.scrollingElement;
  const columnBox = column.getBoundingClientRect();

  // The prose cards, clipped by the column that clips them on screen — a card scrolled out of the
  // top keeps reporting a rect over the graphic, and testing THAT against the legend invents a
  // collision the box model already made impossible.
  const cards = Array.from(document.querySelectorAll(".step-panel"))
    .map((el) => {
      const r = el.getBoundingClientRect();
      const left = Math.max(r.left, columnBox.left);
      const right = Math.min(r.right, columnBox.right);
      const top = Math.max(r.top, columnBox.top);
      const bottom = Math.min(r.bottom, columnBox.bottom);
      return right > left && bottom > top ? { left, right, top, bottom } : null;
    })
    .filter(Boolean);

  // THE LEGEND, which is the only furniture this beat draws on the frame and therefore the only
  // thing a card's vertical edge can slice. Absent on steps 1 and 3, which draw no legend.
  const legendEl = active ? active.querySelector("[data-part=legend]") : null;
  const legend =
    legendEl && legendEl.getBoundingClientRect().width > 0
      ? legendEl.getBoundingClientRect().toJSON()
      : null;

  const marks = active ? active.querySelector("[data-part=marks]") : null;
  const ctm = marks && marks.getScreenCTM ? marks.getScreenCTM() : null;
  const graphicBox = graphic.getBoundingClientRect();

  return {
    scrollY: port.scrollTop,
    innerWidth: window.innerWidth,
    innerHeight: window.innerHeight,
    pageScrolls: document.documentElement.scrollHeight > window.innerHeight + 1,
    horizontal: document.documentElement.scrollWidth > window.innerWidth + 1,
    progress: Number(scrolly?.dataset.progress ?? "NaN"),
    activeStep: active ? active.getAttribute("data-step") : null,
    activeFrames: document.querySelectorAll(".step-frame.active").length,
    // What the live layer publishes about itself. `liveView` is the camera it asked MapLibre for;
    // `fitDrift` is how far that is from the camera the browser drew the MARKS with; `worldCopies`
    // is how many times the mark surface is repeated beside the middle world.
    liveView: graphic.dataset.liveView ?? null,
    fitDrift: graphic.dataset.fitDrift === undefined ? null : Number(graphic.dataset.fitDrift),
    worldCopies: graphic.dataset.worldCopies ?? null,
    liveError: graphic.dataset.liveError ?? null,
    canvases: document.querySelectorAll("canvas").length,
    // The map element against the graphic it is supposed to fill, at THIS instant rather than at a
    // settled one — the owner's "la map doit prendre toute la largeur", asked continuously.
    mapFillsGraphic: (() => {
      const c = document.querySelector("canvas");
      if (!c) return null;
      const r = c.getBoundingClientRect();
      return {
        dw: Math.round(r.width - graphicBox.width),
        dh: Math.round(r.height - graphicBox.height),
      };
    })(),
    tilesLoaded: window.__qmMap ? window.__qmMap.areTilesLoaded() : null,
    // How many rings are painted. The beat's own rule is exactly one per ringed frame, and the
    // world repeat is the thing that can quietly make it two.
    rings: active ? active.querySelectorAll("[data-part=annotation] > g").length : 0,
    repeatLayers: active ? active.querySelectorAll("[data-part=repeats] > div").length : 0,
    legend,
    graphicBox: graphicBox.toJSON(),
    cards,
    marksBox: ctm
      ? {
          left: Math.round(ctm.e - graphicBox.left),
          top: Math.round(ctm.f - graphicBox.top),
          scale: Number(ctm.a.toFixed(4)),
        }
      : null,
    paint: digest(
      [
        active ? active.getAttribute("data-step") : "",
        graphic.dataset.liveView ?? "",
        graphic.dataset.worldCopies ?? "",
        cards.map((c) => `${Math.round(c.top)}:${Math.round(c.left)}`).join(","),
      ].join("|"),
    ),
  };
};

/** Everything a single driven frame can be wrong about. One function, used on every sample of
 *  every sweep, so a defect cannot be present in a direction nobody looked at. */
function problemsIn(sample) {
  const out = [];
  if (sample.canvases < 1) out.push(`scrollY=${sample.scrollY}: no <canvas> — the live map is gone`);
  if (sample.liveError) out.push(`scrollY=${sample.scrollY}: live error ${sample.liveError}`);
  if (sample.fitDrift === null || sample.fitDrift > 0.5)
    out.push(`scrollY=${sample.scrollY}: fit drift ${sample.fitDrift} — tiles and marks disagree`);
  if (sample.activeFrames !== 1)
    out.push(`scrollY=${sample.scrollY}: ${sample.activeFrames} frames painted at once`);
  if (sample.horizontal) out.push(`scrollY=${sample.scrollY}: the page scrolls horizontally`);
  if (sample.mapFillsGraphic && (sample.mapFillsGraphic.dw < 0 || sample.mapFillsGraphic.dh < 0))
    out.push(
      `scrollY=${sample.scrollY}: the map does not fill the graphic (${JSON.stringify(sample.mapFillsGraphic)})`,
    );
  if (sample.rings > 1)
    out.push(`scrollY=${sample.scrollY}: ${sample.rings} rings painted — the ring must be one per frame`);
  // THE FRAME'S OWN EDGE, and this guard exists because the first fix for the one below walked
  // straight past it: moving the legend into the card's stripe with a rule that lost to an inline
  // style applied the TRANSFORM alone and pulled the legend half its width off the left edge, where
  // `overflow: hidden` cut it. Everything else stayed green — the card was not slicing it, the
  // frame was. Furniture that leaves the box it is drawn in is the same defect as furniture a card
  // cuts, and now the same run says so.
  if (sample.legend) {
    if (
      sample.legend.left < sample.graphicBox.left - 0.5 ||
      sample.legend.right > sample.graphicBox.right + 0.5 ||
      sample.legend.top < sample.graphicBox.top - 0.5 ||
      sample.legend.bottom > sample.graphicBox.bottom + 0.5
    )
      out.push(
        `scrollY=${sample.scrollY}: the legend (${Math.round(sample.legend.left)}..` +
          `${Math.round(sample.legend.right)}) is clipped by the frame ` +
          `(${Math.round(sample.graphicBox.left)}..${Math.round(sample.graphicBox.right)})`,
      );
  }
  // THE NINTH CORRECTION'S GUARANTEE. Covered whole is what a card over a picture means and is
  // allowed; a vertical edge of the card landing INSIDE the legend is broken furniture.
  if (sample.legend)
    for (const card of sample.cards) {
      const overlapsRows = card.top < sample.legend.bottom && card.bottom > sample.legend.top;
      if (!overlapsRows) continue;
      const cuts = [card.left, card.right].filter(
        (x) => x > sample.legend.left + 0.5 && x < sample.legend.right - 0.5,
      );
      if (cuts.length)
        out.push(
          `scrollY=${sample.scrollY}: the card's edge at x=${Math.round(cuts[0])} slices the legend ` +
            `(${Math.round(sample.legend.left)}..${Math.round(sample.legend.right)})`,
        );
    }
  return out;
}

async function sweep(page, direction, shotDir, label) {
  const samples = [];
  const max = await page.evaluate(PORT);
  const positions = [];
  if (direction === "down") for (let y = 0; y <= max; y += STEP_PX) positions.push(y);
  else for (let y = max; y >= 0; y -= STEP_PX) positions.push(y);
  let index = 0;
  for (const y of positions) {
    // `scrollTop`, then ONE animation frame: the scaffold's own driver runs on `scroll`, so this is
    // exactly the state a reader's next painted frame would carry. No settle wait — a settle wait
    // is what turns a transition into a snapshot of the destination.
    await page.evaluate((to) => {
      (window.__port ?? document.scrollingElement).scrollTop = to;
      return new Promise((r) => requestAnimationFrame(() => r()));
    }, y);
    const sample = await page.evaluate(SNAPSHOT);
    if (shotDir)
      await page.screenshot({
        path: join(shotDir, `${label}-${String(index).padStart(3, "0")}.png`),
      });
    samples.push(sample);
    index += 1;
  }
  return samples;
}

function report(label, samples) {
  const problems = [];
  for (const sample of samples) problems.push(...problemsIn(sample));
  const seen = [...new Set(samples.map((s) => s.activeStep))].filter(Boolean);
  for (const id of STEP_IDS)
    if (!seen.includes(id)) problems.push(`the "${id}" reading is unreachable on this sweep`);
  // The four encodings must be four PICTURES. A scrolly that swapped in the same frame four times
  // would satisfy everything above.
  const perStep = new Map();
  for (const sample of samples) if (sample.activeStep) perStep.set(sample.activeStep, sample.paint);
  const distinct = new Set(perStep.values());
  if (perStep.size > 1 && distinct.size < perStep.size)
    problems.push(`${perStep.size} readings but only ${distinct.size} distinct frames — a slideshow`);
  return {
    label,
    frames: samples.length,
    stepsSeen: seen,
    worldCopies: [...new Set(samples.map((s) => s.worldCopies))],
    fitDriftWorst: Math.max(...samples.map((s) => s.fitDrift ?? Number.NaN)),
    framesWithMissingTiles: samples.filter((s) => s.tilesLoaded === false).length,
    ringCounts: [...new Set(samples.map((s) => s.rings))].sort(),
    cardOverLegendFrames: samples.filter(
      (s) =>
        s.legend &&
        s.cards.some((c) => c.top < s.legend.bottom && c.bottom > s.legend.top && c.left < s.legend.right && c.right > s.legend.left),
    ).length,
    problems: [...new Set(problems)],
  };
}

async function main() {
  const argv = process.argv.slice(2);
  const shotsAt = argv.indexOf("--shots");
  const filmstrip = shotsAt >= 0 ? argv[shotsAt + 1] : null;
  if (filmstrip) await mkdir(filmstrip, { recursive: true });
  const keyed = !argv.includes("--no-key");

  const served = servedCopy({ keyed });
  const { server, port } = await serve(served);
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
    // The COMMITTED file carries the placeholder, so there is no live layer to wait for; a keyed
    // copy has one and it publishes its readiness. Either way the wait is bounded and the sweep
    // starts from a settled page rather than from a half-booted one.
    await page
      .waitForFunction(() => document.querySelector(".scrolly-graphic")?.dataset.liveWarm !== undefined, {
        timeout: 30000,
      })
      .catch(() => {});

    const down = await sweep(page, "down", filmstrip, `${size.name}-down`);
    const up = await sweep(page, "up", filmstrip, `${size.name}-up`);
    results.push(report(`${size.name} down`, down));
    results.push(report(`${size.name} up`, up));

    // One committed screenshot per encoding, at the sampled offset closest to that reading, plus
    // one with the card mid-crossing — the moment a sampled probe never looks at.
    const settles = [0, 1, 2, 3].map((k) =>
      down.reduce((best, s) => (Math.abs(s.progress - k) < Math.abs(best.progress - k) ? s : best), down[0]).scrollY,
    );
    for (let k = 0; k < settles.length; k++) {
      await page.evaluate((y) => {
        (window.__port ?? document.scrollingElement).scrollTop = y;
        return new Promise((r) => setTimeout(r, 450));
      }, settles[k]);
      await page.screenshot({ path: join(SHOT_DIR, `${size.name}-step-${k + 1}.png`) });
    }
    const crossing = down.find((s) => s.progress > 1.4 && s.progress < 1.6);
    if (crossing) {
      // A SETTLE HERE, and the sweeps above still have none. The scaffold cross-fades the frame
      // swap over 0.3s, so a shot taken one animation frame after jumping BACK from the end of the
      // track catches the previous encoding still at full opacity: the first version of this file
      // wrote a `card-crossing.png` showing reading 4's ring at reading 2's scroll position, which
      // is a photograph of the harness rather than of the page.
      await page.evaluate((y) => {
        (window.__port ?? document.scrollingElement).scrollTop = y;
        return new Promise((r) => setTimeout(r, 450));
      }, crossing.scrollY);
      await page.screenshot({ path: join(SHOT_DIR, `${size.name}-card-crossing.png`) });
    }
    await page.close();
  }

  // Reduced motion: the encoding must still ARRIVE, without the cross-fade.
  const rm = await browser.newPage();
  await rm.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "reduce" }]);
  await rm.setViewport({ width: 1600, height: 900 });
  await rm.goto(url, { waitUntil: "load" });
  // The same bounded wait the sized runs take. Without it the reduced-motion sweep starts before
  // the live layer has published anything and reports `fit drift null` on every frame — a probe
  // measuring its own impatience, which is what the first run of this harness did.
  await rm
    .waitForFunction(() => document.querySelector(".scrolly-graphic")?.dataset.liveWarm !== undefined, {
      timeout: 30000,
    })
    .catch(() => {});
  const rmSamples = await sweep(rm, "down", null, "rm");
  await rm.screenshot({ path: join(SHOT_DIR, "reduced-motion-end.png") });
  await rm.close();

  // JavaScript off: the SSR'd first encoding, the baked plate and every step's prose survive — and
  // the live container is still empty, because nothing built a map into it.
  const nojs = await browser.newPage();
  await nojs.setJavaScriptEnabled(false);
  await nojs.setViewport({ width: 1600, height: 900 });
  await nojs.goto(url, { waitUntil: "load" });
  const nojsFacts = await nojs.evaluate(() => ({
    activeFrames: document.querySelectorAll(".step-frame.active").length,
    canvases: document.querySelectorAll("canvas").length,
    plateIsInlineData: (document.querySelector("[data-part=plate] image")?.getAttribute("href") ?? "").startsWith(
      "data:image/png;base64,",
    ),
    plateOpacity: Number(getComputedStyle(document.querySelector("[data-part=plate]")).opacity),
    repeatLayers: document.querySelectorAll("[data-part=repeats]").length,
    externalRequests: Array.from(document.querySelectorAll("img,script,link,iframe")).filter((el) => {
      const url = el.getAttribute("src") || el.getAttribute("href") || "";
      return url && !url.startsWith("data:") && !url.startsWith("#");
    }).length,
    paragraphs: document.querySelectorAll(".step-panel p").length,
  }));
  await nojs.screenshot({ path: join(SHOT_DIR, "no-js.png") });
  await nojs.close();

  await browser.close();
  server.close();
  rmSync(served, { recursive: true, force: true });

  const summary = {
    file: join(RENDER_DIR, FILE),
    keyed,
    filmstrip,
    sweeps: results,
    reducedMotion: {
      samples: rmSamples.length,
      stepsSeen: [...new Set(rmSamples.map((s) => s.activeStep))].filter(Boolean),
      problems: [...new Set(rmSamples.flatMap(problemsIn))],
    },
    noJs: nojsFacts,
  };
  await writeFile(join(SHOT_DIR, "drive-report.json"), JSON.stringify(summary, null, 2));
  console.log(JSON.stringify(summary, null, 2));
  const failing = results.filter((r) => r.problems.length > 0);
  // Exit non-zero rather than printing a wall of problems and reporting success — a run that says
  // "197 problems" and exits 0 is how a broken page gets called a clean run in a commit message.
  if (failing.length > 0)
    throw new Error(
      `${failing.length} of ${results.length} sweeps have problems: ` +
        failing.map((r) => `${r.label} (${r.problems.length})`).join(", "),
    );
}

if (import.meta.main) await main();
