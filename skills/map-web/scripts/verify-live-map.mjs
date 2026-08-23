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
// This skill's own live layer, not another skill's: `spansTheWorld` is the derivation `fitPadding`
// already makes at runtime, and reading it here is what keeps the driver and the page from
// disagreeing about which beat is allowed to paint a second world.
import { spansTheWorld } from "../assets/live-map.mjs";

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

/** THE MARK LAYERS THIS PAGE ACTUALLY HAS, read from its own live plan.
 *
 *  THE DEFECT THIS CLOSES: this file used to read `map.getSource("mw-marks")._data.features` — the
 *  SYMBOL seed's layer id, typed in three places — so it crashed with
 *  `Cannot read properties of undefined (reading '_data')` on any beat that is not a symbol map,
 *  including the committed `proof/mapgen-choropleth-web/renders/choropleth.html`. Four of the five
 *  map types this format claims could not be driven by their own live probe.
 *
 *  The vocabulary is not invented here: `live-map.mjs`'s own `wireHover` selects the interrogable
 *  layers as `layer.hover !== false`, and this reads the same field off the same plan. A choropleth
 *  answers `["mw-regions"]`, the symbol seed `["mw-marks"]`, and a beat that renames its layers
 *  tomorrow is driven unchanged. */
export function hoverLayerIds(plan) {
  const layers = Array.isArray(plan.layers) ? plan.layers : [];
  const ids = layers.filter((layer) => layer.hover !== false).map((layer) => layer.id);
  if (ids.length === 0)
    throw new Error(
      `this page's live plan declares no hoverable layer, so there is nothing to interrogate. ` +
        `Layers found: ${layers.map((layer) => `${layer.id} (hover ${layer.hover})`).join(", ") || "none"}`,
    );
  return ids;
}

/** How far the visible longitude span may exceed one full turn before the reader is looking at more
 *  than one painted world. One degree: a fit is a float and the camera lands on it, and nothing
 *  under a degree is a repeated continent.
 *
 *  SINCE THE WRAP RULING (2026-08-23) THIS IS ASKED ONLY OF A BEAT THAT IS NOT THE WORLD. A world
 *  camera fills its box by repeating the world, marks and all, and the count of copies is the point
 *  rather than the defect; `verify-wraps-the-world.mjs` measures those. A continent beat painting a
 *  second copy of itself is still the padding defect this number was measured for. */
export const WORLD_SPAN_TOLERANCE_DEG = 1;

/** HOW FINE THE GRID IS that asks the map for a pixel it attributes to a mark — `grid - 1` samples
 *  on each axis inside the mark's own projected bounding box, so 12 is 11x11.
 *
 *  MEASURED RATHER THAN PICKED, on the committed 241-region world beat at 1600x900: this grid finds
 *  65 marks with no pixel at all and 91 with none to spare; doubling it to 24 (a 23x23 grid, four
 *  times the queries) finds 63 and 90. Two marks in 241 for four times the cost, so the finer grid
 *  buys nothing a journalist would act on differently — and the direction of the error is the safe
 *  one: a coarser grid can only OVER-report a mark as unreachable, never miss one that is. */
export const PIXEL_PROBE_GRID = 12;

/** How many marks the live pointer walk visits per container shape. Every mark when the beat has
 *  few; an even sample when it has many — a 241-region world choropleth at two shapes would
 *  otherwise be several thousand real pointer moves. The sample is stated in the output, because a
 *  check whose coverage is not said out loud is one nobody can weigh. */
export const LIVE_HOVER_SAMPLE = 40;

/** The MapTiler key's other names. A byte-for-byte duplicate of `bake-plate.mjs`'s own list in this
 *  same skill, and the reason it is here at all: this file used to read `process.env.MAPTILER_KEY`
 *  alone, while the root's `.env` holds `REMOTION_MAPTILER_KEY` and `VITE_MAPTILER_KEY`, so the
 *  probe printed "no MAPTILER_KEY", verified nothing, and exited 0 on a machine that had a working
 *  key the whole time. */
export const MAPTILER_KEY_ALIASES = ["MAPTILER_API_KEY", "REMOTION_MAPTILER_KEY", "VITE_MAPTILER_KEY"];

