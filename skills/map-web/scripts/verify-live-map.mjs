// twin/skills/map-web/scripts/verify-live-map.mjs
//
// THE GUARD FOR THE DEFECT TWO NUMBERS DESCRIBING ONE CIRCLE CAUSED.
//
// The live map draws a mark at one radius and answers a hover at another, and for a while those two
// came from different arithmetic: the circles were sized by fitting the square PLATE into the
// container (`Math.min(w / frameW, h / frameH)`) while the camera was fitted to the STUDY SET at
// runtime. Measured on the seed at 1600 x 900 — canvas 1566 x 583 — that drew Paris at 36px on
// cartography that had grown by 1.57x: a small dark circle in the middle of the country it was
// supposed to cover, and a hover that only fired on the small one. Nothing was red. The owner found
// it by looking at the map.
//
// THE FIRST VERSION OF THIS FILE WAS VACUOUS, and that is recorded here rather than quietly fixed,
// because it is the exact failure the project's own rule exists to prevent. It walked outward from a
// mark asking `queryRenderedFeatures` where the mark ended, and compared that to the radius the mark
// was drawn at. Those two numbers are THE SAME NUMBER: MapLibre hit-tests against the circle it
// painted, so they agree no matter what scale is fed in. Run against a copy with the defect put back
// deliberately, it passed — 26 marks, every one "the same circle", exit 0.
//
// So it now compares three things that can genuinely come apart:
//
//   1. THE DRAWN RADIUS against the radius the CAMERA implies, derived here independently from the
//      plate's own recorded `degreesPerPixel` and the zoom read off the live map. A scale computed
//      from the container's box instead of the camera diverges from this the moment the container's
//      aspect differs from the plate's — which is the defect.
//   2. THE DRAWN RADIUS against the distance a REAL POINTER still gets a tooltip at. Not
//      `queryRenderedFeatures`, which answers about the map's own geometry rather than about what a
//      reader can reach: `page.mouse.move` outward, reading the tooltip. This is what would catch
//      the per-point `<button>` overlay getting its pointer-events back and shrinking every hit
//      target to a fixed 28px again.
//   3. EVERY MARK IN THE STUDY SET IS ON SCREEN. The beat's title claims all of them. A pan bound
//      taken from the square plate's own corners raised MapLibre's minimum zoom until 583px of
//      height held 11° of latitude against the study set's 21, and cropped six of thirteen — and
//      neither of the comparisons above could see it.
//
//   4. B6.18b — A LABEL IS ON SCREEN IF AND ONLY IF THE MARK IT NAMES IS PAINTED. The owner's
//      report: *"the highlighted symbol's label does not disappear with its symbol when a filter is
//      applied — it should."* This began as `labels === painted`, which quietly asserted that a beat
//      labels every mark: `proof/mapgen-symbol-web` labels ONE point on purpose (label width is a
//      fixed number of CSS pixels while its position is a percentage, so decluttering computed once
//      is wrong at every width but one), and the count rule called that correct beat broken in all
//      five filter states. Comparing SETS by `data-key` says the same thing about the seed and the
//      truth about the symbol beat. Mutation, run in a copy outside the tree: delete the
//      `.point-label:not([data-group=…])` rule from the symbol beat's own `buildCss` and re-render —
//      *"FAIL … filter mw-filter-sunda-arc: the labels q0 are still on screen with their own marks
//      filtered away — a name floating over a mark that is not on the map"*, in three of the four
//      arc states.
//
//   5. B6.20 — THE PAINTED HIGHLIGHT IS A CIRCLE, IN SCREEN PIXELS, AND IT IS THE MARK'S OWN SIZE.
//      The owner's report: *"le rond du hover est trop large, c'est chelou"* — hovering the M9.1
//      disc on `proof/mapgen-symbol-web` painted a 140.9 x 53.2 px grey ellipse. Not degrees of
//      longitude, which is the usual way this class arrives: a size stated as TWO percentages, one
//      resolving against the container's width and one against its height, in an overlay the live
//      swap had stopped keeping square. Asserted as two independent claims, because they come apart
//      independently — the halo is ROUND, and (where the beat declares `data-r`) the halo is
//      `max(28, 2·r + 10)` with `r` derived here from the plan's own `degreesPerPixel` and the live
//      zoom, never read back from the page's own style.
//
//      MUTATIONS, run in an rsync copy outside the tree (`/tmp/mut-halo/twin`), re-rendering the
//      seed each time:
//        A. the second percentage put back on `.pt` + the live sizing disabled →
//           *"the highlight on paris is 194.2 x 72.3px — an ellipse, not a circle"* AND
//           *"… is 194.2px across but its mark is drawn at 87.4px, so the halo should be 97.4px"*,
//           both at both container aspects, for all thirteen marks.
//        B. `HALO_PAD_PX` 10 → 40, which keeps the halo perfectly ROUND and stops it being the
//           mark's size → **0 "ellipse" failures** and thirteen size failures. The two claims are
//           genuinely separate, and that is what B proves.
//
// AT TWO CONTAINER ASPECTS, and that is the point rather than thoroughness for its own sake: the
// defect is invisible when the container's aspect matches the plate's, because then the box-derived
// scale and the camera-derived one agree. A square-ish container would have passed the whole time.
//
// Needs the network and a real MapTiler key, so it is gated exactly as `keys.test.ts` gates its own
// live probe: with a key it runs for real, without one it says plainly that it did not.
//
// Usage:
//   bun skills/map-web/scripts/verify-live-map.mjs [--html <file>] [--key <key>]

