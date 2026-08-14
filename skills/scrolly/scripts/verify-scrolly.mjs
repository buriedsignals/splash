// twin/skills/scrolly/scripts/verify-scrolly.mjs
//
// THE GUARD THAT WATCHES A CONTINUOUS SCROLL, and the reason it exists is that the instrument this
// format had been verified with could not see the defect that broke every beat on disk.
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
//   F. THE CARD IS CENTRED, OVER THE VISUAL, OPAQUE, AND ONE OF TWO WIDTHS. This is the NINTH
//      correction, and it is assertion F pointed the other way: the eighth required that no panel
//      ever touch the graphic, which is exactly the side column the owner rejected — "le panel avec
//      le texte ne doit pas être sur le côté mais centré et par dessus le contenu visuel." Four
//      sub-assertions, because the form only works if all four hold at once:
//        F1 CENTRED — every painted card's horizontal centre is the graphic's own, within 2px, at
//           every recorded animation frame. A card that drifts to a side is the column returning.
//        F2 OVER — every painted card's box lies inside the graphic's, and at some recorded frame a
//           card overlaps the graphic's own vertical middle. A card that only ever meets the edge of
//           the visual is beside it in all but name.
//        F3 OPAQUE, IN THE RENDER'S OWN GROUND — read off `getComputedStyle` in the driven browser,
//           not off the stylesheet: the card's background is fully opaque (alpha 1), there is
//           exactly ONE background colour across the whole pass, and ink-on-that-background measures
//           at least 4.5:1 by the WCAG formula. This is what makes an opaque card a legitimate
//           answer to the collision problem at all — a translucent card's effective colour is a
//           blend with whatever the graphic shows behind it, which is not a value anyone can
//           measure. `renderScrolly` asserts the same pairing at build time; this asserts what the
//           browser actually painted.
//        F4 ONE OF TWO WIDTHS — the card is at most 70% of the graphic's width, or the whole of it.
//           The in-between shape is the one that reads as a bug: a label the card's own VERTICAL
//           edge cuts down the middle is broken text for every frame the card spends at that row,
//           and frames keep their margin furniture in their outer ~15%. Measured at 375px, the
//           in-between shape sliced the seed's own y-axis labels for 42 consecutive frames; edge to
//           edge it slices nothing.
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
// WHAT IS REPORTED BUT NOT ASSERTED, and why. THE CENSUS OF WHAT THE CARD COVERS: how many
// animation frames of the pass a card sat over one of the active frame's own labels, how many it sat
// over nothing at all, and — the number that matters — the longest RUN of consecutive frames on
// which a label was SLICED across its width by the card's own vertical edge. A label fully behind
// the card reads as absent, which is what a card over a picture means; a label cut down the middle
// reads as broken, which is the defect the owner reported the last time a card was centred ("the
// 'flood day' label reduced to 'flo…'"). F4 is the vehicle's own lever against it and it closes the
// narrow-viewport case outright; what is left on a desktop is the beat's own composition — where a
// beat puts a label, against a stripe whose footprint in the frame's own coordinates changes with
// the viewport — and the vehicle cannot move a beat's marks. Also reported: whether the tallest card
// FITS the frame it travels over.
//
// Usage: bun skills/scrolly/scripts/verify-scrolly.mjs <file.html> [more.html...] [--width=W]

