// twin/skills/map-web/scripts/verify-interaction.mjs
//
// Drives the beat this skill's own seed produces, in a real browser, with real input — the check
// `references/map-web-discipline.md`'s "Verification" section has always demanded in prose and that
// nothing mechanical performed until this file existed.
//
// WHICH LAYER IT DRIVES, said before anything else because it was not said for a while and the
// audit had to measure it: THE FALLBACK. Ruling R1 made map × web a live MapTiler map in two
// layers, and the page rendered here carries the R1b placeholder rather than a key, so the live
// layer never boots and every check below is about the baked plate, its circles and its HTML
// overlay. That is a layer worth guarding — it is what a reader gets offline, with JavaScript off
// and on the day a key is rotated — but it is not the beat's live map, and this file must never be
// read as proving one. The live map's own probe is `scripts/verify-live-map.mjs`, run from
// `test/live-map.test.ts` against a keyed copy in a temp directory. §0 below asserts the reading
// rather than trusting it.
//
// WHY REAL INPUT, AND WHY THAT IS THE WHOLE POINT. This format already shipped one defect of exactly
// the shape this file exists to catch: an HTML overlay without `pointer-events: none` sat on top of
// the map and swallowed every hover, while keyboard focus still worked perfectly — because
// `element.focus()` does not hit-test. A checker written the easy way (`el.dispatchEvent(new
// PointerEvent("pointerenter"))`, or `el.focus()`, or reading `data-detail` out of the markup)
// PASSES in that broken world, because none of those three ever asks the browser "what is actually
// at this pixel?". So every pointer assertion below goes through:
//   1. `document.elementFromPoint(x, y)` — the browser's own hit test — asserting the element at the
//      point's centre IS that point's own button, not something covering it; and
//   2. `page.mouse.move` / `page.mouse.click`, which puppeteer sends through Chrome's Input domain
//      as genuine trusted input at real viewport coordinates, hit-tested like a human's.
// A single missing `pointer-events: none` turns both red.
//
// WHERE THE EXPECTED VALUES COME FROM. Every expected string is computed HERE from
// `assets/sample-data/regions.json` — the same file the render reads — never from the rendered
// markup. Comparing the tooltip against the page's own `data-detail` would prove only that the page
// agrees with itself, which it always does, including when both are wrong.
//
// WHAT THIS PROVABLY DOES NOT CATCH. It is a behaviour check, not a picture check: it says nothing
// about whether a label collides with another label, whether the plate is the right camera, whether
// a colour is legible, or whether the numbers are true. Those need `render-preview.mjs` and a
// person looking — `SKILL.md`'s own gotcha, unchanged. It also drives ONE browser engine (the
// Chrome puppeteer resolves), and `:has()`/container-query support is assumed rather than probed.
//
// Usage:  bun skills/map-web/scripts/verify-interaction.mjs [--html <file>] [--keep]
//   no --html: renders this skill's own seed into a temp dir first, exactly as it ships.

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { homedir, tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import puppeteer from "puppeteer-core";
import { render, DEFAULT_PLATE_DIR, DEFAULT_DATA_PATH } from "./render-web.mjs";
import { drawOrder, groupsOf, slugOf, fr } from "../assets/geo-symbol.ts";
import {
  csvSplitByHand,
  duplicatedPayload,
  marksFromSource,
  revealDashInScreenSpace,
} from "./verify-guards.mjs";
import { tableCarriesTheMarks } from "./detect-accessible-table.mjs";
import {
  FLOOR_FRACTION,
  graphicFillsItsFrame,
} from "./detect-fills-its-frame.mjs";

/** The four widths this format's own proof covers, each paired with a plausible window HEIGHT —
 *  height is half the question now that the beat is required to fit the window, and a width with no
 *  height attached cannot ask it. */
const VIEWPORTS = [
  { w: 1600, h: 900 },
  { w: 1024, h: 768 },
  { w: 768, h: 1024 },
  { w: 375, h: 667 },
];

/** A DUPLICATE of `bake-plate.mjs`'s own `resolveChrome` — see `render-preview.mjs`'s copy for why
 *  this is duplicated rather than imported (importing the bake runs it). */
function resolveChrome() {
  const candidates = [];
  if (process.env.CHROME_PATH) candidates.push(process.env.CHROME_PATH);
  const cache = join(homedir(), ".cache/puppeteer/chrome");
  if (existsSync(cache))
    for (const build of readdirSync(cache).sort().reverse())
      candidates.push(
        join(cache, build, "chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing"),
        join(cache, build, "chrome-mac-x64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing"),
        join(cache, build, "chrome-linux64/chrome"),
      );
  candidates.push("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome");
  const found = candidates.find((path) => existsSync(path));
  if (!found)
    throw new Error(
      `no Chrome to drive with. Looked in:\n  ${candidates.join("\n  ")}\nSet CHROME_PATH, or run: bunx puppeteer browsers install chrome`,
    );
  return found;
}

const results = [];
function check(name, ok, detail) {
  results.push({ name, ok, detail });
  console.log(`${ok ? "ok  " : "FAIL"}  ${name}${detail ? `  — ${detail}` : ""}`);
}

/** The `.pt` button for `key`, its centre in viewport coordinates, and what the browser's own hit
 *  test finds there. `elementFromPoint` is the half a dispatched event cannot fake. */
function probePoint(page, key) {
  return page.evaluate((k) => {
    const button = document.querySelector(`.pt[data-key="${k}"]`);
    if (!button) return null;
    const r = button.getBoundingClientRect();
    const x = r.left + r.width / 2;
    const y = r.top + r.height / 2;
    const hit = document.elementFromPoint(x, y);
    return {
      x,
      y,
      inWindow: r.top >= 0 && r.bottom <= window.innerHeight && r.left >= 0 && r.right <= window.innerWidth,
      // POINTER-ACTIVE OR NOT, read off the page rather than assumed. The symbol seed makes every
      // mark a real 28px button. A choropleth does the opposite on purpose: only the regions too
      // small to land a pointer on keep a pointer-active button, and every other region is pointed
      // at through its own FILL — `ChoroplethWeb.tsx`'s `needsPointerTarget`, and live, the canvas
      // answers for all of them. Asserting the seed's invariant over a choropleth's 241 buttons
      // reported 180 false failures ("MCO covered by VAT"), which is what a check written against
      // one beat's mechanism says about another's.
      pointerActive: getComputedStyle(button).pointerEvents !== "none",
      hitIsOwnButton: hit === button,
      hitKey: hit ? (hit.getAttribute("data-key") ?? `${hit.tagName}.${hit.className}`) : "nothing",
      width: r.width,
      height: r.height,
    };
  }, key);
}

function readTooltip(page) {
  return page.evaluate(() => {
    const t = document.getElementById("tooltip");
    const r = t.getBoundingClientRect();
    return {
      hidden: t.hidden,
      text: t.textContent,
      inWindow: r.left >= 0 && r.top >= 0 && r.right <= window.innerWidth && r.bottom <= window.innerHeight,
    };
  });
}

/** What is actually drawn right now: the keys of every point still laid out (a `display: none` box
 *  has no client rects), plus the same count for the decorative circles and the table rows. */
function visibleState(page) {
  return page.evaluate(() => {
    const shown = (sel) =>
      [...document.querySelectorAll(sel)].filter((e) => e.getClientRects().length > 0);
    return {
      points: shown(".pt").map((e) => e.getAttribute("data-key")).sort(),
      circles: shown("svg.map circle[data-group]").length,
      labels: shown(".point-label").length,
      rows: shown(".region-table tbody tr").length,
      checked: [...document.querySelectorAll(".mw-filter input")].filter((i) => i.checked).map((i) => i.id),
    };
  });
}

/** The centre of a filter chip, by the id of the radio inside it — a real coordinate for a real
 *  click, never `input.click()`, which (like `.focus()`) skips hit testing and would pass even if
 *  the chip were covered by something. */
function chipCentre(page, radioId) {
  return page.evaluate((id) => {
    const input = document.getElementById(id);
    // NULL, NOT A CRASH. A page with no filter (every choropleth in this tree) has no such input,
    // and `input.closest` on null threw before the KEYBOARD and NO-JS sections — the two `SKILL.md`
    // insists on most — had run at all. A driver that dies on a page it can partly check reports
    // nothing about the parts it could have.
    if (!input) return null;
    const chip = input.closest("label");
    const r = chip.getBoundingClientRect();
    const x = r.left + r.width / 2;
    const y = r.top + r.height / 2;
    const hit = document.elementFromPoint(x, y);
    return {
      x,
      y,
      height: r.height,
      hitInsideChip: chip.contains(hit) || hit === chip,
      hitTag: hit ? `${hit.tagName}.${hit.className}` : "nothing",
    };
  }, radioId);
}

const argv = process.argv.slice(2);
const flag = (name, fallback) => {
  const at = argv.indexOf(name);
  return at >= 0 ? argv[at + 1] : fallback;
};

const seedPoints = JSON.parse(await readFile(DEFAULT_DATA_PATH, "utf8"));
// The one place the expected strings are built, and they are built from the DATA — mirroring
// `MapWebSeed.tsx`'s own `pointDetail`, deliberately re-stated here rather than imported, so a
// change to that formatting has to be made in two places by someone who meant it.
const UNIT_WORD = "million inhabitants";

/**
 * WHOSE MARKS AM I DRIVING? Asked out loud, because for a whole chantier this file answered "the
 * seed's" no matter what `--html` pointed at.
 *
 * THE DEFECT, measured on a real 241-region world choropleth (2026-08-22). Run with `--html <that
 * beat>`, every expectation still came from `assets/sample-data/regions.json` — thirteen European
 * metro areas. It reported:
 *
 *     FAIL hover 1600x900: every point's own hit target is the topmost thing at its own centre
 *          — paris: no button; london: no button; … dublin: no button
 *     ok   hover 1600x900: a real pointer move shows that point's own value — 13/13 matched
 *     FAIL filter: the default state shows every point — 241/13 points, 0 circles, checked: none
 *     TypeError: Cannot read properties of null (reading 'closest')
 *
 * Thirteen false failures; a VACUOUS PASS, because every point was `continue`d as "no button" before
 * the comparison so `wrong` stayed empty and 13/13 of nothing matched; and a crash before the
 * KEYBOARD and NO-JS sections — the two `SKILL.md` insists on most — ever ran.
 *
 * So the subject is READ FROM THE PAGE when a page is named, and the honest limit of that is stated
 * rather than papered over: the seed's own run compares every tooltip against the SOURCE DATA (two
 * independent paths for one fact), while a foreign page can only be held to its own SSR'd
 * `data-detail` unless the caller supplies the source with `--data`. A weaker claim, said out loud,
 * beats a strong claim about the wrong file.
 */
function subjectFromSeed(points) {
  return {
    source: "assets/sample-data/regions.json",
    independent: true,
    keys: drawOrder(points).map((point) => point.key),
    expectedDetail: new Map(points.map((p) => [p.key, `${p.name} : ${fr(p.value)} ${UNIT_WORD}`])),
    groups: groupsOf(points),
    keysByGroup: new Map(
      groupsOf(points).map((g) => [g, points.filter((p) => p.group === g).map((p) => p.key).sort()]),
    ),
    allKeys: points.map((p) => p.key).sort(),
  };
}

/** The same shape, read out of a page this file did not render. `independent: false` is what every
 *  verdict below reads to decide how loudly it may speak. */
function subjectFromPage(read) {
  const groups = [...new Set(Object.values(read.groupOf).filter(Boolean))].sort();
  return {
    source: "the page's own SSR'd data-detail attributes",
    independent: false,
    keys: read.keys,
    expectedDetail: new Map(Object.entries(read.detailOf)),
    groups,
    keysByGroup: new Map(
      groups.map((g) => [g, read.keys.filter((key) => read.groupOf[key] === g).sort()]),
    ),
    allKeys: [...read.keys].sort(),
  };
}

let htmlPath = flag("--html", null);
const drivingTheSeed = htmlPath === null;
let tmpRoot = null;
if (!htmlPath) {
  tmpRoot = await mkdtemp(join(tmpdir(), "map-web-verify-"));
  const { outPath } = await render({
    dataPath: DEFAULT_DATA_PATH,
    plateDir: DEFAULT_PLATE_DIR,
    outDir: tmpRoot,
    name: "verify.html",
  });
  htmlPath = outPath;
}
const url = `file://${resolve(htmlPath)}`;

// ===== CARGO — what the shipped file CONTAINS, before anything is driven =====
//
// Two of this format's four guards read the artifact itself and need no browser, so making them wait
// behind one would only make them skippable. The other two read the bake's own `plate/` files and are
// run by `test/verify-guards.test.ts` over every beat on disk. All four live in `verify-guards.mjs`
// because importing THIS file runs it.
{
  const html = await readFile(resolve(htmlPath), "utf8");
  const mb = (n) => (n / (1024 * 1024)).toFixed(2);
  const twice = duplicatedPayload(html);
  const measuring = revealDashInScreenSpace(marksFromSource(html, basename(htmlPath)));
  // same-facts-without-the-picture (doctrine/references/guard-catalogue.json) — the accessible
  // table's own capability, on the SAME artifact as the two guards above, for the same reason: it
  // needs no browser either. `carried` for this format since commit 3ca29ce4 (2026-08-20) and
  // measured on all 6 of its delivered pages since (fix round, same day): `render-web.mjs`'s
  // `regionTable` now defaults to TRUE, so a beat driven here with `table.rows === 0` is missing a
  // capability the catalogue says this format carries — not making a "documented CHOICE" this check
  // should look past, which is the reading that used to sit here and is exactly the false `carried`
  // a review found. It is held to the same completeness `chart-web` is: any mark still `missing`
  // from the table — whether because a row disagrees with it or because there is no table at all —
  // fails exactly as loudly as it does there.
  const table = tableCarriesTheMarks(html);
  console.log(`\nCARGO — what the file carries`);
  for (const found of twice)
    console.log(
      `  FAIL  ${found.copies} copies of one ${mb(found.bytes)} MB asset inlined, ${mb(found.wastedBytes)} MB wasted`,
    );
  for (const id of measuring)
    console.log(`  FAIL  ${id} reveals with a dash that measures its own path under a non-scaling stroke`);
  if (table.marks > 0 && table.rows === 0)
    console.log(
      `  FAIL  no accessible table on this beat: same-facts-without-the-picture is carried for this format, not opt-in — ${table.marks} mark(s) with no fallback`,
    );
  else
    for (const value of table.missing)
      console.log(`  FAIL  the accessible table is missing a mark's own fact: ${value}`);
  // csv-split-by-hand, on the SOURCE that produced the page being driven. A choropleth beat reads a
  // journalist's csv and joins it to shapes, and a naive `split(",")` turns a quoted thousands
  // separator or a country whose own name carries a comma into a shifted row that renders as a
  // perfectly plausible map. Measured on a real world beat: two of its source's aggregate rows are
  // quoted fields carrying their own comma. The subject is the beat's own runner, next to the page
  // it wrote — this format's driver is the one place that has both in front of it.
  const cutByHand = [];
  const beatDir = dirname(dirname(resolve(htmlPath)));
  for (const dir of [beatDir, dirname(resolve(htmlPath))]) {
    if (!existsSync(dir)) continue;
    for (const name of readdirSync(dir)) {
      if (!/\.(mjs|ts|tsx)$/.test(name)) continue;
      for (const cut of csvSplitByHand(readFileSync(join(dir, name), "utf8")))
        cutByHand.push(`${name}: ${cut}`);
    }
  }
  for (const cut of cutByHand)
    console.log(`  FAIL  a csv row cut by hand — ${cut} — a quoted field carrying its own comma becomes two fields`);
  const tableBroken = table.missing.length > 0 || cutByHand.length > 0;
  if (!twice.length && !measuring.length && !tableBroken)
    console.log(
      `  ok    every asset inlined once; every dash drawn in the path's own units; the table carries all ${table.marks} marks`,
    );
  else process.exitCode = 1;
}
console.log(`driving ${url}\n`);

const browser = await puppeteer.launch({
  headless: true,
  executablePath: resolveChrome(),
  args: ["--no-sandbox", "--hide-scrollbars"],
});

try {
  const page = await browser.newPage();

  // ── 0. WHICH LAYER AM I MEASURING? ───────────────────────────────────────────────────────────
  // Asked first, and answered out loud, because the honest answer is "the fallback" and for a while
  // nothing said so. Ruling R1 made this format a live MapTiler map; the page rendered here carries
  // the R1b PLACEHOLDER instead of a key, so `planIsUnkeyed` is true, `initLiveMap` returns at once
  // and `html.mw-live` is never set. Every check below therefore describes layer 1 — the baked
  // plate, its SVG circles, its HTML overlay — which is exactly the layer that has to keep working
  // offline, with JavaScript off, and on the day a key is rotated.
  //
  // What it is NOT is a check of the live map. That is `scripts/verify-live-map.mjs`, driven from
  // `test/live-map.test.ts` against a KEYED temp copy. The audit found this file described as the
  // format's behaviour check while it silently measured the other layer, so this assertion pins the
  // reading: if a keyed page were ever driven here, the aspect check at §1 would be asserting the
  // plate's shape against a canvas the ruling deliberately lets fill its container, and would fail
  // for the wrong reason.
  await page.setViewport({ width: VIEWPORTS[0].w, height: VIEWPORTS[0].h, deviceScaleFactor: 1 });
  await page.goto(url, { waitUntil: "load" });
  const layer = await page.evaluate(() => ({
    live: document.documentElement.classList.contains("mw-live"),
    hasLivePlan: !!document.getElementById("mw-live-plan"),
    fallbackShown: !document.getElementById("mw-fallback")?.hidden,
  }));
  check(
    "layer: this file drives the FALLBACK, and the page it drives still has a live layer to fall back FROM",
    layer.hasLivePlan && !layer.live && layer.fallbackShown,
    `live plan present ${layer.hasLivePlan}, html.mw-live ${layer.live}, fallback shown ${layer.fallbackShown}`,
  );

  // ── 0b. WHOSE MARKS? — see `subjectFromSeed`/`subjectFromPage` for what this replaced ─────────
  const read = await page.evaluate(() => {
    const nodes = [...document.querySelectorAll(".pt[data-key]")];
    return {
      keys: nodes.map((node) => node.getAttribute("data-key")),
      detailOf: Object.fromEntries(nodes.map((node) => [node.getAttribute("data-key"), node.getAttribute("data-detail")])),
      groupOf: Object.fromEntries(nodes.map((node) => [node.getAttribute("data-key"), node.getAttribute("data-group")])),
      chips: [...document.querySelectorAll("input[name=mw-filter]")].map((input) => input.id),
    };
  });
  const subject = drivingTheSeed ? subjectFromSeed(seedPoints) : subjectFromPage(read);
  const points = subject.keys;
  const expectedDetail = subject.expectedDetail;
  const keysByGroup = subject.keysByGroup;
  const allKeys = subject.allKeys;
  const hasFilter = read.chips.length > 0;
  check(
    `subject: the marks driven below are this page's own — ${subject.keys.length} of them`,
    subject.keys.length > 0 && read.keys.length === subject.keys.length,
    `expected values from ${subject.source}${subject.independent ? " (independent of the page)" : ""}; ` +
      `the page carries ${read.keys.length} marks and ${read.chips.length} filter chip(s)`,
  );
  if (!subject.independent)
    console.log(
      "      note: --html was given, so every expected string below is the page's own recorded\n" +
        "            detail rather than a second, independent reading of the source. This proves the\n" +
        "            WIRING — that pointing at mark X shows X and not its neighbour — and not the\n" +
        "            arithmetic behind the number. Pass --data <the beat's own json> to check both.",
    );

  // ── 1. FIT: the beat is one window tall, at every width, and the plate keeps its own shape ────
  for (const { w, h } of VIEWPORTS) {
    await page.setViewport({ width: w, height: h, deviceScaleFactor: 1 });
    await page.goto(url, { waitUntil: "load" });
    const fit = await page.evaluate(() => {
      const vp = document.querySelector(".mw-viewport");
      const svg = vp.querySelector("svg.map");
      const box = vp.getBoundingClientRect();
      const view = svg.viewBox.baseVal;
      // The collapsed table disclosure's own SUMMARY LINE — B5.2 ruled the table collapsed rather
      // than deleted, and `map-web-discipline.md`'s own measured table records what that line costs
      // an unbounded reading pane on 4 of 5 real beats: a summary sitting past the fold, the same
      // ~44px at every tested width, because collapsing a 41-to-156-row table still leaves one line
      // of HTML behind. `mapgen-locator-web` is the one beat that instead bounds its own reading
      // pane and pays no overflow at all — that is a per-beat layout choice, not something this
      // generic seed's `renderMapWeb`/`buildCss` makes for every future beat. So the tolerance here
      // is not a fudge factor: it is measured, LIVE, from the disclosure actually on the page, and a
      // beat with no table (or one bounding its own pane to zero overflow) still gets the strict
      // `<= 1` this check has always enforced.
      const disclosure = document.querySelector(".mw-table-disclosure");
      // `getBoundingClientRect()` is the BORDER box: it excludes the disclosure's own top margin
      // (`.mw-table-disclosure { margin-top: 10px; }`), which is exactly the part of its footprint
      // that pushes the page's own scrollHeight down without showing up in the box itself.
      const disclosureHeight = disclosure
        ? disclosure.getBoundingClientRect().height +
          parseFloat(getComputedStyle(disclosure).marginTop)
        : 0;
      return {
        docHeight: document.documentElement.scrollHeight,
        windowHeight: window.innerHeight,
        windowWidth: window.innerWidth,
        mapBottom: box.bottom,
        mapWidth: box.width,
        mapHeight: box.height,
        disclosureHeight,
        // The bake's own aspect against the box the plate is actually drawn in. A mismatch here is
        // a stretched basemap — a lie about distance and shape (geo-discipline.md).
        bakedAspect: view.width / view.height,
        drawnAspect: box.width / box.height,
        // Only a box that CLIPS can scroll. With 'overflow: visible' a point label reaching past
        // the frame makes scrollHeight exceed clientHeight without a scrollbar existing anywhere —
        // reading the raw numbers alone would report a scroll that no reader can perform.
        innerScroll:
          getComputedStyle(vp).overflow !== "visible" &&
          (vp.scrollHeight > vp.clientHeight + 1 || vp.scrollWidth > vp.clientWidth + 1),
      };
    });
    const overflow = fit.docHeight - fit.windowHeight;
    const tolerance = fit.disclosureHeight + 1;
    // ROUND-SIX FINDING AC1: `fills-its-frame` reached all eight producing skills and was called by
    // none of them, and the beat that proved the rule works — `stress-ab-emigration-flows`, 16.6%
    // and 14.8% against this same floor on its first render — had to write its own runner by hand
    // against this skill's decision because nothing here ever asked it. This is the call. The
    // box and the window are already measured above; only the question was missing.
    const filled = graphicFillsItsFrame(
      (fit.mapWidth * fit.mapHeight) / (fit.windowWidth * fit.windowHeight),
      FLOOR_FRACTION,
    );
    check(
      `fit ${w}x${h}: the map fills a real share of the window`,
      !filled.under,
      `${(filled.fraction * 100).toFixed(1)}% of the window against a ${(FLOOR_FRACTION * 100).toFixed(1)}% floor`,
    );
    check(
      `fit ${w}x${h}: the whole beat is inside the window`,
      overflow <= tolerance && fit.mapBottom <= fit.windowHeight + 1,
      `page ${fit.docHeight}px in a ${fit.windowHeight}px window (overflow ${overflow}px, collapsed-table tolerance ${tolerance}px), map ${Math.round(fit.mapWidth)}x${Math.round(fit.mapHeight)} ending at ${Math.round(fit.mapBottom)}px`,
    );
    check(
      `fit ${w}x${h}: nothing scrolls inside the visual`,
      !fit.innerScroll,
      fit.innerScroll ? "the map box has its own scrollbar" : "no inner scroll",
    );
    check(
      `fit ${w}x${h}: the plate is not stretched`,
      Math.abs(fit.drawnAspect - fit.bakedAspect) < 0.005,
      `baked ${fit.bakedAspect.toFixed(4)} vs drawn ${fit.drawnAspect.toFixed(4)}`,
    );
  }

  // ── 2. HOVER: real pointer, real coordinates, expected value from the data ────────────────────
  for (const { w, h } of [VIEWPORTS[0], VIEWPORTS[1], VIEWPORTS[3]]) {
    await page.setViewport({ width: w, height: h, deviceScaleFactor: 1 });
    await page.goto(url, { waitUntil: "load" });

    const missed = [];
    const covered = [];
    const wrong = [];
    let compared = 0;
    let passive = 0;
    for (const key of points) {
      const probe = await probePoint(page, key);
      if (!probe) {
        missed.push(`${key}: no button`);
        continue;
      }
      if (!probe.pointerActive) {
        // Pointed at through the map itself, not through a button. Counted and reported, never
        // silently skipped: a beat where NONE of the marks is reachable either way is caught by the
        // anti-vacuity below.
        passive++;
        continue;
      }
      if (!probe.hitIsOwnButton) {
        covered.push(`${key} covered by ${probe.hitKey}`);
        continue;
      }
      // Park the pointer somewhere harmless first, so a tooltip left over from the previous point
      // cannot be mistaken for this one's.
      await page.mouse.move(2, 2);
      await page.mouse.move(probe.x, probe.y);
      const tip = await readTooltip(page);
      const want = expectedDetail.get(key);
      compared++;
      if (tip.hidden || tip.text !== want)
        wrong.push(`${key}: wanted ${JSON.stringify(want)}, got ${tip.hidden ? "a hidden tooltip" : JSON.stringify(tip.text)}`);
      else if (!tip.inWindow) wrong.push(`${key}: tooltip drawn outside the window`);
    }
    check(
      `hover ${w}x${h}: every pointer-active mark's own hit target is the topmost thing at its own centre`,
      missed.length === 0 && covered.length === 0,
      [...missed, ...covered].join("; ") ||
        `${points.length - passive}/${points.length} carry a pointer-active button and every one of them is ` +
          `the topmost thing at its own centre` +
          (passive > 0 ? `; the other ${passive} are pointed at through the map's own fill` : ""),
    );
    // ANTI-VACUITY, and it is the whole reason this is not just `wrong.length === 0`. On the world
    // beat every point was skipped as "no button" before the comparison, so `wrong` stayed empty and
    // this printed "13/13 matched the source data" about a page with 241 regions and no `paris`. A
    // comparison that never ran is not a comparison that passed.
    check(
      `hover ${w}x${h}: a real pointer move shows that point's own value, in window`,
      wrong.length === 0 && compared === points.length - passive && compared > 0,
      wrong.join("; ") ||
        (compared === points.length - passive && compared > 0
          ? `${compared}/${points.length - passive} pointer-active marks checked against ${subject.source}`
          : `only ${compared} of the ${points.length - passive} pointer-active marks were reached at all, so ` +
            `this compared nothing for the other ${points.length - passive - compared}`),
    );

    // Leaving clears it — a tooltip that never hides is a tooltip that lies about the next point.
    await page.mouse.move(2, 2);
    const cleared = await readTooltip(page);
    check(`hover ${w}x${h}: moving away clears the tooltip`, cleared.hidden, cleared.hidden ? "hidden" : `still showing ${JSON.stringify(cleared.text)}`);
  }

  // ── 3. FILTER: real clicks, and the default already carries the whole claim ───────────────────
  await page.setViewport({ width: 1024, height: 768, deviceScaleFactor: 1 });
  await page.goto(url, { waitUntil: "load" });

  const untouched = await visibleState(page);
  check(
    "filter: the default state shows every point — nothing argument-bearing behind the control",
    JSON.stringify(untouched.points) === JSON.stringify(allKeys) &&
      // A CHOROPLETH DRAWS NO CIRCLES, and a beat with one group renders no filter at all
      // (`groupsOf(points).length <= 1`) — every choropleth in this tree is that beat. Demanding
      // both of every page is what reported `241/13 points, 0 circles, checked: none` as a failure
      // of a page that was correct. What is NOT relaxed is the claim itself: the unfiltered state
      // shows every mark the page carries.
      (untouched.circles === 0 || untouched.circles === points.length) &&
      (!hasFilter || untouched.checked.join() === "mw-filter-all"),
    `${untouched.points.length}/${points.length} points, ${untouched.circles} circles, checked: ${untouched.checked.join() || (hasFilter ? "none" : "no filter on this beat")}`,
  );
  const furniture = await page.evaluate(() =>
    [".mw-title", ".mw-source", ".mw-legend-caption", ".mw-subject", ".mw-caveat"].filter(
      (s) => (document.querySelector(s)?.getClientRects().length ?? 0) === 0,
    ),
  );
  check(
    "filter: title, source, legend caption, subject note and caveat are all drawn before any interaction",
    furniture.length === 0,
    furniture.length ? `missing: ${furniture.join(", ")}` : "all five present",
  );

  const mapShot = async () => {
    // Plain numbers, not the DOMRect itself: a DOMRect serialises across the CDP boundary as an
    // empty object, and the clip then arrives with an undefined x.
    const box = await page.$eval(".mw-viewport", (e) => {
      const r = e.getBoundingClientRect();
      return { x: Math.round(r.left), y: Math.round(r.top), width: Math.round(r.width), height: Math.round(r.height) };
    });
    return page.screenshot({ clip: box });
  };
  const allShot = await mapShot();

  // ONLY WHEN THE PAGE HAS ONE. `chipCentre` used to be called for a group the page had no radio
  // for, and `document.getElementById(id).closest("label")` then threw `Cannot read properties of
  // null (reading 'closest')` — which is what stopped the KEYBOARD and NO-JS sections below from
  // ever running on the beat that found this.
  if (!hasFilter)
    console.log("      note: this beat renders no filter (one group), so the filter walk is skipped");
  for (const group of hasFilter ? subject.groups : []) {
    const id = `mw-filter-${slugOf(group)}`;
    const chip = await chipCentre(page, id);
    if (!chip) {
      check(`filter "${group}": the chip is a real target`, false, `no input#${id} on this page`);
      continue;
    }
    check(
      `filter "${group}": the chip is a real target (${Math.round(chip.height)}px tall) and nothing covers it`,
      chip.hitInsideChip && chip.height >= 24,
      chip.hitInsideChip ? `${Math.round(chip.height)}px` : `a real click at its centre would land on ${chip.hitTag}`,
    );
    await page.mouse.click(chip.x, chip.y);
    const state = await visibleState(page);
    const want = keysByGroup.get(group);
    check(
      `filter "${group}": a real click narrows the map to exactly that group`,
      state.checked.join() === id &&
        JSON.stringify(state.points) === JSON.stringify(want) &&
        state.circles === want.length &&
        state.labels === want.length,
      `checked ${state.checked.join() || "nothing"}; ${state.points.length} points / ${state.circles} circles / ${state.labels} labels, wanted ${want.length} (${want.join(", ")})`,
    );
    const shot = await mapShot();
    check(
      `filter "${group}": the picture itself changed`,
      Buffer.compare(shot, allShot) !== 0,
      Buffer.compare(shot, allShot) !== 0 ? "the drawn map differs from the unfiltered one" : "pixel-identical to the unfiltered map",
    );
    // Back to All, so each group is measured from the same start.
    const allChip = await chipCentre(page, "mw-filter-all");
    if (allChip) await page.mouse.click(allChip.x, allChip.y);
  }
  if (hasFilter) {
    const restored = await visibleState(page);
    check(
      "filter: clicking back to 'All regions' restores every point",
      JSON.stringify(restored.points) === JSON.stringify(allKeys),
      `${restored.points.length}/${points.length}`,
    );
  }

  // ── 4. KEYBOARD: real key presses, not `.focus()` ─────────────────────────────────────────────
  await page.goto(url, { waitUntil: "load" });
  let tabs = 0;
  let onRadio = false;
  while (hasFilter && tabs < 12 && !onRadio) {
    await page.keyboard.press("Tab");
    tabs += 1;
    onRadio = await page.evaluate(() => document.activeElement?.matches(".mw-chip input") ?? false);
  }
  if (hasFilter)
    check("keyboard: Tab reaches the filter group", onRadio, onRadio ? `after ${tabs} Tab press(es)` : "never focused a filter radio in 12 presses");
  if (onRadio) {
    const focusRing = await page.evaluate(() => {
      const chip = document.activeElement.closest(".mw-chip");
      return getComputedStyle(chip).outlineStyle !== "none" && parseFloat(getComputedStyle(chip).outlineWidth) > 0;
    });
    check("keyboard: the focused chip draws a visible focus ring", focusRing, focusRing ? "outline present on the chip" : "no outline — a keyboard reader cannot see where they are");
    await page.keyboard.press("ArrowRight");
    const moved = await visibleState(page);
    const firstGroup = subject.groups[0];
    check(
      "keyboard: Arrow moves within the group and narrows the map, with no JavaScript involved in the narrowing",
      moved.checked.join() === `mw-filter-${slugOf(firstGroup)}` &&
        JSON.stringify(moved.points) === JSON.stringify(keysByGroup.get(firstGroup)),
      `checked ${moved.checked.join() || "nothing"}, ${moved.points.length} points visible`,
    );
  }

  await page.goto(url, { waitUntil: "load" });
  let onPoint = false;
  let presses = 0;
  while (presses < 24 && !onPoint) {
    await page.keyboard.press("Tab");
    presses += 1;
    onPoint = await page.evaluate(() => document.activeElement?.classList.contains("pt") ?? false);
  }
  const focusedDetail = onPoint
    ? await page.evaluate(() => document.activeElement.getAttribute("data-key"))
    : null;
  const focusTip = await readTooltip(page);
  check(
    "keyboard: Tab reaches a point and its value is announced from focus alone",
    onPoint && !focusTip.hidden && focusTip.text === expectedDetail.get(focusedDetail),
    onPoint
      ? `focused ${focusedDetail}, tooltip ${JSON.stringify(focusTip.text)}`
      : "never focused a point in 24 presses",
  );

  // ── 5. NO JAVASCRIPT: the filter is CSS, so it must still narrow the map ──────────────────────
  await page.setJavaScriptEnabled(false);
  await page.goto(url, { waitUntil: "load" });
  const noJsGroup = subject.groups[0];
  const noJsId = hasFilter ? `mw-filter-${slugOf(noJsGroup)}` : null;
  // Every measurement below runs in a SEPARATE page context that does have script — `page.evaluate`
  // is injected by the driver, not by the document — so the page itself stays script-free.
  const noJsBefore = await page.evaluate(() =>
    [...document.querySelectorAll(".pt")].filter((e) => e.getClientRects().length > 0).length,
  );
  const noJsChip = noJsId ? await chipCentre(page, noJsId) : null;
  if (noJsChip) await page.mouse.click(noJsChip.x, noJsChip.y);
  const noJsAfter = await page.evaluate(() =>
    [...document.querySelectorAll(".pt")].filter((e) => e.getClientRects().length > 0).length,
  );
  const wantedAfter = noJsChip ? keysByGroup.get(noJsGroup).length : points.length;
  check(
    "no-JS: the map, its legend and the filter all still work with scripts disabled",
    noJsBefore === points.length && noJsAfter === wantedAfter,
    noJsChip
      ? `${noJsBefore} points unfiltered, ${noJsAfter} after a real click on "${noJsGroup}" (wanted ${wantedAfter})`
      : `${noJsBefore} of ${points.length} marks render with scripts disabled; this beat has no filter to click`,
  );
  await page.setJavaScriptEnabled(true);
} finally {
  await browser.close();
  if (tmpRoot && !argv.includes("--keep")) await rm(tmpRoot, { recursive: true, force: true });
}

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
if (failed.length) {
  console.error(`FAILED:\n  ${failed.map((f) => `${f.name} — ${f.detail}`).join("\n  ")}`);
  process.exit(1);
}