import { existsSync, readdirSync, readFileSync, mkdtempSync, writeFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";
import puppeteer from "puppeteer-core";
import { splashEnvPath } from "./splash-root.mjs";

/** The two shapes. The first is wide enough that a square plate's scale and the camera's disagree
 *  by more than a third; the second is tall, so the disagreement reverses sign. One of them alone
 *  proves nothing. */
export const SHAPES = [
  { label: "landscape 1600x900", width: 1600, height: 900 },
  { label: "portrait 900x1400", width: 900, height: 1400 },
];

/** How far the drawn radius may sit from the camera-derived one, as a FRACTION.
 *
 *  A fraction rather than a pixel count because the quantity is a ratio of two ground scales, and
 *  the zoom it is read at is a float. 1% is well inside the defect this exists to catch: at
 *  1600 x 900 the box-derived scale was 0.583 against a camera-derived 1.566, a factor of 2.7. */
export const SCALE_TOLERANCE = 0.01;

/** How far the pointer walk may differ from the drawn edge, in CSS pixels. The walk steps one pixel
 *  at a time and the circle's own edge is antialiased across about one more, so three pixels is the
 *  measurement's noise. A hit target that had gone back to a fixed 28px button would miss by tens. */
export const POINTER_TOLERANCE_PX = 3;

/** How far the painted highlight's own width may sit from its height before it reads as an ellipse
 *  rather than a circle (B6.20). One pixel: a box laid out at a fractional CSS size can round its
 *  two axes to either side of the same number, and nothing wider than that is rounding. The defect
 *  this exists to catch missed by 87.7px (140.9 x 53.2). */
export const HALO_ROUNDNESS_TOLERANCE_PX = 1;

/** The halo's own arithmetic, duplicated from `assets/live-map.mjs` ON PURPOSE. A verifier that
 *  imported the constants it checks would agree with the implementation by construction — the same
 *  vacuity this script's own header records it having shipped once already. These two numbers are
 *  the contract; if they change there, this line has to be changed here, deliberately. */
export const HALO_PAD_PX = 10;
export const HALO_FLOOR_PX = 28;

/** How far the measured halo may sit from the size the camera implies, in CSS pixels. One pixel,
 *  for the same rounding reason as the roundness tolerance — the quantity itself is a derived
 *  length, not a ratio, so a pixel budget is the honest unit here. */
export const HALO_SIZE_TOLERANCE_PX = 1;

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
  candidates.push("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome");
  const found = candidates.find((path) => existsSync(path));
  if (!found)
    throw new Error(
      `no Chrome to capture with. Looked in:\n  ${candidates.join("\n  ")}\nSet CHROME_PATH, or run: bunx puppeteer browsers install chrome`,
    );
  return found;
}

export function parseEnvFile(text) {
  const env = {};
  for (const line of text.split(/\r?\n/)) {
    const match = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(\S+)\s*$/.exec(line);
    if (match) env[match[1]] = match[2];
  }
  return env;
}

