// twin/skills/map-web/scripts/bake-plate.mjs
//
// The bake for the web format's proportional-symbol seed: one camera, one basemap capture, one
// file of projected point positions. No polygon rings and no data join — a symbol map has neither
// (`map-beat/references/types/proportional-symbol.md`: "there is no data JOIN for this
// type") — so this is a lighter bake than a choropleth's: points in, projected pixels out.
//
// After this runs there is no map anywhere in this skill, same invariant `map-beat` ships:
// the interactive HTML draws an `<image>` and some `<circle>`s through `render-web.mjs`.
//
// This is `doctrine/references/geo-discipline.md` rules 1, 2, 4, 6 in one script (rule 3 does
// not apply — nothing here is a polygon) — read before touching this file:
//   1. the frame gate is `idle` OR a bounded settle, and it records which one fired;
//   2. the plate is fixed, so the two responsive layouts this format ships never re-render tiles;
//   4. each point's own label is placed at its OWN projected pixel, in this beat's own typography;
//   6. capture plumbing — `preserveDrawingBuffer`, `--use-gl=angle`, a resolved Chrome path.
// Rule 7 (water reads as a blue tint, never grey) applies here MORE than to a choropleth: a
// point-based beat leaves nearly the whole plate exposed as basemap, so MapTiler's own
// `dataviz-light` near-grey water (`hsl(240, 2%, 88%)`) would be visible everywhere between the
// circles rather than hidden under polygon fills — this is the render that actually looks at it.
//
// A skill directory has to build after being copied into a journalist's root, so nothing under a
// skill may import out of it (`splash/test/no-cross-skill-imports.test.ts` fails loud on any
// specifier that does) — this file is this skill's OWN copy of the bake, not an import of
// `map-beat`'s or `proof/map-quake-symbol`'s.
//
// Usage:
//   bun skills/map-web/scripts/bake-plate.mjs --size 1000 --out /tmp/map-twin-web/plate-1000
//
// SIZE: baked generously (1000 logical px, ~2000 physical px at the capture's own 2x device pixel
// ratio) so the plate stays at or near native resolution when displayed full-width up to the widest
// tested viewport (1600px) — see references/map-web-discipline.md, "Full width, genuinely", for the
// exact numbers this trades off against file size and bake time.

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, isAbsolute, join } from "node:path";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer-core";
import { splashEnvPath } from "./splash-root.mjs";
import { keepPoint } from "./geo-symbol.ts";
import { coversTo, deliveryFrame, frameCoversTheBoxRange, labelSafeFrame } from "./delivery-frame.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));

/**
 * The camera: a box around this beat's own sample of European metro areas (Lisbon to Athens,
 * Athens to Stockholm), padded so no circle sits on the frame edge — the same reasoning
 * `map-beat/scripts/bake-plate.mjs` gives for its own wider Europe box, applied to a smaller
 * study set. Chosen from the geography, not a default (`geo-discipline.md` rule 12): the study
 * set's own lon/lat extent is roughly -9.1..23.7 / 38.0..59.3, padded ~5° on every side.
 */
// THIS BEAT'S CAMERA, chosen from the geography and not defaulted into (geo-discipline.md rule
// 12). The 39 prefectures the ministry lists span 131.65E-142.81E and 33.61N-43.37N by their own
// Natural Earth label points; this box pads that to the whole archipelago north of Kyushu so a
// Japanese reader recognises the outline they are looking at before they read a circle. Kyushu and
// Okinawa are inside the frame and carry no mark: they are eight of the prefectures the ministry
// does not list, and the caveat says so rather than the camera hiding the question.
const SEED_BEAT = {
  bounds: [
    [128.5, 30.5],
    [146.5, 45.8],
  ],
  style: "dataviz-dark",
};

const MAPLIBRE = "https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.js";
const MAPLIBRE_CSS = "https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.css";

const argv = process.argv.slice(2);
const flag = (name, fallback) => {
  const at = argv.indexOf(name);
  return at >= 0 ? argv[at + 1] : fallback;
};

