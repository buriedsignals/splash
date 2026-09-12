// THE META IMAGE — the gallery orbiting the mark.
//
// It is the INSPIRATION SECTION — the real one, the WebGL funnel with its depth, its
// roll, and the dissolve that swallows a tile at the throat — carrying the FIELD's
// drawings, with the mark standing in the hole its headline stands in.
//
// AND IT IS NOT A LOTTERY, WHICH IS THE WHOLE OF THE WORK HERE.
//
// The module's seeding is already deterministic: `hash(n)` in `inspiration.js` is a sine
// hash, not `Math.random`, so which tile sits where along the intake is fixed for good.
// What was drawing the card at random was the CLOCK — `Stage.frame(now)` accumulates
// `dt` out of the browser's own animation timestamps, so "take a screenshot" meant "take
// whatever moment the wall clock happened to be at", and thirty-six tiles arriving in
// waves make one moment full and the next bare.
//
// So the clock is taken over. `requestAnimationFrame` is replaced by a queue and a
// `__tick(ms)` that flushes it with a timestamp WE advance, at a fixed sixtieth of a
// second. The scene is then a pure function of one integer, and the card is a NAMED
// FRAME of it: the tick is printed, and `--at <tick>` strikes exactly that one again.
// The scan that finds a good tick is a build step, not a draw.
//
// What travels the funnel is not its own gallery of published work but the charts and
// maps the first section is made of — `window.__artTile`, the twelve live drawings, with
// `__artInk` choosing their printing colours — so the card shows what Splash MAKES.
//
// Out: `landing/og-image.png` (1200×630, the open-graph frame) and
//      `landing/og-square.png` (1200×1200, for the platforms that crop to a square),
// both at twice the pixels so they stay sharp on a retina timeline.
//
// Usage:  bun film/meta-image.mjs [--out <dir>] [--port 8792] [--seed <n>]

import { spawnSync } from "node:child_process";
import { createReadStream, existsSync } from "node:fs";
import { rename, rm, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { dirname, extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, "..");

const argv = process.argv.slice(2);
const flag = (name, fallback) => {
  const at = argv.indexOf(name);
  return at >= 0 ? argv[at + 1] : fallback;
};

const OUT_DIR = resolve(flag("--out", join(REPO, "landing")));
const PORT = Number(flag("--port", "8792"));
/* No seed any more. The funnel deals its own tiles out of the collection and runs on its
 * own clock; what lands in the frame is what was passing at that moment, and the way to
 * get another one is to take another shot. */
const SCALE = 2;
/** How long the funnel is given to refill after the frame changes under it. One tile's
 *  whole travel plus room to spare. */
/** How long the funnel is given to refill after the frame changes under it — one tile's
 *  whole travel, plus room. A resize relays the scene and sends its thirty-six tiles back
 *  to the mouth, which is off-frame; two seconds later the ring is four tiles and a lot
 *  of ink, which is not what the section looks like. */
const SETTLE = Number(flag("--settle", "9000"));

/** Which drawing each tile gets, as a fixed rotation through the painter's twelve. It is
 *  a LIST, not a shuffle: two runs of this script produce the same card, and the order is
 *  written down where it can be read and changed rather than drawn and hoped for. */
const ORDER = [0, 6, 3, 9, 1, 7, 4, 10, 2, 8, 5, 11];

/** Scene time is advanced in ticks of a sixtieth of a second, in blocks; a block is shot
 *  and measured, and the best block wins. `--at` skips the scan and strikes one tick. */
const BLOCK = Number(flag("--block", "20"));
const BLOCKS = Number(flag("--blocks", "50"));
const AT = flag("--at", null);

const CHROME = flag(
  "--chrome",
  "/Users/rmdms/.cache/puppeteer/chrome/mac_arm-151.0.7922.71/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing",
);

/** The two cards. The funnel is drawn to the frame it is given — the module flattens its
 *  own ring for a landscape window and stretches it for a tall one — so each is a
 *  viewport and a screenshot. `mark` is the only thing set by hand: the lockup has to
 *  clear the throat, and the throat is a fraction of the frame. */
const CARDS = [
  { name: "og-image.png", width: 1200, height: 630, mark: 66 },
  { name: "og-square.png", width: 1200, height: 1200, mark: 104 },
];

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".woff2": "font/woff2",
};
const server = createServer((req, res) => {
  const path = resolve(REPO, "." + decodeURIComponent(req.url.split("?")[0]));
  if (!path.startsWith(REPO) || !existsSync(path)) {
    res.writeHead(404).end("not found");
    return;
  }
  res.writeHead(200, { "content-type": TYPES[extname(path)] ?? "application/octet-stream" });
  createReadStream(path).pipe(res);
});
await new Promise((ok) => server.listen(PORT, ok));

