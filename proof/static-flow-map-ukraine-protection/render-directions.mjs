// twin/proof/static-flow-map-ukraine-protection/render-directions.mjs
//
// Ukrainians under temporary protection in Europe, drawn as bands whose width is the number of
// people, leaving one node and arriving in thirty-one countries — once per filed direction, through
// the design base. The first `flow map` beat in this tree.
//
// MINARD, REVERSED. The reference this form was harvested for is Minard's 1862 plate: many origins,
// one destination, band width in tonnes, conserved along the network. This is the same form with the
// arrow turned round — one origin, many destinations — and the conservation is at the SOURCE: the
// node's circumference is the total, and each band's share of that circumference is its own number.
//
// `renders/`, PLURAL. A render written to `render/` receives no approval and is invisible to the
// export guard.
//
// Usage:  bun proof/static-flow-map-ukraine-protection/render-directions.mjs

import { existsSync, readdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { readFile, rm } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { renderStill, deriveFurniture } from "#shared/chart-beat/render-still.mjs";
import { readPalette, mix } from "#shared/chart-beat/colour.mjs";
import { beatFacts, applicableTreatments } from "#shared/chart-beat/treatments.mjs";
import { readDirection } from "../../scripts/design-base/read-direction.mjs";
import { composeDirections, report } from "../../scripts/design-base/compose.mjs";
import { resolveDirectionFamilies } from "../../scripts/design-base/resolve-families.mjs";
import { DirectedFlowMap } from "./DirectedFlowMap.tsx";

const HERE = dirname(fileURLToPath(import.meta.url));
const DIRECTIONS = join(HERE, "..", "..", "docs", "design-base", "directions");
const OUT = join(HERE, "renders");
const EYEBROW = "Migrations · Europe";
const ORIGIN = "UKR";
const SUBJECT = "DEU";
const refused = [];

const NAMES = {
  DEU: "Allemagne", POL: "Pologne", CZE: "Tchéquie", ESP: "Espagne", ROU: "Roumanie",
  SVK: "Slovaquie", NLD: "Pays-Bas", IRL: "Irlande", BEL: "Belgique", AUT: "Autriche",
  NOR: "Norvège", BGR: "Bulgarie", CHE: "Suisse", FIN: "Finlande", PRT: "Portugal",
  FRA: "France", DNK: "Danemark", LTU: "Lituanie", HUN: "Hongrie", SWE: "Suède", GRC: "Grèce",
  ITA: "Italie", LVA: "Lettonie", EST: "Estonie", HRV: "Croatie", CYP: "Chypre", SVN: "Slovénie",
  ISL: "Islande", LUX: "Luxembourg", MLT: "Malte", LIE: "Liechtenstein",
};

// ── the flows ───────────────────────────────────────────────────────────────
const csv = (await readFile(join(HERE, "data.csv"), "utf8")).trim().split(/\r?\n/);
const header = csv[0].split(",");
const at = (n) => header.indexOf(n);
const flows = csv.slice(1).map((l) => {
  const c = l.split(",");
  return { entity: c[at("entity")], code: c[at("code")], month: c[at("month")], people: Number(c[at("people")]) };
});
for (const f of flows) {
  if (!NAMES[f.code]) throw new Error(`${f.code} has no French name filed in this beat`);
  if (!Number.isFinite(f.people) || f.people <= 0)
    throw new Error(`a flow has no usable count: ${JSON.stringify(f)}`);
}
const month = flows[0].month;
if (flows.some((f) => f.month !== month))
  throw new Error(`the plate draws one month and the file holds more than one`);

// ── THE CLAIM, ASSERTED ─────────────────────────────────────────────────────
const total = flows.reduce((s, f) => s + f.people, 0);
const ranked = [...flows].sort((a, b) => b.people - a.people);
const topTwo = ranked.slice(0, 2);
const topTwoShare = (topTwo.reduce((s, f) => s + f.people, 0) / total) * 100;
if (ranked[0].code !== SUBJECT)
  throw new Error(`the subject is the largest host; that is ${ranked[0].code}, not ${SUBJECT}`);
if (!(topTwoShare > 45 && topTwoShare < 55))
  throw new Error(
    `the headline says the two largest hosts take about half; they take ${topTwoShare.toFixed(1)} %`,
  );
if (!(total > 4e6))
  throw new Error(`the headline says over four million; the file totals ${total}`);
console.log(
  `${flows.length} pays d'accueil · ${month} · total ${total.toLocaleString("fr-FR")} · ` +
    `${topTwo.map((f) => NAMES[f.code]).join(" + ")} = ${topTwoShare.toFixed(1)} %\n`,
);
console.table(
  ranked.slice(0, 8).map((f) => ({
    pays: NAMES[f.code],
    personnes: f.people.toLocaleString("fr-FR"),
    "% du total": ((f.people / total) * 100).toFixed(1),
  })),
);

const facts = beatFacts(
  flows.map((f) => ({ key: f.code, label: NAMES[f.code], value: f.people })),
  {
    subject: NAMES[SUBJECT],
    flows: flows.map((f) => ({ from: ORIGIN, to: f.code, value: f.people })),
    geography: { areas: flows.length + 1, settlements: 0, waters: 0, basemap: true },
    declaredSequence: "people",
  },
);
const offered = applicableTreatments(facts);
console.log(`treatments applicable: ${offered.map((t) => t.id).join(", ")}\n`);

/** `toLocaleString("fr-FR")` emits U+202F and U+00A0, which no face on the family ladders covers. */
const plain = (s) => s.replace(/[\u202F\u00A0\u2009]/g, " ");
const n0 = (v) => plain(Math.round(v).toLocaleString("fr-FR"));
const one = (v) =>
  plain(v.toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }));