// `--size` is the frame's WIDTH, and it has never been anything else — the second axis was never a
// decision anyone made, it was the same number used twice. `--width` is the name that says so;
// `--size` stays for every caller written before this. The HEIGHT is DERIVED from the camera unless
// a beat overrides it, so a wide camera gets a wide frame and fills the page it is drawn into.
const size = Number(flag("--width", flag("--size", "1000")));
const outDir = flag("--out", `/tmp/map-twin-web/plate-${size}`);
const dataPath = flag("--data", join(HERE, "bear-casualties-fy2025.json"));
/**
 * THE CAMERA AND THE BASEMAP ARE THE BEAT'S, NOT THE SKILL'S.
 *
 * Both used to be constants in this file and nothing else: `--size`, `--out` and `--data` were
 * flags, while the two decisions that are most obviously per-story — WHICH GROUND this map covers
 * and WHICH BASEMAP it is drawn over — could only be changed by editing a file inside the skill.
 * The consequence was measured twice in round six: `bake-plate.mjs` hard-codes `dataviz-light` with
 * no flag, and a beat that needed another camera copied the whole script into its own directory to
 * change two lines, which is how a beat's bake drifts from the canonical one
 * (`splash/test/bake-parity.test.ts` found exactly that, in two functions, this round).
 *
 * `--bounds` takes the same `[[west, south], [east, north]]` the camera has always been written as,
 * as JSON; `--style` takes a MapTiler style id. Both default to the seed's own, so every existing
 * caller — the example runners, the sealed-bake path, the install check — runs unchanged. The
 * camera is still CHOSEN FROM THE GEOGRAPHY and never defaulted into (geo-discipline.md rule 12):
 * what changes is only that a beat can now say so on the command line instead of in a fork.
 */
function beatCamera() {
  const declared = flag("--bounds", null);
  const style = flag("--style", SEED_BEAT.style);
  if (!declared) return { bounds: SEED_BEAT.bounds, style };
  let bounds;
  try {
    bounds = JSON.parse(declared);
  } catch {
    throw new Error(`--bounds is not JSON: ${declared}`);
  }
  const shaped =
    Array.isArray(bounds) &&
    bounds.length === 2 &&
    bounds.every((corner) => Array.isArray(corner) && corner.length === 2 && corner.every(Number.isFinite));
  if (!shaped)
    throw new Error(
      `--bounds must be [[west, south], [east, north]] with four finite numbers; got ${declared}`,
    );
  const [[west, south], [east, north]] = bounds;
  if (!(east > west) || !(north > south))
    throw new Error(
      `--bounds must run west to east and south to north; got ${declared} — a box with no area ` +
        "bakes a plate with no ground in it",
    );
  return { bounds, style };
}


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

const BEAT = beatCamera();
// DERIVED FROM THE CAMERA, never typed and never the width used twice. `--height` overrides it for a
// beat that has a reason; nothing in this tree has needed one. See `frameHeightFor` below.
// THE FRAME IS THE SHAPE OF THE BOX, NOT OF THE CAMERA (2026-08-23). The delivered page now takes
// the whole container on both axes and fills it by COVER, so the plate has to carry enough real
// basemap around the study set that every crop the layout can ask for lands on ocean. See
// `delivery-frame.mjs` for the derivation, the argument it overrules, and the one camera it cannot
// be solved for. `--box-aspects` is measured off the rendered page with `verify-fills-the-box.mjs`;
// `--clearance` is the room this beat's own labels need, measured the same way.
const BOX_ASPECTS =
  flag("--box-aspects", null) ??
  (() => {
    throw new Error(
      "--box-aspects <narrowest>,<widest> is required: it is the range of shapes this beat's own " +
        ".mw-stage takes on the rendered page, measured with verify-fills-the-box.mjs. A plate " +
        "baked without it is a plate baked for a box nobody looked at.",
    );
  })();
