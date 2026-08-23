// twin/skills/scrolly/scripts/bake-plate.mjs
//
// The bake behind this seed's MAP track. One camera, one basemap capture, one projected pixel for
// the gauge station — after this runs there is no map anywhere in this skill: the scrolly's map
// frame draws a baked `<image>` and one marker, so the delivered HTML carries no MapTiler key and
// makes no network request (`references/scrolly-discipline.md`, "A map track without a live map").
//
// A skill directory has to build after being copied into a journalist's root, so nothing under a
// skill may import out of it. This is this skill's OWN copy of a bake — deliberately duplicated
// from the shape `map-web/scripts/bake-plate.mjs` ships, never an import of it.
//
// Two deliberate departures from the sibling map format's own bake, both because this is a LOCATOR
// plate rather than a data surface:
//   - the basemap's own place labels are KEPT. `geo-discipline.md` rule 9 ("quiet the plate") exists
//     because a layer doing none of the beat's five jobs is noise; here the beat's whole job is
//     "where is this gauge", and the toponyms are what answer it. Boundary lines are still hidden.
//   - the camera is a CENTRE + ZOOM, not a bounds box, so the station lands on the plate's own
//     centre by construction — which is what keeps the marker inside the safe band at every aspect
//     ratio the full-bleed graphic is COVER-cropped to (`ScrollySeed.tsx`, `safeBand`).
// Rule 7 still applies and is applied: water reads as a blue tint, never grey.
//
// ── THIS BAKE CAN BAKE A BEAT THAT IS NOT ITS OWN SEED, and until 2026-08-23 it could not ──────
//
// Measured by the beat that had to rewrite it: FOUR blockers, none of which had a flag between it
// and the journalist.
//
//   1. the camera centre came only from `readStation`, which REQUIRES a USGS site file
//      (`site_no`, `station_nm`, `dec_lat_va`, `dec_long_va`, `drain_area_va`). An avalanche
//      register, a prefecture table, a kiln — none of them have one.  → `--centre lon,lat`
//   2. the outputs were written as the literals `potomac-plate.jpg` / `potomac-plate.json`
//      whatever `--out` said, so two beats baking into one directory overwrote each other.
//                                                                     → `--name <basename>`
//   3. the camera was a centre and a MODULE-CONSTANT zoom, with `assertCameraReachesBounds`
//      declared in this very file and CALLED BY NOTHING — a requirement that could not fire, and
//      an `@parity-exempt` note beside it saying the bounds path was deliberate. A beat whose
//      study area is a country has a BOUNDS, not a zoom.        → `--bounds W,S,E,N` and `--zoom`
//   4. the basemap theme was the literal `"dataviz-light"`, also with no flag. Swept across the
//      tree on 2026-08-23: THREE skill bakes hard-code it, ZERO derive it, and EIGHT beat
//      directories carry a private answer — two of them by luminance, the rest by a literal with a
//      paragraph beside it. A dark-ground story cannot use a light plate: `plateFollowsGround`
//      refuses the pairing at preflight and `verify-scrolly.mjs` measures it again on the
//      delivered page, so this skill's own bake could not produce a plate this skill's own guards
//      would accept.                                            → `--ground #rrggbb`, `--style`
//
// The theme is DERIVED, not merely flagged, and it is derived by the same decision that will judge
// it: `surfaceLuminance` and `plateFollowsGround` are imported from this skill's own verifier
// beside this file — one skill, one decision, no new copy — so a plate this bake chooses is a plate
// preflight and the verifier already agree with. A ground in the middle band those two say nothing
// about gets no opinion here either: the default stands and the record says which of the three
// happened.
//
// Every default is exactly what this file did before, so the seed's own bake is unchanged.
//
// Usage:
//   bun skills/scrolly/scripts/bake-plate.mjs
//   bun skills/scrolly/scripts/bake-plate.mjs --out /tmp/plate --width 1000 --height 640
//   bun skills/scrolly/scripts/bake-plate.mjs --out beats/1-x/plate --name switzerland \
//     --bounds 5.9,45.8,10.5,47.9 --ground '#16191B'

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, isAbsolute, join } from "node:path";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer-core";
import { readStation } from "../assets/gauge-data.ts";
// THE SAME DECISION THAT WILL JUDGE THE PLATE, not a sixth private copy of it. Both live in
// this skill's own verifier one directory over, so this is an intra-skill import and never a
// cross-skill one; `splash/test/guard-copies-parity.test.ts` already holds that copy to the
// four others. A bake that decided the light/dark side its own way could pick a plate the
// guard refuses, which is the exact defect this parameterisation exists to close.
import { plateFollowsGround, surfaceLuminance } from "./verify-scrolly.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));

