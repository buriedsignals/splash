// proof/web-flow-map-danube/render-directions-web.mjs
//
// Le Danube et ses neuf territoires, rendered once per FILED DIRECTION into a self-contained
// interactive page — on the pattern the owner validated on 2026-09-15
// (`proof/web-choropleth-europe-lowcarbon`): every mark a MapLibre layer over MapTiler's own tiles,
// MapTiler's own zoom, pan, wheel, keyboard and hover, the map filling the figure's width, and a
// frozen image photographed from the SAME page beneath it.
//
// MINARD, ON A ROUTE INSTEAD OF A FAN. The band WIDTH is the quantity, the width scale is drawn in
// the key in the unit of the measure in force, and a stretch too thin to see is COUNTED rather than
// drawn. What is NOT Minard's is the shape: the geometry here is the river itself, 911 frozen
// Natural Earth points, so every bend is real and what is schematic is the width. The fan's caveat
// says the opposite of this one, on purpose.
//
// AND THE READER HOLDS WHAT A KILOMETRE COUNTS AS. A river measures one country on each bank, so a
// kilometre of Danube has three honest senses: the stretch a country has to itself, the stretch it
// shares with the country opposite, and how much river it has for its own size. The lead changes
// hands on all three — Allemagne, Roumanie, Serbie. Every width, every remainder, every rank and
// every sentence below is DERIVED from the two frozen files here and baked into the page; the
// browser never divides and never formats a number.
//
// Usage:  bun proof/web-flow-map-danube/render-directions-web.mjs

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
import { composeDirection, composeDirections, report } from "#shared/design-base/compose.mjs";
import { resolveDirectionFamilies } from "#shared/design-base/resolve-families.mjs";
import { plainSpaces } from "#shared/design-base/web.mjs";
import { countryGround, plateGrounds, plateTints } from "#shared/map-beat/tints.mjs";
import { MAP_DRAWING_SHARE, renderWeb } from "../../skills/chart-web/scripts/render-web.mjs";
import {
  assertMeasuresReachTheLayers,
  assertOneMeasure,
  flowKeyForMarkup,
  flowWidthOf,
  liveFlowPlan,
  liveFlowScript,
} from "../../skills/map-web/assets/live-flow.ts";
import { CHANGE_MS, DirectedDanubeWeb, MEASURE_ID_PREFIX, danubeInks } from "./DirectedDanubeWeb.tsx";
import { WINDOW, CAMERA_ASPECT as MEASURE_ASPECT } from "./camera.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const DIRECTIONS = join(HERE, "..", "..", "docs", "design-base", "directions");
const OUT = join(HERE, "renders");
const SIZE = 900;
// THE EYEBROW, one short strand: subject · place.
const EYEBROW = "Fleuves · Europe danubienne";

/** THE WIDEST STRETCH ON THE PAGE, and the floor under which a stretch is counted rather than drawn.
 *  Both are CSS pixels and both belong to the DRAWING rather than to the camera: they are held
 *  constant through every zoom, which is what makes a width a quantity rather than a piece of ground.
 *  20 px rather than the fan's 30: this river doubles back on itself where the Danube is a border, so
 *  two stretches are drawn over one course, and two 30 px bands stacked on a 660 px-tall frame would
 *  read as one 60 px smear. The floor is typed and argued, not derived — under about a pixel a line
 *  at this beat's weight is a hair on a basemap rather than a band, and 1,2 px is the number the fan
 *  sibling settled on at the same drawing scale. */
const W_MAX = 20;
const MIN_W = 1.2;
/** THE ONE NUMBER ON THIS PAGE THAT IS TYPED RATHER THAN DERIVED, and the reason it has to be.
 *  A route point is "on a shared border" when another Danube country's own boundary passes within
 *  this many kilometres of it. The shapes are Natural Earth 1:50m, whose boundary is generalised to
 *  roughly a kilometre of positional slack, and the route is 1:10m — two files at two scales, so a
 *  point genuinely on the Serbian-Romanian border sits a few hundred metres off the drawn line
 *  either way. Measured at 1, 2 and 3 km: at 1 km the Bulgarian share of its own Danube reads 79 %,
 *  at 2 km 83 %, at 3 km 85 %, and Moldova — which the still sibling measured at ZERO route points —
 *  starts collecting points at 3. 2 km is the plateau, and it is where the file's own noise stops
 *  deciding the answer. */
const BORDER_SLACK_KM = 2;

const plain = (s) => plainSpaces(s);
const fr = (v, d = 1) =>
  plain(v.toLocaleString("fr-FR", { minimumFractionDigits: d, maximumFractionDigits: d }));
const n0 = (v) => plain(Math.round(v).toLocaleString("fr-FR"));

// ── THE DATA, READ FROM THIS BEAT'S OWN FROZEN FILES ──────────────────────────────────────────
const RAD = Math.PI / 180;
const EARTH_KM = 6371.0088;
/** WEB MERCATOR'S OWN PLANE, WITH BOTH AXES IN ONE UNIT — and the unit is the DEGREE, because x is a
 *  longitude and nothing may be mixed with it. `mercY` alone answers in radians. */
const mercYdeg = (lat) => (Math.log(Math.tan(Math.PI / 4 + (lat * RAD) / 2)) * 180) / Math.PI;
const greatCircle = (a, b) => {
  const p1 = a[1] * RAD;
  const p2 = b[1] * RAD;
  return (
    EARTH_KM *
    Math.acos(Math.min(1, Math.sin(p1) * Math.sin(p2) + Math.cos(p1) * Math.cos(p2) * Math.cos((b[0] - a[0]) * RAD)))
  );
};

const route = (await readFile(join(HERE, "danube-route.csv"), "utf8"))
  .trim()
  .split(/\r?\n/)
  .slice(1)
  .map((line) => {
    const [seq, lon, lat] = line.split(",");
    return { seq: Number(seq), lonLat: [Number(lon), Number(lat)] };
  });
for (const [i, point] of route.entries())
  if (point.seq !== i)
    throw new Error(
      `the frozen route skips a sample at index ${i} (seq ${point.seq}). A route beat that silently ` +
        `drops a point draws a straight line through a bend, and every kilometre below is a sum over ` +
        `consecutive pairs.`,
    );
const COURSE = route.map((p) => p.lonLat);
const COURSE_KM = COURSE.slice(1).reduce((s, p, i) => s + greatCircle(COURSE[i], p), 0);

