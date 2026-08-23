// The bake for this choropleth beat: one Europe camera, one basemap capture, every study
// country's geometry projected to pixel space, kept as PARTS (`geo-discipline.md` rule 11 — see
// `geo-choropleth.ts`'s own header on `BakedShape`).
//
// Two defects this project paid for tonight, fixed here from the start rather than found again:
//   (a) `dataviz-light` paints water GREY, indistinguishable from a no-data grey (rule 7) —
//       overridden to the cartographic blue tint in the `style.load` handler, before capture.
//   (b) a plate baked at one size and drawn into a differently-sized box offsets every shape —
//       this bake is only ever called at the EXACT size the still (496) or the video (620) draws
//       the map at, never a third size.
//
// Usage:
// The plate is FROZEN BESIDE THE BEAT, for the same reason its data is: a basemap living in `/tmp`
// cannot be committed, so the delivered artifact could not be reproduced or audited — and MapTiler
// restyles, so a re-bake months later is a different picture under the same marks. The render calls
// this bake only when the beat's own plate folder is empty.
//
//   bun proof/mapgen-choropleth-video/bake.mjs --size 496   # → proof/mapgen-choropleth-video/plate-496
//   bun proof/mapgen-choropleth-video/bake.mjs --size 620   # → proof/mapgen-choropleth-video/plate-620

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer";
import { CHOROPLETH_STUDY, keepRing, simplifyRing } from "./geo-choropleth.ts";

const HERE = dirname(fileURLToPath(import.meta.url));

/** The beat's camera and its label anchor — the journalist's frame, not a default. */
const BEAT = {
  // Same Europe camera this project's other Europe beats use (`map-beat`'s own CO2
  // choropleth, `mapmore-dot-population`'s dot-density): near-square once projected (rule 12),
  // wide enough west to hold Iceland whole. Poland and Sweden both sit comfortably inside it —
  // Poland lon 14.1–24.1 / lat 49.0–54.8, Sweden lon 11.1–24.2 / lat 55.3–69.0.
  bounds: [
    [-26, 36],
    [33, 67],
  ],
  style: "dataviz-light",
  // NO LABEL ANCHOR IS TYPED HERE ANY MORE (B6.10). It used to read
  //
  //     label: [20.3, 52.2],   // "nudged east and north so the right-anchored label … lands centred"
  //
  // and it did not: projected to (389.2, 277.6) and consumed under `text-anchor="end"`, the drawn
  // name's centre landed 15.1 px WEST of Poland's own centre (379.3, 280.0) on an 83.7 px shape.
  // A number nudged by eye against one camera cannot stay right when the camera, the frame size or
  // the typeface moves, and all three do here (the still bakes at 496, the video at 620).
  // `geo-choropleth.ts`'s `subjectLabelAnchor` now derives it from the shape the bake already
  // records, in the pixel space the label is drawn in, and throws if the result is not inside the
  // country. The `anchors` mechanism below stays — it is the general facility (rule 4, "a projected
  // anchor"), and this beat simply has nothing left to hand it.
  anchors: {},
};

const MAPLIBRE = "https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.js";
const MAPLIBRE_CSS = "https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.css";

const argv = process.argv.slice(2);
const flag = (name, fallback) => {
  const at = argv.indexOf(name);
  return at >= 0 ? argv[at + 1] : fallback;
};

/** THE BLUE AXIS A WATER TINT TRAVELS: black, through this family's own water blue, to white.
 *
 *  `geo-discipline.md` rule 7 is a rule about HUE — *"water is a blue tint, never grey, because grey
 *  water is visually indistinguishable from a no-data region"* — so the hue is what stays fixed here
 *  and the LUMINANCE is what the palette moves. The middle stop is the literal `#AAC9E0` every bake
 *  in this tree used to paint unconditionally, kept as the axis's own midpoint so the derivation
 *  passes through the value this family already used and the story decides where on it to land. */
const WATER_AXIS = ["#000000", "#AAC9E0", "#FFFFFF"];

/** How far a surface that carries no data has to sit from the ground, and from the nearest thing
 *  that DOES carry data, before a reader can be sure it is neither. The same 0.02 relative luminance
 *  `assertRampReads` holds two adjacent classes apart by — one number for one question. */
