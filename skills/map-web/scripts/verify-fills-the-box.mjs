// twin/skills/map-web/scripts/verify-fills-the-box.mjs
//
// READS THE BOX BACK OFF A REAL PAGE, and it is the half that makes a bake-time number safe.
//
// `delivery-frame.mjs` solves a plate's frame from the study set and from the range of box shapes a
// beat is delivered into. That range is a MEASUREMENT of the rendered page — `.mw-stage` is the
// window minus this beat's own title, source line, filter chips, legend, caveat and table — so it is
// a number the bake is TOLD rather than one it can derive, and a number a producer is told is a
// number a producer can get wrong. This driver is what catches that: it opens the delivered page in
// a real browser at the widths this format drives and reports, per width,
//
//   · the container (`.mw-stage`) and the graphic (`.mw-viewport`), and the fraction of the
//     container the graphic covers ON BOTH AXES — the owner's rule, measured rather than asserted;
//   · the box's own aspect against the range the plate was baked for (`geometry.json`'s
//     `boxAspects` / `coversTo`), so a page whose furniture has grown or shrunk since the bake is
//     named instead of silently cropping its own subject;
//   · every point label the crop cuts, through `labelsClippedByPlate` — the decision this skill has
//     carried since round five and never had a caller for. A label clipped by a frame is silent by
//     construction: the run is simply cut, nothing throws.
//
// Usage:
//   bun skills/map-web/scripts/verify-fills-the-box.mjs <page.html> [more.html ...]
//   bun skills/map-web/scripts/verify-fills-the-box.mjs --all        (every page discover-pages finds)
//   … --json      machine-readable, which is what a bake's `--box-aspects` is copied from
//
// It exits non-zero on any page that does not fill its container, so it is usable as a gate; the
// aspect-range and label readings are printed either way, because a producer re-baking a plate needs
// the numbers, not a boolean.

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import puppeteer from "puppeteer-core";
import { labelsClippedByPlate } from "./detect-label-clipped-by-plate.mjs";
import { discoverMapWebPages, TWIN } from "./discover-pages.mjs";
import { readBoxAspects, visibleBand, TOLERANCE_PX } from "./delivery-frame.mjs";

/** The capability this script carries, read by `scripts/guards.mjs` and checked against
 *  `doctrine/references/guard-catalogue.json` by `doctrine/test/guard-parity.test.ts`. */
export const GUARDS = ["boxFillsItsContainer"];

/** THE WIDTHS THIS FORMAT DRIVES, and the same three every other sweep in this skill uses. They are
 *  the population the box-aspect range is measured over, so a range read here is a range about
 *  exactly these three shapes and no others — which is why the range is recorded in the plate rather
 *  than assumed to generalise. */
export const READING_VIEWPORTS = [
  { width: 1600, height: 900 },
  { width: 1280, height: 800 },
  { width: 375, height: 812 },
];

/**
 * THE OWNER'S RULE, AS ONE READING: how much of the container the graphic covers, on the axis it
 * covers LEAST.
 *
 * `min`, never `max` and never an area. The rule is *the graphic occupies the whole box its host
 * gives it* — both axes — so the honest reading is the worse of the two: a box that fills the width
 * and half the height has taken half the room it was given, and a reading that averaged the two, or
 * took the better of them, would call it 75% or 100%. This is the third reading this format has had
 * and the argument for retiring the second is in `detect-fills-its-frame.mjs`'s own header.
 *
 * A side nobody measured is refused rather than averaged over, the same rule `plateFollowsGround`
 * states one level down: a fraction built out of a `NaN` is a reading nobody took, and handing it to
 * a floor would pass it.
 */
export function containerFraction(box, container) {
  const sides = [
    ["box width", box?.width],
    ["box height", box?.height],
    ["container width", container?.width],
    ["container height", container?.height],
  ];
  for (const [side, value] of sides)
    if (!Number.isFinite(value) || value < 0)
      throw new Error(
        `containerFraction: ${side} is ${value}, so nothing here was measured — a fraction built ` +
          `out of it would be a reading nobody took, and the floor would pass it.`,
      );
  if (!(container.width > 0) || !(container.height > 0))
    throw new Error(
      `containerFraction: a ${container.width}x${container.height} container gives the graphic no room to fill.`,
    );
  return Math.min(box.width / container.width, box.height / container.height);
}