const geo = JSON.parse(await readFile(join(HERE, "shapes.geojson"), "utf8"));
const NAMES = Object.fromEntries(geo.features.map((f) => [f.properties.ADM0_A3, f.properties.NAME_FR ?? f.properties.NAME]));
const SHAPES = Object.fromEntries(geo.features.map((f) => [f.properties.ADM0_A3, f.geometry]));

const polysOf = (geometry) => (geometry.type === "MultiPolygon" ? geometry.coordinates : [geometry.coordinates]);
const inRing = (p, ring) => {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > p[1] !== yj > p[1] && p[0] < ((xj - xi) * (p[1] - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
};
/** Inside the shape means inside an outer ring and outside every hole of that same part — flattened,
 *  a MultiPolygon's second island reads as a hole cut out of the first. */
const insideShape = (p, geometry) =>
  polysOf(geometry).some((poly) => inRing(p, poly[0]) && !poly.slice(1).some((hole) => inRing(p, hole)));
/** Distance from a point to a shape's own boundary, in km, on the local tangent plane — enough for a
 *  two-kilometre question at 46° N and never used for a printed length. */
const segmentKm = (p, a, b) => {
  const k = Math.cos(p[1] * RAD);
  const px = p[0] * k;
  const ax = a[0] * k;
  const bx = b[0] * k;
  const dx = bx - ax;
  const dy = b[1] - a[1];
  const L = dx * dx + dy * dy;
  let t = L ? ((px - ax) * dx + (p[1] - a[1]) * dy) / L : 0;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (ax + t * dx), p[1] - (a[1] + t * dy)) * 111.32;
};
const boundaryKm = (p, geometry) => {
  let best = Infinity;
  for (const poly of polysOf(geometry))
    for (const ring of poly)
      for (let i = 0; i + 1 < ring.length; i += 1) {
        const d = segmentKm(p, ring[i], ring[i + 1]);
        if (d < best) best = d;
      }
  return best;
};
/** The spherical area of a shape, in km² — the denominator of the third measure, measured on this
 *  beat's OWN frozen shapes rather than looked up, so the number and the drawing cannot disagree
 *  about which country this is. */
const ringArea = (ring) => {
  let sum = 0;
  for (let i = 0; i < ring.length; i += 1) {
    const [l1, p1] = ring[i];
    const [l2, p2] = ring[(i + 1) % ring.length];
    sum += (l2 - l1) * RAD * (2 + Math.sin(p1 * RAD) + Math.sin(p2 * RAD));
  }
  return Math.abs((sum * EARTH_KM * EARTH_KM) / 2);
};
const areaOf = (geometry) => polysOf(geometry).reduce((s, poly) => s + ringArea(poly[0]), 0);

/** EVERY TERRITORY THE FROZEN FILE HOLDS IS A CANDIDATE, and the route decides which of them are in
 *  the study set. Nothing here is a list somebody typed: Moldova is in the shapes file precisely so
 *  that its absence from the map is a measured zero and not a shape nobody looked for. */
const CANDIDATES = Object.keys(SHAPES);
const ownerAt = COURSE.map((p) => CANDIDATES.find((code) => insideShape(p, SHAPES[code])) ?? null);
const orphan = ownerAt.filter((o) => !o).length;
if (orphan)
  throw new Error(
    `${orphan} of the ${COURSE.length} route points fall inside no territory in the frozen shapes. The ` +
      `course would run off the geography it is being classified against, and every kilometre below ` +
      `would be a sum over an incomplete partition.`,
  );

/** THE STUDY SET, IN THE RIVER'S OWN ORDER — first entry along the course, which is the one ranking
 *  the geography itself supplies and the one the still sibling numbers 1 to 9 on its plate. */
const CODES = [];
for (const code of ownerAt) if (!CODES.includes(code)) CODES.push(code);
const ORDER = Object.fromEntries(CODES.map((code, at) => [code, at + 1]));
/** THE TERRITORIES THE FROZEN SHAPES HOLD AND THE ROUTE NEVER ENTERS. Named on the page rather than
 *  quietly absent: the still sibling's own caveat rests on Moldova being a real shape with a real
 *  zero, and a beat that dropped it from the file could claim the same sentence without it. */
const ABSENT = CANDIDATES.filter(
  (code) => !CODES.includes(code) && Math.min(...COURSE.map((p) => boundaryKm(p, SHAPES[code]))) < 1,
).sort();

/** WHERE THE DANUBE IS A BORDER. A point is shared when another Danube territory's own boundary runs
 *  within `BORDER_SLACK_KM` of it — the two files are drawn at two scales, so the drawn boundary and
 *  the drawn course do not land on the same pixel even where the river IS the line. */
const sharedAt = COURSE.map((p, i) =>
  CODES.some((code) => code !== ownerAt[i] && boundaryKm(p, SHAPES[code]) < BORDER_SLACK_KM),
);

const km = Object.fromEntries(CODES.map((c) => [c, 0]));
const kmShared = Object.fromEntries(CODES.map((c) => [c, 0]));
const kmOwn = Object.fromEntries(CODES.map((c) => [c, 0]));
for (let i = 0; i + 1 < COURSE.length; i += 1) {
  const code = ownerAt[i] ?? ownerAt[i + 1];
  const d = greatCircle(COURSE[i], COURSE[i + 1]);
  km[code] += d;
  if (sharedAt[i]) kmShared[code] += d;
  else kmOwn[code] += d;
}
const areaKm2 = Object.fromEntries(CODES.map((c) => [c, areaOf(SHAPES[c])]));

// ── THE NINE DRAWN STRETCHES ──────────────────────────────────────────────────────────────────
//
// A TERRITORY'S STRETCH IS THE SLICE OF THE COURSE BETWEEN ITS FIRST AND ITS LAST POINT INSIDE IT,
// and that is a decision, not a mechanism. Classified point by point, a border territory's stretch
// is not one piece: along the Serbian-Romanian Danube the containment test flips between the two
// banks twenty times in sixty kilometres, which is an artefact of where a generalised boundary
// happens to cross a generalised river, not a fact about the river. Drawn as twenty fragments it
// would read as a dashed line; drawn as one slice it reads as what it is — a country that is on this
// river continuously from the moment it first reaches it until the moment it leaves.
//
// THE CONSEQUENCE IS THE PICTURE'S OWN ARGUMENT: where the Danube is a frontier, TWO stretches are
// drawn over one course, and the reader sees the doubling before reading a word about it. Under
// « en propre » both are thin there; under « en frontière » both are fat.
const stretchOf = (code) => {
  const inside = COURSE.map((_, i) => (ownerAt[i] === code ? i : -1)).filter((i) => i >= 0);
  const slice = COURSE.slice(inside[0], inside[inside.length - 1] + 1);
  if (slice.length < 3)
    throw new Error(
      `${NAMES[code]} is drawn from ${slice.length} route points. A two-point line is a straight segment ` +
        `in the projected plane, which is a rhumb line on the ground and not this river; a stretch is ` +
        `sampled or it is not a stretch.`,
    );
  return slice;
};
const stretches = Object.fromEntries(CODES.map((code) => [code, stretchOf(code)]));

// ── THE THREE MEASURES, ALL DERIVED FROM THE FROZEN FILES ─────────────────────────────────────
const MEASURES = [
  {
    key: "propre",
    label: "Km en propre",
    unit: "km en propre",
    of: (code) => kmOwn[code],
    digits: 0,
  },
  {
    key: "frontiere",
    label: "Km-frontière",
    unit: "km de Danube-frontière",
    of: (code) => kmShared[code],
    digits: 0,
  },
  {
    key: "densite",
    label: "Km pour 1 000 km²",
    unit: "km de Danube pour 1 000 km² de territoire",
    of: (code) => (km[code] / areaKm2[code]) * 1000,
    digits: 2,
  },
];
const valuesOf = (code) => MEASURES.map((m) => m.of(code));
const READINGS = CODES.map((code) => ({ code, values: valuesOf(code) }));
const TOPS = MEASURES.map((_, i) => Math.max(...READINGS.map((r) => r.values[i])));
const widthOf = (code, at) => flowWidthOf(READINGS.find((r) => r.code === code).values[at], TOPS[at], W_MAX);
/** The ranking under each measure — the reading that inverts, and the one the table renumbers in
 *  place without moving a row. */
const RANKS = MEASURES.map((_, i) => {
  const order = [...READINGS].sort((a, b) => b.values[i] - a.values[i]).map((r) => r.code);
  return Object.fromEntries(order.map((code, at) => [code, at + 1]));
});
const LEADERS = MEASURES.map((_, i) => [...READINGS].sort((a, b) => b.values[i] - a.values[i])[0].code);
/** THE WHOLE GESTURE RESTS ON THE LEAD CHANGING HANDS. If two senses of a kilometre crowned the same
 *  territory, the reader would work the control and watch the argument stay where it was. */
if (new Set(LEADERS).size !== MEASURES.length)
  throw new Error(
    `the three measures crown ${LEADERS.map((c) => NAMES[c]).join(", ")} — the page's whole reason to be ` +
      `interactive is that the lead changes hands with the sense of the kilometre. If that stops being ` +
      `true on new shapes, the title and the two sentences stop being true with it.`,
  );

const fmtValue = (i, value) => (MEASURES[i].digits === 0 ? n0(value) : fr(value, MEASURES[i].digits));
const remainderOf = (i) => {
  const under = READINGS.filter((r) => widthOf(r.code, i) < MIN_W).map((r) => r.code);
  const kilometres = under.reduce((s, code) => s + MEASURES[i].of(code), 0);
  return { count: under.length, kilometres, codes: under };
};
const REMAINDERS = MEASURES.map((_, i) => remainderOf(i));
for (const [i, remainder] of REMAINDERS.entries())
  if (remainder.count === CODES.length)
    throw new Error(`under ${MEASURES[i].key} not one stretch clears the ${MIN_W} px floor`);
/** MINARD'S FOURTH RULE IS ONLY A RULE IF THE SET MOVES. If the same territories fell under the floor
 *  under all three, the remainder sentence would be a constant and the type sheet's "which bands fall
 *  under the floor is a function of the denominator and is not a stable set" would be untrue here. */
if (new Set(REMAINDERS.map((r) => r.codes.join(","))).size < 2)
  throw new Error(
    `the same stretches — ${REMAINDERS[0].codes.map((c) => NAMES[c]).join(", ") || "none"} — fall under the ` +
      `${MIN_W} px floor under every measure, so the page counts the same silence three times and says so ` +
      `three times.`,
  );

const measureDeclaration = {
  label: "Largeur : ce qu'un kilomètre de Danube compte comme",
  defaultKey: "propre",
  maxWidth: W_MAX,
  minWidth: MIN_W,
  measures: MEASURES.map((measure, i) => {
    const podium = [...READINGS].sort((a, b) => b.values[i] - a.values[i]).slice(0, 3);
    const remainder = REMAINDERS[i];
    const counted = remainder.count
      ? ` Sous le plancher, comptés sans être dessinés : ${remainder.codes.map((c) => NAMES[c]).join(", ")}.`
      : "";
    return {
      key: measure.key,
      label: measure.label,
      announce: `${measure.label} — la largeur d'un tronçon est ${measure.unit}`,
      // THE OPENING MEASURE OWES NO SENTENCE: the untouched course IS the claim, not a comparison,
      // and its own remainder is printed at rest under the plot. The other two owe the reading their
      // picture makes and the plate cannot — who takes the lead, and which stretches the new sense of
      // the kilometre buried.
      note:
        i === 0
          ? null
          : `${NAMES[podium[0].code]} passe en tête (${fmtValue(i, podium[0].values[i])} ${measure.unit}), devant ` +
            `${NAMES[podium[1].code]} et ${NAMES[podium[2].code]} ; ${NAMES[LEADERS[0]]}, la plus large au repos, ` +
            `tombe ${RANKS[i][LEADERS[0]]}e.${counted}`,
      keyLabels: [1, 0.5, 0.25].map((share) => `${fmtValue(i, TOPS[i] * share)} ${measure.unit}`),
      widthByCode: Object.fromEntries(READINGS.map((r) => [r.code, flowWidthOf(r.values[i], TOPS[i], W_MAX)])),
    };
  }),
};
const KEY_RUNGS = flowKeyForMarkup(measureDeclaration).map((variants, rung) => ({
  width: [W_MAX, W_MAX / 2, W_MAX / 4][rung],
  variants,
}));

/** THE Z-ORDER IS PART OF THE ANSWER TO THE DOUBLED COURSE. Features are drawn in the order the
 *  source carries them, so the widest go first and the thinnest last — a thin stretch is then always
 *  on top where it lies over a wide one, and always the one a pointer reaches. Sorted on a stretch's
 *  WIDEST width under any measure, not under the opening one, so the order holds in all three states
 *  rather than in the one the page happens to open in. */
const bandFeatures = [...CODES]
  .sort((a, b) => {
    const wa = Math.max(...MEASURES.map((_, i) => widthOf(a, i)));
    const wb = Math.max(...MEASURES.map((_, i) => widthOf(b, i)));
    return wb - wa;
  })
  .map((code) => ({
    type: "Feature",
    properties: { code },
    geometry: { type: "LineString", coordinates: stretches[code].map(([lon, lat]) => [Number(lon.toFixed(5)), Number(lat.toFixed(5))]) },
  }));

/** THE SOURCE. A pin, not a measurement (`radius: "fixed"` in `live-map.mjs`'s vocabulary): the same
 *  screen size at every zoom, because it encodes nothing. It is where the course the whole page is
 *  about begins, and it is the one point on this map that is not part of any stretch's width. */
const SPRING = COURSE[0];

/** THE BOX THE CAMERA IS ASKED TO HOLD IS THE COURSE, and that is this beat's own assertion — see
 *  `camera.ts` and `bake.mjs`. A flow map's subject is its bands; here the bands are the river, so
 *  what the frame owes the reader is every point of it and nothing more. */
const STUDY = {
  west: Math.min(...COURSE.map((p) => p[0])),
  east: Math.max(...COURSE.map((p) => p[0])),
  south: Math.min(...COURSE.map((p) => p[1])),
  north: Math.max(...COURSE.map((p) => p[1])),
};

// ── THE PLATE, ONE PER FILED DIRECTION ────────────────────────────────────────────────────────
//
// 1600 x 660 is the declared window's own Mercator aspect to within a percent, so neither axis
// overshoots into continent with no river on it.
const PLATE_FRAME = [1600, 660];
const PLATE_SIZE = PLATE_FRAME.join("x");
const plateDir = (id) => join(HERE, "plate", id);
function ensurePlate(id, water, land) {
  const dir = plateDir(id);
  // THE CACHE IS KEYED ON THE FRAME AND ON THE WINDOW, and the window is checked in BOTH directions.
  // A cached plate is the one way a camera change ships without being drawn: measured one beat over
  // while mutating a declared window, where the runner stayed green because nothing re-baked and the
  // page kept the camera of a file that no longer said so. Checking only that the cached window still
  // HOLDS the course has the same hole facing the other way, so the cached window must be the
  // course's own box to within the air the bake types around it — no smaller, and no larger.
  const AIR_DEG = 3;
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
        `${JSON.stringify(cached.bounds)}, which is not this course's own box ` +
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

/** THE TWO TINTS A BASEMAP IS ALLOWED, TAKEN FROM THE TRUNK RATHER THAN DERIVED AGAIN HERE.
 *
 *  What this beat used to do: `water: mix(d.ground, d.accent, 0.16)` — the sea tinted with the very
 *  accent the RIVER is drawn in. That is why this page shipped a blue Danube on blue water, and why
 *  it was structural rather than unlucky: a mark cannot be picked out of a ground that follows it,
 *  whatever accent is chosen. `shared/map-beat/tints.mjs` paints water in the filed WATER
 *  CONVENTION instead, searches the smallest dose that still separates sea from land, and hands
 *  back the pigment it used — which is what `composeDirection` holds this beat's mark apart from.
 */

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
        `disagree about where a degree is would put the same stretch in three places, and nothing else ` +
        `here would notice`,
    );
}
const FRAME = plateFacts.frame;
const CORNERS = plateFacts.frameCorners;
if (!CORNERS || !(FRAME?.width > 0))
  throw new Error("this plate predates the camera facts: re-bake it with bake.mjs");
