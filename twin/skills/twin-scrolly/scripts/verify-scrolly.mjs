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
// AND THEN IT WAS BLIND ANYWAY, FOR ONE ROUND, BECAUSE OF WHAT IT ASKED. Everything above is about
// the INSTRUMENT. The round that fixed the instrument closed the last prose-over-annotation
// collision by PINNING each panel in a reserved band — and every assertion in this file went green
// and stayed green, because not one of them was about whether the words MOVE. The owner drove it:
// "le panel avec le texte ne bouge plus alors que l'effet c'est vraiment de les faire défiler au
// scroll vers le haut." Run over those same shipped artifacts with assertion G added, this file
// measured the middle panels holding ONE screen offset for 42-45% of every scroll-advancing
// animation frame and the last panel for 78%, sweeping 187px of an 821px track at 1600x900. A guard
// that only ever asks WHICH step is showing cannot see a page that has stopped moving.
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
//   E. AT MOST TWO PANELS SHARE THE LANE. Two are on screen through every boundary — that is what
//      travelling prose looks like — but three would mean the steps are shorter than the prose in
//      them, and the reader is being handed a wall rather than a sequence.
//   F. NO PANEL IS EVER PAINTED OVER THE GRAPHIC. The VISIBLE part of every panel (its box
//      intersected with the prose column's own clip rect) is measured against the graphic's box, and
//      the two must never meet. This is the structural claim of the eighth correction: the prose has
//      its own space, so a collision is impossible by construction rather than avoided by a
//      reservation. Under the model this replaced the two layers shared one box and this assertion
//      cannot hold at all.
//   G. THE PROSE TRAVELS, and this is the assertion that was missing. Every earlier check on this
//      vehicle asked WHICH step was painted and none of them asked whether the words MOVE, so a
//      panel parked motionless for the whole of its step passed everything. For each panel, over
//      the frames where it shares the lane: it must sweep a real distance, and it must not HOLD one
//      offset — measured as the fraction of scroll-advancing animation frames at which its own top
//      did not move at all. It must also be seen entirely below the lane before it arrives (every
//      panel but the first) and entirely above it after it leaves (every panel but the last).
//   H. THE VISUAL EVOLVES BETWEEN BOUNDARIES, and this is the second assertion whose absence let a
//      slideshow ship. The vehicle published a step state and a boundary transition that finishes
//      exactly when the step flips, so a consumer had nothing to read while the reader scrolled
//      through the MIDDLE of a step: "on y est pas du tout... faut que ce soit fluide et que
//      l'élément évolue au fur et à mesure du temps." `data-progress` — the fractional index of the
//      panel on the lane's centre line — is now published on every scroll, and this asserts that it
//      is present, that it never goes backwards on a forward pass, that it spans the whole range,
//      that it CHANGES on the frames where the active step does NOT (the discrete signal cannot be
//      standing in for the continuous one), and that the two stay in LOCK-STEP: the active step is
//      never more than half a step away from where the progress says the reader is, which is what
//      keeps a scrubbed drawing and the caption beside it describing the same moment.
//
// WHAT IS REPORTED BUT NOT ASSERTED, and why: the census of prose-over-annotation collisions, kept
// from the round before this one. F now makes it structurally empty at every width, so a non-zero
// count is a fact about a beat whose own frame paints outside the graphic box, and the vehicle
// cannot move a beat's marks. Also reported: whether the tallest panel FITS the band it travels in
// — a panel taller than its own band is legible on the way through and never all at once, which is
// a fact about that beat's prose and not something this file may assert away.
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
  const root = document.querySelector(".scrolly");

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
    // THE LANE IS THE PROSE COLUMN ITSELF — its whole box, not a band inside a shared one. Since
    // the eighth correction the prose has its own space (a column beside the graphic on a wide
    // viewport, a band below it on a phone), so "in the lane" and "inside the element that
    // scrolls" are the same fact, read off the same rect.
    const port = scroller.getBoundingClientRect();
    const graphicBox = graphic.getBoundingClientRect();
    const progressAttr = root.getAttribute("data-progress");
    const sample = {
      y: Math.round(scroller.scrollTop),
      graphic: box(graphic),
      header: box(header),
      // The CONTINUOUS signal, read as the consumer reads it: off the root, once per animation
      // frame, never re-derived here. `null` when the attribute is absent, which is itself a
      // failure — a consumer with nothing to scrub against is the defect this assertion exists for.
      progress: progressAttr === null ? null : Number(progressAttr),
      lane: [Math.round(port.top), Math.round(port.bottom)],
      frames: frames.map((f) => ({
        id: f.getAttribute("data-step"),
        o: Number(Number(getComputedStyle(f).opacity).toFixed(3)),
        active: f.classList.contains("active"),
      })),
      // EVERY panel, every frame, whatever its opacity — the travel assertion is about geometry,
      // and a check that only looked at painted panels would be blind to a panel hidden while it
      // moves, which is exactly the shape a "fix" for this could take.
      panels: [],
      painted: [],
      overGraphic: [],
      collisions: [],
    };
    const visible = [];
    for (const p of panels) {
      const o = Number(getComputedStyle(p).opacity);
      const r = p.getBoundingClientRect();
      const id = p.getAttribute("data-step");
      sample.panels.push({
        id: id,
        top: Math.round(r.top),
        bottom: Math.round(r.bottom),
        inLane: r.bottom > port.top && r.top < port.bottom,
      });
      if (o <= PAINTED) continue;
      if (r.width === 0 || r.bottom <= port.top || r.top >= port.bottom) continue;
      // The panel as a READER sees it: its own box clipped by the column that scrolls it. A panel
      // riding out of a phone's band has a rect that reaches into the graphic's box while nothing
      // of it is painted there, so the raw rect would report a collision the reader never sees.
      const clipped = {
        left: Math.max(r.left, port.left),
        right: Math.min(r.right, port.right),
        top: Math.max(r.top, port.top),
        bottom: Math.min(r.bottom, port.bottom),
      };
      if (clipped.right <= clipped.left || clipped.bottom <= clipped.top) continue;
      sample.painted.push({
        id: id,
        top: Math.round(r.top),
        bottom: Math.round(r.bottom),
      });
      if (hits(clipped, graphicBox))
        sample.overGraphic.push({
          id: id,
          box: [
            Math.round(clipped.left),
            Math.round(clipped.top),
            Math.round(clipped.right),
            Math.round(clipped.bottom),
          ],
        });
      visible.push(clipped);
    }
    for (const f of frames) {
      if (Number(getComputedStyle(f).opacity) <= PAINTED) continue;
      for (const el of labels.get(f)) {
        const raw = el.getBoundingClientRect();
        if (raw.width === 0 || raw.height === 0) continue;
        // Clipped by the GRAPHIC's own cell, for the same reason the panel is clipped by the prose
        // column's: a label whose box runs past the cell is cut at that edge and painted nowhere.
        // Measuring the raw rect reported four beats' photo credits as colliding with prose that
        // was two hundred pixels away from anything the reader could see.
        const r = {
          left: Math.max(raw.left, graphicBox.left),
          right: Math.min(raw.right, graphicBox.right),
          top: Math.max(raw.top, graphicBox.top),
          bottom: Math.min(raw.bottom, graphicBox.bottom),
        };
        if (r.right <= r.left || r.bottom <= r.top) continue;
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
    const graphic = document.querySelector(".scrolly-graphic");
    const port = scroller.getBoundingClientRect();
    const panels = Array.from(document.querySelectorAll(".step-panel"));
    const g = graphic.getBoundingClientRect();
    return {
      docScrollable: doc.scrollHeight - doc.clientHeight,
      horizontalOverflow: doc.scrollWidth - doc.clientWidth,
      lane: Math.round(port.height),
      laneWidth: Math.round(port.width),
      graphicBox: [Math.round(g.width), Math.round(g.height)],
      // Side by side, or stacked? Read off the two rects rather than off the media query, so the
      // report says what the browser actually laid out.
      split: g.right <= port.left + 1 ? "columns" : "rows",
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

  // E — at most two panels share the lane. Two IS travel; three is a wall of prose.
  const crowded = rec.find((s) => s.panels.filter((p) => p.inLane).length > 2);
  if (crowded)
    failures.push(
      `${where}: ${crowded.panels.filter((p) => p.inLane).length} panels shared the lane at scroll ` +
        `${crowded.y} — ${JSON.stringify(crowded.panels.filter((p) => p.inLane).map((p) => p.id))}; ` +
        `a step must be taller than the prose in it`,
    );

  // F — no panel is ever painted over the graphic. The eighth correction's whole claim.
  const over = rec.filter((s) => s.overGraphic.length);
  if (over.length)
    failures.push(
      `${where}: prose was painted OVER the graphic at ${over.length}/${rec.length} animation ` +
        `frames (first at scroll ${over[0].y}, panel ${over[0].overGraphic[0].id} at ` +
        `${JSON.stringify(over[0].overGraphic[0].box)} against a graphic at ` +
        `${JSON.stringify(rec[0].graphic)}) — the prose has its own space; the two may never meet`,
    );

  // G — the prose TRAVELS. Measured only over the frames where the reader could see it, and only
  // across scroll-advancing frames, so the recorder's own aliasing (two ticks at one scrollTop)
  // cannot be mistaken for a panel holding still.
  const travel = [];
  for (const [i, id] of order.entries()) {
    let minTop = Infinity;
    let maxTop = -Infinity;
    let advanced = 0;
    let held = 0;
    let seenBelow = false;
    let seenAbove = false;
    let prev = null;
    for (const s of rec) {
      const p = s.panels.find((q) => q.id === id);
      if (!p) continue;
      const laneTop = s.lane[0];
      const laneBottom = s.lane[1];
      if (p.top >= laneBottom) seenBelow = true;
      if (p.bottom <= laneTop) seenAbove = true;
      if (p.inLane) {
        minTop = Math.min(minTop, p.top);
        maxTop = Math.max(maxTop, p.top);
        if (prev && prev.y !== s.y) {
          advanced += 1;
          if (Math.abs(p.top - prev.top) < 1) held += 1;
        }
      }
      prev = { y: s.y, top: p.top };
    }
    const swept = maxTop === -Infinity ? 0 : maxTop - minTop;
    const heldShare = advanced ? held / advanced : 1;
    travel.push({ id, swept, held, advanced, heldShare, seenBelow, seenAbove, i });
  }
  const laneHeight = shape.lane;
  for (const t of travel) {
    if (t.swept < laneHeight * 0.5)
      failures.push(
        `${where}: panel ${t.id} swept only ${t.swept}px of a ${laneHeight}px lane — the prose is ` +
          `meant to travel the full height of its own column, not to be revealed in place`,
      );
    if (t.heldShare > 0.15)
      failures.push(
        `${where}: panel ${t.id} HELD one offset for ${t.held} of ${t.advanced} scroll-advancing ` +
          `frames (${Math.round(t.heldShare * 100)}%) — a parked panel is a slideshow; the reader ` +
          `must see the words move past the graphic`,
      );
    if (t.i > 0 && !t.seenBelow)
      failures.push(
        `${where}: panel ${t.id} was never entirely below the lane — it did not ENTER from the ` +
          `bottom edge, it appeared`,
      );
    if (t.i < order.length - 1 && !t.seenAbove)
      failures.push(
        `${where}: panel ${t.id} was never entirely above the lane — it did not LEAVE past the ` +
          `top edge, it vanished`,
      );
  }
  notes.push(
    `${where}: ${shape.split} split — graphic ${shape.graphicBox.join("x")}, prose column ` +
      `${shape.laneWidth}x${shape.lane}; travel per panel ` +
      travel.map((t) => `${t.id} ${t.swept}px`).join(", "),
  );
  // H — the continuous signal. Read off the root exactly as a consumer reads it.
  const missingProgress = rec.filter((s) => s.progress === null || Number.isNaN(s.progress));
  if (missingProgress.length)
    failures.push(
      `${where}: no readable \`data-progress\` on ${missingProgress.length}/${rec.length} animation ` +
        `frames — a consumer has nothing to scrub a visual against, so the visual can only ever ` +
        `catch up at a step boundary`,
    );
  else {
    const backwards = rec.find((s, i) => i > 0 && s.progress < rec[i - 1].progress - 0.001);
    if (backwards)
      failures.push(
        `${where}: progress went BACKWARDS on a forward scroll — ` +
          `${rec[rec.indexOf(backwards) - 1].progress} then ${backwards.progress} at scroll ${backwards.y}`,
      );
    const first = rec[0].progress;
    const last = rec[rec.length - 1].progress;
    const top = order.length - 1;
    if (first > 0.15 || last < top - 0.15)
      failures.push(
        `${where}: progress spanned ${first.toFixed(2)}..${last.toFixed(2)} of an expected ` +
          `0..${top} — the signal does not reach the ends of the piece`,
      );
    // THE ONE THAT MATTERS. Between two boundaries the discrete state is constant by definition;
    // if the continuous one is constant too, the visual is a slideshow whatever else is true.
    let between = 0;
    let frozen = 0;
    let worstStill = null;
    let run = 0;
    for (let i = 1; i < rec.length; i++) {
      const prev = rec[i - 1];
      const now = rec[i];
      if (now.y === prev.y) continue;
      const held = now.frames.find((f) => f.active);
      const heldBefore = prev.frames.find((f) => f.active);
      if (!held || !heldBefore || held.id !== heldBefore.id) {
        run = 0;
        continue;
      }
      between += 1;
      if (Math.abs(now.progress - prev.progress) < 0.0005) {
        frozen += 1;
        run += 1;
        if (!worstStill || run > worstStill.run) worstStill = { run: run, y: now.y, p: now.progress };
      } else run = 0;
    }
    const frozenShare = between ? frozen / between : 1;
    if (frozenShare > 0.15)
      failures.push(
        `${where}: progress did not move on ${frozen} of ${between} scroll-advancing frames INSIDE ` +
          `a step (${Math.round(frozenShare * 100)}%` +
          (worstStill
            ? `, longest still run ${worstStill.run} frames ending at scroll ${worstStill.y}, ` +
              `progress stuck at ${worstStill.p}`
            : "") +
          `) — the element must evolve as the reader scrolls, not catch up at the handover`,
      );
    // LOCK-STEP. The scrub and the caption must describe the same moment.
    let worstDrift = null;
    for (const s of rec) {
      const active = s.frames.find((f) => f.active);
      if (!active) continue;
      const drift = Math.abs(s.progress - order.indexOf(active.id));
      if (!worstDrift || drift > worstDrift.drift)
        worstDrift = { drift: drift, y: s.y, id: active.id, progress: s.progress };
    }
    if (worstDrift && worstDrift.drift > 0.65)
      failures.push(
        `${where}: the step and the progress drifted ${worstDrift.drift.toFixed(2)} steps apart ` +
          `at scroll ${worstDrift.y} (step ${worstDrift.id}, progress ${worstDrift.progress}) — ` +
          `a scrubbed visual and the words beside it must describe the same moment`,
      );
    notes.push(
      `${where}: progress ${first.toFixed(2)}..${last.toFixed(2)}, still on ${frozen}/${between} ` +
        `in-step frames, worst step/progress drift ${worstDrift ? worstDrift.drift.toFixed(2) : "n/a"}`,
    );
  }

  if (shape.tallestPanel > shape.lane)
    notes.push(
      `${where}: the tallest panel (${shape.tallestPanel}px) is taller than the ${shape.lane}px ` +
        `column it travels in, so it is legible on the way through and never all at once`,
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