/** The delivered file carries a placeholder (ruling R1b). A keyed copy is written to a temp
 *  directory and never anywhere inside the tree — the guard that keeps keys out of the repository
 *  would otherwise be defeated by the guard that checks the map works. */
export function keyedCopy(htmlPath, key) {
  const dir = mkdtempSync(join(tmpdir(), "mw-live-verify-"));
  const out = join(dir, "keyed.html");
  writeFileSync(out, readFileSync(htmlPath, "utf8").split("__MAPTILER" + "_KEY__").join(key));
  return out;
}

/** The radius a mark SHOULD be drawn at, from the plate's own ground scale and the live camera's —
 *  derived here rather than read from the page, so it is an independent second opinion rather than
 *  the implementation agreeing with itself. */
export function expectedRadiusPx(frameRadius, planDegreesPerPixel, liveZoom) {
  const liveDegreesPerPixel = 360 / (512 * Math.pow(2, liveZoom));
  return frameRadius * (planDegreesPerPixel / liveDegreesPerPixel);
}

/**
 * Drives one container shape and reports, per mark, what the map drew, what the camera implies, and
 * how far a real pointer still reaches it.
 */
export async function measureShape(browser, keyedPath, shape) {
  const page = await browser.newPage();
  await page.setViewport({ width: shape.width, height: shape.height, deviceScaleFactor: 1 });
  await page.goto(`file://${keyedPath}`, { waitUntil: "load" });
  await page.waitForFunction("document.documentElement.classList.contains('mw-live')", { timeout: 30000 });
  // One idle beat, so the first tile paint cannot be mistaken for the mark layer not being there.
  await new Promise((resolve) => setTimeout(resolve, 500));

  const state = await page.evaluate(() => {
    const map = window.__mwMap;
    const container = document.getElementById("mw-map");
    const box = container.getBoundingClientRect();
    const scale = map.__mwScale;
    const features = map.getSource("mw-marks")._data.features;
    return {
      canvas: [container.clientWidth, container.clientHeight],
      origin: [box.x, box.y],
      scale,
      zoom: map.getZoom(),
      marks: features.map((feature) => {
        const at = map.project(feature.geometry.coordinates);
        const drawn = feature.properties.r * scale;
        return {
          key: feature.properties.key,
          drawn,
          frameRadius: feature.properties.r,
          x: at.x,
          y: at.y,
          // A mark whose whole disc is inside the canvas. The beat's title claims every point, so a
          // mark that is not here is a cropped claim, not a measurement that happens to be missing.
          onScreen: at.x - drawn > 0 && at.y - drawn > 0 && at.x + drawn < box.width && at.y + drawn < box.height,
        };
      }),
      // B6.20 — the PAINTED HIGHLIGHT, measured as a screen box rather than read out of a style
      // string. `.pt` is what carries the hover/focus/active background, so its own rendered
      // rectangle IS the halo the reader sees, whatever the CSS that produced it says.
      halos: Array.from(document.querySelectorAll(".pt")).map((node) => {
        const rect = node.getBoundingClientRect();
        return {
          key: node.getAttribute("data-key"),
          width: rect.width,
          height: rect.height,
          // The mark's own radius in the bake's frame units, when the beat declares one. Absent on
          // a beat whose marks are not camera-scaled circles (a choropleth fill, a hex bin), where
          // the only claim below is roundness.
          frameRadius: Number(node.getAttribute("data-r") || 0),
        };
      }),
    };
  });

  // The pointer walk, driven from OUTSIDE the page. Whether a reader can reach a mark is a fact
  // about the browser's own hit testing over the whole layered page — the canvas, the overlay's
  // buttons and their pointer-events — and nothing inside `page.evaluate` can observe it.
  // Integer coordinates only: a fractional `mouse.move` does nothing at all.
  const biggest = state.marks.filter((m) => m.onScreen).sort((a, b) => b.drawn - a.drawn)[0];
  let pointerReach = null;
  if (biggest) {
    const cx = Math.round(state.origin[0] + biggest.x);
    const cy = Math.round(state.origin[1] + biggest.y);
    await page.mouse.move(cx, cy);
    await new Promise((resolve) => setTimeout(resolve, 120));
    let reach = -1;
    for (let d = 0; d <= Math.ceil(biggest.drawn) + 30; d++) {
      await page.mouse.move(cx + d, cy);
      const showing = await page.evaluate(() => {
        const tip = document.getElementById("tooltip");
        return !tip.hidden && tip.textContent.length > 0;
      });
      if (!showing) break;
      reach = d;
    }
    pointerReach = { key: biggest.key, drawn: biggest.drawn, reach };
  }

  await page.close();
  return { shape: shape.label, ...state, pointerReach };
}

