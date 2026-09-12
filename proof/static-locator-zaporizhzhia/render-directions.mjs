// twin/proof/static-locator-zaporizhzhia/render-directions.mjs
//
// Where Europe's largest power station is, drawn once per filed direction through the design base.
// The first `locator` beat in this tree, and the fourth map beat.
//
// It is the first plate here on which all three place classes exist —
// `three-classes-of-place-three-treatments` was filed against a choropleth, which has no settlements
// to name, so the rule's return has never been testable until now.
//
// Usage:  bun proof/static-locator-zaporizhzhia/render-directions.mjs

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
import { DirectedLocator } from "./DirectedLocator.tsx";

const HERE = dirname(fileURLToPath(import.meta.url));
const DIRECTIONS = join(HERE, "..", "..", "docs", "design-base", "directions");
const OUT = join(HERE, "renders");
const EYEBROW = "Énergie · Europe";
const refused = [];

const FRENCH_COUNTRY = {
  UKR: "Ukraine", RUS: "Russie", ROU: "Roumanie", MDA: "Moldavie", BGR: "Bulgarie",
  TUR: "Turquie", POL: "Pologne", BLR: "Biélorussie", HUN: "Hongrie", SVK: "Slovaquie",
  GEO: "Géorgie", SRB: "Serbie", HRV: "Croatie", BIH: "Bosnie-Herzégovine", MNE: "Monténégro",
  MKD: "Macédoine du Nord", ALB: "Albanie", GRC: "Grèce", AUT: "Autriche", CZE: "Tchéquie",
  SVN: "Slovénie", ARM: "Arménie", AZE: "Azerbaïdjan", CYP: "Chypre", LTU: "Lituanie",
};
const FRENCH_PLACE = {
  Kyiv: "Kiev", Kharkiv: "Kharkiv", Dnipro: "Dnipro", Odessa: "Odessa", Donetsk: "Donetsk",
  Rostov: "Rostov", Bucharest: "Bucarest", Voronezh: "Voronej", "Chișinău": "Chișinău",
  Krasnodar: "Krasnodar", Sevastopol: "Sébastopol", Stavropol: "Stavropol",
  Zaporizhzhya: "Zaporijjia", Mariupol: "Marioupol", Kherson: "Kherson",
  Simferopol: "Simferopol", Luhansk: "Louhansk",
};

// ── the station ─────────────────────────────────────────────────────────────
const scsv = (await readFile(join(HERE, "stations.csv"), "utf8")).trim().split(/\r?\n/);
const sh = scsv[0].split(",");
const stations = scsv.slice(1).map((l) => {
  const c = l.split(",");
  const r = Object.fromEntries(sh.map((h, i) => [h, c[i]]));
  return { ...r, capacity_mw: Number(r.capacity_mw), lon: Number(r.lon), lat: Number(r.lat) };
});
const biggest = stations.reduce((a, b) => (b.capacity_mw > a.capacity_mw ? b : a));

// ── THE CLAIM, ASSERTED ─────────────────────────────────────────────────────
if (biggest.country !== "Ukraine")
  throw new Error(`the headline says the largest is in Ukraine; it is in ${biggest.country}`);
if (!(biggest.capacity_mw >= 6000))
  throw new Error(`the headline says 6 000 MW; it is ${biggest.capacity_mw}`);
/** The second half of the sentence, and the reason the beat is worth drawing: the country holding
 *  Europe's largest low-carbon station is the one country whose generation this corpus's own
 *  electricity file does not report. Checked against that file, not remembered. */
/** THE ELECTRICITY FILE IS DUPLICATED BESIDE THIS BEAT, not read out of the choropleth's folder.
 *  The first version reached across to `../static-choropleth-europe-lowcarbon/data.csv` and the
 *  regeneration guard went red: a beat that reads a file it does not carry cannot be rebuilt from
 *  what is committed beside it, and this corpus's "duplicate, do not link" ruling exists for exactly
 *  that. The copy is 41 rows. */
const ecsv = (await readFile(join(HERE, "electricity.csv"), "utf8")).trim().split(/\r?\n/);
const eh = ecsv[0].split(",");
const FUELS = eh.filter((h) => h.endsWith("__twh"));
const unreported = ecsv.slice(1)
  .map((l) => Object.fromEntries(eh.map((h, i) => [h, l.split(",")[i]])))
  .filter((r) => FUELS.reduce((s, k) => s + Number(r[k] || 0), 0) <= 0);
if (unreported.length !== 1 || unreported[0].entity !== "Ukraine")
  throw new Error(
    `the standfirst says Ukraine is the only European country with no reported 2024 generation; ` +
      `the file reports none for ${unreported.map((r) => r.entity).join(", ") || "no country"}`,
  );
