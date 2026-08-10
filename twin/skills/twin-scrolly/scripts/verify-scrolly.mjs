// twin/skills/twin-scrolly/scripts/verify-scrolly.mjs
//
// THE GUARD THAT WATCHES A CONTINUOUS SCROLL, and the reason it exists is that the instrument this
// genre had been verified with could not see the defect that broke every beat on disk.
//
// WHAT THE OLD INSTRUMENT DID, AND WHY IT PASSED A BROKEN VEHICLE. Every round of this skill was
// checked by jumping to N discrete scroll offsets, waiting for things to settle, and reading the
// state. Measured on the four beats plus the seed, at 1600x900 / 1280x800 / 375x812, that
// instrument reported 25 samples out of 25 with exactly one frame at opacity 1 and every other at
// exactly 0, one panel at a time, all four steps in order. Every one of those numbers was true.
//
// The same five pages, scrolled CONTINUOUSLY — 24 px per animation frame, which is an ordinary
// wheel — measured: in FOURTEEN of the fifteen runs at least one step's frame was NEVER PAINTED AT
// ALL; the graphic lagged the prose by up to 1,800px of a 3,300px track; and roughly 45% of every
// animation frame the browser drew was a blend of two frames rather than one settled image. The
// cause was in `assets/interaction.mjs` and is written up there: the old `IntersectionObserver`
// rule picked its winner from the entries of the CURRENT CALLBACK — the panels whose ratio had just
// crossed a threshold — so on a continuous scroll the active class oscillated between the outgoing
// and incoming panel, restarting the 0.3s transition on every flip. A teleport hands the observer
// every panel in one callback, so the delta set IS the full state and the rule is accidentally
// right. A reader never teleports.
//
// So this file scrolls. It installs a `requestAnimationFrame` recorder BEFORE touching the scroll
// position and reads back every frame the browser actually drew, rather than asking the DOM what it
// thinks after the dust has settled. A sampled probe is not a weaker version of this; it is blind
// to a whole class of defect by construction, and it proved it.
//
// WHAT IS ASSERTED (each one red-able — see `test/scroll-integrity.test.ts` for the mutations):
//   A. THE PAGE DOES NOT SCROLL. `documentElement.scrollHeight <= clientHeight + 1`. The component
//      owns its own scroll; a CMS embed that steals the host article's scroll is a nuisance, and
//      the sticky model this replaced could not avoid being one.
//   B. THE GRAPHIC NEVER MOVES. `.scrolly-graphic`'s box is identical at every recorded frame —
//      not "identical once pinned", identical from the first frame, because there is no pin.
//   C. THE HEADER NEVER MOVES, same measurement. The owner's own report: the title disappeared on
//      the reader's first gesture.
//   D. EVERY STEP'S FRAME IS PAINTED, IN ORDER. Each `.step-frame` reaches opacity >= 0.98 at some
//      recorded frame, and the order in which they first do so is the order they are declared in.
//      This is the assertion the old vehicle failed 14 runs out of 15.
//   D2. THE ACTIVE STEP CHANGES ONCE PER BOUNDARY. Each step is handed the `active` class exactly
//      once during one pass. This is the oscillation itself, measured directly rather than through
//      the opacity it wrecked: the old rule handed a step `active` four and five times per
//      boundary, and it is the reason nothing ever finished fading.
//   D3. THE GRAPHIC SETTLES. When the scroll stops, exactly one frame is at 1 and every other at 0
//      — never a resting double exposure, the defect a previous round removed and this one had to
//      prove had not come back through the decision layer.
//   E. ONE PANEL AT A TIME. Never two `.step-panel`s above opacity 0.05 in the same frame.
//   F. A PAINTED PANEL IS INSIDE THE LANE. No panel is painted while its top edge sits above the
//      lane's own top — the promise the frames' `safeBand`/`CONTENT_TOP` keep from the other side.
//      Asserted only where the panel FITS the lane, because where it does not there is no position
//      that satisfies it and painting nothing would be worse (see `pickLanePanel`). The fit itself
//      is measured and reported for every beat and width, so a beat whose prose has outgrown its
//      lane is visible rather than silently exempt.
//
// WHAT IS REPORTED BUT NOT ASSERTED, and why: the census of prose-over-annotation collisions. What
// remains after F is beat-level — a frame that places a mark inside the lane the vehicle reserved,
// or prose too long for it — and the vehicle cannot move a beat's marks. Naming them per beat and
// per width is the honest form; asserting zero here would either be a lie or a demand this file has
// no authority to make.
//
// Usage: bun skills/twin-scrolly/scripts/verify-scrolly.mjs <file.html> [more.html...] [--width=W]

