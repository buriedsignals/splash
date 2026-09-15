// twin/proof/web-dot-density-europe-stations/render-directions-web.mjs
//
// Every low-carbon power station the database lists in Europe, rendered once per FILED DIRECTION
// into a self-contained interactive page, as a LIVE MapTiler map.
//
// THE DOT VALUE IS THE ARGUMENT, AND THE READER IS HANDED IT. Three resolutions cut the same 8 299
// frozen rows: one dot per station (the file is a register of places), one dot per a derived number
// of megawatts, and one dot per ten times that. Every count, every bound and every sentence below is
// DERIVED here and baked into the page — the browser never apportions a dot and never formats a
// number.
//
// Usage:  bun proof/web-dot-density-europe-stations/render-directions-web.mjs

import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { createHash } from "node:crypto";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import puppeteer from "puppeteer";
import { fileURLToPath } from "node:url";
import { mix, readPalette } from "#shared/chart-beat/colour.mjs";
import { deriveFurniture } from "#shared/chart-beat/render-still.mjs";
import { beatFacts, applicableTreatments } from "#shared/chart-beat/treatments.mjs";
import { readDirection } from "#shared/design-base/read-direction.mjs";
import { composeDirections, report } from "#shared/design-base/compose.mjs";
import { resolveDirectionFamilies } from "#shared/design-base/resolve-families.mjs";
import { plainSpaces } from "#shared/design-base/web.mjs";
import { countryGround } from "#shared/map-beat/tints.mjs";
import { MAP_DRAWING_SHARE, renderWeb } from "../../skills/chart-web/scripts/render-web.mjs";
import {
  assertDotValueReachesTheLayers,
  dotSlugOf,
  liveDotDensityPlan,
  liveDotDensityScript,
} from "../../skills/map-web/assets/live-dot-density.ts";
import { CHANGE_MS, DOT_ID_PREFIX, DirectedDotMapWeb, dotTones } from "./DirectedDotMapWeb.tsx";
import { WINDOW, CAMERA_ASPECT as MEASURE_ASPECT } from "./camera.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const DIRECTIONS = join(HERE, "..", "..", "docs", "design-base", "directions");
const OUT = join(HERE, "renders");
const EYEBROW = "Énergie · Europe";
const OUTSIDE = new Set(["Algeria", "Iraq", "Morocco", "Syrian Arab Republic", "Tunisia"]);
const FUELS = [
  ["Nuclear", "nucléaire"],
  ["Hydro", "hydraulique"],
  ["Wind", "éolien"],
  ["Solar", "solaire"],
];
const NAMES = {
  France: "France", Germany: "Allemagne", Spain: "Espagne", Italy: "Italie",
  "United Kingdom": "Royaume-Uni", Sweden: "Suède", Norway: "Norvège", Turkey: "Turquie",
  Poland: "Pologne", Switzerland: "Suisse", Austria: "Autriche", Finland: "Finlande",
  Portugal: "Portugal", Netherlands: "Pays-Bas", Belgium: "Belgique", Romania: "Roumanie",
  Ukraine: "Ukraine", Russia: "Russie", Denmark: "Danemark", Greece: "Grèce",
  "Czech Republic": "Tchéquie", Ireland: "Irlande", Bulgaria: "Bulgarie", Hungary: "Hongrie",
  Slovakia: "Slovaquie", Slovenia: "Slovénie", Croatia: "Croatie", Serbia: "Serbie",
  Albania: "Albanie", Iceland: "Islande", Latvia: "Lettonie", Lithuania: "Lituanie",
  Estonia: "Estonie", Luxembourg: "Luxembourg", Belarus: "Biélorussie", Moldova: "Moldavie",
  Montenegro: "Monténégro", "Bosnia and Herzegovina": "Bosnie-Herz.", Macedonia: "Macédoine du N.",
  Armenia: "Arménie", Georgia: "Géorgie",
};

/** THE JOIN, WRITTEN DOWN — and it is the trap `types/dot-density.md` names by hand.
 *
 *  This beat's file is keyed on a country NAME. MapTiler's Countries tileset, which the outline of
 *  the study is drawn from, is keyed on `iso_a2`. A code that does not match draws nothing, and a
 *  country that is drawn nothing looks exactly like a country outside the study — which on this map
 *  is a legitimate state already in the picture, so the failure is silent by construction. The table
 *  is therefore written here rather than inferred, it is checked below (every name has a code, every
 *  code is distinct), and `liveDotDensityPlan` refuses anything that is not two capitals. */
const ISO2 = {
  Albania: "AL", Armenia: "AM", Austria: "AT", Belarus: "BY", Belgium: "BE",
  "Bosnia and Herzegovina": "BA", Bulgaria: "BG", Croatia: "HR", "Czech Republic": "CZ",
  Denmark: "DK", Estonia: "EE", Finland: "FI", France: "FR", Georgia: "GE", Germany: "DE",
  Greece: "GR", Hungary: "HU", Iceland: "IS", Ireland: "IE", Italy: "IT", Latvia: "LV",
  Lithuania: "LT", Luxembourg: "LU", Macedonia: "MK", Moldova: "MD", Montenegro: "ME",
  Netherlands: "NL", Norway: "NO", Poland: "PL", Portugal: "PT", Romania: "RO", Russia: "RU",
  Serbia: "RS", Slovakia: "SK", Slovenia: "SI", Spain: "ES", Sweden: "SE", Switzerland: "CH",
  Turkey: "TR", Ukraine: "UA", "United Kingdom": "GB",
};

/** THE ONE COUNTRY THIS FRAME DOES NOT HOLD WHOLE, declared rather than discovered: Russia's largest
 *  part reaches 180°E, so a window fitted to it would be a world map with Europe in one corner. */
const CONTINENTAL = ["Russia"];

const plain = (s) => plainSpaces(s);
const fr = (v, d = 1) =>
  plain(v.toLocaleString("fr-FR", { minimumFractionDigits: d, maximumFractionDigits: d }));
const count = (v) => plain(v.toLocaleString("fr-FR"));

// ── THE READINGS ──────────────────────────────────────────────────────────────────────────────
const csv = (await readFile(join(HERE, "stations.csv"), "utf8")).trim().split(/\r?\n/);
const header = csv[0].split(",");
const at = (n) => {
  const i = header.indexOf(n);
  if (i < 0) throw new Error(`the frozen file has no ${n} column`);
  return i;
};
const stations = csv
  .slice(1)
  .map((line) => {
    const c = line.split(",");
    return {
      country: c[at("country")],
      fuel: c[at("fuel")],
      mw: Number(c[at("capacity_mw")]),
      lon: Number(c[at("lon")]),
      lat: Number(c[at("lat")]),
    };
  })
  .filter(
    (s) =>
      FUELS.some(([k]) => k === s.fuel) &&
      Number.isFinite(s.mw) && s.mw > 0 &&
      Number.isFinite(s.lon) && Number.isFinite(s.lat) &&
      !OUTSIDE.has(s.country),
  );
for (const s of stations) {
  if (!NAMES[s.country]) throw new Error(`${s.country} has no French name filed`);
  if (!/^[A-Z]{2}$/.test(ISO2[s.country] ?? ""))
    throw new Error(
      `${s.country} (${NAMES[s.country]}) has no ISO A2 code, so the outline of the study would ` +
        `skip it and a reader would read a counted country as one the file never had`,
    );
}
const COUNTRIES = [...new Set(stations.map((s) => s.country))].sort((a, b) =>
  NAMES[a].localeCompare(NAMES[b], "fr"),
);
if (new Set(COUNTRIES.map((c) => ISO2[c])).size !== COUNTRIES.length)
  throw new Error("two countries share one ISO A2 code: one of them would take the other's outline");

