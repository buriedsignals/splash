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

import { existsSync, readdirSync } from "node:fs";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { homedir, tmpdir } from "node:os";
import { join, resolve } from "node:path";
import puppeteer from "puppeteer";
import { render, DEFAULT_PLATE_DIR, DEFAULT_DATA_PATH } from "./render-web.mjs";
import { drawOrder, groupsOf, slugOf, fr } from "../assets/geo-symbol.ts";

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

const points = JSON.parse(await readFile(DEFAULT_DATA_PATH, "utf8"));
// The one place the expected strings are built, and they are built from the DATA — mirroring
// `MapWebSeed.tsx`'s own `pointDetail`, deliberately re-stated here rather than imported, so a
// change to that formatting has to be made in two places by someone who meant it.
const UNIT_WORD = "million inhabitants";
const expectedDetail = new Map(points.map((p) => [p.key, `${p.name} : ${fr(p.value)} ${UNIT_WORD}`]));
const keysByGroup = new Map(
  groupsOf(points).map((g) => [g, points.filter((p) => p.group === g).map((p) => p.key).sort()]),
);
const allKeys = points.map((p) => p.key).sort();

let htmlPath = flag("--html", null);
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

  // ── 1. FIT: the beat is one window tall, at every width, and the plate keeps its own shape ────
  for (const { w, h } of VIEWPORTS) {
    await page.setViewport({ width: w, height: h, deviceScaleFactor: 1 });
    await page.goto(url, { waitUntil: "load" });
    const fit = await page.evaluate(() => {
      const vp = document.querySelector(".mw-viewport");
      const svg = vp.querySelector("svg.map");
      const box = vp.getBoundingClientRect();
      const view = svg.viewBox.baseVal;
      return {
        docHeight: document.documentElement.scrollHeight,
        windowHeight: window.innerHeight,
        mapBottom: box.bottom,
        mapWidth: box.width,
        mapHeight: box.height,
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
    check(
      `fit ${w}x${h}: the whole beat is inside the window`,
      overflow <= 1 && fit.mapBottom <= fit.windowHeight + 1,
      `page ${fit.docHeight}px in a ${fit.windowHeight}px window (overflow ${overflow}px), map ${Math.round(fit.mapWidth)}x${Math.round(fit.mapHeight)} ending at ${Math.round(fit.mapBottom)}px`,
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
    for (const point of drawOrder(points)) {
      const probe = await probePoint(page, point.key);
      if (!probe) {
        missed.push(`${point.key}: no button`);
        continue;
      }
      if (!probe.hitIsOwnButton) {
        covered.push(`${point.key} covered by ${probe.hitKey}`);
        continue;
      }
      // Park the pointer somewhere harmless first, so a tooltip left over from the previous point
      // cannot be mistaken for this one's.
      await page.mouse.move(2, 2);
      await page.mouse.move(probe.x, probe.y);
      const tip = await readTooltip(page);
      const want = expectedDetail.get(point.key);
      if (tip.hidden || tip.text !== want)
        wrong.push(`${point.key}: wanted ${JSON.stringify(want)}, got ${tip.hidden ? "a hidden tooltip" : JSON.stringify(tip.text)}`);
      else if (!tip.inWindow) wrong.push(`${point.key}: tooltip drawn outside the window`);
    }
    check(
      `hover ${w}x${h}: every point's own hit target is the topmost thing at its own centre`,
      missed.length === 0 && covered.length === 0,
      [...missed, ...covered].join("; ") || `${points.length}/${points.length} reachable by a real pointer`,
    );
    check(
      `hover ${w}x${h}: a real pointer move shows that point's own value, in window`,
      wrong.length === 0,
      wrong.join("; ") || `${points.length}/${points.length} matched the source data`,
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
      untouched.circles === points.length &&
      untouched.checked.join() === "mw-filter-all",
    `${untouched.points.length}/${points.length} points, ${untouched.circles} circles, checked: ${untouched.checked.join() || "none"}`,
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

  for (const group of groupsOf(points)) {
    const id = `mw-filter-${slugOf(group)}`;
    const chip = await chipCentre(page, id);
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
    await page.mouse.click(allChip.x, allChip.y);
  }
  const restored = await visibleState(page);
  check(
    "filter: clicking back to 'All regions' restores every point",
    JSON.stringify(restored.points) === JSON.stringify(allKeys),
    `${restored.points.length}/${points.length}`,
  );

  // ── 4. KEYBOARD: real key presses, not `.focus()` ─────────────────────────────────────────────
  await page.goto(url, { waitUntil: "load" });
  let tabs = 0;
  let onRadio = false;
  while (tabs < 12 && !onRadio) {
    await page.keyboard.press("Tab");
    tabs += 1;
    onRadio = await page.evaluate(() => document.activeElement?.matches(".mw-chip input") ?? false);
  }
  check("keyboard: Tab reaches the filter group", onRadio, onRadio ? `after ${tabs} Tab press(es)` : "never focused a filter radio in 12 presses");
  if (onRadio) {
    const focusRing = await page.evaluate(() => {
      const chip = document.activeElement.closest(".mw-chip");
      return getComputedStyle(chip).outlineStyle !== "none" && parseFloat(getComputedStyle(chip).outlineWidth) > 0;
    });
    check("keyboard: the focused chip draws a visible focus ring", focusRing, focusRing ? "outline present on the chip" : "no outline — a keyboard reader cannot see where they are");
    await page.keyboard.press("ArrowRight");
    const moved = await visibleState(page);
    const firstGroup = groupsOf(points)[0];
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
  const noJsGroup = groupsOf(points)[0];
  const noJsId = `mw-filter-${slugOf(noJsGroup)}`;
  // Every measurement below runs in a SEPARATE page context that does have script — `page.evaluate`
  // is injected by the driver, not by the document — so the page itself stays script-free.
  const noJsBefore = await page.evaluate(() =>
    [...document.querySelectorAll(".pt")].filter((e) => e.getClientRects().length > 0).length,
  );
  const noJsChip = await chipCentre(page, noJsId);
  await page.mouse.click(noJsChip.x, noJsChip.y);
  const noJsAfter = await page.evaluate(() =>
    [...document.querySelectorAll(".pt")].filter((e) => e.getClientRects().length > 0).length,
  );
  check(
    "no-JS: the map, its legend and the filter all still work with scripts disabled",
    noJsBefore === points.length && noJsAfter === keysByGroup.get(noJsGroup).length,
    `${noJsBefore} points unfiltered, ${noJsAfter} after a real click on "${noJsGroup}" (wanted ${keysByGroup.get(noJsGroup).length})`,
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
