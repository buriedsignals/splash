// twin/proof/static-choropleth-europe-lowcarbon/render-directions.mjs
//
// Europe's low-carbon electricity share in 2024 — forty countries — drawn once per filed direction,
// through the design base. The first `map` beat in this tree, and the last of the harvest's twenty-one
// families to get a directed component.
//
// The shapes are FROZEN beside the beat, projected here rather than at draw time, and every figure
// is computed from the frozen CSV before a mark is drawn. The claim is asserted, INCLUDING the
// geography: Albania's neighbours are derived from the frozen rings, not typed from memory.
//
// `renders/`, PLURAL. A render written to `render/` receives no approval and is invisible to the
// export guard.
//
// Usage:  bun proof/static-choropleth-europe-lowcarbon/render-directions.mjs

import { existsSync, readdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { readFile, rm } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import {
  renderStill,
  deriveFurniture,
  adjustToContrast,
  TEXT_CONTRAST_MIN,
} from "#shared/chart-beat/render-still.mjs";
import { readPalette, mix } from "#shared/chart-beat/colour.mjs";
import { beatFacts, applicableTreatments } from "#shared/chart-beat/treatments.mjs";
import { resolveRegister } from "#shared/chart-beat/registers.mjs";
import { makePlan, validatePlan } from "#shared/map-beat/plan.mjs";
import { drawnSizeOf, assertPlateMatchesMarks } from "#shared/map-beat/geometry.mjs";
import { assertNoDoubledBasemap } from "#shared/map-beat/style.mjs";
import { validateExpressions } from "#shared/map-beat/mount.mjs";
import { readDirection } from "../../scripts/design-base/read-direction.mjs";
import { composeDirections, report as reportComposition } from "../../scripts/design-base/compose.mjs";
import { resolveDirectionFamilies } from "../../scripts/design-base/resolve-families.mjs";
import { matchConvention } from "../../skills/palette/scripts/palette.mjs";
import { DirectedChoroplethMap, mapGeometryFor } from "./DirectedChoroplethMap.tsx";

const HERE = dirname(fileURLToPath(import.meta.url));
const DIRECTIONS = join(HERE, "..", "..", "docs", "design-base", "directions");
const OUT = join(HERE, "renders");
const YEAR = 2024;
const EYEBROW = "Énergie · Europe";
const refused = [];

const RENEWABLE = [
  "hydro_generation__twh",
  "wind_generation__twh",
  "solar_generation__twh",
  "bioenergy_stacked_generation__twh",
  "other_renewables_generation__twh",
];
const NUCLEAR = "nuclear_generation__twh";
const FOSSIL = ["gas_generation__twh", "coal_generation__twh", "oil_generation__twh"];
const ALL = [...RENEWABLE, NUCLEAR, ...FOSSIL];

const FRENCH = {
  ALB: "Albanie", AUT: "Autriche", BLR: "Biélorussie", BEL: "Belgique",
  BIH: "Bosnie-Herzégovine", BGR: "Bulgarie", HRV: "Croatie", CYP: "Chypre",
  CZE: "Tchéquie", DNK: "Danemark", EST: "Estonie", FIN: "Finlande", FRA: "France",
  DEU: "Allemagne", GRC: "Grèce", HUN: "Hongrie", ISL: "Islande", IRL: "Irlande",
  ITA: "Italie", LVA: "Lettonie", LTU: "Lituanie", LUX: "Luxembourg", MLT: "Malte",
  MDA: "Moldavie", MNE: "Monténégro", NLD: "Pays-Bas", MKD: "Macédoine du Nord",
  NOR: "Norvège", POL: "Pologne", PRT: "Portugal", ROU: "Roumanie", RUS: "Russie",
  SRB: "Serbie", SVK: "Slovaquie", SVN: "Slovénie", ESP: "Espagne", SWE: "Suède",
  CHE: "Suisse", TUR: "Turquie", UKR: "Ukraine", GBR: "Royaume-Uni",
};
const french = (iso) => {
  if (!FRENCH[iso]) throw new Error(`no French name recorded for ${iso}`);
  return FRENCH[iso];
};

// ── the data ────────────────────────────────────────────────────────────────
const csv = (await readFile(join(HERE, "data.csv"), "utf8")).trim().split(/\r?\n/);
const header = csv[0].split(",");
const rowsRaw = csv.slice(1).map((l) => {
  const cells = l.split(",");
  return Object.fromEntries(header.map((h, i) => [h, cells[i]]));
});

/** An entity the file does not report is not a zero — Ukraine's 2024 row carries a single `0` and
 *  nothing else. It stays in the STUDY SET (the source is supposed to report it) and is drawn as an
 *  absence, which is the whole difference between this map and one that shows Ukraine at 0 %. */
const measured = rowsRaw.map((raw) => {
  if (Number(raw.year) !== YEAR) throw new Error(`${raw.entity} is not ${YEAR}`);
  const twh = ALL.map((k) => Number(raw[k] || 0));
  return { iso: raw.code, entity: raw.entity, raw, total: twh.reduce((a, b) => a + b, 0) };
});
const studySet = measured.map((m) => m.iso);
const unreported = measured.filter((m) => !(m.total > 0));

const value = new Map();
for (const m of measured.filter((m) => m.total > 0)) {
  const share = (k) => (Number(m.raw[k] || 0) / m.total) * 100;
  const renewables = RENEWABLE.reduce((s, k) => s + share(k), 0);
  const nuclear = share(NUCLEAR);
  value.set(m.iso, {
    iso: m.iso,
    label: french(m.iso),
    total: m.total,
    renewables,
    nuclear,
    lowCarbon: renewables + nuclear,
  });
}
console.log(
  `${measured.length} European entities frozen · ${value.size} report ${YEAR} generation · ` +
    `no data for ${unreported.length}: ${unreported.map((m) => french(m.iso)).join(", ")}\n`,
);

// ── the shapes ──────────────────────────────────────────────────────────────
const geo = JSON.parse(await readFile(join(HERE, "shapes.geojson"), "utf8"));

/** THE CAMERA, declared here and nowhere else: the window in degrees the plate shows, and the
 *  projection it shows it in.
 *
 *  LAMBERT AZIMUTHAL EQUAL-AREA, centred at 52° N 10° E — which is EPSG:3035, the projection the
 *  European Environment Agency and Eurostat publish continental statistics in. Two reasons, and the
 *  first is not aesthetic.
 *
 *  A CHOROPLETH IS READ BY AREA. The eye weights a class by how much of the page it covers, so a
 *  projection that inflates the north inflates the argument — and the first version of this plate
 *  was Web Mercator, where Norway, Sweden and Finland are stretched by a factor of about two at
 *  their own latitudes. Those are three of the seven countries the headline is about. An equal-area
 *  projection is not a refinement here; it is the difference between a map that supports the
 *  sentence and one that manufactures it.
 *
 *  And Mercator's Europe is as tall as it is wide, so on a landscape plate it is bound by height and
 *  leaves two thirds of the page empty. LAEA's is wider than tall, and the same vertical budget buys
 *  a map half again as large. */
const WINDOW = { west: -25, east: 45, south: 34, north: 72 };
const RAD = Math.PI / 180;
const LAT0 = 52 * RAD;
const LON0 = 10 * RAD;
function laea([lonDeg, latDeg]) {
  const lat = latDeg * RAD;
  const lon = lonDeg * RAD - LON0;
  const cosc = Math.sin(LAT0) * Math.sin(lat) + Math.cos(LAT0) * Math.cos(lat) * Math.cos(lon);
  const k = Math.sqrt(2 / Math.max(1e-9, 1 + cosc));
  return [
    k * Math.cos(lat) * Math.sin(lon),
    -k * (Math.cos(LAT0) * Math.sin(lat) - Math.sin(LAT0) * Math.cos(lat) * Math.cos(lon)),
  ];
}

/** The camera's box is the projected border of the declared window — sampled, because a projected
 *  rectangle is not a rectangle, and taking only its four corners would crop the bulge in the
 *  middle of each edge. */
const border = [];
for (let i = 0; i <= 120; i++) {
  const t = i / 120;
  border.push(laea([WINDOW.west + t * (WINDOW.east - WINDOW.west), WINDOW.north]));
  border.push(laea([WINDOW.west + t * (WINDOW.east - WINDOW.west), WINDOW.south]));
  border.push(laea([WINDOW.west, WINDOW.south + t * (WINDOW.north - WINDOW.south)]));
  border.push(laea([WINDOW.east, WINDOW.south + t * (WINDOW.north - WINDOW.south)]));
}
const BX0 = Math.min(...border.map((p) => p[0]));
const BX1 = Math.max(...border.map((p) => p[0]));
const BY0 = Math.min(...border.map((p) => p[1]));
const BY1 = Math.max(...border.map((p) => p[1]));
/** ONE SCALE FOR BOTH AXES. A map whose aspect is stretched to fill a frame is a map that lies about
 *  shape, so the shapes go into a unit box on the LONGER side and the component is told the aspect. */
const spanX = BX1 - BX0;
const spanY = BY1 - BY0;
const span = Math.max(spanX, spanY);

/** THE CAMERA IS THE PLATE'S, NOT THIS FILE'S — and that is the change this pass made.
 *
 *  The equal-area camera above is kept because it is what MEASURES: the two averages the cartogram
 *  beat compares are area-weighted, and an area weight taken off a Mercator drawing would be wrong
 *  by a factor of two at Norway's latitude. It no longer places anything.
 *
 *  What places every mark is the baked MapTiler plate's own recorded camera — `frameCorners`,
 *  measured with `map.unproject()` after the camera settled, not the nominal bounds handed to
 *  `fitBounds`, which fitBounds widens to preserve the frame's aspect. Longitude is linear in
 *  pixel-x under Web Mercator; latitude needs the inverse Mercator formula, because pixel-y is
 *  linear in Mercator-y and not in latitude itself.
 *
 *  THE COST, STATED. Web Mercator inflates the north: at 60° a shape draws twice the area it holds.
 *  This plate's own headline is a count of countries, not an area, so the count survives; the
 *  cartogram beat's area weighting does NOT, and it keeps measuring on the equal-area camera above
 *  while drawing on the plate. Where the two disagree, the number is the equal-area one and the
 *  picture is the plate's. */
/** ONE PLATE PER FILED DIRECTION, baked in that direction's own tints — see `bake.mjs`'s own note.
 *  The three share a camera by construction (same bounds, same frame), and that is asserted below
 *  rather than assumed: three plates that disagreed about where 10°E is would put the same country
 *  in three different places and nothing would go red. */
const PLATE_SIZE = "1000x760";
const plateDir = (id) => join(HERE, "plate", id);
function ensurePlate(id, water, land) {
  const dir = plateDir(id);
  if (existsSync(join(dir, "geometry.json")) && existsSync(join(dir, "plate.png"))) return;
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
 *  land takes a step off the ground toward the ink. Nothing else on the basemap carries colour.
 *
 *  THESE ARE THE PLATES' OWN TINTS AND THEY DO NOT MOVE HERE. `#shared/map-beat/tints.mjs` answers
 *  the same question differently — it takes the filed WATER hue rather than the accent, and hunts
 *  the smallest dose that separates sea from land by a measured 1.22:1 — and adopting it would
 *  re-bake three committed plates and change every render. That is a picture change, and this pass
 *  is a contract change: the swap belongs to the pass that re-bakes. */
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
/** THE THREE PLATES MUST SHOW THE SAME GROUND — and that is a claim about DEGREES, not about
 *  pixels. It used to be both: the frame sizes had to match as well, which was true only while every
 *  plate was baked at one hard-coded size. The drawn size is a layout output now, so a direction
 *  whose panel is wider gets a smaller plate of the SAME camera, and demanding equal frames would
 *  refuse a correct bake. What may never differ is where a degree lands: `fitBounds` on the same
 *  bounds at the same aspect returns the same corners at any pixel scale, so the corners are
 *  compared and the sizes are not. */
const CORNER_TOLERANCE = 1e-9;
for (const file of DIRECTION_FILES.slice(1)) {
  const id = file.replace(/\.md$/, "");
  const other = await factsOf(id);
  const apart = ["west", "east", "south", "north"].filter(
    (edge) => Math.abs(other.frameCorners[edge] - plateFacts.frameCorners[edge]) > CORNER_TOLERANCE,
  );
  if (apart.length)
    throw new Error(
      `the ${id} plate was baked on a different camera than ${DIRECTION_FILES[0]} — its ` +
        `${apart.join(", ")} edge${apart.length > 1 ? "s disagree" : " disagrees"} by more than ` +
        `${CORNER_TOLERANCE}°: three plates that disagree about where a degree is would put the same ` +
        `country in three places, and nothing else here would notice. Their pixel SIZES are allowed ` +
        `to differ — the drawn size is the layout's output, one per direction.`,
    );
}
const FRAME = plateFacts.frame;
const CORNERS = plateFacts.frameCorners;
if (!CORNERS || !(FRAME?.width > 0))
  throw new Error("this plate predates the camera facts: re-bake it with bake.mjs");
/** THE CAMERA'S ASPECT IS DECLARED, NOT DISCOVERED. It used to be read back from a plate already
 *  baked, which made the drawn size depend on the plate and the plate depend on the drawn size. The
 *  layout arithmetic makes `mapW / mapH` equal this aspect by construction, so a plate baked at the
 *  drawn size is the same camera at a different pixel scale — `fitBounds` on the same bounds at the
 *  same aspect returns the same corners. */
export const CAMERA_ASPECT = 1000 / 760;
const mercY = (lat) => Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360));
const Y_NORTH = mercY(CORNERS.north);
const Y_SOUTH = mercY(CORNERS.south);
const project = ([lon, lat]) => {
  const px = ((lon - CORNERS.west) / (CORNERS.east - CORNERS.west)) * FRAME.width;
  const py = ((mercY(lat) - Y_NORTH) / (Y_SOUTH - Y_NORTH)) * FRAME.height;
  return [px / FRAME.width, py / FRAME.width];
};
/** …AND BACK, exactly. The PLAN speaks degrees — a layer's data is geography, not a unit box — while
 *  everything this file measures (an anchor, a sea's placed name) is already in the camera's unit
 *  box. The two are the same camera, so the way back is the algebra above read in reverse rather
 *  than a second, approximate answer to the same question. */
