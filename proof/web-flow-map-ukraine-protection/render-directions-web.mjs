// twin/proof/web-flow-map-ukraine-protection/render-directions-web.mjs
//
// Ukrainians under temporary protection in Europe, one band per destination, rendered once per FILED
// DIRECTION into a self-contained interactive page — on the pattern the owner validated on
// 2026-09-15 (`proof/web-choropleth-europe-lowcarbon`): every mark a MapLibre layer over MapTiler's
// own tiles, MapTiler's own zoom, pan, wheel, keyboard and hover, the map filling the figure's
// width, and a frozen image photographed from the SAME page beneath it.
//
// MINARD, REVERSED: one origin, many destinations, band WIDTH is the quantity, the width scale is
// drawn in the key in the unit of the measure in force, and a band too thin to see is COUNTED rather
// than drawn.
//
// AND THE READER HOLDS THE DENOMINATOR. A band is the only mark on any map type that spans two
// places, so it is the only one with a second place to divide by. The same 31 movements are drawn as
// people, as people per thousand inhabitants of the country receiving them, and as people per
// thousand square kilometres of its ground. Every width, every remainder, every rank and every
// sentence below is DERIVED from the frozen files here and baked into the page — the browser never
// divides and never formats a number.
//
// Usage:  bun proof/web-flow-map-ukraine-protection/render-directions-web.mjs

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
import { contrast, mix, readPalette } from "#shared/chart-beat/colour.mjs";
import { deriveFurniture } from "#shared/chart-beat/render-still.mjs";
import { beatFacts, applicableTreatments } from "#shared/chart-beat/treatments.mjs";
import { readDirection } from "#shared/design-base/read-direction.mjs";
import { composeDirections, report } from "#shared/design-base/compose.mjs";
import { resolveDirectionFamilies } from "#shared/design-base/resolve-families.mjs";
import { plainSpaces } from "#shared/design-base/web.mjs";
import { assertNotFallback, maptilerGlyphs } from "#shared/map-beat/glyphs.mjs";
import { basemapGeography } from "#shared/map-beat/tints.mjs";
import { renderWeb } from "../../skills/chart-web/scripts/render-web.mjs";
import {
  assertMeasuresReachTheLayers,
  assertOneMeasure,
  flowKeyForMarkup,
  flowWidthOf,
  liveFlowPlan,
  liveFlowScript,
} from "../../skills/map-web/assets/live-flow.ts";
import { CHANGE_MS, DirectedFlowMapWeb, MEASURE_ID_PREFIX, flowInks } from "./DirectedFlowMapWeb.tsx";
import { WINDOW, CAMERA_ASPECT as MEASURE_ASPECT } from "./camera.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const DIRECTIONS = join(HERE, "..", "..", "docs", "design-base", "directions");
const OUT = join(HERE, "renders");
const EYEBROW = "Migrations · Europe";
const ORIGIN = "UKR";
const SIZE = 900;
/** THE WIDEST BAND ON THE PAGE, and the floor under which a band is counted rather than drawn. Both
 *  are CSS pixels and both belong to the DRAWING rather than to the camera: they are held constant
 *  through every zoom, which is what makes a width a volume rather than a piece of ground. The floor
 *  is typed and argued, not derived — under about a pixel a stroke at this beat's ribbon opacity is
 *  a grey hair over the sea rather than a band, and 1,2 px is the number the still sibling settled on
 *  at the same drawing scale. It is the ONE number on this page a reader could reasonably argue with,
 *  which is why the remainder it produces is printed in people rather than hidden. */
const W_MAX = 30;
const MIN_W = 1.2;
/** HOW FAR A BAND BOWS OFF ITS OWN CHORD, as a fraction of that chord, in the map's own projected
 *  plane. One number for every band: the shape is then a pure function of the two ends and carries
 *  no datum at all, which is the whole argument for why a reader may not read a route into it. */
const BULGE = 0.12;
/** How many points each curve is sampled at before it is handed over as a `LineString`. A two-point
 *  line would be a straight segment in the projected plane, which is a rhumb line on the ground — a
 *  different claim, and not the one the caveat makes. */
const CURVE_SAMPLES = 48;
const NAMES = {
  DEU: "Allemagne", POL: "Pologne", CZE: "Tchéquie", ESP: "Espagne", ROU: "Roumanie",
  SVK: "Slovaquie", NLD: "Pays-Bas", IRL: "Irlande", BEL: "Belgique", AUT: "Autriche",
  NOR: "Norvège", BGR: "Bulgarie", CHE: "Suisse", FIN: "Finlande", PRT: "Portugal",
  FRA: "France", DNK: "Danemark", LTU: "Lituanie", HUN: "Hongrie", SWE: "Suède", GRC: "Grèce",
  ITA: "Italie", LVA: "Lettonie", EST: "Estonie", HRV: "Croatie", CYP: "Chypre", SVN: "Slovénie",
  ISL: "Islande", LUX: "Luxembourg", MLT: "Malte", LIE: "Liechtenstein", UKR: "Ukraine",
};

const plain = (s) => plainSpaces(s);
const fr = (v, d = 1) =>
  plain(v.toLocaleString("fr-FR", { minimumFractionDigits: d, maximumFractionDigits: d }));
const n0 = (v) => plain(Math.round(v).toLocaleString("fr-FR"));

const readCsv = async (name) => {
  const lines = (await readFile(join(HERE, name), "utf8")).trim().split(/\r?\n/);
  const header = lines[0].split(",");
  return lines.slice(1).map((l) => Object.fromEntries(l.split(",").map((v, i) => [header[i], v])));
};
const rows = await readCsv("data.csv");
const population = await readCsv("population.csv");
const inhabitants = Object.fromEntries(population.map((r) => [r.code, Number(r.population_2023)]));
const months = [...new Set(rows.map((r) => r.month))];
if (months.length !== 1) throw new Error(`the page draws one month and the file holds ${months.length}`);
const month = months[0];

const flows = rows
  .map((r) => ({ code: r.code, name: NAMES[r.code] ?? r.entity, people: Number(r.people) }))
  .filter((f) => Number.isFinite(f.people) && f.people > 0)
  .sort((a, b) => b.people - a.people);
for (const f of flows) if (!NAMES[f.code]) throw new Error(`${f.code} has no French name filed`);
for (const f of flows)
  if (!(inhabitants[f.code] > 0))
    throw new Error(`${NAMES[f.code]} has no 2023 population in the frozen file, so one of the three measures has no denominator for it`);

const total = flows.reduce((s, f) => s + f.people, 0);
const two = flows.slice(0, 2);
const twoShare = (two.reduce((s, f) => s + f.people, 0) / total) * 100;