import puppeteer from "puppeteer-core";
import { existsSync, readdirSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

/** A DUPLICATE of the `resolveChrome` every capture script in this tree carries — see
 *  `map-web/test/standalone.test.ts`'s own copy for why these are duplicated rather than
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
      `no Chrome to drive — looked at ${candidates.join(", ")}. This format is verified by driving a ` +
        `real browser and by nothing else; there is no fallback that would prove anything.`,
    );
  return found;
}

/** Desktop, laptop, phone — the three shapes this format is checked at. */
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
    // THE LANE IS THE SCROLLPORT ITSELF — which, since the ninth correction, covers the graphic edge
    // to edge again. "In the lane" and "inside the element that scrolls" are the same fact, read off
    // the same rect.
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
      cards: [],
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
      // The card as a READER sees it: its own box clipped by the layer that scrolls it. A card
      // riding out past the top of the frame has a rect that reaches above the graphic while
      // nothing of it is painted there.
      const clipped = {
        left: Math.max(r.left, port.left),
        right: Math.min(r.right, port.right),
        top: Math.max(r.top, port.top),
        bottom: Math.min(r.bottom, port.bottom),
      };
      if (clipped.right <= clipped.left || clipped.bottom <= clipped.top) continue;
      const style = getComputedStyle(p);
      sample.cards.push({
        id: id,
        box: [
          Math.round(clipped.left),
          Math.round(clipped.top),
          Math.round(clipped.right),
          Math.round(clipped.bottom),
        ],
        // WHAT THE BROWSER PAINTED, not what the stylesheet asked for. A card declaring an opaque
        // colour is not proof it was painted opaque at the moment its text crosses the graphic.
        bg: style.backgroundColor,
        ink: style.color,
      });
      visible.push(clipped);
    }
    for (const f of frames) {
      if (Number(getComputedStyle(f).opacity) <= PAINTED) continue;
      for (const el of labels.get(f)) {
        const raw = el.getBoundingClientRect();
        if (raw.width === 0 || raw.height === 0) continue;
        // Clipped by the GRAPHIC's own box: a label whose box runs past it is cut at that edge and
        // painted nowhere. Measuring the raw rect reported four beats' photo credits as colliding
        // with prose that was two hundred pixels away from anything the reader could see.
        const r = {
          left: Math.max(raw.left, graphicBox.left),
          right: Math.min(raw.right, graphicBox.right),
          top: Math.max(raw.top, graphicBox.top),
          bottom: Math.min(raw.bottom, graphicBox.bottom),
        };
        if (r.right <= r.left || r.bottom <= r.top) continue;
        for (const v of visible) {
          if (!hits(r, v)) continue;
          const ix = Math.min(r.right, v.right) - Math.max(r.left, v.left);
          sample.collisions.push({
            frame: f.getAttribute("data-step"),
            text: (el.textContent || "").trim().slice(0, 30),
            // The share of the label's WIDTH the card covers. Strictly between 0 and 1 means the
            // card's own vertical edge is cutting the label in two — the run of frames that stays
            // true is the census number that matters.
            shareX: (ix / (r.right - r.left)).toFixed(3),
          });
        }
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

/** `rgb(r, g, b)` / `rgba(r, g, b, a)` — what `getComputedStyle` hands back — to `[r, g, b, a]`.
 *  Anything unparseable is treated as translucent, so an unrecognised colour FAILS loudly rather
 *  than passing by default. */
function parseCss(colour) {
  const m = String(colour).match(
    /^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:[,/\s]+([\d.]+))?\s*\)$/,
  );
  if (!m) return null;
  return [Number(m[1]), Number(m[2]), Number(m[3]), m[4] === undefined ? 1 : Number(m[4])];
}

function isOpaque(colour) {
  const c = parseCss(colour);
  return c !== null && c[3] >= 1;
}

/** WCAG 2.x relative-luminance contrast between two CSS colours. A DUPLICATE of the `contrast`
 *  `scripts/render-still.mjs` exports — that one takes hex and runs at build time; this one takes
 *  what a browser reports and runs against what was actually painted. A skill's own scripts stay
 *  copy-pasteable, so the formula is written out rather than imported across the seam. */