const totalMw = stations.reduce((s, z) => s + z.mw, 0);
const perFuel = FUELS.map(([key, name]) => {
  const set = stations.filter((s) => s.fuel === key);
  return { key, name, sites: set.length, mw: set.reduce((s, z) => s + z.mw, 0) };
}).map((f) => ({ ...f, perSite: f.mw / f.sites }));
const rare = [...perFuel].sort((a, b) => b.perSite - a.perSite)[0];

// ── THE CLAIM, ASSERTED ───────────────────────────────────────────────────────────────────────
if (rare.key !== "Nuclear")
  throw new Error(`the headline says nuclear is the most concentrated per site; ${rare.name} is`);
const siteShare = (rare.sites / stations.length) * 100;
const mwShare = (rare.mw / totalMw) * 100;
if (!(siteShare < 2 && mwShare > 25))
  throw new Error(
    `the headline needs a tiny share of sites carrying a large share of capacity; ${fr(siteShare)} % ` +
      `and ${fr(mwShare)} %`,
  );

// ── THE DOT VALUES, DERIVED ───────────────────────────────────────────────────────────────────
//
// NOTHING BELOW IS TYPED, and on this type that matters more than anywhere else: the dot value IS
// the argument, so a dot value an author picked by eye is an argument an author picked by eye.
//
// The megawatt value is the file's OWN mean capacity per site, rounded to the nearest legible step
// (1, 2 or 5 times a power of ten). That choice is what makes the two pictures comparable: the place
// field and the megawatt field then carry within about a tenth of the same number of dots, so the
// SAME quantity of ink is simply put somewhere else. A value chosen for roundness alone would have
// left the reader comparing two amounts of ink as well as two distributions.
const meanMw = totalMw / stations.length;
const legibleStep = (value) => {
  const power = Math.pow(10, Math.floor(Math.log10(value)));
  const candidates = [1, 2, 5, 10].map((m) => m * power);
  return candidates.reduce((best, c) =>
    Math.abs(Math.log(c / value)) < Math.abs(Math.log(best / value)) ? c : best,
  );
};
const DOT_MW = legibleStep(meanMw);
/** The coarse rule, and it is the catalogue's own trap shown rather than avoided: ten times the
 *  legible value, where a real concentration renders as a handful of sparse dots. */
const COARSE_MW = DOT_MW * 10;
/** The opposite half of the trap, MEASURED AND NOT SHIPPED: a value a tenth of the legible one closes
 *  the field into a blob. Printed on every render so the refusal is a number and not an opinion. */
const FINE_MW = DOT_MW / 5;

/** THE APPORTIONMENT IS A RULE, NOT AN ARITHMETIC ACCIDENT. Each site takes the whole dots its
 *  capacity buys; the dots left over go to the largest fractional remainders until the field holds
 *  exactly the number the total buys. Rounding each site independently would have lost or invented
 *  dots at the edges with nothing to say so — and the guard in `live-dot-density.ts` holds the field
 *  against the per-site counts for that reason. */
function apportion(dotMw) {
  const quota = stations.map((s) => s.mw / dotMw);
  const whole = quota.map((q) => Math.floor(q));
  const target = Math.round(totalMw / dotMw);
  let left = target - whole.reduce((a, b) => a + b, 0);
  const order = quota
    .map((q, i) => ({ i, rest: q - whole[i] }))
    .sort((a, b) => b.rest - a.rest || a.i - b.i);
  for (let k = 0; k < order.length && left > 0; k += 1, left -= 1) whole[order[k].i] += 1;
  return whole;
}

const GOLDEN = Math.PI * (3 - Math.sqrt(5));
/**
 * WHERE INSIDE THE GROUND A DOT GOES — the rule a dot-density map never shows, made a fact the page
 * states and the pointer proves.
 *
 * A site that buys one dot keeps its own coordinate. A site that buys `k` puts them on a phyllotaxis
 * spiral around itself, at a radius derived from the DOT's own ground radius and from nothing else:
 * dots are laid one diameter apart, so `R = 2 · r · sqrt(k)` and the cluster covers four times the
 * ground its dots do. That spacing is not a taste — it is the smallest that keeps a dot a DOT rather
 * than part of a blob, which is the condition under which this form is readable at all.
 *
 * It is deterministic (no generator, no seed to lose): the same file draws the same field on every
 * render, which is what `types/dot-density.md` asks for and what a re-render otherwise breaks.
 */
function scatter(station, k, groundMetres, index) {
  if (k === 1) return [[station.lon, station.lat]];
  const R = 2 * groundMetres * Math.sqrt(k);
  const metrePerLat = 111320;
  const metrePerLon = 111320 * Math.cos((station.lat * Math.PI) / 180);
  const spin = index * GOLDEN;
  const out = [];
  for (let i = 0; i < k; i += 1) {
    const r = R * Math.sqrt(i / k);
    const a = i * GOLDEN + spin;
    out.push([
      station.lon + (r * Math.cos(a)) / metrePerLon,
      station.lat + (r * Math.sin(a)) / metrePerLat,
    ]);
  }
  return out;
}

// ── THE CAMERA IS THE PLATE'S, AND THE WINDOW IS MEASURED ─────────────────────────────────────
//
// The equal-area camera in `camera.ts` is still this beat's own and this file still prints it: it is
// what MEASURES. It no longer PLACES anything. What places every dot is MapTiler — the live map
// reprojects on its own, and the plate under it is the same declared window fitted the same way, so
// the two are ONE camera rather than two pictures that agree today.
const geo = JSON.parse(await readFile(join(HERE, "shapes.geojson"), "utf8"));
/** Each country's own LARGEST PART, which is a measurement rather than a list of exceptions: France
 *  reaches Réunion, the Netherlands Curaçao, Norway Svalbard, Portugal the Azores. A box fitted to
 *  all of them draws the Atlantic with Europe as a stamp. */
const studyBoxes = new Map();
for (const f of geo.features) {
  const name = f.properties.name;
  if (!ISO2[name]) continue;
  const polys = f.geometry.type === "Polygon" ? [f.geometry.coordinates] : f.geometry.coordinates;
  let best = null;
  for (const poly of polys) {
    const ring = poly[0];
    const xs = ring.map((p) => p[0]);
    const ys = ring.map((p) => p[1]);
    const box = {
      west: Math.min(...xs), east: Math.max(...xs),
      south: Math.min(...ys), north: Math.max(...ys),
    };
    const span = (box.east - box.west) * (box.north - box.south);
    if (!best || span > best.span) best = { ...box, span };
  }
  if (best) studyBoxes.set(name, best);
}
/** THE BOX THE CAMERA IS ASKED TO HOLD: every counted country's own largest part, PLUS every station
 *  the file lists. Both halves, because they are two different failures — a frame that slices a
 *  country the outline draws, and a frame that drops a station the count counts. */
const held = [...studyBoxes].filter(([name]) => !CONTINENTAL.includes(name)).map(([, b]) => b);
const STUDY = {
  west: Math.min(...held.map((b) => b.west), ...stations.map((s) => s.lon)),
  east: Math.max(...held.map((b) => b.east), ...stations.map((s) => s.lon)),
  south: Math.min(...held.map((b) => b.south), ...stations.map((s) => s.lat)),
  north: Math.max(...held.map((b) => b.north), ...stations.map((s) => s.lat)),
};