// ── the camera, identical to the sibling map beats ──────────────────────────
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
const span = Math.max(BX1 - BX0, BY1 - BY0);
const VIEW = 1000;

/** THE CAMERA IS THE BAKED PLATE'S — MapTiler's geography painted in this direction's own tints.
 *  The equal-area window above sized the study area and no longer places anything.
 *
 *  THE COST, STATED, AND WHY THIS BEAT CAN AFFORD IT. A band's WIDTH is the quantity, and width is
 *  set by the data, not by the ground; Mercator's inflation moves where a band ENDS, never how thick
 *  it is. What the plate does change is the bearing a band leaves on, because the seat of each
 *  destination is now a Mercator seat — and the seat is still the centre of the part of that country
 *  actually IN FRAME, which is the correction this beat already carried. */
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
    throw new Error(`the ${id} plate was baked on a different camera than ${DIRECTION_FILES[0]}`);
}
const FRAME = plateFacts.frame;
const CORNERS = plateFacts.frameCorners;
const CAMERA_ASPECT = FRAME.width / FRAME.height;
const mercY = (lat) => Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360));
const Y_NORTH = mercY(CORNERS.north);
const Y_SOUTH = mercY(CORNERS.south);
const project = ([lon, lat]) => {
  const px = ((lon - CORNERS.west) / (CORNERS.east - CORNERS.west)) * FRAME.width;
  const py = ((mercY(lat) - Y_NORTH) / (Y_SOUTH - Y_NORTH)) * FRAME.height;
  return [(px / FRAME.width) * VIEW, (py / FRAME.width) * VIEW];
};
console.log(
  `camera: MapTiler plate ${FRAME.width}x${FRAME.height} · ${CORNERS.west.toFixed(2)}..` +
    `${CORNERS.east.toFixed(2)}E ${CORNERS.south.toFixed(2)}..${CORNERS.north.toFixed(2)}N\n`,
);

const geo = JSON.parse(await readFile(join(HERE, "shapes.geojson"), "utf8"));
const MIN_STEP = VIEW / 1400;
function thin(ring) {
  const out = [ring[0]];
  for (const p of ring.slice(1)) {
    const q = out[out.length - 1];
    if (Math.abs(p[0] - q[0]) > MIN_STEP || Math.abs(p[1] - q[1]) > MIN_STEP) out.push(p);
  }
  return out.length >= 4 ? out : ring;
}
const inFrame = ([x, y]) => x >= 0 && x <= VIEW && y >= 0 && y <= VIEW / CAMERA_ASPECT;
/** THE SEAT IS THE CENTRE OF THE PART IN FRAME, not of the country — the locator beat's own
 *  correction. Russia's centroid is in Siberia and Norway's is in the sea north of Trondheim; a seat
 *  taken from the whole polygon puts a band's end where the country is not. */
const seatOf = (feature) => {
  let sx = 0;
  let sy = 0;
  let n = 0;
  for (const poly of feature.geometry.coordinates)
    for (const ring of poly)
      for (const point of ring) {
        const p = project(point);
        if (!inFrame(p)) continue;
        sx += p[0];
        sy += p[1];
        n++;
      }
  return n ? [sx / n, sy / n] : null;
};
const shapes = [];
const seats = {};
for (const f of geo.features) {
  const iso = f.properties.iso;
  const rings = f.geometry.coordinates.flatMap((poly) => poly).map((ring) => thin(ring.map(project)));
  if (rings.length)
    shapes.push({
      iso,
      host: flows.some((x) => x.code === iso),
      origin: iso === ORIGIN,
      d: rings
        .map((ring) => `M ${ring.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join(" L ")} Z`)
        .join(" "),
    });
  const seat = seatOf(f);
  if (seat) seats[iso] = seat;
}
for (const f of flows)
  if (!seats[f.code]) throw new Error(`${f.code} has no seat inside the camera`);
if (!seats[ORIGIN]) throw new Error(`the origin ${ORIGIN} has no seat inside the camera`);

/** THE CAMERA IS FITTED TO THE FLOWS IT DRAWS, NOT TO THE CONTINENT. The sibling map beats frame all
 *  of Europe because their subject is all of Europe; this one draws bands to the ten largest hosts,
 *  and framing Iceland and Cyprus to hold them spends four fifths of the plate on empty sea while the
 *  bands pile into a thumbnail. The box is the origin plus those ten seats, and the rule that picks
 *  the ten is printed on the plate. */