const SURFACE_CLEARANCE = 0.02;

/** WCAG 2.2 SC 1.4.11 Non-text Contrast: the floor a mark has to clear against the surface it is
 *  drawn on before a reader can see it at all. */
const NON_TEXT_FLOOR = 3;

/**
 * THE SEA, DERIVED FROM THE STORY'S OWN GROUND AND THE INK IT DRAWS WITH — the owner's instruction,
 * given twice: *"the ocean colours have to adapt to the palette."*
 *
 * IT WAS BUILT ONCE, FOR THE CHOROPLETH, AND THE BAKE NEVER GOT IT. `map-web/assets/geo-choropleth.ts`
 * derives a no-data fill and a water tint from the ramp and the ground (`offRampLuminance`,
 * `noDataFor`, `waterFor`) and refuses a pair a reader could not tell from a class
 * (`assertSurfacesRead`). Every bake in this tree meanwhile painted `#AAC9E0` unconditionally, or —
 * in the one copy of three that never carried rule 7's override at all — left MapTiler's own
 * near-neutral water alone. Measured on the page that made it impossible to miss
 * (`stories/r8-map-web-japan-bear-casualties`, ground `#16191B`, accent `#D4A853`): the plate came
 * back 66.9% water at relative luminance 0.5570 against a ground at 0.0094, so the SEA measured
 * 10.22:1 against the ground while the accent carrying the whole argument measured 8.02:1, and an
 * accent circle drawn over that sea measured 1.27:1 against a 3:1 floor. The largest and brightest
 * thing on a dark newsroom's page carried no data at all.
 *
 * WHERE THE SEA GOES, and it is `offRampLuminance`'s own answer with one bound added:
 *
 *   - THE BAND is between the ground and the nearest thing that carries data. Past the far end a
 *     surface reads as more than the maximum; inside, it reads as a value. A region with no reading
 *     is nearer to bare ground than to any class, and so is the sea.
 *   - THE MIDPOINT of that band is the placement, because it is the point furthest from both things
 *     the sea must not be confused with.
 *   - THE CEILING is the 3:1 non-text floor, measured from every ink this beat records: a mark drawn
 *     over the sea has to stay a mark. On a symbol beat this is what binds — Japan's midpoint is
 *     0.2178 and its ceiling 0.1088 — and on a choropleth, whose fills replace the plate rather than
 *     sitting on it, it never bites.
 *   - A CEILING PAST THE GROUND IS REPORTED, NOT OBEYED, and this is a real case rather than a
 *     defensive branch: `proof/mapgen-locator-web` and `proof/mapmore-flow-danube` draw `#C68900`
 *     (relative luminance 0.2988) on a WHITE ground, and 3:1 under that accent is luminance 1.0000 —
 *     white itself. No tint at all sits between their ground and their ink, so the placement falls
 *     back to the midpoint and says so in `ceilingUnreachable`, with the number. The bake prints it
 *     and writes it into `geometry.json`; whether a mark is REALLY unreadable is then measured on the
 *     finished plate at each mark's own pixel by `plateSurfacesYieldToInk`, which is the only place
 *     that can know. A derivation that guessed here would refuse three correct beats.
 *   - NO ROOM IS A REFUSAL, never a quiet literal. A band narrower than two clearances cannot hold a
 *     surface that is neither the ground nor a class, and the answer is to raise the ramp's own low
 *     end, which is what `assertSurfacesRead` already tells a caller in the same situation.
 *
 * THE HUE IS FIXED AND THE LUMINANCE MOVES, so the sea stays blue on every ground: `#505e69` on
 * Japan's charcoal, a paler blue on a white one. And the finished hex is measured again after
 * quantising to 8 bits, because a tint that lands one step the wrong side of the floor is a tint
 * this function claimed and did not deliver.
 */