const PLATE_FRAME = [1600, 1216];
const PLATE_SIZE = PLATE_FRAME.join("x");
const plateDir = (id) => join(HERE, "plate", id);
function ensurePlate(id, water, land) {
  const dir = plateDir(id);
  // THE CACHE IS KEYED ON THE FRAME AND ON THE WINDOW, because a cached plate is the one way a
  // camera change ships without being drawn: measured on the pattern while mutating the bake's own
  // declared window — the runner stayed green because nothing re-baked, and the page kept the camera
  // of a file that no longer said so.
  if (existsSync(join(dir, "geometry.json")) && existsSync(join(dir, "plate.png"))) {
    const cached = JSON.parse(readFileSync(join(dir, "geometry.json"), "utf8"));
    const b = cached.bounds ?? [[0, 0], [0, 0]];
    const holds =
      b[0][0] <= STUDY.west && b[1][0] >= STUDY.east && b[0][1] <= STUDY.south && b[1][1] >= STUDY.north;
    if (cached.frame?.width === PLATE_FRAME[0] && cached.frame?.height === PLATE_FRAME[1] && holds)
      return;
    console.log(
      `the ${id} plate was baked at ${cached.frame?.width}x${cached.frame?.height} on ` +
        `${JSON.stringify(cached.bounds)}, which ${holds ? "is the wrong frame" : "no longer holds the study set"} — re-baking…`,
    );
  }
  console.log(`baking the ${id} plate (MapTiler, ${PLATE_SIZE}, water ${water}, land ${land})…`);
  const result = spawnSync(
    "bun",
    [join(HERE, "bake.mjs"), "--size", PLATE_SIZE, "--countries", join(HERE, "shapes.geojson"),
     "--water", water, "--land", land, "--out", dir],
    { cwd: HERE, stdio: "inherit" },
  );
  if (result.status !== 0) throw new Error(`bake.mjs exited with ${result.status} for ${id}`);
}

/** The two tints a basemap is allowed on a directed plate, both derived from the direction and
 *  neither invented: `water-is-a-tint-not-a-grey` says the sea takes a little of the accent, and the
 *  land takes a step off the ground toward the ink. Nothing else on the basemap carries colour. */
const plateTints = (d) => ({
  water: mix(d.ground, d.accent, 0.16),
  land: mix(d.ground, deriveFurniture(d.ground).ink, 0.07),
});

const DIRECTION_FILES = readdirSync(DIRECTIONS).filter((f) => f.endsWith(".md")).sort();
for (const file of DIRECTION_FILES) {
  const id = file.replace(/\.md$/, "");
  const t = plateTints(readDirection(join(DIRECTIONS, file)));
  ensurePlate(id, t.water, t.land);
}
const factsOf = async (id) => JSON.parse(await readFile(join(plateDir(id), "geometry.json"), "utf8"));
const plateFacts = await factsOf(DIRECTION_FILES[0].replace(/\.md$/, ""));
for (const file of DIRECTION_FILES.slice(1)) {
  const id = file.replace(/\.md$/, "");
  const other = await factsOf(id);
  if (
    other.frame.width !== plateFacts.frame.width ||
    other.frame.height !== plateFacts.frame.height ||
    JSON.stringify(other.frameCorners) !== JSON.stringify(plateFacts.frameCorners)
  )
    throw new Error(
      `the ${id} plate was baked on a different camera than ${DIRECTION_FILES[0]}: three plates that ` +
        `disagree about where a degree is would put the same dot in three places, and nothing else ` +
        `here would notice`,
    );
}
const FRAME = plateFacts.frame;
const CORNERS = plateFacts.frameCorners;
if (!CORNERS || !(FRAME?.width > 0) || !(plateFacts.zoom > 0))
  throw new Error("this plate predates the camera facts: re-bake it with bake.mjs");

/** THE WINDOW THE CAMERA WAS ASKED TO HOLD, which is what this is measured against — never the frame
 *  it ended up with. `fitBounds` widens the frame on whichever axis does not bind, so a declared
 *  window too SMALL for the study set is forgiven by its own overshoot: on this beat's own previous
 *  window the frame reached 46,4°E on its own while the window stopped at 42, and it hid a study set
 *  that reaches 46,67. */
const ASKED = {
  west: plateFacts.bounds[0][0], south: plateFacts.bounds[0][1],
  east: plateFacts.bounds[1][0], north: plateFacts.bounds[1][1],
};
if (
  ASKED.west > STUDY.west || ASKED.east < STUDY.east ||
  ASKED.south > STUDY.south || ASKED.north < STUDY.north
)
  throw new Error(
    `the camera's declared window ${JSON.stringify(ASKED)} does not hold the study set ` +
      `${JSON.stringify(STUDY)}. A dot map's subject is a cloud of points AND a set of outlines: a ` +
      `window short on either edge drops stations the headline counts, and nothing downstream can ` +
      `see that it did.`,
  );
const outside = stations.filter(
  (s) => s.lon < ASKED.west || s.lon > ASKED.east || s.lat < ASKED.south || s.lat > ASKED.north,
);
if (outside.length)
  throw new Error(
    `${outside.length} of the ${stations.length} stations this map counts fall outside the declared ` +
      `window — the count would say one number and the field would draw another`,
  );

// ── WHAT A DOT IS, ON THE GROUND — DERIVED FROM THE FRAMING THIS BEAT PUBLISHES ────────────────
//
// A dot stands for a fixed piece of ground, so somebody has to say how big that piece is. It is not
// free and it is not taste: too small and the field is a wash the rasteriser loses, too large and it
// closes into a blob. The derivation runs the other way round — from the SMALLEST DISC A SCREEN CAN
// DRAW, at the framing the beat publishes.
//
// `groundRadiusExpression` (the trunk's, in `shared/map-beat/mount.mjs`) takes a FLOOR because below
// some radius a browser deposits no circle at all: measured on `proof/mapgen-dot-web` at 0.50px, a
// field carried 6 % of the ink the plate carried over the same ground while the page still announced
// its dot count. A floor is a lie about density wherever it is in force — so the dot's ground size is
// chosen to make the dot exactly the floor AT THE REVIEW FRAMING, where `minZoom` is the fit and the
// reader can only go in. The floor is therefore inert on the delivered page by construction, and
// exists for a narrower container, where it buys a visible field at an overstated density.
// THE FLOOR IS MEASURED, NOT TYPED. This beat's own field was drawn at nine constant radii on the
// delivered page and the deposited ink compared against the r² it claims (the whole map box
// photographed, differenced against the same page with the field switched off, summed):
//
//     r px   0,40   0,50   0,60   0,75   0,90   1,00   1,25   1,50   2,00
//     ink/r²  0,31   0,44   0,58   0,77   0,92   0,99   1,09   1,10   1,00
//
// At 1,0 px a circle still deposits 99 % of the ink its area claims; at 0,75 px it deposits 77 %, at
// 0,50 px 44 %. Below 1 px the field quietly under-states its own density, which is the defect
// `proof/mapgen-dot-web` recorded from the other end (6 % of the expected ink at 0,50 px).
const FLOOR_PX = 1.0;
/** THE FRAMING THE DOT'S GROUND SIZE IS DERIVED FROM, and it is measured rather than assumed: the
 *  SHORTEST plot the three directions take at the review window of 1512x860 — creme's 1464 x 466,
 *  against nocturne's 474 and rapport's 488. The shortest, because the dot is sized to land exactly
 *  on the floor there: any taller box fits the study at a higher zoom, draws the dot bigger, and
 *  leaves the floor inert. Sized on the tallest instead, creme would sit under the floor and its
 *  field would over-state its density by a quarter. */
const REVIEW_BOX = { width: 1464, height: 466 };
const mercFraction = (lat) =>
  (180 - (180 / Math.PI) * Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360))) / 360;
/** MapLibre's own `fitBounds` arithmetic with padding 0: the world is 512px at zoom 0, the bounds
 *  are a fraction of that world, and the binding axis sets the zoom. Computed rather than measured
 *  so the dot's ground size exists before the page is opened; the live drive prints the zoom the
 *  browser actually fitted, and the two are compared below. */