const unproject = ([x, y]) => [
  CORNERS.west + x * (CORNERS.east - CORNERS.west),
  (Math.atan(Math.exp(Y_NORTH + ((y * FRAME.width) / FRAME.height) * (Y_SOUTH - Y_NORTH))) -
    Math.PI / 4) *
    (360 / Math.PI),
];
console.log(
  `camera: MapTiler plate, ${FRAME.width}x${FRAME.height}, ` +
    `${CORNERS.west.toFixed(2)}..${CORNERS.east.toFixed(2)}E ` +
    `${CORNERS.south.toFixed(2)}..${CORNERS.north.toFixed(2)}N · aspect ${(FRAME.width / FRAME.height).toFixed(2)}:1 · ` +
    `zoom ${plateFacts.zoom}\n`,
);
console.log(
  `measurement camera (unchanged): LAEA 52N 10E, window ${WINDOW.west}..${WINDOW.east}E ` +
    `${WINDOW.south}..${WINDOW.north}N · aspect ${(spanX / spanY).toFixed(2)}:1\n`,
);

/** A ring is thinned by dropping vertices closer than half a drawn pixel to the last one kept, at
 *  the smallest camera this beat publishes — the coastline a reader sees is unchanged and the file
 *  the rasteriser walks is a fraction of the size.
 *
 *  AND THINNING MAY NEVER DESTROY A RING. The first version returned `null` when fewer than four
 *  vertices survived, and Malta — 27 km across, every vertex inside half a pixel of the last —
 *  vanished: 40 countries reported generation and 39 shapes carried a value. The plate would have
 *  rendered, correctly, with a country silently absent, which is the failure every choropleth
 *  reference sheet in this harvest warns about by name. A ring too small to thin is kept whole. */