/** The camera's own centre is READ from the frozen USGS site file, never typed here — the same
 *  rule the beat's prose keeps. A coordinate re-typed into a bake script is a coordinate that can
 *  drift from the one the beat credits, and nothing would notice. */
/** Zoom 9 puts roughly 200 km of the Potomac valley across the plate — enough that a reader who
 *  has never heard of Point of Rocks can place it against Frederick, Leesburg and the river's own
 *  bends, which is the only job this frame has. */
const CAMERA = { zoom: 9, style: "dataviz-light" };

const MAPLIBRE = "https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.js";
const MAPLIBRE_CSS = "https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.css";


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

const argv = process.argv.slice(2);
const flag = (name, fallback) => {
  const at = argv.indexOf(name);
  return at >= 0 ? argv[at + 1] : fallback;
};

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

const width = Number(flag("--width", "1000"));
const height = Number(flag("--height", "640"));
const outDir = flag("--out", join(HERE, "../assets/sample-data"));
const settleMs = Number(flag("--settle", "15000"));
const sealedBrowserPath = flag("--browser", null);
const sealedMaplibreJsPath = flag("--maplibre-js", null);
const sealedMaplibreCssPath = flag("--maplibre-css", null);
const sealedStylePath = flag("--style-json", null);
const sealedMapTilerEnv = argv.includes("--maptiler-env");
const stationPath = flag("--station", join(HERE, "../assets/sample-data/potomac-station.rdb"));
/** What this bake's two outputs are CALLED. `potomac-plate.jpg` and `potomac-plate.json` were
 *  literals, so `--out <a beat's own directory>` wrote a Potomac-named pair into it and a second
 *  beat baking into the same directory overwrote the first without a word. */
const outName = flag("--name", "potomac");
/** The camera, three ways, in the order a beat is most likely to have the answer.
 *
 *  `--bounds W,S,E,N` is a STUDY AREA and is what a beat about a country or a region has;
 *  `--centre lon,lat` is a place, for a locator; and with neither, the seed reads its own frozen
 *  USGS site file exactly as it always did. A `--zoom` applies to the centre form only — a bounds
 *  IS the zoom, computed by `fitBounds`, and taking both would let a beat ask for two cameras. */
const boundsFlag = flag("--bounds", null);
const centreFlag = flag("--centre", null);
const zoomFlag = flag("--zoom", null);
/** The ground this beat is drawn on, and the basemap theme. `--style` is the override and wins;
 *  `--ground` is the DERIVATION and is what a beat should normally pass, because the side is then
 *  chosen by the same decision that refuses the pairing later. */
const groundFlag = flag("--ground", null);
const styleFlag = flag("--style", null);
if (boundsFlag && centreFlag)
  throw new Error("--bounds and --centre are two cameras; pass one. A bounds already fixes the zoom.");
if (boundsFlag && zoomFlag)
  throw new Error("--zoom means nothing beside --bounds: fitBounds computes the zoom the bounds needs.");
if (styleFlag && groundFlag)
  throw new Error("--style and --ground are two answers to one question; pass --ground and let the side be derived, or --style to override it.");