function fitZoomFor(box) {
  const dx = (ASKED.east - ASKED.west) / 360;
  const dy = Math.abs(mercFraction(ASKED.north) - mercFraction(ASKED.south));
  return Math.log2(Math.min(box.width / dx, box.height / dy) / 512);
}
const FIT_ZOOM = fitZoomFor(REVIEW_BOX);
const DOT_BAKE_PX = FLOOR_PX * Math.pow(2, plateFacts.zoom - FIT_ZOOM);
const DOT_GROUND_M = DOT_BAKE_PX * plateFacts.metresPerPixel;

// ── THE FIELDS ────────────────────────────────────────────────────────────────────────────────
//
// THREE CLASSES OF PLACE, THREE TREATMENTS — and the treatment index is also the draw order, low
// first, so the rare kind is never buried under a common one. It is NOT a size: on this type a size
// is the dot value, and the SVG form of this beat drew nuclear at twice the radius, which
// manufactured exactly the visibility the headline says the fleet does not have.
const kindOf = (fuel) => (fuel === "Nuclear" ? 2 : fuel === "Hydro" ? 1 : 0);
const KIND_LABELS = ["éolien et solaire", "hydraulique", rare.name];

const RULE_DEFS = [
  { key: "lieux", label: "Une centrale", mw: null },
  { key: `${DOT_MW} MW`, label: `${count(DOT_MW)} MW`, mw: DOT_MW },
  { key: `${COARSE_MW} MW`, label: `${count(COARSE_MW)} MW`, mw: COARSE_MW },
];

const fields = RULE_DEFS.map((def) => {
  const counts = def.mw === null ? stations.map(() => 1) : apportion(def.mw);
  const xy = [];
  const kind = [];
  const site = [];
  // Quiet kinds first, the named kind last — the same order `circle-sort-key` gives the layer, so
  // the field reads the same whether a renderer honours the sort key or the source order.
  for (const wanted of [0, 1, 2])
    stations.forEach((station, i) => {
      if (kindOf(station.fuel) !== wanted || counts[i] === 0) return;
      for (const [lon, lat] of scatter(station, counts[i], DOT_GROUND_M, i)) {
        xy.push(Number(lon.toFixed(3)), Number(lat.toFixed(3)));
        kind.push(wanted);
        site.push(i);
      }
    });
  return { ...def, counts, xy, kind, site, dots: kind.length };
});
const FIELD_BY_SLUG = new Map(fields.map((f) => [dotSlugOf(f.key), f]));
const DEFAULT_KEY = RULE_DEFS[0].key;
const perKind = fields.map((field) => [0, 1, 2].map((k) => field.kind.filter((x) => x === k).length));
const silent = fields.map((field) => field.counts.filter((n) => n === 0).length);
const fineDots = Math.round(totalMw / FINE_MW);

// ── HOW MUCH GROUND THE FIELD ACTUALLY COVERS, AND WHAT MERCATOR COSTS THIS SUBJECT ───────────
//
// A dot has no area to be inflated and the headline is a COUNT and a SUM, so neither the sentence nor
// the marks are touched by the projection. What IS touched is the GROUND UNDER them: Mercator draws
// the north larger, the same dots spread over more page, and the north looks sparser than it is.
// That is the opposite failure to the choropleth's next door, and it is why that beat keeps an
// equal-area camera to measure with and this one does not need to.
const RAD = Math.PI / 180;
const EARTH_KM = 6371.0088;
const mercY = (lat) => Math.log(Math.tan(Math.PI / 4 + (lat * RAD) / 2));
const toFramePx = ([lon, lat]) => [
  ((lon - CORNERS.west) / (CORNERS.east - CORNERS.west)) * FRAME.width,
  ((mercY(lat) - mercY(CORNERS.north)) / (mercY(CORNERS.south) - mercY(CORNERS.north))) * FRAME.height,
];
const shoelace = (ring) => {
  let sum = 0;
  for (let i = 0; i < ring.length; i += 1) {
    const [x1, y1] = ring[i];
    const [x2, y2] = ring[(i + 1) % ring.length];
    sum += x1 * y2 - x2 * y1;
  }
  return Math.abs(sum) / 2;
};
const sphericalArea = (ring) => {
  let sum = 0;
  for (let i = 0; i < ring.length; i += 1) {
    const [l1, p1] = ring[i];
    const [l2, p2] = ring[(i + 1) % ring.length];
    sum += (l2 - l1) * RAD * (2 + Math.sin(p1 * RAD) + Math.sin(p2 * RAD));
  }
  return Math.abs((sum * EARTH_KM * EARTH_KM) / 2);
};
const inFrame = ([lon, lat]) =>
  lon >= CORNERS.west && lon <= CORNERS.east && lat >= CORNERS.south && lat <= CORNERS.north;
const areas = new Map();
for (const f of geo.features) {
  const name = f.properties.name;
  if (!ISO2[name] || CONTINENTAL.includes(name)) continue;
  const polys = f.geometry.type === "Polygon" ? [f.geometry.coordinates] : f.geometry.coordinates;
  let page = 0;
  let real = 0;
  for (const poly of polys) {
    const ring = poly[0];
    if (!ring.some(inFrame)) continue;
    page += shoelace(ring.map(toFramePx));
    real += sphericalArea(ring);
  }
  if (page > 0) areas.set(name, { page, real });
}
const PAGE_TOTAL = [...areas.values()].reduce((s, a) => s + a.page, 0);
const REAL_TOTAL = [...areas.values()].reduce((s, a) => s + a.real, 0);
const NORTH = ["Norway", "Sweden", "Finland"];
const NORTH_PAGE_SHARE = (NORTH.reduce((s, c) => s + areas.get(c).page, 0) / PAGE_TOTAL) * 100;
const NORTH_TRUE_SHARE = (NORTH.reduce((s, c) => s + areas.get(c).real, 0) / REAL_TOTAL) * 100;
const NORTH_DILUTION = NORTH_PAGE_SHARE / NORTH_TRUE_SHARE;
if (!(NORTH_PAGE_SHARE > NORTH_TRUE_SHARE))
  throw new Error(
    `the caveat tells the reader Web Mercator thins the north, and on this camera it measures ` +
      `${NORTH_PAGE_SHARE.toFixed(1)} % of the page against ${NORTH_TRUE_SHARE.toFixed(1)} % of the ` +
      `ground — the sentence would be false`,
  );
/** AND THE SECOND HALF OF THE SAME FACT, which belongs to this type alone: `circle-radius` is a
 *  SCREEN length and Mercator's scale is a function of latitude, so one dot covers less ground the
 *  further north it is drawn — by 1/cos(lat), squared in area. The dot's declared ground size is
 *  therefore true at the frame's own reference latitude and nowhere else, and the two edges say how
 *  far that goes. */
const refLat = plateFacts.centreLat ?? (CORNERS.north + CORNERS.south) / 2;
const groundAt = (lat) => (DOT_GROUND_M * Math.cos(lat * RAD)) / Math.cos(refLat * RAD);
const DOT_SOUTH_KM = groundAt(CORNERS.south) / 1000;
const DOT_NORTH_KM = groundAt(CORNERS.north) / 1000;

const STUDY_AREA_KM2 = REAL_TOTAL;
const coverageOf = (field) =>
  (Math.PI * Math.pow(DOT_GROUND_M / 1000, 2) * field.dots) / STUDY_AREA_KM2;
const COVERAGE = coverageOf(fields[1]);
if (!(COVERAGE > 0.02 && COVERAGE < 0.5))
  throw new Error(
    `the densest field covers ${(COVERAGE * 100).toFixed(1)} % of the study's own ground in ink. ` +
      `Under 2 % it is a wash a reader reads as empty; over 50 % it closes into the blob ` +
      `types/dot-density.md names as the other half of the dot-value trap. Both are the same defect ` +
      `— a dot value and a dot size that do not belong to each other. (The figure SUMS disc areas, ` +
      `so it counts the overlap inside a site's own cluster, where the dots are laid one diameter ` +
      `apart by construction and the cluster is a quarter ink.)`,
  );