/**
 * THE DECISION, and it needs no floor measured over a population — which is the whole difference
 * between this rule and the two it replaces.
 *
 * The area reading and the binding-axis reading both had to be calibrated: they measured how a
 * PLATE sat inside a window, the plate's shape was the producer's and the window's was the reader's,
 * and the achievable number was therefore a fact about a population that had to be re-measured every
 * time the population changed. This reading measures a LAYOUT against itself. The box is its
 * container, or it is not, and there is no honest page anywhere in this format at 0.94.
 *
 * `SUB_PIXEL` is a rounding allowance and never a margin. A browser reports fractional CSS pixels
 * for a percentage box inside a bordered container, and the difference lands in the sixth decimal;
 * this is three orders of magnitude above that and still nowhere near a layout failure — the box the
 * owner reported covered 0.332 of its container, and the smallest genuine shortfall this format can
 * produce is a whole axis.
 */
export const SUB_PIXEL = 0.001;

export function boxFillsItsContainer(fraction) {
  return { fraction, floor: 1 - SUB_PIXEL, under: fraction < 1 - SUB_PIXEL };
}

/** A DUPLICATE of the `resolveChrome` every capture script in this tree carries — a skill's own
 *  scripts stay copy-pasteable, so this is not imported from anywhere else. */
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
  candidates.push("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", "/usr/bin/google-chrome");
  const found = candidates.find((path) => existsSync(path));
  if (!found)
    throw new Error(`no Chrome to drive — looked at ${candidates.join(", ")}`);
  return found;
}

/** The plate this page was rendered from, when there is one on disk beside it. A delivered export
 *  copy has no `plate/` of its own, so the aspect-range reading is reported as `unbaked` for it
 *  rather than skipped in silence — the copy is the same bytes as the beat's own render. */
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

/** One page, at every reading viewport, in one browser. */
export async function readPage(page, abs) {
  const readings = [];
  for (const viewport of READING_VIEWPORTS) {
    await page.setViewport({ ...viewport, deviceScaleFactor: 1 });
    await page.goto(pathToFileURL(abs).href, { waitUntil: "load" });
    const measured = await page.evaluate(() => {
      const rect = (el) => {
        if (!el) return null;
        const r = el.getBoundingClientRect();
        return { width: r.width, height: r.height, left: r.left, right: r.right, top: r.top, bottom: r.bottom };
      };
      const viewportEl = document.querySelector(".mw-viewport");
      const labels = Array.from(document.querySelectorAll(".point-label")).map((el) => {
        const r = el.getBoundingClientRect();
        return {
          what: el.textContent.trim() || "a label",
          left: r.left,
          right: r.right,
          top: r.top,
          bottom: r.bottom,
        };
      });
      return {
        container: rect(document.querySelector(".mw-stage")),
        box: rect(viewportEl),
        labels,
      };
    });
    if (!measured.box || !measured.container)
      throw new Error(`${abs}: the delivered page has no .mw-viewport inside a .mw-stage`);
    readings.push({ viewport, ...measured });
  }
  return readings;
}

/** The report for one page: the fraction on both axes, the box's own aspect against what the plate
 *  covers, and every label the frame cuts. */