// Read with a number MATCH rather than a comma split: a bake that reads a journalist's csv
// already tokenises rows on newlines, and the pair of signals is what `csvSplitByHand` looks
// for — a flag parser is not a csv reader and must not look like one.
const [clearanceX = 0, clearanceY = 0] = (String(flag("--clearance", "0,0")).match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number);
const DELIVERY = deliveryFrame(BEAT.bounds, size, BOX_ASPECTS, { x: clearanceX, y: clearanceY });
const frameHeight = Number(flag("--height", "0")) || DELIVERY.frame.height;
const settleMs = Number(flag("--settle", "15000"));
const sealedBrowserPath = flag("--browser", null);
const sealedMaplibreJsPath = flag("--maplibre-js", null);
const sealedMaplibreCssPath = flag("--maplibre-css", null);
const sealedStylePath = flag("--style-json", null);
const sealedMapTilerEnv = argv.includes("--maptiler-env");
const sealedRuntimeValues = [sealedBrowserPath, sealedMaplibreJsPath, sealedMaplibreCssPath];
const sealed = sealedRuntimeValues.some(Boolean) || Boolean(sealedStylePath) || sealedMapTilerEnv;
if (sealed && (!sealedRuntimeValues.every(Boolean) || Boolean(sealedStylePath) === sealedMapTilerEnv)) {
  throw new Error("sealed map bake requires --browser, --maplibre-js, --maplibre-css, and exactly one of --style-json or --maptiler-env");
}
if (sealedBrowserPath && (!isAbsolute(sealedBrowserPath) || !existsSync(sealedBrowserPath))) {
  throw new Error(`sealed Chrome is not an existing absolute path: ${sealedBrowserPath}`);
}
// The Splash root's own `.env` — the same file `recordKey` writes a journalist's key into. This
// used to be a fixed three-level climb (`../../../.env`), which is `twin/.env` in this checkout and
// the DEVELOPER's `.env` anywhere the skills are installed as a symlink, because both Bun and Node
// resolve the link before computing `import.meta.url`. See `splash-root.mjs`.
const keyPath = sealed ? null : flag("--env", splashEnvPath(import.meta.dirname));

/**
 * Headless Chrome has to be FOUND before it can be gated (rule 6). puppeteer's own download is
 * missing on a clean install often enough that the chart format wrote the same note; this resolves
 * the candidates in order and fails naming every path it looked in.
 */
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

// A DUPLICATE of splash's own key-alias resolution, not an import — a skill directory has to
// stay copy-pasteable on its own (see `map-beat/scripts/bake-plate.mjs`'s own header note for
// the same rule applied there). Canonical name wins when both happen to be set.
const MAPTILER_KEY_ALIASES = ["MAPTILER_API_KEY", "REMOTION_MAPTILER_KEY", "VITE_MAPTILER_KEY"];

/** Parses `KEY=value` lines from a `.env` file's text into a plain object — one pair per line. */
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

/** THE FRAME THE CAMERA ITSELF ASKS FOR: the height that gives a `width`-px frame the same aspect
 * the beat's own bounds have in Web Mercator.
 *
 * THE DEFECT THIS CLOSES, reported by the owner looking at a rendered world map: the bake took ONE
 * `--size` and applied it to both axes (`width: size, height: size`, in five places). A world camera
 * is close to 2:1 in Web Mercator, so a square frame spends half its pixels on empty ocean above and
 * below the world AND halves every country — and because the delivered page sizes its map box from
 * the plate's own aspect, a square plate then sits as a square in the middle of a 1600px page with a
 * gutter either side. The map did not take the width it was given, which is the visible half of the
 * same defect.
 *
 * `minFrameHeightPx` above is this same derivation for the one camera that spans a full turn of
 * longitude — where the frame width IS the world width — and it was in this file the whole time,
 * used only to build an error message. This is it for every other camera: divide by the longitude
 * span the beat actually asked for rather than by 2π. `one-world-is-painted.test.ts` pins the two
 * against each other at planet extent and measures this one at more than one camera. */