// ── WHAT THE POINTER ANSWERS, CUT INTO PIECES ─────────────────────────────────────────────────
//
// 8 299 whole sentences are about 580 KB on one page; these pieces are about 200, and a page that a
// newsroom will not embed is a page nobody reads. Every piece is CUT HERE and only JOINED in the
// browser, which is the line this format draws: the embedded faces are subset to the characters the
// page can show, so a glyph composed at runtime is a glyph nobody cut. The plan's JSON is what the
// font machine reads, so a join of two pieces from it composes no character that is not already in.
const byCountryMw = new Map();
const byCountrySites = new Map();
for (const s of stations) {
  byCountryMw.set(s.country, (byCountryMw.get(s.country) ?? 0) + s.mw);
  byCountrySites.set(s.country, (byCountrySites.get(s.country) ?? 0) + 1);
}
const FUEL_WORDS = FUELS.map(([, word]) => word);
const COUNTRY_WORDS = COUNTRIES.map((c) => NAMES[c]);
const parts = stations.map((s) => [
  FUELS.findIndex(([k]) => k === s.fuel),
  `${fr(s.mw, 0)} MW`,
  COUNTRIES.indexOf(s.country),
  `${fr((s.mw / byCountryMw.get(s.country)) * 100)} %`,
]);
const countWords = {};
for (const field of fields)
  for (const n of field.counts)
    if (n > 0 && !countWords[n]) countWords[n] = `${count(n)} point${n > 1 ? "s" : ""} ici`;
const answers = {
  sep: plain(" · "),
  tail: plain(" du parc bas-carbone de ce pays"),
  fuelWords: FUEL_WORDS,
  countryWords: COUNTRY_WORDS,
  parts,
  counts: Object.fromEntries(fields.map((f) => [dotSlugOf(f.key), f.counts])),
  countWords,
};

// ── THE PAGE'S WORDS ──────────────────────────────────────────────────────────────────────────
const dotsUnder = (slug, predicate) => {
  const field = FIELD_BY_SLUG.get(slug);
  return stations.reduce((sum, s, i) => sum + (predicate(s) ? field.counts[i] : 0), 0);
};
const rareDotsPlaces = dotsUnder(dotSlugOf(RULE_DEFS[0].key), (s) => s.fuel === rare.key);
const rareDotsMw = dotsUnder(dotSlugOf(RULE_DEFS[1].key), (s) => s.fuel === rare.key);
const rareInkPlaces = (rareDotsPlaces / fields[0].dots) * 100;
const rareInkMw = (rareDotsMw / fields[1].dots) * 100;
if (!(rareInkMw > rareInkPlaces * 10))
  throw new Error(
    `the whole gesture rests on the named kind taking a far larger share of the INK once a dot is ` +
      `worth megawatts rather than places: ${fr(rareInkPlaces, 2)} % becomes ${fr(rareInkMw, 1)} %, ` +
      `which is not the order-of-magnitude change the sentences below claim`,
  );

const RULES = fields.map((field, i) => {
  const slug = dotSlugOf(field.key);
  const keyLine =
    field.mw === null
      ? `1 point = une centrale`
      : `1 point = ${count(field.mw)} MW`;
  const note =
    i === 0
      ? null
      : field.mw === DOT_MW
        ? `${count(field.dots)} points pour ${count(fields[0].dots)} centrales — la même encre, ` +
          `posée ailleurs : le ${rare.name} passe de ${fr(rareInkPlaces, 2)} % à ` +
          `${fr(rareInkMw, 1)} % de l'encre. Prix de la résolution : ${count(silent[i])} des ` +
          `${count(stations.length)} sites n'atteignent pas un point et quittent la carte.`
        : `Dix fois plus gros : ${count(field.dots)} points seulement, et ${count(silent[i])} des ` +
          `${count(stations.length)} sites disparaissent. C'est le piège du genre montré en face — ` +
          `une vraie concentration devient une poignée de points épars, qui se lit « vide ».`;
  return {
    key: field.key,
    label: field.label,
    announce:
      field.mw === null
        ? `Un point par centrale — le fichier est un registre de lieux`
        : `Un point pour ${count(field.mw)} mégawatts de puissance installée`,
    keyLine: plain(keyLine),
    note: note === null ? null : plain(note),
    xy: field.xy,
    kind: field.kind,
    site: field.site,
  };
});

const title = plain(
  `${rare.sites} centrales nucléaires sur ${count(stations.length)} — et ${fr(mwShare, 0)} % de la puissance`,
);
const caveat = plain(
  `Toutes les centrales bas-carbone recensées en Europe. Ce qu'un point vaut est le choix du ` +
    `lecteur, et c'est tout l'argument : sous « une centrale » le ${rare.name} est ` +
    `${fr(rareInkPlaces, 2)} % de l'encre, sous « ${count(DOT_MW)} MW » il en est ` +
    `${fr(rareInkMw, 1)} % — même fichier, même quantité d'encre. Carte MapTiler plate, en Web ` +
    `Mercator : le nord est étiré, donc le même semis y paraît ${fr(NORTH_DILUTION)} fois moins ` +
    `dense qu'il ne l'est.`,
);
const claimNote = plain(
  `${fr(rare.perSite, 0)} MW par site pour le ${rare.name}, contre ` +
    perFuel.filter((f) => f.key !== rare.key).map((f) => `${fr(f.perSite, 0)} pour ${f.name}`).join(", ") +
    `. Le classement est calculé, jamais affirmé.`,
);
const readingLine = plain(
  `Lecture : changez ce qu'un point vaut. Les points ne bougent pas d'un pays à l'autre — ils se ` +
    `redéposent là où la puissance est. Un point couvre ${fr(DOT_GROUND_M / 1000)} km de rayon au ` +
    `sol, et sous une règle en mégawatts les points d'un même site sont posés à un diamètre les uns ` +
    `des autres autour de lui : un point n'est alors plus une adresse, c'est une part de puissance. ` +
    `Le tableau ci-dessous suit la même règle, avec ou sans JavaScript.`,
);
const liveHint = plain(
  `La carte est vivante : molette ou boutons pour zoomer, glisser pour déplacer, flèches du clavier ` +
    `une fois la carte au focus. Survolez un point : tous les points du même site s'allument, et il ` +
    `dit sa source, ses mégawatts, son pays et combien de points il a obtenus.`,
);
const source = plain(
  `Source : Global Power Plant Database (WRI) · fond MapTiler (${plateFacts.style}), teinté par la direction`,
);
const KEY_LABEL = plain("Clé :");
const CONTROL_LABEL = plain("Ce qu'un point vaut");
const TABLE_CAPTION = plain(`Les ${COUNTRIES.length} pays, et les points que la règle choisie leur donne`);
const COLUMNS = [plain("Pays"), plain("Sites"), plain("Puissance"), plain("Points")];

const kinds = KIND_LABELS.map((label, k) => ({
  label,
  counts: fields.map((field, i) => ({
    slug: dotSlugOf(field.key),
    text: plain(`${count(perKind[i][k])} points`),
  })),
}));