/** `[[west, south], [east, north]]` from `W,S,E,N`, refusing anything that is not four finite
 *  numbers in range — a bounds mistyped by one character silently becomes a camera somewhere else
 *  in the world, and there is no later moment at which that reads as a mistake rather than as the
 *  geography the beat asked for. */
function parseBounds(text) {
  const parts = text.split(",").map((n) => Number(n.trim()));
  if (parts.length !== 4 || !parts.every(Number.isFinite))
    throw new Error(`--bounds wants four numbers, "west,south,east,north"; got "${text}"`);
  const [west, south, east, north] = parts;
  if (south >= north) throw new Error(`--bounds south (${south}) must be below north (${north})`);
  if (Math.abs(south) > 85 || Math.abs(north) > 85)
    throw new Error(`--bounds latitudes must be inside Web Mercator's own +-85 degrees; got ${south}, ${north}`);
  if (Math.abs(west) > 180 || Math.abs(east) > 180)
    throw new Error(`--bounds longitudes must be inside -180..180; got ${west}, ${east}`);
  return [[west, south], [east, north]];
}

/** `[lon, lat]` from `lon,lat`, refused the same way and in the same order the flag names them —
 *  longitude first, as every GeoJSON position in this tree is written. */
function parseCentre(text) {
  const parts = text.split(",").map((n) => Number(n.trim()));
  if (parts.length !== 2 || !parts.every(Number.isFinite))
    throw new Error(`--centre wants two numbers, "lon,lat"; got "${text}"`);
  const [lon, lat] = parts;
  if (Math.abs(lat) > 85) throw new Error(`--centre latitude must be inside Web Mercator's own +-85 degrees; got ${lat}`);
  if (Math.abs(lon) > 180) throw new Error(`--centre longitude must be inside -180..180; got ${lon}`);
  return [lon, lat];
}

/** WHICH SIDE THE BASEMAP IS ON, decided by the decision that will judge it.
 *
 *  `plateFollowsGround` splits at `DARK_SIDE = 0.25` and `LIGHT_SIDE = 0.6` and deliberately says
 *  NOTHING about the band between them. So this asks it, rather than inventing a threshold beside
 *  it: the two candidate plates are the two themes, and the one this ground agrees with wins. When
 *  the ground is in the middle band both agree, nothing has been decided, and the default stands —
 *  said out loud in `chosenBy` rather than presented as a derivation that happened.
 *
 *  The plate luminances are the provider's own, measured off captures committed in this tree:
 *  MapTiler paints `dataviz-dark` land at `#292929` (0.024) and `dataviz-light` land at `#f7f7f5`
 *  (0.938) — see `stories/r8-map-static-honey-yields/beats/1-honey-yield-2025/bake-plate.mjs:42`
 *  and `stories/stress-f-housing-pressure/.../bake-plate.mjs:69`, which measured them
 *  independently. */
const DARK_PLATE_LUMINANCE = 0.024;
const LIGHT_PLATE_LUMINANCE = 0.938;
function basemapStyleFor(ground) {
  const luminance = surfaceLuminance(ground);
  if (luminance == null)
    throw new Error(`--ground is not a colour this bake can measure: "${ground}". Pass a #rrggbb.`);
  const dark = plateFollowsGround({ ground: luminance, plate: DARK_PLATE_LUMINANCE });
  const light = plateFollowsGround({ ground: luminance, plate: LIGHT_PLATE_LUMINANCE });
  if (dark && !light) return { style: "dataviz-dark", chosenBy: "ground", luminance };
  if (light && !dark) return { style: "dataviz-light", chosenBy: "ground", luminance };
  return { style: CAMERA.style, chosenBy: "the ground is in the band plateFollowsGround has no opinion about, so this bake's default stands", luminance };
}