const CAMERA_ASPECT = FRAME.width / FRAME.height;
const width = SIZE;
const height = Math.round((SIZE * FRAME.height) / FRAME.width);

/** THE WINDOW THE CAMERA WAS ASKED TO HOLD, which is what this is measured against — never the frame
 *  it ended up with. `fitBounds` widens the frame on whichever axis does not bind, so a declared
 *  window too SMALL for the study set is forgiven by its own overshoot. */
const ASKED = {
  west: plateFacts.bounds[0][0],
  south: plateFacts.bounds[0][1],
  east: plateFacts.bounds[1][0],
  north: plateFacts.bounds[1][1],
};
/** EVERY POINT OF EVERY DRAWN STRETCH INSIDE THE DECLARED WINDOW — measured on the course itself and
 *  not on its two ends, because a river BENDS: a window that holds the spring and the delta can still
 *  cut the Iron Gates out of the middle, and a river that leaves the plate and comes back is a
 *  waterway the data does not have. */
const cut = CODES.filter((code) =>
  stretches[code].some(([lon, lat]) => lon < ASKED.west || lon > ASKED.east || lat < ASKED.south || lat > ASKED.north),
);
if (cut.length)
  throw new Error(
    `the camera's declared window cuts ${cut.length} of the ${CODES.length} stretches this map draws: ` +
      `${cut.map((c) => NAMES[c]).join(", ")}, against a declared window of ${JSON.stringify(ASKED)} and a ` +
      `course that spans ${JSON.stringify(STUDY)}. A stretch whose end is off the plate cannot be named, ` +
      `and one whose middle leaves the frame and comes back is a river the data does not have.`,
  );