export function basemapWaterFor(ground, ink) {
  const channel = (value) => {
    const c = value / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  const rgb = (hex) => {
    const digits = /^#([0-9a-fA-F]{6})$/.exec(String(hex).trim());
    if (!digits) throw new Error(`basemapWaterFor needs #rrggbb colours; got "${hex}"`);
    return [0, 2, 4].map((at) => parseInt(digits[1].slice(at, at + 2), 16));
  };
  const luminance = (hex) => {
    const [r, g, b] = rgb(hex);
    return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
  };
  const mix = (from, to, ratio) => {
    const [a, b] = [rgb(from), rgb(to)];
    return `#${a.map((one, at) => Math.round(one + (b[at] - one) * ratio).toString(16).padStart(2, "0")).join("")}`;
  };
  const along = (target) => {
    const [dark, mid, light] = WATER_AXIS;
    const [from, to] = target <= luminance(mid) ? [dark, mid] : [mid, light];
    let low = 0;
    let high = 1;
    for (let step = 0; step < 40; step++) {
      const at = (low + high) / 2;
      if (luminance(mix(from, to, at)) < target) low = at;
      else high = at;
    }
    return mix(from, to, (low + high) / 2);
  };
  const contrast = (one, two) => (Math.max(one, two) + 0.05) / (Math.min(one, two) + 0.05);
  if (!Array.isArray(ink) || ink.length === 0)
    throw new Error(
      "basemapWaterFor was given no ink to place the sea against. A bake that does not know what " +
        "its beat draws with cannot derive the surfaces it draws over — pass the accent this beat's " +
        "own PALETTE.md records.",
    );
  const groundAt = luminance(ground);
  const inkAt = ink.map(luminance);
  const nearest = inkAt.reduce((best, one) => (Math.abs(one - groundAt) < Math.abs(best - groundAt) ? one : best), inkAt[0]);
  const band = Math.abs(nearest - groundAt);
  if (band < SURFACE_CLEARANCE * 2)
    throw new Error(
      `the band between the ground ${ground} (relative luminance ${groundAt.toFixed(4)}) and the ` +
        `nearest ink this beat draws with (${nearest.toFixed(4)}) is ${band.toFixed(4)} wide, under ` +
        `the ${(SURFACE_CLEARANCE * 2).toFixed(2)} a surface that is neither the ground nor a class ` +
        `needs. There is nowhere to put the sea that a reader would not read as one or the other. ` +
        `Raise this beat's ramp at its low end, or take an accent with more room against this ground.`,
    );
  const towardsLight = nearest > groundAt;
  const midpoint = (groundAt + nearest) / 2;
  const ceilings = inkAt.map((one) =>
    towardsLight ? (one + 0.05) / NON_TEXT_FLOOR - 0.05 : NON_TEXT_FLOOR * (one + 0.05) - 0.05,
  );
  const ceiling = towardsLight ? Math.min(...ceilings) : Math.max(...ceilings);
  const reachable = towardsLight
    ? ceiling >= groundAt + SURFACE_CLEARANCE
    : ceiling <= groundAt - SURFACE_CLEARANCE;
  const ceilingUnreachable = reachable
    ? null
    : `no tint sits between the ground ${ground} (relative luminance ${groundAt.toFixed(4)}) and a ` +
      `${NON_TEXT_FLOOR}:1 floor under this beat's own ink, which lands at ${ceiling.toFixed(4)} — ` +
      `past the ground itself. The sea is placed at the midpoint of the band instead, and whether a ` +
      `mark drawn on it can be seen is measured on the finished plate rather than assumed here.`;
  let at = reachable ? (towardsLight ? Math.min(midpoint, ceiling) : Math.max(midpoint, ceiling)) : midpoint;
  // The finished tint is 8-bit, so it is measured AGAIN rather than claimed: a step the wrong side
  // of the floor is a promise this function made and did not keep. One step at a time toward the
  // ground, which is the direction that can only help both readings.
  let hex = along(at);
  for (let step = 0; step < 64; step++) {
    const painted = luminance(hex);
    const holds = reachable ? inkAt.every((one) => contrast(one, painted) >= NON_TEXT_FLOOR) : true;
    if (holds && contrast(painted, groundAt) <= contrast(nearest, groundAt))
      return { hex, luminance: painted, midpoint, ceiling, ceilingUnreachable };
    at = towardsLight ? at - 0.002 : at + 0.002;
    hex = along(at);
  }
  throw new Error(
    `no tint on the water axis satisfies this ground and this ink: the last tried was ${hex} at ` +
      `relative luminance ${luminance(hex).toFixed(4)}, against a ground of ${groundAt.toFixed(4)} ` +
      `and ink at ${inkAt.map((one) => one.toFixed(4)).join(", ")}.`,
  );
}

/** THE GROUND AND THE INK THIS BAKE PAINTS AGAINST, out of the nearest `PALETTE.md` at or above this
 *  script — never a flag a caller has to remember.
 *
 *  THE DEFECT THIS SHAPE CLOSES, and it happened in this repository three days apart. A beat found
 *  the sea unreadable on its own dark ground, added a `--water` flag to its own copy of this bake,
 *  measured a tint by hand and passed it once. The next agent to re-bake that plate — for an
 *  unrelated change to the frame — ran the same script without the flag, and the literal came
 *  straight back into the delivered page. A colour that has to be remembered is a colour that will
 *  be forgotten; the palette is on disk beside the beat, so it is read.
 *
 *  `--ground` and `--ink` stay as overrides for a caller with no beat around it. */
function beatPalette() {
  const declaredGround = flag("--ground", null);
  const declaredInk = flag("--ink", null);
  let current = HERE;
  let source = "";
  let read = null;
  for (;;) {
    const candidate = join(current, "PALETTE.md");
    if (existsSync(candidate)) {
      source = readFileSync(candidate, "utf8");
      read = candidate;
      break;
    }
    const parent = dirname(current);
    if (parent === current) break;
    current = parent;
  }
  const ground = declaredGround ?? /^ground:\s*"?(#[0-9a-fA-F]{6})"?\s*$/m.exec(source)?.[1] ?? null;
  const ink = declaredInk
    ? declaredInk.match(/#[0-9a-fA-F]{6}/g) ?? []
    : [
        ...(/^accent:\s*"?(#[0-9a-fA-F]{6})"?\s*$/m.exec(source)?.slice(1, 2) ?? []),
        ...(/^accents:\s*"?([^"\n]*)"?\s*$/m.exec(source)?.[1]?.match(/#[0-9a-fA-F]{6}/g) ?? []),
      ];
  if (!ground || ink.length === 0)
    throw new Error(
      `this bake paints a basemap and has no palette to paint it against: ${read ? `${read} records ` : "no PALETTE.md was found at or above this script, so nothing records "}` +
        `${ground ? `a ground (${ground})` : "no ground"} and ${ink.length ? `${ink.length} accent(s)` : "no accent"}. ` +
        `Record them, or pass --ground #rrggbb and --ink #rrggbb. The sea is derived from both and ` +
        `there is no literal left to fall back on.`,
    );
  return { ground, ink, read };
}

const PALETTE = beatPalette();
const WATER = basemapWaterFor(PALETTE.ground, PALETTE.ink);


const size = Number(flag("--size", "620"));
const outDir = flag("--out", join(HERE, `plate-${size}`));
const shapesPath = flag("--shapes", join(HERE, "countries.geojson"));
const settleMs = Number(flag("--settle", "20000"));
const keyPath = flag("--env", join(HERE, "../../.env"));

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
      `no Chrome to capture with. Looked in:\n  ${candidates.join("\n  ")}\nSet CHROME_PATH, or run: bunx puppeteer browsers install chrome`,
    );
  return found;
}

