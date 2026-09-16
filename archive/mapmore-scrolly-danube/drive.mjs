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
import { leaderLength, lineWeight, report, revealShape } from "./scroll-report.mjs";

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

/**
 * MEASURE THE ACCENT LINE OFF A SCREENSHOT, in the page's own canvas.
 *
 * Runs in the browser over a PNG data URL — `data:` images do not taint a canvas, so the pixels can
 * be read back — and it measures the thing the reader has, which is PAINT. The colour is read off
 * the element by the caller rather than written here: a second copy of the accent would be a second
 * opinion about what this beat is drawn in.
 *
 * HOW A WIDTH IS TAKEN, and why it is not a run of same-coloured pixels. A run-length reading is
 * whole-pixel and it needs the line to happen to run down the screen; on a 3px river it produced 14
 * usable stretches at one width and NONE at another, which is a guard that reports "cannot measure"
 * for a line that is drawn perfectly well. So the geometry is asked where the line is:
 *
 *   1. sample points along the path with `getPointAtLength`, over the VISIBLE part only (the dash
 *      offset is what is not yet revealed), and map each to screen with the path's own screen CTM —
 *      which includes the CSS transform on the camera box, i.e. exactly the scale this whole defect
 *      was about;
 *   2. at each sample take the local tangent, and scan the PERPENDICULAR with bilinear sampling;
 *   3. turn each sampled pixel into an accent COVERAGE. The line always sits inside its own
 *      ground-coloured halo, so every pixel on that scan is a mix of accent and ground and the
 *      coverage is exact rather than thresholded: for ground `#FFFFFF`, `alpha = (255 - b) / 255`,
 *      accepted only when r and g agree with the same mix. That is what makes the reading
 *      SUB-PIXEL, which a hairline defect needs — 1 px and 1.5 px are the same integer;
 *   4. the width at that point is the integral of coverage across the scan.
 *
 * Samples inside the prose card or a badge are dropped: those are occlusions, not thin line.
 */