const MIN_STEP = 0.5 / 200;
function thin(ring) {
  const out = [ring[0]];
  for (const p of ring.slice(1)) {
    const q = out[out.length - 1];
    if (Math.abs(p[0] - q[0]) > MIN_STEP || Math.abs(p[1] - q[1]) > MIN_STEP) out.push(p);
  }
  return out.length >= 4 ? out : ring;
}

let vertices = 0;
const shapes = geo.features
  .map((f) => {
    const iso = f.properties.iso;
    const rings = f.geometry.coordinates
      .flatMap((poly) => poly)
      .map((ring) => thin(ring.map(project)))
      .filter(Boolean);
    if (!rings.length) return null;
    vertices += rings.reduce((s, r) => s + r.length, 0);
    /** THE LABEL ANCHOR IS THE RING'S OWN CENTRE OF MASS, PULLED BACK INSIDE THE RING.
     *
     *  The box centre is the cheap answer and it is wrong exactly where it matters: Norway's box
     *  includes Finnmark, so its centre lands in SWEDEN — and every label placed from it, and every
     *  leader drawn to it, started in the wrong country. The vertex mean sits where the coastline
     *  actually is (a fjorded coast contributes most of the vertices), and when even that falls
     *  outside — a crescent, an archipelago — it is walked to the nearest vertex, which is on the
     *  country by construction. The box is still reported, because "does the name fit inside this
     *  shape" is a question about the box. */
    const largest = rings.reduce((a, b) => (b.length > a.length ? b : a));
    const xs = largest.map((p) => p[0]);
    const ys = largest.map((p) => p[1]);
    const mean = {
      x: xs.reduce((a, b) => a + b, 0) / xs.length,
      y: ys.reduce((a, b) => a + b, 0) / ys.length,
    };
    const insideRing = (px, py) => {
      let hit = false;
      for (let i = 0, j = largest.length - 1; i < largest.length; j = i++) {
        const [xi, yi] = largest[i];
        const [xj, yj] = largest[j];
        if (yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) hit = !hit;
      }
      return hit;
    };
    const seat = insideRing(mean.x, mean.y)
      ? mean
      : largest.reduce(
          (best, [px, py]) =>
            (px - mean.x) ** 2 + (py - mean.y) ** 2 <
            (best.x - mean.x) ** 2 + (best.y - mean.y) ** 2
              ? { x: px, y: py }
              : best,
          { x: largest[0][0], y: largest[0][1] },
        );
    const box = {
      x: seat.x,
      y: seat.y,
      width: Math.max(...xs) - Math.min(...xs),
      height: Math.max(...ys) - Math.min(...ys),
    };
    return {
      iso,
      name: FRENCH[iso] ?? f.properties.name,
      rings,
      anchor: box,
      value: value.has(iso) ? value.get(iso).lowCarbon : null,
      inStudySet: studySet.includes(iso),
    };
  })
  .filter(Boolean);