const BASEMAP = styleFlag
  ? { style: styleFlag, chosenBy: "flag", luminance: null }
  : groundFlag
    ? basemapStyleFor(groundFlag)
    : { style: CAMERA.style, chosenBy: "no ground was given, so this bake's default stands", luminance: null };
const BOUNDS = boundsFlag ? parseBounds(boundsFlag) : null;
const CENTRE_FLAG = centreFlag ? parseCentre(centreFlag) : null;
const ZOOM = zoomFlag === null ? CAMERA.zoom : Number(zoomFlag);
if (!Number.isFinite(ZOOM)) throw new Error(`--zoom is not a number: "${zoomFlag}"`);
const sealedRuntimeValues = [sealedBrowserPath, sealedMaplibreJsPath, sealedMaplibreCssPath];
const sealed = sealedRuntimeValues.some(Boolean) || Boolean(sealedStylePath) || sealedMapTilerEnv;
if (sealed && (!sealedRuntimeValues.every(Boolean) || Boolean(sealedStylePath) === sealedMapTilerEnv)) {
  throw new Error("sealed scrolly map bake requires --browser, --maplibre-js, --maplibre-css, and exactly one of --style-json or --maptiler-env");
}
if (sealedBrowserPath && (!isAbsolute(sealedBrowserPath) || !existsSync(sealedBrowserPath))) {
  throw new Error(`sealed Chrome is not an existing absolute path: ${sealedBrowserPath}`);
}
// THE SEED'S OWN CAMERA, AND ONLY THEN. `readStation` parses a USGS site file and refuses anything
// else, so requiring it unconditionally is what made this bake unrunnable for every beat that is not
// a river gauge. A beat that named its own camera is not asked for one.
const usesStation = !BOUNDS && !CENTRE_FLAG;
if (usesStation && (!isAbsolute(stationPath) || !existsSync(stationPath))) {
  throw new Error(`station data is not an existing absolute path: ${stationPath}`);
}
const STATION = usesStation ? readStation(await readFile(stationPath, "utf8")) : null;
const CENTRE = CENTRE_FLAG ?? (STATION ? [STATION.lon, STATION.lat] : null);
// Resolved from the WORKING DIRECTORY, never by walking up out of this skill's own directory — a
// skill copied into a journalist's root sits at a different depth, and this skill's own canon test
// fails any specifier that leaves its directory. The environment wins over the file when both
// carry a key.
const keyPath = sealed ? null : flag("--env", join(process.cwd(), ".env"));

/** Headless Chrome has to be FOUND before it can be gated. Resolve the candidates in order and
 *  fail naming every path looked in — a duplicate of the sibling formats' own resolver. */
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

// A DUPLICATE of the key-alias resolution the sibling map formats carry, not an import.
const MAPTILER_KEY_ALIASES = ["MAPTILER_API_KEY", "REMOTION_MAPTILER_KEY", "VITE_MAPTILER_KEY"];

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

/** A longitude into this camera's own frame, `[west, west + 360)`. `map.project` does NOT wrap to
 * the camera, so a Pacific-centred beat must normalise every longitude before projecting it or every
 * western-Pacific point projects to a negative x and is culled. Two of nineteen bakes carried this
 * as a closure over `BEAT`, which is why seventeen could not have it. @parity */