/**
 * Clicks every filter chip for real and counts BOTH halves of the mark at each state.
 *
 * The filter is pure CSS, which reaches the HTML overlay only; the circles are a MapLibre layer,
 * which CSS cannot address. So this compares the two counts rather than checking that either
 * changed — the trap is that "the filter did something" passes while only one half moves, which is
 * exactly the state this was written after: 6 of 13 labels hidden, 13 of 13 circles still painted.
 */
export async function measureFilterStates(browser, keyedPath, shape) {
  const page = await browser.newPage();
  await page.setViewport({ width: shape.width, height: shape.height, deviceScaleFactor: 1 });
  await page.goto(`file://${keyedPath}`, { waitUntil: "load" });
  await page.waitForFunction("document.documentElement.classList.contains('mw-live')", { timeout: 30000 });
  await new Promise((resolve) => setTimeout(resolve, 500));

  const chips = await page.evaluate(() =>
    Array.from(document.querySelectorAll("input[name=mw-filter]")).map((input) => input.id),
  );
  const states = [];
  for (const chip of chips) {
    // A real click on the chip's own `<label>`, which is how a reader operates it — not
    // `input.checked = true`, which would set the property without the `change` event the live
    // layer listens for, and would therefore pass with the wiring removed.
    await page.evaluate((id) => document.querySelector(`label:has(#${id})`).click(), chip);
    await new Promise((resolve) => setTimeout(resolve, 350));
    states.push({
      chip,
      ...(await page.evaluate(() => {
        const keysOf = (selector) =>
          Array.from(document.querySelectorAll(selector))
            .filter((node) => node.offsetParent !== null)
            .map((node) => node.getAttribute("data-key"))
            .filter(Boolean);
        const source = window.__mwMap.getSource("mw-marks")._data.features;
        const filter = window.__mwMap.getFilter("mw-marks");
        return {
          labelKeys: keysOf(".point-label"),
          buttonKeys: keysOf(".pt"),
          paintedKeys: source
            .filter((feature) => !filter || feature.properties[filter[1][1]] === filter[2])
            .map((feature) => feature.properties.key),
          // Every key that carries a label AT ALL, filtered or not — the denominator the label
          // count has to be read against. A beat may label every mark (this skill's own seed) or
          // exactly one (proof/mapgen-symbol-web labels only the subject, deliberately: label
          // width is fixed CSS pixels while position is a percentage, so decluttering computed
          // once is wrong at every width but one). Comparing a raw label count to a painted count
          // asserts the first shape and calls the second a defect.
          labelledKeys: Array.from(document.querySelectorAll(".point-label"))
            .map((node) => node.getAttribute("data-key"))
            .filter(Boolean),
        };
      })),
    });
  }
  await page.close();
  return { shape: shape.label, chips, states };
}