const FOCUS_HOSTS = 10;
const focusSeats = [seats[ORIGIN], ...ranked.slice(0, FOCUS_HOSTS).map((f) => seats[f.code])];
const focus = {
  x0: Math.min(...focusSeats.map((p) => p[0])),
  x1: Math.max(...focusSeats.map((p) => p[0])),
  y0: Math.min(...focusSeats.map((p) => p[1])),
  y1: Math.max(...focusSeats.map((p) => p[1])),
};
const padX = (focus.x1 - focus.x0) * 0.16;
const padY = (focus.y1 - focus.y0) * 0.16;
focus.x0 -= padX;
focus.x1 += padX;
focus.y0 -= padY;
focus.y1 += padY;

const bands = flows.map((f) => ({
  code: f.code,
  name: NAMES[f.code],
  people: f.people,
  seat: seats[f.code],
  subject: f.code === SUBJECT,
}));

const title = [
  `${one(total / 1e6)} millions d’Ukrainiens sous protection temporaire — l’Allemagne et la Pologne en accueillent la moitié`,
  `${one(total / 1e6)} millions d’Ukrainiens sous protection temporaire en Europe`,
  `La protection temporaire, pays par pays`,
];
const limits = [
  `Un ruban par pays d’accueil, partant d’un même nœud posé sur l’Ukraine : sa largeur est le ` +
    `nombre de personnes, à l’échelle dessinée dans la clé. L’Allemagne en prend ` +
    `${one((ranked[0].people / total) * 100)} % et la Pologne ${one((ranked[1].people / total) * 100)} % ` +
    `des ${n0(total)} bénéficiaires que compte Eurostat dans les ${flows.length} pays déclarants.`,
  `Un ruban par pays d’accueil : sa largeur est le nombre de personnes, à l’échelle dessinée dans ` +
    `la clé. L’Allemagne et la Pologne en prennent ${one(topTwoShare)} %.`,
  `Un ruban par pays d’accueil : sa largeur est le nombre de personnes.`,
];
const reading = [
  `Lecture : la largeur est la seule chose qui compte, et elle ne change pas le long du ruban. Le ` +
    `tracé n’est pas un itinéraire : personne n’est passé par là.`,
  `Lecture : la largeur est la quantité. Le tracé n’est pas un itinéraire.`,
];
const source = `Source : Eurostat, bénéficiaires de la protection temporaire (migr_asytpsm), ${month} · fond de carte MapTiler (dataviz), teinté par la direction`;
const originLabel = "Ukraine";

const textPerRegister = {
  display: title.join(" "),
  eyebrow: EYEBROW,
  body: `${limits.join(" ")} ${source}`,
  axis: `${bands.map((b) => b.name).join(" ")} ${originLabel}`,
  annot: reading.join(" "),
  value: `${n0(total)} ${bands.map((b) => n0(b.people)).join(" ")}`,
};

const filed = readdirSync(DIRECTIONS)
  .filter((f) => f.endsWith(".md"))
  .map((f) => readDirection(join(DIRECTIONS, f)));
const newsroom = readPalette(HERE, { stopAt: join(HERE, "..") });
const BEAT_FACTS = { evidenceLevels: 4 };
console.log(
  report(composeDirections({ newsroom, filed, beat: BEAT_FACTS, textPerRegister }), { beat: BEAT_FACTS }),
);
console.log("");

for (const file of readdirSync(DIRECTIONS).filter((f) => f.endsWith(".md"))) {
  const id = file.replace(/\.md$/, "");
  const direction = resolveDirectionFamilies(readDirection(join(DIRECTIONS, file)), textPerRegister);
  console.log(id);
  try {
    await renderStill({
      element: createElement(DirectedFlowMap, {
        plate: `data:image/png;base64,${(await readFile(join(plateDir(id), "plate.png"))).toString("base64")}`,
        shapes,
        bands,
        originSeat: seats[ORIGIN],
        focus,
        originLabel,
        total,
        aspect: CAMERA_ASPECT,
        title,
        limits,
        reading,
        source,
        alt:
          `Carte de flux de l’Europe : ${flows.length} rubans partent d’un nœud posé sur l’Ukraine ` +
          `et arrivent chacun dans un pays d’accueil, la largeur du ruban valant le nombre ` +
          `d’Ukrainiens sous protection temporaire en ${month}. Le plus large va vers l’Allemagne ` +
          `(${n0(ranked[0].people)} personnes), le deuxième vers la Pologne ` +
          `(${n0(ranked[1].people)}) ; à eux deux ils prennent ${one(topTwoShare)} % des ` +
          `${n0(total)} personnes. La somme des largeurs est la circonférence du nœud.`,
        eyebrow: EYEBROW,
        direction,
        treatments: offered.map((t) => t.id),
        onLadder: (note) => console.log(`  ${note}`),
      }),
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
if (refused.length) console.log(`refused by ${refused.length}: ${refused.map((x) => x.id).join(", ")}`);