function normaliseLon(lon, west) {
  return west + ((((lon - west) % 360) + 360) % 360);
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

const names = ["MAPTILER_KEY", ...MAPTILER_KEY_ALIASES];
const sealedStyle = sealedStylePath ? JSON.parse(await readFile(sealedStylePath, "utf8")) : null;
const fromProcess = sealedStyle ? undefined : names.map((name) => process.env[name]).find(Boolean);
const fromFile = !sealed && existsSync(keyPath)
  ? (() => {
      const env = parseEnvFile(readFileSync(keyPath, "utf8"));
      return names.map((name) => env[name]).find(Boolean);
    })()
  : undefined;
const key = fromProcess ?? fromFile;
if (!key && !sealedStyle && sealed) throw new Error("sealed scrolly map bake did not receive MAPTILER_KEY from Engine");
if (!key && !sealedStyle)
  throw new Error(
    `no MapTiler key. Looked for ${names.join(", ")} in the environment and in ${keyPath}`,
  );

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
const page = await browser.newPage();
await page.setViewport({ width, height, deviceScaleFactor: 2 });
if (sealed) {
  await page.setContent(
    `<!doctype html><html><head>
<style>html,body{margin:0;padding:0}#map{width:${width}px;height:${height}px}</style>
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
<style>html,body{margin:0;padding:0}#map{width:${width}px;height:${height}px}</style>
</head><body><div id="map"></div></body></html>`,
    { waitUntil: "load" },
  );
}
await page.waitForFunction("window.maplibregl !== undefined", { timeout: 60000 });

const gate = await page.evaluate(
  async ({ key, style, styleDefinition, zoom, centre, bounds, settleMs, width, height, waterFill }) => {
    const map = new maplibregl.Map({
      container: "map",
      style: styleDefinition ?? `https://api.maptiler.com/maps/${style}/style.json?key=${key}`,
      interactive: false,
      attributionControl: false,
      fadeDuration: 0,
      // Without this the WebGL canvas is empty by the time a screenshot reads it.
      preserveDrawingBuffer: true,
      // ONE camera, chosen above and never both: a bounds fits a study area and computes its own
      // zoom, a centre plus zoom fixes a locator on its own subject. `fitBoundsOptions` is the
      // canonical bake's, verbatim.
      ...(bounds
        ? { bounds, fitBoundsOptions: { padding: 0, animate: false } }
        : { center: centre, zoom }),
    });
    window.__map = map;
    await new Promise((resolve) => map.once("style.load", resolve));

    // Boundary/admin lines only — the place labels stay (see this file's own header note).
    const hidden = [];
    for (const layer of map.getStyle().layers)
      if (/border|boundary|admin/i.test(layer.id)) {
        map.setLayoutProperty(layer.id, "visibility", "none");
        hidden.push(layer.id);
      }

    // Rule 7: water reads as a blue tint, never grey — `dataviz-light` paints it near-grey and
    // `dataviz-dark` paints it a near-neutral `#141414`, either of which on a river beat reads as
    // no-data exactly where the subject is. Applied whichever theme was chosen: the override is
    // about what water must READ as, not about which basemap it came from.
    for (const id of ["Water", "Water shadow", "River", "River labels"])
      if (map.getLayer(id)) {
        const type = map.getLayer(id).type;
        if (type === "fill") map.setPaintProperty(id, "fill-color", waterFill);
        if (type === "line") map.setPaintProperty(id, "line-color", "#7fa9c9");
      }

    // Gate on idle OR a bounded settle, and record which one fired: `idle` alone never fires when
    // one tile never resolves, and the capture then hangs forever rather than slowly.
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
  { key, style: BASEMAP.style, styleDefinition: sealedStyle, zoom: ZOOM, centre: CENTRE, bounds: BOUNDS, settleMs, width, height, waterFill: WATER.hex },
);

const frameCorners = frameCornersOf(gate.topLeft, gate.bottomRight);
const camera = cameraFacts(gate.zoom, frameCorners);
assertWorldFillsFrame(camera, width);
// AND THE REQUIREMENT THAT COULD NOT FIRE, NOW FIRES. `assertCameraReachesBounds` was declared in
// this file and called by nothing, under a note saying the bake deliberately had no bounds path —
// which made it a rule about a case that could not arise, and left the case that DOES arise (a beat
// whose study area is a region) with no camera at all. A centre-and-zoom camera still has no
// asked-for extent to fall short of, and gets the world-fill invariant alone.
if (BOUNDS) assertCameraReachesBounds(frameCorners, BOUNDS, width);

await mkdir(outDir, { recursive: true });
const platePath = join(outDir, `${outName}-plate.jpg`);
// JPEG, not PNG, and this is a size decision made with a number rather than a preference: the plate
// is embedded as a data URI in a self-contained HTML file, and a 2000x1280 PNG of a basemap costs
// several megabytes where a quality-88 JPEG of the same capture costs a few hundred kilobytes. A
// basemap is continuous-tone imagery — the one medium JPEG is built for. The seed's own drawn and
// chart frames stay vector, where the same trade would be a real loss.
await page.screenshot({
  path: platePath,
  type: "jpeg",
  quality: 88,
  clip: { x: 0, y: 0, width, height },
});

// The seed's own marker. A beat that named a `--centre` or a `--bounds` projects its OWN marks from
// this geometry and has nothing here to project; `null` says that, and never `[0, 0]`.
const projected = STATION
  ? await page.evaluate(
      ({ lon, lat }) => {
        const p = window.__map.project([lon, lat]);
        return [Math.round(p.x * 10) / 10, Math.round(p.y * 10) / 10];
      },
      { lon: STATION.lon, lat: STATION.lat },
    )
  : null;

await browser.close();

const geometry = {
  frame: { width, height },
  style: BASEMAP.style,
  // HOW THAT STYLE WAS CHOSEN, on the record the beat reads back. "ground" means it was derived
  // from a measured ground by the same decision that will judge the pairing; "flag" means an author
  // overrode it; anything else is this bake saying that nothing was decided and its default stood.
  // A plate that was never chosen must not read like a plate that was.
  styleChosenBy: BASEMAP.chosenBy,
  ...(BASEMAP.luminance === null ? {} : { groundLuminance: BASEMAP.luminance }),
  zoom: Math.round(gate.zoom * 1000) / 1000,
  ...(BOUNDS ? { bounds: BOUNDS } : { centre: CENTRE }),
  frameCorners,
  worldWidthPx: camera.worldWidthPx,
  degreesPerPixel: camera.degreesPerPixel,
  metresPerPixel: camera.metresPerPixel,
  gatedBy: gate.how,
  ...(STATION ? { station: { ...STATION, px: projected[0], py: projected[1] } } : {}),
  // THE SEA THIS PLATE WAS PAINTED WITH, and where it came from. NOT read back off the capture the
  // way the other two bakes read theirs: this one writes a JPEG, and a lossy encoder turns the flat
  // fills `plateSurfaces` counts into a cloud of near-colours, so the reading has to happen where a
  // PNG plate exists — `verifyBeatFiles`, over this beat's own plate directories. Recorded here so
  // that reading has the derivation to compare against rather than a hex nobody can trace.
  water: { fill: WATER.hex, luminance: WATER.luminance, ground: PALETTE.ground, ink: PALETTE.ink, ceilingUnreachable: WATER.ceilingUnreachable },
};
const geometryPath = join(outDir, `${outName}-plate.json`);
await writeFile(geometryPath, JSON.stringify(geometry, null, 2) + "\n");

console.log(
  `gated by ${gate.how} in ${gate.ms}ms · hid ${gate.hidden} boundary layers · zoom ${geometry.zoom}\n` +
    `basemap  → ${BASEMAP.style} (${BASEMAP.chosenBy})\n` +
    `sea      → ${WATER.hex} (luminance ${WATER.luminance.toFixed(4)}) from ${PALETTE.read ?? "--ground/--ink"}${WATER.ceilingUnreachable ? " · ceiling unreachable, see the plate record" : ""}\n` +
    `plate    → ${platePath}\n` +
    `geometry → ${geometryPath}  ` +
    (projected
      ? `station at ${projected[0]},${projected[1]} of ${width}x${height}`
      : `${width}x${height}, ${BOUNDS ? "bounds" : "centre"} camera, no station to project`),
);