/** And the honest limit, stated because the source invites the wrong reading: the database records
 *  installed CAPACITY, never output. A plate that said "produces" would be false. */
console.log(
  `plus grosse centrale de la fenêtre : ${biggest.capacity_mw} MW, ${biggest.fuel}, ` +
    `${biggest.country}, ${biggest.lat}, ${biggest.lon}\n`,
);

// ── the camera ──────────────────────────────────────────────────────────────
const WINDOW = { west: biggest.lon - 9, east: biggest.lon + 9, south: biggest.lat - 5.2, north: biggest.lat + 5.2 };
const RAD = Math.PI / 180;
const LAT0 = biggest.lat * RAD;
const LON0 = biggest.lon * RAD;
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
const spanX = BX1 - BX0;
const spanY = BY1 - BY0;
const span = Math.max(spanX, spanY);
const VIEW = 1000;

/** THE CAMERA IS THE BAKED PLATE'S, and its BOUNDS still come from the subject: the box is the
 *  window computed above, handed to the bake rather than to a projection here. A locator's whole job
 *  is to say WHERE, and at this scale — 18° across — Mercator's inflation is a fraction of a percent
 *  across the frame, so the projection argument the continental beats have to make does not arise. */
const PLATE_SIZE = "1000x760";
const plateDir = (id) => join(HERE, "plate", id);
const BOUNDS = [WINDOW.west, WINDOW.south, WINDOW.east, WINDOW.north].map((v) => v.toFixed(4)).join(",");
function ensurePlate(id, water, land) {
  const dir = plateDir(id);
  if (existsSync(join(dir, "geometry.json")) && existsSync(join(dir, "plate.png"))) return;
  console.log(`baking the ${id} plate (MapTiler, ${PLATE_SIZE}, bounds ${BOUNDS})…`);
  const result = spawnSync(
    "bun",
    [join(HERE, "bake.mjs"), "--size", PLATE_SIZE, "--countries", join(HERE, "shapes.geojson"),
     "--bounds", BOUNDS, "--water", water, "--land", land, "--out", dir],
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
const shapes = geo.features.map((f) => {
  const rings = f.geometry.coordinates.flatMap((poly) => poly).map((ring) => ring.map(project));
  /** THE SEAT IS THE CENTRE OF THE PART IN FRAME, not of the country. Russia's own centroid is in
   *  Siberia, so a seat taken from the whole polygon put its name outside the camera and the label
   *  was reported as having no room — while a third of the plate was Russia, unnamed. A locator
   *  names what a reader can see, so the seat is computed from the vertices the camera actually
   *  shows, and a country with none in frame keeps no seat at all. */
  const inFrame = rings
    .flat()
    .filter(([x, y]) => x >= 0 && x <= VIEW && y >= 0 && y <= VIEW / CAMERA_ASPECT);
  const seat = inFrame.length
    ? {
        x: inFrame.reduce((a, p) => a + p[0], 0) / inFrame.length / VIEW,
        y: inFrame.reduce((a, p) => a + p[1], 0) / inFrame.length / VIEW,
      }
    : null;
  const mean = seat;
  return {
    iso: f.properties.iso,
    name: FRENCH_COUNTRY[f.properties.iso] ?? f.properties.name,
    seat: mean,
    d: rings
      .map((ring) => `M ${ring.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join(" L ")} Z`)
      .join(" "),
  };
});

/** WHICH COUNTRIES ARE NAMED, AND IT IS A RULE RATHER THAN A LIST. SCMP: a locator that named
 *  provinces "would have made the reader look for one". The plate names the country the story is in
 *  and its neighbours in frame — the ones a reader needs to place it — and nothing else. */
const AREAS = ["UKR", "RUS", "ROU", "MDA", "BLR", "TUR"];

const pcsv = (await readFile(join(HERE, "places.csv"), "utf8")).trim().split(/\r?\n/);
const ph = pcsv[0].split(",");
const allPlaces = pcsv.slice(1).map((l) => {
  const c = l.split(",");
  const r = Object.fromEntries(ph.map((h, i) => [h, c[i]]));
  return { ...r, pop: Number(r.pop), lon: Number(r.lon), lat: Number(r.lat) };
});
/** SETTLEMENTS BY A STATED RULE TOO: the six largest in frame. A locator names the places that let a
 *  reader put the subject somewhere, not every place it knows. */
const PLACES = 6;
const places = allPlaces
  .sort((a, b) => b.pop - a.pop)
  .slice(0, PLACES)
  .map((p) => {
    const [x, y] = project([p.lon, p.lat]);
    return { name: FRENCH_PLACE[p.name] ?? p.name, x: x / VIEW, y: y / VIEW };
  });
for (const p of allPlaces.slice(0, PLACES))
  if (!FRENCH_PLACE[p.name]) throw new Error(`no French name recorded for ${p.name}`);

/** Three bodies of water, declared at their own centres — a sea has no polygon in this file, so its
 *  position cannot come from geometry and the beat says so rather than pretending it did. */
const WATERS = [
  { forms: ["Mer Noire", "Mer N."], lon: 33.5, lat: 43.6 },
  { forms: ["Mer d’Azov", "Azov"], lon: 36.5, lat: 46.2 },
  { forms: ["Dniepr"], lon: 33.4, lat: 47.0 },
].map((w) => {
  const [x, y] = project([w.lon, w.lat]);
  return { forms: w.forms, x: x / VIEW, y: y / VIEW };
});

const [sx, sy] = project([biggest.lon, biggest.lat]);
const plain = (s) => s.replace(/[   ]/g, " ");
const n0 = (v) => plain(Math.round(v).toLocaleString("fr-FR"));

const subject = {
  name: "Zaporijjia",
  x: sx / VIEW,
  y: sy / VIEW,
  lines: ["Zaporijjia", `${n0(biggest.capacity_mw)} MW installés`],
};

const facts = beatFacts(
  [{ key: "ZNPP", label: "Zaporijjia", value: biggest.capacity_mw }],
  {
    subject: "ZNPP",
    points: { count: 1 + places.length, locatedAt: "recorded coordinates" },
    geography: { areas: AREAS.length, settlements: places.length, waters: WATERS.length, basemap: true },
    declaredSequence: "none",
  },
);
const offered = applicableTreatments(facts);
console.log(`treatments applicable: ${offered.map((t) => t.id).join(", ")}\n`);

const title = [
  `La plus grosse centrale bas-carbone d’Europe est en Ukraine`,
  `La plus grosse centrale d’Europe est en Ukraine`,
  `Zaporijjia, ${n0(biggest.capacity_mw)} MW`,
];
const limits = [
  `Zaporijjia, ${n0(biggest.capacity_mw)} MW de puissance installée, est la plus grosse centrale ` +
    `bas-carbone que la base recense en Europe. L’Ukraine est aussi le seul pays du continent dont ` +
    `la production électrique de 2024 n’est pas rapportée.`,
  `Zaporijjia, ${n0(biggest.capacity_mw)} MW installés, est la plus grosse centrale bas-carbone ` +
    `d’Europe. L’Ukraine est le seul pays sans production 2024 rapportée.`,
  `Zaporijjia, ${n0(biggest.capacity_mw)} MW installés, plus grosse centrale bas-carbone d’Europe.`,
];
const reading = [
  `Lecture : la base enregistre une puissance installée, jamais une production — la centrale est ` +
    `dessinée là où elle est, pas là où elle produit. Pays en capitales grises, villes en bas de ` +
    `casse, eaux en italique.`,
  `Lecture : puissance installée, pas production. Pays en capitales, villes en bas de casse, eaux ` +
    `en italique.`,
];
const source = "Source : WRI Global Power Plant Database v1.3.0 · lieux Natural Earth 50 m · fond de carte MapTiler (dataviz), teinté par la direction";

const textPerRegister = {
  display: title.join(" "),
  eyebrow: EYEBROW,
  body: `${limits.join(" ")} ${source}`,
  axis: `${AREAS.map((a) => FRENCH_COUNTRY[a]).join(" ")} ${WATERS.flatMap((w) => w.forms).join(" ")}`,
  annot: `${reading.join(" ")} ${places.map((p) => p.name).join(" ")} ${subject.lines.join(" ")}`,
  value: `${n0(biggest.capacity_mw)}`,
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
      element: createElement(DirectedLocator, {
        plate: `data:image/png;base64,${(await readFile(join(plateDir(id), "plate.png"))).toString("base64")}`,
        shapes,
        areas: AREAS,
        places,
        waters: WATERS,
        subject,
        aspect: CAMERA_ASPECT,
        title,
        limits,
        reading,
        source,
        alt:
          `Carte de repérage du sud de l’Ukraine et de ses voisins. La centrale de Zaporijjia, ` +
          `${n0(biggest.capacity_mw)} MW de puissance installée, est marquée d’un cercle dans la ` +
          `couleur d’accent, au bord du Dniepr, au nord de la mer d’Azov. Les pays sont nommés en ` +
          `capitales grises, les six plus grandes villes du cadre en bas de casse, les eaux en ` +
          `italique.`,
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