function parseEnvFile(text) {
  const env = {};
  for (const line of text.split(/\r?\n/)) {
    const match = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(\S+)\s*$/.exec(line);
    if (match) env[match[1]] = match[2];
  }
  return env;
}

// What the camera already knows, and what `geometry.json` used to throw away. Every downstream
// "big enough / too big / too close together" decision needs these three numbers; without them each
// one is re-guessed as a pixel constant tuned by eye against this beat's own extent.

/** The extent ACTUALLY shown, which is NOT the bounds that were asked for: `fitBounds` fits the
 * bounds inside the box on whichever axis binds first, so the other axis always overshoots. @parity */
function frameCornersOf(topLeft, bottomRight) {
  return { west: topLeft.lng, north: topLeft.lat, east: bottomRight.lng, south: bottomRight.lat };
}

/** Web-Mercator northing for a latitude, in world units where a full turn of longitude is 2π. @parity */
function mercY(latDeg) {
  return Math.log(Math.tan(Math.PI / 4 + (latDeg * Math.PI) / 360));
}

/** How wide the world draws at this zoom (512px at zoom 0, doubling each level), and what one drawn
 * pixel is worth in degrees and in metres at the frame's own centre latitude. @parity */
function cameraFacts(zoom, corners) {
  const worldWidthPx = 512 * 2 ** zoom;
  const centreLat = (corners.north + corners.south) / 2;
  return {
    worldWidthPx: Math.round(worldWidthPx * 10) / 10,
    degreesPerPixel: Number((360 / worldWidthPx).toPrecision(6)),
    metresPerPixel: Number(((40075016.686 * Math.cos((centreLat * Math.PI) / 180)) / worldWidthPx).toPrecision(6)),
  };
}