function contrastOfCss(a, b) {
  const lum = (colour) => {
    const c = parseCss(colour);
    if (!c) return null;
    const [r, g, bl] = c.slice(0, 3).map((v) => {
      const s = v / 255;
      return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * bl;
  };
  const la = lum(a);
  const lb = lum(b);
  if (la === null || lb === null) return 0;
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

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
      graphicBox: [Math.round(g.width), Math.round(g.height)],
      // Which of the two width regimes the browser actually chose — read off the rendered card, not
      // off the media query, so the report says what was laid out rather than what was intended.
      cardWidth: Math.round(
        Math.max(...panels.map((p) => p.getBoundingClientRect().width)),
      ),
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

  // F — the card is centred, over the visual, opaque in the render's own ground, and one of two
  // widths. The ninth correction's whole claim, and the exact reverse of the eighth's.
  const [gx, gy, gw, gh] = rec[0].graphic;
  const graphicCentre = gx + gw / 2;
  const cardFrames = rec.filter((s) => s.cards.length);
  if (!cardFrames.length)
    failures.push(
      `${where}: no card was painted on any of ${rec.length} animation frames — the prose is meant ` +
        `to travel over the visual, and a reader saw none of it`,
    );

  // F1 — centred.
  const offCentre = rec
    .flatMap((s) => s.cards.map((c) => ({ y: s.y, c })))
    .find(({ c }) => Math.abs((c.box[0] + c.box[2]) / 2 - graphicCentre) > 2);
  if (offCentre)
    failures.push(
      `${where}: card ${offCentre.c.id} sat at x ${offCentre.c.box[0]}..${offCentre.c.box[2]} ` +
        `(centre ${((offCentre.c.box[0] + offCentre.c.box[2]) / 2).toFixed(1)}) against a graphic ` +
        `centred on ${graphicCentre} at scroll ${offCentre.y} — the card is centred over the ` +
        `visual, never off to a side`,
    );

  // F2 — over the visual, and over its MIDDLE at some point, not only its edge.
  const outside = rec
    .flatMap((s) => s.cards.map((c) => ({ y: s.y, c })))
    .find(
      ({ c }) =>
        c.box[0] < gx - 1 ||
        c.box[2] > gx + gw + 1 ||
        c.box[1] < gy - 1 ||
        c.box[3] > gy + gh + 1,
    );
  if (outside)
    failures.push(
      `${where}: card ${outside.c.id} was painted at ${JSON.stringify(outside.c.box)}, outside the ` +
        `graphic's own ${JSON.stringify(rec[0].graphic)} at scroll ${outside.y} — the card travels ` +
        `over the visual, not beside it`,
    );
  const crossedMiddle = rec.some((s) =>
    s.cards.some((c) => c.box[1] < gy + gh / 2 && c.box[3] > gy + gh / 2),
  );
  if (cardFrames.length && !crossedMiddle)
    failures.push(
      `${where}: no card ever reached the graphic's own vertical middle — a card that only meets ` +
        `the edge of the visual is beside it in all but name`,
    );

  // F3 — opaque, one colour, and legible against it. Read off the live computed styles.
  const bgs = [...new Set(rec.flatMap((s) => s.cards.map((c) => c.bg)))];
  const translucent = bgs.filter((b) => !isOpaque(b));
  if (translucent.length)
    failures.push(
      `${where}: the card was painted ${translucent.join(", ")} — a translucent card's effective ` +
        `colour is a blend with whatever the graphic shows behind it, which is not a value anyone ` +
        `can measure; the card is opaque or the contrast claim is empty`,
    );
  if (bgs.length > 1)
    failures.push(
      `${where}: the card was painted in ${bgs.length} different backgrounds — ${bgs.join(", ")}; ` +
        `one render, one ground`,
    );
  const inks = [...new Set(rec.flatMap((s) => s.cards.map((c) => c.ink)))];
  for (const bg of bgs)
    for (const ink of inks) {
      const ratio = contrastOfCss(ink, bg);
      if (ratio < 4.5)
        failures.push(
          `${where}: the card painted ${ink} on ${bg} — ${ratio.toFixed(2)}:1, under the 4.5:1 ` +
            `floor the whole opaque-card answer rests on`,
        );
    }

  // F4 — one of two widths, never the in-between shape that slices a label down its side.
  const widths = [...new Set(rec.flatMap((s) => s.cards.map((c) => c.box[2] - c.box[0])))];
  for (const w of widths) {
    const share = w / gw;
    if (share > 0.7 && w < gw - 2)
      failures.push(
        `${where}: the card rendered ${w}px against a ${gw}px graphic — ${Math.round(share * 100)}%, ` +
          `the in-between shape: its own vertical edges land in the outer band where a frame keeps ` +
          `its axis furniture, and a label cut down the middle reads as broken text for every frame ` +
          `the card spends at that row. At most 70% of the frame, or the whole of it`,
      );
  }

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
  const clearFrames = rec.filter((s) => s.cards.length === 0).length;
  notes.push(
    `${where}: graphic ${shape.graphicBox.join("x")}, card ${shape.cardWidth}x${shape.tallestPanel} ` +
      `(${Math.round((shape.cardWidth / shape.graphicBox[0]) * 100)}% of the frame's width, ` +
      `${Math.round((shape.tallestPanel / shape.graphicBox[1]) * 100)}% of its height); the visual ` +
      `stood entirely clear on ${clearFrames}/${rec.length} frames; travel per card ` +
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
      `${where}: the tallest card (${shape.tallestPanel}px) is taller than the ${shape.lane}px ` +
        `frame it travels over, so it is legible on the way through and never all at once`,
    );

  // THE CENSUS OF WHAT THE CARD COVERS — reported, never asserted; see this file's own header for
  // why the SLICED run is the number that matters and the total is only context.
  const collided = rec.filter((s) => s.collisions.length);
  if (collided.length) {
    const runs = new Map();
    const open = new Map();
    for (const s of rec) {
      const cutNow = new Set();
      for (const c of s.collisions) {
        const share = Number(c.shareX);
        if (!(share > 0.04 && share < 0.96)) continue;
        const key = `${c.frame}:${c.text}`;
        cutNow.add(key);
        const run = (open.get(key) || 0) + 1;
        open.set(key, run);
        if (run > (runs.get(key) || 0)) runs.set(key, run);
      }
      for (const key of [...open.keys()]) if (!cutNow.has(key)) open.delete(key);
    }
    const sliced = [...runs.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4);
    notes.push(
      `${where}: the card covered a frame's own label on ${collided.length}/${rec.length} frames — ` +
        JSON.stringify(
          [...new Set(collided.flatMap((s) => s.collisions.map((c) => `${c.frame}:${c.text}`)))].slice(0, 6),
        ) +
        `; longest SLICED run ` +
        (sliced.length ? sliced.map(([k, n]) => `${k} ${n}f`).join(", ") : "none"),
    );
  }

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