const MEASURE_LINE = async (dataUrl, accent, ground) => {
  const img = new Image();
  img.src = dataUrl;
  await img.decode();
  const canvas = document.createElement("canvas");
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(img, 0, 0);
  const { data, width, height } = ctx.getImageData(0, 0, img.width, img.height);
  const ratio = img.width / window.innerWidth; // 1 unless the shot was taken at a device scale

  /** Accent coverage of one pixel, 0..1, or null when it is not an accent-over-ground mix. */
  const coverageAt = (px, py) => {
    const x = Math.round(px);
    const y = Math.round(py);
    if (x < 0 || y < 0 || x >= width || y >= height) return null;
    const i = (y * width + x) * 4;
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    // Solve on the channel with the longest throw between ground and accent, then check the others.
    const spans = [ground[0] - accent[0], ground[1] - accent[1], ground[2] - accent[2]];
    const k = spans.map(Math.abs).indexOf(Math.max(...spans.map(Math.abs)));
    if (spans[k] === 0) return null;
    const alpha = (ground[k] - [r, g, b][k]) / spans[k];
    if (!(alpha > -0.03) || alpha > 1.03) return null;
    const a = Math.min(1, Math.max(0, alpha));
    for (let c = 0; c < 3; c++) {
      const expected = ground[c] + (accent[c] - ground[c]) * a;
      if (Math.abs([r, g, b][c] - expected) > 14) return null;
    }
    return a;
  };

  const root = document.querySelector('[data-visual="danube-route"]');
  const line = root.querySelector('[data-part=route][data-layer=line]');
  const ctm = line.getScreenCTM();
  const toScreen = (p) => ({ x: (ctm.a * p.x + ctm.c * p.y + ctm.e) * ratio, y: (ctm.b * p.x + ctm.d * p.y + ctm.f) * ratio });
  const total = line.getTotalLength();
  const hidden = parseFloat(getComputedStyle(line).strokeDashoffset) || 0;
  const visible = Math.max(0, total - hidden);
  // Only what is actually ON SCREEN occludes. The scaffold keeps ALL FOUR prose panels in the DOM
  // and fades between them, so an unfiltered `.step-panel` query returns three invisible rectangles
  // as well as the painted one — and on a phone, where the panels are edge to edge, their union
  // covers the whole river and every measurement below reads "hidden". Found by running this guard
  // for the first time: it reported 100% of the river hidden at 375px and a journey that never
  // finishes, on a page whose river is drawn correctly.
  //
  // THE PROSE CARD IS NOT PART OF THE VISUAL, and this list exists only so the probe does not
  // mistake it for one. *"Le text panel du scrolly ne doit pas impacter le déroulé de la map. C'est
  // un élément au-dessus, il n'a pas d'incidence."* — the owner, ruling on exactly this beat. The
  // river is drawn whole and the card passes in front of it; where it does, this probe cannot read
  // the pixel underneath, so those samples are marked UNOBSERVABLE and no assertion is made from
  // them either way. Nothing here counts what the card takes away, and nothing downstream may:
  // `scrolly`'s doctrine carries the rule.
  const boxOf = (el) => {
    const r = el.getBoundingClientRect();
    return { left: r.left * ratio - 4, right: r.right * ratio + 4, top: r.top * ratio - 4, bottom: r.bottom * ratio + 4 };
  };
  const onScreen = (el) =>
    Number(getComputedStyle(el).opacity) > 0.05 && getComputedStyle(el).visibility !== "hidden";
  const occluders = [
    ...Array.from(document.querySelectorAll(".step-panel")),
    ...Array.from(root.querySelectorAll("[data-badge]")),
  ]
    .filter(onScreen)
    .map(boxOf);

  const widths = [];
  let rejected = 0;
  const N = 240;
  const REACH = 9; // screen px each side — wider than any width this beat could legitimately draw
  const STEP = 0.2;
  for (let k = 1; k <= N; k++) {
    const s = (visible * k) / (N + 1);
    const here = toScreen(line.getPointAtLength(s));
    const ahead = toScreen(line.getPointAtLength(Math.min(visible, s + 1)));
    const behind = toScreen(line.getPointAtLength(Math.max(0, s - 1)));
    const tx = ahead.x - behind.x;
    const ty = ahead.y - behind.y;
    const len = Math.hypot(tx, ty);
    if (len < 1e-6) continue;
    const nx = -ty / len;
    const ny = tx / len;
    if (occluders.some((o) => here.x >= o.left && here.x <= o.right && here.y >= o.top && here.y <= o.bottom)) {
      rejected++;
      continue;
    }
    let sum = 0;
    let peak = 0;
    let outside = true;
    for (let t = -REACH; t <= REACH; t += STEP) {
      const a = coverageAt(here.x + nx * t, here.y + ny * t);
      if (a === null) {
        // Off the accent/ground mixture line: a territory fill, the basemap, another feature. Only
        // fatal if it happens INSIDE the reach where the stroke itself must be.
        if (Math.abs(t) < 1.5) outside = false;
        continue;
      }
      sum += a * STEP;
      if (a > peak) peak = a;
    }
    // A scan that never found the line (occluded by something unlisted, or off the frame) is not a
    // measurement of a thin line; a scan that found more paint than any single stroke could hold is
    // the path doubling back on itself. Both are dropped, and `lineWeight` fails on too few left.
    if (!outside || peak < 0.35 || sum > 2 * REACH * 0.6) {
      rejected++;
      continue;
    }
    widths.push(sum / ratio);
  }
  widths.sort((a, b) => a - b);

  // ── WHERE THE RIVER IS PAINTED ALONG ITS WHOLE LENGTH ────────────────────────────────────────
  //
  // The second thing this screenshot is asked, and a different question from the width: a
  // progressive reveal must paint a PREFIX — one piece, starting at the source — and it must
  // complete by the last step. Two pieces with a hole between them is the shape a repeating
  // `stroke-dasharray` produces (a single value means "dash L, gap L, dash L…", so a second dash
  // can reappear at the far end), and it is what the owner described. Measured on the paint rather
  // than on the dash attribute, because the attribute is what would be believed.
  //
  // Three states per sample, and the third one matters: PAINTED, ABSENT, and UNOBSERVABLE — behind
  // the travelling prose card or a badge, or off the frame. An unobservable sample makes no claim in
  // either direction: it may not stand in for an absent one, because the card lying across the river
  // is a covering and not a hole and counting it as a hole would invent this defect every time the
  // card crosses the line; and it does not break a painted run, because the river under it is drawn.
  // `unobservable` is recorded as a confidence figure for THIS INSTRUMENT — how much of the path the
  // probe could not read — and never as a fact about the visual.
  const REVEAL_N = 200;
  const inside = (o, p) => p.x >= o.left && p.x <= o.right && p.y >= o.top && p.y <= o.bottom;
  const state = [];
  for (let k = 0; k <= REVEAL_N; k++) {
    const here = toScreen(line.getPointAtLength((total * k) / REVEAL_N));
    if (here.x < 0 || here.y < 0 || here.x >= width || here.y >= height) {
      state.push(-1);
      continue;
    }
    if (occluders.some((o) => inside(o, here))) {
      state.push(-1);
      continue;
    }
    let best = 0;
    for (let dx = -3; dx <= 3; dx++)
      for (let dy = -3; dy <= 3; dy++) {
        const a = coverageAt(here.x + dx, here.y + dy);
        if (a !== null && a > best) best = a;
      }
    state.push(best > 0.4 ? 1 : 0);
  }
  // Painted runs, where a run ends only at a REAL absent sample. This is the DASH's own shape —
  // what the reveal asks to be drawn — and an unobservable sample deliberately does not break it.
  const runs = [];
  let open = null;
  for (let k = 0; k <= REVEAL_N; k++) {
    if (state[k] === 1 && open === null) open = k;
    if (state[k] === 0 && open !== null) {
      runs.push([open / REVEAL_N, (k - 1) / REVEAL_N]);
      open = null;
    }
  }
  if (open !== null) runs.push([open / REVEAL_N, 1]);
  const firstAbsent = state.indexOf(0);
  const firstPainted = state.indexOf(1);

  // HOW FAR THE PROBE COULD STILL SEE. Completeness is judged against this rather than against the
  // whole length: where the card is in front of the river's tail there is no pixel to read, and
  // asserting "the journey never finishes" from that would be making a claim about the visual out of
  // a limitation of the instrument. `null` when nothing at all was observable.
  let lastObservable = null;
  for (let k = REVEAL_N; k >= 0; k--)
    if (state[k] !== -1) {
      lastObservable = k / REVEAL_N;
      break;
    }

  return {
    samples: widths.length,
    rejected,
    // Fewer than 20 usable scans of 240 is not a measurement, and `lineWeight` treats the null as a
    // problem rather than a pass.
    drawnWidthPx: widths.length >= 20 ? widths[Math.floor(widths.length / 2)] : null,
    p10: widths.length ? Number(widths[Math.floor(widths.length * 0.1)].toFixed(2)) : null,
    p90: widths.length ? Number(widths[Math.floor(widths.length * 0.9)].toFixed(2)) : null,
    reveal: {
      fragments: runs.length,
      runs: runs.map((r) => [Number(r[0].toFixed(3)), Number(r[1].toFixed(3))]),
      // Painted before anything is absent = the reveal starts at the source. `-1` for either means
      // the state never occurs, which the verdict reads rather than guesses at.
      firstPainted: firstPainted < 0 ? null : firstPainted / REVEAL_N,
      firstAbsent: firstAbsent < 0 ? null : firstAbsent / REVEAL_N,
      absent: state.filter((s) => s === 0).length / (REVEAL_N + 1),
      lastObservable,
      // INSTRUMENT CONFIDENCE, NOT A FACT ABOUT THE VISUAL. The share of the path this probe could
      // not read a pixel for, because the prose card or a badge was in front of it. The card is an
      // overlay and has no incidence on the river's own state, so nothing is asserted from this
      // number and nothing downstream may derive a defect from it — it is here so that a run of
      // "the probe saw nothing" is legible as such instead of being mistaken for evidence.
      unobservable: state.filter((s) => s === -1).length / (REVEAL_N + 1),
    },
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
  /** One measured drawn-line weight per width, fed to `lineWeight` below. */
  const lineWeights = [];
  /** The painted SHAPE of the reveal, at every step of every width, fed to `revealShape`. */
  const revealShapes = [];
  /** What the leaders connect, at every step of every width, fed to `leaderLength`. */
  const leaderRuns = [];

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
    /** One measured line weight per step, at this width — see the note beside the measurement. */
    const perStep = [];
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
      // THE DRAWN LINE, MEASURED, off the shot just taken. The accent and the ground are read off
      // the ELEMENTS rather than written here, so the guard cannot be measuring a colour the beat
      // has stopped drawing in.
      //
      // EVERY step is measured and the widest-sampled one is kept, which is a lesson this guard
      // learned on its first run: at 375px the prose card sits over almost the whole of the plate
      // band by the last step, so a guard that only ever looked there reported "cannot measure" for
      // a line that was drawn correctly and covered. The card is an occlusion; the width is not a
      // function of the step.
      const shot = await page.screenshot({ encoding: "base64" });
      const [accent, ground] = await page.evaluate(() => {
        const rgb = (el) => getComputedStyle(el).stroke.match(/\d+/g).slice(0, 3).map(Number);
        return [
          rgb(document.querySelector('[data-part=route][data-layer=line]')),
          rgb(document.querySelector('[data-part=route][data-layer=halo]')),
        ];
      });
      const measured = await page.evaluate(MEASURE_LINE, `data:image/png;base64,${shot}`, accent, ground);
      perStep.push({ step: k + 1, ...measured });
      revealShapes.push({
        label: `${size.name} step ${k + 1}`,
        step: k + 1,
        steps: settles.length,
        reveal: measured.reveal,
      });
      // The leaders, read off the DOM at the same instant — segment endpoints and lengths are in
      // FRAME pixels there, which is the space the bound is stated in.
      leaderRuns.push({
        label: `${size.name} step ${k + 1}`,
        ...(await page.evaluate(() => {
          const root = document.querySelector('[data-visual="danube-route"]');
          const box = root.getBoundingClientRect();
          const d = root.querySelector("[data-part=leaders]")?.getAttribute("d") ?? "";
          const leaders = d
            .split("M")
            .filter(Boolean)
            .map((seg) => seg.split("L").map((p) => p.trim().split(/\s+/).map(Number)))
            .filter(([a, b]) => a && b && a.length === 2 && b.length === 2)
            .map(([a, b]) => ({ from: a, to: b, len: Math.hypot(b[0] - a[0], b[1] - a[1]) }));
          return { frame: { width: box.width, height: box.height }, leaders };
        })),
      });
    }
    // The best-sampled step is the measurement for this width; the rest are recorded so a reader of
    // the report can see how much of the river each step actually leaves uncovered.
    const best = perStep.reduce((a, b) => (b.samples > a.samples ? b : a), perStep[0]);
    lineWeights.push({ label: size.name, ...best, perStep });
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
    // THE RIVER'S OWN WEIGHT ON SCREEN, measured off the last step's screenshot at each width. The
    // beat's subject is a line; that it is DRAWN at a thickness a reader can follow is the one
    // thing about it no attribute in the file can attest to.
    lineWeight: lineWeight(lineWeights),
    // THE PAINTED SHAPE OF THE REVEAL — one piece, starting at the source, finished by the last
    // step — and the length of every leader. Both were reported by the owner and neither was held
    // by anything before; see the headers on the two functions for what was measured and what was
    // not found.
    revealShape: revealShape(revealShapes),
    leaders: leaderLength(leaderRuns),
  };
  await writeFile(join(SHOT_DIR, "drive-report.json"), JSON.stringify(summary, null, 2));
  console.log(JSON.stringify(summary, null, 2));
  const failing = results.filter((r) => r.problems.length > 0);
  const named = [
    ["the drawn line", summary.lineWeight.problems],
    ["the reveal's shape", summary.revealShape.problems],
    ["the leaders", summary.leaders.problems],
  ].filter(([, ps]) => ps.length > 0);
  // Exit non-zero rather than printing a wall of problems and reporting success — a run that says
  // "197 problems" and exits 0 is how a slideshow gets called a clean run in a commit message.
  if (failing.length > 0 || named.length > 0)
    throw new Error(
      [
        failing.length > 0
          ? `${failing.length} of ${results.length} sweeps have problems: ` +
            failing.map((r) => `${r.label} (${r.problems.length})`).join(", ")
          : null,
        ...named.map(([what, ps]) => `${what}: ${ps.join("; ")}`),
      ]
        .filter(Boolean)
        .join(" | "),
    );
}

if (import.meta.main) await main();