/** The least frame height, at this width, that holds this latitude range without cropping — the
 * Mercator world's own aspect over that range. The message a shortfall throws is only useful if the
 * number in it ACTUALLY fixes the frame, and a constant tuned against one beat's [-60°, 78°]
 * (`width * 0.5685`) is wrong at every other range. Measured: this derivation and that constant
 * differ by one pixel at 836px, so replacing it moved no plate. @parity */
function minFrameHeightPx(width, south, north) {
  return Math.ceil((width * (mercY(north) - mercY(south))) / (2 * Math.PI));
}

/** THE WORLD MUST FILL THE FRAME'S WIDTH. Under it, MapLibre draws a repeat continent inside the
 * picture carrying none of this beat's marks, and a reader can reasonably read the bare copy as a
 * place with no data — measured once at 836 × 300, where 37% of the picture was un-binned repeat.
 * `renderWorldCopies: false` is not the fix: it clamps the camera instead, which silently dropped
 * 1,057 of 14,175 events. @parity */
function assertWorldFillsFrame(camera, width) {
  if (camera.worldWidthPx >= width - 1) return;
  throw new Error(
    `this plate would not fill its frame: the world draws ${camera.worldWidthPx.toFixed(1)}px wide inside ` +
      `${width}px (${((camera.worldWidthPx / width) * 100).toFixed(0)}%).`,
  );
}

/** …AND THE FRAME MUST REACH THE BOUNDS THAT WERE ASKED FOR, or the study area is silently cropped
 * instead. The two travel together, always: either one alone can be satisfied by a plate that lies.
 * @parity */
function assertCameraReachesBounds(frameCorners, bounds, width) {
  const [[askedWest, askedSouth], [askedEast, askedNorth]] = bounds;
  const shortfall = [];
  if (frameCorners.south > askedSouth + 0.01)
    shortfall.push(`south edge is ${frameCorners.south.toFixed(2)}°, asked for ${askedSouth}°`);
  if (frameCorners.north < askedNorth - 0.01)
    shortfall.push(`north edge is ${frameCorners.north.toFixed(2)}°, asked for ${askedNorth}°`);
  if (frameCorners.west > askedWest + 0.01)
    shortfall.push(`west edge is ${frameCorners.west.toFixed(2)}°, asked for ${askedWest}°`);
  if (frameCorners.east < askedEast - 0.01)
    shortfall.push(`east edge is ${frameCorners.east.toFixed(2)}°, asked for ${askedEast}°`);
  if (shortfall.length === 0) return;
  throw new Error(
    `this plate crops the study area — ${shortfall.join("; ")}. A ${width}px-wide frame needs at least ` +
      `${minFrameHeightPx(width, askedSouth, askedNorth)}px of height to hold ${askedSouth}°–${askedNorth}° without cropping.`,
  );
}

const MAPTILER_KEY_ALIASES = ["MAPTILER_API_KEY", "REMOTION_MAPTILER_KEY", "VITE_MAPTILER_KEY"];
const env = parseEnvFile(await readFile(keyPath, "utf8"));
const key = env.MAPTILER_KEY ?? MAPTILER_KEY_ALIASES.map((a) => env[a]).find(Boolean);
if (!key) throw new Error(`no MAPTILER_KEY in ${keyPath}`);