function frameHeightFor(bounds, width) {
  const [[west, south], [east, north]] = bounds;
  const lonSpan = ((east - west) * Math.PI) / 180;
  const latSpan = mercY(north) - mercY(south);
  if (!(lonSpan > 0) || !(latSpan > 0))
    throw new Error(`a camera with no area has no frame: bounds ${JSON.stringify(bounds)}`);
  return Math.max(1, Math.ceil((width * latSpan) / lonSpan));
}

/** A longitude into this camera's own frame, `[west, west + 360)`. `map.project` does NOT wrap to
 * the camera, so a Pacific-centred beat must normalise every longitude before projecting it or every
 * western-Pacific point projects to a negative x and is culled. Two of nineteen bakes carried this
 * as a closure over `BEAT`, which is why seventeen could not have it. @parity */
function normaliseLon(lon, west) {
  return west + ((((lon - west) % 360) + 360) % 360);
}

/** How much of a frame may be margin the camera never asked for. 5%: on a 1000px frame that is 50px
 * of empty ocean, which is visible; under it, the difference is the fit landing on an integer frame.
 * Measured across this format's own beats — a re-baked European choropleth wastes 0.2%, a world
 * choropleth 0.0%, and the two still on a square frame waste 8.6% and 46.2%. */
const FRAME_MARGIN_TOLERANCE = 0.05;

/** THE FRAME IS THE CAMERA'S OWN SHAPE, NOT A SQUARE. The owner's report, on a rendered map: *the
 * map does not take the full available width.*
 *
 * `assertCameraReachesBounds` above already refuses a frame that CROPS the study area. This is its
 * other half, and it was missing: a frame that is too generous on one axis does not crop anything —
 * it pads. `fitBounds` fits the bounds on whichever axis binds first, so every pixel of the other
 * axis past the camera's own aspect is empty ground, the marks are drawn that much smaller, and the
 * delivered page — which sizes its map box from the plate's own aspect — then hands the reader a
 * square in the middle of a wide window with a gutter either side. Measured on
 * `stress-f-housing-pressure`: a camera asking for 0.538 baked into a 1.000 frame, 46.2% margin.
 *
 * The number in the message is `frameHeightFor`'s, so the fix is the value the fix is computed
 * with. @parity-exempt: this format's own addition; the canonical bake has no equivalent yet. */