export async function verifyLiveMap({ htmlPath, key }) {
  // The plate's own ground scale, read out of the delivered page rather than passed in, so the
  // second opinion below is built from what actually shipped.
  const plan = JSON.parse(
    /<script type="application\/json" id="mw-live-plan">([\s\S]*?)<\/script>/.exec(readFileSync(htmlPath, "utf8"))[1],
  );
  const keyedPath = keyedCopy(htmlPath, key);
  // Printed, because a committed page is deliberately unkeyed (R1b) and therefore shows its
  // FALLBACK when you double-click it. This is the path to open in a browser to look at the live
  // map with your own eyes — outside the tree, so looking at it can never commit a key.
  console.log(`keyed copy (open this to look at the live map): ${keyedPath}\n`);
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: resolveChrome(),
    args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--no-sandbox", "--hide-scrollbars"],
  });
  try {
    const results = [];
    for (const shape of SHAPES) results.push(await measureShape(browser, keyedPath, shape));
    const failures = [];
    for (const result of results) {
      // 1. the drawn radius against the one the camera implies
      for (const mark of result.marks) {
        const expected = expectedRadiusPx(mark.frameRadius, plan.degreesPerPixel, result.zoom);
        const off = Math.abs(mark.drawn - expected) / Math.max(expected, 1e-6);
        if (off > SCALE_TOLERANCE)
          failures.push(
            `${result.shape}: ${mark.key} is drawn at ${mark.drawn.toFixed(1)}px but this camera implies ` +
              `${expected.toFixed(1)}px (${(off * 100).toFixed(0)}% out) — the mark is being sized by ` +
              `something other than the camera, which is what the plate's own box does`,
          );
      }
      // 1b. THE PAINTED HIGHLIGHT IS A CIRCLE, IN SCREEN PIXELS, AND IT IS THE MARK'S OWN SIZE.
      //
      // The defect this closes, reported by the owner on `proof/mapgen-symbol-web` and then
      // measured: hovering the M9.1 disc painted a wide flattened grey ellipse, 140.9 x 53.2 px
      // around a circle a fraction of that across ("le rond du hover est trop large, c'est chelou").
      // The cause was not degrees-of-longitude, which is the usual way this class arrives — it was a
      // size stated as TWO percentages, one resolving against the container's width and one against
      // its height, in an overlay the live swap had stopped keeping square (1566 x 591 = 2.65,
      // exactly the ratio measured).
      //
      // Two claims, and they come apart independently, so they are asserted separately: the halo is
      // ROUND, and the halo is the MARK's size plus a small constant. The second is derived from the
      // plan and the live zoom — the same independent second opinion `expectedRadiusPx` gives the
      // mark itself — never from the number the page wrote into its own style.
      for (const halo of result.halos) {
        if (Math.abs(halo.width - halo.height) > HALO_ROUNDNESS_TOLERANCE_PX)
          failures.push(
            `${result.shape}: the highlight on ${halo.key} is ${halo.width.toFixed(1)} x ` +
              `${halo.height.toFixed(1)}px — an ellipse, not a circle. A size stated in a ` +
              `coordinate space whose two axes are not the same length is how this arrives.`,
          );
        if (!(halo.frameRadius > 0)) continue;
        const drawn = expectedRadiusPx(halo.frameRadius, plan.degreesPerPixel, result.zoom);
        const expected = Math.max(HALO_FLOOR_PX, drawn * 2 + HALO_PAD_PX);
        if (Math.abs(halo.width - expected) > HALO_SIZE_TOLERANCE_PX)
          failures.push(
            `${result.shape}: the highlight on ${halo.key} is ${halo.width.toFixed(1)}px across but ` +
              `its mark is drawn at ${(drawn * 2).toFixed(1)}px, so the halo should be ` +
              `${expected.toFixed(1)}px — the painted highlight is not derived from the mark it belongs to`,
          );
      }
      // 2. every mark the beat claims is on screen
      const cropped = result.marks.filter((mark) => !mark.onScreen).map((mark) => mark.key);
      if (cropped.length > 0)
        failures.push(
          `${result.shape}: ${cropped.length} of ${result.marks.length} marks are off the canvas ` +
            `(${cropped.join(", ")}) — the beat's title claims all of them`,
        );
      // 3. a real pointer reaches the whole disc
      if (!result.pointerReach) failures.push(`${result.shape}: no mark was on screen to walk a pointer across`);
      else if (Math.abs(result.pointerReach.reach - result.pointerReach.drawn) > POINTER_TOLERANCE_PX)
        failures.push(
          `${result.shape}: ${result.pointerReach.key} is drawn at ${result.pointerReach.drawn.toFixed(1)}px ` +
            `but a pointer stops reaching it at ${result.pointerReach.reach}px — the hit area is not the mark`,
        );
    }
    // The filter, at one shape — it is a property of the page, not of the container.
    const filtering = await measureFilterStates(browser, keyedPath, SHAPES[0]);
    for (const state of filtering.states) {
      const painted = new Set(state.paintedKeys);
      // B6.18b, as an invariant rather than as a count: a label is on screen if and only if the
      // mark it names is painted. Stated this way it holds for a beat that labels every mark and
      // for one that labels a single subject, and it still reddens on the defect the owner
      // reported — "the highlighted symbol's label does not disappear with its symbol when a
      // filter is applied".
      const orphans = state.labelKeys.filter((key) => !painted.has(key));
      if (orphans.length > 0)
        failures.push(
          `${filtering.shape}, filter ${state.chip}: the labels ${orphans.join(", ")} are still on screen ` +
            `with their own marks filtered away — a name floating over a mark that is not on the map`,
        );
      const missing = state.labelledKeys.filter(
        (key) => painted.has(key) && !state.labelKeys.includes(key),
      );
      if (missing.length > 0)
        failures.push(
          `${filtering.shape}, filter ${state.chip}: the marks ${missing.join(", ")} are painted but their ` +
            `own labels are hidden — the label and its mark are following two different mechanisms`,
        );
      if (state.buttonKeys.length !== state.paintedKeys.length)
        failures.push(
          `${filtering.shape}, filter ${state.chip}: ${state.buttonKeys.length} hit targets visible but ` +
            `${state.paintedKeys.length} marks painted — the keyboard path and the drawn map disagree about ` +
            `what is on the page`,
        );
    }
    // Anti-vacuity, and it is the whole reason this is not just an equality: with the filter broken
    // in BOTH halves at once, every count would be 13 and every equality above would hold. At least
    // two distinct counts means the control actually narrows something.
    const distinct = new Set(filtering.states.map((state) => state.paintedKeys.length));
    if (filtering.chips.length > 1 && distinct.size < 2)
      failures.push(
        `${filtering.shape}: every filter state paints the same ${[...distinct][0]} marks across ` +
          `${filtering.chips.length} chips — the filter is not narrowing anything, so the counts agreeing proves nothing`,
      );

    return { results, filtering, failures };
  } finally {
    await browser.close();
  }
}