// ── The shapes, keyed the way Natural Earth actually keys them (ADM0_A3, never ISO_A3 — rule 5) ──
const collection = JSON.parse(await readFile(shapesPath, "utf8"));
const byKey = new Map();
for (const feature of collection.features) byKey.set(feature.properties.ADM0_A3, feature);
const missingShapes = CHOROPLETH_STUDY.filter((code) => !byKey.has(code));
if (missingShapes.length > 0)
  throw new Error(`${missingShapes.length} declared countries have no shape: ${missingShapes.join(", ")}`);

/**
 * Polygon PARTS, not a flattened ring list: each part is its own `[outer, ...holes]`. Kept nested
 * here so nothing downstream ever has to decide, after the fact, which ring in a flattened list
 * belonged to which landmass (rule 11's named warning).
 */
function partsOf(geometry) {
  return geometry.type === "MultiPolygon" ? geometry.coordinates : [geometry.coordinates];
}

const payload = CHOROPLETH_STUDY.map((code) => {
  const feature = byKey.get(code);
  return {
    // English only, this branch: the source's own NAME field, never NAME_FR.
    key: code,
    name: feature.properties.NAME,
    parts: partsOf(feature.geometry),
  };
});

// ── The capture ────────────────────────────────────────────────────────────────────────────────
const browser = await puppeteer.launch({
  headless: true,
  executablePath: resolveChrome(),
  args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--no-sandbox", "--hide-scrollbars"],
});
const page = await browser.newPage();
await page.setViewport({ width: size, height: size, deviceScaleFactor: 2 });
await page.setContent(
  `<!doctype html><html><head>
<link href="${MAPLIBRE_CSS}" rel="stylesheet"/>
<script src="${MAPLIBRE}"></script>
<style>html,body{margin:0;padding:0}#map{width:${size}px;height:${size}px}</style>
</head><body><div id="map"></div></body></html>`,
  { waitUntil: "load" },
);
await page.waitForFunction("window.maplibregl !== undefined", { timeout: 60000 });

const gate = await page.evaluate(
  async ({ key, style, bounds, settleMs, width, height , waterFill }) => {
    const map = new maplibregl.Map({
      container: "map",
      style: `https://api.maptiler.com/maps/${style}/style.json?key=${key}`,
      interactive: false,
      attributionControl: false,
      fadeDuration: 0,
      // Without this the WebGL canvas is empty by the time a screenshot reads it (rule 6).
      preserveDrawingBuffer: true,
      bounds,
      fitBoundsOptions: { padding: 0, animate: false },
    });
    window.__map = map;
    await new Promise((resolve) => map.once("style.load", resolve));

    // Rule 9: quiet the plate. Every place label, road label and boundary line the provider ships
    // competes with the one label this beat draws itself.
    const hidden = [];
    for (const layer of map.getStyle().layers)
      if (layer.type === "symbol" || /border|boundary|admin/i.test(layer.id)) {
        map.setLayoutProperty(layer.id, "visibility", "none");
        hidden.push(layer.id);
      }

    // Rule 7: water is a blue tint, never grey — grey water is indistinguishable from a no-data
    // region on the same map. `dataviz-light` paints water `hsl(240, 2%, 88%)`, a near-grey; force
    // the cartographic-convention blue before the plate is ever captured.
    for (const id of ["Water", "Water shadow"])
      if (map.getLayer(id)) map.setPaintProperty(id, "fill-color", waterFill);

    // Rule 1: idle OR a bounded settle, and say which. `idle` alone never fires when one tile
    // never resolves, and the capture then hangs forever rather than slowly.
    const started = Date.now();
    const how = await new Promise((resolve) => {
      let done = false;
      const finish = (how) => {
        if (!done) {
          done = true;
          resolve(how);
        }
      };
      map.once("idle", () => finish("idle"));
      setTimeout(() => finish("settle"), settleMs);
    });
    return {
      how,
      ms: Date.now() - started,
      hidden: hidden.length,
      zoom: map.getZoom(),
      topLeft: map.unproject([0, 0]),
      bottomRight: map.unproject([width, height]),
    };
  },
  { key, style: BEAT.style, bounds: BEAT.bounds, settleMs, width: size, height: size , waterFill: WATER.hex },
);