if (ASKED.west > WINDOW.west || ASKED.east < WINDOW.east || ASKED.south > WINDOW.south || ASKED.north < WINDOW.north)
  throw new Error(
    `the plate was baked on ${JSON.stringify(ASKED)} and camera.ts publishes ${JSON.stringify(WINDOW)}. Two ` +
      `files stating two windows is how a page prints one camera and draws another.`,
  );

// ── WHAT WEB MERCATOR COSTS THIS SUBJECT, MEASURED HERE RATHER THAN ASSERTED ──────────────────
//
// On a choropleth the inflation falls on AREA. On a fan it falls on the LENGTH OF THE ARMS. On a
// RIVER it falls on the length of the course, and unevenly ALONG it: drawn ground scale runs as
// 1/cos(latitude), so a kilometre of the upstream Danube at 48° N takes more page than a kilometre of
// the downstream Danube at 44° N. That matters more here than on most types, because the opening
// measure is a length and the drawn length is the first thing a reader reads off a route map.
const drawnLength = (points) =>
  points.slice(1).reduce((s, p, i) => s + Math.hypot(p[0] - points[i][0], mercYdeg(p[1]) - mercYdeg(points[i][1])), 0);
const realLength = (points) => points.slice(1).reduce((s, p, i) => s + greatCircle(points[i], p), 0);
const stretch = CODES.map((code) => ({
  code,
  ratio: drawnLength(stretches[code]) / realLength(stretches[code]),
})).sort((a, b) => b.ratio - a.ratio);
const STRETCH_MAX = stretch[0];
const STRETCH_MIN = stretch[stretch.length - 1];
const STRETCH_SPREAD = STRETCH_MAX.ratio / STRETCH_MIN.ratio;
if (!(STRETCH_SPREAD > 1.05))
  throw new Error(
    `the caveat tells the reader Web Mercator draws the upstream Danube longer per real kilometre than the ` +
      `downstream Danube, and on this course the spread measures ${STRETCH_SPREAD.toFixed(3)}x — the ` +
      `sentence would be false`,
  );