/** THE ONE RESOLUTION OF "IS THERE A KEY, AND WHAT IS IT", over any bag of names — `process.env`, a
 *  parsed `.env`, or a synthetic one in a test.
 *
 *  IT IS A FUNCTION RATHER THAN AN EXPRESSION BECAUSE THE EXPRESSION DRIFTED. Round two fixed the
 *  probe to walk the alias list; `test/live-map.test.ts`'s own gate — the thing that decides whether
 *  the probe is run at all — kept reading `MAPTILER_KEY` alone. On a machine holding a working key
 *  under `REMOTION_MAPTILER_KEY`, the probe was therefore never invoked, the test printed "live map
 *  not driven: no MAPTILER_KEY in twin/.env", and the suite stayed green having never driven the
 *  live layer once. Fixing a mechanism and leaving its gate on the old reading leaves the mechanism
 *  exactly as unreachable as before.
 *
 *  An EMPTY string is not a key: `?? null` would hand one back and the map would boot against
 *  `?key=`, failing at the tile server with a network error instead of here with a sentence. */
export function mapTilerKeyFrom(from) {
  for (const name of ["MAPTILER_KEY", ...MAPTILER_KEY_ALIASES]) {
    const value = from?.[name];
    if (typeof value === "string" && value.length > 0) return value;
  }
  return null;
}

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

/** EVERY MARK THE SCAN FOUND NO PIXEL FOR — the names, in the order the beat declares them.
 *
 *  Pulled out of `measureShape` so it can be driven without a browser and without a key: everything
 *  else about this measurement needs a real camera, and a derivation nothing can red is how a count
 *  comes to be reported off the SAMPLE while reading like the whole population — which is what this
 *  replaced. `pixels` is the scan's own answer, keyed; a mark absent from it got no pixel it owns
 *  with a pixel to spare, anywhere inside its own projected bounding box.
 *
 *  These marks have no pointer path at all: not a colliding one, none. No hit target creates one. */
export function marksWithNoPixel(candidates, pixels) {
  return candidates.filter((mark) => !pixels[mark.key]).map((mark) => mark.key);
}

/**
 * Drives one container shape and reports, per mark, what the map drew, what the camera implies, and
 * how far a real pointer still reaches it.
 */