console.log(`${shapes.length} shapes projected, ${vertices} vertices after thinning\n`);

const drawn = shapes.filter((s) => s.value !== null).length;
if (drawn !== value.size)
  throw new Error(
    `the join dropped rows: ${value.size} countries report ${YEAR} generation and ${drawn} shapes ` +
      `carry a value. Missing: ${[...value.keys()].filter((k) => !shapes.some((s) => s.iso === k)).join(", ")}`,
  );

// ── THE CLAIM, ASSERTED — including its geography ───────────────────────────
const FLOOR = 94;
const ranked = [...value.values()].sort((a, b) => b.lowCarbon - a.lowCarbon);
const above = ranked.filter((r) => r.lowCarbon > FLOOR);
if (above.length !== 7)
  throw new Error(
    `the headline says seven countries clear ${FLOOR} %; ${above.length} do ` +
      `(${above.map((r) => `${r.label} ${r.lowCarbon.toFixed(1)}`).join(", ")})`,
  );

/** THE BEAT'S CLAIM, ITS PLANS AND ITS GEOMETRY, PUBLISHED. `above` is the whole headline — the
 *  seven countries over the floor — and it was a local const nothing outside this file could read,
 *  so the one sentence the beat exists for was checkable only by looking at the picture. The plan
 *  and the drawn size go out beside it for the same reason: what a renderer will be handed is now
 *  something a test can hold. */