// ── THE CLAIM, ASSERTED ───────────────────────────────────────────────────────────────────────
if (!(total > 4e6)) throw new Error(`the headline says over four million; the file totals ${n0(total)}`);
if (!(twoShare > 40 && twoShare < 60))
  throw new Error(`the headline says the two largest take about half; they take ${fr(twoShare)} %`);

// ── THE GEOGRAPHY, AND EVERY SEAT INSIDE ITS OWN COUNTRY ──────────────────────────────────────
//
// THIS FILE NO LONGER PROJECTS ANYTHING INTO PIXELS. Every mark is a MapLibre layer in degrees and
// MapTiler reprojects it, so a seat is a longitude and a latitude and a band is a `LineString`.
const geo = JSON.parse(await readFile(join(HERE, "shapes.geojson"), "utf8"));

const RAD = Math.PI / 180;
const EARTH_KM = 6371.0088;
/** WEB MERCATOR'S OWN PLANE, WITH BOTH AXES IN ONE UNIT — and the unit is the DEGREE, because x is
 *  a longitude and nothing may be mixed with it. `mercY` alone answers in radians, so a curve built
 *  with a longitude on one axis and a radian on the other has a perpendicular that is not
 *  perpendicular: measured here, the control point of the band to Germany landed at 2,1° N — the Gulf
 *  of Guinea — and every band dived at the equator. Found by driving the page and reading a band's
 *  own coordinates back, never by a test. */
const mercY = (lat) => Math.log(Math.tan(Math.PI / 4 + (lat * RAD) / 2));
const mercYdeg = (lat) => (mercY(lat) * 180) / Math.PI;
const unmercYdeg = (y) => (2 * Math.atan(Math.exp((y * Math.PI) / 180)) - Math.PI / 2) / RAD;
const ringArea = (ring) => {
  let sum = 0;
  for (let i = 0; i < ring.length; i += 1) {
    const [x1, y1] = ring[i];
    const [x2, y2] = ring[(i + 1) % ring.length];
    sum += x1 * y2 - x2 * y1;
  }
  return sum / 2;
};
const ringCentroid = (ring) => {
  let cx = 0;
  let cy = 0;
  let a = 0;
  for (let i = 0; i < ring.length; i += 1) {
    const [x1, y1] = ring[i];
    const [x2, y2] = ring[(i + 1) % ring.length];
    const f = x1 * y2 - x2 * y1;
    a += f;
    cx += (x1 + x2) * f;
    cy += (y1 + y2) * f;
  }
  a /= 2;
  return [cx / (6 * a), cy / (6 * a)];
};
const inRing = (p, ring) => {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > p[1] !== yj > p[1] && p[0] < ((xj - xi) * (p[1] - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
};
/** THE SEAT IS A POINT ON THE FEATURE, NOT A CENTROID — the failure `types/flow-map.md` names by
 *  hand ("a centroid can land outside an oddly shaped or concave territory, which is exactly the kind
 *  of thing nobody notices until the label is floating in the ocean"). The area centroid of the
 *  country's largest part is used when it falls inside that part; when it does not, the widest
 *  interior span of the horizontal line through it is, and its midpoint is taken. Asserted below for
 *  all thirty-two, so a shapefile change cannot quietly move a band's end into the sea. */
function pointOnFeature(ring) {
  const centre = ringCentroid(ring);
  if (inRing(centre, ring)) return centre;
  const y = centre[1];
  const crossings = [];
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > y !== yj > y) crossings.push(xi + ((xj - xi) * (y - yi)) / (yj - yi));
  }
  crossings.sort((a, b) => a - b);
  let best = null;
  for (let i = 0; i + 1 < crossings.length; i += 2) {
    const span = crossings[i + 1] - crossings[i];
    if (!best || span > best.span) best = { span, x: (crossings[i] + crossings[i + 1]) / 2 };
  }
  return best ? [best.x, y] : centre;
}
/** The spherical area of a ring, in km² — the denominator of the third measure, and it is measured
 *  on the beat's own frozen shapes rather than looked up, so the number and the drawing cannot
 *  disagree about which country this is. */
const sphericalArea = (ring) => {
  let sum = 0;
  for (let i = 0; i < ring.length; i += 1) {
    const [l1, p1] = ring[i];
    const [l2, p2] = ring[(i + 1) % ring.length];
    sum += (l2 - l1) * RAD * (2 + Math.sin(p1 * RAD) + Math.sin(p2 * RAD));
  }
  return Math.abs((sum * EARTH_KM * EARTH_KM) / 2);
};

const seats = {};
const areaKm2 = {};
const largestBox = {};
for (const feature of geo.features) {
  const code = feature.properties.iso ?? feature.properties.code;
  if (!code || !NAMES[code]) continue;
  const polys = feature.geometry.type === "Polygon" ? [feature.geometry.coordinates] : feature.geometry.coordinates;
  let best = null;
  let area = 0;
  for (const poly of polys) {
    const ring = poly[0];
    area += sphericalArea(ring);
    const size = Math.abs(ringArea(ring));
    if (!best || size > best.size) best = { size, ring };
  }
  if (!best) continue;
  seats[code] = pointOnFeature(best.ring);
  if (!inRing(seats[code], best.ring))
    throw new Error(
      `the seat computed for ${NAMES[code]} falls outside its own largest part. A band's end would sit ` +
        `in the sea next to the country it is about, which is the defect the type sheet names by hand.`,
    );
  areaKm2[code] = area;
  const xs = best.ring.map((p) => p[0]);
  const ys = best.ring.map((p) => p[1]);
  largestBox[code] = { west: Math.min(...xs), east: Math.max(...xs), south: Math.min(...ys), north: Math.max(...ys) };
}
const origin = seats[ORIGIN];
if (!origin) throw new Error(`${ORIGIN} has no seat — the fan has no source`);
for (const f of flows)
  if (!seats[f.code] || !(areaKm2[f.code] > 0))
    throw new Error(`${NAMES[f.code]} has no shape in this beat's frozen file, so its band has no end and its ground has no area`);

// ── THE FAN, AND THE CAMERA IT ASKS FOR ───────────────────────────────────────────────────────
//
// A band is a quadratic Bézier IN THE MAP'S OWN PROJECTED PLANE (x = longitude, y = Mercator
// northing in degrees — one unit on both axes, see `mercYdeg`), sampled and converted back to
// latitudes. The control point sits on the chord's perpendicular bisector at a FIXED fraction of the
// chord, so the curve is a pure function of the two ends: two flows of opposite volume between the
// same two places draw the identical shape. The shape carries no datum, so there is nothing in it a
// reader can mistake for a route — and being computed in the plane the map draws, it is the same
// curve at every zoom and stays welded to its two ends.
function bandBetween(from, to) {
  const a = [from[0], mercYdeg(from[1])];
  const b = [to[0], mercYdeg(to[1])];
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const length = Math.hypot(dx, dy) || 1;
  const control = [
    (a[0] + b[0]) / 2 + (-dy / length) * length * BULGE,
    (a[1] + b[1]) / 2 + (dx / length) * length * BULGE,
  ];
  const points = [];
  for (let i = 0; i <= CURVE_SAMPLES; i += 1) {
    const t = i / CURVE_SAMPLES;
    const u = 1 - t;
    const x = u * u * a[0] + 2 * u * t * control[0] + t * t * b[0];
    const y = u * u * a[1] + 2 * u * t * control[1] + t * t * b[1];
    points.push([Number(x.toFixed(5)), Number(unmercYdeg(y).toFixed(5))]);
  }
  return points;
}
const bandLines = Object.fromEntries(flows.map((f) => [f.code, bandBetween(origin, seats[f.code])]));