export async function measureShape(browser, keyedPath, shape, plan) {
  const page = await browser.newPage();
  await page.setViewport({ width: shape.width, height: shape.height, deviceScaleFactor: 1 });
  await page.goto(`file://${keyedPath}`, { waitUntil: "load" });
  await page.waitForFunction("document.documentElement.classList.contains('mw-live')", { timeout: 30000 });
  // One idle beat, so the first tile paint cannot be mistaken for the mark layer not being there.
  await new Promise((resolve) => setTimeout(resolve, 500));

  const state = await page.evaluate(({ layerIds, anchors }) => {
    const map = window.__mwMap;
    const container = document.getElementById("mw-map");
    const box = container.getBoundingClientRect();
    const scale = map.__mwScale;
    // EVERY hoverable layer this page declares, not one typed id. A choropleth's marks are polygons
    // in `mw-regions`; a symbol beat's are circles in `mw-marks`; both are read the same way.
    const features = layerIds.flatMap((id) => map.getSource(id)._data.features);
    const bounds = map.getBounds();
    return {
      canvas: [container.clientWidth, container.clientHeight],
      origin: [box.x, box.y],
      scale,
      zoom: map.getZoom(),
      // THE VISIBLE LONGITUDE SPAN. Past one full turn the reader is looking at a second painted
      // copy of the world — see `worldsPainted` below for what that cost on a real beat.
      lonSpan: bounds.getEast() - bounds.getWest(),
      bounds: [bounds.getWest(), bounds.getSouth(), bounds.getEast(), bounds.getNorth()],
      marks: features.map((feature) => {
        // A POINT PROJECTS ITSELF; A POLYGON DOES NOT. The plan already records one anchor per key —
        // the pixel a beat's own direct label hangs from — so a region is located by the same point
        // its label is, rather than by a centroid invented here.
        const point =
          feature.geometry.type === "Point" ? feature.geometry.coordinates : anchors[feature.properties.key];
        const at = point ? map.project(point) : null;
        // `r` is a circle beat's own frame radius. A fill has none, and the size comparisons below
        // are skipped for it rather than run against a zero.
        const frameRadius = Number.isFinite(feature.properties.r) ? feature.properties.r : null;
        const drawn = frameRadius == null ? null : frameRadius * scale;
        const pad = drawn ?? 0;
        return {
          key: feature.properties.key,
          // WHAT THIS MARK SHOULD SAY, taken from the LIVE PLAN — and the tooltip it is compared
          // against is written from the SSR'd `.pt[data-detail]` (`showTooltip`'s own first
          // choice). Two different sources for one fact, which is what stops this being the page
          // agreeing with itself. A beat whose plan carries the whole `detail` string is held to
          // it exactly; one that carries only a `name` (this skill's own symbol seed) is held to
          // the tooltip CONTAINING that name, which still separates "this mark", "the neighbouring
          // mark" and "nothing at all" — the three states this walk exists to tell apart.
          detail: feature.properties.detail ?? null,
          name: feature.properties.name ?? null,
          drawn,
          frameRadius,
          x: at ? at.x : null,
          y: at ? at.y : null,
          located: at != null,
          // A mark whose whole disc is inside the canvas — or, for a region, whose own anchor is.
          // The beat's title claims every one of them, so a mark that is not here is a cropped
          // claim, not a measurement that happens to be missing.
          onScreen:
            at != null && at.x - pad > 0 && at.y - pad > 0 && at.x + pad < box.width && at.y + pad < box.height,
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
  }, { layerIds: hoverLayerIds(plan), anchors: plan.anchors ?? {} });

  // The pointer walk, driven from OUTSIDE the page. Whether a reader can reach a mark is a fact
  // about the browser's own hit testing over the whole layered page — the canvas, the overlay's
  // buttons and their pointer-events — and nothing inside `page.evaluate` can observe it.
  // Integer coordinates only: a fractional `mouse.move` does nothing at all.
  const biggest = state.marks
    .filter((m) => m.onScreen && m.drawn != null)
    .sort((a, b) => b.drawn - a.drawn)[0];
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

  // ── THE LIVE HOVER, PER MARK ────────────────────────────────────────────────────────────────
  //
  // THE DEFECT THIS CLOSES: live, the thing under a mark's own centre is the MapLibre canvas — the
  // overlay's buttons have their pointer-events dropped on purpose (`live-map.mjs`'s `wireHover`
  // says so), and `queryRenderedFeatures` is what answers. So `verify-interaction.mjs`'s invariant
  // ("every point's own hit target is the topmost thing at its own centre") is FALSE in this layer
  // BY DESIGN, and that script only ever drives the fallback. Nothing measured whether hovering
  // region X live actually shows X. The walk above visits ONE mark, the biggest.
  //
  // THE PIXEL IS ASKED OF THE MAP, NEVER GUESSED. The first version of this walk hovered each mark's
  // own label ANCHOR and reported four false failures on the committed choropleth: an anchor is where
  // a beat hangs a direct LABEL, which for Norway and Denmark is open water and for Croatia is
  // inside Bosnia. So a probe pixel is one the map ITSELF attributes to that mark
  // (`queryRenderedFeatures` over the beat's own hoverable layers), and a real pointer is then sent
  // to it from outside the page.
  //
  // WHAT IT PROVES AND WHAT IT DOES NOT: the plan is where both the tooltip and this expectation
  // come from, so this is a check of the WIRING — the pointer reaches this mark, and the tooltip
  // that appears is this mark's and not its neighbour's — never of the arithmetic behind the number.
  // That is `render-web.mjs`'s own join, checked where the join happens. And a mark the map gives NO
  // pixel to (Monaco on a world camera is under one) is REPORTED rather than failed: it is genuinely
  // unreachable by pointer, which is why this format carries a keyboard path and a table.
  //
  // THE PIXEL SCAN RUNS OVER EVERY MARK, NOT OVER THE SAMPLE, and that is a deliberate split. The
  // HOVER walk is a real pointer sent from outside the page and costs a round trip per mark, so it
  // stays sampled. Asking the map which pixel it gives a mark is one `page.evaluate`, so it is asked
  // of ALL of them — because the number that matters to a journalist is how many of THEIR marks a
  // reader cannot reach, and a count over 40 of 241 reported as if it were the whole is the kind of
  // sample this file's own header was written about. Measured on the world beat at 1600x900: 91 of
  // 241 get no pixel with a pixel to spare, of which 63 get no pixel whatever.
  const candidates = state.marks.filter((mark) => mark.detail || mark.name);
  const step = Math.max(1, Math.ceil(candidates.length / LIVE_HOVER_SAMPLE));
  const sampled = candidates.filter((_, at) => at % step === 0);
  const pixels = await page.evaluate(
    ({ layerIds, keys, grid }) => {
      const map = window.__mwMap;
      const container = document.getElementById("mw-map");
      const width = container.clientWidth;
      const height = container.clientHeight;
      const features = layerIds.flatMap((id) => map.getSource(id)._data.features);
      const found = {};
      for (const key of keys) {
        const feature = features.find((candidate) => candidate.properties.key === key);
        if (!feature) continue;
        let tries = [];
        if (feature.geometry.type === "Point") tries = [map.project(feature.geometry.coordinates)];
        else {
          // The ring vertices projected, then a grid inside their screen bounding box. A bbox
          // centre alone is wrong for any concave country; the grid is what finds a pixel inside
          // Norway rather than in the fjord next to it.
          const flat = [];
          const walk = (node) => {
            if (typeof node[0] === "number") flat.push(node);
            else for (const child of node) walk(child);
          };
          walk(feature.geometry.coordinates);
          let west = Infinity;
          let east = -Infinity;
          let north = Infinity;
          let south = -Infinity;
          for (const position of flat) {
            const at = map.project(position);
            west = Math.min(west, at.x);
            east = Math.max(east, at.x);
            north = Math.min(north, at.y);
            south = Math.max(south, at.y);
          }
          for (let row = 1; row < grid; row++)
            for (let column = 1; column < grid; column++)
              tries.push({ x: west + ((east - west) * column) / grid, y: north + ((south - north) * row) / grid });
        }
        // A PIXEL THIS MARK OWNS WITH A PIXEL TO SPARE. Rounded first, because a real pointer can
        // only be sent to an integer coordinate, and then checked at its four neighbours too:
        // measured on the committed choropleth, a bare centre-match handed back pixels one pixel
        // inside Latvia's border and reported Lithuania as broken in the landscape shape and fine
        // in the portrait one. A probe whose own rounding decides the verdict measures rounding.
        const owns = (x, y) => {
          if (!(x > 0 && y > 0 && x < width && y < height)) return false;
          const hits = map.queryRenderedFeatures([x, y], { layers: layerIds });
          return hits.length > 0 && hits[0].properties.key === key;
        };
        for (const at of tries) {
          const x = Math.round(at.x);
          const y = Math.round(at.y);
          if (!owns(x, y)) continue;
          if (!owns(x - 1, y) || !owns(x + 1, y) || !owns(x, y - 1) || !owns(x, y + 1)) continue;
          found[key] = [x, y];
          break;
        }
      }
      return found;
    },
    { layerIds: hoverLayerIds(plan), keys: candidates.map((mark) => mark.key), grid: PIXEL_PROBE_GRID },
  );
  const noPointerPath = marksWithNoPixel(candidates, pixels);
  const liveHover = {
    sampled: sampled.length,
    of: candidates.length,
    driven: 0,
    wrong: [],
    unreachable: [],
    noPointerPath,
  };
  for (const mark of sampled) {
    const pixel = pixels[mark.key];
    if (!pixel) {
      liveHover.unreachable.push(mark.key);
      continue;
    }
    // Park somewhere harmless first, so a tooltip left from the previous mark cannot be read as
    // this one's — the same discipline the fallback's own hover walk follows.
    await page.mouse.move(2, 2);
    await new Promise((resolve) => setTimeout(resolve, 30));
    await page.mouse.move(Math.round(state.origin[0] + pixel[0]), Math.round(state.origin[1] + pixel[1]));
    await new Promise((resolve) => setTimeout(resolve, 60));
    const tip = await page.evaluate(() => {
      const node = document.getElementById("tooltip");
      return { hidden: node.hidden, text: node.textContent };
    });
    liveHover.driven++;
    const wanted = mark.detail ?? mark.name;
    const right = !tip.hidden && (mark.detail ? tip.text === mark.detail : tip.text.includes(mark.name));
    if (!right)
      liveHover.wrong.push(
        `${mark.key}: wanted ${mark.detail ? "" : "a tooltip naming "}${JSON.stringify(wanted)}, got ` +
          `${tip.hidden ? "a hidden tooltip" : JSON.stringify(tip.text)}`,
      );
  }

  await page.close();
  return { shape: shape.label, ...state, pointerReach, liveHover };
}

/**
 * Clicks every filter chip for real and counts BOTH halves of the mark at each state.
 *
 * The filter is pure CSS, which reaches the HTML overlay only; the circles are a MapLibre layer,
 * which CSS cannot address. So this compares the two counts rather than checking that either
 * changed — the trap is that "the filter did something" passes while only one half moves, which is
 * exactly the state this was written after: 6 of 13 labels hidden, 13 of 13 circles still painted.
 */
export async function measureFilterStates(browser, keyedPath, shape, plan) {
  const page = await browser.newPage();
  await page.setViewport({ width: shape.width, height: shape.height, deviceScaleFactor: 1 });
  await page.goto(`file://${keyedPath}`, { waitUntil: "load" });
  await page.waitForFunction("document.documentElement.classList.contains('mw-live')", { timeout: 30000 });
  await new Promise((resolve) => setTimeout(resolve, 500));

  const chips = await page.evaluate(() =>
    Array.from(document.querySelectorAll("input[name=mw-filter]")).map((input) => input.id),
  );
  // A beat with one group renders no filter at all (`groupsOf(points).length <= 1`), and most beats
  // are that beat — every choropleth in this tree is. Driving zero chips is not a failure; pretending
  // to have driven them would be.
  if (chips.length === 0) {
    await page.close();
    return { shape: shape.label, chips, states: [] };
  }
  const layerId = hoverLayerIds(plan)[0];
  const states = [];
  for (const chip of chips) {
    // A real click on the chip's own `<label>`, which is how a reader operates it — not
    // `input.checked = true`, which would set the property without the `change` event the live
    // layer listens for, and would therefore pass with the wiring removed.
    await page.evaluate((id) => document.querySelector(`label:has(#${id})`).click(), chip);
    await new Promise((resolve) => setTimeout(resolve, 350));
    states.push({
      chip,
      ...(await page.evaluate((id) => {
        window.__mwVerifyLayer = id;
        const keysOf = (selector) =>
          Array.from(document.querySelectorAll(selector))
            .filter((node) => node.offsetParent !== null)
            .map((node) => node.getAttribute("data-key"))
            .filter(Boolean);
        const source = window.__mwMap.getSource(window.__mwVerifyLayer)._data.features;
        const filter = window.__mwMap.getFilter(window.__mwVerifyLayer);
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
      }, layerId)),
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
    for (const shape of SHAPES) results.push(await measureShape(browser, keyedPath, shape, plan));
    const failures = [];
    for (const result of results) {
      // 0. MORE THAN ONE PAINTED WORLD IS NOW CORRECT — FOR A CAMERA THAT IS THE WORLD.
      //
      // This used to refuse any camera showing more than one full turn of longitude, and the reason
      // was real: measured live on a 241-region world choropleth at 1600x900, MapLibre filled ~800px
      // of margin either side with a second and a third painted world — three Africas, three Japans,
      // ONE SET OF HIT TARGETS. The owner has since ruled on the layout (2026-08-23): *that is the
      // normal behaviour of an interactive map — go ahead and repeat the map on the sides.* The
      // defect was never the repeat; it was the single set of hit targets, and that is measured
      // where it can be measured — `verify-wraps-the-world.mjs --live` counts what answers a pointer
      // ON EACH painted copy, through the canvas's own `queryRenderedFeatures`.
      //
      // So the refusal keeps exactly the half the ruling did not touch: a beat whose study set is
      // NOT the world has no business painting a second copy of it. There the repeat is bare
      // basemap carrying none of the beat's marks — a reader can reasonably read it as a place with
      // no data — and it comes from padding rather than from the medium. `spansTheWorld` is the same
      // derivation `fitPadding` uses, so the two cannot disagree about which beat this is.
      if (!spansTheWorld(plan) && result.lonSpan > 360 + WORLD_SPAN_TOLERANCE_DEG)
        failures.push(
          `${result.shape}: this beat's study set is ${(plan.studyBounds.east - plan.studyBounds.west).toFixed(1)}° of ` +
            `longitude and the camera shows ${result.lonSpan.toFixed(1)}° (bounds ` +
            `${result.bounds.map((n) => n.toFixed(2)).join(", ")}), so the reader sees a repeat of a ` +
            `continent that carries none of this beat's marks. That repeat is the fit's own padding, ` +
            `not the medium: only a camera that spans the world may paint copies, and those copies ` +
            `carry their own marks (see the wrap ruling, delivery-frame.mjs)`,
        );
      if (spansTheWorld(plan))
        console.log(
          `${result.shape}: ${result.lonSpan.toFixed(1)}° of longitude — ` +
            `${(result.lonSpan / 360).toFixed(2)} worlds painted, which is what a world camera does when it ` +
            `fills its box. Count what answers a pointer on each copy with verify-wraps-the-world.mjs --live.`,
        );
      // 0b. EVERY MARK COULD BE LOCATED AT ALL. A region whose key has no anchor in the plan is a
      // mark this probe cannot see, and a probe that silently skips what it cannot reach is the
      // vacuity this file's own header was written about.
      const unlocated = result.marks.filter((mark) => !mark.located).map((mark) => mark.key);
      if (unlocated.length > 0)
        failures.push(
          `${result.shape}: ${unlocated.length} of ${result.marks.length} marks could not be located on ` +
            `screen at all (${unlocated.slice(0, 8).join(", ")}${unlocated.length > 8 ? ", …" : ""}) — the ` +
            `live plan carries no anchor for them, so nothing below measured them`,
        );
      // 1. the drawn radius against the one the camera implies — where the beat draws sized circles.
      // A choropleth's marks are fills with no radius; the comparison is skipped for them, and the
      // skip is printed at the end rather than left to look like a pass.
      for (const mark of result.marks.filter((mark) => mark.frameRadius != null)) {
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
      // 3. a real pointer reaches the whole disc — only where a disc is what is drawn. A choropleth
      // paints fills with no radius, so there is no edge to walk out to; §4 below is what covers a
      // reader reaching one of ITS marks.
      const sized = result.marks.filter((mark) => mark.frameRadius != null && mark.onScreen);
      if (sized.length > 0 && !result.pointerReach)
        failures.push(`${result.shape}: no mark was on screen to walk a pointer across`);
      else if (
        result.pointerReach &&
        Math.abs(result.pointerReach.reach - result.pointerReach.drawn) > POINTER_TOLERANCE_PX
      )
        failures.push(
          `${result.shape}: ${result.pointerReach.key} is drawn at ${result.pointerReach.drawn.toFixed(1)}px ` +
            `but a pointer stops reaching it at ${result.pointerReach.reach}px — the hit area is not the mark`,
        );
      // 4. HOVERING A MARK SHOWS THAT MARK, live. See `measureShape`'s own note for why this is not
      // the same claim `verify-interaction.mjs` makes about the fallback, and cannot be.
      if (result.liveHover.driven === 0)
        failures.push(
          `${result.shape}: not one mark could be reached by a real pointer, so the live hover was ` +
            `never exercised — nothing here proves a reader can interrogate this map` +
            (result.liveHover.unreachable.length > 0
              ? ` (${result.liveHover.unreachable.length} sampled marks got no pixel from the map at all)`
              : ""),
        );
      else if (result.liveHover.wrong.length > 0)
        failures.push(
          `${result.shape}: ${result.liveHover.wrong.length} of ${result.liveHover.sampled} sampled marks ` +
            `answered a real pointer with the wrong value or none — ${result.liveHover.wrong.slice(0, 5).join("; ")}`,
        );
    }
    // The filter, at one shape — it is a property of the page, not of the container.
    const filtering = await measureFilterStates(browser, keyedPath, SHAPES[0], plan);
    if (filtering.chips.length === 0) console.log("   no filter on this beat, so no chip was clicked");
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
  // EVERY NAME THE KEY TRAVELS UNDER, the same list `bake-plate.mjs` in this skill has always
  // declared. Read from the process environment first, then from the root's own `.env` — through
  // `mapTilerKeyFrom`, which is also what this skill's own test gate reads, so the gate and the
  // runner cannot answer this question differently again.
  const key = flag("--key", mapTilerKeyFrom(process.env) ?? mapTilerKeyFrom(env));
  if (!key) {
    // EXIT NON-ZERO. This used to print and `process.exit(0)`, which told every caller reading the
    // exit code that the live map had been verified when nothing had been driven at all — on a
    // machine whose key was sitting in `.env` under one of the aliases above. A probe that cannot
    // reach its subject says what it could not reach and fails.
    console.error(
      `no MapTiler key — the live map was NOT driven and NOTHING was verified.\n` +
        `Looked for MAPTILER_KEY (and ${MAPTILER_KEY_ALIASES.join(", ")}) in the environment and in ${envPath}.\n` +
        `Pass one with --key, or record it with recordKey so it lands in that file.`,
    );
    process.exit(1);
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
    // SAID OUT LOUD, always: the coverage of the live hover walk, and the longitude span the camera
    // actually gave the reader. A check whose sample nobody states is a check nobody can weigh.
    console.log(
      `   live hover: ${result.liveHover.driven} of ${result.liveHover.sampled} sampled marks driven ` +
        `(${result.liveHover.of} carry a name to check), ${result.liveHover.wrong.length} wrong · camera shows ` +
        `${result.lonSpan.toFixed(1)}° of longitude`,
    );
    // THE COUNT THAT MATTERS TO A JOURNALIST, over EVERY mark rather than over the sample: how many
    // of this beat's own marks this camera gives no pixel a pointer can be sent to.
    //
    // IT IS THE SAME READING THE SCAN ABOVE USES, SAID IN THE SAME WORDS — a pixel the mark owns
    // WITH A PIXEL TO SPARE, because a probe whose own rounding decides the verdict measures
    // rounding. The narrower reading, "no pixel at ALL", is a strict subset and is smaller: measured
    // on the 241-region world beat, 63 of 241 have no pixel whatever at 1600x900 while 91 have none
    // with a spare, and at 375x667 it is 82 against 149. Both are true; this prints the one a reader
    // actually loses the mark at, and names it rather than leaving which one it is to be guessed.
    //
    // At that camera the map draws 896px for 360° of longitude, so one pixel is about 26 km and
    // Monaco is about a thirteenth of one. No hit target creates a path to those marks; the keyboard
    // and the accessible table ARE their path, and `detect-stranded-marks.mjs` refuses a beat that
    // strands one and then drops either.
    if (result.liveHover.noPointerPath.length > 0)
      console.log(
        `   NO POINTER PATH: ${result.liveHover.noPointerPath.length} of ${result.liveHover.of} marks — ` +
          `this camera gives them no pixel of their own with a pixel to spare (` +
          `${result.liveHover.noPointerPath.slice(0, 8).join(", ")}${result.liveHover.noPointerPath.length > 8 ? ", …" : ""}` +
          `). No pointer, tap or hover reaches them and no hit target can be made that does — they are ` +
          `drawn smaller than a pixel. The keyboard and the accessible table ARE their path: tighten ` +
          `the camera, add an inset, or accept it knowingly and say so in the caveat.`,
      );
    const sizedMarks = result.marks.filter((mark) => mark.frameRadius != null).length;
    if (sizedMarks === 0)
      console.log(
        `   no mark on this beat carries a drawn radius (a fill, not a circle), so the mark-size and ` +
          `halo-size comparisons did not run — §4's live hover is what covers it`,
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
  // WHAT ACTUALLY RAN, not a fixed sentence. A choropleth has no drawn radius and usually no filter,
  // and a summary that claimed those two anyway is the same vacuity this file's header records.
  const drawnRadii = results.some((result) => result.marks.some((mark) => mark.frameRadius != null));
  const done = [
    "one world is painted and nothing is cropped",
    `a real pointer showed its own value on ${results.map((result) => result.liveHover.driven).join(" and ")} marks`,
  ];
  if (drawnRadii) done.push("every drawn mark matches its camera and a pointer reaches its whole disc");
  if (filtering.chips.length > 0) done.push("both halves of every mark obey the same filter");
  console.log(done.join("; ") + ".");
}