/** THE SHORTEST STRETCH THE MAP DRAWS, which is what the reader's zoom CEILING is derived from. On a
 *  choropleth the ceiling is where the smallest country becomes pointable; on a fan it is the two
 *  nearest ends. On a river it is the shortest piece of course a reader has to be able to separate
 *  from the two it lies between — measured in the plane the map draws, so a change to the shapes
 *  moves the ceiling with it. */
const SHORTEST = CODES.map((code) => ({ code, degrees: drawnLength(stretches[code]) })).sort((a, b) => a.degrees - b.degrees)[0];
const NEIGHBOUR = CODES[Math.max(0, ORDER[SHORTEST.code] - 2)] === SHORTEST.code ? CODES[ORDER[SHORTEST.code]] : CODES[ORDER[SHORTEST.code] - 2];
const CLOSEST = { a: SHORTEST.code, b: NEIGHBOUR, degrees: SHORTEST.degrees };

console.log(
  `${CODES.length} territoires · ${n0(COURSE_KM)} km de cours gelé · ordre du fleuve : ` +
    CODES.map((c, i) => `${i + 1} ${NAMES[c]}`).join(", "),
);
console.log(`jamais atteint par le cours : ${ABSENT.map((c) => NAMES[c]).join(", ") || "(aucun)"}`);
for (const [i, measure] of MEASURES.entries())
  console.log(
    `mesure ${measure.key.padEnd(10)} en tête ${NAMES[LEADERS[i]].padEnd(11)} ${fmtValue(i, TOPS[i]).padStart(8)} ` +
      `${measure.unit.padEnd(40)} · ${CODES.length - REMAINDERS[i].count} dessinés, ` +
      `${REMAINDERS[i].count} comptés (${REMAINDERS[i].codes.map((c) => NAMES[c]).join(", ") || "—"})`,
  );
console.log("");
console.log(
  `caméra qui DESSINE : plaque MapTiler ${FRAME.width}x${FRAME.height} · ` +
    `${CORNERS.west.toFixed(2)}..${CORNERS.east.toFixed(2)}E ` +
    `${CORNERS.south.toFixed(2)}..${CORNERS.north.toFixed(2)}N · aspect ${CAMERA_ASPECT.toFixed(2)}:1 · zoom ${plateFacts.zoom}`,
);
console.log(
  `caméra qui MESURE : LAEA 46N 19E, fenêtre ${WINDOW.west}..${WINDOW.east}E ` +
    `${WINDOW.south}..${WINDOW.north}N · aspect ${MEASURE_ASPECT.toFixed(2)}:1`,
);
console.log(
  `ce que Mercator coûte à un FLEUVE (la longueur du cours, pas une surface) : par kilomètre réel, ` +
    `contre ${NAMES[STRETCH_MIN.code]} = 1 — ` +
    `${stretch.slice(0, 4).map((s) => `${NAMES[s.code]} x${(s.ratio / STRETCH_MIN.ratio).toFixed(3)}`).join(" · ")} ` +
    `· écart maximal ${STRETCH_SPREAD.toFixed(3)}x`,
);
console.log(
  `plafond de zoom dérivé du tronçon le plus court : ${NAMES[CLOSEST.a]} (contre ${NAMES[CLOSEST.b]}), ` +
    `${CLOSEST.degrees.toFixed(3)}° dans le plan dessiné\n`,
);

const facts = beatFacts(
  CODES.map((code) => ({ key: code, label: NAMES[code], value: kmOwn[code] })),
  { subject: NAMES[LEADERS[0]], declaredSequence: "propre" },
);
const offered = applicableTreatments(facts);
console.log(`treatments applicable: ${offered.map((t) => t.id).join(", ") || "(none)"}\n`);

// ── THE WORDS ─────────────────────────────────────────────────────────────────────────────────
//
// THE HEADLINE IS THE CLAIM AND THE GESTURE IN ONE LINE, and both halves are derived: nine
// territories, and three different ones at the head of the same nine stretches depending on what a
// kilometre of Danube is taken to count as.
const title =
  `${CODES.length} pays sur le Danube : le plus long — ${NAMES[LEADERS[0]]} ; le plus frontalier — ` +
  `${NAMES[LEADERS[1]]} ; le plus dense — ${NAMES[LEADERS[2]]}`;
const caveat =
  `Un tronçon par territoire, large de la mesure choisie. Là où le Danube EST la frontière, deux tronçons ` +
  `se superposent. Carte plate en Web Mercator : le tronçon en ${NAMES[STRETCH_MAX.code]} est dessiné ` +
  `${fr(STRETCH_SPREAD, 3)} fois plus long par km réel que celui en ${NAMES[STRETCH_MIN.code]}.`;
/** THE CAVEAT IS CLAMPED TO ONE LINE BY THE FORMAT, and this beat's caveat is where Mercator's cost
 *  is printed — so a caveat too long to be printed is a beat that has not paid for its projection.
 *  Measured on the first render at the review window: 245 characters reached the ellipsis with the
 *  ratio itself inside the truncated half. The budget is what fits, and it is asserted rather than
 *  eyeballed a second time. */
const CAVEAT_BUDGET = 240;
if (caveat.length > CAVEAT_BUDGET)
  throw new Error(
    `the caveat runs ${caveat.length} characters and the format clamps it to one line — measured at the ` +
      `review window, everything past about ${CAVEAT_BUDGET} is replaced by an ellipsis. What falls off the ` +
      `end here is what Web Mercator costs this river, which is the one thing a flat map owes its reader.`,
  );
const claimNote =
  `${n0(Object.values(kmShared).reduce((s, v) => s + v, 0))} des ${n0(COURSE_KM)} km du cours sont une ` +
  `frontière, comptés par deux pays — ${fr((kmShared["BGR"] / km["BGR"]) * 100, 0)} % du Danube bulgare. ` +
  `${ABSENT.length ? `${ABSENT.map((c) => NAMES[c]).join(", ")} touche le fleuve sans jamais le contenir : 0 point sur ${n0(COURSE.length)}. ` : ""}` +
  `Comptés sans être dessinés : ${REMAINDERS[0].codes.map((c) => NAMES[c]).join(", ")}.`;