import puppeteer from "puppeteer";
import { existsSync, readdirSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

/** A DUPLICATE of the `resolveChrome` every capture script in this tree carries — see
 *  `twin-map-web/test/standalone.test.ts`'s own copy for why these are duplicated rather than
 *  imported (a skill's own scripts stay copy-pasteable). */
export function resolveChrome() {
  const candidates = [];
  if (process.env.CHROME_PATH) candidates.push(process.env.CHROME_PATH);
  const cache = join(homedir(), ".cache/puppeteer/chrome");
  if (existsSync(cache))
    for (const build of readdirSync(cache).sort().reverse())
      candidates.push(
        join(
          cache,
          build,
          "chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing",
        ),
        join(
          cache,
          build,
          "chrome-mac-x64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing",
        ),
        join(cache, build, "chrome-linux64/chrome"),
      );
  candidates.push(
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/usr/bin/google-chrome",
  );
  const found = candidates.find((c) => existsSync(c));
  if (!found)
    throw new Error(
      `no Chrome to drive — looked at ${candidates.join(", ")}. This genre is verified by driving a ` +
        `real browser and by nothing else; there is no fallback that would prove anything.`,
    );
  return found;
}

/** Desktop, laptop, phone — the three shapes this genre is checked at. */
export const WIDTHS = [
  { w: 1600, h: 900 },
  { w: 1280, h: 800 },
  { w: 375, h: 812 },
];

/** How many animation frames a reader spends crossing ONE step. The scroll speed is derived from
 *  this and the beat's own step height rather than fixed in pixels, so a phone (a shorter track) and
 *  a desktop (a longer one) get the same DWELL per step — a fixed pixel rate reads as a brisk scroll
 *  at 1600x900 and as a flick at 375x812, and the difference silently decides whether a 0.3s
 *  transition has time to finish. 60 frames is about a second per step: brisk, and real. */
export const FRAMES_PER_STEP = 60;

/** Opacity above which a panel counts as painted over the graphic. */
const PAINTED = 0.05;
/** Opacity at which a frame counts as fully arrived. */
const SETTLED = 0.98;

/** Installed in the page BEFORE any scrolling. One entry per animation frame.
 *
 *  This function is SERIALISED into the browser, so it closes over nothing: `PAINTED` is written
 *  out as a literal here and named as a constant above for the node side. A module constant read
 *  from inside this body is `undefined` in the page — it throws, which is how this was caught. */
function recorder() {
  const PAINTED = 0.05;
  const frames = Array.from(document.querySelectorAll(".step-frame"));
  const panels = Array.from(document.querySelectorAll(".step-panel"));
  const scroller = document.querySelector(".scrolly-steps");
  const graphic = document.querySelector(".scrolly-graphic");
  const header = document.querySelector(".scrolly-header");
  const lanePct = Number(
    document.querySelector(".scrolly").getAttribute("data-prose-lane"),
  );

  // Leaf text boxes inside each frame — what a reader would call a label. Precomputed once: the
  // SSR'd markup never changes, only which wrapper is visible.
  function leafText(container) {
    const out = [];
    (function walk(el) {
      const kids = Array.from(el.children);
      const own = (el.textContent || "").trim();
      if (own.length > 0 && !kids.some((k) => (k.textContent || "").trim()))
        return out.push(el);
      kids.forEach(walk);
    })(container);
    return out;
  }
  const labels = new Map(frames.map((f) => [f, leafText(f)]));
  const box = (e) => {
    const r = e.getBoundingClientRect();
    return [
      Math.round(r.left),
      Math.round(r.top),
      Math.round(r.width),
      Math.round(r.height),
    ];
  };
  const hits = (a, b) =>
    a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;

  window.__rec = [];
  window.__recording = true;
  (function tick() {
    if (!window.__recording) return;
    const port = scroller.getBoundingClientRect();
    const laneTop = port.bottom - (lanePct / 100) * port.height;
    const sample = {
      y: Math.round(scroller.scrollTop),
      graphic: box(graphic),
      header: box(header),
      lane: [Math.round(laneTop), Math.round(port.bottom)],
      frames: frames.map((f) => ({
        id: f.getAttribute("data-step"),
        o: Number(Number(getComputedStyle(f).opacity).toFixed(3)),
        active: f.classList.contains("active"),
      })),
      painted: [],
      collisions: [],
    };
    const visible = [];
    for (const p of panels) {
      const o = Number(getComputedStyle(p).opacity);
      if (o <= PAINTED) continue;
      const r = p.getBoundingClientRect();
      if (r.width === 0 || r.bottom <= port.top || r.top >= port.bottom) continue;
      sample.painted.push({
        id: p.getAttribute("data-step"),
        top: Math.round(r.top),
        bottom: Math.round(r.bottom),
        aboveLane: Math.round(laneTop - r.top),
      });
      visible.push(r);
    }
    for (const f of frames) {
      if (Number(getComputedStyle(f).opacity) <= PAINTED) continue;
      for (const el of labels.get(f)) {
        const r = el.getBoundingClientRect();
        if (r.width === 0 || r.height === 0) continue;
        if (visible.some((v) => hits(r, v)))
          sample.collisions.push({
            frame: f.getAttribute("data-step"),
            text: (el.textContent || "").trim().slice(0, 30),
          });
      }
    }
    window.__rec.push(sample);
    requestAnimationFrame(tick);
  })();
}

/** Scrolls the prose column from top to bottom at one step per `framesPerStep` animation frames,
 *  then holds still long enough for any transition to finish. */
async function scrollThrough(page, framesPerStep) {
  await page.evaluate(async (perStep) => {
    const el = document.querySelector(".scrolly-steps");
    const max = el.scrollHeight - el.clientHeight;
    const stepHeight =
      document.querySelector(".step").getBoundingClientRect().height;
    const px = Math.max(2, Math.round(stepHeight / perStep));
    const frame = () => new Promise((r) => requestAnimationFrame(r));
    for (let y = 0; y <= max; y += px) {
      el.scrollTop = y;
      await frame();
    }
    el.scrollTop = max;
    for (let i = 0; i < 40; i++) await frame();
  }, framesPerStep);
  await page.evaluate(() => {
    window.__recording = false;
  });
}

const same = (a, b) => a.every((v, i) => v === b[i]);

/**
 * Drives one file at one size through a full continuous scroll and returns its findings.
 * `failures` are assertion breaches; `notes` are measured facts a person should read.
 */
export async function verifyOne(page, file, { w, h }) {
  await page.setViewport({ width: w, height: h, deviceScaleFactor: 1 });
  await page.goto(`file://${file}`, { waitUntil: "load" });
  await new Promise((r) => setTimeout(r, 300));
  await page.evaluate(recorder);
  await scrollThrough(page, FRAMES_PER_STEP);

  const rec = await page.evaluate(() => window.__rec);
  const shape = await page.evaluate(() => {
    const doc = document.scrollingElement;
    const scroller = document.querySelector(".scrolly-steps");
    const port = scroller.getBoundingClientRect();
    const lanePct = Number(
      document.querySelector(".scrolly").getAttribute("data-prose-lane"),
    );
    const panels = Array.from(document.querySelectorAll(".step-panel"));
    return {
      docScrollable: doc.scrollHeight - doc.clientHeight,
      horizontalOverflow: doc.scrollWidth - doc.clientWidth,
      lane: Math.round((lanePct / 100) * port.height),
      offset: parseFloat(getComputedStyle(panels[0]).bottom) || 0,
      tallestPanel: Math.round(
        Math.max(...panels.map((p) => p.getBoundingClientRect().height)),
      ),
    };
  });

  const where = `${file.split("/").slice(-2).join("/")} @ ${w}x${h}`;
  const failures = [];
  const notes = [];
  if (rec.length < 20)
    failures.push(`${where}: only ${rec.length} animation frames recorded`);

  // A — the page does not scroll.
  if (shape.docScrollable > 1)
    failures.push(
      `${where}: the DOCUMENT has ${shape.docScrollable}px of scroll; the component must own its own scroll`,
    );
  if (shape.horizontalOverflow > 1)
    failures.push(`${where}: ${shape.horizontalOverflow}px of horizontal overflow`);

  // B, C — the graphic and the header never move.
  for (const part of ["graphic", "header"]) {
    const first = rec[0][part];
    const moved = rec.find((s) => !same(s[part], first));
    if (moved)
      failures.push(
        `${where}: the ${part} MOVED — ${JSON.stringify(first)} at the top, ` +
          `${JSON.stringify(moved[part])} at scroll ${moved.y}`,
      );
  }

  // D — every step's frame is painted, in the order it is declared.
  const order = rec[0].frames.map((f) => f.id);
  const arrival = new Map();
  for (const s of rec)
    for (const f of s.frames)
      if (f.o >= SETTLED && !arrival.has(f.id)) arrival.set(f.id, s.y);
  // D2 — how many times each step was handed `active`. One boundary, one handover.
  const handovers = new Map(order.map((id) => [id, 0]));
  let held = null;
  for (const s of rec) {
    const now = s.frames.find((f) => f.active);
    const id = now ? now.id : null;
    if (id && id !== held) handovers.set(id, (handovers.get(id) || 0) + 1);
    held = id;
  }
  const flapping = [...handovers].filter(([, n]) => n > 1);
  if (flapping.length)
    failures.push(
      `${where}: the active step OSCILLATED — ` +
        flapping.map(([id, n]) => `${id} became active ${n} times`).join(", ") +
        `; one continuous pass must hand each step the class exactly once`,
    );

  // D3 — the graphic settles once the reader stops.
  const last = rec[rec.length - 1].frames;
  const settled = last.filter((f) => f.o >= 0.999);
  if (settled.length !== 1 || last.some((f) => f.o > 0.001 && f.o < 0.999))
    failures.push(
      `${where}: the graphic did not settle after the scroll stopped — ` +
        JSON.stringify(last.map((f) => `${f.id}=${f.o}`)),
    );

  const missing = order.filter((id) => !arrival.has(id));
  if (missing.length)
    failures.push(
      `${where}: ${missing.length} of ${order.length} step frames were NEVER painted during a ` +
        `continuous scroll — ${JSON.stringify(missing)}; painted: ` +
        JSON.stringify([...arrival.keys()]),
    );
  else {
    const seen = [...arrival.keys()];
    if (seen.join(">") !== order.join(">"))
      failures.push(
        `${where}: frames arrived out of order — ${seen.join(" > ")} against ${order.join(" > ")}`,
      );
  }

  // E — one panel at a time.
  const doubled = rec.find((s) => s.painted.length > 1);
  if (doubled)
    failures.push(
      `${where}: ${doubled.painted.length} panels painted at once at scroll ${doubled.y} — ` +
        JSON.stringify(doubled.painted.map((p) => p.id)),
    );

  // F — a painted panel is inside the lane, wherever the lane can hold it.
  const fits = shape.tallestPanel + shape.offset <= shape.lane;
  const escaped = rec
    .flatMap((s) => s.painted.map((p) => ({ ...p, y: s.y })))
    .filter((p) => p.aboveLane > 1);
  if (fits && escaped.length)
    failures.push(
      `${where}: a panel was painted ${Math.max(...escaped.map((p) => p.aboveLane))}px ABOVE the ` +
        `lane's own top, at ${escaped.length} animation frames (first at scroll ${escaped[0].y}) — ` +
        `the lane is what every frame keeps its labels clear of`,
    );
  if (!fits)
    notes.push(
      `${where}: prose does not fit its lane — tallest panel ${shape.tallestPanel}px + ` +
        `${Math.round(shape.offset)}px offset against a ${shape.lane}px lane. F is not asserted here.`,
    );

  // Reported, never asserted — see this file's own header.
  const collided = rec.filter((s) => s.collisions.length);
  if (collided.length)
    notes.push(
      `${where}: prose covered a frame's own label at ${collided.length}/${rec.length} frames — ` +
        JSON.stringify([
          ...new Set(collided.flatMap((s) => s.collisions.map((c) => `${c.frame}:${c.text}`))),
        ].slice(0, 6)),
    );

  return { where, failures, notes, frames: rec.length, arrival: [...arrival.entries()] };
}

/** Reduced motion is an instant cut, and JavaScript off still shows one frame and every word. */
export async function verifyStates(browser, file) {
  const out = { failures: [], notes: [] };
  const name = file.split("/").slice(-2).join("/");

  const reduced = await browser.newPage();
  await reduced.setViewport({ width: 1600, height: 900 });
  await reduced.emulateMediaFeatures([
    { name: "prefers-reduced-motion", value: "reduce" },
  ]);
  await reduced.goto(`file://${file}`, { waitUntil: "load" });
  await reduced.evaluate(recorder);
  // A quarter of the reading dwell, deliberately: under `reduce` there is no transition to wait
  // for — that is the whole claim — so a slow pass would only spend time proving it again. If a
  // transition survived the media query, a fast pass is MORE likely to catch it mid-flight, not
  // less.
  await scrollThrough(reduced, Math.round(FRAMES_PER_STEP / 4));
  const rec = await reduced.evaluate(() => window.__rec);
  const between = rec.flatMap((s) =>
    s.frames.filter((f) => f.o > 0.001 && f.o < 0.999).map((f) => `${f.id}=${f.o}@${s.y}`),
  );
  if (between.length)
    out.failures.push(
      `${name} @ reduce: ${between.length} intermediate frame opacities — ${between.slice(0, 4).join(", ")}`,
    );
  const reducedArrivals = new Set(
    rec.flatMap((s) => s.frames.filter((f) => f.o >= SETTLED).map((f) => f.id)),
  );
  if (reducedArrivals.size !== rec[0].frames.length)
    out.failures.push(
      `${name} @ reduce: only ${reducedArrivals.size} of ${rec[0].frames.length} frames were painted`,
    );
  await reduced.close();

  const nojs = await browser.newPage();
  await nojs.setJavaScriptEnabled(false);
  await nojs.setViewport({ width: 1600, height: 900 });
  await nojs.goto(`file://${file}`, { waitUntil: "load" });
  const still = await nojs.evaluate(() => ({
    active: Array.from(document.querySelectorAll(".step-frame.active")).length,
    live: document.querySelector(".scrolly").classList.contains("scrolly--live"),
    prose: Array.from(document.querySelectorAll(".step-panel")).map(
      (p) => p.textContent.trim().length,
    ),
    scrollable:
      document.querySelector(".scrolly-steps").scrollHeight -
      document.querySelector(".scrolly-steps").clientHeight,
  }));
  if (still.active !== 1)
    out.failures.push(`${name} @ no-JS: ${still.active} frames carry \`active\`, expected 1`);
  if (still.live) out.failures.push(`${name} @ no-JS: \`scrolly--live\` was baked into the markup`);
  if (still.prose.some((n) => n === 0))
    out.failures.push(`${name} @ no-JS: a step's prose is empty — ${JSON.stringify(still.prose)}`);
  if (still.scrollable < 1)
    out.failures.push(
      `${name} @ no-JS: the prose column has no scroll distance, so the reader cannot reach step 2`,
    );
  await nojs.close();
  return out;
}

/** Drives every file at every width, plus the two state checks per file, on ONE browser. */
export async function verifyAll(files, widths = WIDTHS) {
  const browser = await puppeteer.launch({
    executablePath: resolveChrome(),
    headless: true,
    args: ["--allow-file-access-from-files", "--font-render-hinting=none"],
  });
  const failures = [];
  const notes = [];
  try {
    const page = await browser.newPage();
    for (const file of files) {
      for (const size of widths) {
        const r = await verifyOne(page, file, size);
        failures.push(...r.failures);
        notes.push(...r.notes);
      }
      const s = await verifyStates(browser, file);
      failures.push(...s.failures);
      notes.push(...s.notes);
    }
    await page.close();
  } finally {
    await browser.close();
  }
  return { failures, notes };
}

if (import.meta.main) {
  const argv = process.argv.slice(2);
  const only = argv.find((a) => a.startsWith("--width="));
  const widths = only
    ? WIDTHS.filter((s) => String(s.w) === only.split("=")[1])
    : WIDTHS;
  const { failures, notes } = await verifyAll(
    argv.filter((a) => !a.startsWith("--")),
    widths,
  );
  for (const n of notes) console.log(`note   ${n}`);
  for (const f of failures) console.log(`FAIL   ${f}`);
  console.log(`${failures.length} failures, ${notes.length} notes`);
  process.exit(failures.length ? 1 : 0);
}