/**
 * THE BOX THE CAMERA IS ASKED TO HOLD IS THE FAN, AND THAT IS THIS TYPE'S OWN ASSERTION.
 *
 * The choropleth's camera holds every country's largest PART whole, and it must: its subject is a
 * set of shapes a frame can slice, so a sliced country under a title that counts countries is a
 * picture disagreeing with its own sentence. A FLOW MAP'S SUBJECT IS THE BANDS. The country is
 * furniture — the mark is the movement, its two ends and the curve between them — so what the frame
 * owes the reader is every point of every band, and nothing more.
 *
 * MEASURED, because the difference is not small. Holding the countries whole reaches Nordkapp at
 * 71,09° N, which no band comes within six degrees of; at the delivered box that cost 207° of drawn
 * longitude for a fan that spans 52°. Holding the FAN costs 153°. The ocean the wider window buys is
 * ocean with nothing in it.
 *
 * THE ORIGIN STILL GETS ITS AIR, and it gets it from the overshoot rather than from a typed margin:
 * a near-square window in a 3:1 box overshoots longitude by a factor of three, so the node at
 * 31,25° E sits a long way inside the east edge. That was the reason the first window reached 48° E,
 * and it is no longer a reason.
 */
const fanPoints = Object.values(bandLines).flat();
const STUDY = {
  west: Math.min(...fanPoints.map((p) => p[0])),
  east: Math.max(...fanPoints.map((p) => p[0])),
  south: Math.min(...fanPoints.map((p) => p[1])),
  north: Math.max(...fanPoints.map((p) => p[1])),
};

// ── THE THREE MEASURES, ALL DERIVED FROM THE FROZEN FILES ─────────────────────────────────────
//
// Nothing below is typed. The three denominators are: none, the destination's own 2023 population,
// and the destination's own land area measured on this beat's own shapes.
const MEASURES = [
  { key: "personnes", label: "Personnes", unit: "personnes", of: (f) => f.people, digits: 0 },
  { key: "habitants", label: "Pour 1 000 habitants", unit: "pour 1 000 habitants", of: (f) => (f.people / inhabitants[f.code]) * 1000, digits: 1 },
  { key: "surface", label: "Pour 1 000 km²", unit: "pour 1 000 km²", of: (f) => (f.people / areaKm2[f.code]) * 1000, digits: 0 },
];
const valuesOf = (f) => MEASURES.map((m) => m.of(f));
const READINGS = flows.map((f) => ({ code: f.code, values: valuesOf(f) }));
const TOPS = MEASURES.map((_, i) => Math.max(...READINGS.map((r) => r.values[i])));
const widthOf = (code, at) =>
  flowWidthOf(READINGS.find((r) => r.code === code).values[at], TOPS[at], W_MAX);
/** The ranking under each measure — the reading that inverts, and the one the table renumbers in
 *  place without moving a row. */
const RANKS = MEASURES.map((_, i) => {
  const order = [...READINGS].sort((a, b) => b.values[i] - a.values[i]).map((r) => r.code);
  return Object.fromEntries(order.map((code, at) => [code, at + 1]));
});
const leaderOf = (i) => [...READINGS].sort((a, b) => b.values[i] - a.values[i])[0].code;
const LEADERS = MEASURES.map((_, i) => leaderOf(i));
/** THE WHOLE GESTURE RESTS ON THE LEAD CHANGING HANDS. If two denominators crowned the same
 *  destination, the reader would work the control and watch the argument stay where it was. */
if (new Set(LEADERS).size !== MEASURES.length)
  throw new Error(
    `the three measures crown ${LEADERS.map((c) => NAMES[c]).join(", ")} — the page's whole reason to be ` +
      `interactive is that the lead changes hands with the denominator. If that stops being true on new ` +
      `data, the title and the three sentences stop being true with it.`,
  );

const fmtValue = (i, value) => (MEASURES[i].digits === 0 ? n0(value) : fr(value, MEASURES[i].digits));
const remainderOf = (i) => {
  const under = READINGS.filter((r) => widthOf(r.code, i) < MIN_W).map((r) => r.code);
  const people = under.reduce((s, code) => s + flows.find((f) => f.code === code).people, 0);
  return { count: under.length, people, share: (people / total) * 100, codes: under };
};
const REMAINDERS = MEASURES.map((_, i) => remainderOf(i));
for (const [i, remainder] of REMAINDERS.entries())
  if (remainder.count === flows.length)
    throw new Error(`under ${MEASURES[i].key} not one band clears the ${MIN_W} px floor`);

const measureDeclaration = {
  label: "Largeur de bande : ce qui divise",
  defaultKey: "personnes",
  maxWidth: W_MAX,
  minWidth: MIN_W,
  measures: MEASURES.map((measure, i) => {
    const podium = [...READINGS].sort((a, b) => b.values[i] - a.values[i]).slice(0, 3);
    const remainder = REMAINDERS[i];
    return {
      key: measure.key,
      label: measure.label,
      announce: `${measure.label} — la largeur d'une bande est le nombre de personnes ${i === 0 ? "sans diviseur" : `divisé par ${measure.unit.replace("pour 1 000 ", "")} du pays d'accueil`}`,
      // THE OPENING MEASURE OWES NO SENTENCE: the untouched fan IS the claim, not a comparison, and
      // its own remainder is printed at rest under the plot. The other two owe the reading their
      // picture makes and the plate cannot — who took the lead, and how many destinations the new
      // denominator buried.
      note:
        i === 0
          ? null
          : `${measure.label} : ${NAMES[podium[0].code]} passe en tête (${fmtValue(i, podium[0].values[i])}), ` +
            `devant ${NAMES[podium[1].code]} et ${NAMES[podium[2].code]} ; ${NAMES[LEADERS[0]]}, la plus large en ` +
            `nombre, tombe ${RANKS[i][LEADERS[0]]}e. ${remainder.count} destinations passent sous le plancher ` +
            `(${n0(remainder.people)} personnes, ${fr(remainder.share)} %).`,
      keyLabels: [1, 0.5, 0.25].map((share) => `${fmtValue(i, TOPS[i] * share)} ${measure.unit}`),
      widthByCode: Object.fromEntries(READINGS.map((r) => [r.code, flowWidthOf(r.values[i], TOPS[i], W_MAX)])),
    };
  }),
};
const KEY_RUNGS = flowKeyForMarkup(measureDeclaration).map((variants, rung) => ({
  width: [W_MAX, W_MAX / 2, W_MAX / 4][rung],
  variants,
}));