export const report = { above: above.map((r) => ({ iso: r.iso, lowCarbon: r.lowCarbon })) };
export const plans = {};
export const geometry = {};

/** ALBANIA'S NEIGHBOURS ARE DERIVED FROM THE FROZEN SHAPES, not typed from memory. Two countries
 *  are neighbours when a vertex of one lands within a tenth of a degree of a vertex of the other.
 *  The test is coarse in the safe direction — it can only ever find MORE neighbours than exist, so a
 *  claim that every neighbour is below a floor cannot pass by missing one.
 *
 *  IT IS RUN IN DEGREES, ON THE RAW COORDINATES, and that is not a detail: the first version ran on
 *  the PROJECTED rings with a threshold derived from the old projection's unit box. Changing the
 *  projection silently changed what "a tenth of a degree" meant, Montenegro stopped being a
 *  neighbour, and the plate went from "3 voisins" to "2" without anything going red. A geographic
 *  fact should not move when the camera does. */
const NEAR_DEGREES = 0.1;
const lonLatOf = (iso) => {
  const f = geo.features.find((f) => f.properties.iso === iso);
  return f ? f.geometry.coordinates.flat().flat() : [];
};
function neighboursOf(iso) {
  const mine = lonLatOf(iso);
  return geo.features
    .map((f) => f.properties.iso)
    .filter((other) => other !== iso)
    .filter((other) =>
      lonLatOf(other).some(([x, y]) =>
        mine.some(([u, v]) => Math.abs(x - u) < NEAR_DEGREES && Math.abs(y - v) < NEAR_DEGREES),
      ),
    );
}

const ODD_ONE = "ALB";
if (!above.some((r) => r.iso === ODD_ONE))
  throw new Error(`the callout is about ${french(ODD_ONE)}, which is not above the floor`);
const neighbours = neighboursOf(ODD_ONE).filter((iso) => value.has(iso));
if (!neighbours.length)
  throw new Error(`${french(ODD_ONE)} has no neighbour with data in the frozen shapes`);
const NEIGHBOUR_CEILING = 60;
const overCeiling = neighbours.filter((iso) => value.get(iso).lowCarbon >= NEIGHBOUR_CEILING);
if (overCeiling.length)
  throw new Error(
    `the callout says every one of ${french(ODD_ONE)}'s neighbours is under ${NEIGHBOUR_CEILING} %; ` +
      `${overCeiling.map((i) => `${french(i)} ${value.get(i).lowCarbon.toFixed(1)}`).join(", ")} ` +
      `${overCeiling.length === 1 ? "is" : "are"} not`,
  );
console.log(
  `${french(ODD_ONE)} ${value.get(ODD_ONE).lowCarbon.toFixed(1)} % · neighbours derived from the ` +
    `frozen rings: ${neighbours.map((i) => `${french(i)} ${value.get(i).lowCarbon.toFixed(1)}`).join(", ")}\n`,
);

/** The other six are north or west of the odd one out — stated as a measurement on the shapes, so a
 *  headline that says "the north-west, and one exception" is checkable. */
const anchorOf = (iso) => shapes.find((s) => s.iso === iso).anchor;
const oddAnchor = anchorOf(ODD_ONE);
const notNorthWest = above
  .filter((r) => r.iso !== ODD_ONE)
  .filter((r) => anchorOf(r.iso).y > oddAnchor.y && anchorOf(r.iso).x > oddAnchor.x);
if (notNorthWest.length)
  throw new Error(
    `the headline says the other six are north or west of ${french(ODD_ONE)}; ` +
      `${notNorthWest.map((r) => r.label).join(", ")} is neither`,
  );

console.table(
  ranked.map((r) => ({
    pays: r.label,
    "bas-carbone %": r.lowCarbon.toFixed(1),
    "renouv. %": r.renewables.toFixed(1),
    "nucléaire %": r.nuclear.toFixed(1),
    TWh: r.total.toFixed(0),
  })),
);

// ── the plate ───────────────────────────────────────────────────────────────
const BREAKS = [40, 55, 70, 85, FLOOR];
const facts = beatFacts(
  ranked.map((r) => ({ key: r.iso, label: r.label, value: r.lowCarbon })),
  {
    subject: ODD_ONE,
    cells: ranked.map((r) => ({ key: r.iso, value: r.lowCarbon })),
    impossibleCells: unreported.length,
    scaleClasses: BREAKS.length + 1,
    geography: { areas: above.length, settlements: 0, waters: 3, basemap: true },
    declaredSequence: "low-carbon share",
  },
);
const offered = applicableTreatments(facts);
console.log(`treatments applicable: ${offered.map((t) => t.id).join(", ")}\n`);

const plain = (s) => s.replace(/[  ]/g, " ");
const one = (v) =>
  plain(v.toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }));
const format = (v) => `${Math.round(v)} %`;

