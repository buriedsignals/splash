// twin/skills/map-web/scripts/verify-wraps-the-world.mjs
//
// COUNTS HOW MANY MARKS ANSWER A POINTER ON EACH VISIBLE COPY OF A WRAPPED WORLD.
//
// THE RULING THIS DRIVES, from the owner on 2026-08-23, looking at the two beats this format laid
// out contained because one plate cannot cover a box wider than the world:
//
//   > that is the normal behaviour of an interactive map — go ahead and repeat the map on the sides.
//
// He is right about the medium, and the ruling came with its engineering consequence. Two days
// earlier this same format was fixed for painting three worlds at planet extent, and THE DEFECT WAS
// NEVER THE REPEAT: it was that there was ONE SET OF HIT TARGETS over three painted worlds — three
// Africas, three Japans, and a reader pointing at the second one got nothing. Nothing measured it,
// which is why it shipped. This is the measurement.
//
// It reports, per page and per width:
//   · the container (`.mw-stage`), the graphic (`.mw-viewport`) and the fraction of the container
//     the graphic covers on both axes — the wrap exists to make that 1.0, so it is read back;
//   · how many copies of the world are actually VISIBLE inside the box, and how much longitude the
//     reader is shown (past one full turn, that is the repeat; under it, a phone's own crop);
//   · FOR EACH VISIBLE COPY, how many of the marks drawn on it answer `document.elementFromPoint`
//     at their own position with their own key — with JavaScript off, and again live where the
//     MapLibre canvas hit-tests its own painted copies through `queryRenderedFeatures`;
//   · what the keyboard reaches, which must NOT multiply with the copies.
//
// Usage:
//   bun skills/map-web/scripts/verify-wraps-the-world.mjs <page.html> [more.html …]
//   … --widths 1600x900,2990x1718     (default: the four this format drives)
//   … --live                          (also drive the live map, with the real key from twin/.env)
//   … --json
//
// It exits non-zero when a visible copy answers for fewer marks than the primary world does, which
// is the defect the ruling was given with, stated as a number rather than as a promise.

import { existsSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import puppeteer from "puppeteer-core";
import { discoverMapWebPages, TWIN } from "./discover-pages.mjs";
import { containerFraction } from "./detect-fills-its-frame.mjs";

/** The capability this script carries, read by `scripts/guards.mjs` and checked against
 *  `doctrine/references/guard-catalogue.json` by `doctrine/test/guard-parity.test.ts`. */
export const GUARDS = ["everyPaintedWorldAnswersAPointer"];

/**
 * THE DECISION: A PAINTED WORLD A READER CANNOT POINT AT IS REFUSED.
 *
 * `worlds` is one entry per painted copy — `{ role, onScreen, answered }`, each a list of mark keys:
 * `onScreen` is what that copy actually draws inside the box, `answered` is what a pointer sent to
 * its own position came back with. Exactly one copy is the `primary`.
 *
 * WHY THE PRIMARY IS THE YARDSTICK RATHER THAN `onScreen` ITSELF. Some marks answer for nobody on
 * ANY copy, and that is a different, already-named defect: a mark drawn smaller than a pixel has no
 * pixel to send a pointer to (`marksStrandedWithNoChannel`), and a mark whose neighbour's fixed-size
 * target covers its centre loses to the neighbour (`collidingPointerTargets`) — both measured, both
 * stated on the page's own verdict, neither caused by the wrap. Asking a copy to beat the world it
 * is a copy OF would fail every page for reasons the wrap did not create. What the ruling actually
 * requires is that the copies are as good as the original: every mark the primary answers for, and
 * which this copy draws inside the box, must answer on this copy too.
 *
 * A copy with NO marks on screen at all is not a pass, it is a copy that is not really there: it is
 * reported as such rather than silently satisfying a rule about an empty set.
 */
export function everyPaintedWorldAnswersAPointer(worlds) {
  const primary = worlds.find((world) => world.role === "primary");
  if (!primary)
    throw new Error(
      "no primary world in this reading — a wrapped page has exactly one copy the keyboard and the " +
        "accessible table belong to, and the pointer census is measured against it",
    );
  const answeredByPrimary = new Set(primary.answered);
  const short = [];
  for (const world of worlds) {
    if (world === primary) continue;
    const owed = world.onScreen.filter((key) => answeredByPrimary.has(key));
    const answered = new Set(world.answered);
    const missing = owed.filter((key) => !answered.has(key));
    if (missing.length > 0) short.push({ copy: world.index, of: owed.length, missing });
  }
  return {
    copies: worlds.length,
    // A copy the box does not reach at this width is PAINTED but not VISIBLE — a phone shows less
    // than one world, so the two outer copies are entirely clipped. It is named rather than counted
    // as a copy that answered, because "every visible copy answers" is a rule about what a reader
    // can see and an empty set would satisfy it silently.
    visible: worlds.filter((world) => (world.visiblePx ?? 1) > 0).length,
    perCopy: worlds.map((world) => ({
      index: world.index,
      role: world.role,
      visiblePx: world.visiblePx ?? null,
      onScreen: world.onScreen.length,
      // What this copy OWES an answer for: the marks it draws inside the box that the primary world
      // answers for. On the primary itself that is everything it draws — which is where the marks
      // no copy can reach (sub-pixel, or covered by a neighbour's target) show up as a shortfall,
      // named by their own guards rather than by this one.
      owed: world === primary ? world.onScreen.length : world.onScreen.filter((key) => answeredByPrimary.has(key)).length,
      answered: world.answered.length,
    })),
    short,
    offScreen: worlds.filter((world) => (world.visiblePx ?? 1) <= 0).map((world) => world.index),
  };
}

/** A DUPLICATE of the `resolveChrome` every capture script in this tree carries — a skill's own
 *  scripts stay copy-pasteable, so this is not imported from anywhere else. */
export function resolveChrome() {
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
  candidates.push("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", "/usr/bin/google-chrome");
  const found = candidates.find((path) => existsSync(path));
  if (!found) throw new Error(`no Chrome to drive — looked at ${candidates.join(", ")}`);
  return found;
}

/** The alias table this repository's own credentials rule keeps: a key lives under one of these
 *  names and a probe that reads only the first of them verifies nothing and exits 0. */
export const MAPTILER_KEY_ALIASES = ["MAPTILER_API_KEY", "REMOTION_MAPTILER_KEY", "VITE_MAPTILER_KEY"];

export function parseEnvFile(text) {
  const values = {};
  for (const line of String(text).split("\n")) {
    const match = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
    if (match) values[match[1]] = match[2].replace(/^["']|["']$/g, "").trim();
  }
  return values;
}

export function mapTilerKeyFrom(from) {
  for (const name of ["MAPTILER_KEY", ...MAPTILER_KEY_ALIASES]) {
    const value = from?.[name];
    if (typeof value === "string" && value.length > 0) return value;
  }
  return null;
}

/** A keyed copy OUTSIDE the tree, so looking at the live map can never commit a key. */
export function keyedCopy(htmlPath, key) {
  const out = join(mkdtempSync(join(tmpdir(), "mw-wrap-verify-")), "keyed.html");
  writeFileSync(out, readFileSync(htmlPath, "utf8").split("__MAPTILER" + "_KEY__").join(key));
  return out;
}

/** The widths this driver reports at by default: the three this format already drives everywhere,
 *  plus the owner's own screen, because a rule about filling a container is a rule about the
 *  container a reader actually has. */
export const WRAP_VIEWPORTS = [
  { width: 1600, height: 900 },
  { width: 2990, height: 1718 },
  { width: 1280, height: 800 },
  { width: 375, height: 812 },
];

/** The plate beside a delivered page, when there is one — the wrap's own facts (`cannotCover`, the
 *  frame) come from the bake, never from the page agreeing with itself. */
export function plateGeometryFor(pagePath) {
  let dir = resolve(dirname(pagePath));
  for (let up = 0; up < 4; up++) {
    const candidate = join(dir, "plate", "geometry.json");
    if (existsSync(candidate)) return JSON.parse(readFileSync(candidate, "utf8"));
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}

/**
 * THE CENSUS, RUN INSIDE THE PAGE.
 *
 * One entry per `[data-world]`, and for each of them the marks it draws inside the box and the marks
 * that answer a pointer sent to them. A mark's key can be carried by more than one element on a copy
 * — a choropleth draws the country and ALSO puts a fixed-size button on the ones too small to point
 * at — so every element carrying the key is probed and the key counts as answered if any of them
 * does. That is exactly what a reader gets: they point at the country, not at an implementation.
 *
 * The probe is `elementFromPoint`, the browser's own hit test, at the centre of the element's own
 * client rect and then on a coarse grid inside it — a concave country's rect centre can sit in the
 * sea, which is a fact about the shape rather than about the reader's reach.
 */
const CENSUS = function () {
  const box = document.querySelector(".mw-viewport").getBoundingClientRect();
  const GRID = 7;
  // A PIXEL ON THE CLIP BOUNDARY BELONGS TO NEITHER COPY. One pixel of inset, and it is a rounding
  // allowance rather than a margin: measured on the world beat at 1280x800, the Falkland Islands'
  // own target on the eastern copy centres at x=1264.0 against a box whose right edge is x=1264.0,
  // so half of it is clipped and `elementFromPoint` at exactly that column answers with the viewport
  // itself. Counting it as a mark the copy owes an answer for would report the crop as a defect.
  const inside = (x, y) => x > box.left + 1 && x < box.right - 1 && y > box.top + 1 && y < box.bottom - 1;
  const keyAt = (x, y) => {
    const found = document.elementFromPoint(x, y);
    if (!found) return null;
    const owner = found.closest ? found.closest("[data-key]") : null;
    return owner ? owner.getAttribute("data-key") : null;
  };
  // One world is one COLUMN: a copy's plate layer and its overlay layer are two elements standing in
  // the same place, and they are one world.
  const columns = new Map();
  for (const root of document.querySelectorAll("[data-world]")) {
    const rect = root.getBoundingClientRect();
    const at = Math.round(rect.left);
    if (!columns.has(at)) columns.set(at, { role: root.getAttribute("data-world"), left: rect.left, width: rect.width, roots: [] });
    columns.get(at).roots.push(root);
  }
  const worlds = [...columns.values()].sort((a, b) => a.left - b.left);
  if (worlds.length === 0) return [];
  const primaryAt = worlds.findIndex((world) => world.role === "primary");

  // 1. THE PRIMARY WORLD'S OWN ANSWERS, and the pixel each one was won at. Every element carrying
  //    the key is tried, because a beat may draw a mark and ALSO put a fixed-size button on it, and
  //    a reader points at the map rather than at an implementation. The rectangle is intersected
  //    with the box first: a probe outside the box measures the crop, not the mark.
  const wonAt = new Map();
  const primary = worlds[primaryAt];
  const byKey = new Map();
  for (const root of primary.roots)
    for (const el of root.querySelectorAll("[data-key]")) {
      const key = el.getAttribute("data-key");
      if (!byKey.has(key)) byKey.set(key, []);
      byKey.get(key).push(el);
    }
  for (const [key, nodes] of byKey) {
    for (const node of nodes) {
      if (wonAt.has(key)) break;
      const rect = node.getBoundingClientRect();
      const left = Math.max(rect.left, box.left);
      const right = Math.min(rect.right, box.right);
      const top = Math.max(rect.top, box.top);
      const bottom = Math.min(rect.bottom, box.bottom);
      if (!(right > left && bottom > top)) continue;
      const points = [[(left + right) / 2, (top + bottom) / 2]];
      for (let i = 1; i < GRID; i++)
        for (let j = 1; j < GRID; j++)
          points.push([left + ((right - left) * i) / GRID, top + ((bottom - top) * j) / GRID]);
      for (const [x, y] of points)
        if (keyAt(x, y) === key) {
          wonAt.set(key, { x, y });
          break;
        }
    }
  }

  // 2. THE SAME PIXEL, ONE WORLD EAST OR WEST. This is the reading the ruling is about and it is
  //    deliberately like-for-like: a mark counts on a copy only if the point that answered for it on
  //    the primary, moved by whole worlds, is still inside the box — and it ANSWERS only if the
  //    browser's own hit test at that point comes back with the same key.
  //
  //    A BOUNDING BOX WOULD NOT DO. Measured before this was written: the USA's rectangle spans the
  //    whole plate (the Aleutians cross the antimeridian), so it "overlaps" a 337px slice of the
  //    western copy that paints none of the country at all — and the copy was reported short by six
  //    marks that were never on it.
  return worlds.map((world, index) => {
    // EACH COPY'S OWN MEASURED LEFT EDGE, never `index × width`: the worlds are laid out in fractional
    // CSS pixels, and a uniform step accumulates the rounding. Measured on the world beat at
    // 1280x800 before this line, the eastern copy's probe landed about a pixel off and the Falkland
    // Islands — two pixels of painted island — stopped answering on the copy while answering on the
    // primary. A probe whose own arithmetic decides the verdict measures its own arithmetic.
    const offset = world.left - primary.left;
    const onScreen = [];
    const answered = [];
    for (const [key, point] of wonAt) {
      const x = point.x + offset;
      if (!inside(x, point.y)) continue;
      onScreen.push(key);
      if (keyAt(x, point.y) === key) answered.push(key);
    }
    return {
      index,
      role: world.role,
      visiblePx: Math.max(0, Math.round(Math.min(world.left + world.width, box.right) - Math.max(world.left, box.left))),
      marks: byKey.size,
      onScreen,
      answered,
    };
  });
};

/** What one page reads back at one viewport, with JavaScript on but no live map (the state a reader
 *  gets with no key, no network, or a style that failed) — which is also, mark for mark, the state a
 *  reader with JavaScript OFF gets, because every mark and every hit target here is SSR'd. */
export async function readWrap(page, abs, viewport) {
  await page.setViewport({ ...viewport, deviceScaleFactor: 1 });
  await page.goto(pathToFileURL(abs).href, { waitUntil: "load" });
  return await page.evaluate(CENSUS_WRAPPER, CENSUS.toString());
}

/** `page.evaluate` cannot take a function that closes over module scope, so the census travels as
 *  source and is re-created inside the page. */
const CENSUS_WRAPPER = function (source) {
  const stage = document.querySelector(".mw-stage");
  const viewportEl = document.querySelector(".mw-viewport");
  if (!stage || !viewportEl) throw new Error("this page has no .mw-viewport inside a .mw-stage");
  const rect = (el) => {
    const r = el.getBoundingClientRect();
    return { width: r.width, height: r.height };
  };
  // eslint-disable-next-line no-new-func
  const census = new Function("return (" + source + ")")();
  const worlds = census();
  const plate = document.querySelector(".mw-fallback");
  const one = plate ? plate.getBoundingClientRect().width / Math.max(1, worlds.length) : 0;
  return {
    container: rect(stage),
    box: rect(viewportEl),
    oneWorldPx: one,
    worlds,
    keyboardStops: document.querySelectorAll(".mw-viewport [data-detail]").length,
    focusables: document.querySelectorAll('.mw-viewport button:not([tabindex="-1"])').length,
    tableRows: document.querySelectorAll("table tbody tr").length,
  };
};

/** THE LIVE CENSUS. Live there is no DOM copy at all — MapLibre paints the world copies itself and
 *  hit-tests every one of them — so the count comes from the map: each mark's own anchor projected
 *  into the camera, offset by whole worlds, asked of `queryRenderedFeatures` the way a real pointer
 *  is. The copies are numbered from the same left-to-right order the fallback uses. */
const LIVE_CENSUS = function () {
  const map = window.__mwMap;
  if (!map) return null;
  const plan = JSON.parse(document.getElementById("mw-live-plan").textContent);
  const canvas = map.getCanvas();
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  const worldPx = map.project([180, 0]).x - map.project([-180, 0]).x;
  const layers = (plan.layers || []).filter((layer) => layer.hover !== false).map((layer) => layer.id);
  const anchors = plan.anchors || {};
  const first = Math.floor(-map.project([-180, 0]).x / worldPx) - 1;
  const last = Math.ceil((width - map.project([-180, 0]).x) / worldPx) + 1;
  const worlds = [];
  for (let copy = first; copy <= last; copy++) {
    const onScreen = [];
    const answered = [];
    for (const key in anchors) {
      const at = map.project(anchors[key]);
      const x = at.x + copy * worldPx;
      if (x < 0 || x > width || at.y < 0 || at.y > height) continue;
      onScreen.push(key);
      const found = map.queryRenderedFeatures([x, at.y], { layers: layers });
      if (found.some((feature) => feature.properties && feature.properties.key === key)) answered.push(key);
    }
    if (onScreen.length === 0) continue;
    worlds.push({ index: worlds.length, copy, onScreen: onScreen, answered: answered, left: copy * worldPx });
  }
  // The copy holding the camera's own centre is the one the keyboard and the table belong to.
  const middle = worlds.reduce(
    (best, world, i) => (Math.abs(world.copy) < Math.abs(worlds[best].copy) ? i : best),
    0,
  );
  worlds.forEach((world, i) => {
    world.role = i === middle ? "primary" : "repeat";
  });
  const bounds = map.getBounds();
  return {
    worlds,
    lonSpan: Math.abs(bounds.getEast() - bounds.getWest()),
    worldPx,
    canvas: { width: width, height: height },
  };
};

export async function readLiveWrap(page, keyedPath, viewport) {
  await page.setViewport({ ...viewport, deviceScaleFactor: 1 });
  await page.goto(pathToFileURL(keyedPath).href, { waitUntil: "load" });
  await page.waitForFunction("document.documentElement.classList.contains('mw-live')", { timeout: 60000 });
  await page.evaluate(() => new Promise((done) => setTimeout(done, 1200)));
  // eslint-disable-next-line no-new-func
  return await page.evaluate(new Function("return (" + LIVE_CENSUS.toString() + ")()"));
}

/** How much longitude a reader is shown, from the geometry rather than from the camera: one world is
 *  `oneWorldPx` wide and the box is `box.width` wide. Past 360° the surplus IS the repeat; under it,
 *  the box is narrower than one world and the crop is longitude — which is the only crop a wrapping
 *  plate can take, because latitude cannot be repeated. */
export function longitudeShown(boxWidthPx, oneWorldPx) {
  if (!(oneWorldPx > 0)) return null;
  return (360 * boxWidthPx) / oneWorldPx;
}

export function reportFor(rel, readings, geometry) {
  const lines = [];
  let failed = false;
  const wraps = Boolean(geometry?.cannotCover);
  for (const { viewport, state, reading } of readings) {
    if (state === "live") {
      if (!reading) {
        lines.push(`  ${label(viewport)}  live: no map on the page`);
        continue;
      }
      const found = everyPaintedWorldAnswersAPointer(reading.worlds);
      if (found.short.length > 0) failed = true;
      lines.push(
        `  ${label(viewport)}  LIVE   canvas ${reading.canvas.width}x${reading.canvas.height} · ` +
          `${reading.lonSpan.toFixed(1)}° of longitude · one world ${reading.worldPx.toFixed(0)}px · ` +
          `${found.copies} painted copies`,
      );
      for (const copy of found.perCopy)
        lines.push(
          `      copy ${copy.index} (${copy.role}): ${copy.answered} of ${copy.owed} marks answer a pointer` +
            (copy.onScreen === copy.owed ? "" : ` (of ${copy.onScreen} drawn on it)`),
        );
      for (const one of found.short)
        lines.push(`      ← copy ${one.copy} answers for ${one.of - one.missing.length} of ${one.of}: ${one.missing.slice(0, 8).join(", ")}`);
      continue;
    }
    const fraction = containerFraction(reading.box, reading.container);
    const shown = longitudeShown(reading.box.width, reading.oneWorldPx);
    if (fraction < 1 - 0.001) failed = true;
    lines.push(
      `  ${label(viewport)}  container ${reading.container.width.toFixed(1)}x${reading.container.height.toFixed(1)} · ` +
        `box ${reading.box.width.toFixed(1)}x${reading.box.height.toFixed(1)} · covers ${(fraction * 100).toFixed(1)}%` +
        (shown === null ? "" : ` · one world ${reading.oneWorldPx.toFixed(0)}px, ${shown.toFixed(0)}° shown`),
    );
    if (!wraps) {
      lines.push(`      one world, no repeat (this camera is not the whole world)`);
      continue;
    }
    const found = everyPaintedWorldAnswersAPointer(reading.worlds);
    if (found.short.length > 0) failed = true;
    lines.push(`      ${found.copies} painted copies · Tab stops ${reading.focusables} · announced marks ${reading.keyboardStops} · table rows ${reading.tableRows}`);
    for (const copy of found.perCopy)
      lines.push(
        `      copy ${copy.index} (${copy.role}): ${copy.answered} of ${copy.owed} marks answer a pointer` +
          (copy.visiblePx === 0 ? "  [off screen at this width]" : `  [${copy.visiblePx}px of it visible]`),
      );
    for (const one of found.short)
      lines.push(`      ← copy ${one.copy} answers for ${one.of - one.missing.length} of ${one.of}: ${one.missing.slice(0, 8).join(", ")}`);
  }
  return { rel, failed, lines };
}

function label(viewport) {
  return `${String(viewport.width).padStart(4)}x${viewport.height}`.padEnd(10);
}

if (import.meta.main) {
  const argv = process.argv.slice(2);
  const flag = (name) => {
    const at = argv.indexOf(name);
    return at >= 0 ? argv[at + 1] : null;
  };
  const asJson = argv.includes("--json");
  const live = argv.includes("--live");
  const widths = flag("--widths");
  const viewports = widths
    ? widths.split(",").map((one) => {
        const [width, height] = one.split("x").map(Number);
        return { width, height };
      })
    : WRAP_VIEWPORTS;
  const wanted = argv.filter((a) => !a.startsWith("--") && a.endsWith(".html"));
  const pages = argv.includes("--all")
    ? discoverMapWebPages().map(({ rel, abs }) => ({ rel, abs }))
    : wanted.map((p) => ({ rel: p, abs: resolve(TWIN, p) }));
  if (pages.length === 0) throw new Error("nothing to read: pass one or more delivered pages, or --all");

  let key = null;
  if (live) {
    const envPath = join(TWIN, ".env");
    key =
      mapTilerKeyFrom(process.env) ??
      (existsSync(envPath) ? mapTilerKeyFrom(parseEnvFile(readFileSync(envPath, "utf8"))) : null);
    if (!key)
      throw new Error(
        `--live needs a MapTiler key: looked for MAPTILER_KEY (and ${MAPTILER_KEY_ALIASES.join(", ")}) ` +
          `in the environment and in ${envPath}`,
      );
  }

  const browser = await puppeteer.launch({
    headless: true,
    executablePath: resolveChrome(),
    args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--no-sandbox", "--hide-scrollbars"],
  });
  let bad = 0;
  const machine = [];
  try {
    const page = await browser.newPage();
    for (const { rel, abs } of pages) {
      const readings = [];
      for (const viewport of viewports) readings.push({ viewport, state: "fallback", reading: await readWrap(page, abs, viewport) });
      if (live) {
        const keyed = keyedCopy(abs, key);
        for (const viewport of viewports)
          readings.push({ viewport, state: "live", reading: await readLiveWrap(page, keyed, viewport) });
      }
      const report = reportFor(rel, readings, plateGeometryFor(abs));
      if (report.failed) bad++;
      if (asJson) machine.push({ rel, failed: report.failed, readings });
      else console.log(`${rel}\n${report.lines.join("\n")}`);
    }
  } finally {
    await browser.close();
  }
  if (asJson) console.log(JSON.stringify(machine, null, 1));
  if (bad > 0) {
    console.error(`\n${bad} of ${pages.length} page(s) paint a world a reader cannot point at.`);
    process.exit(1);
  }
}