// ── THE CAMERA IS THE PLATE'S, AND THE PLATE IS THE SHAPE THE PAGE DELIVERS ───────────────────
//
// The equal-area camera in `camera.ts` is still this beat's own and this file still prints it: it is
// what MEASURES. It no longer PLACES anything. What places every mark is MapTiler — the live map
// reprojects the bands itself, and the window the frozen image was photographed at is the same one,
// so the two layers are one camera rather than two pictures that agree today.
const PLATE_FRAME = [1600, 1216];
const PLATE_SIZE = PLATE_FRAME.join("x");
const plateDir = (id) => join(HERE, "plate", id);
function ensurePlate(id, water, land) {
  const dir = plateDir(id);
  // THE CACHE IS KEYED ON THE FRAME AND ON THE WINDOW, and the window is checked in BOTH directions.
  // A cached plate is the one way a camera change ships without being drawn — measured one beat over
  // while mutating a declared window, where the runner stayed green because nothing re-baked and the
  // page kept the camera of a file that no longer said so. Checking only that the cached window still
  // HOLDS the study has the same hole facing the other way, and this beat walked into it: the window
  // was tightened from the countries to the fan, the old and wider window still held the fan, nothing
  // re-baked, and the run reported the camera it had just stopped using. So the cached window must be
  // the study's own box to within the air the bake types around it — no smaller, and no larger.
  const AIR_DEG = 2;
  if (existsSync(join(dir, "geometry.json")) && existsSync(join(dir, "plate.png"))) {
    const cached = JSON.parse(readFileSync(join(dir, "geometry.json"), "utf8"));
    const b = cached.bounds ?? [[0, 0], [0, 0]];
    const snug =
      b[0][0] <= STUDY.west && b[0][0] >= STUDY.west - AIR_DEG &&
      b[1][0] >= STUDY.east && b[1][0] <= STUDY.east + AIR_DEG &&
      b[0][1] <= STUDY.south && b[0][1] >= STUDY.south - AIR_DEG &&
      b[1][1] >= STUDY.north && b[1][1] <= STUDY.north + AIR_DEG;
    if (cached.frame?.width === PLATE_FRAME[0] && cached.frame?.height === PLATE_FRAME[1] && snug) return;
    console.log(
      `the ${id} plate was baked at ${cached.frame?.width}x${cached.frame?.height} on ` +
        `${JSON.stringify(cached.bounds)}, which is not this fan's own box ` +
        `${JSON.stringify(STUDY)} to within ${AIR_DEG}° — re-baking…`,
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
        `disagree about where a degree is would put the same band in three places, and nothing else ` +
        `here would notice`,
    );
}
const FRAME = plateFacts.frame;
const CORNERS = plateFacts.frameCorners;
if (!CORNERS || !(FRAME?.width > 0))
  throw new Error("this plate predates the camera facts: re-bake it with bake.mjs");
const CAMERA_ASPECT = FRAME.width / FRAME.height;

/** THE WINDOW THE CAMERA WAS ASKED TO HOLD, which is what this is measured against — never the frame
 *  it ended up with. `fitBounds` widens the frame on whichever axis does not bind, so a declared
 *  window too SMALL for the study set is forgiven by its own overshoot. */
const ASKED = {
  west: plateFacts.bounds[0][0],
  south: plateFacts.bounds[0][1],
  east: plateFacts.bounds[1][0],
  north: plateFacts.bounds[1][1],
};
/** EVERY POINT OF EVERY BAND INSIDE THE DECLARED WINDOW — measured on the curves themselves and not
 *  on their two ends, because a band BOWS: a window that holds both seats can still cut the middle of
 *  the arc, and a ribbon that leaves the plate and comes back is a route the data does not have. */
const cut = flows.filter((f) =>
  bandLines[f.code].some(
    ([lon, lat]) => lon < ASKED.west || lon > ASKED.east || lat < ASKED.south || lat > ASKED.north,
  ),
);
if (cut.length)
  throw new Error(
    `the camera's declared window cuts ${cut.length} of the ${flows.length} bands this fan draws: ` +
      `${cut.map((f) => f.name).join(", ")}, against a declared window of ${JSON.stringify(ASKED)} and a fan ` +
      `that spans ${JSON.stringify(STUDY)}. A band whose end is off the plate cannot be named, and one whose ` +
      `middle leaves the frame and comes back is a route the data does not have.`,
  );

// ── WHAT WEB MERCATOR COSTS THIS SUBJECT, MEASURED HERE RATHER THAN ASSERTED ──────────────────
//
// On a choropleth the inflation falls on AREA. On a fan it falls on the LENGTH OF THE ARMS: a flat
// Mercator map draws a northern band longer per real kilometre than a southern one, so a reader
// reads the northern destinations as further away than they are. Measured on this beat's own seats:
// the drawn chord in the projected plane, against the great-circle distance on the sphere.
const drawnChord = (a, b) => Math.hypot(b[0] - a[0], mercYdeg(b[1]) - mercYdeg(a[1]));
const greatCircle = (a, b) => {
  const [lon1, lat1] = a;
  const [lon2, lat2] = b;
  const p1 = lat1 * RAD;
  const p2 = lat2 * RAD;
  return EARTH_KM * Math.acos(Math.min(1, Math.sin(p1) * Math.sin(p2) + Math.cos(p1) * Math.cos(p2) * Math.cos((lon2 - lon1) * RAD)));
};
const stretch = flows
  .map((f) => ({ code: f.code, ratio: drawnChord(origin, seats[f.code]) / greatCircle(origin, seats[f.code]) }))
  .sort((a, b) => b.ratio - a.ratio);
const STRETCH_MAX = stretch[0];
const STRETCH_MIN = stretch[stretch.length - 1];
const STRETCH_SPREAD = STRETCH_MAX.ratio / STRETCH_MIN.ratio;
if (!(STRETCH_SPREAD > 1.05))
  throw new Error(
    `the caveat tells the reader Web Mercator stretches the northern arms of this fan, and on these seats ` +
      `the widest spread measures ${STRETCH_SPREAD.toFixed(3)}x — the sentence would be false`,
  );

/** THE Z-ORDER IS PART OF THE ANSWER TO THE HAIRBALL. Features are drawn in the order the source
 *  carries them, so the widest go first and the thinnest last — a thin band is then always on top
 *  where it crosses a wide one, and always the one a pointer reaches. Sorted on a band's WIDEST width
 *  under any measure, not under the opening one, so the order holds in all three states rather than
 *  in the one the page happens to open in. */
const bandFeatures = [...flows]
  .sort((a, b) => {
    const wa = Math.max(...MEASURES.map((_, i) => widthOf(a.code, i)));
    const wb = Math.max(...MEASURES.map((_, i) => widthOf(b.code, i)));
    return wb - wa;
  })
  .map((f) => ({
    type: "Feature",
    properties: { code: f.code },
    geometry: { type: "LineString", coordinates: bandLines[f.code] },
  }));

/** THE TWO CLOSEST DESTINATIONS THE FAN REACHES, which is what the reader's zoom CEILING is derived
 *  from. On a choropleth the ceiling is where the smallest country becomes pointable; on a fan every
 *  band converges on ONE node, so what a reader zooms in to separate is not a country's width but two
 *  ends that sit on top of each other at the published framing. Measured off the seats rather than
 *  named, so a change to the study set moves the ceiling with it. */
const CLOSEST = (() => {
  let best = null;
  for (let i = 0; i < flows.length; i += 1)
    for (let j = i + 1; j < flows.length; j += 1) {
      const degrees = drawnChord(seats[flows[i].code], seats[flows[j].code]);
      if (!best || degrees < best.degrees) best = { a: flows[i].code, b: flows[j].code, degrees };
    }
  return best;
})();

console.log(
  `${flows.length} destinations · ${n0(total)} personnes en ${month} · ${two.map((f) => `${f.name} ${n0(f.people)}`).join(" et ")} ` +
    `= ${fr(twoShare)} %`,
);
for (const [i, measure] of MEASURES.entries())
  console.log(
    `mesure ${measure.key.padEnd(10)} en tête ${NAMES[LEADERS[i]].padEnd(12)} ${fmtValue(i, TOPS[i]).padStart(10)} ` +
      `${measure.unit.padEnd(23)} · ${flows.length - REMAINDERS[i].count} bandes dessinées, ` +
      `${REMAINDERS[i].count} comptées (${n0(REMAINDERS[i].people)} personnes, ${fr(REMAINDERS[i].share)} %)`,
  );
console.log("");
console.log(
  `caméra qui DESSINE : plaque MapTiler ${FRAME.width}x${FRAME.height} · ` +
    `${CORNERS.west.toFixed(2)}..${CORNERS.east.toFixed(2)}E ` +
    `${CORNERS.south.toFixed(2)}..${CORNERS.north.toFixed(2)}N · aspect ${CAMERA_ASPECT.toFixed(2)}:1 · zoom ${plateFacts.zoom}`,
);
console.log(
  `caméra qui MESURE (inchangée) : LAEA 52N 10E, fenêtre ${WINDOW.west}..${WINDOW.east}E ` +
    `${WINDOW.south}..${WINDOW.north}N · aspect ${MEASURE_ASPECT.toFixed(2)}:1`,
);
console.log(
  `ce que le cadre montre : ${(CORNERS.east - CORNERS.west).toFixed(0)}° de longitude pour un jeu d'étude ` +
    `large de ${(STUDY.east - STUDY.west).toFixed(0)}° ` +
    `(${((CORNERS.east - CORNERS.west) / (STUDY.east - STUDY.west)).toFixed(2)}x)`,
);
console.log(
  `ce que Mercator coûte à un ÉVENTAIL (la longueur des bras, pas une surface) : par kilomètre réel, ` +
    `contre ${NAMES[STRETCH_MIN.code]} = 1 — ` +
    `${stretch.slice(0, 5).map((s) => `${NAMES[s.code]} x${(s.ratio / STRETCH_MIN.ratio).toFixed(2)}`).join(" · ")} ` +
    `· écart maximal ${STRETCH_SPREAD.toFixed(2)}x`,
);
console.log(
  `plafond de zoom dérivé des deux destinations les plus proches : ${NAMES[CLOSEST.a]} et ${NAMES[CLOSEST.b]}, ` +
    `${CLOSEST.degrees.toFixed(3)}° dans le plan dessiné\n`,
);

const facts = beatFacts(
  flows.map((f) => ({ key: f.code, label: f.name, value: f.people })),
  { subject: flows[0].name, declaredSequence: "personnes" },
);
const offered = applicableTreatments(facts);
console.log(`treatments applicable: ${offered.map((t) => t.id).join(", ") || "(none)"}\n`);

// ── THE WORDS ─────────────────────────────────────────────────────────────────────────────────
//
// THE HEADLINE IS THE CLAIM AND THE GESTURE IN ONE LINE. Both halves are derived and both are true
// with nothing touched: four and a half million people, and three different destinations at the head
// of the same thirty-one movements depending on what the width is divided by.
const title =
  `${fr(total / 1e6)} millions d'Ukrainiens protégés en Europe — en tête l'${NAMES[LEADERS[0]]}, ` +
  `ou la ${NAMES[LEADERS[1]]}, ou ${NAMES[LEADERS[2]]}`;
const caveat =
  `Une bande par pays d'accueil, sa LARGEUR proportionnelle à la mesure choisie. La courbe est ` +
  `schématique et n'est pas un itinéraire : ce qui est exact, c'est la largeur, les deux extrémités et ` +
  `la direction du départ. Carte MapTiler plate, en Web Mercator — sur un éventail le nord allonge les ` +
  `bras : la bande vers ${NAMES[STRETCH_MAX.code]} est dessinée ${fr(STRETCH_SPREAD, 2)} fois plus longue ` +
  `par kilomètre réel que celle vers ${NAMES[STRETCH_MIN.code]}.`;
// THE CLAIM AND MINARD'S FOURTH RULE IN ONE PARAGRAPH. The remainder belongs at rest rather than
// behind the control, because the opening fan IS the claim and the bands it does not draw are part of
// it — but it is one sentence and not one paragraph, because every line of chrome here comes straight
// off the height of the map.
const claimNote =
  `${flows.slice(0, 4).map((f) => `${f.name} ${n0(f.people)}`).join(", ")}. Par habitant c'est la ` +
  `${NAMES[LEADERS[1]]}, au kilomètre carré c'est ${NAMES[LEADERS[2]]}. ${REMAINDERS[0].count} ` +
  `destinations sur ${flows.length} sont trop fines pour être dessinées ici : comptées sans être ` +
  `dessinées, ${n0(REMAINDERS[0].people)} personnes, ${fr(REMAINDERS[0].share)} % du total.`;
const readingLine =
  `Lecture : une largeur est une quantité divisée par quelque chose. Changez le diviseur — les ` +
  `${flows.length} bandes se redessinent sans qu'aucune extrémité ne bouge, et le tableau suit la même ` +
  `mesure avec ou sans JavaScript.`;
const liveHint =
  `Carte vivante : molette ou boutons pour zoomer, glisser pour déplacer, flèches du clavier au focus ; ` +
  `survolez une bande pour ses trois rangs.`;
const source =
  `Source : Eurostat, migr_asytpsm, ${month} · population 2023, via Our World in Data · surfaces ` +
  `calculées sur les formes gelées du beat · fond MapTiler (dataviz), teinté par la direction`;
const countedLabel = "comptée, trop fine pour être dessinée";
const TABLE_CAPTION = `Les ${flows.length} destinations, et ce que la mesure choisie leur donne`;
const COLUMNS = ["Destination", "Personnes", "Pour 1 000 hab.", "Pour 1 000 km²", "Rang", "Largeur"];

// EVERY DESTINATION, in the order the page opens in — by people, the reading the claim is about. The
// `detail` is what a POINTER answers, and it carries only what the table does NOT print: the three
// ranks at once, and the two denominators themselves.
const tableRows = flows.map((f) => {
  const values = valuesOf(f);
  return {
    code: f.code,
    name: f.name,
    cells: MEASURES.map((_, i) => fmtValue(i, values[i])),
    ranks: MEASURES.map((_, i) => `${RANKS[i][f.code]}e`),
    detail:
      `${f.name} · ${n0(f.people)} personnes sous protection en ${month} · ${fr((f.people / total) * 100)} % du ` +
      `total · ${RANKS[0][f.code]}e en nombre, ${RANKS[1][f.code]}e pour 1 000 habitants, ` +
      `${RANKS[2][f.code]}e pour 1 000 km² · ${n0(inhabitants[f.code])} habitants, ${n0(areaKm2[f.code])} km²`,
  };
});

const interaction = {
  earns:
    "A still and a video can both SAY that a band's width is people rather than people per inhabitant; " +
    "neither can let the reader change the denominator and watch the lead pass from Germany to Czechia " +
    "to Malta while the two ends of every band stay exactly where they are — and watch the set of " +
    "destinations too thin to draw go from thirteen to two to seven.",
  controls: [
    {
      question: "L'Allemagne est la plus large. Large de quoi — de monde, ou de place ?",
      gesture: "toggle-a-comparison",
      changes:
        "Les 31 bandes traversent jusqu'à la largeur que la mesure choisie leur donne, sans qu'aucune " +
        "extrémité ne bouge d'un pixel ; les trois échelons de la légende se réécrivent dans l'unité de " +
        "la mesure, le tableau renumérote ses rangs sur place, et une phrase dit qui passe en tête et " +
        "combien de destinations tombent sous le plancher de lisibilité.",
    },
    {
      question: "Cette bande-là, elle vaut combien exactement, et où est-elle dans les trois classements ?",
      gesture: "ask-a-mark",
      changes:
        "La bande pointée se redessine dans sa propre encre à pleine force, AU-DESSUS des vingt qu'elle " +
        "croise, et répond avec la destination, le nombre, sa part du total, ses trois rangs, la " +
        "population et la surface qui la divisent.",
    },
    {
      question: "Et les trente-et-une, sans la carte — ou sans JavaScript ?",
      gesture: "open-the-full-table",
      changes:
        "Les 31 lignes s'ouvrent sous la carte, dans l'ordre des personnes, chacune avec ses trois " +
        "mesures. Son échantillon de largeur et son rang suivent la mesure choisie en CSS pur : c'est " +
        "là que le geste survit quand la carte, elle, ne peut pas — une couche MapLibre n'est " +
        "atteignable par aucune feuille de style, donc la moitié carte du geste est du script et la " +
        "moitié tableau n'en est pas.",
    },
  ],
};

const textPerRegister = {
  display: title,
  eyebrow: EYEBROW,
  body: `${caveat} ${readingLine} ${source} ${liveHint}`,
  axis: `${KEY_RUNGS.flatMap((r) => r.variants.map((v) => v.text)).join(" ")} ${countedLabel} ` +
    `${measureDeclaration.label} ${measureDeclaration.measures.map((m) => `${m.label} ${m.announce}`).join(" ")} ` +
    `${TABLE_CAPTION} ${COLUMNS.join(" ")} ${tableRows.flatMap((r) => [...r.cells, ...r.ranks]).join(" ")}`,
  annot: `${claimNote} ${measureDeclaration.measures.map((m) => m.note ?? "").join(" ")}`,
  value: tableRows.map((r) => r.cells[0]).join(" "),
};
for (const key of Object.keys(textPerRegister)) textPerRegister[key] = plain(textPerRegister[key]);

const filed = readdirSync(DIRECTIONS).filter((f) => f.endsWith(".md")).map((f) => readDirection(join(DIRECTIONS, f)));
const newsroom = readPalette(HERE, { stopAt: join(HERE, "..") });
const BEAT_FACTS = { evidenceLevels: 3 };
console.log(report(composeDirections({ newsroom, filed, beat: BEAT_FACTS, textPerRegister }), { beat: BEAT_FACTS }));
console.log("");

// ── WHAT THE SECOND LAYER IS MADE OF, READ ONCE ──────────────────────────────────────────────
const requireFrom = createRequire(import.meta.url);
const MAPLIBRE_JS = await readFile(requireFrom.resolve("maplibre-gl/dist/maplibre-gl.js"), "utf8");
const MAPLIBRE_CSS = await readFile(requireFrom.resolve("maplibre-gl/dist/maplibre-gl.css"), "utf8");
const STYLE_MODULE = (
  await readFile(join(HERE, "..", "..", "skills", "map-web", "assets", "style.mjs"), "utf8")
).replace(/^export /gm, "");

// ── THE FROZEN FALLBACK, BAKED FROM THE PAGE ITSELF ───────────────────────────────────────────
//
// The second layer of the validated pattern, and the owner found it missing the first time a live
// beat shipped: the committed page drew the BASEMAP and no data. The plate `bake.mjs` makes is
// MapTiler's geography and nothing else — the fan is MapLibre layers now — so a plate baked before
// them pictures a map with the study rubbed out. What stands there when a key lapses has to be the
// same picture the live map draws, so the runner renders a draft, substitutes the key into a copy
// that lives OUTSIDE the repository, opens it, waits for the live map to announce itself,
// photographs the map's own box, and renders again with that image. There is no second plan and no
// second mount to disagree with the first — it is the page.
const FALLBACK_DIR = join(HERE, "fallback");
/** The reference window, not a box: the fallback is photographed at the window the beat is reviewed
 *  at, so the image is the delivered box's own shape and `slice` crops nothing there. At 2x, so it is
 *  not soft on the screen the owner reviews on. */
const FALLBACK_WINDOW = { width: 1512, height: 860, scale: 2 };
/** The draft's plot box — the BASIS the format's `aspect-ratio` gives `.chart-plot` before the flex
 *  column settles. It is a starting shape and not a law (the plot is the one shrinkable item under
 *  the figure's `max-height: 100dvh`), and it is DELIBERATELY TALLER than the review window can
 *  hold: the plot is then bound by the window rather than by this number, which is what makes the map
 *  take every pixel the chrome leaves and the document land exactly on 860. The second render uses
 *  the height that RESULTED, so the delivered page and the photograph under it are one box. */
const DRAFT_BOX = { width: 1464, height: 560 };
const BLANK_PNG =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";
const KEY = process.env.MAPTILER_KEY ?? process.env.REMOTION_MAPTILER_KEY ?? process.env.VITE_MAPTILER_KEY ?? "";
const PLACEHOLDER = `__MAPTILER${"_KEY__"}`;
const localPageOf = (pagePath) => pagePath.replace(/\.html$/, ".local.html");

/**
 * THE FACE THE BASEMAP'S OWN NAMES ARE DRAWN IN, and it is not a CSS stack.
 *
 * MapLibre does not draw with a system font: it reads signed distance fields served by the style,
 * and MapTiler answers 200 WITH NOTO SANS for every family it does not have — `shared/map-beat/
 * glyphs.mjs` measured `Futura Medium`, `Avenir Next`, `Georgia` and `Zzz Fictive Regular` all
 * returning the same 83 352-byte file. So a map that asks for the wrong name is set in a typeface
 * nobody chose and nothing reports it.
 *
 * The register is `axis`, because a country's name on the ground is FURNITURE — the same register
 * this beat's key rungs and its table headings are set in — and never the register a mark's own
 * answer is set in. The design base's ladders head that register with Open Sans and Montserrat,
 * both of which MapTiler serves, so the name on the map and the word beside it are one design: one
 * served as glyphs, one embedded as a file. The face suffix is required (a bare family is the
 * fallback again), and the bytes are PROBED against Noto's own whenever a key is present.
 */
const FACE_FOR_WEIGHT = (weight) => (Number(weight) >= 600 ? "Bold" : "Regular");
const probed = new Map();
async function labelFontFor(direction) {
  const spec = direction.registers.axis;
  const stack = [`${spec.family} ${FACE_FOR_WEIGHT(spec.weight)}`, `${spec.family} Regular`];
  if (!KEY) return stack;
  for (const face of stack) {
    if (probed.has(face)) continue;
    const fallback = probed.get("__noto") ?? (await maptilerGlyphs("Noto Sans Regular", "0-255", KEY));
    probed.set("__noto", fallback);
    assertNotFallback(await maptilerGlyphs(face, "0-255", KEY), fallback, face);
    probed.set(face, true);
    console.log(`glyphes MapTiler : « ${face} » servie, et ce ne sont pas les octets de Noto Sans`);
  }
  return stack;
}

/**
 * PHOTOGRAPH THE PAGE'S OWN LIVE MAP, and write it where the page will embed it.
 *
 * The key is substituted into a copy under the system temp directory, never beside the page and
 * never inside the repository — `no-key-in-the-repository` scans the working tree. The copy is
 * removed whether the bake succeeds or not, and the bake REFUSES rather than writing something: an
 * image baked from a map that never loaded is a picture of the failure it exists to replace, and it
 * would ship looking like a success.
 */
async function bakeFallback(pagePath, outFile, id) {
  if (!KEY)
    throw new Error(
      "the frozen fallback is photographed from this page's own live map, so the bake needs a MapTiler " +
        "key in the environment (MAPTILER_KEY). Without one the page would ship with the basemap and no " +
        "fan on it, which is the defect this bake exists to close.",
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
    await page.goto(`file://${keyed}`, { waitUntil: "networkidle0", timeout: 120000 });
    await page.waitForFunction(() => document.documentElement.classList.contains("mw-live"), { timeout: 120000 });
    await page.evaluate(
      () =>
        new Promise((resolve) => {
          const map = window.__mwMap;
          if (map.loaded() && map.areTilesLoaded()) return resolve();
          map.once("idle", resolve);
        }),
    );
    await new Promise((r) => setTimeout(r, 600));
    const box = await page.$(".map-layer");
    if (!box) throw new Error("the page carries no live map box to photograph");
    await mkdir(dirname(outFile), { recursive: true });
    const png = `${outFile}.png`;
    const shot = await box.boundingBox();
    await box.screenshot({ path: png });
    const encode = spawnSync("cwebp", ["-quiet", "-q", "92", png, "-o", outFile], { stdio: "inherit" });
    if (encode.status !== 0) throw new Error(`cwebp exited with ${encode.status} baking ${id}'s fallback`);
    rmSync(png, { force: true });
    console.log(
      `fallback ${id} → ${outFile.replace(`${HERE}/`, "")} · ${Math.round(shot.width)}x${Math.round(shot.height)} CSS px`,
    );
    return { width: Math.round(shot.width), height: Math.round(shot.height) };
  } finally {
    await browser.close();
    rmSync(dir, { recursive: true, force: true });
  }
}

const refused = [];
for (const file of readdirSync(DIRECTIONS).filter((f) => f.endsWith(".md"))) {
  const id = file.replace(/\.md$/, "");
  const base = readDirection(join(DIRECTIONS, file));
  const direction = resolveDirectionFamilies(base, textPerRegister);
  const tints = plateTints(base);
  const furniture = deriveFurniture(base.ground);
  const RIBBON_OPACITY = 0.55;
  // ONE DERIVATION OF THE INKS, READ BY BOTH HALVES. The component paints the table's samples from
  // it and this file builds the live map's line paint from the SAME call — a second derivation is
  // precisely the "half the beat re-widens and the other half keeps the measure before it" defect,
  // now able to happen across two mechanisms instead of inside one.
  const inks = flowInks({
    ground: base.ground,
    accent: base.accent,
    ink: furniture.ink,
    water: tints.water,
    land: tints.land,
    opacity: RIBBON_OPACITY,
  });
  /** THE GROUND CARRIES THE COUNTRIES, BECAUSE THE BANDS DO NOT.
   *
   *  The owner's verdict on the page this replaces: « la carte derrière ne donne aucune notion des
   *  pays et peu détaillé ». The choropleth sibling never had this problem — its own marks fill all
   *  forty countries, so the marks ARE the geography and a swept basemap loses nothing. A fan of 31
   *  bands carries no country at all, and the same sweep left a pale blob a reader could not place
   *  a single destination on. So the frontiers, the country names and the seas come back — re-inked
   *  in this direction's own palette by `basemapGeography`, never in MapTiler's.
   *
   *  AND THEY STAY QUIETER THAN THE FAN. Every colour is measured against the LAND and the WATER
   *  the basemap actually paints — not against the page ground behind them, which is the mistake
   *  this repository has already paid for twice — and the frontier is capped under `BORDER_MAX`,
   *  which the line printed below holds against the ribbon's own contrast on the same land. */
  const geography = basemapGeography({
    ground: base.ground,
    land: tints.land,
    water: tints.water,
    ink: furniture.ink,
    font: await labelFontFor(direction),
  });
  const ribbonOnLand = contrast(inks.active, tints.land);
  console.log(
    `${id} · fond : frontière ${geography.measured.borderOnLand.toFixed(2)}:1 sur la terre, ` +
      `noms de pays ${geography.measured.countryOnLand.toFixed(2)}:1 sur la terre / ` +
      `${geography.measured.countryOnWater.toFixed(2)}:1 sur la mer / ` +
      `${geography.measured.countryOnHalo.toFixed(2)}:1 sur leur halo — la bande, elle, lit ` +
      `${ribbonOnLand.toFixed(2)}:1 sur la même terre`,
  );

  const live = {
    style: plateFacts.style,
    tints,
    basemap: geography,
    // THE LIVE CAMERA FITS THE BEAT'S OWN DECLARED WINDOW, which is the box the plate was baked by
    // fitting — so the frozen image and the live map are ONE camera rather than two that agree today.
    studyBounds: { west: ASKED.west, south: ASKED.south, east: ASKED.east, north: ASKED.north },
    frame: FRAME,
    degreesPerPixel: plateFacts.degreesPerPixel,
    bands: { type: "FeatureCollection", features: bandFeatures },
    origin: {
      lon: origin[0],
      lat: origin[1],
      // A PIN, NOT A MEASUREMENT (`radius: "fixed"` in `live-map.mjs`'s vocabulary): the same screen
      // size at every zoom, because it encodes nothing. Every band leaves from here.
      radius: 6,
      fill: inks.node,
      edge: inks.nodeEdge,
    },
    ribbon: { colour: inks.ribbon, opacity: RIBBON_OPACITY, active: inks.active },
    measures: measureDeclaration,
    details: Object.fromEntries(tableRows.map((r) => [r.code, r.detail])),
    locale: { title: "Carte", zoomIn: "Zoomer", zoomOut: "Dézoomer" },
    changeMs: CHANGE_MS,
    closest: CLOSEST,
  };

  const pageOf = (plate, box) =>
    renderWeb({
      component: DirectedFlowMapWeb,
      props: {
        plate,
        plateWater: tints.water,
        plateLand: tints.land,
        ribbonOpacity: RIBBON_OPACITY,
        rows: tableRows,
        measures: measureDeclaration,
        keyRungs: KEY_RUNGS,
        countedLabel,
        livePlan: liveFlowPlan(live),
        liveScript: liveFlowScript(live, {
          scope: ".chart-figure",
          styleModule: STYLE_MODULE,
          measureName: MEASURE_ID_PREFIX,
        }),
        liveHint,
        maplibreCss: MAPLIBRE_CSS,
        maplibreJs: MAPLIBRE_JS,
        tableCaption: TABLE_CAPTION,
        columns: COLUMNS,
        aspect: box.width / box.height,
        size: box.width,
        title, eyebrow: EYEBROW, caveat, source, reading: readingLine, claimNote,
        alt:
          `Une carte d'Europe d'où partent ${flows.length - REMAINDERS[0].count} bandes, toutes issues d'un ` +
          `même point en ${NAMES[ORIGIN]}. La plus large va vers l'${flows[0].name} ` +
          `(${n0(flows[0].people)} personnes), la deuxième vers la ${flows[1].name} ` +
          `(${n0(flows[1].people)}) ; ensemble elles font ${fr(twoShare)} % du total. Les autres ` +
          `s'amincissent rapidement vers l'ouest et le sud. Une commande à trois positions redivise les ` +
          `mêmes mouvements par la population puis par la surface du pays d'accueil, et la bande la plus ` +
          `large devient celle de la ${NAMES[LEADERS[1]]} puis celle de ${NAMES[LEADERS[2]]} ; la carte ` +
          `elle-même se zoome et se déplace avec les contrôles de MapTiler.`,
        interaction,
        direction,
        ground: direction.ground,
        accent: direction.accent,
      },
      outDir: OUT,
      name: `${id}.html`,
    });

  try {
    // THE STAMP CARRIES THE WORDS TOO, and that is a defect this beat paid for rather than foresaw.
    // The photograph is of the map's own BOX, and the box is what the chrome leaves: the figure is a
    // flex column and `.chart-plot` is its one shrinkable item, so a sentence that loses a line hands
    // the map twenty pixels. Stamped on the plan alone, a trim of four sentences re-rendered three
    // pages that kept the cached image — and therefore the cached BOX — with nothing red anywhere.
    // Same class as the plate cache keyed on its frame, one layer up.
    const stamp = createHash("sha256")
      .update(JSON.stringify(liveFlowPlan(live)))
      .update(JSON.stringify(FALLBACK_WINDOW))
      .update(JSON.stringify(DRAFT_BOX))
      .update(JSON.stringify([title, caveat, claimNote, readingLine, liveHint, source, EYEBROW, TABLE_CAPTION, COLUMNS, countedLabel, KEY_RUNGS, measureDeclaration]))
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
      await pageOf(BLANK_PNG, DRAFT_BOX);
      const shot = await bakeFallback(join(OUT, `${id}.html`), image, id);
      await mkdir(FALLBACK_DIR, { recursive: true });
      record = { stamp, ...shot };
      await writeFile(stampFile, `${JSON.stringify(record)}\n`);
    }
    const plate = `data:image/webp;base64,${(await readFile(image)).toString("base64")}`;
    const { outPath } = await pageOf(plate, record);
    // THE KEYED COPY FOR REVIEW, beside the page and git-ignored. The COMMITTED page keeps the
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
    assertOneMeasure(written, measureDeclaration, MEASURE_ID_PREFIX, flows.map((f) => f.code), {
      where: `renders/${id}.html`,
    });
    // THE SAME QUESTION, ASKED OF THE OTHER HALF. `assertOneMeasure` holds the MARKUP against the
    // declaration; this holds the LIVE PLAN against a SECOND derivation of the widths, rebuilt from
    // the raw numbers. Neither can see the other's mechanism, and the crossing between them is
    // exactly where this architecture can put one denominator on the map and another in the table.
    assertMeasuresReachTheLayers(written, live, READINGS, plateFacts.style, { where: `renders/${id}.html` });
    console.log(`${id} -> renders/${id}.html`);
  } catch (error) {
    refused.push({ id, why: error.message });
    console.log(`${id} REFUSED — ${error.message}`);
    // A refused direction must not leave its previous render on disk to be mistaken for this one.
    await rm(join(OUT, `${id}.html`), { force: true });
  }
}
if (refused.length) {
  console.log(`\nrefused by ${refused.length}: ${refused.map((x) => x.id).join(", ")}`);
  // A runner that swallows a refusal makes a refused page look like a produced one, and leaves the
  // previous render on disk to be mistaken for this one.
  process.exitCode = 1;
}
