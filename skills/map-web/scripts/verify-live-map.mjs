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

/** THE CANONICAL NAME FIRST, THEN EVERY ALIAS — `splash/scripts/keys.mjs`'s own list for this key,
 *  duplicated the way this repository duplicates a helper across a copy boundary (a skill directory
 *  may not import out of itself). This guard used to read `MAPTILER_KEY` alone, and a root that sets
 *  only `REMOTION_MAPTILER_KEY` — which is what an existing Splash engine `.env` carries, and what
 *  this very checkout carries — made it print "no MAPTILER_KEY", exit ZERO, and verify nothing. The
 *  bake beside it has always read the aliases, so the plate baked while the live map went unchecked:
 *  a guard that skips silently is the same failure shape as a map that draws in the wrong typeface. */
const MAPTILER_KEY_ALIASES = ["MAPTILER_API_KEY", "REMOTION_MAPTILER_KEY", "VITE_MAPTILER_KEY"];

export function mapTilerKeyIn(env) {
  for (const name of ["MAPTILER_KEY", ...MAPTILER_KEY_ALIASES]) if (env[name]) return env[name];
  return "";
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

/**
 * The radius a mark SHOULD be drawn at — derived here rather than read from the page, so it is an
 * independent second opinion rather than the implementation agreeing with itself.
 *
 * AND IT DEPENDS ON WHAT THE MARK MEANS. This took one argument and assumed every mark was
 * camera-scaled, because it was written against the proportional-symbol seed and never run on
 * anything else (the key-alias defect above is why: it printed "no MAPTILER_KEY" and exited zero on
 * this checkout). Driven against `proof/mapgen-locator-web`, whose markers are PINS, it reported a
 * 6px pin as 17.3px drawn and called the browser's own hit testing broken. Three strategies, the
 * same three `shared/map-beat/mount.mjs` paints:
 *
 *   `camera` — the circle encodes a value: scaled once from the camera, then held.
 *   `fixed`  — a pin: the same screen size at every zoom, exactly as the plate drew it.
 *   `ground` — the circle stands for a piece of ground: doubling per zoom level.
 */
export function expectedRadiusPx(frameRadius, plan, liveZoom, strategy = "camera") {
  if (strategy === "fixed") return frameRadius;
  // `camera` and `ground` come to the SAME number: `cameraScale` is `bakeDpp / liveDpp`, which is
  // exactly `2 ** (liveZoom − bakeZoom)`, which is what the ground rule interpolates to. They differ
  // in WHEN they are applied — once at the fit against continuously during a gesture — not in what
  // they answer at a settled camera, which is the only moment this guard measures.
  const liveDegreesPerPixel = 360 / (512 * Math.pow(2, liveZoom));
  return frameRadius * (plan.degreesPerPixel / liveDegreesPerPixel);
}

/**
 * THE LAYER THIS BEAT'S MARKS COME FROM — DISCOVERED, NOT NAMED.
 *
 * Every read below used to say `getSource("mw-marks")`, which is the id the format's own SEED uses
 * because the seed is a proportional-symbol map. Driven against `proof/mapgen-choropleth-web`, whose
 * marks are a `fill` layer called `mw-regions`, `getSource("mw-marks")` is `undefined` and the first
 * `page.evaluate` dies with `Cannot read properties of undefined (reading '_data')` — the guard does
 * not fail the beat, it fails to RUN, which is the same silence as not existing. THREE of the five
 * web map types were recorded as hitting that wall (choropleth, hexgrid, and any flow/route beat),
 * so a whole genre would have shipped unchecked.
 *
 * The plan already says which layer it is, in two ways, and neither is a name:
 *   - a layer that declares a `radius` strategy is a layer of MARKS sized by this format's own rules;
 *   - failing that, a `circle` layer is marks too;
 *   - failing both, the plan's FIRST layer is the beat's own subject — the plan is written in draw
 *     order and a beat's own geography is what it draws first (the choropleth's `mw-regions` before
 *     its two claim outlines).
 *
 * Returns the whole layer, so callers can ask what it is rather than asking again by id.
 */
export function markLayerOf(plan) {
  const layers = (plan && plan.layers) || [];
  return layers.find((l) => l.radius) || layers.find((l) => l.type === "circle") || layers[0] || null;
}

/** The strategy the plan declares for the layer the marks come from. A plan that declares none is
 *  camera-scaled, which is what every plan meant before the field existed.
 *
 *  `layerId` is still accepted so a caller can ask about a specific layer, but it DEFAULTS to the
 *  discovered one rather than to `"mw-marks"`: a default that names one beat's layer is how this
 *  file came to understand one beat's map. */
export function radiusStrategyOf(plan, layerId = null) {
  const layers = (plan.layers || []);
  const layer = layerId === null ? markLayerOf(plan) : layers.find((l) => l.id === layerId);
  return (layer && layer.radius) || "camera";
}

/**
 * WHETHER THE MARKS ON THIS LAYER ARE SIZED BY THIS FORMAT AT ALL.
 *
 * A `circle` layer's radius is a number this format computes, so the three claims about it — the
 * drawn radius against the camera, the halo against the mark, and a pointer against the disc — are
 * all meaningful. A `fill` or a `line` layer is GEOGRAPHY: MapLibre reprojects it itself, there is
 * no radius to be right or wrong about, and asserting one would be asserting arithmetic nobody does.
 * What is still meaningful on such a beat is stated in `verifyLiveMap` below: every subject on
 * screen, the painted highlight round, the filter moving both halves, and a pointer that actually
 * gets a reading.
 */
export function marksAreSized(layer) {
  return Boolean(layer) && (Boolean(layer.radius) || layer.type === "circle");
}

/**
 * WHAT A FILTER ON THE MARK LAYER SELECTS, read defensively.
 *
 * This format writes exactly one filter shape (`["==", ["get", <property>], <value>]`, from
 * `applyFilter`), and the read used to be `feature.properties[filter[1][1]] === filter[2]` with no
 * check at all. On any other shape that silently indexes `undefined` and answers "nothing is
 * painted", which would then be reported as the filter and the overlay disagreeing — a false red
 * that looks exactly like the true one. It now returns `null` when it cannot read the filter, and
 * the caller says so instead of measuring against a guess.
 */
export function filterSelection(filter) {
  if (!filter) return { property: null, value: null, readable: true };
  const legacy = typeof filter[1] === "string";
  const expression = Array.isArray(filter[1]) && filter[1][0] === "get" && typeof filter[1][1] === "string";
  if (filter[0] !== "==" || !(legacy || expression)) return { property: null, value: null, readable: false };
  return { property: legacy ? filter[1] : filter[1][1], value: filter[2], readable: true };
}

/**
 * Drives one container shape and reports, per mark, what the map drew, what the camera implies, and
 * how far a real pointer still reaches it.
 */
export async function measureShape(browser, keyedPath, shape, mark = { id: "mw-marks", strategy: "camera", sized: true }) {
  const page = await browser.newPage();
  await page.setViewport({ width: shape.width, height: shape.height, deviceScaleFactor: 1 });
  await page.goto(`file://${keyedPath}`, { waitUntil: "load" });
  await page.waitForFunction("document.documentElement.classList.contains('mw-live')", { timeout: 30000 });
  // One idle beat, so the first tile paint cannot be mistaken for the mark layer not being there.
  await new Promise((resolve) => setTimeout(resolve, 500));

  const state = await page.evaluate((mark) => {
    const map = window.__mwMap;
    const container = document.getElementById("mw-map");
    const box = container.getBoundingClientRect();
    const scale = map.__mwScale;
    /** THE SOURCE IS ASKED FOR BY THE PLAN'S OWN LAYER ID, AND ITS ABSENCE IS REPORTED.
     *  `getSource("mw-marks")._data` threw a TypeError on every beat that does not draw circles —
     *  a guard that CRASHES tells a reader nothing about the map. */
    const source = map.getSource(mark.id);
    if (!source) return { missingSource: mark.id, sources: (map.getStyle().layers || []).map((l) => l.id) };
    /** `_data` is what a GeoJSON source keeps the collection it was handed in. `serialize()` is the
     *  public way to the same object and exists on every MapLibre 4 source, so it is the fallback
     *  rather than a second guess. */
    const collection = source._data || (typeof source.serialize === "function" ? source.serialize().data : null);
    const features = (collection && collection.features) || [];
    /** WHERE A FEATURE IS, WHATEVER SHAPE IT IS. A point carries its own coordinate; a polygon does
     *  not have one, and a bounding-box centre is not where the beat says the region IS — the plan
     *  records `anchors`, which is the point each region's own label and hit target hang from, and
     *  which is therefore the point that has to be on screen. */
    const anchorOf = (feature) => {
      const key = feature.properties && feature.properties.key;
      const anchor = key && mark.anchors ? mark.anchors[key] : null;
      if (anchor) return anchor;
      if (feature.geometry && feature.geometry.type === "Point") return feature.geometry.coordinates;
      return null;
    };
    return {
      canvas: [container.clientWidth, container.clientHeight],
      origin: [box.x, box.y],
      scale,
      zoom: map.getZoom(),
      marks: features
        .map((feature) => {
          const coords = anchorOf(feature);
          if (!coords) return null;
          const at = map.project(coords);
          // WHAT MAPLIBRE IS ACTUALLY PAINTING, and it is not `r * scale` for every beat. A camera-
          // scaled circle is `r * scale`; a PIN is `r`, flat, at every zoom; a ground-scaled dot
          // doubles per zoom level. Reading the camera-scaled form for all three is what made this
          // guard call a 6px locator pin a 17.3px circle the browser could not hit. A layer with no
          // radius at all — a choropleth fill, a hex bin, a route — has no drawn radius to compare,
          // and its marks are measured as the anchors they hang from.
          const frameRadius = mark.sized ? Number(feature.properties.r) || 0 : 0;
          const drawn = frameRadius * (mark.strategy === "fixed" ? 1 : scale);
          return {
            key: feature.properties.key,
            drawn,
            frameRadius,
            sized: Boolean(mark.sized),
            x: at.x,
            y: at.y,
            // A mark whose whole disc is inside the canvas. The beat's title claims every point, so a
            // mark that is not here is a cropped claim, not a measurement that happens to be missing.
            onScreen: at.x - drawn > 0 && at.y - drawn > 0 && at.x + drawn < box.width && at.y + drawn < box.height,
          };
        })
        .filter(Boolean),
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
  }, mark);

  if (state.missingSource) {
    await page.close();
    return { shape: shape.label, marks: [], halos: [], pointerReach: null, ...state };
  }

  // The pointer walk, driven from OUTSIDE the page. Whether a reader can reach a mark is a fact
  // about the browser's own hit testing over the whole layered page — the canvas, the overlay's
  // buttons and their pointer-events — and nothing inside `page.evaluate` can observe it.
  // Integer coordinates only: a fractional `mouse.move` does nothing at all.
  const onScreen = state.marks.filter((m) => m.onScreen);
  const biggest = [...onScreen].sort((a, b) => b.drawn - a.drawn)[0];
  const showing = () =>
    page.evaluate(() => {
      const tip = document.getElementById("tooltip");
      return Boolean(tip) && !tip.hidden && tip.textContent.length > 0;
    });
  let pointerReach = null;
  if (biggest && biggest.sized) {
    const cx = Math.round(state.origin[0] + biggest.x);
    const cy = Math.round(state.origin[1] + biggest.y);
    await page.mouse.move(cx, cy);
    await new Promise((resolve) => setTimeout(resolve, 120));
    let reach = -1;
    for (let d = 0; d <= Math.ceil(biggest.drawn) + 30; d++) {
      await page.mouse.move(cx + d, cy);
      if (!(await showing())) break;
      reach = d;
    }
    pointerReach = { kind: "disc", key: biggest.key, drawn: biggest.drawn, reach };
  } else if (biggest) {
    /** A LAYER WITH NO RADIUS STILL OWES THE READER AN ANSWER. There is no disc to walk out of, so
     *  the claim is the one this format actually makes about a region: a pointer put on the point
     *  the beat hangs that region's own reading from gets that reading. It is the same tooltip, the
     *  same `#tooltip` node, and the same failure it would catch on a circle beat — a hover path
     *  wired to nothing — without asserting arithmetic a fill layer does not do. */
    const cx = Math.round(state.origin[0] + biggest.x);
    const cy = Math.round(state.origin[1] + biggest.y);
    await page.mouse.move(cx - 1, cy - 1);
    await page.mouse.move(cx, cy);
    await new Promise((resolve) => setTimeout(resolve, 200));
    pointerReach = { kind: "reading", key: biggest.key, answered: await showing() };
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
export async function measureFilterStates(browser, keyedPath, shape, mark) {
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
      ...(await page.evaluate((mark) => {
        const keysOf = (selector) =>
          Array.from(document.querySelectorAll(selector))
            .filter((node) => node.offsetParent !== null)
            .map((node) => node.getAttribute("data-key"))
            .filter(Boolean);
        const map = window.__mwMap;
        const handle = map.getSource(mark.id);
        const collection = handle
          ? handle._data || (typeof handle.serialize === "function" ? handle.serialize().data : null)
          : null;
        const source = (collection && collection.features) || [];
        const filter = map.getFilter(mark.id);
        /** The filter is DECODED rather than indexed blindly — see `filterSelection`. `readable` is
         *  reported so the caller can say "this filter is not one I can read" instead of measuring
         *  every count against an `undefined` and calling the beat broken. */
        const legacy = filter && typeof filter[1] === "string";
        const expression = filter && Array.isArray(filter[1]) && filter[1][0] === "get";
        const readable = !filter || (filter[0] === "==" && (legacy || expression));
        const property = !filter ? null : legacy ? filter[1] : expression ? filter[1][1] : null;
        return {
          filterReadable: readable,
          filterText: filter ? JSON.stringify(filter) : null,
          labelKeys: keysOf(".point-label"),
          buttonKeys: keysOf(".pt"),
          paintedKeys: source
            .filter((feature) => !filter || (readable && feature.properties[property] === filter[2]))
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
          // …AND THE ONES A DECLUTTER DELIBERATELY PUT AWAY. A beat whose names would collide runs
          // its own declutter on every camera move and sets `hidden` on the labels it drops
          // (`interaction.mjs`'s `relabel`). That is ONE mechanism doing its job, not two
          // disagreeing — but it is invisible to a check that only asks "is this label on screen",
          // which called it a defect on `proof/mapgen-locator-web`'s eleventh name. Read separately
          // so the invariant below can be stated against what is left: a label that is neither on
          // screen NOR decluttered, while its mark is painted, is still the defect this guards.
          declutteredKeys: Array.from(document.querySelectorAll(".point-label[hidden]"))
            .map((node) => node.getAttribute("data-key"))
            .filter(Boolean),
        };
      }, mark)),
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
  /** WHAT THIS BEAT DRAWS, discovered from its own plan rather than assumed to be the seed's. */
  const markLayer = markLayerOf(plan);
  const mark = {
    id: markLayer ? markLayer.id : "mw-marks",
    strategy: radiusStrategyOf(plan),
    sized: marksAreSized(markLayer),
    type: markLayer ? markLayer.type : null,
    anchors: plan.anchors || null,
  };
  try {
    const results = [];
    for (const shape of SHAPES) results.push(await measureShape(browser, keyedPath, shape, mark));
    const failures = [];
    for (const result of results) {
      /** A SOURCE THE PLAN DECLARES AND THE LIVE MAP DOES NOT HAVE IS A FAILURE, not a crash. This
       *  is where `Cannot read properties of undefined (reading '_data')` used to come from. */
      if (result.missingSource) {
        failures.push(
          `${result.shape}: the plan declares its marks on layer "${result.missingSource}" but the ` +
            `live map has no source by that name — the layer never mounted, so nothing below could ` +
            `be measured`,
        );
        continue;
      }
      if (result.marks.length === 0)
        failures.push(
          `${result.shape}: layer "${mark.id}" carries no feature this guard can place. A feature ` +
            `needs a \`properties.key\` and either a point geometry or an entry in the plan's own ` +
            `\`anchors\` — without one, "every mark is on screen" is a claim about nothing`,
        );
      // 1. the drawn radius against the one the camera implies — only where this format sizes the
      //    mark. A fill or a line is geography MapLibre reprojects itself; there is no radius to be
      //    right or wrong about, and asserting one would be asserting arithmetic nobody does.
      for (const drawnMark of result.marks.filter((m) => m.sized)) {
        const expected = expectedRadiusPx(drawnMark.frameRadius, plan, result.zoom, mark.strategy);
        const off = Math.abs(drawnMark.drawn - expected) / Math.max(expected, 1e-6);
        if (off > SCALE_TOLERANCE)
          failures.push(
            `${result.shape}: ${drawnMark.key} is drawn at ${drawnMark.drawn.toFixed(1)}px but this camera implies ` +
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
        const drawn = expectedRadiusPx(halo.frameRadius, plan, result.zoom, mark.strategy);
        const expected = Math.max(HALO_FLOOR_PX, drawn * 2 + HALO_PAD_PX);
        if (Math.abs(halo.width - expected) > HALO_SIZE_TOLERANCE_PX)
          failures.push(
            `${result.shape}: the highlight on ${halo.key} is ${halo.width.toFixed(1)}px across but ` +
              `its mark is drawn at ${(drawn * 2).toFixed(1)}px, so the halo should be ` +
              `${expected.toFixed(1)}px — the painted highlight is not derived from the mark it belongs to`,
          );
      }
      // 2. every mark the beat claims is on screen
      const cropped = result.marks.filter((m) => !m.onScreen).map((m) => m.key);
      if (cropped.length > 0)
        failures.push(
          `${result.shape}: ${cropped.length} of ${result.marks.length} marks are off the canvas ` +
            `(${cropped.join(", ")}) — the beat's title claims all of them`,
        );
      // 3. a real pointer reaches the whole disc — or, where there is no disc, gets the reading
      if (!result.pointerReach)
        failures.push(`${result.shape}: no mark was on screen to put a pointer on`);
      else if (result.pointerReach.kind === "disc") {
        if (Math.abs(result.pointerReach.reach - result.pointerReach.drawn) > POINTER_TOLERANCE_PX)
          failures.push(
            `${result.shape}: ${result.pointerReach.key} is drawn at ${result.pointerReach.drawn.toFixed(1)}px ` +
              `but a pointer stops reaching it at ${result.pointerReach.reach}px — the hit area is not the mark`,
          );
      } else if (!result.pointerReach.answered)
        failures.push(
          `${result.shape}: a pointer on ${result.pointerReach.key}'s own anchor gets no reading — ` +
            `the hover path is wired to nothing, and on a beat with no per-mark button that is the ` +
            `only way a reader asks this map a question`,
        );
    }
    // The filter, at one shape — it is a property of the page, not of the container.
    const filtering = await measureFilterStates(browser, keyedPath, SHAPES[0], mark);
    for (const state of filtering.states) {
      /** A FILTER THIS GUARD CANNOT READ IS REPORTED AS THAT, not measured against a guess. The read
       *  used to be `feature.properties[filter[1][1]] === filter[2]`, unchecked: on any other filter
       *  shape it indexes `undefined`, answers "nothing painted", and every count below then reports
       *  the beat as broken — a false red wearing the true red's own words. */
      if (!state.filterReadable) {
        failures.push(
          `${filtering.shape}, filter ${state.chip}: layer "${mark.id}" carries a filter this guard ` +
            `cannot read (${state.filterText}). It understands \`["==", ["get", p], v]\` and the ` +
            `legacy \`["==", p, v]\`; anything else has to be taught here rather than measured ` +
            `against an \`undefined\``,
        );
        continue;
      }
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
      const decluttered = new Set(state.declutteredKeys || []);
      const missing = state.labelledKeys.filter(
        (key) => painted.has(key) && !state.labelKeys.includes(key) && !decluttered.has(key),
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

    return { results, filtering, failures, mark };
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
  // Explicit legacy verification reads the copied Splash root's `.env`; managed runs use Engine.
  const envPath = splashEnvPath(import.meta.dirname);
  const env = existsSync(envPath) ? parseEnvFile(readFileSync(envPath, "utf8")) : {};
  const key = flag("--key", mapTilerKeyIn(process.env) || mapTilerKeyIn(env));
  if (!key) {
    console.log(
      `no MapTiler key in the environment or in ${envPath} (looked for MAPTILER_KEY, ` +
        `${MAPTILER_KEY_ALIASES.join(", ")}) — the live map cannot be driven, so nothing was verified.`,
    );
    process.exit(0);
  }
  const { results, filtering, failures, mark } = await verifyLiveMap({ htmlPath, key });
  // WHAT WAS DRIVEN, printed first. A guard that silently understood one kind of map for months is
  // why this line exists: a reader of the output can see which layer it found, what shape its marks
  // are, and therefore which of the claims below it was able to make.
  console.log(
    `marks    → layer "${mark.id}" (${mark.type || "no type"}), ` +
      (mark.sized
        ? `sized by this format — radius strategy "${mark.strategy}"`
        : "geography MapLibre reprojects itself — no radius claim, measured at its anchors"),
  );
  for (const result of results) {
    if (result.missingSource) continue;
    console.log(
      `${result.shape}  canvas ${result.canvas[0]}x${result.canvas[1]}  zoom ${result.zoom.toFixed(3)}  ` +
        `scale ${result.scale.toFixed(3)}  ${result.marks.filter((m) => m.onScreen).length}/${result.marks.length} on screen`,
    );
    if (result.pointerReach && result.pointerReach.kind === "disc")
      console.log(
        `   pointer: ${result.pointerReach.key} drawn ${result.pointerReach.drawn.toFixed(1)}px, ` +
          `reachable to ${result.pointerReach.reach}px`,
      );
    else if (result.pointerReach)
      console.log(
        `   pointer: on ${result.pointerReach.key}'s anchor the page ` +
          `${result.pointerReach.answered ? "answers with its reading" : "answers nothing"}`,
      );
  }
  if (filtering.chips.length === 0)
    console.log("   filter: this beat declares no filter chips, so no filter state was driven");
  for (const state of filtering.states)
    console.log(
      `   filter ${state.chip.padEnd(34)} labels ${String(state.labelKeys.length).padStart(2)}/${String(state.labelledKeys.length).padStart(2)}  ` +
        `decluttered ${String((state.declutteredKeys || []).length).padStart(2)}  ` +
        `hit targets ${String(state.buttonKeys.length).padStart(2)}  marks painted ${String(state.paintedKeys.length).padStart(2)}`,
    );
  if (failures.length > 0) {
    for (const failure of failures) console.error(`FAIL ${failure}`);
    process.exit(1);
  }
  console.log(
    (mark.sized
      ? "the drawn mark matches its camera, nothing is cropped, a pointer reaches the whole disc, and both "
      : "nothing is cropped, the painted highlight is a circle, a pointer gets its reading, and both ") +
      "halves of every mark obey the same filter.",
  );
}