const browser = await puppeteer.launch({
  executablePath: CHROME,
  // THE WALK IS MADE AT A DESKTOP SHAPE, and only then is the frame changed to the
  // card's. The journey is a run of gestures through six sections and how many it takes
  // depends on the window: at 1200×1200 it stalls in the catalogue, a section whose
  // choreography is written for a landscape frame.
  headless: false,
  defaultViewport: { width: 1440, height: 900, deviceScaleFactor: 1 },
  args: ["--hide-scrollbars", "--window-size=1480,960"],
});
const page = await browser.newPage();
page.on("pageerror", (e) => console.log("[page]", e.message));

/* THE GALLERY IS SWAPPED FOR OUR OWN DRAWINGS, BEFORE THE PAGE CAN FILL IT.
 *
 * The funnel reads `window.__infoviz` once, inside its `build()`, and turns each entry's
 * `src` into a texture. So the list is intercepted: the site's assignment is swallowed
 * and a lazy getter stands in its place, which runs at `build()` time — after the hero
 * module has published its painter, so the drawings can be made on the spot.
 *
 * They are made as IMAGES, which the painter does not return: `__artTile` hands back
 * HTML — a title div wrapping an svg — and an `<img>` refuses it outright (measured: the
 * load simply fails). The svg INSIDE it is a real one and rasterises, so each tile is
 * re-wrapped: a ground, the title set as svg text, the chart nested under it. Nothing
 * asynchronous — the getter returns a finished list on the frame it is asked.
 *
 * Everything in it is a function of the tile's index. No `Math.random` anywhere.
 */
await page.evaluateOnNewDocument((order) => {
  let mine = null;
  const make = () => {
    if (typeof window.__artTile !== "function") return [];
    const kinds = window.__artKinds();
    const FORMS = [1.62, 1.0, 0.72, 1.0, 1.34, 0.86];
    const LIGHT = ["#edeae3", "#ffffff", "#e6e2d9"];
    const out = [];
    for (let i = 0; i < 52; i++) {
      const ar = FORMS[i % FORMS.length];
      const w = ar >= 1 ? 520 : Math.round(520 * ar);
      const h = ar >= 1 ? Math.round(520 / ar) : 520;
      let kind = kinds[order[i % order.length] % kinds.length];
      for (let t = 0; t < kinds.length && window.__artFits && !window.__artFits(kind, w / h); t++)
        kind = kinds[order[(i + t + 1) % order.length] % kinds.length];
      const seed = 1013 + i * 7919;
      const tone = window.__artInk(seed, 0);
      const box = document.createElement("div");
      box.innerHTML = window.__artTile(kind, w, h, seed, { tone });
      const svg = box.querySelector("svg");
      if (!svg) continue;
      /* The title is the tile's FIRST CHILD DIV, reached through the wrapper. Asked for
         as `div > div` it came back as the wrapper itself — the holder this markup is
         parsed into is a div too — and the "title" was then the whole tile's text:
         heading, axis labels and source run together across the top of every card. */
      const inner = box.firstElementChild;
      const parts = inner ? [...inner.children].filter((n) => n.tagName === "DIV") : [];
      const title = (parts[0] ? parts[0].textContent : "").trim();
      /* One tile in five is dark — a set of nothing but paper covers half of what this
         page says it can make — and it keeps a light rim, because on the board a dark
         tile is read against a lit room and here it is read against the ink itself, at
         the far end of a funnel that fades what it swallows. */
      const dark = i % 5 === 2;
      const ground = dark ? "#191922" : LIGHT[i % LIGHT.length];
      const pad = Math.round(w * 0.024);
      const wrapped =
        `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">` +
        `<defs><filter id="turn" color-interpolation-filters="sRGB">` +
        `<feColorMatrix type="matrix" values="-1 0 0 0 1 0 -1 0 0 1 0 0 -1 0 1 0 0 0 1 0"/>` +
        `<feColorMatrix type="hueRotate" values="180"/></filter></defs>` +
        `<rect width="${w}" height="${h}" fill="${ground}"/>` +
        (dark
          ? `<rect x="0.5" y="0.5" width="${w - 1}" height="${h - 1}" fill="none" ` +
            `stroke="rgba(237,234,227,.22)" stroke-width="1"/>`
          : "") +
        `<g${dark ? ' filter="url(#turn)"' : ""}>` +
        (title
          ? `<text x="${pad}" y="${pad + 12}" font-family="Helvetica,Arial,sans-serif" ` +
            `font-size="${Math.round(w * 0.023)}" font-weight="600" fill="#171717">` +
            `${title.replace(/&/g, "&amp;").replace(/</g, "&lt;")}</text>`
          : "") +
        `<g transform="translate(${pad},${pad + 22})">${svg.outerHTML}</g></g></svg>`;
      out.push({
        title: "",
        source: "",
        src: "data:image/svg+xml;charset=utf-8," + encodeURIComponent(wrapped),
        w,
        h,
      });
    }
    return out;
  };
  Object.defineProperty(window, "__infoviz", {
    configurable: true,
    get() {
      if (!mine || !mine.length) mine = make();
      return mine;
    },
    set() {
      /* the page's own gallery, swallowed */
    },
  });
}, ORDER);