function frameMatchesItsCamera(bounds, frame) {
  const asked = ((bounds[1][0] - bounds[0][0]) * Math.PI) / 180 / (mercY(bounds[1][1]) - mercY(bounds[0][1]));
  const drawn = frame.width / frame.height;
  const margin = 1 - Math.min(asked, drawn) / Math.max(asked, drawn);
  if (margin <= FRAME_MARGIN_TOLERANCE) return;
  throw new Error(
    `this frame is not the shape its camera asked for: ${frame.width}x${frame.height} is ` +
      `${drawn.toFixed(3)}:1 where the bounds ask for ${asked.toFixed(3)}:1, so ` +
      `${(margin * 100).toFixed(1)}% of the plate is margin no reader can read anything off — and a ` +
      `page that sizes its map box from this plate cannot fill the width it is given. At ` +
      `${frame.width}px wide this camera wants a ${frameHeightFor(bounds, frame.width)}px height.`,
  );
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

let key = null;
let sealedStyle = null;
if (sealed) {
  if (sealedStylePath) sealedStyle = JSON.parse(await readFile(sealedStylePath, "utf8"));
  else {
    key = process.env.MAPTILER_KEY ?? "";
    if (!key) throw new Error("sealed MapTiler bake did not receive MAPTILER_KEY from Engine");
  }
} else {
  const env = parseEnvFile(await readFile(keyPath, "utf8"));
  key = env.MAPTILER_KEY ?? MAPTILER_KEY_ALIASES.map((alias) => env[alias]).find(Boolean);
  if (!key) throw new Error(`no MAPTILER_KEY (or alias: ${MAPTILER_KEY_ALIASES.join(", ")}) in ${keyPath}`);
}

const points = JSON.parse(await readFile(dataPath, "utf8"));

// ── The capture ────────────────────────────────────────────────────────────────────────────────
const browser = await puppeteer.launch({
  headless: true,
  executablePath: sealedBrowserPath ?? resolveChrome(),
  args: [
    "--use-gl=angle",
    "--use-angle=swiftshader",
    "--enable-unsafe-swiftshader",
    "--no-sandbox",
    "--hide-scrollbars",
  ],
});
try {
const page = await browser.newPage();
await page.setViewport({ width: size, height: frameHeight, deviceScaleFactor: 2 });
if (sealed) {
  await page.setContent(
    `<!doctype html><html><head>
<style>html,body{margin:0;padding:0}#map{width:${size}px;height:${frameHeight}px}</style>
</head><body><div id="map"></div></body></html>`,
    { waitUntil: "load" },
  );
  await page.addStyleTag({ path: sealedMaplibreCssPath });
  await page.addScriptTag({ path: sealedMaplibreJsPath });
} else {
  await page.setContent(
    `<!doctype html><html><head>
<link href="${MAPLIBRE_CSS}" rel="stylesheet"/>
<script src="${MAPLIBRE}"></script>
<style>html,body{margin:0;padding:0}#map{width:${size}px;height:${frameHeight}px}</style>
</head><body><div id="map"></div></body></html>`,
    { waitUntil: "load" },
  );
}
await page.waitForFunction("window.maplibregl !== undefined", { timeout: 60000 });

const gate = await page.evaluate(
  async ({ key, style, padding, styleDefinition, bounds, settleMs, width, height, waterFill }) => {
    const map = new maplibregl.Map({
      container: "map",
      style: styleDefinition ?? `https://api.maptiler.com/maps/${style}/style.json?key=${key}`,
      interactive: false,
      attributionControl: false,
      fadeDuration: 0,
      // Without this the WebGL canvas is empty by the time a screenshot reads it (rule 6).
      preserveDrawingBuffer: true,
      bounds,
      fitBoundsOptions: { padding, animate: false },
    });
    window.__map = map;
    await new Promise((resolve) => map.once("style.load", resolve));

    // Rule 9: quiet the plate. Every place label, road label and boundary line the provider ships
    // is a layer doing none of the five jobs here — the circles and this beat's own labels carry it.
    const hidden = [];
    for (const layer of map.getStyle().layers)
      if (layer.type === "symbol" || /border|boundary|admin/i.test(layer.id)) {
        map.setLayoutProperty(layer.id, "visibility", "none");
        hidden.push(layer.id);
      }

    // Rule 7: water reads as a blue tint, never grey — see this file's own header note. Left
    // uncorrected, MapTiler's `dataviz-light` water is close enough to grey to read as no-data on
    // a beat where the ocean is not covered by anything else.
    // THIS BEAT'S OWN WATER, DERIVED FROM ITS PALETTE by `basemapWaterFor`, which is now the skill's
    // own answer rather than this beat's. Measured on this beat's first bake: the literal `#aac9e0`
    // has relative luminance 0.557 against a ground of 0.009 and an accent of 0.426, so the SEA WAS
    // BRIGHTER THAN EVERY DATA MARK ON A MAP ABOUT LAND, and an accent circle over it measured
    // 1.27:1 — below the 3:1 non-text floor the palette refuses at, on the only mark this beat has.
    // This beat first answered it with a `--water` flag it passed by hand; the flag was then dropped
    // by the next re-bake and the literal came straight back into the delivered page, which is why
    // the answer is read off PALETTE.md now and there is no flag to forget.
    for (const id of ["Water", "Water shadow"])
      if (map.getLayer(id)) map.setPaintProperty(id, "fill-color", waterFill);

    // Rule 1: idle OR a bounded settle, and say which. `idle` alone never fires when one tile never
    // resolves, and the capture then hangs forever rather than slowly.
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
  { key, style: BEAT.style, padding: DELIVERY.padding, styleDefinition: sealedStyle, bounds: BEAT.bounds, settleMs, width: size, height: frameHeight, waterFill: WATER.hex },
);

const frameCorners = frameCornersOf(gate.topLeft, gate.bottomRight);
const camera = cameraFacts(gate.zoom, frameCorners);
assertWorldFillsFrame(camera, size);
assertCameraReachesBounds(frameCorners, BEAT.bounds, size);
frameCoversTheBoxRange({ width: size, height: frameHeight }, DELIVERY.studySet, DELIVERY.boxAspects, DELIVERY.cannotCover);

await mkdir(outDir, { recursive: true });
const platePath = join(outDir, "plate.png");
await page.screenshot({ path: platePath, clip: { x: 0, y: 0, width: size, height: frameHeight } });

// ── The projection (rule 4) ────────────────────────────────────────────────────────────────────
const projected = await page.evaluate((rows) => {
  const map = window.__map;
  return rows.map(({ key, lon, lat }) => {
    const p = map.project([lon, lat]);
    return [key, Math.round(p.x * 10) / 10, Math.round(p.y * 10) / 10];
  });
}, points.map(({ key, lon, lat }) => ({ key, lon, lat })));

const pxOf = new Map(projected.map(([key, x, y]) => [key, [x, y]]));
const projectedPoints = points.map((p) => {
  const [px, py] = pxOf.get(p.key);
  return { ...p, px, py };
});

const frame = { width: size, height: frameHeight };
const offFrame = projectedPoints.filter((p) => !keepPoint(p, frame)).map((p) => p.name);

const geometry = {
  // What this plate was baked for, so the delivered page can be checked against it rather than
  // trusted: where the camera's bounds landed inside the frame, the box range asked for, the
  // range the frame actually reaches, and the named impossibility when there is one.
  studySet: DELIVERY.studySet,
  boxAspects: DELIVERY.boxAspects,
  clearance: DELIVERY.clearance,
  cannotCover: DELIVERY.cannotCover,
  coversTo: coversTo({ width: size, height: frameHeight }, DELIVERY.studySet),
  // The box a LABEL has to stay inside — the intersection of every band the delivery can show,
  // never the plate. A plate the cover crops is a plate whose own edge is not the picture's edge.
  // A `cannotCover` plate is contained rather than cropped, so its label box IS its frame.
  labelFrame: DELIVERY.cannotCover
    ? { width: size, height: frameHeight, left: 0, top: 0, safeWidth: size, safeHeight: frameHeight }
    : labelSafeFrame({ width: size, height: frameHeight }, DELIVERY.boxAspects),
  frame,
  bounds: BEAT.bounds,
  style: BEAT.style,
  gatedBy: gate.how,
  zoom: Math.round(gate.zoom * 1000) / 1000,
  frameCorners,
  worldWidthPx: camera.worldWidthPx,
  degreesPerPixel: camera.degreesPerPixel,
  metresPerPixel: camera.metresPerPixel,
  points: projectedPoints,
  // THE SEA THIS PLATE WAS PAINTED WITH, and where it came from — so the live layer paints the same
  // one the fallback plate does (they used to paint two different seas and nothing measured the
  // pair), and so a reader of this file can see the derivation rather than a hex someone chose.
  water: { fill: WATER.hex, luminance: WATER.luminance, ground: PALETTE.ground, ink: PALETTE.ink, ceilingUnreachable: WATER.ceilingUnreachable },
};
const geometryPath = join(outDir, "geometry.json");
await writeFile(geometryPath, JSON.stringify(geometry));

console.log(
  `gated by ${gate.how} in ${gate.ms}ms · hid ${gate.hidden} basemap layers · zoom ${geometry.zoom}\n` +
    `plate    → ${platePath}\n` +
    `geometry → ${geometryPath}  ${projectedPoints.length} points\n` +
    `sea      → ${WATER.hex} (luminance ${WATER.luminance.toFixed(4)}) from ${PALETTE.read ?? "--ground/--ink"}\n` +
    `off-frame: ${offFrame.length ? offFrame.join(", ") : "none"}`,
);
} finally {
  await browser.close();
}