/** THE THREE SEAS, at declared positions in the camera's own unit box. A sea has no polygon in this
 *  file — the shapes are land — so its label cannot be placed from geometry, and the plate says so
 *  rather than pretending the position was derived. */
const WATERS = [
  // Each sea is declared once, at its own centre. The forms are the ladder; the position is a fact.
  { forms: ["Mer du Nord", "Mer du N."], lon: 3.0, lat: 56.5 },
  { forms: ["Mer Méditerranée", "Méditerranée", "Médit."], lon: 15.0, lat: 36.0 },
  { forms: ["Mer Baltique", "Baltique", "Balt."], lon: 19.5, lat: 58.0 },
].map((w) => {
  const [x, y] = project([w.lon, w.lat]);
  // The unit-box position is what the component draws with; the degrees are what the PLAN carries.
  return { forms: w.forms, x, y, lon: w.lon, lat: w.lat };
});

const oddValue = value.get(ODD_ONE);
const CALLOUT = {
  iso: ODD_ONE,
  lines: [
    `${french(ODD_ONE)}, ${one(oddValue.lowCarbon)} %, est le seul du groupe hors du nord-ouest. ` +
      `Ses ${neighbours.length} voisins sont tous sous ${NEIGHBOUR_CEILING} %.`,
  ],
  toX: oddAnchor.x,
  toY: oddAnchor.y,
};

const title = [
  `Sept pays européens dépassent ${FLOOR} % d’électricité bas-carbone — six au nord-ouest, ` +
    `et l’Albanie`,
  `Le bas-carbone européen est au nord-ouest — et en Albanie`,
  `Le bas-carbone européen, et son exception`,
];
const limits = [
  `Part de l’électricité produite à partir de sources bas-carbone — renouvelables et nucléaire ` +
    `réunis — en ${YEAR}, dans les ${value.size} pays européens dont la production est rapportée. ` +
    `${above.map((r) => r.label).join(", ")} dépassent ${FLOOR} %.`,
  `Part de l’électricité bas-carbone — renouvelables et nucléaire réunis — en ${YEAR}, dans les ` +
    `${value.size} pays européens dont la production est rapportée.`,
  `Électricité bas-carbone en ${YEAR}, ${value.size} pays européens.`,
];
const reading = [
  `Lecture : la couleur est une classe, pas un nombre ; ses bornes sont imprimées sous la carte. ` +
    `La Russie et la Turquie sont colorées sur leur part nationale, dont le cadre ne montre que ` +
    `l’extrémité occidentale.`,
  `Lecture : la couleur est une classe ; ses bornes sont sous la carte.`,
];
const source =
  "Source : Ember, Energy Institute – Statistical Review of World Energy (2025), via Our World in Data · fond de carte MapTiler (dataviz), teinté par la direction";

const textPerRegister = {
  display: title.join(" "),
  eyebrow: EYEBROW,
  body: `${limits.join(" ")} ${source}`,
  axis: `${above.map((r) => r.label).join(" ")} ${ranked.slice(-3).map((r) => r.label).join(" ")} ${BREAKS.map(format).join(" ")} part bas-carbone donnée non rapportée`,
  annot: `${reading.join(" ")} ${CALLOUT.lines.join(" ")} ${WATERS.flatMap((w) => w.forms).join(" ")}`,
  value: ranked.map((r) => format(r.lowCarbon)).join(" "),
};

const filed = readdirSync(DIRECTIONS)
  .filter((f) => f.endsWith(".md"))
  .map((f) => readDirection(join(DIRECTIONS, f)));
const newsroom = readPalette(HERE, { stopAt: join(HERE, "..") });
const BEAT_FACTS = { evidenceLevels: BREAKS.length + 1 };
console.log(
  reportComposition(composeDirections({ newsroom, filed, beat: BEAT_FACTS, textPerRegister }), {
    beat: BEAT_FACTS,
  }),
);
console.log("");

// ── the plan: what this beat OWNS on the map, and nothing else ──────────────
//
// THE GEOGRAPHY IS MAPTILER'S AND IS NEVER REDRAWN. A layer here marks what belongs to the study —
// a class, a border between two of its own areas, the ringed subject, a word the beat placed. Land
// and coastline are the basemap's, and `assertNoDoubledBasemap` refuses a layer that claims them.
//
// The legend, the headline, the standfirst, the reading line, the source line and the callout's
// sentence live OUTSIDE the map rectangle. They are not layers, and they stay where they are.
//
// In 8a the plan is BUILT and VALIDATED, and nothing renders from it yet: the four guards run
// against the picture the beat already draws, so a plan that could not be rendered is caught before
// anything depends on it.

/** The bounds are the plate's own, read back from the bake rather than retyped — a plan that named
 *  a different window than the plate beside it would be a plan for a different map. */
const BOUNDS = plateFacts.bounds;
/** THE STYLE IS NAMED, NOT FETCHED. Fetching MapTiler's style document costs the key and a round
 *  trip, and nothing in 8a mounts the plan. What the plan carries is the style this beat's plates
 *  were ACTUALLY baked in, taken off the plate's own record. */