const readingLine =
  `Lecture : un kilomètre de fleuve compte pour trois choses. Changez la mesure — rien ne bouge d'un ` +
  `point, et le tableau suit, avec ou sans JavaScript.`;
const liveHint =
  `Carte vivante : molette ou boutons pour zoomer, glisser pour déplacer ; survolez un tronçon.`;
const source =
  `Source : cours — Natural Earth 1:10m Rivers + Lake Centerlines, ${n0(COURSE.length)} points, aucun ` +
  `lissage ; territoires — Natural Earth 1:50m Admin 0 Countries ; longueurs et surfaces calculées sur ` +
  `ces fichiers gelés · fond MapTiler (dataviz)`;
const countedLabel = "compté, trop fin pour être dessiné";
const orderLabel = "Ordre du fleuve, classement d'aucune mesure :";
const TABLE_CAPTION = `Les ${CODES.length} territoires, dans l'ordre du fleuve, et leurs trois mesures`;
const COLUMNS = ["N°", "Territoire", "Km en propre", "Km-frontière", "Km / 1 000 km²", "Rang", "Largeur"];

// EVERY TERRITORY, in the river's own order. The `detail` is what a POINTER answers, and it carries
// only what the table does NOT print: the place in the river's order read against the three ranks,
// the total kilometres the two halves add up to, the share of the whole course, and the ground that
// divides it.
const tableRows = CODES.map((code) => {
  const values = valuesOf(code);
  return {
    code,
    name: NAMES[code],
    order: ORDER[code],
    cells: MEASURES.map((_, i) => fmtValue(i, values[i])),
    ranks: MEASURES.map((_, i) => `${RANKS[i][code]}e`),
    detail:
      `${NAMES[code]} · ${ORDER[code]}e territoire atteint par le fleuve · ${n0(km[code])} km de Danube en ` +
      `tout, ${fr((km[code] / COURSE_KM) * 100)} % du cours · ${n0(kmOwn[code])} km en propre et ` +
      `${n0(kmShared[code])} km en frontière (${fr((kmShared[code] / km[code]) * 100, 0)} %) · ` +
      `${RANKS[0][code]}e en propre, ${RANKS[1][code]}e en frontière, ${RANKS[2][code]}e pour 1 000 km² · ` +
      `${n0(areaKm2[code])} km² de territoire`,
  };
});

const interaction = {
  earns:
    "A still and a video can both SAY that a kilometre of Danube means something different depending on " +
    "whether the far bank is yours; neither can let the reader change what the width counts and watch " +
    "the lead pass from Germany to Romania to Serbia while not one point of the river moves — and watch " +
    "which stretches fall under the drawable floor go from two to three to one, and never the same ones.",
  controls: [
    {
      question: "L'Allemagne est la plus large au repos. Large de quoi — de fleuve à elle, ou de fleuve tout court ?",
      gesture: "toggle-a-comparison",
      changes:
        "Les neuf tronçons traversent jusqu'à la largeur que la mesure choisie leur donne, sans qu'aucun " +
        "point du fleuve ne bouge ; les trois échelons de la légende se réécrivent dans l'unité de la " +
        "mesure, le tableau renumérote ses rangs sur place sans déplacer une ligne, et une phrase dit qui " +
        "passe en tête et quels tronçons tombent sous le plancher de lisibilité.",
    },
    {
      question: "Ce tronçon-là, il vaut combien, et où est-il dans les trois classements ?",
      gesture: "ask-a-mark",
      changes:
        "Le tronçon pointé se redessine dans son encre pleine, AU-DESSUS du cours qu'il partage avec son " +
        "voisin d'en face, et répond avec son rang dans l'ordre du fleuve, ses kilomètres totaux, sa part " +
        "du cours, la part de ces kilomètres qui est une frontière, ses trois rangs et sa surface.",
    },
    {
      question: "Et les neuf, sans la carte — ou sans JavaScript ?",
      gesture: "open-the-full-table",
      changes:
        "Les neuf lignes s'ouvrent sous la carte, dans l'ordre du fleuve, chacune avec ses trois mesures. " +
        "Son échantillon de largeur et son rang suivent la mesure choisie en CSS pur : c'est là que le " +
        "geste survit quand la carte ne le peut pas — une couche MapLibre n'est atteignable par aucune " +
        "feuille de style, donc la moitié carte du geste est du script et la moitié tableau n'en est pas.",
    },
  ],
};