export function reportFor(rel, readings, geometry) {
  const lines = [];
  let failed = false;
  const aspects = [];
  // The clearance the labels this page ACTUALLY DREW turn out to need, as a fraction of the box —
  // the number `bake-plate.mjs --clearance` takes. Derived from the overruns rather than guessed at,
  // so a beat is re-baked with the room its own longest run needs and no more.
  let needX = 0;
  let needY = 0;
  for (const { viewport, container, box, labels } of readings) {
    const fraction = containerFraction(box, container);
    const found = boxFillsItsContainer(fraction);
    if (found.under) failed = true;
    const aspect = container.width / container.height;
    aspects.push(aspect);
    const clipped = labelsClippedByPlate(labels, box);
    // A CUT LABEL IS A FAILURE, not a note. The frame now crops the plate, so a run that the plate
    // held comfortably can still be cut by the box — and a clipped label is silent by construction.
    // The clearance line below prints the number that fixes it.
    if (clipped.length) failed = true;
    for (const label of labels) {
      needX = Math.max(needX, (box.left - label.left) / box.width, (label.right - box.right) / box.width);
      needY = Math.max(needY, (box.top - label.top) / box.height, (label.bottom - box.bottom) / box.height);
    }
    lines.push(
      `  ${String(viewport.width).padStart(4)}x${viewport.height}  container ${container.width.toFixed(1)}x` +
        `${container.height.toFixed(1)} (${aspect.toFixed(3)}:1)  box ${box.width.toFixed(1)}x${box.height.toFixed(1)}  ` +
        `covers ${(fraction * 100).toFixed(1)}% of it${found.under ? "  ← UNDER" : ""}` +
        (clipped.length ? `  · ${clipped.length} label(s) cut by the frame` : ""),
    );
    for (const one of clipped) lines.push(`      ${one}`);
  }
  const narrowest = Math.min(...aspects);
  const widest = Math.max(...aspects);
  lines.push(
    `  box aspects measured here: ${narrowest.toFixed(3)},${widest.toFixed(3)}   ← --box-aspects for the bake`,
  );
  if (needX > 0 || needY > 0)
    lines.push(
      `  the labels this page draws need --clearance ${Math.max(0, needX).toFixed(3)},` +
        `${Math.max(0, needY).toFixed(3)} to stay whole inside the crop`,
    );
  if (geometry?.coversTo) {
    const covered = readBoxAspects(geometry.coversTo);
    const escaped = [];
    // Compared in PIXELS OF THE SUBJECT, never in aspect: `deliveryFrame` rounds its frame height and
    // its padding to whole pixels, so a plate solved for exactly this range reads back a thousandth
    // narrow and would report a 0.2% crop that is the rounding and not a crop. `TOLERANCE_PX` is the
    // same one-pixel allowance the bake-time refusal uses, asked here about the same two bands.
    const bandAtWidest = visibleBand(geometry.frame, widest);
    const bandAtNarrowest = visibleBand(geometry.frame, narrowest);
    if (bandAtWidest.height < geometry.studySet.height - TOLERANCE_PX)
      escaped.push(
        `the box reaches ${widest.toFixed(3)}:1 and this plate covers to ${covered.widest.toFixed(3)}:1 — at that ` +
          `width a reader loses ${(
            (1 - visibleBand(geometry.frame, widest).height / geometry.studySet.height) * 100
          ).toFixed(1)}% of the subject's height off the top and bottom`,
      );
    if (bandAtNarrowest.width < geometry.studySet.width - TOLERANCE_PX)
      escaped.push(
        `the box reaches ${narrowest.toFixed(3)}:1 and this plate covers to ${covered.narrowest.toFixed(3)}:1 — at that ` +
          `width a reader loses ${(
            (1 - visibleBand(geometry.frame, narrowest).width / geometry.studySet.width) * 100
          ).toFixed(1)}% of the subject's width off each side`,
      );
    lines.push(
      escaped.length
        ? `  ESCAPED THE PLATE: ${escaped.join("; ")}`
        : `  inside the plate's own range (${covered.narrowest.toFixed(3)}..${covered.widest.toFixed(3)})`,
    );
    if (escaped.length) failed = true;
  } else {
    lines.push("  no plate geometry beside this page — the aspect range could not be checked against a bake");
  }
  return { rel, failed, lines };
}

if (import.meta.main) {
  const argv = process.argv.slice(2);
  const asJson = argv.includes("--json");
  const wanted = argv.filter((a) => !a.startsWith("--"));
  const pages = argv.includes("--all")
    ? discoverMapWebPages().map(({ rel, abs }) => ({ rel, abs }))
    : wanted.map((p) => ({ rel: p, abs: resolve(TWIN, p) }));
  if (pages.length === 0) throw new Error("nothing to read: pass one or more delivered pages, or --all");
  const browser = await puppeteer.launch({ executablePath: resolveChrome(), headless: true });
  let bad = 0;
  const machine = [];
  try {
    const page = await browser.newPage();
    for (const { rel, abs } of pages) {
      const readings = await readPage(page, abs);
      const report = reportFor(rel, readings, plateGeometryFor(abs));
      if (report.failed) bad++;
      if (asJson)
        machine.push({
          rel,
          failed: report.failed,
          readings: readings.map(({ viewport, container, box }) => ({
            viewport,
            container: { width: container.width, height: container.height },
            box: { width: box.width, height: box.height },
            fraction: containerFraction(box, container),
            aspect: container.width / container.height,
          })),
        });
      else console.log(`${rel}\n${report.lines.join("\n")}`);
    }
  } finally {
    await browser.close();
  }
  if (asJson) console.log(JSON.stringify(machine, null, 1));
  if (bad > 0) {
    console.error(`\n${bad} of ${pages.length} page(s) did not fill the container they were given.`);
    process.exit(1);
  }
}