const rows = COUNTRIES.map((country) => {
  const mwTotal = byCountryMw.get(country);
  const sites = byCountrySites.get(country);
  const nuclear = stations.filter((s) => s.country === country && s.fuel === rare.key).length;
  return {
    code: ISO2[country],
    name: NAMES[country],
    sites: count(sites),
    capacity: plain(`${fr(mwTotal / 1000)} GW`),
    dots: fields.map((field) => ({
      slug: dotSlugOf(field.key),
      text: count(
        stations.reduce((sum, s, i) => sum + (s.country === country ? field.counts[i] : 0), 0),
      ),
    })),
    detail: plain(
      `${NAMES[country]} · ${fr((mwTotal / totalMw) * 100)} % de la puissance bas-carbone dessinée · ` +
        `${fr(mwTotal / sites, 0)} MW par site · ` +
        (nuclear ? `${count(nuclear)} du parc ${rare.name}` : `aucune centrale ${rare.name}`),
    ),
  };
});

const interaction = {
  earns:
    "A still, a video and a scrolly all have exactly one dot value, because a dot value is baked " +
    "into the drawing; only here can the reader put the same 8 299 frozen rows at three resolutions " +
    "and watch a fleet that is 0,9 % of the ink become a third of it with nothing added and nothing " +
    "removed.",
  controls: [
    {
      question: "Un point, ça vaut quoi au juste — et si ça valait autre chose ?",
      gesture: "toggle-a-comparison",
      changes:
        "Le semis est redéposé à la résolution choisie : la clé « 1 point = … » se réécrit, les " +
        "effectifs par source dans la légende se réécrivent avec elle, et une phrase dit combien de " +
        "sites n'atteignent plus un point et quittent la carte. La carte ne change ni de cadrage ni " +
        "d'échelle — seule la place de l'encre change.",
    },
    {
      question: "Et les pays un par un, sans la carte — ou sans JavaScript ?",
      gesture: "open-the-full-table",
      changes:
        "Les 41 pays s'ouvrent sous la carte avec leurs sites, leur puissance et le nombre de points " +
        "que la règle choisie leur donne. Cette dernière colonne suit la règle en CSS pur : c'est là " +
        "que le geste survit quand la carte ne le peut pas, un fond MapLibre n'étant atteignable par " +
        "aucune feuille de style.",
    },
    {
      question: "Ce point-là, c'est quoi — et combien de points ce lieu a-t-il obtenus ?",
      gesture: "ask-a-mark",
      changes:
        "Tous les points du même site s'allument d'un coup, dans une teinte cherchée depuis leur " +
        "propre couleur et sans qu'aucun ne change de taille, et la réponse donne la source, les " +
        "mégawatts, le pays, la part du parc de ce pays et le nombre de points que ce lieu a obtenus " +
        "à cette résolution.",
    },
  ],
};

const alt = plain(
  `Une carte d'Europe sur fond MapTiler, semée de points. Sous la règle par défaut, un point est une ` +
    `centrale : ${count(fields[0].dots)} points couvrent l'Europe de l'Ouest et alpine d'un semis ` +
    `dense et continu, plus clair à l'est, et les ${rare.sites} points du ${rare.name} y sont ` +
    `presque invisibles. Une commande à trois positions redéfinit ce qu'un point vaut ; sous ` +
    `« ${count(DOT_MW)} MW » les mêmes données donnent ${count(fields[1].dots)} points dont ` +
    `${count(rareDotsMw)} pour le ${rare.name}, groupés en amas autour d'une soixantaine de sites. ` +
    `La carte se zoome et se déplace avec les contrôles de MapTiler.`,
);

// ── WHAT THE RUN PRINTS ───────────────────────────────────────────────────────────────────────
console.log(
  `${count(stations.length)} centrales · ${rare.sites} ${rare.name} (${fr(siteShare, 1)} % des sites) ` +
    `portant ${fr(mwShare)} % de la capacité · ${fr(rare.perSite, 0)} MW par site contre ` +
    perFuel.filter((f) => f.key !== rare.key).map((f) => `${fr(f.perSite, 0)} (${f.name})`).join(", ") + "\n",
);
console.table(
  perFuel.map((f) => ({ source: f.name, sites: count(f.sites), GW: fr(f.mw / 1000), "MW/site": fr(f.perSite, 0) })),
);
console.log(
  `valeur du point DÉRIVÉE : ${fr(meanMw)} MW en moyenne par site → palier lisible ${DOT_MW} MW · ` +
    `règle grossière ${COARSE_MW} MW · règle fine REFUSÉE (${FINE_MW} MW = ${count(fineDots)} points, ` +
    `le semis se referme en pâté)\n`,
);
console.table(
  fields.map((field, i) => ({
    règle: field.key,
    points: count(field.dots),
    [rare.name]: count(perKind[i][2]),
    "% encre": fr((perKind[i][2] / field.dots) * 100, 2),
    "sites muets": count(silent[i]),
    "couverture %": fr(coverageOf(field) * 100),
  })),
);
console.log("");
console.log(
  `camera qui DESSINE : plaque MapTiler ${FRAME.width}x${FRAME.height} · ` +
    `${CORNERS.west.toFixed(2)}..${CORNERS.east.toFixed(2)}E ` +
    `${CORNERS.south.toFixed(2)}..${CORNERS.north.toFixed(2)}N · zoom ${plateFacts.zoom} · ` +
    `${fr(plateFacts.metresPerPixel, 0)} m/px`,
);
console.log(
  `camera qui MESURE (inchangée) : LAEA 52N 10E, fenêtre ${WINDOW.west}..${WINDOW.east}E ` +
    `${WINDOW.south}..${WINDOW.north}N · aspect ${MEASURE_ASPECT.toFixed(2)}:1`,
);
console.log(
  `le point : ${fr(DOT_BAKE_PX, 2)} px sur la plaque = ${fr(DOT_GROUND_M / 1000)} km de rayon au sol ` +
    `· ${FLOOR_PX} px à la fenêtre de revue (zoom ajusté ${fr(FIT_ZOOM, 3)} pour ` +
    `${REVIEW_BOX.width}x${REVIEW_BOX.height}) · plancher ${FLOOR_PX} px, donc inerte au cadrage publié`,
);
console.log(
  `ce que Mercator coûte à CE type (Russie mise à part) : Norvège+Suède+Finlande ` +
    `${NORTH_PAGE_SHARE.toFixed(1)} % de la terre dessinée pour ${NORTH_TRUE_SHARE.toFixed(1)} % de ` +
    `la terre réelle → le même semis y paraît ${fr(NORTH_DILUTION)}× moins dense qu'il ne l'est · ` +
    `et un point couvre ${fr(DOT_SOUTH_KM)} km de rayon à ${CORNERS.south.toFixed(0)}°N contre ` +
    `${fr(DOT_NORTH_KM)} km à ${CORNERS.north.toFixed(0)}°N, soit ` +
    `${fr(Math.pow(DOT_SOUTH_KM / DOT_NORTH_KM, 2))}× d'aire au sol\n`,
);

const facts = beatFacts(
  perFuel.map((f) => ({ key: f.key, label: f.name, value: f.sites })),
  { subject: rare.name, declaredSequence: "sites" },
);
const offered = applicableTreatments(facts);
console.log(`treatments applicable: ${offered.map((t) => t.id).join(", ") || "(none)"}\n`);

const textPerRegister = {
  display: title,
  eyebrow: EYEBROW,
  body: `${caveat} ${readingLine} ${source} ${liveHint}`,
  axis:
    `${KEY_LABEL} ${RULES.map((r) => r.keyLine).join(" ")} ` +
    `${kinds.map((k) => `${k.label} ${k.counts.map((c) => c.text).join(" ")}`).join(" ")} ` +
    `${CONTROL_LABEL} ${RULES.map((r) => `${r.label} ${r.announce}`).join(" ")} ` +
    `${TABLE_CAPTION} ${COLUMNS.join(" ")} ` +
    `${rows.map((r) => `${r.name} ${r.sites} ${r.capacity} ${r.dots.map((d) => d.text).join(" ")}`).join(" ")}`,
  annot: `${claimNote} ${RULES.map((r) => r.note ?? "").join(" ")}`,
  value: perFuel.map((f) => fr(f.perSite, 0)).join(" "),
};
for (const key of Object.keys(textPerRegister)) textPerRegister[key] = plain(textPerRegister[key]);