const textPerRegister = {
  display: title,
  eyebrow: EYEBROW,
  body: `${caveat} ${readingLine} ${source} ${liveHint}`,
  axis: `${KEY_RUNGS.flatMap((r) => r.variants.map((v) => v.text)).join(" ")} ${countedLabel} ${orderLabel} ` +
    `${measureDeclaration.label} ${measureDeclaration.measures.map((m) => `${m.label} ${m.announce}`).join(" ")} ` +
    `${TABLE_CAPTION} ${COLUMNS.join(" ")} ${tableRows.flatMap((r) => [...r.cells, ...r.ranks, String(r.order)]).join(" ")}`,
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
//
// MapLibre and its stylesheet are INLINED into every page rather than linked: a `<script src>` would
// trade the payload for a SECOND third-party host, and inlining keeps the count at one —
// api.maptiler.com. `style.mjs` travels as SOURCE with its `export` keywords stripped, because a page
// script cannot import.
const requireFrom = createRequire(import.meta.url);
const MAPLIBRE_JS = await readFile(requireFrom.resolve("maplibre-gl/dist/maplibre-gl.js"), "utf8");
const MAPLIBRE_CSS = await readFile(requireFrom.resolve("maplibre-gl/dist/maplibre-gl.css"), "utf8");
const STYLE_MODULE = (
  await readFile(join(HERE, "..", "..", "skills", "map-web", "assets", "style.mjs"), "utf8")
).replace(/^export /gm, "");

// ── THE FROZEN FALLBACK, BAKED FROM THE PAGE ITSELF ───────────────────────────────────────────
//
// The second layer. It is photographed from the page's OWN live map: a draft is rendered, the key is
// substituted into a copy OUTSIDE the repository, the page is opened, the live map announces itself,
// its own box is photographed, and the page is rendered again with that image. No second plan and no
// second mount to disagree with the first — it is the page.
const FALLBACK_DIR = join(HERE, "fallback");
/** The reference window, not a box: the fallback is photographed at the window the beat is reviewed
 *  at, so the image is the delivered box's own shape and `slice` crops nothing there. At 2x. */
const FALLBACK_WINDOW = { width: 1512, height: 860, scale: 2 };
/** The draft's plot box — the BASIS the format's `aspect-ratio` gives `.chart-plot` before the flex
 *  column settles, deliberately taller than the review window can hold so the plot is bound by the
 *  window rather than by this number. The second render uses the height that RESULTED. */
const DRAFT_BOX = { width: 1464, height: 560 };
const BLANK_PNG =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";
const KEY = process.env.MAPTILER_KEY ?? process.env.REMOTION_MAPTILER_KEY ?? process.env.VITE_MAPTILER_KEY ?? "";
const PLACEHOLDER = `__MAPTILER${"_KEY__"}`;
const localPageOf = (pagePath) => pagePath.replace(/\.html$/, ".local.html");

/**
 * PHOTOGRAPH THE PAGE'S OWN LIVE MAP, and write it where the page will embed it.
 *
 * The key is substituted into a copy under the system temp directory, never beside the page and never
 * inside the repository — `no-key-in-the-repository` scans the working tree. The copy is removed
 * whether the bake succeeds or not, and the bake REFUSES rather than writing something: an image
 * baked from a map that never loaded is a picture of the failure it exists to replace.
 */
async function bakeFallback(pagePath, outFile, id) {
  if (!KEY)
    throw new Error(
      "the frozen fallback is photographed from this page's own live map, so the bake needs a MapTiler " +
        "key in the environment (MAPTILER_KEY). Without one the page would ship with the basemap and no " +
        "river on it, which is the defect this bake exists to close.",
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
    // Every tile of the view drawn, not merely requested.
    await page.evaluate(
      () =>
        new Promise((resolve) => {
          const map = window.__mwMap;
          if (map.loaded() && map.areTilesLoaded()) return resolve();
          map.once("idle", resolve);
        }),
    );
    await new Promise((r) => setTimeout(r, 600));
    // ASK THE PICTURE WHETHER IT HAS THE RIVER ON IT, counted on the canvas (`queryRenderedFeatures`)
    // and not in the plan — only the canvas knows. `addLayer` throws on an unknown paint property, the
    // mount stops at the first layer, and the page renders a basemap with nothing on it.
    const drawn = await page.evaluate(() => {
      const map = window.__mwMap;
      const features = map.queryRenderedFeatures({ layers: ["mw-bands"] });
      return [...new Set(features.map((f) => f.properties.code))].sort();
    });
    const openingDrawn = measureDeclaration.measures
      .find((m) => m.key === measureDeclaration.defaultKey)
      .widthByCode;
    const expected = CODES.filter((code) => openingDrawn[code] >= MIN_W).sort();
    if (JSON.stringify(drawn) !== JSON.stringify(expected))
      throw new Error(
        `the live map draws ${JSON.stringify(drawn)} and the opening measure says ${JSON.stringify(expected)}. ` +
          `The photograph about to be frozen would be a picture of a map that lost its marks, and it would ` +
          `ship looking like a success.`,
      );
    const box = await page.$(".map-layer");
    if (!box) throw new Error("the page carries no live map box to photograph");
    await mkdir(dirname(outFile), { recursive: true });
    const png = `${outFile}.png`;
    const shot = await box.boundingBox();
    await box.screenshot({ path: png });
    // Lossless would be honest and is 4x the bytes on flat fills; `-q 92` is visually the same picture
    // and keeps a page that already inlines MapLibre inside a megabyte and a half.
    const encode = spawnSync("cwebp", ["-quiet", "-q", "92", png, "-o", outFile], { stdio: "inherit" });
    if (encode.status !== 0) throw new Error(`cwebp exited with ${encode.status} baking ${id}'s fallback`);
    rmSync(png, { force: true });
    console.log(
      `fallback ${id} → ${outFile.replace(`${HERE}/`, "")} · ${Math.round(shot.width)}x${Math.round(shot.height)} CSS px · ${drawn.length} tronçons sur le canevas`,
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
  const filedBase = readDirection(join(DIRECTIONS, file));
  // The colour the plate's LAND and WATER are painted in — what the page actually paints behind
  // every mark, and the only honest thing to measure the river against. Read BEFORE the colour is
  // composed, because these tints no longer depend on the accent: the water takes the filed water
  // convention, so the ground under the river cannot follow the river.
  const tints = plateTints(filedBase);
  // ONE RESOLUTION OF THIS BEAT'S COLOUR, and it is the one that reaches the paint. The direction
  // and `PALETTE.md` are not two sources competing for the accent slot — the record owns the hue
  // the Danube argues in, this direction owns the value a mark may carry on its paper, and
  // `composeDirection` returns the single colour that is both, measured against the water and the
  // land the river actually runs through. It refuses rather than falling back.
  let base;
  try {
    base = composeDirection({
      direction: filedBase,
      palette: newsroom,
      grounds: plateGrounds(tints),
      textPerRegister,
    });
  } catch (error) {
    // A COLOUR REFUSAL IS A REFUSAL LIKE THE OTHERS, and takes the same path: named on the console,
    // counted at the end, and the previous render removed so it cannot be mistaken for this one.
    // Thrown past this it would abort the whole run on the first direction, leaving the other two
    // unrendered and the stale pages on disk — which is how a beat ships a colour it refused.
    refused.push({ id, why: error.message });
    console.log(`${id} REFUSED — ${error.message}`);
    await rm(join(OUT, `${id}.html`), { force: true });
    await rm(localPageOf(join(OUT, `${id}.html`)), { force: true });
    continue;
  }
  const direction = resolveDirectionFamilies(base, textPerRegister);
  const furniture = deriveFurniture(base.ground);
  // ONE DERIVATION OF THE INKS, READ BY BOTH HALVES. The component paints the table's samples from it
  // and this file builds the live map's line paint from the SAME call — a second derivation is
  // precisely the "half the beat re-widens and the other half keeps the measure before it" defect,
  // now able to happen across two mechanisms instead of inside one.
  const inks = danubeInks({
    ground: base.ground,
    accent: base.accent,
    ink: furniture.ink,
    water: tints.water,
    land: tints.land,
  });
  /** THE BEAT DRAWS THE TERRITORIES ITSELF, BECAUSE THE RIVER DOES NOT. The choropleth's own
   *  mechanism — MapTiler's Countries tileset, its own two layers beneath the basemap's water, the
   *  provider's lines and words swept away — with one neutral land tint under nine stretches rather
   *  than a class per country. Without it « la carte derrière ne donne aucune notion des pays », and
   *  on a beat whose whole subject is which country a kilometre belongs to that is fatal. */
  const countries = countryGround({
    ground: base.ground,
    land: tints.land,
    water: tints.water,
    ink: furniture.ink,
  });
  const riverOnLand = contrast(inks.ribbon, countries.fill);
  console.log(
    `${id} · fond : terre ${countries.measured.fillOnWater.toFixed(2)}:1 sur la mer et ` +
      `${countries.measured.fillOnGround.toFixed(2)}:1 sur le fond de page, frontière ` +
      `${countries.measured.borderOnFill.toFixed(2)}:1 sur cette terre — le fleuve, lui, lit ` +
      `${riverOnLand.toFixed(2)}:1 sur la même terre`,
  );

  const live = {
    style: plateFacts.style,
    tints,
    countries,
    // THE LIVE CAMERA FITS THE BEAT'S OWN DECLARED WINDOW, which is the box the plate was baked by
    // fitting — so the frozen image and the live map are ONE camera rather than two that agree today.
    studyBounds: { west: ASKED.west, south: ASKED.south, east: ASKED.east, north: ASKED.north },
    frame: FRAME,
    degreesPerPixel: plateFacts.degreesPerPixel,
    bands: { type: "FeatureCollection", features: bandFeatures },
    origin: {
      lon: SPRING[0],
      lat: SPRING[1],
      // A PIN, NOT A MEASUREMENT (`radius: "fixed"` in `live-map.mjs`'s vocabulary): the same screen
      // size at every zoom, because it encodes nothing. The course begins here.
      radius: 5,
      fill: inks.node,
      edge: inks.nodeEdge,
    },
    // OPAQUE, AND THAT IS THIS BEAT'S OWN MEASUREMENT RATHER THAN THE FAN'S. A fan draws translucent
    // because thirty bands cross; nine disjoint slices of one river cross nothing, so what the reader
    // sees is the ink and not a composite.
    ribbon: { colour: inks.ribbon, opacity: 1, active: inks.active },
    measures: measureDeclaration,
    details: Object.fromEntries(tableRows.map((r) => [r.code, r.detail])),
    locale: { title: "Carte", zoomIn: "Zoomer", zoomOut: "Dézoomer" },
    changeMs: CHANGE_MS,
    closest: CLOSEST,
  };

  // THE DRAWN BOX IS THE FALLBACK'S OWN BOX. The `<svg class="chart">` covers its stage with `slice`,
  // so a viewBox of some other ratio crops the image rather than the stage.
  const pageOf = (plate, box) =>
    renderWeb({
      // A MAP BEAT'S DRAWING KEEPS ITS SHARE OF THE WINDOW AND THE WORDS GIVE WAY — the share is
      // declared once, in the trunk, and refused there on the file this call writes.
      drawing: { share: MAP_DRAWING_SHARE },
      component: DirectedDanubeWeb,
      props: {
        plate,
        plateWater: tints.water,
        plateLand: tints.land,
        rows: tableRows,
        measures: measureDeclaration,
        keyRungs: KEY_RUNGS,
        countedLabel,
        orderLabel,
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
          `Une carte d'Europe centrale et danubienne où le Danube court d'ouest en est, de la Forêt-Noire ` +
          `au delta. Le fleuve est découpé en ${CODES.length} tronçons, un par pays qu'il touche, et ` +
          `l'épaisseur de chaque tronçon est le nombre de kilomètres que ce pays a en propre : le plus ` +
          `épais est ${NAMES[LEADERS[0]]} (${n0(kmOwn[LEADERS[0]])} km), en amont, alors que le tronçon le ` +
          `plus LONG est ${NAMES[LEADERS[1]]}, en aval. Sur la moitié basse du cours deux tronçons se ` +
          `superposent, parce que le fleuve y est une frontière. Une commande à trois positions redessine ` +
          `les mêmes tronçons selon leurs kilomètres-frontière puis selon leurs kilomètres par ` +
          `1 000 km² de territoire, et le plus épais devient ${NAMES[LEADERS[1]]} puis ${NAMES[LEADERS[2]]} ; ` +
          `la carte elle-même se zoome et se déplace avec les contrôles de MapTiler.`,
        interaction,
        direction,
        ground: direction.ground,
        accent: direction.accent,
      },
      outDir: OUT,
      name: `${id}.html`,
    });

  try {
    // THE STAMP CARRIES THE WORDS TOO. The photograph is of the map's own BOX, and the box is what the
    // chrome leaves: the figure is a flex column and `.chart-plot` is its one shrinkable item, so a
    // sentence that loses a line hands the map twenty pixels. Stamped on the plan alone, a trim of
    // four sentences re-renders three pages that keep the cached image — and therefore the cached BOX
    // — with nothing red anywhere.
    const stamp = createHash("sha256")
      .update(JSON.stringify(liveFlowPlan(live)))
      .update(JSON.stringify(FALLBACK_WINDOW))
      .update(JSON.stringify(DRAFT_BOX))
      .update(JSON.stringify([title, caveat, claimNote, readingLine, liveHint, source, EYEBROW, TABLE_CAPTION, COLUMNS, countedLabel, orderLabel, KEY_RUNGS, measureDeclaration]))
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
    assertOneMeasure(written, measureDeclaration, MEASURE_ID_PREFIX, CODES, { where: `renders/${id}.html` });
    // THE SAME QUESTION, ASKED OF THE OTHER HALF. `assertOneMeasure` holds the MARKUP against the
    // declaration; this holds the LIVE PLAN against a SECOND derivation of the widths, rebuilt from
    // the raw kilometres. Neither can see the other's mechanism, and the crossing between them is
    // exactly where this architecture can put one sense of the kilometre on the map and another in
    // the table.
    assertMeasuresReachTheLayers(written, live, READINGS, plateFacts.style, { where: `renders/${id}.html` });
    // THE RIVER'S OWN ORDER IS ON THE PAGE, AND IT IS NOT A RANK. The rail is the one piece of
    // furniture that must survive every measure; a page that lost it would still pass both guards
    // above, because neither knows this beat has an order.
    for (const row of tableRows)
      if (!written.includes(`>${row.order}</span>`))
        throw new Error(
          `renders/${id}.html: ${row.name} has no badge on the order rail. The rail is what the table's ` +
            `rank cell disagrees with; without it the reader is shown a ranking and no sequence to read ` +
            `it against, which is exactly the reading the still sibling could not avoid.`,
        );
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
  // A runner that swallows a refusal makes a refused page look like a produced one, and leaves the
  // previous render on disk to be mistaken for this one.
  process.exitCode = 1;
}