if (import.meta.main) {
  const argv = process.argv.slice(2);
  const flag = (name, fallback) => {
    const at = argv.indexOf(name);
    return at >= 0 ? argv[at + 1] : fallback;
  };
  const htmlPath = flag("--html", join(import.meta.dirname, "..", "output-proof", "population.html"));
  // The Splash root's own `.env` — the same file `recordKey` writes into. See `splash-root.mjs`
  // for why a fixed three-level climb was the wrong shape.
  const envPath = splashEnvPath(import.meta.dirname);
  const env = existsSync(envPath) ? parseEnvFile(readFileSync(envPath, "utf8")) : {};
  const key = flag("--key", process.env.MAPTILER_KEY ?? env.MAPTILER_KEY);
  if (!key) {
    console.log("no MAPTILER_KEY — the live map cannot be driven, so nothing was verified.");
    process.exit(0);
  }
  const { results, filtering, failures } = await verifyLiveMap({ htmlPath, key });
  for (const result of results) {
    console.log(
      `${result.shape}  canvas ${result.canvas[0]}x${result.canvas[1]}  zoom ${result.zoom.toFixed(3)}  ` +
        `scale ${result.scale.toFixed(3)}  ${result.marks.filter((m) => m.onScreen).length}/${result.marks.length} on screen`,
    );
    if (result.pointerReach)
      console.log(
        `   pointer: ${result.pointerReach.key} drawn ${result.pointerReach.drawn.toFixed(1)}px, ` +
          `reachable to ${result.pointerReach.reach}px`,
      );
  }
  for (const state of filtering.states)
    console.log(
      `   filter ${state.chip.padEnd(34)} labels ${String(state.labelKeys.length).padStart(2)}/${String(state.labelledKeys.length).padStart(2)}  ` +
        `hit targets ${String(state.buttonKeys.length).padStart(2)}  marks painted ${String(state.paintedKeys.length).padStart(2)}`,
    );
  if (failures.length > 0) {
    for (const failure of failures) console.error(`FAIL ${failure}`);
    process.exit(1);
  }
  console.log(
    "the drawn mark matches its camera, nothing is cropped, a pointer reaches the whole disc, and both " +
      "halves of every mark obey the same filter.",
  );
}