/** THE SECTION IS REACHED THE WAY A READER REACHES IT. The page is a scripted journey —
 *  a gesture asks for the next passage, the page takes the scroll away, plays it, and
 *  hands it back — so there is no scroll position to jump to. Wheel, wait out whatever
 *  that started, and read the shared canvas's own answer for who is on it. */
const reach = async () => {
  await page.mouse.move(600, 400);
  for (let g = 0; g < 90; g++) {
    if ((await page.evaluate(() => window.__active)) === "inspiration") return g;
    await page.mouse.wheel({ deltaY: 700 });
    await new Promise((r) => setTimeout(r, 400));
    for (let k = 0; k < 24; k++) {
      if (!(await page.evaluate(() => window.__locked))) break;
      await new Promise((r) => setTimeout(r, 250));
    }
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error("never reached the inspiration section");
};

/* `?orbit=even` — the funnel's places spread around the ring by the GOLDEN ANGLE instead
 * of drawn from its hash. On the page the clustering corrects itself, because a reader
 * travels through the section and the lean turns with the orbit; for a STILL it does not,
 * a card is one instant and a leaning instant stays leaning. Choosing between frames
 * cannot fix a generator that leans — the best frame in fifty still carried its weight a
 * third of a half-frame to one side.
 *
 * The first try at the lever spaced the angles at a CONSTANT step and made it worse. The
 * index is already the depth order, so the tiles crossing the frame at any instant are a
 * contiguous run of indices; a constant angular step gives that run contiguous angles
 * too, and what shows is a clump. At 137.5° a step, any contiguous run lands spread all
 * the way round. Nothing but this query reaches it. */
// `works=52` on top: half again as many as a reader gets. A card is ONE INSTANT and
// gets no benefit from the flow, so it needs in that instant what a reader watches go by
// over several seconds. The cost is per texture and per draw, and this is a still on a
// machine doing nothing else.
await page.goto(`http://localhost:${PORT}/landing/index.html?orbit=even&works=52`, {
  waitUntil: "domcontentloaded",
});
await page.bringToFront();
await page.waitForFunction(() => window.__uiIn === 1, { timeout: 40000, polling: 100 });
console.log(`reached the gallery in ${await reach()} gestures`);
await page.waitForFunction(() => document.fonts && document.fonts.status === "loaded", {
  timeout: 20000,
  polling: 100,
});

const ROSETTE =
  "M51.043 32.561L42.02 51.064A11.148 11.148 0 1 1 30.616 35.116Z " +
  "M17.9 41.122L6.387 24.057A11.148 11.148 0 1 1 25.9 22.154Z " +
  "M27.057 8.139L47.593 6.701A11.148 11.148 0 1 1 39.484 24.551Z";

/** The section, with its own words taken off it and the mark put in their place.
 *
 *  `visibility`, not `display`: the funnel is laid out against the section, and an
 *  element that is not laid out is an element whose measurement is wrong — the same rule
 *  the film's capture works under. */
const dress = ({ mark, rosette }) => {
  const style = document.getElementById("og-dress") || document.createElement("style");
  style.id = "og-dress";
  style.textContent = `
    header, .menu, #veil, .merci .mmid { visibility: hidden !important; }
    html, body { overflow: hidden !important; }`;
  document.head.appendChild(style);

  const old = document.getElementById("og-mark");
  if (old) old.remove();
  const lock = document.createElement("div");
  lock.id = "og-mark";
  lock.style.cssText = `position:fixed;inset:0;z-index:99999;display:flex;
    align-items:center;justify-content:center;gap:${mark * 0.4}px;
    color:#edeae3;pointer-events:none`;
  lock.innerHTML =
    `<svg viewBox="0 0 64 64" style="width:${mark * 1.02}px;height:${mark * 1.02}px;display:block">` +
    `<path fill="#f2b13c" d="${rosette}"/></svg>` +
    `<span style="font-family:'Bricolage Grotesque',Helvetica,sans-serif;font-weight:800;` +
    `font-size:${mark}px;letter-spacing:-0.035em;line-height:1">Splash</span>`;
  document.body.appendChild(lock);
};

/** THE CLOCK, TAKEN OVER. `requestAnimationFrame` becomes a queue and `__tick(ms)`
 *  flushes it with a timestamp we advance — so `Stage.frame(now)` accumulates exactly
 *  the `dt` we hand it and the whole scene is a function of the number of ticks.
 *
 *  It is installed AFTER the walk: the journey is itself driven by animation frames, and
 *  a page whose clock has stopped cannot be walked. */
const seize = () => {
  if (window.__tick) return;
  let queue = [];
  const real = window.requestAnimationFrame.bind(window);
  window.requestAnimationFrame = (cb) => queue.push(cb);
  window.cancelAnimationFrame = () => {};
  let t = performance.now();
  /* GIVING IT BACK MEANS HANDING THE QUEUE OVER, not dropping it. Stage re-queues its
     own loop at the end of every frame, so when the clock is seized its next callback is
     sitting in ours; released without passing it on, nothing ever asks for another frame
     and the module is simply dead — the second card came out as bare ink with the mark
     on it and no funnel at all. */
  window.__release = () => {
    window.requestAnimationFrame = real;
    window.cancelAnimationFrame = window.__realCaf;
    const run = queue;
    queue = [];
    for (const cb of run) real(cb);
    delete window.__tick;
    delete window.__release;
  };
  window.__realCaf = window.cancelAnimationFrame;
  window.__tick = (ms) => {
    t += ms;
    const run = queue;
    queue = [];
    for (const cb of run) {
      try {
        cb(t);
      } catch (e) {
        /* one module falling over must not stop the clock */
      }
    }
  };
};

/** And GIVEN BACK between cards. A seized clock has no animation frames in it, so a page
 *  under it cannot re-lay itself after the frame changes, cannot repaint, and cannot
 *  work out which module owns the canvas: the second card was struck on a section that
 *  had never had the chance to arrive, and came out as a white catalogue. */
const release = () => {
  if (window.__release) window.__release();
};

/** TWO MEASURES, AND THE SECOND IS THE ONE THAT WAS MISSING.
 *
 *  COVERAGE — how much of the frame is reached, on a 4×4 grid with the four middle cells
 *  left out: the throat of the funnel is empty by design and the mark stands in it, so an
 *  empty middle is the composition working.
 *
 *  BALANCE — where the ink actually WEIGHS. Coverage alone cannot see a lopsided card: a
 *  frame can touch ten of twelve cells and still carry most of its ink down one side,
 *  because a cell counts the same whether it holds one tile at the threshold or four
 *  stacked. So the centroid of the lit pixels is taken and measured against the middle;
 *  an offset of nought is a card whose weight sits where the mark does.
 *
 *  `quality = coverage − 0.9 × offset`. A full frame leaning hard to one side has to lose
 *  to a slightly emptier one that is even — but only slightly: at 1.6 the penalty was
 *  worth more than half the coverage range, and the square came back balanced and nearly
 *  bare, six cells of twelve. The trade has to cut both ways.
 */
const measure = (file) => {
  const px = spawnSync(
    "ffmpeg",
    ["-v", "error", "-i", file, "-vf", "scale=64:64,format=gray", "-f", "rawvideo", "-"],
    { encoding: "buffer" },
  ).stdout;
  const cells = new Array(16).fill(0);
  let lit = 0;
  let sx = 0;
  let sy = 0;
  for (let n = 0; n < px.length; n++) {
    if (px[n] <= 34) continue;
    const row = Math.floor(n / 64);
    const col = n % 64;
    lit++;
    sx += col;
    sy += row;
    cells[Math.floor(row / 16) * 4 + Math.floor(col / 16)]++;
  }
  const middle = new Set([5, 6, 9, 10]);
  const covered = cells.filter((v, k) => !middle.has(k) && v / 256 >= 0.03).length;
  // The centroid, as a fraction of a half-frame away from the middle.
  const ox = lit ? (sx / lit - 31.5) / 31.5 : 0;
  const oy = lit ? (sy / lit - 31.5) / 31.5 : 0;
  const offset = Math.hypot(ox, oy);
  return { covered, lit, ox, oy, offset, quality: covered / 12 - 0.9 * offset };
};

for (const c of CARDS) {
  await page.evaluate(release);
  await page.setViewport({ width: c.width, height: c.height, deviceScaleFactor: SCALE });
  // The funnel is sized to the frame, so a resize is a re-layout of the whole scene. It
  // can also cost the section its place on the shared canvas — the sticky pane is
  // measured in viewport heights — and the way back is a nudge INSIDE the section, not
  // another walk: within a section the scroll is free, it is only the borders that are
  // gates.
  await new Promise((r) => setTimeout(r, 1400));
  for (let n = 0; n < 6; n++) {
    if ((await page.evaluate(() => window.__active)) === "inspiration") break;
    await page.evaluate(() => {
      const sec = document.querySelector("#inspiration");
      window.scrollTo(0, sec.offsetTop + sec.offsetHeight * 0.5 - innerHeight * 0.5);
    });
    await new Promise((r) => setTimeout(r, 700));
  }
  if ((await page.evaluate(() => window.__active)) !== "inspiration")
    throw new Error(`the ${c.width}×${c.height} frame lost the gallery`);

  await page.evaluate(dress, { mark: c.mark, rosette: ROSETTE });
  // A full intake before the clock is seized, so the room is populated rather than
  // thirty-six tiles still on their way in from a mouth that is off-frame.
  await new Promise((r) => setTimeout(r, SETTLE));
  // And the scene must actually be running before its clock is taken: a stalled module
  // frozen in place is a card of bare ink, and it is silent about it.
  const before = await page.evaluate(() => window.__frames || 0);
  await new Promise((r) => setTimeout(r, 600));
  const after = await page.evaluate(() => window.__frames || 0);
  if (after - before < 5)
    throw new Error(`the scene is not running (${after - before} frames in 600ms)`);
  await page.evaluate(seize);

  const tmp = join(OUT_DIR, `.strike.png`);
  const out = join(OUT_DIR, c.name);
  let best = null;

  if (AT !== null) {
    await page.evaluate((n) => { for (let i = 0; i < n; i++) window.__tick(1000 / 60); }, Number(AT));
    await page.screenshot({ path: out, type: "png" });
    best = { at: Number(AT), ...measure(out) };
  } else {
    for (let b = 1; b <= BLOCKS; b++) {
      await page.evaluate((n) => { for (let i = 0; i < n; i++) window.__tick(1000 / 60); }, BLOCK);
      await page.screenshot({ path: tmp, type: "png" });
      const m = measure(tmp);
      const at = b * BLOCK;
      console.log(
        `  tick ${String(at).padStart(4)}: ${m.covered}/12 cells · weight ` +
          `${m.ox >= 0 ? "right" : "left"} ${Math.abs(m.ox).toFixed(2)}, ` +
          `${m.oy >= 0 ? "low" : "high"} ${Math.abs(m.oy).toFixed(2)} · q ${m.quality.toFixed(3)}`,
      );
      if (!best || m.quality > best.quality) {
        best = { at, ...m };
        await rm(out, { force: true });
        await rename(tmp, out);
      }
    }
    await rm(tmp, { force: true });
  }

  const probed = spawnSync(
    "ffprobe",
    ["-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height", "-of", "csv=p=0", out],
    { encoding: "utf8" },
  );
  console.log(
    `${c.name} → ${out}  ${probed.stdout.trim()} · ${best.covered}/12 cells · ` +
      `weight ${best.offset.toFixed(3)} off centre · tick ${best.at} — ` +
      `pass --at ${best.at} to strike this exact frame again`,
  );
}

await browser.close();
server.close();