const filed = readdirSync(DIRECTIONS).filter((f) => f.endsWith(".md")).map((f) => readDirection(join(DIRECTIONS, f)));
const newsroom = readPalette(HERE, { stopAt: join(HERE, "..") });
const BEAT_FACTS = { evidenceLevels: KIND_LABELS.length };
console.log(report(composeDirections({ newsroom, filed, beat: BEAT_FACTS, textPerRegister }), { beat: BEAT_FACTS }));
console.log("");

// ── WHAT THE SECOND LAYER IS MADE OF, READ ONCE ───────────────────────────────────────────────
//
// MapLibre and its stylesheet are INLINED into every page rather than linked: a `<script src>` would
// trade the payload for a SECOND third-party host, and inlining keeps the count at one —
// api.maptiler.com. `style.mjs` travels as SOURCE with its `export` keywords stripped, because a
// page script cannot import.
const requireFrom = createRequire(import.meta.url);
const MAPLIBRE_JS = await readFile(requireFrom.resolve("maplibre-gl/dist/maplibre-gl.js"), "utf8");
const MAPLIBRE_CSS = await readFile(requireFrom.resolve("maplibre-gl/dist/maplibre-gl.css"), "utf8");
const STYLE_MODULE = (
  await readFile(join(HERE, "..", "..", "skills", "map-web", "assets", "style.mjs"), "utf8")
).replace(/^export /gm, "");

// ── THE FROZEN FALLBACK, BAKED FROM THE PAGE ITSELF ───────────────────────────────────────────
//
// The second layer, and on this beat it could never be the plate `bake.mjs` makes: that plate is
// MapTiler's geography and nothing else, so a page falling back to it would show a dot map with no
// dots — the exact defect the owner found on the pattern. So the fallback is photographed from the
// page's own live map: a draft is rendered, the key is substituted into a copy OUTSIDE the
// repository, the page is opened, the live map announces itself, its own box is photographed, and
// the page is rendered again with that image. No second plan, no second mount.
const FALLBACK_DIR = join(HERE, "fallback");
const FALLBACK_WINDOW = { width: 1512, height: 860, scale: 2 };
const BLANK_PNG =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";
const KEY = process.env.MAPTILER_KEY ?? process.env.REMOTION_MAPTILER_KEY ?? process.env.VITE_MAPTILER_KEY ?? "";
const PLACEHOLDER = `__MAPTILER${"_KEY__"}`;
const localPageOf = (pagePath) => pagePath.replace(/\.html$/, ".local.html");

/**
 * PHOTOGRAPH THE PAGE'S OWN LIVE MAP, and write it where the page will embed it.
 *
 * It REFUSES rather than writing something: a fallback baked from a map that never loaded is a
 * picture of the failure it exists to replace, and it would ship looking like a success.
 *
 * It also reports what the browser actually did — the fitted zoom and the dot's own drawn radius —
 * because the dot's ground size is DERIVED from a fit computed here, and a derivation nobody checks
 * against the thing it predicts is a derivation.
 */
async function bakeFallback(pagePath, outFile, id) {
  if (!KEY)
    throw new Error(
      "the frozen fallback is photographed from this page's own live map, so the bake needs a " +
        "MapTiler key in the environment (MAPTILER_KEY). Without one the page would ship with the " +
        "basemap and no dots on it, which is the defect this bake exists to close.",
    );
  const html = (await readFile(pagePath, "utf8")).split(PLACEHOLDER).join(KEY);
  const dir = mkdtempSync(join(tmpdir(), "mw-fallback-"));
  const keyed = join(dir, `${id}.local.html`);
  await writeFile(keyed, html);
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--use-gl=swiftshader", "--enable-unsafe-swiftshader"],
  });
  try {
    const page = await browser.newPage();
    await page.setViewport({
      width: FALLBACK_WINDOW.width,
      height: FALLBACK_WINDOW.height,
      deviceScaleFactor: FALLBACK_WINDOW.scale,
    });
    await page.goto(`file://${keyed}`, { waitUntil: "networkidle0", timeout: 180000 });
    await page.waitForFunction(() => document.documentElement.classList.contains("mw-live"), {
      timeout: 180000,
    });
    await page.evaluate(
      () =>
        new Promise((resolve) => {
          const map = window.__mwMap;
          if (map.loaded() && map.areTilesLoaded()) return resolve();
          map.once("idle", resolve);
        }),
    );
    await new Promise((r) => setTimeout(r, 800));
    const box = await page.$(".map-layer");
    if (!box) throw new Error("the page carries no live map box to photograph");
    const seen = await page.evaluate(() => {
      const figure = document.querySelector(".chart-figure");
      const map = window.__mwMap;
      const rule = figure.getAttribute("data-live-rule");
      const layer = "mw-dots-" + rule;
      return {
        view: figure.getAttribute("data-live-view"),
        dot: figure.getAttribute("data-live-dot"),
        rule,
        mounted: !!map.getLayer(layer),
        drawn: map.getLayer(layer) ? map.queryRenderedFeatures({ layers: [layer] }).length : 0,
        painted: map.getLayer(layer) ? map.getPaintProperty(layer, "circle-radius") : null,
      };
    });
    // THE PICTURE IS ASKED WHETHER IT HAS ANY DOTS ON IT. This is the defect the owner found on the
    // pattern, and on a dot map it is worse: `addLayer` THROWS on an unknown paint property, the
    // mount stops at the first dot layer, and the page renders a basemap and an outline with nothing
    // red anywhere — it was a `circle-sort-key` written into `paint` instead of `layout`. Counted on
    // the canvas rather than in the plan, because only the canvas knows.
    if (!seen.mounted || !seen.drawn)
      throw new Error(
        `the live map on renders/${id}.html has ${seen.drawn} of its dots drawn (layer mounted: ` +
          `${seen.mounted}). A dot map with no dots is a basemap, and the frozen fallback would ship ` +
          `as a picture of one.`,
      );
    await mkdir(dirname(outFile), { recursive: true });
    const png = `${outFile}.png`;
    const shot = await box.boundingBox();
    await box.screenshot({ path: png });
    const encode = spawnSync("cwebp", ["-quiet", "-q", "92", png, "-o", outFile], { stdio: "inherit" });
    if (encode.status !== 0) throw new Error(`cwebp exited with ${encode.status} baking ${id}'s fallback`);
    rmSync(png, { force: true });
    const fitted = Number(String(seen.view ?? "").split("@")[1]);
    // THE FLOOR MUST BE INERT AT THE PUBLISHED FRAMING, and this is where that is checked rather
    // than asserted: a plot SHORTER than the one the dot's ground size was derived from fits the
    // study at a lower zoom, draws the dot under the floor, and the field then over-states its own
    // density with nothing on the page to say so.
    if (shot.height < REVIEW_BOX.height - 1)
      throw new Error(
        `the plot is ${Math.round(shot.height)} px tall and the dot's ground size was derived from ` +
          `${REVIEW_BOX.height}. Below it the ground rule falls under the ${FLOOR_PX} px floor, the ` +
          `floor takes over, and the field claims a density it does not have.`,
      );
    console.log(
      `fallback ${id} → ${outFile.replace(`${HERE}/`, "")} · ${Math.round(shot.width)}x${Math.round(shot.height)} CSS px · ` +
        `règle ${seen.rule} · zoom ajusté ${fitted.toFixed(3)} (prédit ${fitZoomFor(shot).toFixed(3)}) · ` +
        `point ${seen.dot} px au sol, peint ${JSON.stringify(seen.painted)} · ` +
        `${count(seen.drawn)} points effectivement rendus dans le cadre`,
    );
    // THE DERIVATION IS CHECKED AGAINST THE BROWSER. The dot's ground size comes from a fit computed
    // in this file; if MapLibre fits something else, every dot on the page stands for a different
    // piece of ground than the page says it does.
    if (Math.abs(fitted - fitZoomFor(shot)) > 0.02)
      throw new Error(
        `the browser fitted this study set at zoom ${fitted.toFixed(3)} in a ` +
          `${Math.round(shot.width)}x${Math.round(shot.height)} box where this file predicts ` +
          `${fitZoomFor(shot).toFixed(3)}. The dot's ground size is derived from that prediction, so ` +
          `every dot would stand for a piece of ground the page does not claim.`,
      );
    return { width: Math.round(shot.width), height: Math.round(shot.height) };
  } finally {
    await browser.close();
    rmSync(dir, { recursive: true, force: true });
  }
}