const STYLE = { name: plateFacts.style };

/** The study set as geography, in degrees — the same frozen rings the plate is drawn from, carrying
 *  the value each area is classed on and whether the source was supposed to report it at all. */
const studyAreas = {
  type: "FeatureCollection",
  features: geo.features.map((f) => ({
    type: "Feature",
    properties: {
      iso: f.properties.iso,
      name: FRENCH[f.properties.iso] ?? f.properties.name,
      value: value.has(f.properties.iso) ? value.get(f.properties.iso).lowCarbon : null,
      inStudySet: studySet.includes(f.properties.iso),
    },
    geometry: f.geometry,
  })),
};
const anchorPointOf = (iso) => {
  const shape = shapes.find((s) => s.iso === iso);
  return {
    type: "Feature",
    properties: { iso, name: shape.name.toUpperCase() },
    geometry: { type: "Point", coordinates: unproject([shape.anchor.x, shape.anchor.y]) },
  };
};
const pointsFor = (isos) => ({
  type: "FeatureCollection",
  features: isos.filter((iso) => shapes.some((s) => s.iso === iso)).map(anchorPointOf),
});
const namedAreas = pointsFor(above.map((r) => r.iso));
const contextAreas = pointsFor(ranked.slice(-3).map((r) => r.iso));
const subjectArea = { type: "FeatureCollection", features: [anchorPointOf(ODD_ONE)] };
const seaNames = {
  type: "FeatureCollection",
  features: WATERS.map((w) => ({
    type: "Feature",
    // The longest form is what the beat ASKS for; which form survives the camera is the drawing's
    // measurement, and 8b is where the plan learns the answer.
    properties: { name: w.forms[0], forms: w.forms },
    geometry: { type: "Point", coordinates: [w.lon, w.lat] },
  })),
};

/** EVERY VALUE BELOW IS THE COMPONENT'S OWN, TRANSPORTED. Not one of them was chosen here: the ramp
 *  is the heatmap's construction between the direction's poles, the border is `deriveFurniture`'s
 *  `grid` step, the ring is the accent walked to the text floor, the labels are the axis register
 *  with the same tracking the plate sets them in. A number invented for the plan would be a second
 *  answer to a question the drawing has already measured. */
function layersFor(direction, g) {
  const { ink, muted, grid } = deriveFurniture(direction.ground);
  const low = mix(direction.accent, direction.ground, 0.88);
  const high = mix(direction.accent, ink, 0.3);
  const classCount = BREAKS.length + 1;
  const classFill = (i) => mix(low, high, classCount > 1 ? i / (classCount - 1) : 0.5);
  const landNoValue = mix(direction.ground, ink, 0.05);
  const coast = mix(direction.ground, ink, 0.22);
  const missingFill = mix(direction.ground, ink, 0.13);
  const waterHue = matchConvention("water").accent;
  const waterInk = adjustToContrast(
    waterHue,
    mix(direction.ground, waterHue, 0.16),
    TEXT_CONTRAST_MIN,
  );
  const accentInk = adjustToContrast(direction.accent, direction.ground, TEXT_CONTRAST_MIN);
  const mutedInk = adjustToContrast(muted, direction.ground, TEXT_CONTRAST_MIN);

  const axis = resolveRegister(direction, "axis");
  const area = { ...axis, letterSpacing: Math.max(Number(axis.letterSpacing ?? 0), 0.8) };
  const feature = { ...area, fontWeight: 700 };
  const waterReg = { ...axis, fontStyle: "italic", letterSpacing: 0 };
  /** A register's tracking is measured in PIXELS on the plate and declared in EMS on a map. Same
   *  measurement, the unit the reader of it expects. */
  const tracking = (r) => Number(r.letterSpacing ?? 0) / r.fontSize;
  const halo = Math.max(2.5, g.axisBand.ascent * 0.34) / 2;
  const words = (id, data, register, colour, haloColour) => ({
    id,
    role: "place",
    type: "symbol",
    data,
    layout: {
      "text-field": ["get", "name"],
      "text-font": [register.fontFamily],
      "text-size": register.fontSize,
      "text-letter-spacing": tracking(register),
    },
    paint: { "text-color": colour, "text-halo-color": haloColour, "text-halo-width": halo },
  });

  const hasValue = ["!=", ["get", "value"], null];
  return [
    {
      id: "classes",
      role: "study-area",
      type: "fill",
      data: studyAreas,
      paint: {
        "fill-color": [
          "case",
          hasValue,
          ["step", ["get", "value"], classFill(0), ...BREAKS.flatMap((b, i) => [b, classFill(i + 1)])],
          ["get", "inStudySet"],
          missingFill,
          landNoValue,
        ],
      },
    },
    {
      id: "borders",
      role: "study-border",
      type: "line",
      data: studyAreas,
      paint: {
        // An area with no value takes the coast step rather than the grid one — the same two inks,
        // chosen the same way, as the plate draws them.
        "line-color": ["case", hasValue, grid, coast],
        "line-width": direction.stroke.hairline,
      },
    },
    {
      id: "subject-ring",
      role: "subject",
      type: "circle",
      data: subjectArea,
      paint: {
        "circle-radius": Math.max(
          (Math.max(shapes.find((s) => s.iso === ODD_ONE).anchor.width,
            shapes.find((s) => s.iso === ODD_ONE).anchor.height) * g.mapW) / 2 + 5,
          7,
        ),
        "circle-opacity": 0,
        "circle-stroke-color": accentInk,
        "circle-stroke-width": direction.stroke.rule * 1.6,
      },
    },
    words("named-areas", namedAreas, feature, accentInk, direction.ground),
    words("context-areas", contextAreas, area, mutedInk, direction.ground),
    { ...words("sea-names", seaNames, waterReg, waterInk, mix(direction.ground, waterHue, 0.16)), role: "water" },
  ];
}