const frameCorners = frameCornersOf(gate.topLeft, gate.bottomRight);
const camera = cameraFacts(gate.zoom, frameCorners);
assertWorldFillsFrame(camera, size);
assertCameraReachesBounds(frameCorners, BEAT.bounds, size);

await mkdir(outDir, { recursive: true });
const platePath = join(outDir, "plate.png");
await page.screenshot({ path: platePath, clip: { x: 0, y: 0, width: size, height: size } });

// ── The projection (rule 3 and rule 4) ─────────────────────────────────────────────────────────
const projected = await page.evaluate((shapes) => {
  const map = window.__map;
  const at = (lng, lat) => {
    const p = map.project([lng, lat]);
    return [Math.round(p.x * 10) / 10, Math.round(p.y * 10) / 10];
  };
  return shapes.map((shape) => ({
    key: shape.key,
    name: shape.name,
    parts: shape.parts.map((part) => part.map((ring) => ring.map(([lng, lat]) => at(lng, lat)))),
  }));
}, payload);

const anchors = await page.evaluate((points) => {
  const map = window.__map;
  return Object.fromEntries(
    Object.entries(points).map(([name, [lng, lat]]) => {
      const p = map.project([lng, lat]);
      return [name, [Math.round(p.x * 10) / 10, Math.round(p.y * 10) / 10]];
    }),
  );
}, BEAT.anchors);

await browser.close();

// ── Cull and thin, in node, PARTS kept whole ───────────────────────────────────────────────────
const frame = { width: size, height: size };
const minGap = 0.6;
let ringsIn = 0;
let ringsOut = 0;

const shapes = projected.map((shape) => {
  // Cull ring by ring but keep the PART structure: a part survives if at least one of its own
  // rings survives the frame test. A hole surviving without its own outer would be nonsensical,
  // but this never drops a disjoint landmass (Sicily, Zealand, the Hebrides) just because it was
  // culled independently of the mainland part it has nothing geometrically to do with.
  const parts = [];
  for (const part of shape.parts) {
    const rings = [];
    for (const ring of part) {
      ringsIn++;
      if (!keepRing(ring, frame)) continue;
      rings.push(simplifyRing(ring, minGap));
      ringsOut++;
    }
    if (rings.length > 0) parts.push(rings);
  }
  return { key: shape.key, name: shape.name, parts };
});

const empty = shapes.filter((s) => s.parts.length === 0).map((s) => s.key);

const geometry = {
  frame,
  bounds: BEAT.bounds,
  style: BEAT.style,
  gatedBy: gate.how,
  zoom: Math.round(gate.zoom * 1000) / 1000,
  frameCorners,
  worldWidthPx: camera.worldWidthPx,
  degreesPerPixel: camera.degreesPerPixel,
  metresPerPixel: camera.metresPerPixel,
  anchors,
  shapes,
  // THE SEA THIS PLATE WAS PAINTED WITH, and where it came from — so a reader of this file sees the
  // derivation rather than a hex someone chose, and so a check after the fact can tell the surface
  // this bake SET from the surfaces the provider painted.
  water: { fill: WATER.hex, luminance: WATER.luminance, ground: PALETTE.ground, ink: PALETTE.ink, ceilingUnreachable: WATER.ceilingUnreachable },
};
const geometryPath = join(outDir, "geometry.json");
await writeFile(geometryPath, JSON.stringify(geometry));

console.log(
  `gated by ${gate.how} in ${gate.ms}ms · hid ${gate.hidden} basemap layers · zoom ${geometry.zoom}\n` +
    `plate    → ${platePath}\n` +
    `geometry → ${geometryPath}  ${ringsOut}/${ringsIn} rings kept, ${shapes.length} shapes\n` +
    `off-frame entirely: ${empty.length ? empty.join(", ") : "none"}`,
);