const refused = [];
for (const file of DIRECTION_FILES) {
  const id = file.replace(/\.md$/, "");
  const base = readDirection(join(DIRECTIONS, file));
  const direction = resolveDirectionFamilies(base, textPerRegister);
  const tints = plateTints(base);
  const furniture = deriveFurniture(base.ground);
  // ONE DERIVATION OF THE TREATMENTS, READ BY BOTH HALVES. The component draws the legend from it and
  // this file builds the live map's paint expressions from the SAME arrays — a second derivation is
  // precisely the "half the beat wears one partition and half the one before it" defect.
  const { tones, activeTones } = dotTones({
    ground: base.ground,
    accent: base.accent,
    ink: furniture.ink,
    plateLand: tints.land,
  });
  const ground = countryGround({
    ground: base.ground,
    land: tints.land,
    water: tints.water,
    ink: furniture.ink,
  });
  // NO FRONTIER FROM THIS ONE: `mw-study` below already draws the level-0 outline, and it
  // carries a MEANING this neutral one does not — studied country against the rest. Two
  // lines on one geometry would be one line hidden under another.
  const countries = { ...ground, border: null };
  const live = {
    style: plateFacts.style,
    tints,
    // THE BEAT DRAWS THE COUNTRIES ITSELF (31539d1e, extended here). The owner's verdict on the
    // pages this replaces: « les cartes ne sont pas stylisées derrière ». Keeping MapTiler's own
    // frontier lines and re-inking them reads as a provider basemap with our tints on it; the
    // choropleth reads as OUR map because it draws its countries itself. Same mechanism here, and
    // the one difference is what a fill MEANS: there a class, here neutral ground — the land these
    // marks were ALREADY measured against, never a second one derived beside it.
    countries,
    studyBounds: ASKED,
    frame: FRAME,
    degreesPerPixel: plateFacts.degreesPerPixel,
    bakeZoom: plateFacts.zoom,
    studyCodes: COUNTRIES.map((c) => ISO2[c]),
    tones,
    activeTones,
    radius: { bakePx: DOT_BAKE_PX, floorPx: FLOOR_PX, groundMetres: DOT_GROUND_M },
    hitPx: 28,
    rules: RULES,
    defaultKey: DEFAULT_KEY,
    border: {
      studied: mix(base.ground, furniture.ink, 0.35),
      other: mix(tints.land, furniture.ink, 0.18),
      width: 0.8,
    },
    answers,
    locale: { title: "Carte", zoomIn: "Zoomer", zoomOut: "Dézoomer" },
    changeMs: CHANGE_MS,
  };

  // THE DRAWN BOX IS THE FALLBACK'S OWN BOX. The `<svg class="chart">` covers its stage with `slice`,
  // so a viewBox of some other ratio crops the image rather than the stage.
  const pageOf = (plate, box) =>
    renderWeb({
      // A MAP BEAT'S DRAWING KEEPS ITS SHARE OF THE WINDOW AND THE WORDS GIVE WAY — the share is
      // declared once, in the trunk, and refused there on the file this call writes.
      drawing: { share: MAP_DRAWING_SHARE },
      component: DirectedDotMapWeb,
      props: {
        plate,
        live,
        livePlan: liveDotDensityPlan(live),
        liveScript: liveDotDensityScript(live, {
          scope: ".chart-figure",
          styleModule: STYLE_MODULE,
          controlName: DOT_ID_PREFIX,
        }),
        liveHint,
        maplibreCss: MAPLIBRE_CSS,
        maplibreJs: MAPLIBRE_JS,
        kinds,
        rows,
        tableCaption: TABLE_CAPTION,
        columns: COLUMNS,
        controlLabel: CONTROL_LABEL,
        keyLabel: KEY_LABEL,
        aspect: box.width / box.height,
        size: box.width,
        title, eyebrow: EYEBROW, caveat, source, reading: readingLine, claimNote,
        alt,
        interaction,
        direction,
        ground: direction.ground,
        accent: direction.accent,
      },
      outDir: OUT,
      name: `${id}.html`,
    });

  try {
    const stamp = createHash("sha256")
      .update(JSON.stringify(liveDotDensityPlan(live)))
      .update(JSON.stringify(FALLBACK_WINDOW))
      .digest("hex")
      .slice(0, 16);
    const image = join(FALLBACK_DIR, `${id}.webp`);
    const stampFile = join(FALLBACK_DIR, `${id}.sha`);
    let record = null;
    if (existsSync(image) && existsSync(stampFile)) {
      try {
        const kept = JSON.parse(readFileSync(stampFile, "utf8"));
        if (kept.stamp === stamp) record = kept;
      } catch (err) {
        record = null;
      }
    }
    if (!record) {
      // A DRAFT FIRST, with nothing under the live map, because the thing being photographed is the
      // live map on THIS page rather than a second rendering of the same plan somewhere else.
      await pageOf(BLANK_PNG, REVIEW_BOX);
      const shot = await bakeFallback(join(OUT, `${id}.html`), image, id);
      await mkdir(FALLBACK_DIR, { recursive: true });
      record = { stamp, ...shot };
      await writeFile(stampFile, `${JSON.stringify(record)}\n`);
    }
    const plate = `data:image/webp;base64,${(await readFile(image)).toString("base64")}`;
    const { outPath } = await pageOf(plate, record);
    // THE KEYED COPY FOR REVIEW, beside the page and git-ignored. The owner: « non, comme pour les
    // scrolly il faut toujours une clé sinon ça sert à rien ». The COMMITTED page keeps the
    // placeholder, because this repository is public.
    if (KEY) {
      const html = await readFile(outPath, "utf8");
      if (!html.includes(PLACEHOLDER))
        throw new Error("the rendered page carries no delivery placeholder to substitute a key into");
      await writeFile(localPageOf(outPath), html.split(PLACEHOLDER).join(KEY));
    }
    // The page is read back from disk, not from the string the renderer happened to return — the file
    // a reader opens is the only artefact any of these refusals is about.
    const written = await readFile(join(OUT, `${id}.html`), "utf8");
    assertDotValueReachesTheLayers(written, live, plateFacts.style, plateFacts.zoom, {
      where: `renders/${id}.html`,
    });
    console.log(`${id} -> renders/${id}.html`);
  } catch (error) {
    refused.push({ id, why: error.message });
    console.log(`${id} REFUSED — ${error.message}`);
    // A refused direction must not leave its previous render on disk to be mistaken for this one.
    await rm(join(OUT, `${id}.html`), { force: true });
    await rm(localPageOf(join(OUT, `${id}.html`)), { force: true });
  }
}
if (refused.length) {
  console.log(`\nrefused by ${refused.length}: ${refused.map((x) => x.id).join(", ")}`);
  // A runner that swallows a refusal makes a refused page look like a produced one.
  process.exitCode = 1;
}