for (const file of readdirSync(DIRECTIONS).filter((f) => f.endsWith(".md"))) {
  const id = file.replace(/\.md$/, "");
  const direction = resolveDirectionFamilies(readDirection(join(DIRECTIONS, file)), textPerRegister);

  console.log(id);
  for (const d of direction.decisions)
    console.log(
      `  ${d.register.padEnd(8)} ${d.role.padEnd(15)} -> ${d.family}` +
        (d.refused.length
          ? `   refused: ${d.refused.map((r) => `${r.family} [${r.missing.join(",")}]`).join(", ")}`
          : ""),
    );

  /** WHERE AND HOW LARGE THIS DIRECTION DRAWS ITS MAP — asked of the component's own layout rather
   *  than guessed here, and carrying the plate rectangle beside the map rectangle so the two can be
   *  compared instead of assumed equal. */
  const g = mapGeometryFor({
    aspect: CAMERA_ASPECT,
    callout: CALLOUT,
    title,
    limits,
    reading,
    source,
    direction,
  });
  geometry[id] = { ...g, plate: { x: g.mapX, y: g.mapY, width: g.mapW, height: g.mapH } };
  assertPlateMatchesMarks(geometry[id]);

  const plan = makePlan({
    style: STYLE,
    camera: { bounds: BOUNDS, drawn: drawnSizeOf(geometry[id]) },
    layers: layersFor(direction, g),
  });
  const violations = [...validatePlan(plan), ...validateExpressions(plan)];
  if (violations.length)
    throw new Error(`the plan for ${id} is not renderable:\n  ${violations.join("\n  ")}`);
  assertNoDoubledBasemap(plan);
  plans[id] = plan;
  console.log(
    `  plan: ${plan.layers.length} layers (${plan.layers.map((l) => l.id).join(", ")}) · ` +
      `drawn ${plan.camera.drawn.width} x ${plan.camera.drawn.height}`,
  );

  try {
    await renderStill({
      element: createElement(DirectedChoroplethMap, {
        shapes,
        // The basemap is inlined as a data URI because the rasteriser has no network and no CWD: a
        // plate referenced by path renders as a blank box and says nothing about it.
        plate: `data:image/png;base64,${(await readFile(join(plateDir(id), "plate.png"))).toString("base64")}`,
        aspect: CAMERA_ASPECT,
        named: above.map((r) => r.iso),
        // The other end of the ramp, named in the quiet administrative treatment: a reader gets both
        // ends of the scale by name, and the plate actually draws the three classes of place the
        // treatment claims rather than only two.
        context: ranked.slice(-3).map((r) => r.iso),
        waters: WATERS,
        callout: CALLOUT,
        missingLabel: "donnée non rapportée",
        breaks: BREAKS,
        unit: "part bas-carbone de la production",
        title,
        limits,
        reading,
        source,
        alt:
          `Carte choroplèthe de l’Europe : part de l’électricité bas-carbone par pays en ${YEAR}, ` +
          `dans ${value.size} pays. Sept dépassent ${FLOOR} % — ` +
          `${above.map((r) => `${r.label} ${one(r.lowCarbon)} %`).join(", ")} — dont six au nord et ` +
          `à l’ouest du continent ; l’Albanie est la seule exception, et ses ${neighbours.length} ` +
          `voisins sont tous sous ${NEIGHBOUR_CEILING} %. L’est et le sud-est du continent sont dans ` +
          `les classes basses. L’Ukraine est en gris : sa production ${YEAR} n’est pas rapportée.`,
        eyebrow: EYEBROW,
        format,
        direction,
        treatments: offered.map((t) => t.id),
        onLadder: (note) => console.log(`  ${note}`),
      }),
      // The beat pins `landscape` (1920 x 1080); 960 x 540 at scale 2 delivers exactly that.
      width: 960,
      height: 540,
      outDir: OUT,
      name: id,
      scale: 2,
    });
    console.log(`  -> renders/${id}.png\n`);
  } catch (error) {
    for (const ext of ["png", "svg"]) await rm(join(OUT, `${id}.${ext}`), { force: true });
    refused.push({ id, why: error.message });
    console.log(`  REFUSED — ${error.message}\n`);
  }
}

if (refused.length)
  console.log(`refused by ${refused.length}: ${refused.map((r) => r.id).join(", ")}`);
